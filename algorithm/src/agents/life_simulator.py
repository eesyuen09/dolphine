from ..schemas import LifeSimulation, PersonSchedule, WeekdaySchedule
from ..utils import format_time

_GYM_DAYS = {1: ["周三"], 2: ["周一", "周四"], 3: ["周一", "周三", "周五"], 4: ["周一", "周三", "周五", "周六"]}


def simulate_life(winner: dict, runner_up: dict, prefs) -> LifeSimulation:
    commute = winner["neighbourhood"]["commute_minutes"]
    gym_pw = prefs.gym_per_week or 0
    work_days = prefs.work_days_per_week
    workplace = prefs.workplace or "工作地点"

    arrival = 9 * 60
    dep = arrival - commute

    food = winner["neighbourhood"].get("food") or {}
    lunch_venue = "熟食中心" if food.get("hawker_centres", 0) > 0 else "附近餐厅"
    food_walk = food.get("nearest_hawker_walk_minutes") or 5

    gyms = winner["neighbourhood"].get("gyms") or {}
    gym_name = f"ActiveSG {winner['neighbourhood']['name']}" if gyms.get("activesg_gym") else "附近健身房"
    gym_walk = gyms.get("nearest_gym_walk_minutes", 10)
    is_gym_day = gym_pw >= 3

    timeline = [
        f"{format_time(dep)} 出门",
        f"{format_time(arrival)} 抵达 {workplace}（通勤 {commute} 分钟）",
        f"12:30 在附近{lunch_venue}吃午饭（步行 {food_walk} 分钟）",
    ]
    if is_gym_day:
        timeline += [f"18:00 在 {gym_name} 健身（步行 {gym_walk} 分钟）", "19:15 在附近吃晚饭"]
    else:
        timeline.append("18:30 在附近吃晚饭")
    timeline.append("20:00 到家")

    gym_days = _GYM_DAYS.get(min(gym_pw, 4), []) if gym_pw > 0 else []

    runner_commute = runner_up["neighbourhood"]["commute_minutes"]
    daily_saved = runner_commute - commute
    annual_saved = round((daily_saved * 2 * work_days * 52) / 60) if daily_saved > 0 else 0

    runner_dep = arrival - runner_commute
    runner_timeline = [
        f"{format_time(runner_dep)} 出门",
        f"{format_time(arrival)} 抵达 {workplace}（通勤 {runner_commute} 分钟）",
    ]

    parts = [
        f"{format_time(dep)} 出门 → {format_time(arrival)} 抵达 {workplace}（通勤 {commute} 分钟）",
        f"12:30 {lunch_venue}午饭",
    ]
    if is_gym_day:
        parts.append(f"18:00 {gym_name}健身（{gym_walk} 分钟步行）")
    parts.append("20:00 到家")
    if annual_saved > 0:
        parts.append(f"相比 {runner_up['neighbourhood']['name']}，每年节省约 {annual_saved} 小时通勤")

    return LifeSimulation(
        winner=PersonSchedule(weekday=WeekdaySchedule(
            departure_time=format_time(dep),
            commute_minutes=commute,
            timeline=timeline,
            gym_days=gym_days,
        )),
        runner_up=PersonSchedule(weekday=WeekdaySchedule(
            departure_time=format_time(runner_dep),
            commute_minutes=runner_commute,
            timeline=runner_timeline,
        )),
        annual_hours_saved=annual_saved if annual_saved > 0 else None,
        narrative=" | ".join(parts),
    )
