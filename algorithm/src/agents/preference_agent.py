import os
import re
import json
from typing import Optional
from openai import AsyncOpenAI
from ..schemas import Preferences, RawPriorities

WORKPLACE_ALIASES = {
    "nus": "Kent Ridge",
    "national university of singapore": "Kent Ridge",
    "nuh": "Kent Ridge",
    "alexandra hospital": "Queenstown",
    "cbd": "Raffles Place",
    "marina bay": "Raffles Place",
    "tiktok": "Raffles Place",
    "tiktok hq": "Raffles Place",
    "tiktok singapore": "Raffles Place",
    "bytedance": "Raffles Place",
    "one raffles quay": "Raffles Place",
    "shopee": "Buona Vista",
    "google": "Buona Vista",
    "meta": "Raffles Place",
    "grab": "Buona Vista",
    "one north": "Buona Vista",
    "one-north": "Buona Vista",
    "science park": "Buona Vista",
    "jurong": "Jurong East",
    "changi airport": "Changi",
}

KNOWN_WORKPLACES = ["Kent Ridge", "Queenstown", "Raffles Place", "Buona Vista", "Jurong East", "Changi"]

_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def _get_openai_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-5.5")


def _apply_aliases(workplace: str | None) -> str | None:
    if workplace is None:
        return None
    lower = workplace.lower()
    for alias, canonical in WORKPLACE_ALIASES.items():
        if lower == alias:
            return canonical
    return workplace


def _u(*codes: str) -> str:
    return "".join(chr(int(code, 16)) for code in codes)


NON_ENGLISH_KEYWORDS = {
    "budget": "|".join([
        _u("9884", "7b97"),
        _u("76ee", "6807"),
        _u("6700", "591a"),
        _u("9650", "5236"),
    ]),
    "weekly": _u("6bcf", "5468"),
    "gym": "|".join([
        _u("5065", "8eab"),
        _u("53bb", "5065", "8eab", "623f"),
        _u("8fd0", "52a8"),
    ]),
    "times": _u("6b21"),
    "work": "|".join([
        _u("4e0a", "73ed"),
        _u("5de5", "4f5c"),
        _u("8fdb", "516c", "53f8"),
    ]),
    "days": _u("5929"),
    "quiet": _u("5b89", "9759"),
    "food": _u("7f8e", "98df"),
}


def _regex_fallback(user_input: str) -> Preferences:
    workplace = None
    budget = None
    work_days_per_week = 5
    gym_per_week = None
    lifestyle_signals = []

    m = re.search(rf'(?:budget|under|below|up to|\$|{NON_ENGLISH_KEYWORDS["budget"]})\s*\$?\s*(\d{{3,5}})', user_input, re.I)
    if m:
        budget = float(m.group(1))

    lower = user_input.lower()
    for alias, canonical in WORKPLACE_ALIASES.items():
        if alias in lower:
            workplace = canonical
            break
    if workplace is None:
        for wp in KNOWN_WORKPLACES:
            if wp.lower() in lower:
                workplace = wp
                break

    m = re.search(rf'(\d+)\s*(?:times?|x)/(?:week|wk)|{NON_ENGLISH_KEYWORDS["weekly"]}(?:{NON_ENGLISH_KEYWORDS["gym"]})?(\d+){NON_ENGLISH_KEYWORDS["times"]}', user_input, re.I)
    if m:
        gym_per_week = int(m.group(1) or m.group(2))

    if re.search(r'hybrid', user_input, re.I):
        work_days_per_week = 3
    else:
        m = re.search(rf'(\d+)\s*days?/(?:week|wk)|{NON_ENGLISH_KEYWORDS["weekly"]}(?:{NON_ENGLISH_KEYWORDS["work"]})?(\d+){NON_ENGLISH_KEYWORDS["days"]}', user_input, re.I)
        if m:
            work_days_per_week = int(m.group(1) or m.group(2))

    if re.search(rf'quiet|peaceful|{NON_ENGLISH_KEYWORDS["quiet"]}', user_input, re.I):
        lifestyle_signals.append("quiet")
    if re.search(rf'gym|fitness|{NON_ENGLISH_KEYWORDS["gym"]}', user_input, re.I):
        lifestyle_signals.append("gym")
    if re.search(rf'food|hawker|{NON_ENGLISH_KEYWORDS["food"]}', user_input, re.I):
        lifestyle_signals.append("food")

    return Preferences(
        workplace=_apply_aliases(workplace),
        budget=budget,
        work_days_per_week=work_days_per_week,
        gym_per_week=gym_per_week,
        lifestyle_signals=lifestyle_signals,
    )


SCHEMA_DESC = """
{
  "workplace": string | null,
  "budget": number | null,
  "room_type": "common_room" | "master_room" | null,
  "transport_mode": "mrt_only" | "can_drive" | null,
  "work_days_per_week": number | null,
  "gym_per_week": number | null,
  "lifestyle_signals": string[],
  "must_haves": string[],
  "nice_to_haves": string[],
  "raw_priorities": {
    "commute": "high" | "medium" | "low" | null,
    "budget": "high" | "medium" | "low" | null,
    "gym": "high" | "medium" | "low" | null,
    "food": "high" | "medium" | "low" | null,
    "quietness": "high" | "medium" | "low" | null
  }
}"""


async def extract_preferences(user_input: str, conversation_history: Optional[list] = None) -> Preferences:
    try:
        system_message = {
            "role": "system",
            "content": (
                "You are Dolphine's senior Singapore relocation and housing preference analyst for a championship hackathon demo. "
                "Extract structured preferences for ranking Singapore room rentals and neighbourhoods. Return ONLY one valid JSON object matching the provided schema; no markdown, no comments, no extra keys. "
                "Think like an experienced Singapore tenant advisor: understand HDB/condo/common room/master room/co-living, MRT-only vs driving, SGD monthly rent budgets, landlord-stay concerns, cooking rules, PUB/utilities, aircon, visitor policy, hawker/food access, gym routine, quietness, and office commute days. "
                "Use null for scalar fields not explicitly mentioned or clearly inferable; use [] for missing arrays. Prefer the latest user message when it contradicts earlier context, otherwise carry forward stable preferences. "
                "Canonicalize clear workplace anchors: NUS/NUH -> Kent Ridge; CBD/Marina Bay/TikTok/ByteDance/Meta/One Raffles Quay -> Raffles Place; Google/Shopee/Grab/one-north/Science Park -> Buona Vista; Alexandra Hospital -> Queenstown; Jurong -> Jurong East; Changi Airport -> Changi. "
                "If workplace is uncertain, keep the user's original place name rather than guessing. Budget means maximum monthly rent in SGD only. If the user says hybrid without a number, use 3 office days. raw_priorities should mark non-negotiables as high, stated preferences as medium, weak preferences as low."
            ),
        }

        if conversation_history:
            final_user_message = {
                "role": "user",
                "content": f"Based on our conversation so far, extract updated preferences and return JSON matching this schema:\n{SCHEMA_DESC}\n\nLatest user message: {user_input}",
            }
            messages = [system_message] + list(conversation_history) + [final_user_message]
        else:
            messages = [
                system_message,
                {
                    "role": "user",
                    "content": f"Extract preferences and return JSON matching this schema:\n{SCHEMA_DESC}\n\nUser input: {user_input}",
                },
            ]

        resp = await _get_client().chat.completions.create(
            model=_get_openai_model(),
            response_format={"type": "json_object"},
            messages=messages,
        )
        raw = json.loads(resp.choices[0].message.content)
        rp = raw.get("raw_priorities") or {}
        return Preferences(
            workplace=_apply_aliases(raw.get("workplace")),
            budget=raw.get("budget"),
            room_type=raw.get("room_type"),
            transport_mode=raw.get("transport_mode"),
            work_days_per_week=raw.get("work_days_per_week") or 5,
            gym_per_week=raw.get("gym_per_week"),
            lifestyle_signals=raw.get("lifestyle_signals") or [],
            must_haves=raw.get("must_haves") or [],
            nice_to_haves=raw.get("nice_to_haves") or [],
            raw_priorities=RawPriorities(
                commute=rp.get("commute"),
                budget=rp.get("budget"),
                gym=rp.get("gym"),
                food=rp.get("food"),
                quietness=rp.get("quietness"),
            ),
        )
    except Exception:
        return _regex_fallback(user_input)
