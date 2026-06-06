import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const listingsDir = path.join(backendDir, "data", "listings");
const stationDir = path.join(listingsDir, "by_mrt");

const allowed = {
  property_type: new Set(["hdb", "condo", "landed", "apartment", "executive_condo", "co_living", "unknown"]),
  room_type: new Set(["common_room", "master_room", "single_room", "studio", "whole_unit", "unknown"]),
  floor_level: new Set(["low", "mid", "high", "penthouse", "unknown"]),
  furnishing: new Set(["fully_furnished", "partially_furnished", "unfurnished", "unknown"])
};

const requiredListingFields = [
  "source_platform",
  "source_listing_id",
  "listing_url",
  "title",
  "rental_monthly",
  "currency",
  "room_type",
  "nearest_mrt"
];

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateListing(fileName, listing, index, seen, errors) {
  const label = `${fileName} listings[${index}]`;

  for (const field of requiredListingFields) {
    assert(listing[field] !== null && listing[field] !== undefined && listing[field] !== "", `${label}: missing required field ${field}`, errors);
  }

  assert(/^https?:\/\//.test(listing.listing_url || ""), `${label}: listing_url must be an absolute http(s) URL`, errors);
  assert(listing.currency === "SGD", `${label}: currency must be SGD`, errors);
  assert(Number.isInteger(listing.rental_monthly) && listing.rental_monthly > 0, `${label}: rental_monthly must be a positive integer`, errors);
  assert(allowed.property_type.has(listing.property_type), `${label}: invalid property_type ${listing.property_type}`, errors);
  assert(allowed.room_type.has(listing.room_type), `${label}: invalid room_type ${listing.room_type}`, errors);
  assert(allowed.floor_level.has(listing.floor_level), `${label}: invalid floor_level ${listing.floor_level}`, errors);
  assert(allowed.furnishing.has(listing.furnishing), `${label}: invalid furnishing ${listing.furnishing}`, errors);
  assert(Array.isArray(listing.source_evidence), `${label}: source_evidence must be an array`, errors);
  assert(Array.isArray(listing.missing_fields), `${label}: missing_fields must be an array`, errors);
  assert(listing.confidence === null || (typeof listing.confidence === "number" && listing.confidence >= 0 && listing.confidence <= 1), `${label}: confidence must be null or 0..1`, errors);

  const duplicateKey = `${listing.source_platform}::${listing.source_listing_id}`.toLowerCase();
  assert(!seen.has(duplicateKey), `${label}: duplicate source platform/listing id ${duplicateKey}`, errors);
  seen.add(duplicateKey);
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(listingsDir, "station_manifest.json"), "utf8"));
  const errors = [];
  let filesChecked = 0;
  let listingsChecked = 0;

  assert(Number.isInteger(manifest.station_count), "station_manifest.json: station_count must be an integer", errors);
  assert(Array.isArray(manifest.stations), "station_manifest.json: stations must be an array", errors);
  assert(manifest.station_count === manifest.stations.length, "station_manifest.json: station_count must equal stations.length", errors);

  for (const station of manifest.stations) {
    const fileName = `house_${station.slug}.json`;
    const filePath = path.join(stationDir, fileName);
    const data = JSON.parse(await fs.readFile(filePath, "utf8"));
    const seen = new Set();
    filesChecked += 1;

    assert(data.station?.slug === station.slug, `${fileName}: station.slug does not match manifest`, errors);
    assert(data.research_metadata?.agent_name === `listing-agent-${station.slug}`, `${fileName}: agent_name does not match station slug`, errors);
    assert(Array.isArray(data.listings), `${fileName}: listings must be an array`, errors);
    assert(data.research_metadata?.actual_listing_count === data.listings.length, `${fileName}: actual_listing_count must equal listings.length`, errors);
    assert(data.listings.length <= 20, `${fileName}: listings must not exceed 20`, errors);

    if (data.listings.length < data.research_metadata?.target_listing_count) {
      assert(
        Array.isArray(data.research_metadata.known_limitations) && data.research_metadata.known_limitations.length > 0,
        `${fileName}: files under target count must document known_limitations`,
        errors
      );
    }

    data.listings.forEach((item, index) => validateListing(fileName, item, index, seen, errors));
    listingsChecked += data.listings.length;
  }

  if (errors.length > 0) {
    console.error(`Listing research validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Listing research validation passed: ${filesChecked} station files, ${listingsChecked} listing records.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});