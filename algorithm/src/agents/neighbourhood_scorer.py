from typing import List, Dict


def _commute_score(enriched: Dict, prefs) -> float:
    wp = prefs.workplace
    if not wp:
        return 5.0
    data = (enriched.get("commute") or {}).get(wp)
    if not data:
        return 5.0
    return max(0.0, 10.0 - data.get("minutes", 30) / 6.0)


def _budget_score(n: Dict, prefs) -> float:
    if prefs.budget is None:
        return 5.0
    # use true_monthly_cost (rent + transport) so commute cost is reflected in affordability
    true_cost = n.get("true_monthly_cost")
    if true_cost is None:
        rt = prefs.room_type or "common_room"
        true_cost = (n.get("rent") or {}).get(rt, {}).get("typical")
    if true_cost is None:
        return 5.0
    return max(0.0, min(10.0, (prefs.budget - true_cost) / 50.0))


def _gym_score(n: Dict, prefs) -> float:
    gym_pw = prefs.gym_per_week or 0
    gyms = n.get("gyms") or {}
    base = gyms.get("score", 5.0)
    if gym_pw >= 3:
        walk = gyms.get("nearest_gym_walk_minutes", 10)
        penalty = max(0, (walk - 15) / 15) * 2
        return max(0.0, base - penalty)
    return base


def _food_score(n: Dict) -> float:
    return (n.get("food") or {}).get("score", 5.0)


def _quietness_score(n: Dict) -> float:
    return (n.get("environment") or {}).get("quietness_score", 5.0)


def score_neighbourhoods(prefs, neighbourhoods: List[Dict], neighbourhood_map: Dict[str, Dict]) -> List[Dict]:
    weights = prefs.debias_adjustments.weights
    scored = []

    for n in neighbourhoods:
        enriched = neighbourhood_map.get(n["id"], n)

        cs = _commute_score(enriched, prefs)
        bs = _budget_score(enriched, prefs)
        gs = _gym_score(n, prefs)
        fs = _food_score(n)
        qs = _quietness_score(n)

        wp = prefs.workplace
        commute_mins = 0
        if wp:
            commute_mins = (enriched.get("commute") or {}).get(wp, {}).get("minutes", 0)

        total = (
            cs * weights.get("commute", 0.35)
            + bs * weights.get("budget", 0.30)
            + gs * weights.get("gym", 0.05)
            + fs * weights.get("food", 0.18)
            + qs * weights.get("quietness", 0.12)
        ) * 10

        scored.append({
            **n,
            "commute_minutes": commute_mins,
            "total_score": round(total, 1),
            "dimension_scores": {
                "commute": round(cs, 2), "budget": round(bs, 2),
                "gym": round(gs, 2), "food": round(fs, 2), "quietness": round(qs, 2),
            },
            "true_monthly_cost": enriched.get("true_monthly_cost"),
        })

    scored.sort(key=lambda x: x["total_score"], reverse=True)
    return scored
