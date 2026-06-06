from ..schemas import Tradeoffs
from ..utils import calc_annual_hours


def analyse_tradeoffs(winner: dict, runner_up: dict, prefs) -> Tradeoffs:
    wd = prefs.work_days_per_week
    w_hrs = calc_annual_hours(winner["neighbourhood"]["commute_minutes"], wd)
    r_hrs = calc_annual_hours(runner_up["neighbourhood"]["commute_minutes"], wd)
    annual_saved = round(r_hrs - w_hrs)

    w_rent = (winner.get("listing") or {}).get("rent") or winner.get("rent", 0)
    r_rent = (runner_up.get("listing") or {}).get("rent") or runner_up.get("rent", 0)
    true_cost_diff = winner["true_monthly_cost"] - runner_up["true_monthly_cost"]
    rent_diff = w_rent - r_rent

    score_diff = abs(winner["room_score"] - runner_up["room_score"])
    verdict = "too_close_to_call" if score_diff <= 5 else "recommend_winner"
    confidence = "low" if score_diff <= 5 else "high"

    gains: list[str] = []
    losses: list[str] = []

    if annual_saved > 50:
        gains.append(f"Saves {annual_saved} hours of commute time per year")
    elif annual_saved < -50:
        losses.append(f"Adds {abs(annual_saved)} hours of commute time per year")

    gym_diff = winner["neighbourhood"]["gyms"]["score"] - runner_up["neighbourhood"]["gyms"]["score"]
    if gym_diff > 1.5:
        gains.append(f"Better gym access ({winner['neighbourhood']['gyms']['nearest_gym_walk_minutes']} min walk)")
    elif gym_diff < -1.5:
        losses.append("Weaker gym options nearby")

    w_mrt = (winner["neighbourhood"].get("mrt") or {}).get("walk_minutes", 10)
    r_mrt = (runner_up["neighbourhood"].get("mrt") or {}).get("walk_minutes", 10)
    if w_mrt < r_mrt - 3:
        gains.append(f"Closer MRT access ({w_mrt} min vs {r_mrt} min walk)")

    food_diff = winner["neighbourhood"]["food"]["score"] - runner_up["neighbourhood"]["food"]["score"]
    if food_diff > 1:
        gains.append("More dining options nearby")
    elif food_diff < -1:
        losses.append("Fewer dining options nearby")

    hdiff = runner_up["budget_headroom"] - winner["budget_headroom"]
    if hdiff > 200:
        gains.append(f"More budget headroom (S${round(hdiff)} extra)")

    q_diff = (
        winner["neighbourhood"]["environment"]["quietness_score"]
        - runner_up["neighbourhood"]["environment"]["quietness_score"]
    )
    if q_diff > 1:
        gains.append("Quieter environment")
    elif q_diff < -1:
        losses.append("Noisier environment")

    if true_cost_diff > 50:
        losses.append(f"True monthly cost is S${round(true_cost_diff)} higher (including transport)")

    if not gains and not losses:
        if winner["room_score"] >= runner_up["room_score"]:
            gains.append(f"Overall score marginally higher than the alternative ({winner['room_score']} vs {runner_up['room_score']})")
        else:
            losses.append(f"Overall score marginally lower than the alternative ({winner['room_score']} vs {runner_up['room_score']})")

    w_id = winner.get("id", "")
    r_id = runner_up.get("id", "")
    return Tradeoffs(
        winner_id=w_id,
        runner_up_id=r_id,
        winner_name=winner.get("name") or (winner.get("listing") or {}).get("name") or w_id,
        runner_up_name=runner_up.get("name") or (runner_up.get("listing") or {}).get("name") or r_id,
        verdict=verdict,
        confidence=confidence,
        gains=gains,
        losses=losses,
        annual_commute_hours_saved=annual_saved,
        true_cost_difference=true_cost_diff,
        rent_difference=rent_diff,
    )
