import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const listingsDir = path.join(backendDir, "data", "listings");
const stationDir = path.join(listingsDir, "by_mrt");
const rawDirs = [
  path.join(listingsDir, "research_batches", "99co_browser_raw"),
  path.join(listingsDir, "research_batches", "fallback_portal_raw")
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function mergeLimitations(existing, listingCount, sourceUrl, error, fallbackSourceUrls = []) {
  const limitations = [];
  if (listingCount < 10) {
    limitations.push(`99.co browser research found ${listingCount} usable room listings for this station page; continue with other portals if 10 are required.`);
  }
  if (error) limitations.push(`99.co browser extraction error: ${error}`);
  if (sourceUrl) limitations.push(`Primary source page researched: ${sourceUrl}`);
  for (const fallbackSourceUrl of fallbackSourceUrls) limitations.push(`Fallback source queued: ${fallbackSourceUrl}`);
  return unique([
    ...(existing || []).filter((item) => !item.includes("Station output scaffolded") && !item.includes("Only 0 source-backed")),
    ...limitations
  ]);
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(listingsDir, "station_manifest.json"), "utf8"));
  const rawFilesByStation = new Map();
  for (const rawDir of rawDirs) {
    const rawFiles = await fs.readdir(rawDir).catch(() => []);
    for (const rawFile of rawFiles.filter((file) => file.endsWith(".json"))) {
      rawFilesByStation.set(rawFile.replace(/\.json$/, ""), path.join(rawDir, rawFile));
    }
  }
  let stationFilesUpdated = 0;
  let listingsImported = 0;

  for (const station of manifest.stations) {
    const rawFilePath = rawFilesByStation.get(station.slug);
    if (!rawFilePath) continue;

    const raw = JSON.parse(await fs.readFile(rawFilePath, "utf8"));
    const stationFilePath = path.join(stationDir, `house_${station.slug}.json`);
    const stationFile = JSON.parse(await fs.readFile(stationFilePath, "utf8"));
    const listings = Array.isArray(raw.listings) ? raw.listings.slice(0, 10) : [];

    stationFile.research_metadata.actual_listing_count = listings.length;
    stationFile.research_metadata.search_radius_km = listings.length ? 2 : 1;
    stationFile.research_metadata.sources_used = unique(listings.map((listing) => listing.source_platform));
    stationFile.research_metadata.known_limitations = mergeLimitations(
      stationFile.research_metadata.known_limitations,
      listings.length,
      raw.source_url,
      raw.error,
      raw.fallback_source_urls
    );
    stationFile.listings = listings;

    await fs.writeFile(stationFilePath, `${JSON.stringify(stationFile, null, 2)}\n`);
    stationFilesUpdated += 1;
    listingsImported += listings.length;
  }

  console.log(`Imported 99.co browser research for ${stationFilesUpdated} station files.`);
  console.log(`Imported ${listingsImported} listing records.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});