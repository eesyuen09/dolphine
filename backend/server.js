import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 3000;
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

async function openDatabase(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  return new Promise((resolve, reject) => {
    let database;
    database = new sqlite3.Database(filePath, (error) => {
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

app.get("*", (_request, response) => {
  response.sendFile(path.join(frontendDir, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong" });
});

await initializeDatabase();
await startServer(port, maxPortRetries);
