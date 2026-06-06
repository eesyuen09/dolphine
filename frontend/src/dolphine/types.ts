export type BiasWarning = {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  icon: string;
};

export type WeightVector = {
  commute: number;
  budget: number;
  gym: number;
  food: number;
  quietness: number;
};

export type DimensionScores = {
  commute: number;
  budget: number;
  gym: number;
  food: number;
  quietness: number;
};

export type NeighbourhoodRow = {
  id: string;
  name: string;
  score: number;
  commuteMinutes: number;
  annualCommuteHours: number;
  annualTransportCost: number;
  rent: number | null;
  trueMonthlyCost: number | null;
  dimensionScores: DimensionScores;
  monthlyTransport: number;
  timeTax: number;
  totalMonthlyCost: number;
};

export type TradeoffData = {
  winnerName: string;
  runnerUpName: string;
  verdict: string;
  confidence: string;
  gains: string[];
  losses: string[];
  annualCommuteHoursSaved: number;
  trueCostDifference: number;
  rentDifference: number;
};

export type LifeSim = {
  narrative: string;
  departureTime: string;
  gymDays: string[];
  annualHoursSaved: number;
  winnerTimeline: string[];
  runnerUpTimeline: string[];
  personalHoursPerDay: number;
  twelveMonthForecast: string;
};

export type VibeScore = {
  food: number;      // 1-10
  transit: number;
  gym: number;
  quiet: number;
  lifestyle: number;
};

export type ScoreBreakdownRow = {
  dimension: string;     // e.g. "commute"
  label: string;         // English, e.g. "Commute"
  rawScore: number;      // 0-10
  weight: number;        // 0-1
  contribution: number;  // rawScore * weight * 10, rounded
};

export type WeightRationaleRow = {
  dimension: string;
  label: string;         // Chinese label
  weight: number;        // 0-1
  reason: string;        // why this weight (human readable, Chinese)
};

export type CorrectnessCheck = {
  label: string;
  status: "passed" | "warning" | "failed";
  detail: string;
};

export type CorrectnessData = {
  model: string;
  summary: string;
  dataCoverage: {
    roomsCompared: number;
    neighbourhoodsCompared: number;
    parsedUserListings: number;
    averageRoomConfidence: number;
    missingFieldCount: number;
  };
  checks: CorrectnessCheck[];
};

export type MarketPriceRange = { min: number; max: number; median: number };

export type ListingWarning = { severity: "low" | "medium" | "high"; message: string };

export type RegretFactor = { description: string; probability: number; mitigation: string };

export type AgentVote = {
  agent: string;        // "commute" | "financial" | "lifestyle" | "risk" | "synthesizer"
  agentLabel: string;   // English label e.g. "Commute Analyst"
  icon: string;         // emoji
  stance: "support" | "dissent";
  vote: string;         // short pick / position
  reasoning: string;    // one-liner
  dissent?: string;     // dissent note if any
};

export type AgentCouncil = {
  verdict: string;
  tally: string;
  votes: AgentVote[];
};

export type RoomExtras = {
  regretProbability: number;   // 0-100
  regretDriver: string;        // main reason, Chinese
  totalMonthlyCost: number;    // rent + transport + timeTax
  timeTax: number;
  vibeScore: VibeScore;
  agentInsight: string;
  twelveMonthForecast: string;
  scoreBreakdown: ScoreBreakdownRow[];
  marketPriceRange?: MarketPriceRange;
  pricingPosition?: "below" | "normal" | "above";
  listingWarnings?: ListingWarning[];
  regretFactors?: RegretFactor[];
};

export type DolphineInsights = {
  biasWarnings: BiasWarning[];
  weights: WeightVector;
  tradeoffs: TradeoffData | null;
  neighbourhoodComparison: NeighbourhoodRow[];
  lifeSimulation: LifeSim | null;
  weightRationale: WeightRationaleRow[];
  correctness?: CorrectnessData;
  agentCouncil: AgentCouncil | null;
};
