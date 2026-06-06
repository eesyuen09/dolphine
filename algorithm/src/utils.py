def calc_annual_hours(commute_minutes: float, work_days_per_week: int) -> float:
    return round((commute_minutes * 2 * work_days_per_week * 52) / 60, 1)


def format_time(total_minutes: int) -> str:
    h = total_minutes // 60
    m = total_minutes % 60
    return f"{h:02d}:{m:02d}"
