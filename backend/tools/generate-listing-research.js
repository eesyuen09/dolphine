import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const listingsDir = path.join(backendDir, "data", "listings");
const stationDir = path.join(listingsDir, "by_mrt");
const researchedAt = "2026-06-06T00:00:00+08:00";

const lineNames = {
  nsl: "North-South Line",
  ewl: "East-West Line",
  nel: "North East Line",
  ccl: "Circle Line",
  dtl: "Downtown Line",
  tel: "Thomson-East Coast Line"
};

const stationLines = [
  ["nsl", ["Jurong East", "Bukit Batok", "Bukit Gombak", "Choa Chu Kang", "Yew Tee", "Kranji", "Marsiling", "Woodlands", "Admiralty", "Sembawang", "Canberra", "Yishun", "Khatib", "Yio Chu Kang", "Ang Mo Kio", "Bishan", "Braddell", "Toa Payoh", "Novena", "Newton", "Orchard", "Somerset", "Dhoby Ghaut", "City Hall", "Raffles Place", "Marina Bay", "Marina South Pier"]],
  ["ewl", ["Pasir Ris", "Tampines", "Simei", "Tanah Merah", "Bedok", "Kembangan", "Eunos", "Paya Lebar", "Aljunied", "Kallang", "Lavender", "Bugis", "City Hall", "Raffles Place", "Tanjong Pagar", "Outram Park", "Tiong Bahru", "Redhill", "Queenstown", "Commonwealth", "Buona Vista", "Dover", "Clementi", "Jurong East", "Chinese Garden", "Lakeside", "Boon Lay", "Pioneer", "Joo Koon", "Gul Circle", "Tuas Crescent", "Tuas West Road", "Tuas Link", "Expo", "Changi Airport"]],
  ["nel", ["HarbourFront", "Outram Park", "Chinatown", "Clarke Quay", "Dhoby Ghaut", "Little India", "Farrer Park", "Boon Keng", "Potong Pasir", "Woodleigh", "Serangoon", "Kovan", "Hougang", "Buangkok", "Sengkang", "Punggol", "Punggol Coast"]],
  ["ccl", ["Dhoby Ghaut", "Bras Basah", "Esplanade", "Promenade", "Nicoll Highway", "Stadium", "Mountbatten", "Dakota", "Paya Lebar", "MacPherson", "Tai Seng", "Bartley", "Serangoon", "Lorong Chuan", "Bishan", "Marymount", "Caldecott", "Botanic Gardens", "Farrer Road", "Holland Village", "Buona Vista", "One-North", "Kent Ridge", "Haw Par Villa", "Pasir Panjang", "Labrador Park", "Telok Blangah", "HarbourFront", "Bayfront", "Marina Bay"]],
  ["dtl", ["Bukit Panjang", "Cashew", "Hillview", "Hume", "Beauty World", "King Albert Park", "Sixth Avenue", "Tan Kah Kee", "Botanic Gardens", "Stevens", "Newton", "Little India", "Rochor", "Bugis", "Promenade", "Bayfront", "Downtown", "Telok Ayer", "Chinatown", "Fort Canning", "Bencoolen", "Jalan Besar", "Bendemeer", "Geylang Bahru", "Mattar", "MacPherson", "Ubi", "Kaki Bukit", "Bedok North", "Bedok Reservoir", "Tampines West", "Tampines", "Tampines East", "Upper Changi", "Expo"]],
  ["tel", ["Woodlands North", "Woodlands", "Woodlands South", "Springleaf", "Lentor", "Mayflower", "Bright Hill", "Upper Thomson", "Caldecott", "Stevens", "Napier", "Orchard Boulevard", "Orchard", "Great World", "Havelock", "Outram Park", "Maxwell", "Shenton Way", "Marina Bay", "Gardens by the Bay", "Tanjong Rhu", "Katong Park", "Tanjong Katong", "Marine Parade", "Marine Terrace", "Siglap", "Bayshore"]]
];

const interchangeLineOverrides = new Map(Object.entries({
  jurong_east: ["North-South Line", "East-West Line"],
  woodlands: ["North-South Line", "Thomson-East Coast Line"],
  bishan: ["North-South Line", "Circle Line"],
  newton: ["North-South Line", "Downtown Line"],
  orchard: ["North-South Line", "Thomson-East Coast Line"],
  dhoby_ghaut: ["North-South Line", "North East Line", "Circle Line"],
  city_hall: ["North-South Line", "East-West Line"],
  raffles_place: ["North-South Line", "East-West Line"],
  marina_bay: ["North-South Line", "Circle Line", "Thomson-East Coast Line"],
  tampines: ["East-West Line", "Downtown Line"],
  expo: ["East-West Line", "Downtown Line"],
  paya_lebar: ["East-West Line", "Circle Line"],
  bugis: ["East-West Line", "Downtown Line"],
  outram_park: ["East-West Line", "North East Line", "Thomson-East Coast Line"],
  buona_vista: ["East-West Line", "Circle Line"],
  harbourfront: ["North East Line", "Circle Line"],
  chinatown: ["North East Line", "Downtown Line"],
  little_india: ["North East Line", "Downtown Line"],
  serangoon: ["North East Line", "Circle Line"],
  botanic_gardens: ["Circle Line", "Downtown Line"],
  caldecott: ["Circle Line", "Thomson-East Coast Line"],
  macpherson: ["Circle Line", "Downtown Line"],
  promenade: ["Circle Line", "Downtown Line"],
  bayfront: ["Circle Line", "Downtown Line"],
  stevens: ["Downtown Line", "Thomson-East Coast Line"]
}));

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[\s\-'/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildStations() {
  const stationsBySlug = new Map();

  for (const [lineCode, names] of stationLines) {
    for (const name of names) {
      const slug = slugify(name);
      const existing = stationsBySlug.get(slug) || {
        name,
        slug,
        mrt_lines: [],
        is_interchange: false,
        agent_name: `listing-agent-${slug}`,
        output_file: `backend/data/listings/by_mrt/house_${slug}.json`
      };

      existing.mrt_lines.push(lineNames[lineCode]);
      existing.is_interchange = existing.mrt_lines.length > 1;
      stationsBySlug.set(slug, existing);
    }
  }

  for (const [slug, mrtLines] of interchangeLineOverrides) {
    const station = stationsBySlug.get(slug);
    if (station) {
      station.mrt_lines = mrtLines;
      station.is_interchange = true;
    }
  }

  return [...stationsBySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function baseLocationMetrics(overrides = {}) {
  return {
    walking_to_mrt_minutes: null,
    distance_to_mrt_km: null,
    bus_stop_walk_minutes: null,
    supermarket_walk_minutes: null,
    hawker_walk_minutes: null,
    gym_walk_minutes: null,
    clinic_walk_minutes: null,
    park_walk_minutes: null,
    gym_count_nearby: null,
    food_options_nearby: null,
    supermarket_nearby: null,
    clinic_nearby: null,
    park_nearby: null,
    quietness_level: null,
    safety_level: null,
    convenience_level: null,
    ...overrides
  };
}

function listing({
  sourcePlatform,
  sourceListingId,
  listingUrl,
  title,
  description,
  propertyType,
  roomType,
  area,
  postalCode,
  addressText,
  latitude,
  longitude,
  rentalMonthly,
  floorAreaSqft,
  floorLevel = "unknown",
  listingPostedAt = null,
  sourceEvidence,
  researchNotes,
  confidence,
  locationMetrics
}) {
  const missingFields = [];
  const record = {
    source_platform: sourcePlatform,
    source_listing_id: sourceListingId,
    listing_url: listingUrl,
    title,
    description,
    property_type: propertyType,
    room_type: roomType,
    area,
    nearest_mrt: "One-North",
    district: postalCode?.startsWith("138") ? "D05" : null,
    postal_code: postalCode,
    address_text: addressText,
    latitude,
    longitude,
    rental_monthly: rentalMonthly,
    currency: "SGD",
    deposit_months: null,
    available_from: null,
    lease_term_months: null,
    floor_area_sqft: floorAreaSqft,
    bedrooms: null,
    bathrooms: null,
    floor_level: floorLevel,
    furnishing: "unknown",
    tenant_type_allowed: null,
    has_aircon: null,
    has_private_bathroom: roomType === "master_room" ? null : false,
    cooking_allowed: null,
    wifi_included: null,
    utilities_included: null,
    landlord_verified: false,
    agent_name: null,
    is_direct_landlord: null,
    listing_posted_at: listingPostedAt,
    scraped_at: researchedAt,
    image_url: null,
    location_metrics: baseLocationMetrics(locationMetrics),
    commute_options: [
      {
        target_area: "Kent Ridge",
        transport_mode: "Public Transport",
        commute_minutes: null,
        monthly_transport_cost: null,
        annual_commute_hours: null,
        distance_km: null
      }
    ],
    note_tags: ["mrt-accessible", "source-snippet"],
    source_evidence: sourceEvidence,
    missing_fields: missingFields,
    research_notes: researchNotes,
    confidence
  };

  for (const [key, value] of Object.entries(record)) {
    if (value === null) missingFields.push(key);
  }

  return record;
}

const oneNorthListings = [
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "one-north-residences-condo-AdxkXTafCaEuttWSWYFupH",
    listingUrl: "https://www.99.co/singapore/rooms/property/one-north-residences-condo-AdxkXTafCaEuttWSWYFupH",
    title: "Master Room for Rent in One-North Residences",
    description: "Indexed source snippet reports a S$2,599, 220 sqft apartment room at One-North Residences.",
    propertyType: "apartment",
    roomType: "master_room",
    area: "One-North",
    postalCode: "138642",
    addressText: "One-North Residences, 7 One-North Gateway",
    latitude: 1.2996,
    longitude: 103.7879,
    rentalMonthly: 2599,
    floorAreaSqft: 220,
    confidence: 0.68,
    locationMetrics: { walking_to_mrt_minutes: 5, distance_to_mrt_km: 0.4 },
    sourceEvidence: [
      { field: "rental_monthly", value: 2599, evidence: "Google-indexed 99.co snippet: S$ 2599, 220 sqft Apartment Room for Rent.", confidence: "medium" },
      { field: "address_text", value: "One-North Residences, 7 One-North Gateway", evidence: "Existing manual raw SQL sample derived from public search results.", confidence: "medium" }
    ],
    researchNotes: "Promoted from backend/db/seed-listings-raw.sql manual public-web sample. Listing page should be opened before production import. Amenity fields left null unless directly visible."
  }),
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "one-north-residences-condo-RUtgg55YryRwtMtnLbLi6t",
    listingUrl: "https://www.99.co/singapore/rooms/property/one-north-residences-condo-RUtgg55YryRwtMtnLbLi6t",
    title: "Ensuite Master Room at One-North Residences",
    description: "Indexed source snippet states an ensuite room available now in an all-lady unit, one pax at S$2,600 nett and up to two pax at S$2,700.",
    propertyType: "condo",
    roomType: "master_room",
    area: "One-North",
    postalCode: "138642",
    addressText: "One-North Residences, 7 One-North Gateway, #04",
    latitude: 1.2996,
    longitude: 103.7879,
    rentalMonthly: 2600,
    floorAreaSqft: null,
    floorLevel: "low",
    confidence: 0.72,
    locationMetrics: { walking_to_mrt_minutes: 5, distance_to_mrt_km: 0.4 },
    sourceEvidence: [
      { field: "rental_monthly", value: 2600, evidence: "Google-indexed 99.co snippet: one pax $2600 nett; up to 2 pax $2700.", confidence: "medium" },
      { field: "has_private_bathroom", value: true, evidence: "Snippet describes the room as ensuite.", confidence: "medium" }
    ],
    researchNotes: "Promoted from existing raw SQL research sample; source page verification still needed for current active status and full amenity detail."
  }),
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "north-buona-vista-road-condo-DJBMdwnjPZuKhSBBkJnh5V",
    listingUrl: "https://www.99.co/singapore/rooms/property/north-buona-vista-road-condo-DJBMdwnjPZuKhSBBkJnh5V",
    title: "Master Room for Rent at North Buona Vista Road",
    description: "Indexed source snippet reports a S$2,600, 180 sqft condo room on North Buona Vista Road.",
    propertyType: "condo",
    roomType: "master_room",
    area: "North Buona Vista Road",
    postalCode: null,
    addressText: "North Buona Vista Road",
    latitude: 1.306,
    longitude: 103.79,
    rentalMonthly: 2600,
    floorAreaSqft: 180,
    confidence: 0.64,
    locationMetrics: { walking_to_mrt_minutes: 8, distance_to_mrt_km: 0.7 },
    sourceEvidence: [
      { field: "rental_monthly", value: 2600, evidence: "Google-indexed 99.co snippet: S$ 2600, 180 sqft Condo Room for Rent.", confidence: "medium" }
    ],
    researchNotes: "Within expanded One-North/Buona Vista catchment. Postal code not visible in snippet, so it is null."
  }),
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "one-north-residences-condo-frVB7vEYvgPjuryZSuZa3g",
    listingUrl: "https://www.99.co/singapore/rooms/property/one-north-residences-condo-frVB7vEYvgPjuryZSuZa3g",
    title: "Condo Room for Rent at One-North Residences",
    description: "Indexed source snippet reports a S$1,680, 120 sqft condo room at One-North Residences.",
    propertyType: "condo",
    roomType: "common_room",
    area: "One-North",
    postalCode: "138642",
    addressText: "One-North Residences, 7 One-North Gateway",
    latitude: 1.2996,
    longitude: 103.7879,
    rentalMonthly: 1680,
    floorAreaSqft: 120,
    confidence: 0.66,
    locationMetrics: { walking_to_mrt_minutes: 5, distance_to_mrt_km: 0.4 },
    sourceEvidence: [
      { field: "rental_monthly", value: 1680, evidence: "Google-indexed 99.co snippet: S$ 1680, 120 sqft Condo Room for Rent.", confidence: "medium" }
    ],
    researchNotes: "Room type normalized to common_room because the snippet only says condo room and does not indicate ensuite/master."
  }),
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "one-north-residences-condo-NRJNDbL4xt8j8Nck753J9e",
    listingUrl: "https://www.99.co/singapore/rooms/property/one-north-residences-condo-NRJNDbL4xt8j8Nck753J9e",
    title: "Master Room for Rent in One-North Residences",
    description: "Indexed source snippet reports a S$2,500, 200 sqft apartment room at One-North Residences.",
    propertyType: "apartment",
    roomType: "master_room",
    area: "One-North",
    postalCode: "138642",
    addressText: "One-North Residences, 7 One-North Gateway",
    latitude: 1.2996,
    longitude: 103.7879,
    rentalMonthly: 2500,
    floorAreaSqft: 200,
    confidence: 0.68,
    locationMetrics: { walking_to_mrt_minutes: 5, distance_to_mrt_km: 0.4 },
    sourceEvidence: [
      { field: "rental_monthly", value: 2500, evidence: "Google-indexed 99.co snippet: S$ 2500, 200 sqft Apartment Room for Rent.", confidence: "medium" }
    ],
    researchNotes: "Promoted from existing raw SQL sample; verify listing page before production import."
  }),
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "one-north-eden-condo-aQWMXZZmByTZk4iz4QPBnE",
    listingUrl: "https://www.99.co/singapore/rooms/property/one-north-eden-condo-aQWMXZZmByTZk4iz4QPBnE",
    title: "Condo Room for Rent at One-North Eden",
    description: "Indexed source snippet reports a recently posted S$2,900, 120 sqft condo room at One-North Eden.",
    propertyType: "condo",
    roomType: "common_room",
    area: "One-North",
    postalCode: null,
    addressText: "One-North Eden",
    latitude: 1.3003,
    longitude: 103.7897,
    rentalMonthly: 2900,
    floorAreaSqft: 120,
    listingPostedAt: "2026-05-31",
    confidence: 0.64,
    locationMetrics: { walking_to_mrt_minutes: 6, distance_to_mrt_km: 0.5 },
    sourceEvidence: [
      { field: "rental_monthly", value: 2900, evidence: "Google-indexed 99.co snippet: S$ 2900, 120 sqft Condo Room for Rent.", confidence: "medium" },
      { field: "listing_posted_at", value: "2026-05-31", evidence: "Snippet said 6 days ago relative to 2026-06-06.", confidence: "low" }
    ],
    researchNotes: "Very high rent for a compact room; page verification needed. Postal code not visible in snippet."
  }),
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "one-north-residences-condo-cG2m9W3vFiw3bTg5REwSTC",
    listingUrl: "https://www.99.co/singapore/rooms/property/one-north-residences-condo-cG2m9W3vFiw3bTg5REwSTC",
    title: "Common Room for Rent in One-North Residences",
    description: "Indexed source snippet reports a S$1,680, 180 sqft apartment room at One-North Residences.",
    propertyType: "apartment",
    roomType: "common_room",
    area: "One-North",
    postalCode: "138642",
    addressText: "One-North Residences, 7 One-North Gateway",
    latitude: 1.2996,
    longitude: 103.7879,
    rentalMonthly: 1680,
    floorAreaSqft: 180,
    confidence: 0.7,
    locationMetrics: { walking_to_mrt_minutes: 5, distance_to_mrt_km: 0.4 },
    sourceEvidence: [
      { field: "rental_monthly", value: 1680, evidence: "Google-indexed 99.co snippet: S$ 1680, 180 sqft Apartment Room for Rent.", confidence: "medium" }
    ],
    researchNotes: "Promoted from existing raw SQL sample; separate listing id from similar One-North Residences S$1,680 candidate."
  }),
  listing({
    sourcePlatform: "99.co",
    sourceListingId: "buona-vista-gardens-condo-5hP4VaAv7oBQMVryiRkCDy",
    listingUrl: "https://www.99.co/singapore/rooms/property/buona-vista-gardens-condo-5hP4VaAv7oBQMVryiRkCDy",
    title: "Condo Room for Rent at Buona Vista Gardens",
    description: "Indexed source snippet reports a S$1,350, 100 sqft condo room at Buona Vista Gardens.",
    propertyType: "condo",
    roomType: "common_room",
    area: "Buona Vista",
    postalCode: null,
    addressText: "Buona Vista Gardens",
    latitude: 1.309,
    longitude: 103.787,
    rentalMonthly: 1350,
    floorAreaSqft: 100,
    confidence: 0.62,
    locationMetrics: { walking_to_mrt_minutes: 10, distance_to_mrt_km: 0.9 },
    sourceEvidence: [
      { field: "rental_monthly", value: 1350, evidence: "Google-indexed 99.co snippet: S$ 1350, 100 sqft Condo Room for Rent.", confidence: "medium" }
    ],
    researchNotes: "Expanded One-North catchment toward Buona Vista because the station agent had fewer than 20 verified candidates."
  }),
  listing({
    sourcePlatform: "PropertyGuru",
    sourceListingId: "pg-dover-parkview-one-north-snippet-1450",
    listingUrl: "https://www.propertyguru.com.sg/property-for-rent/near-cc23-one-north-mrt-station-1658/room-rental",
    title: "Coliving Master Room at Dover Parkview",
    description: "Indexed source snippet reports S$1,450 per month at Dover Parkview, 36 Dover Rise, master room, 110 sqft, condominium built in 1997.",
    propertyType: "condo",
    roomType: "master_room",
    area: "Dover",
    postalCode: "138685",
    addressText: "Dover Parkview, 36 Dover Rise",
    latitude: 1.3061,
    longitude: 103.7806,
    rentalMonthly: 1450,
    floorAreaSqft: 110,
    confidence: 0.6,
    locationMetrics: { walking_to_mrt_minutes: 12, distance_to_mrt_km: 1.0 },
    sourceEvidence: [
      { field: "rental_monthly", value: 1450, evidence: "Google-indexed PropertyGuru snippet: S$ 1,450 /mo. Dover Parkview. Master Room. 110 sqft.", confidence: "medium" }
    ],
    researchNotes: "Expanded catchment toward Dover/Buona Vista. Page URL is a PropertyGuru search/listing collection URL and should be resolved to the exact listing before production import."
  }),
  listing({
    sourcePlatform: "PropertyGuru",
    sourceListingId: "pg-rochester-residences-one-north-snippet-1600",
    listingUrl: "https://www.propertyguru.com.sg/apartment-for-rent/near-cc23-one-north-mrt-station-1658/priced-under-4k-sgd",
    title: "Prime Buona Vista Condo Room at The Rochester Residences",
    description: "Indexed source snippet reports S$1,600 per month at The Rochester Residences, 33 Rochester Drive, common room, 165 sqft, apartment built in 2011.",
    propertyType: "apartment",
    roomType: "common_room",
    area: "Buona Vista",
    postalCode: "138638",
    addressText: "The Rochester Residences, 33 Rochester Drive",
    latitude: 1.3052,
    longitude: 103.7887,
    rentalMonthly: 1600,
    floorAreaSqft: 165,
    confidence: 0.6,
    locationMetrics: { walking_to_mrt_minutes: 8, distance_to_mrt_km: 0.7 },
    sourceEvidence: [
      { field: "rental_monthly", value: 1600, evidence: "Google-indexed PropertyGuru snippet: S$ 1,600 /mo. The Rochester Residences. Common Room. 165 sqft.", confidence: "medium" }
    ],
    researchNotes: "Expanded catchment toward Rochester/Buona Vista. Page URL should be resolved to the exact listing before production import."
  })
];

function fallbackAreas(station) {
  const adjacent = {
    one_north: ["Buona Vista", "Dover", "Ghim Moh", "Rochester", "Science Park"],
    buona_vista: ["One-North", "Dover", "Ghim Moh", "Rochester", "Holland Village"],
    dover: ["Buona Vista", "Clementi", "Ghim Moh", "Sunset Way", "One-North"]
  };

  return adjacent[station.slug] || [
    `${station.name} estate`,
    `${station.name} room rental`,
    `${station.name} HDB blocks`,
    `${station.name} condo rooms`,
    `adjacent MRT stations near ${station.name}`
  ];
}

function stationResearchFile(station, listings) {
  const sources = [...new Set(listings.map((item) => item.source_platform))];
  const limitations = [];

  if (listings.length < 20) {
    limitations.push(`Only ${listings.length} source-backed candidate listings have been captured so far; continue live portal research before production import.`);
  }

  if (listings.length === 0) {
    limitations.push("Station output scaffolded for agent assignment, but no verified public rental listings have been collected yet.");
  }

  return {
    station: {
      name: station.name,
      slug: station.slug,
      mrt_lines: station.mrt_lines,
      is_interchange: station.is_interchange
    },
    research_metadata: {
      agent_name: station.agent_name,
      researched_at: researchedAt,
      target_listing_count: 20,
      actual_listing_count: listings.length,
      search_radius_km: listings.length > 0 && listings.length < 20 ? 2 : 1,
      sources_used: sources,
      known_limitations: limitations,
      fallback_search_areas: fallbackAreas(station)
    },
    listings
  };
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const stations = buildStations();
  await fs.mkdir(stationDir, { recursive: true });

  await writeJson(path.join(listingsDir, "station_manifest.json"), {
    generated_at: researchedAt,
    station_count: stations.length,
    stations
  });

  for (const station of stations) {
    const listings = station.slug === "one_north" ? oneNorthListings : [];
    await writeJson(path.join(stationDir, `house_${station.slug}.json`), stationResearchFile(station, listings));
  }

  console.log(`Generated ${stations.length} station research files in ${path.relative(process.cwd(), stationDir)}.`);
  console.log(`Seeded house_one_north.json with ${oneNorthListings.length} source-backed candidate listings.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});