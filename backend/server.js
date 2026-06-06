import express from "express";
import "./loadEnv.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractListings } from "./listingExtractor.js";

const DEFAULT_PORT = 3000;
const DEFAULT_PORT_RETRIES = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = parsePort(process.env.PORT, DEFAULT_PORT);
const host = process.env.HOST || undefined;
const maxPortRetries = parseRetryCount(process.env.PORT_RETRIES, process.env.PORT ? 0 : DEFAULT_PORT_RETRIES);
const frontendDir = path.join(__dirname, "..", "frontend");
const frontendDistDir = path.join(frontendDir, "dist");
const frontendStaticDir = (await pathExists(frontendDistDir)) ? frontendDistDir : frontendDir;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(express.text({ type: "text/plain", limit: "1mb" }));
app.use(express.static(frontendStaticDir));

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
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
      console.log(`Dolphine backend running at http://${hostname}:${resolvedPort}`);
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

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "dolphine-backend" });
});

app.post("/api/listings/extract", async (request, response, next) => {
  try {
    const payload = typeof request.body === "string" ? { text: request.body } : request.body;
    response.json(await extractListings(payload));
  } catch (error) {
    next(error);
  }
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(frontendStaticDir, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong" });
});

await startServer(port, maxPortRetries);
