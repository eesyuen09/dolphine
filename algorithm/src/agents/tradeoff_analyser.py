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
        gains.append(f"每年节省 {annual_saved} 小时通勤时间")
    elif annual_saved < -50:
        losses.append(f"每年多花 {abs(annual_saved)} 小时通勤时间")

    gym_diff = winner["neighbourhood"]["gyms"]["score"] - runner_up["neighbourhood"]["gyms"]["score"]
    if gym_diff > 1.5:
        gains.append(f"健身房配套更好（步行 {winner['neighbourhood']['gyms']['nearest_gym_walk_minutes']} 分钟）")
    elif gym_diff < -1.5:
        losses.append("健身配套较弱")

    w_mrt = (winner["neighbourhood"].get("mrt") or {}).get("walk_minutes", 10)
    r_mrt = (runner_up["neighbourhood"].get("mrt") or {}).get("walk_minutes", 10)
    if w_mrt < r_mrt - 3:
        gains.append(f"MRT 更近（{w_mrt} 分 vs {r_mrt} 分）")

    food_diff = winner["neighbourhood"]["food"]["score"] - runner_up["neighbourhood"]["food"]["score"]
    if food_diff > 1:
        gains.append("饮食选择更丰富")
    elif food_diff < -1:
        losses.append("饮食选择较少")

    hdiff = runner_up["budget_headroom"] - winner["budget_headroom"]
    if hdiff > 200:
        gains.append(f"预算余量更充裕（多 ${round(hdiff)}）")

    q_diff = (
        winner["neighbourhood"]["environment"]["quietness_score"]
        - runner_up["neighbourhood"]["environment"]["quietness_score"]
    )
    if q_diff > 1:
        gains.append("环境更安静")
    elif q_diff < -1:
        losses.append("环境相对较吵")

    if true_cost_diff > 50:
        losses.append(f"实际月成本高 S${round(true_cost_diff)}（含交通费）")

    if not gains and not losses:
        if winner["room_score"] >= runner_up["room_score"]:
            gains.append(f"综合评分略高于备选房源（{winner['room_score']} vs {runner_up['room_score']}）")
        else:
            losses.append(f"综合评分略低于备选房源（{winner['room_score']} vs {runner_up['room_score']}）")

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
