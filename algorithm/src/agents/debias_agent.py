from typing import Optional, List, Dict, Tuple
from ..schemas import Preferences, DebiasedPreferences, BiasAdjustments, BiasWarning
from ..utils import calc_annual_hours

RENT_ANCHORING_MIN_DIFF = 50
TIME_VALUE_MIN_HOURS = 50
GYM_FRICTION_WALK_LIMIT = 15
BUDGET_TIGHT_THRESHOLD = 100
PREMIUM_RENT_RATIO = 0.95


def _derive_weights(prefs: Preferences) -> Dict[str, float]:
    rp = prefs.raw_priorities
    gym_pw = prefs.gym_per_week
    lifestyle = prefs.lifestyle_signals or []

    if rp.gym == "high" or (gym_pw is not None and gym_pw >= 4):
        gym_weight = 0.25
    elif rp.gym == "medium" or (gym_pw is not None and gym_pw >= 3):
        gym_weight = 0.18
    elif gym_pw is not None and gym_pw >= 1:
        gym_weight = 0.10
    else:
        gym_weight = 0.05

    base: Dict[str, float] = {"commute": 0.35, "budget": 0.30, "food": 0.18, "quietness": 0.12}
    if rp.commute == "high": base["commute"] = 0.40
    if rp.commute == "low": base["commute"] = 0.20
    if rp.budget == "high": base["budget"] = 0.35
    if rp.food == "high": base["food"] = 0.25
    if rp.quietness == "high" or "quiet" in lifestyle: base["quietness"] = 0.20

    # Scale non-gym weights to fill (1 - gym_weight), preserving relative ratios.
    # This ensures the final weights always sum to 1.0 and gym_weight is exact.
    remaining = 1.0 - gym_weight
    total_base = sum(base.values())
    w = {k: v * remaining / total_base for k, v in base.items()}
    w["gym"] = gym_weight
    return w


def _normalize(weights: Dict[str, float]) -> Dict[str, float]:
    total = sum(weights.values())
    return {k: v / total for k, v in weights.items()}


def _enrich(n: Dict, prefs: Preferences) -> Dict:
    wp = prefs.workplace
    rt = prefs.room_type or "common_room"
    wd = prefs.work_days_per_week
    commute_data = (n.get("commute") or {}).get(wp) if wp else None
    rent_data = (n.get("rent") or {}).get(rt)
    if commute_data and rent_data:
        transport = commute_data["cost_sgd"] * 2 * wd * 4.33
        return {**n, "true_monthly_cost": rent_data["typical"] + transport}
    return dict(n)


def _detect_rent_anchoring(prefs: Preferences, neighbourhoods: List[Dict]) -> Tuple[Optional[BiasWarning], List[Dict]]:
    enriched = [_enrich(n, prefs) for n in neighbourhoods]
    rt = prefs.room_type or "common_room"
    with_costs = [n for n in enriched if "true_monthly_cost" in n]
    if len(with_costs) < 2:
        return None, enriched

    rent_candidates = [n for n in enriched if (n.get("rent") or {}).get(rt)]
    if not rent_candidates:
        return None, enriched

    cheapest_by_rent = min(rent_candidates, key=lambda n: n["rent"][rt]["typical"])
    cheapest_by_true = min(with_costs, key=lambda n: n["true_monthly_cost"])

    if cheapest_by_rent.get("id") != cheapest_by_true.get("id"):
        bare_cost = cheapest_by_rent.get("true_monthly_cost", 0)
        true_cost = cheapest_by_true["true_monthly_cost"]
        if abs(bare_cost - true_cost) > RENT_ANCHORING_MIN_DIFF:
            bare_rent_val = cheapest_by_rent["rent"][rt]["typical"]
            return BiasWarning(
                type="rent_anchoring", severity="high",
                message=(
                    f"Cheapest-looking neighbourhood ({cheapest_by_rent['name']}) "
                    f"has bare rent ${bare_rent_val}/mo but true monthly cost ${round(bare_cost)} after transport. "
                    f"{cheapest_by_true['name']} is actually cheaper at ${round(true_cost)}/mo all-in."
                ),
            ), enriched
    return None, enriched


def _detect_time_blindness(prefs: Preferences, top_two: List[Dict]) -> Optional[BiasWarning]:
    if len(top_two) < 2 or not prefs.workplace:
        return None
    wp, wd = prefs.workplace, prefs.work_days_per_week
    hrs = [calc_annual_hours((n.get("commute") or {}).get(wp, {}).get("minutes", 0), wd) for n in top_two]
    diff = abs(hrs[0] - hrs[1])
    if diff > TIME_VALUE_MIN_HOURS:
        worse = top_two[0] if hrs[0] > hrs[1] else top_two[1]
        return BiasWarning(
            type="time_value_blindness", severity="high",
            message=f"Choosing {worse['name']} costs you an extra {round(diff)} hours of commuting per year compared to the next-best option.",
        )
    return None


def _detect_gym_friction(prefs: Preferences, n: Dict) -> Optional[BiasWarning]:
    gym_pw = prefs.gym_per_week or 0
    walk = (n.get("gyms") or {}).get("nearest_gym_walk_minutes")
    if gym_pw >= 3 and walk is not None and walk > GYM_FRICTION_WALK_LIMIT:
        return BiasWarning(type="gym_friction", severity="medium", message=f"The nearest gym is a {walk}-minute walk — hard to stay consistent at that frequency.")
    return None


def _detect_hybrid(prefs: Preferences) -> Optional[BiasWarning]:
    if prefs.work_days_per_week <= 3:
        return BiasWarning(
            type="hybrid_commute_overweight", severity="medium",
            message=f"You work in-office only {prefs.work_days_per_week} days/week. Commute weight has been capped at 0.20.",
        )
    return None


def _detect_premium(n: Dict, prefs: Preferences) -> Optional[BiasWarning]:
    tags = n.get("lifestyle_tags") or []
    rt = prefs.room_type or "common_room"
    rent = (n.get("rent") or {}).get(rt, {}).get("typical")
    if "premium" in tags and rent and prefs.budget and rent > prefs.budget * PREMIUM_RENT_RATIO:
        return BiasWarning(
            type="popularity_premium", severity="medium",
            message=f"{n['name']} is tagged as a premium area and its rent (${rent}) is close to or above your budget (${prefs.budget}).",
        )
    return None


def _detect_budget_illusion(room_rent: float, prefs: Preferences) -> Optional[BiasWarning]:
    if prefs.budget is None:
        return None
    headroom = prefs.budget - room_rent
    if headroom < BUDGET_TIGHT_THRESHOLD:
        return BiasWarning(type="budget_tight", severity="low", message=f"Only S${round(headroom)} of budget headroom remaining.")
    return None


def apply_debias(prefs: Preferences, neighbourhoods: List[Dict]) -> DebiasedPreferences:
    weights = _derive_weights(prefs)  # already sums to 1.0
    normalized = _normalize(weights)  # safety — no-op unless floating-point drift

    hybrid_w = _detect_hybrid(prefs)
    if hybrid_w and normalized.get("commute", 0) > 0.20:
        # Cap commute at 0.20 post-normalization and redistribute excess proportionally
        excess = normalized["commute"] - 0.20
        normalized["commute"] = 0.20
        other_sum = sum(v for k, v in normalized.items() if k != "commute")
        normalized = {
            k: (v + excess * v / other_sum if k != "commute" else v)
            for k, v in normalized.items()
        }

    warnings: List[BiasWarning] = []
    if hybrid_w:
        warnings.append(hybrid_w)

    anchoring_w, enriched = _detect_rent_anchoring(prefs, neighbourhoods)
    if anchoring_w:
        warnings.append(anchoring_w)

    sorted_by_true = sorted(
        (n for n in enriched if "true_monthly_cost" in n),
        key=lambda n: n["true_monthly_cost"],
    )
    top_two = sorted_by_true[:2]

    time_w = _detect_time_blindness(prefs, top_two)
    if time_w:
        warnings.append(time_w)

    for n in enriched:
        gw = _detect_gym_friction(prefs, n)
        if gw:
            warnings.append(BiasWarning(**{**gw.model_dump(), "neighbourhood": n.get("name")}))
            break

    for n in enriched:
        pw = _detect_premium(n, prefs)
        if pw:
            warnings.append(pw)
            break

    if top_two:
        rt = prefs.room_type or "common_room"
        top_rent = (top_two[0].get("rent") or {}).get(rt, {}).get("typical")
        if top_rent is not None:
            bw = _detect_budget_illusion(top_rent, prefs)
            if bw:
                warnings.append(bw)

    neighbourhood_map = {n["id"]: n for n in enriched}

    return DebiasedPreferences(
        **prefs.model_dump(),
        debias_adjustments=BiasAdjustments(
            effective_work_days=prefs.work_days_per_week,
            commute_weight_adjusted=bool(hybrid_w),
            weights=normalized,
        ),
        bias_warnings=warnings,
        neighbourhood_map=neighbourhood_map,
    )
