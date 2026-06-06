import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const listingsDir = path.join(backendDir, "data", "listings");
const rawDir = path.join(listingsDir, "research_batches", "99co_browser_raw");
const port = Number(process.env.RESEARCH_RECEIVER_PORT || 3125);

await fs.mkdir(rawDir, { recursive: true });

function sendJson(response, status, value) {
  response.writeHead(status, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json"
  });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && request.url === "/manifest") {
      const manifest = JSON.parse(await fs.readFile(path.join(listingsDir, "station_manifest.json"), "utf8"));
      sendJson(response, 200, manifest);
      return;
    }

    if (request.method === "GET" && request.url === "/browser-99co-extractor.js") {
      const script = await fs.readFile(path.join(__dirname, "browser-99co-extractor.js"), "utf8");
      response.writeHead(200, {
        "access-control-allow-origin": "*",
        "content-type": "application/javascript"
      });
      response.end(script);
      return;
    }

    if (request.method === "POST" && request.url === "/station") {
      const body = await readBody(request);
      const payload = JSON.parse(body);
      if (!payload.station_slug || !/^[a-z0-9_]+$/.test(payload.station_slug)) {
        sendJson(response, 400, { ok: false, error: "station_slug is required" });
        return;
      }

      await fs.writeFile(path.join(rawDir, `${payload.station_slug}.json`), `${JSON.stringify(payload, null, 2)}\n`);
      sendJson(response, 200, { ok: true, station_slug: payload.station_slug, listing_count: payload.listings?.length || 0 });
      return;
    }

    sendJson(response, 404, { ok: false, error: "not found" });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Research receiver listening at http://127.0.0.1:${port}`);
  console.log(`Writing raw station extracts to ${path.relative(process.cwd(), rawDir)}`);
});