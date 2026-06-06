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


def _apply_aliases(workplace: str | None) -> str | None:
    if workplace is None:
        return None
    lower = workplace.lower()
    for alias, canonical in WORKPLACE_ALIASES.items():
        if lower == alias:
            return canonical
    return workplace


def _regex_fallback(user_input: str) -> Preferences:
    workplace = None
    budget = None
    work_days_per_week = 5
    gym_per_week = None
    lifestyle_signals = []

    m = re.search(r'(?:budget|under|below|up to|\$|预算|目标|最多|限制)\s*\$?\s*(\d{3,5})', user_input, re.I)
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

    m = re.search(r'(\d+)\s*(?:times?|x)/(?:week|wk)|每周(?:健身|去健身房|运动)?(\d+)次', user_input, re.I)
    if m:
        gym_per_week = int(m.group(1) or m.group(2))

    if re.search(r'hybrid', user_input, re.I):
        work_days_per_week = 3
    else:
        m = re.search(r'(\d+)\s*days?/(?:week|wk)|每周(?:上班|工作|进公司)?(\d+)天', user_input, re.I)
        if m:
            work_days_per_week = int(m.group(1) or m.group(2))

    if re.search(r'quiet|peaceful|安静', user_input, re.I):
        lifestyle_signals.append("quiet")
    if re.search(r'gym|fitness|健身', user_input, re.I):
        lifestyle_signals.append("gym")
    if re.search(r'food|hawker|美食', user_input, re.I):
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
            "content": "You are a Singapore housing preference analyst. Extract structured info from user input. Return ONLY valid JSON. Use null for any field the user did not mention.",
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
            model="gpt-4o-mini",
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
