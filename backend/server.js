import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
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
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a Singapore room listing parser. Extract structured data. Return JSON only.",
        },
        {
          role: "user",
          content: `Parse this Singapore room listing. Return JSON with these fields: { "name": string, "rent": number (SGD/month integer), "area": string (Singapore neighbourhood name), "room_type": "common_room"|"master_room"|"studio"|"co_living", "unit_type": string (e.g. "3B2B"), "mrt_station": string, "mrt_walk_minutes": number, "amenities": { "aircon": bool, "wifi": bool, "cooking": bool, "private_bath": bool, "furnished": bool, "washing_machine": bool }, "url": string|null, "confidence": number (0-100) }\n\nListing:\n${content}`,
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

function mapRecommendResultToRoomListings(result, frontendProfile) {
  const { recommendation, bias_warnings = [], tradeoffs, all_rooms = [] } = result;
  const workDays = frontendProfile?.officeDays ?? 5;
  const RANK_LABELS = ["#1 Best Overall Fit", "#2 Runner-Up", "#3 Budget Pick", "#4 Alternative", "#5 Fallback"];
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

    let transportCostSGD = 1.5;
    const commuteData = nb.commute || {};
    const firstCommuteVal = Object.values(commuteData)[0];
    if (firstCommuteVal && firstCommuteVal.cost_sgd) transportCostSGD = firstCommuteVal.cost_sgd;
    const monthlyTransport = Math.round(transportCostSGD * 2 * workDays * 4.33);

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

    let pros = [], cons = [], whyHigh = [], hiddenRisks = [];
    if (isWinner && tradeoffs) {
      pros = tradeoffs.gains?.length ? tradeoffs.gains : ["Best overall match for your profile"];
      cons = tradeoffs.losses?.length ? tradeoffs.losses : [];
      whyHigh = recommendation.why || [];
      hiddenRisks = bias_warnings.map((w) => w.message).slice(0, 3);
    } else {
      if ((room.budget_headroom || 0) > 300) pros.push(`S$${Math.round(room.budget_headroom)} under budget`);
      if (commute < 20) pros.push(`Short ${commute} min commute`);
      if (nb.gyms?.activesg_gym) pros.push("ActiveSG gym nearby");
      if ((nb.food?.hawker_centres || 0) >= 2) pros.push(`${nb.food.hawker_centres} hawker centres`);
      if (commute > 35) cons.push(`Long ${commute} min commute`);
      if ((room.budget_headroom || 200) < 100) cons.push("Tight budget margin");
      if (!amenitiesMap.cooking) cons.push("No cooking");
      whyHigh = pros.slice(0, 4);
      hiddenRisks = bias_warnings
        .filter((w) => !w.neighbourhood || w.neighbourhood === nb.name)
        .map((w) => w.message)
        .slice(0, 2);
    }

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

    return {
      id: room.id || `room-${idx}`,
      rankLabel: RANK_LABELS[idx] || `#${idx + 1}`,
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
      pros: pros.length ? pros : ["Meets basic requirements"],
      cons: cons.length ? cons : ["Verify details with agent"],
      hiddenRisks: hiddenRisks.length ? hiddenRisks : [],
      whyHigh: whyHigh.length ? whyHigh : (recommendation.why || []).slice(0, 3),
      tradeoffs: [
        `S$${rent}/mo rent`,
        `${commute} min commute`,
        `${gymWalk} min to gym`,
        `Food: ${typeof foodScore === "number" ? foodScore.toFixed(1) : foodScore}/10`,
      ],
      confidence: Math.min(99, Math.max(70, Math.round(room.room_score || 75))),
      listedUrl: listing.url || listing.listed_url || location.url || "",
      shortReason: isWinner
        ? recommendation.headline || pros[0] || "Best overall match"
        : pros[0] || `${nb.name} is a solid option`,
      likelyRegret: cons[0] || "Verify all listing details before committing",
      photoTone: TONES[idx % 3],
    };
  });
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
      content: `推荐: ${result.recommendation?.neighbourhood || "Unknown"}, 分数: ${result.recommendation?.score || 0}。偏见警告: ${(result.bias_warnings || []).map((w) => w.type).join(", ") || "无"}`,
    });

    const rooms = mapRecommendResultToRoomListings(result, session.profile);
    response.json({ rooms, sessionId });
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
