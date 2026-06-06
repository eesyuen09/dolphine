import json
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .schemas import RecommendRequest, RecommendResult, Recommendation, NeighbourhoodComparison
from .agents.preference_agent import extract_preferences
from .agents.debias_agent import apply_debias
from .agents.neighbourhood_scorer import score_neighbourhoods
from .agents.room_ranker import rank_rooms
from .agents.tradeoff_analyser import analyse_tradeoffs
from .agents.life_simulator import simulate_life

load_dotenv()

DATA_DIR = Path(os.environ.get("DATA_DIR", str(Path(__file__).parent.parent / "data")))
WEEKS_PER_MONTH = 4.33
MONTHLY_PASS_CAP = 128

app = FastAPI(title="Dolphine Algorithm API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _load_data():
    neighbourhoods = json.loads((DATA_DIR / "neighbourhoods.json").read_text())
    listings_path = DATA_DIR / "listings.json"
    listings = json.loads(listings_path.read_text()) if listings_path.exists() else []
    return neighbourhoods, listings


def _headline(neighbourhood: str, true_cost, tradeoffs, bias_warnings) -> str:
    types = {w.type for w in bias_warnings}
    if tradeoffs and tradeoffs.annual_commute_hours_saved > 100:
        return f"{neighbourhood} saves you roughly {tradeoffs.annual_commute_hours_saved} commute hours per year."
    if "rent_anchoring" in types:
        tc = f"S${round(true_cost)}" if true_cost else ""
        return f"{neighbourhood} is your best match, with a true monthly cost of {tc} (transport included)."
    if "gym_friction" in types:
        return f"{neighbourhood} has great gym access and fits your lifestyle across the board."
    return f"{neighbourhood} is your best match for commute, budget, and lifestyle."


def _monthly_transport_cost(neighbourhood, workplace, work_days: int) -> float:
    if workplace:
        fare = (neighbourhood.get("commute") or {}).get(workplace, {}).get("cost_sgd", 1.5)
    else:
        fare = 1.5
    return round(min(fare * 2 * work_days * WEEKS_PER_MONTH, MONTHLY_PASS_CAP), 0)


def _true_monthly_cost(rent, neighbourhood, workplace, work_days: int):
    if rent is None:
        return None
    return rent + _monthly_transport_cost(neighbourhood, workplace, work_days)


@app.get("/health")
async def health():
    return {"ok": True, "service": "dolphine-algorithm"}


@app.post("/recommend", response_model=RecommendResult)
async def recommend(req: RecommendRequest) -> RecommendResult:
    neighbourhoods, static_listings = _load_data()
    listings = (req.listings or []) + static_listings

    prefs = await extract_preferences(req.user_input, req.conversation_history)
    debiased = apply_debias(prefs, neighbourhoods)
    scored = score_neighbourhoods(debiased, neighbourhoods, debiased.neighbourhood_map)
    rooms, fallback_msg = rank_rooms(scored, listings, debiased)

    room_type = debiased.room_type or "common_room"
    work_days = debiased.work_days_per_week
    comparison = []
    for n in scored:
        commute_minutes = n.get("commute_minutes", 0)
        annual_commute_hours = round((commute_minutes * 2 * work_days * 52) / 60, 1)
        monthly_transport_cost = _monthly_transport_cost(n, debiased.workplace, work_days)
        annual_transport_cost = monthly_transport_cost * 12
        rent_data = n.get("rent") or {}
        room_rent_data = rent_data.get(room_type) or {}
        rent = room_rent_data.get("typical") if room_rent_data else None
        true_monthly_cost = n.get("true_monthly_cost") or _true_monthly_cost(
            rent, n, debiased.workplace, work_days
        )
        comparison.append(NeighbourhoodComparison(
            id=n["id"],
            name=n["name"],
            score=n["total_score"],
            commute_minutes=commute_minutes,
            annual_commute_hours=annual_commute_hours,
            annual_transport_cost=annual_transport_cost,
            rent=rent,
            true_monthly_cost=true_monthly_cost,
            dimension_scores=n.get("dimension_scores", {}),
        ))
    comparison.sort(key=lambda x: x.score, reverse=True)

    if not rooms:
        top = scored[0]
        top_room_rent_data = (top.get("rent") or {}).get(room_type) or {}
        top_rent = top_room_rent_data.get("typical") if top_room_rent_data else None
        top_true_monthly_cost = top.get("true_monthly_cost") or _true_monthly_cost(
            top_rent, top, debiased.workplace, work_days
        )
        return RecommendResult(
            recommendation=Recommendation(
                neighbourhood=top["name"],
                score=top["total_score"],
                headline=fallback_msg or f"{top['name']} is your top neighbourhood match.",
                why=["No matching listings found — consider relaxing your budget or room type requirements."],
                true_monthly_cost=top_true_monthly_cost,
            ),
            bias_warnings=debiased.bias_warnings,
            weights_used=debiased.debias_adjustments.weights,
            fallback_message=fallback_msg,
            neighbourhood_comparison=comparison,
        )

    winner = rooms[0]
    runner_up = rooms[1] if len(rooms) > 1 else rooms[0]
    tradeoffs = analyse_tradeoffs(winner, runner_up, debiased)
    life_sim = simulate_life(winner, runner_up, debiased)

    why = []
    commute = winner["neighbourhood"]["commute_minutes"]
    runner_commute = runner_up["neighbourhood"]["commute_minutes"]
    if commute < runner_commute:
        wp_label = debiased.workplace or "your workplace"
        why.append(f"Just {commute} min to {wp_label} (vs {runner_commute} min from {runner_up['neighbourhood']['name']})")
    if (winner["neighbourhood"].get("gyms") or {}).get("activesg_gym"):
        gym_walk = winner["neighbourhood"]["gyms"]["nearest_gym_walk_minutes"]
        why.append(f"ActiveSG gym within {gym_walk} min walk")
    hawkers = (winner["neighbourhood"].get("food") or {}).get("hawker_centres", 0)
    if hawkers > 0:
        why.append(f"{hawkers} hawker centre{'s' if hawkers > 1 else ''} nearby")
    w_rent = (winner.get("listing") or {}).get("rent") or winner.get("rent", 0)
    winner_true_monthly_cost = _true_monthly_cost(
        w_rent, winner["neighbourhood"], debiased.workplace, work_days
    ) or winner.get("true_monthly_cost")
    why.append(f"S${w_rent}/month rent (true monthly cost ~S${round(winner_true_monthly_cost)} incl. transport)")

    return RecommendResult(
        recommendation=Recommendation(
            room_id=winner.get("id"),
            room_name=winner.get("name") or (winner.get("listing") or {}).get("name") or winner.get("id"),
            neighbourhood=winner["neighbourhood"]["name"],
            score=winner["room_score"],
            headline=_headline(
                winner["neighbourhood"]["name"],
                winner_true_monthly_cost,
                tradeoffs,
                debiased.bias_warnings,
            ),
            why=why[:4],
            true_monthly_cost=winner_true_monthly_cost,
        ),
        bias_warnings=debiased.bias_warnings,
        tradeoffs=tradeoffs,
        lifestyle_simulation=life_sim,
        all_rooms=rooms,
        weights_used=debiased.debias_adjustments.weights,
        fallback_message=fallback_msg,
        neighbourhood_comparison=comparison,
    )
