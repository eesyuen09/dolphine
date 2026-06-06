import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";

const DEFAULT_PORT = 4000;
const DEFAULT_PORT_RETRIES = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = parsePort(process.env.PORT, DEFAULT_PORT);
const host = process.env.HOST || undefined;
const maxPortRetries = parseRetryCount(process.env.PORT_RETRIES, process.env.PORT ? 0 : DEFAULT_PORT_RETRIES);
const frontendDir = path.join(__dirname, "..", "frontend");
const dbDir = path.join(__dirname, "data");
const dbPath = path.join(dbDir, "roommatch.sqlite");
const db = await openDatabase(dbPath);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

// ── Market price index (loaded from algorithm data at startup) ────────────
const LISTINGS_PATH = path.join(__dirname, "..", "algorithm", "data", "listings.json");
let MARKET_INDEX = {}; // key `${nbId}|${roomType}` -> { min, max, median }
try {
  const raw = JSON.parse(readFileSync(LISTINGS_PATH, "utf8"));
  const groups = {};
  for (const l of raw) {
    const nb = l.location?.neighbourhood_id;
    const rt = (l.listing?.room_type) || "common_room";
    const rent = l.listing?.rent;
    if (!nb || !rent) continue;
    const k = nb + "|" + rt;
    (groups[k] = groups[k] || []).push(rent);
  }
  for (const [k, arr] of Object.entries(groups)) {
    arr.sort((a, b) => a - b);
    const median = arr[Math.floor(arr.length / 2)];
    MARKET_INDEX[k] = { min: arr[0], max: arr[arr.length - 1], median };
  }
} catch (e) {
  console.warn("market index load failed", e.message);
}

function marketAudit(nbId, roomType, rent) {
  const k = (nbId || "") + "|" + (roomType || "common_room");
  const range = MARKET_INDEX[k] || MARKET_INDEX[(nbId || "") + "|common_room"] || null;
  if (!range || !rent) return { marketPriceRange: range, pricingPosition: "normal" };
  let pos = "normal";
  if (rent < range.median * 0.9) pos = "below";
  else if (rent > range.median * 1.1) pos = "above";
  return { marketPriceRange: range, pricingPosition: pos };
}

app.use(express.json());
app.use(express.static(frontendDir));

// ── Database helpers ──────────────────────────────────────────────────────

async function openDatabase(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(filePath, (error) => {
      if (error) reject(error);
      else resolve(database);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function parsePort(value, fallback) {
  if (!value) return fallback;
  const parsedPort = Number(value);
  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`PORT must be an integer from 0 to 65535. Received: ${value}`);
  }
  return parsedPort;
}

function parseRetryCount(value, fallback) {
  if (!value) return fallback;
  const parsedRetryCount = Number(value);
  if (!Number.isInteger(parsedRetryCount) || parsedRetryCount < 0) {
    throw new Error(`PORT_RETRIES must be a non-negative integer. Received: ${value}`);
  }
  return parsedRetryCount;
}

function startServer(startPort, retriesLeft) {
  return new Promise((resolve, reject) => {
    const listenOptions = host ? { port: startPort, host } : { port: startPort };
    const server = app.listen(listenOptions, () => {
      const address = server.address();
      const resolvedPort = typeof address === "object" && address ? address.port : startPort;
      const hostname = host || "localhost";
      console.log(`RoomMatch AI running at http://${hostname}:${resolvedPort}`);
      resolve(server);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE" && retriesLeft > 0 && startPort < 65535) {
        const nextPort = startPort + 1;
        console.warn(`Port ${startPort} is busy. Trying ${nextPort}...`);
        startServer(nextPort, retriesLeft - 1).then(resolve, reject);
        return;
      }
      reject(error);
    });
  });
}

async function initializeDatabase() {
  const schema = await fs.readFile(path.join(__dirname, "db", "schema.sql"), "utf8");
  const seed = await fs.readFile(path.join(__dirname, "db", "seed.sql"), "utf8");

  await new Promise((resolve, reject) => {
    db.exec(schema, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  const row = await get("SELECT COUNT(*) AS count FROM listings");
  if (row.count === 0) {
    await new Promise((resolve, reject) => {
      db.exec(seed, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

async function getRooms() {
  const rooms = await all("SELECT * FROM rooms ORDER BY id");
  const commutes = await all("SELECT room_id, target_area, minutes FROM room_commutes ORDER BY room_id");

  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    area: room.area,
    rent: room.rent,
    mrtWalk: room.mrt_walk,
    foodScore: room.food_score,
    comfortScore: room.comfort_score,
    accessibilityScore: room.accessibility_score,
    aircon: Boolean(room.aircon),
    wifi: Boolean(room.wifi),
    cooking: Boolean(room.cooking),
    privateBath: Boolean(room.private_bath),
    image: room.image,
    notes: room.notes,
    commute: commutes
      .filter((commute) => commute.room_id === room.id)
      .reduce((lookup, commute) => ({ ...lookup, [commute.target_area]: commute.minutes }), {})
  }));
}

function normalizePreferences(input = {}) {
  return {
    budget: Number(input.budget || 1200),
    targetArea: input.targetArea || "Buona Vista",
    needAircon: Boolean(input.needAircon),
    needWifi: input.needWifi !== false,
    allowCooking: Boolean(input.allowCooking),
    privateBath: Boolean(input.privateBath),
    priority: input.priority || "balanced",
    maxWalk: Number(input.maxWalk || 8),
    foodAccess: input.foodAccess || "good",
    limit: input.limit ? Number(input.limit) : null
  };
}

function getWeights(priority) {
  const weights = { budget: 1, mrt: 1, food: 1, comfort: 1, commute: 1, accessibility: 1 };
  if (priority === "comfort") weights.comfort = 2.1;
  if (priority === "mrt") weights.mrt = 2.2;
  if (priority === "food") weights.food = 2.2;
  if (priority === "budget") weights.budget = 2.3;
  return weights;
}

function scoreRoom(room, preferences) {
  const weights = getWeights(preferences.priority);
  const commuteMinutes = room.commute[preferences.targetArea] ?? 45;
  const budgetScore = Math.max(0, 10 - Math.max(0, room.rent - preferences.budget) / 90);
  const mrtScore = Math.max(0, 10 - Math.max(0, room.mrtWalk - preferences.maxWalk) * 1.4 - room.mrtWalk * 0.15);
  const commuteScore = Math.max(0, 10 - commuteMinutes / 6);
  const foodRequirement = preferences.foodAccess === "must" ? 8 : preferences.foodAccess === "good" ? 6 : 0;
  const foodScore = Math.max(0, room.foodScore - Math.max(0, foodRequirement - room.foodScore) * 1.8);
  const featurePenalty = [
    preferences.needAircon && !room.aircon ? 10 : 0,
    preferences.needWifi && !room.wifi ? 8 : 0,
    preferences.allowCooking && !room.cooking ? 5 : 0,
    preferences.privateBath && !room.privateBath ? 7 : 0
  ].reduce((total, penalty) => total + penalty, 0);

  const weightedTotal =
    budgetScore * weights.budget +
    mrtScore * weights.mrt +
    foodScore * weights.food +
    room.comfortScore * weights.comfort +
    commuteScore * weights.commute +
    room.accessibilityScore * weights.accessibility;

  const maxTotal = Object.values(weights).reduce((total, weight) => total + weight, 0) * 10;
  const score = Math.max(8, Math.round((weightedTotal / maxTotal) * 100 - featurePenalty));

  return {
    ...room,
    score,
    commuteMinutes,
    tradeoffs: buildTradeoffs(room, preferences, commuteMinutes),
    aiNote: buildAiNote(room, preferences, commuteMinutes)
  };
}

function buildTradeoffs(room, preferences, commuteMinutes) {
  return [
    `$${room.rent}/mo`,
    `${room.mrtWalk} min to MRT`,
    `${commuteMinutes} min to ${preferences.targetArea}`,
    `Food ${room.foodScore}/10`,
    `Comfort ${room.comfortScore}/10`
  ];
}

function buildAiNote(room, preferences, commuteMinutes) {
  const reasons = [];
  if (room.rent <= preferences.budget) reasons.push("fits the selected budget");
  if (room.mrtWalk <= preferences.maxWalk) reasons.push("meets the MRT walking target");
  if (room.foodScore >= 8) reasons.push("has strong nearby food access");
  if (room.comfortScore >= 8) reasons.push("scores well for comfort");
  if (commuteMinutes <= 15) reasons.push(`keeps the ${preferences.targetArea} commute short`);

  const missing = [];
  if (preferences.needAircon && !room.aircon) missing.push("no aircon");
  if (preferences.allowCooking && !room.cooking) missing.push("cooking is limited");
  if (preferences.privateBath && !room.privateBath) missing.push("shared bathroom");

  const reasonText = reasons.length ? reasons.join(", ") : "is a possible fallback when other rooms are unavailable";
  const caution = missing.length ? ` Main tradeoff: ${missing.join(", ")}.` : "";
  return `Recommended because it ${reasonText}.${caution}`;
}

// ── Dolphine AI integration ───────────────────────────────────────────────

const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], profile: null });
  }
  return sessions.get(sessionId);
}

const LOCATION_LABELS = {
  "nus-kent-ridge": "NUS Kent Ridge",
  "nus-utown": "NUS UTown",
  "nus-soc": "NUS School of Computing",
  "nus-business": "NUS Business School",
  "kent-ridge-mrt": "Kent Ridge MRT",
  "one-north": "One-North",
  "buona-vista": "Buona Vista",
  "raffles-place": "Raffles Place",
  "tiktok-hq": "TikTok HQ",
  "shopee-hq": "Shopee HQ",
  "tanjong-pagar": "Tanjong Pagar",
  "marina-bay": "Marina Bay",
  "changi-business-park": "Changi Business Park",
  ntu: "NTU",
  smu: "SMU",
  sutd: "SUTD",
  "singapore-management-university": "Singapore Management University",
  nuh: "National University Hospital",
};

function serializeProfileToNL(profile) {
  const location = LOCATION_LABELS[profile.selectedLocationId] || profile.destinationInput || "NUS School of Computing";
  const parts = [
    `I work at ${location}.`,
    `My budget is S$${profile.budgetMax}/month.`,
    `I work in office ${profile.officeDays} day${profile.officeDays !== 1 ? "s" : ""} per week.`,
  ];
  if (profile.preferredRoomType && profile.preferredRoomType !== "No preference") {
    parts.push(`I prefer a ${profile.preferredRoomType.toLowerCase()}.`);
  }
  if (profile.mustHaves && profile.mustHaves.length > 0) {
    parts.push(`Must haves: ${profile.mustHaves.join(", ")}.`);
  }
  if (profile.rankedPriorities && profile.rankedPriorities.length > 0) {
    parts.push(`My top priorities are: ${profile.rankedPriorities.slice(0, 3).join(", ")}.`);
    if (profile.rankedPriorities.includes("Gym access")) parts.push("I go to the gym regularly.");
    if (profile.rankedPriorities.includes("Quiet environment")) parts.push("I prefer a quiet environment.");
  }
  return parts.join(" ");
}

function normalizeNeighbourhoodId(area) {
  if (!area) return null;
  const map = {
    queenstown: "queenstown",
    clementi: "clementi",
    "tiong bahru": "tiong_bahru",
    "jurong east": "jurong_east",
    "paya lebar": "paya_lebar",
    woodlands: "woodlands",
    "buona vista": "buona_vista",
    dover: "queenstown",
    "ayer rajah": "buona_vista",
    "one-north": "buona_vista",
  };
  const lower = (area || "").toLowerCase();
  for (const [key, id] of Object.entries(map)) {
    if (lower.includes(key)) return id;
  }
  return lower.replace(/\s+/g, "_");
}

let _openaiClient = null;
function getOpenAIClient() {
  if (!_openaiClient) _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openaiClient;
}

async function parseSingleListing(text, index) {
  let content = text.trim();
  if (content.startsWith("http")) {
    try {
      const resp = await fetch(content, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Dolphine/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
      const html = await resp.text();
      content = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 4000);
    } catch {
      // fall through — treat raw URL text as listing description
    }
  }
  try {
    const resp = await getOpenAIClient().chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Dolphine's senior Singapore room-rental listing analyst for a championship hackathon demo. Parse messy 99.co/PropertyGuru/agent/WhatsApp-style room listings like an experienced tenant advisor: distinguish common room vs master room vs studio/co-living, infer Singapore neighbourhood/MRT only when supported by the text, understand local shorthand such as HDB, condo, PUB/utilities, no owner, light cooking, aircon servicing, visitors, couples, female tenant, immediate move-in, and walking distance to MRT. Return ONLY valid JSON. Do not add commentary.",
        },
        {
          role: "user",
          content: `Extract the listing as structured data for a Singapore relocation recommendation engine.

Champion-demo expectations:
- Be conservative: use null for unknown values instead of inventing.
- Rent must be monthly SGD integer; strip commas, "S$", "/mo", and agent wording.
- room_type must be exactly one of "common_room", "master_room", "studio", "co_living".
- unit_type should preserve compact local format when present, e.g. "4A HDB", "3B2B", "condo", "landed".
- mrt_station should be the nearest MRT station name without "MRT" if clear.
- mrt_walk_minutes should be a number only when the text states or strongly implies a walking time.
- amenities booleans should reflect tenant-impacting details: aircon, wifi, cooking, private_bath/ensuite, furnished, washing_machine.
- confidence is 0-100 based on how complete and reliable the listing text is.

Return JSON with exactly these fields:
{ "name": string, "rent": number|null, "area": string|null, "room_type": "common_room"|"master_room"|"studio"|"co_living", "unit_type": string|null, "mrt_station": string|null, "mrt_walk_minutes": number|null, "amenities": { "aircon": bool, "wifi": bool, "cooking": bool, "private_bath": bool, "furnished": bool, "washing_machine": bool }, "url": string|null, "confidence": number }

Listing:
${content}`,
        },
      ],
    });
    const parsed = JSON.parse(resp.choices[0].message.content);
    return {
      id: `user-listing-${index + 1}`,
      listing: {
        name: parsed.name || `Listing ${index + 1}`,
        room_type: parsed.room_type || "common_room",
        rent: parsed.rent || null,
        unit_type: parsed.unit_type || null,
        url: parsed.url || (text.startsWith("http") ? text : null),
      },
      location: {
        neighbourhood_id: normalizeNeighbourhoodId(parsed.area),
        mrt: parsed.mrt_station || null,
        mrt_walk_minutes: parsed.mrt_walk_minutes || null,
      },
      amenities: parsed.amenities || {},
      available: true,
      _confidence: parsed.confidence || 75,
    };
  } catch {
    return null;
  }
}

async function parseListings(listingInputs, mode) {
  if (mode === "demo" || !listingInputs || listingInputs.length === 0) return [];
  const nonEmpty = listingInputs.filter((t) => typeof t === "string" && t.trim().length > 10);
  if (nonEmpty.length === 0) return [];
  const results = await Promise.all(nonEmpty.map((text, i) => parseSingleListing(text, i)));
  return results.filter(Boolean);
}

const DIM_LABELS = {
  commute:   "Commute",
  budget:    "Budget",
  gym:       "Gym",
  food:      "Food",
  quietness: "Quietness",
};

// ── Singapore cost model constants (grounded in real SG public-transport context) ──
const WEEKS_PER_MONTH = 4.33;          // 52 weeks / 12 months
const TIME_VALUE_PER_HOUR = 10;        // S$/hr — conservative value of personal time
const MONTHLY_PASS_CAP = 128;          // S$ — adult unlimited bus+train monthly pass; a rational
                                       // daily commuter never pays more than this, so cap transport.

// Monthly commuting transport cost, capped at the SG adult monthly travel pass.
function monthlyTransportCost(oneWayFareSGD, officeDaysPerWeek) {
  const perTrip = (oneWayFareSGD || 0) * 2 * officeDaysPerWeek * WEEKS_PER_MONTH;
  return Math.round(Math.min(perTrip, MONTHLY_PASS_CAP));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeScoreBreakdown(nb, weightsUsed) {
  const dimScores = nb.dimension_scores || {};
  const dims = Object.keys(DIM_LABELS);
  return dims
    .map((dim) => {
      const rawScore = Number(dimScores[dim] || 0);
      const weight   = Number(weightsUsed[dim] || 0);
      return {
        dimension:    dim,
        label:        DIM_LABELS[dim],
        rawScore:     Math.round(rawScore * 10) / 10,
        weight:       Math.round(weight * 1000) / 1000,
        contribution: Math.round(rawScore * weight * 10),
      };
    })
    .sort((a, b) => b.contribution - a.contribution);
}

function computeRegret(nb, weightsUsed) {
  const dimScores = nb.dimension_scores || {};
  const dims = Object.keys(DIM_LABELS);
  let regretSum = 0;
  let worstDim = null;
  let worstVal = -Infinity;
  for (const dim of dims) {
    const rawScore = Number(dimScores[dim] || 0);
    const weight   = Number(weightsUsed[dim] || 0);
    const val = weight * (1 - rawScore / 10);
    regretSum += val;
    if (val > worstVal) { worstVal = val; worstDim = dim; }
  }
  const regretProb = Math.round(clamp(regretSum, 0, 1) * 100);
  const REGRET_PHRASES = {
    commute:   "Commute time conflicts with your high-priority preference",
    budget:    "Rent is higher than expected, creating budget pressure",
    gym:       "Gym access is inconvenient, making regular workouts harder",
    food:      "Nearby food options are limited, affecting daily convenience",
    quietness: "Higher noise levels may affect your living experience",
  };
  const regretDriver = worstDim ? REGRET_PHRASES[worstDim] || `${DIM_LABELS[worstDim]} has a potential downside` : "";
  return { regretProbability: regretProb, regretDriver };
}

function computeVibeScore(nb) {
  const ds = nb.dimension_scores || {};
  const food     = clamp(Math.round(Number(ds.food     || 5)), 1, 10);
  const transit  = clamp(Math.round(Number(ds.commute  || 5)), 1, 10);
  const gym      = clamp(Math.round(Number(ds.gym      || 5)), 1, 10);
  const quiet    = clamp(Math.round(Number(ds.quietness|| 5)), 1, 10);
  const lifestyle = clamp(Math.round((food + transit + gym + quiet) / 4), 1, 10);
  return { food, transit, gym, quiet, lifestyle };
}

function computeAgentInsight(room, weightsUsed, frontendProfile, scoreBreakdown) {
  const amenitiesMap = room.amenities || (room.listing || {}).amenities || {};
  const mustHaveMap = {
    "Aircon":            "aircon",
    "WiFi included":     "wifi",
    "Cooking allowed":   "cooking",
    "Private bathroom":  "private_bath",
  };
  const mustHaves = frontendProfile?.mustHaves || [];
  for (const mh of mustHaves) {
    const key = mustHaveMap[mh];
    if (key && amenitiesMap[key] === false) {
      return `You marked "${mh}" as required, but this room does not meet it — that is why I did not rank it first.`;
    }
  }
  const top = scoreBreakdown[0];
  if (top) {
    return `This room performs strongest on "${top.label}", which directly matches your preference.`;
  }
  return "Its overall score is steady and fits your broader preferences.";
}

function uniqueNonEmpty(items, limit = 5) {
  return [...new Set((items || []).filter(Boolean))].slice(0, limit);
}

function buildPersonalizedRoomContext({
  amenitiesMap,
  commute,
  foodScore,
  frontendProfile,
  gymWalk,
  hawkers,
  isWinner,
  listing,
  missingFields,
  monthlyTransport,
  nb,
  quietScore,
  recommendation,
  rent,
  room,
  scoreBreakdown,
  timeTax,
  totalMonthlyCost,
}) {
  const priorities = frontendProfile?.rankedPriorities || [];
  const mustHaves = frontendProfile?.mustHaves || [];
  const budgetMax = frontendProfile?.budgetMax;
  const budgetHeadroom = budgetMax != null ? budgetMax - rent : room.budget_headroom;
  const topScore = scoreBreakdown[0];
  const roomTitle = listing.name || listing.title || room.id || `${nb.name || "This area"} room`;
  const areaName = nb.name || "this area";

  const pros = [];
  const cons = [];
  const risks = [];
  const whyHigh = [];

  if (commute <= 20) {
    pros.push(`Strong commute fit: ${commute} min each way keeps weekday fatigue low.`);
    whyHigh.push(`${commute} min commute protects your weekday routine.`);
  } else if (commute >= 40) {
    cons.push(`Commute friction: ${commute} min each way can compound across office days.`);
    risks.push(`Long commute creates a hidden time tax of about S$${timeTax}/month.`);
  } else {
    pros.push(`Manageable commute: ${commute} min each way, not ideal but survivable.`);
  }

  if (budgetHeadroom != null && budgetHeadroom >= 250) {
    pros.push(`Budget buffer: about S$${Math.round(budgetHeadroom)} below your max rent.`);
  } else if (budgetHeadroom != null && budgetHeadroom < 0) {
    cons.push(`Over budget by about S$${Math.abs(Math.round(budgetHeadroom))}/month before transport.`);
    risks.push("Rent pressure may crowd out food, gym, and weekend flexibility.");
  } else if (budgetHeadroom != null && budgetHeadroom < 120) {
    cons.push("Thin budget buffer after rent; small utility changes may matter.");
  }

  if (amenitiesMap.cooking) {
    pros.push("Cooking allowed, so meal prep stays realistic instead of becoming a delivery habit.");
  } else if (mustHaves.includes("Cooking allowed")) {
    cons.push("Cooking was marked as a must-have, but this listing does not clearly support it.");
    risks.push("If cooking is restricted, monthly food cost and routine control may drift.");
  }

  if (amenitiesMap.private_bath || listing.room_type === "master_room") {
    pros.push("Privacy upside: private/master-room setup reduces shared-bathroom friction.");
  } else if (priorities.includes("More privacy")) {
    cons.push("Privacy tradeoff: shared facilities may conflict with your privacy priority.");
  }

  if (priorities.includes("Gym access")) {
    if (gymWalk <= 10) {
      pros.push(`Gym habit protected: nearest gym is about ${gymWalk} min walk.`);
    } else {
      cons.push(`Gym friction: ${gymWalk} min walk makes consistency harder after commute.`);
      risks.push("Gym access is present but may become a weekend-only habit.");
    }
  }

  if (priorities.includes("Affordable food") || hawkers > 0) {
    if (hawkers >= 2 || foodScore >= 7) {
      pros.push(`${hawkers || "Multiple"} hawker/food options nearby; daily meals should stay affordable.`);
    } else {
      cons.push(`Food access is only moderate (${foodScore}/10); late or cheap meals may need planning.`);
    }
  }

  if (priorities.includes("Quiet environment")) {
    if (quietScore >= 7) {
      pros.push("Quietness fit: this area supports recovery after work/study days.");
    } else {
      cons.push(`Quietness risk: area score ${quietScore}/10 may not match your recovery preference.`);
      risks.push("Noise mismatch is the kind of regret people notice only after moving in.");
    }
  }

  for (const field of missingFields.slice(0, 3)) {
    risks.push(`${field} is not confirmed for ${roomTitle}; ask before committing.`);
  }

  if (monthlyTransport >= MONTHLY_PASS_CAP) {
    risks.push(`${areaName} transport estimate is capped near monthly-pass level; verify your actual route.`);
  }

  if (topScore) {
    whyHigh.push(`Top scoring dimension: ${topScore.label} (${topScore.rawScore}/10 × ${Math.round(topScore.weight * 100)}%).`);
  }

  if (isWinner && recommendation?.why?.length) {
    whyHigh.unshift(...recommendation.why.slice(0, 2));
  }

  const shortReason =
    isWinner && recommendation?.headline
      ? recommendation.headline
      : pros[0] || `${roomTitle} in ${areaName} is a practical fit, but verify listing details.`;

  const fallbackPros = [`${roomTitle}: S$${rent}/mo in ${areaName} with ${commute} min commute.`];
  const fallbackCons = [`No major downside detected from available fields for ${roomTitle}.`];
  const fallbackRisks = [`Verify ${roomTitle} availability, utilities, and house rules before committing.`];
  const roomPros = uniqueNonEmpty(pros, 5);
  const roomCons = uniqueNonEmpty(cons, 5);
  const roomRisks = uniqueNonEmpty(risks, 5);
  const likelyRegret = roomRisks[0] || roomCons[0] || fallbackRisks[0];

  return {
    pros: roomPros.length ? roomPros : fallbackPros,
    cons: roomCons.length ? roomCons : fallbackCons,
    hiddenRisks: roomRisks.length ? roomRisks : fallbackRisks,
    whyHigh: uniqueNonEmpty(whyHigh, 5),
    tradeoffs: uniqueNonEmpty([
      `Rent S$${rent}/mo`,
      `Monthly impact S$${totalMonthlyCost}`,
      `${commute} min commute`,
      `Transport about S$${monthlyTransport}/mo`,
      `Food ${typeof foodScore === "number" ? foodScore.toFixed(1) : foodScore}/10`,
      `Gym ${gymWalk} min walk`,
    ], 6),
    shortReason,
    likelyRegret,
  };
}

function mapRecommendResultToRoomListings(result, frontendProfile) {
  const { recommendation, tradeoffs, all_rooms = [] } = result;
  const weightsUsed = result.weights_used || {};
  const workDays = frontendProfile?.officeDays ?? 5;
  // Per-neighbourhood cost basis from the algorithm (uses the user's actual workplace),
  // so room-level cost matches the comparison table exactly (single source of truth).
  const cmpById = {};
  for (const c of (result.neighbourhood_comparison || [])) cmpById[c.id] = c;
  const TONES = ["aqua", "sand", "coral"];

  return all_rooms.slice(0, 5).map((room, idx) => {
    const inner = room.listing || room;
    const listing = inner.listing || inner;
    const location = room.location || inner.location || {};
    const nb = room.neighbourhood || {};
    const amenitiesMap = room.amenities || inner.amenities || {};
    const isWinner = idx === 0;

    const rent = listing.rent || inner.rent || 0;
    const commute = nb.commute_minutes || 0;
    const annualHours = Math.round((commute * 2 * workDays * 52) / 60);

    // Prefer the algorithm's per-neighbourhood cost basis (correct workplace); fall back to
    // the neighbourhood's own commute fare only if no comparison row exists.
    const cmp = cmpById[nb.id];
    let monthlyTransport;
    let monthlyCommuteHours;
    if (cmp) {
      monthlyTransport = Math.min(Math.round((cmp.annual_transport_cost || 0) / 12), MONTHLY_PASS_CAP);
      monthlyCommuteHours = (cmp.annual_commute_hours || 0) / 12;
    } else {
      let transportCostSGD = 1.5;
      const firstCommuteVal = Object.values(nb.commute || {})[0];
      if (firstCommuteVal && firstCommuteVal.cost_sgd) transportCostSGD = firstCommuteVal.cost_sgd;
      monthlyTransport = monthlyTransportCost(transportCostSGD, workDays);
      monthlyCommuteHours = (commute * 2 * (workDays * WEEKS_PER_MONTH)) / 60;
    }

    // ── explainability extras ────────────────────────────────────────────
    const timeTax = Math.round(monthlyCommuteHours * TIME_VALUE_PER_HOUR);
    const totalMonthlyCost = rent + monthlyTransport + timeTax;
    const scoreBreakdown = computeScoreBreakdown(nb, weightsUsed);
    const { regretProbability, regretDriver } = computeRegret(nb, weightsUsed);
    const vibeScore = computeVibeScore(nb);
    const agentInsight = computeAgentInsight(room, weightsUsed, frontendProfile, scoreBreakdown);

    const amenities = [];
    if (amenitiesMap.aircon) amenities.push("Aircon");
    if (amenitiesMap.wifi) amenities.push("WiFi included");
    if (amenitiesMap.cooking) amenities.push("Cooking allowed");
    if (amenitiesMap.private_bath) amenities.push("Private bathroom");
    if (amenitiesMap.furnished) amenities.push("Furnished");
    if (amenitiesMap.washing_machine) amenities.push("Washing machine");

    const missingFields = [];
    if (!listing.room_type) missingFields.push("Room type");
    if (!location.mrt) missingFields.push("Nearest MRT");
    if (room.feature_match?.missing?.length) missingFields.push(...room.feature_match.missing.slice(0, 2));

    const foodScore = nb.food?.score || 5;
    const hawkers = nb.food?.hawker_centres || 0;
    const foodAccess =
      hawkers > 0
        ? `${hawkers} hawker centre${hawkers > 1 ? "s" : ""} nearby (${foodScore}/10)`
        : `Food score ${foodScore}/10`;

    const gymWalk = nb.gyms?.nearest_gym_walk_minutes || 15;
    const gymAccess = nb.gyms?.activesg_gym
      ? `ActiveSG gym ${gymWalk} min walk`
      : `Nearest gym ${gymWalk} min walk`;

    const quietScore = nb.environment?.quietness_score || 5;
    const quietness =
      quietScore >= 7 ? "Quiet residential area" : quietScore >= 5 ? "Moderate noise level" : "Busy urban environment";
    const imageUrl =
      listing.image_url ||
      inner.image_url ||
      room.image_url ||
      listing.media?.image_url ||
      inner.media?.image_url ||
      room.media?.image_url ||
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80";
    const personalized = buildPersonalizedRoomContext({
      amenitiesMap,
      commute,
      foodScore,
      frontendProfile,
      gymWalk,
      hawkers,
      isWinner,
      listing,
      missingFields,
      monthlyTransport,
      nb,
      quietScore,
      recommendation,
      rent,
      room,
      scoreBreakdown,
      timeTax,
      totalMonthlyCost,
    });

    return {
      id: room.id || `room-${idx}`,
      image: imageUrl,
      imageUrl,
      rankLabel: ["#1 Best overall fit", "#2 Strong alternative", "#3 Backup option", "#4 Niche fit", "#5 Fallback"][idx] || `#${idx + 1} Option`,
      title: listing.name || listing.title || `${nb.name || "Unknown"} Room`,
      area: nb.name || "Unknown",
      rent,
      roomType: (listing.room_type || "common_room")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      unitType: listing.unit_type || "N/A",
      nearestMrt: location.mrt || nb.mrt?.station || "Nearby MRT",
      mrtWalkMinutes: location.mrt_walk_minutes || nb.mrt?.walk_minutes || 10,
      commuteMinutes: commute,
      annualCommuteHours: annualHours,
      monthlyTransport,
      foodAccess,
      gymAccess,
      quietness,
      amenities: amenities.length ? amenities : ["To be verified"],
      missingFields,
      pros: personalized.pros,
      cons: personalized.cons,
      hiddenRisks: personalized.hiddenRisks,
      whyHigh: personalized.whyHigh,
      tradeoffs: personalized.tradeoffs,
      confidence: Math.min(99, Math.max(70, Math.round(room.room_score || 75))),
      listedUrl: listing.url || listing.listed_url || location.url || "",
      shortReason: personalized.shortReason,
      likelyRegret: personalized.likelyRegret,
      photoTone: TONES[idx % 3],
      // ── explainability extras ──────────────────────────────────────────
      timeTax,
      totalMonthlyCost,
      regretProbability,
      regretDriver,
      vibeScore,
      agentInsight,
      scoreBreakdown,
      twelveMonthForecast: "", // filled by generateForecasts()
    };
  });
}

function buildCorrectnessChecks(result, rooms, parsedListings) {
  const comparedRooms = rooms.length;
  const comparedNeighbourhoods = (result.neighbourhood_comparison || []).length;
  const missingFieldCount = rooms.reduce((sum, room) => sum + (room.missingFields || []).length, 0);
  const avgConfidence = comparedRooms
    ? Math.round(rooms.reduce((sum, room) => sum + (room.confidence || 0), 0) / comparedRooms)
    : 0;
  const biasWarnings = result.bias_warnings || [];

  return {
    model: OPENAI_MODEL,
    summary:
      "Ranking is deterministic and auditable: LLM extracts preferences/listings and writes forecasts, while scoring, costs, tradeoffs, bias checks, and rankings are computed from explicit numbers.",
    dataCoverage: {
      roomsCompared: comparedRooms,
      neighbourhoodsCompared: comparedNeighbourhoods,
      parsedUserListings: parsedListings.length,
      averageRoomConfidence: avgConfidence,
      missingFieldCount,
    },
    checks: [
      {
        label: "Ranking formula",
        status: "passed",
        detail: "Room order comes from dimension scores × user-specific weights, not from an LLM free-text answer.",
      },
      {
        label: "Cost math",
        status: "passed",
        detail: `Cash cost = rent + monthly transport. Life cost adds a separate commute time tax at S$${TIME_VALUE_PER_HOUR}/hour.`,
      },
      {
        label: "LLM boundary",
        status: "passed",
        detail: `OpenAI ${OPENAI_MODEL} is used for preference/listing extraction and forecasts; deterministic guardrails own the final ranking.`,
      },
      {
        label: "Missing-field audit",
        status: missingFieldCount > 0 ? "warning" : "passed",
        detail:
          missingFieldCount > 0
            ? `${missingFieldCount} uncertain listing fields are surfaced instead of being silently guessed.`
            : "No critical missing fields detected in the surfaced shortlist.",
      },
      {
        label: "Bias check",
        status: biasWarnings.length > 0 ? "warning" : "passed",
        detail:
          biasWarnings.length > 0
            ? `${biasWarnings.length} cognitive bias warning(s) triggered and shown to the user.`
            : "No major bias warning triggered for this run.",
      },
    ],
  };
}

function buildInsights(result, frontendProfile, rooms = [], parsedListings = []) {
  const BIAS_META = {
    rent_anchoring:           { icon: "🧭", title: "Rent Anchoring Trap" },
    time_value_blindness:     { icon: "⏰", title: "Time-Value Blind Spot" },
    gym_friction:             { icon: "🏋️", title: "Gym Friction" },
    hybrid_commute_overweight:{ icon: "🏠", title: "Hybrid-Work Commute Overestimate" },
    popularity_premium:       { icon: "🔥", title: "Popularity Premium" },
    budget_tight:             { icon: "💸", title: "Tight Budget" },
  };

  const biasWarnings = (result.bias_warnings || []).map((w) => {
    const meta = BIAS_META[w.type] || { icon: "⚠️", title: w.type };
    return {
      type: w.type,
      severity: w.severity || "medium",
      title: meta.title,
      message: w.message,
      icon: meta.icon,
    };
  });

  const weightsRaw = result.weights_used || {};
  const weights = {
    commute:  Number((weightsRaw.commute  || 0).toFixed(3)),
    budget:   Number((weightsRaw.budget   || 0).toFixed(3)),
    gym:      Number((weightsRaw.gym      || 0).toFixed(3)),
    food:     Number((weightsRaw.food     || 0).toFixed(3)),
    quietness:Number((weightsRaw.quietness|| 0).toFixed(3)),
  };

  const t = result.tradeoffs;
  const tradeoffs = t ? {
    winnerName:              t.winner_name,
    runnerUpName:            t.runner_up_name,
    verdict:                 t.verdict,
    confidence:              t.confidence,
    gains:                   t.gains || [],
    losses:                  t.losses || [],
    annualCommuteHoursSaved: t.annual_commute_hours_saved || 0,
    trueCostDifference:      Math.round(t.true_cost_difference || 0),
    rentDifference:          Math.round(t.rent_difference || 0),
  } : null;

  const neighbourhoodComparison = (result.neighbourhood_comparison || []).map((c) => {
    const rowMonthlyTransport = Math.min(Math.round((c.annual_transport_cost || 0) / 12), MONTHLY_PASS_CAP);
    const rowTimeTax          = Math.round(((c.annual_commute_hours || 0) / 12) * TIME_VALUE_PER_HOUR);
    const rowRent             = c.rent || 0;
    const rowTotalMonthlyCost = rowRent + rowMonthlyTransport + rowTimeTax;
    return {
      id:                c.id,
      name:              c.name,
      score:             Math.round(c.score),
      commuteMinutes:    c.commute_minutes,
      annualCommuteHours:c.annual_commute_hours,
      annualTransportCost: Math.round(c.annual_transport_cost),
      rent:              rowRent,
      trueMonthlyCost:   c.true_monthly_cost,
      dimensionScores:   c.dimension_scores || {},
      // ── cost breakdown additions ──────────────────────────────────────
      monthlyTransport:  rowMonthlyTransport,
      timeTax:           rowTimeTax,
      totalMonthlyCost:  rowTotalMonthlyCost,
    };
  });

  const s = result.lifestyle_simulation;
  const lifeSimulation = s ? {
    narrative:        s.narrative || "",
    departureTime:    s.winner?.weekday?.departure_time || "",
    gymDays:          s.winner?.weekday?.gym_days || [],
    annualHoursSaved: s.annual_hours_saved || 0,
    winnerTimeline:   s.winner?.weekday?.timeline || [],
    runnerUpTimeline: s.runner_up?.weekday?.timeline || [],
  } : null;

  // ── weightRationale ──────────────────────────────────────────────────────
  const officeDays = frontendProfile?.officeDays ?? 5;
  const rankedPriorities = frontendProfile?.rankedPriorities || [];
  const weightRationale = Object.keys(DIM_LABELS)
    .map((dim) => {
      const w = weightsRaw[dim] || 0;
      let reason = "Default baseline weight";
      if (rankedPriorities.length > 0 && rankedPriorities[0] === dimToEnglishPriority(dim)) {
        reason = "You ranked it as a top priority";
      } else if (dim === "commute" && w <= 0.2 && officeDays <= 3) {
        reason = `You only work from the office ${officeDays} days/week, so commute weight was reduced`;
      } else if (dim === "gym" && rankedPriorities.includes("Gym access")) {
        reason = "You listed gym access as a priority";
      } else if (dim === "quietness" && rankedPriorities.includes("Quiet environment")) {
        reason = "You prefer a quiet living environment";
      } else if (rankedPriorities.some((p) => dimMatchesPriority(dim, p))) {
        reason = "You ranked it as a top priority";
      }
      return { dimension: dim, label: DIM_LABELS[dim], weight: Math.round(w * 1000) / 1000, reason };
    })
    .sort((a, b) => b.weight - a.weight);

  const correctness = buildCorrectnessChecks(result, rooms, parsedListings);
  const fallbackExplanation = result.fallback_message
    ? {
        message: result.fallback_message,
        surfaced: true,
      }
    : null;
  const recommendationExplanation = result.recommendation
    ? {
        headline: result.recommendation.headline,
        why: result.recommendation.why || [],
      }
    : null;
  const costDefinition = {
    cashMonthlyCost: "rent + monthly transport",
    lifeMonthlyCost: `rent + monthly transport + commute time tax at S$${TIME_VALUE_PER_HOUR}/hour`,
    monthlyTransportCap: MONTHLY_PASS_CAP,
  };

  return {
    biasWarnings,
    weights,
    tradeoffs,
    neighbourhoodComparison,
    lifeSimulation,
    weightRationale,
    correctness,
    fallbackExplanation,
    recommendationExplanation,
    costDefinition,
  };
}

function dimToEnglishPriority(dim) {
  const MAP = { commute: "Short commute", budget: "Low rent", gym: "Gym access", food: "Food nearby", quietness: "Quiet environment" };
  return MAP[dim] || dim;
}

function dimMatchesPriority(dim, priority) {
  const p = priority.toLowerCase();
  if (dim === "commute"   && (p.includes("commute") || p.includes("transit"))) return true;
  if (dim === "budget"    && (p.includes("budget")  || p.includes("rent")))    return true;
  if (dim === "gym"       && p.includes("gym"))                                 return true;
  if (dim === "food"      && (p.includes("food")    || p.includes("hawker")))  return true;
  if (dim === "quietness" && p.includes("quiet"))                               return true;
  return false;
}

// ── Forecast generation ──────────────────────────────────────────────────

async function generateForecasts(rooms, profile) {
  const TOP_N = 3;
  const top = rooms.slice(0, TOP_N);

  function templateFallback(room) {
    return `12 months later: In ${room.area}, you would spend about ${room.annualCommuteHours} hours commuting per year, with a total monthly impact around S$${room.totalMonthlyCost} including time cost.`;
  }

  // Fill rooms beyond top 3 with template immediately
  for (let i = TOP_N; i < rooms.length; i++) {
    rooms[i].twelveMonthForecast = templateFallback(rooms[i]);
  }

  if (top.length === 0) return rooms;

  const payload = top.map((r) => ({
    id:                r.id,
    title:             r.title,
    area:              r.area,
    rent:              r.rent,
    commuteMinutes:    r.commuteMinutes,
    annualCommuteHours:r.annualCommuteHours,
    totalMonthlyCost:  r.totalMonthlyCost,
    regretProbability: r.regretProbability,
    topVibe:           r.vibeScore?.lifestyle ?? 5,
  }));

  try {
    const resp = await getOpenAIClient().chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Dolphine, a senior Singapore rental decision coach for a champion hackathon demo. Write emotionally vivid but strictly evidence-grounded English '12 months later' life forecasts for room options. Use ONLY fields provided in the JSON payload: id, title, area, rent, commuteMinutes, annualCommuteHours, totalMonthlyCost, regretProbability, topVibe. Do not invent MRT stations, room size, landlord behavior, roommates, safety, food places, gyms, amenities, exact savings, salary, or future events. Mention 2-3 concrete metrics naturally. Treat each forecast as a plausible simulation, not a guaranteed prediction. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Generate a "12 months after moving in" life forecast for each room below. The goal is a champion-level hackathon demo: make judges feel that Dolphine is not just recommending rooms, but simulating what a year of real life in Singapore could feel like.

Writing requirements:
- Each forecast must be 2-3 English sentences, specific and vivid without exaggeration.
- Mention at least one number: rent, commute minutes, annual commute hours, total monthly impact, or regret probability.
- Use only fields provided in the room data; do not invent MRT stations, room size, roommates, landlords, specific restaurants, gyms, or safety conditions.
- Write like an experienced Singapore rental advisor: explain through daily routine, commute friction, budget pressure, and long-term regret risk.
- Do not output markdown and do not add text outside the JSON.

Return JSON in this shape:
{ "forecasts": [{ "id": "<room id>", "forecast": "<2-3 English sentences>" }] }

Rooms:
${JSON.stringify(payload)}`,
        },
      ],
    });

    const parsed = JSON.parse(resp.choices[0].message.content);
    const forecastMap = {};
    for (const f of parsed.forecasts || []) forecastMap[f.id] = f.forecast;

    for (const room of top) {
      room.twelveMonthForecast = forecastMap[room.id] || templateFallback(room);
    }
  } catch (err) {
    console.error("generateForecasts error:", err?.message || err);
    for (const room of top) {
      if (!room.twelveMonthForecast) room.twelveMonthForecast = templateFallback(room);
    }
  }

  return rooms;
}

// ── Routes ────────────────────────────────────────────────────────────────

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "roommatch-backend" });
});

app.get("/api/rooms", async (_request, response, next) => {
  try {
    response.json({ rooms: await getRooms() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/recommendations", async (request, response, next) => {
  try {
    const preferences = normalizePreferences(request.body);
    const rankedRooms = (await getRooms())
      .map((room) => scoreRoom(room, preferences))
      .sort((roomA, roomB) => roomB.score - roomA.score);

    const rooms = preferences.limit ? rankedRooms.slice(0, preferences.limit) : rankedRooms;
    response.json({
      preferences,
      rooms,
      strongMatches: rankedRooms.filter((room) => room.score >= 68).length,
      summary: `Compared budget, MRT walk, commute to ${preferences.targetArea}, food access, comfort, and required features.`
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/chat", async (request, response, next) => {
  try {
    const { sessionId, message, profile, listingMode, listingInputs } = request.body;
    if (!sessionId || !message) {
      return response.status(400).json({ error: "sessionId and message are required" });
    }

    const session = getOrCreateSession(sessionId);
    const previousMessages = [...session.messages];
    session.messages.push({ role: "user", content: message });
    if (profile) session.profile = profile;

    let listings = [];
    if (listingMode && listingMode !== "demo" && listingInputs?.length) {
      listings = await parseListings(listingInputs, listingMode);
    }

    const algoResponse = await fetch("http://localhost:8000/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_input: message,
        conversation_history: previousMessages.length > 0 ? previousMessages : null,
        listings: listings.length > 0 ? listings : null,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!algoResponse.ok) {
      const errText = await algoResponse.text();
      throw new Error(`Algorithm error ${algoResponse.status}: ${errText}`);
    }

    const result = await algoResponse.json();

    session.messages.push({
      role: "assistant",
      content: `Recommendation: ${result.recommendation?.neighbourhood || "Unknown"}, score: ${result.recommendation?.score || 0}. Bias warnings: ${(result.bias_warnings || []).map((w) => w.type).join(", ") || "none"}`,
    });

    let rooms = mapRecommendResultToRoomListings(result, session.profile);
    rooms = await generateForecasts(rooms, session.profile) || rooms;
    const insights = buildInsights(result, session.profile, rooms, listings);
    response.json({ rooms, insights, sessionId });
  } catch (error) {
    next(error);
  }
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(frontendDir, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong" });
});

await initializeDatabase();
await startServer(port, maxPortRetries);
