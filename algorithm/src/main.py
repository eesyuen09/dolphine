import json
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .schemas import RecommendRequest, RecommendResult, Recommendation
from .agents.preference_agent import extract_preferences
from .agents.debias_agent import apply_debias
from .agents.neighbourhood_scorer import score_neighbourhoods
from .agents.room_ranker import rank_rooms
from .agents.tradeoff_analyser import analyse_tradeoffs
from .agents.life_simulator import simulate_life

load_dotenv()

DATA_DIR = Path(os.environ.get("DATA_DIR", str(Path(__file__).parent.parent / "data")))

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
        return f"{neighbourhood} 每年为你节省约 {tradeoffs.annual_commute_hours_saved} 小时通勤时间。"
    if "rent_anchoring" in types:
        tc = f"S${round(true_cost)}" if true_cost else ""
        return f"{neighbourhood} 是你的最佳选择，实际月成本 {tc}（含交通费）。"
    if "gym_friction" in types:
        return f"{neighbourhood} 健身配套好，且全面匹配你的生活需求。"
    return f"{neighbourhood} 是你在通勤、预算和生活方式上的最佳选择。"


@app.get("/health")
async def health():
    return {"ok": True, "service": "dolphine-algorithm"}


@app.post("/recommend", response_model=RecommendResult)
async def recommend(req: RecommendRequest) -> RecommendResult:
    neighbourhoods, listings = _load_data()

    prefs = await extract_preferences(req.user_input)
    debiased = apply_debias(prefs, neighbourhoods)
    scored = score_neighbourhoods(debiased, neighbourhoods, debiased.neighbourhood_map)
    rooms, fallback_msg = rank_rooms(scored, listings, debiased)

    if not rooms:
        top = scored[0]
        return RecommendResult(
            recommendation=Recommendation(
                neighbourhood=top["name"],
                score=top["total_score"],
                headline=fallback_msg or f"{top['name']} 是你的最佳社区。",
                why=["暂无匹配房源，建议放宽预算或房型要求"],
                true_monthly_cost=top.get("true_monthly_cost"),
            ),
            bias_warnings=debiased.bias_warnings,
            weights_used=debiased.debias_adjustments.weights,
            fallback_message=fallback_msg,
        )

    winner = rooms[0]
    runner_up = rooms[1] if len(rooms) > 1 else rooms[0]
    tradeoffs = analyse_tradeoffs(winner, runner_up, debiased)
    life_sim = simulate_life(winner, runner_up, debiased)

    why = []
    commute = winner["neighbourhood"]["commute_minutes"]
    runner_commute = runner_up["neighbourhood"]["commute_minutes"]
    if commute < runner_commute:
        wp_label = debiased.workplace or "工作地"
        why.append(f"到 {wp_label} 仅需 {commute} 分钟（{runner_up['neighbourhood']['name']} 需 {runner_commute} 分钟）")
    if (winner["neighbourhood"].get("gyms") or {}).get("activesg_gym"):
        gym_walk = winner["neighbourhood"]["gyms"]["nearest_gym_walk_minutes"]
        why.append(f"ActiveSG 健身房步行 {gym_walk} 分钟")
    hawkers = (winner["neighbourhood"].get("food") or {}).get("hawker_centres", 0)
    if hawkers > 0:
        why.append(f"附近有 {hawkers} 个熟食中心")
    w_rent = (winner.get("listing") or {}).get("rent") or winner.get("rent", 0)
    why.append(f"月租 S${w_rent}（实际月成本约 S${round(winner['true_monthly_cost'])}）")

    return RecommendResult(
        recommendation=Recommendation(
            room_id=winner.get("id"),
            room_name=winner.get("name") or (winner.get("listing") or {}).get("name") or winner.get("id"),
            neighbourhood=winner["neighbourhood"]["name"],
            score=winner["room_score"],
            headline=_headline(
                winner["neighbourhood"]["name"],
                winner["true_monthly_cost"],
                tradeoffs,
                debiased.bias_warnings,
            ),
            why=why[:4],
        ),
        bias_warnings=debiased.bias_warnings,
        tradeoffs=tradeoffs,
        lifestyle_simulation=life_sim,
        all_rooms=rooms,
        weights_used=debiased.debias_adjustments.weights,
    )
