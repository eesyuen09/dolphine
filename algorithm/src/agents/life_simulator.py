from ..schemas import LifeSimulation, PersonSchedule, WeekdaySchedule
from ..utils import format_time

_GYM_DAYS = {1: ["Wednesday"], 2: ["Monday", "Thursday"], 3: ["Monday", "Wednesday", "Friday"], 4: ["Monday", "Wednesday", "Friday", "Saturday"]}


def simulate_life(winner: dict, runner_up: dict, prefs) -> LifeSimulation:
    commute = winner["neighbourhood"]["commute_minutes"]
    gym_pw = prefs.gym_per_week or 0
    work_days = prefs.work_days_per_week
    workplace = prefs.workplace or "Workplace"

    arrival = 9 * 60
    dep = arrival - commute

    food = winner["neighbourhood"].get("food") or {}
    lunch_venue = "hawker centre" if food.get("hawker_centres", 0) > 0 else "nearby restaurant"
    food_walk = food.get("nearest_hawker_walk_minutes") or 5

    gyms = winner["neighbourhood"].get("gyms") or {}
    gym_name = f"ActiveSG {winner['neighbourhood']['name']}" if gyms.get("activesg_gym") else "nearby gym"
    gym_walk = gyms.get("nearest_gym_walk_minutes", 10)
    is_gym_day = gym_pw >= 3

    timeline = [
        f"{format_time(dep)} Leave home",
        f"{format_time(arrival)} Arrive at {workplace} (commute: {commute} min)",
        f"12:30 Lunch at nearby {lunch_venue} ({food_walk}-min walk)",
    ]
    if is_gym_day:
        timeline += [f"18:00 Gym at {gym_name} ({gym_walk}-min walk)", "19:15 Dinner nearby"]
    else:
        timeline.append("18:30 Dinner nearby")
    timeline.append("20:00 Home")

    gym_days = _GYM_DAYS.get(min(gym_pw, 4), []) if gym_pw > 0 else []

    runner_commute = runner_up["neighbourhood"]["commute_minutes"]
    daily_saved = runner_commute - commute
    annual_saved = round((daily_saved * 2 * work_days * 52) / 60) if daily_saved > 0 else 0

    runner_dep = arrival - runner_commute
    runner_timeline = [
        f"{format_time(runner_dep)} Leave home",
        f"{format_time(arrival)} Arrive at {workplace} (commute: {runner_commute} min)",
    ]

    parts = [
        f"{format_time(dep)} Leave → {format_time(arrival)} Arrive at {workplace} (commute: {commute} min)",
        f"12:30 Lunch at {lunch_venue}",
    ]
    if is_gym_day:
        parts.append(f"18:00 Gym at {gym_name} ({gym_walk}-min walk)")
    parts.append("20:00 Home")
    if annual_saved > 0:
        parts.append(f"Saves ~{annual_saved} hours/year on commute vs {runner_up['neighbourhood']['name']}")

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
