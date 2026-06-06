from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class RawPriorities(BaseModel):
    commute: Optional[str] = None
    budget: Optional[str] = None
    gym: Optional[str] = None
    food: Optional[str] = None
    quietness: Optional[str] = None


class Preferences(BaseModel):
    workplace: Optional[str] = None
    budget: Optional[float] = None
    room_type: Optional[str] = None
    transport_mode: Optional[str] = None
    work_days_per_week: int = 5
    gym_per_week: Optional[int] = None
    lifestyle_signals: List[str] = Field(default_factory=list)
    must_haves: List[str] = Field(default_factory=list)
    nice_to_haves: List[str] = Field(default_factory=list)
    raw_priorities: RawPriorities = Field(default_factory=RawPriorities)


class BiasAdjustments(BaseModel):
    effective_work_days: int
    commute_weight_adjusted: bool
    weights: Dict[str, float]


class BiasWarning(BaseModel):
    type: str
    severity: str
    message: str
    neighbourhood: Optional[str] = None


class DebiasedPreferences(Preferences):
    debias_adjustments: BiasAdjustments
    bias_warnings: List[BiasWarning] = Field(default_factory=list)
    neighbourhood_map: Dict[str, Any] = Field(default_factory=dict)


class WeekdaySchedule(BaseModel):
    departure_time: str
    commute_minutes: int
    timeline: List[str]
    gym_days: List[str] = Field(default_factory=list)


class PersonSchedule(BaseModel):
    weekday: WeekdaySchedule


class LifeSimulation(BaseModel):
    winner: PersonSchedule
    runner_up: PersonSchedule
    annual_hours_saved: Optional[int] = None
    narrative: str


class Tradeoffs(BaseModel):
    winner_id: str
    runner_up_id: str
    winner_name: str
    runner_up_name: str
    verdict: str
    confidence: str
    gains: List[str]
    losses: List[str]
    annual_commute_hours_saved: int
    true_cost_difference: float
    rent_difference: float


class Recommendation(BaseModel):
    room_id: Optional[str] = None
    room_name: Optional[str] = None
    neighbourhood: str
    score: float
    headline: str
    why: List[str]
    true_monthly_cost: Optional[float] = None


class RecommendResult(BaseModel):
    recommendation: Recommendation
    bias_warnings: List[BiasWarning]
    tradeoffs: Optional[Tradeoffs] = None
    lifestyle_simulation: Optional[LifeSimulation] = None
    all_rooms: List[Dict[str, Any]] = Field(default_factory=list)
    weights_used: Dict[str, float]
    fallback_message: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class RecommendRequest(BaseModel):
    user_input: str
    conversation_history: Optional[List[ChatMessage]] = None
    listings: Optional[List[Dict[str, Any]]] = None
