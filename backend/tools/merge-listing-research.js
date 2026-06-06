import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const listingsDir = path.join(backendDir, "data", "listings");
const stationDir = path.join(listingsDir, "by_mrt");

function normalizedKey(listing) {
  const sourceKey = `${listing.source_platform || ""}::${listing.source_listing_id || ""}`.toLowerCase();
  if (listing.source_platform && listing.source_listing_id) return sourceKey;
  if (listing.listing_url) return listing.listing_url.toLowerCase();

  return [listing.address_text, listing.rental_monthly, listing.title]
    .filter(Boolean)
    .join("::")
    .toLowerCase();
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(listingsDir, "station_manifest.json"), "utf8"));
  const merged = [];
  const rejected = [];
  const seen = new Map();

  for (const station of manifest.stations) {
    const filePath = path.join(stationDir, `house_${station.slug}.json`);
    const stationFile = JSON.parse(await fs.readFile(filePath, "utf8"));

    for (const listing of stationFile.listings) {
      const key = normalizedKey(listing);
      if (seen.has(key)) {
        rejected.push({
          reason: "duplicate",
          station_slug: station.slug,
          duplicate_of_station_slug: seen.get(key).station_slug,
          listing_url: listing.listing_url,
          source_platform: listing.source_platform,
          source_listing_id: listing.source_listing_id
        });
        continue;
      }

      seen.set(key, { station_slug: station.slug });
      merged.push({
        station_slug: station.slug,
        station_name: station.name,
        ...listing
      });
    }
  }

  await fs.writeFile(path.join(listingsDir, "house_listings_merged.json"), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    source_station_count: manifest.station_count,
    listing_count: merged.length,
    listings: merged
  }, null, 2)}\n`);

  await fs.writeFile(path.join(listingsDir, "house_listings_rejected.json"), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    rejected_count: rejected.length,
    rejected
  }, null, 2)}\n`);

  console.log(`Merged ${merged.length} listing records into data/listings/house_listings_merged.json.`);
  console.log(`Wrote ${rejected.length} rejected records into data/listings/house_listings_rejected.json.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});