from typing import List, Dict, Optional, Tuple


def _satisfied(feature: str, amenities: Dict, neighbourhood: Dict) -> bool:
    checks = {
        "aircon": lambda: amenities.get("aircon") is True,
        "wifi": lambda: amenities.get("wifi") is True,
        "cooking": lambda: amenities.get("cooking") is True,
        "private_bath": lambda: amenities.get("private_bath") is True,
        "gym": lambda: (neighbourhood.get("gyms") or {}).get("score", 0) >= 6,
    }
    fn = checks.get(feature)
    return fn() if fn else True


def _true_monthly_cost(rent: float, neighbourhood: Dict, prefs) -> float:
    wp = prefs.workplace
    cost = (neighbourhood.get("commute") or {}).get(wp, {}).get("cost_sgd", 1.5) if wp else 1.5
    return rent + cost * 2 * prefs.work_days_per_week * 4.33


def _process(
    listing: Dict,
    top3_ids: set,
    nb_by_id: Dict,
    prefs,
    relax: bool = False,
) -> Optional[Dict]:
    nb_id = (listing.get("location") or {}).get("neighbourhood_id") or listing.get("neighbourhood_id")
    if nb_id not in top3_ids:
        return None

    nb = nb_by_id[nb_id]
    inner = listing.get("listing") or listing
    rent = inner.get("rent")
    amenities = listing.get("amenities") or inner.get("amenities") or {}

    if rent is None:
        return None
    if prefs.budget is not None and rent > prefs.budget:
        return None
    if prefs.room_type and inner.get("room_type") != prefs.room_type:
        return None
    if inner.get("available") is False:
        return None
    if not relax:
        for mh in (prefs.must_haves or []):
            if not _satisfied(mh, amenities, nb):
                return None

    nth = prefs.nice_to_haves or []
    matched = [f for f in nth if _satisfied(f, amenities, nb)]
    missing = [f for f in nth if f not in matched]
    feat_score = len(matched) / len(nth) if nth else 0.5

    nb_score_norm = (nb.get("total_score") or 0) / 100
    headroom = (prefs.budget - rent) if prefs.budget is not None else 200
    budget_score = min(10, headroom / 50) / 10
    room_score = round((nb_score_norm * 0.6 + budget_score * 0.2 + feat_score * 0.2) * 100)

    return {
        **listing,
        "neighbourhood": nb,
        "true_monthly_cost": _true_monthly_cost(rent, nb, prefs),
        "room_score": room_score,
        "budget_headroom": headroom,
        "feature_match": {"matched": matched, "missing": missing},
    }


def rank_rooms(
    scored_neighbourhoods: List[Dict],
    listings: List[Dict],
    prefs,
) -> Tuple[List[Dict], Optional[str]]:
    top3 = scored_neighbourhoods[:3]
    top3_ids = {n["id"] for n in top3}
    nb_by_id = {n["id"]: n for n in top3}

    passed = [r for r in (_process(l, top3_ids, nb_by_id, prefs, False) for l in listings) if r]
    if passed:
        return sorted(passed, key=lambda r: r["room_score"], reverse=True)[:5], None

    relaxed = [r for r in (_process(l, top3_ids, nb_by_id, prefs, True) for l in listings) if r]
    if relaxed:
        return sorted(relaxed, key=lambda r: r["room_score"], reverse=True)[:5], None

    in_area = [l for l in listings if (l.get("location") or {}).get("neighbourhood_id") in top3_ids]
    cheapest = min(
        (((l.get("listing") or l).get("rent", float("inf"))) for l in in_area),
        default=prefs.budget or 1500,
    )
    suggested = cheapest + 100
    return [], f"当前预算 ${prefs.budget} 在附近社区暂无匹配房源。建议放宽预算至 ${suggested} 或调整房型。"
