# MRT Listing Research Agent Plan

## Goal

Create a Singapore-wide rental listing dataset for RoomMatch AI by assigning one research agent to each MRT station. Each station agent must find up to 20 active rental listings near that station and save the result as `house_{station_name}.json`.

The dataset should support the existing `house_properties`, `house_location_metrics`, and `house_commute_options` tables in `backend/db/schema.sql`. Agents should prioritize complete, verifiable metadata. The fewer `null` values, the better.

## Scope Rules

1. Only collect rental listings.
2. Exclude sale listings, buy listings, new-launch sales pages, mortgage pages, and whole-house sale pages.
3. Prefer room rental listings because RoomMatch AI is tenant-room focused.
4. Whole-unit rental listings may be included only if room rentals around that MRT station are scarce; mark them clearly with `room_type: "whole_unit"` and explain in `research_notes`.
5. Each listing must have a valid public source URL.
6. Do not fabricate unavailable values. Use `null` when a value cannot be verified, and add a short explanation in `missing_fields` or `research_notes`.
7. Avoid duplicates across the same station file. A duplicate means the same source platform and source listing ID, same listing URL, or same address/rent/agent combination.
8. If one listing advertises multiple room options, split it into separate records only when each option has its own rent or room type. Otherwise keep it as one record and describe the variants in `description`.

## Agent Assignment Model

Use one station agent per unique MRT station.

Agent name format:

```text
listing-agent-{station_slug}
```

Output file format:

```text
backend/data/listings/by_mrt/house_{station_slug}.json
```

Station slug rules:

1. Lowercase the station name.
2. Replace spaces, hyphens, apostrophes, and slashes with `_`.
3. Collapse repeated underscores.
4. Remove punctuation.

Examples:

| MRT station | Agent name | Output file |
|---|---|---|
| One-North | `listing-agent-one_north` | `house_one_north.json` |
| Expo | `listing-agent-expo` | `house_expo.json` |
| Dhoby Ghaut | `listing-agent-dhoby_ghaut` | `house_dhoby_ghaut.json` |
| Marina Bay | `listing-agent-marina_bay` | `house_marina_bay.json` |

Interchange stations should have one output file only. For example, `Jurong East` appears on multiple lines but must produce only `house_jurong_east.json`.

## Station Agent Task

Each station agent must:

1. Search for active rental listings within a practical catchment area of the assigned MRT station.
2. Target 20 listings per station.
3. Prefer listings within 1 km walking distance of the station.
4. If fewer than 20 listings are available within 1 km, expand to 1.5 km, then 2 km, and record the expansion in `research_notes`.
5. Use multiple sources where possible: 99.co, PropertyGuru, EdgeProp, SRX, Carousell, room-rental sites, co-living operators, and agent pages.
6. Open the listing page when possible and collect details from the page, not only search snippets.
7. Cross-check address, rent, room type, and MRT proximity when the source is ambiguous.
8. Record source evidence for values that are inferred from search snippets, map lookup, or page text.
9. Save only valid JSON.

## Required Output Shape

Each `house_{station_slug}.json` file must contain this top-level object:

```json
{
  "station": {
    "name": "One-North",
    "slug": "one_north",
    "mrt_lines": ["Circle Line"],
    "is_interchange": false
  },
  "research_metadata": {
    "agent_name": "listing-agent-one_north",
    "researched_at": "2026-06-06T00:00:00+08:00",
    "target_listing_count": 20,
    "actual_listing_count": 20,
    "search_radius_km": 1.5,
    "sources_used": ["99.co", "PropertyGuru", "Carousell"],
    "known_limitations": []
  },
  "listings": []
}
```

## Listing Object Schema

Each item in `listings` should use this shape. Keep keys even when the value is `null` so downstream loaders can validate consistently.

```json
{
  "source_platform": "99.co",
  "source_listing_id": "99co-example-id",
  "listing_url": "https://www.99.co/singapore/rooms/example",
  "title": "Common room near One-North MRT",
  "description": "Short factual description from the source page.",
  "property_type": "condo",
  "room_type": "common_room",
  "area": "One-North",
  "nearest_mrt": "One-North",
  "district": "D05",
  "postal_code": "138000",
  "address_text": "7 One-North Gateway",
  "latitude": 1.299,
  "longitude": 103.787,
  "rental_monthly": 1680,
  "currency": "SGD",
  "deposit_months": 1,
  "available_from": "2026-06-15",
  "lease_term_months": 12,
  "floor_area_sqft": 120,
  "bedrooms": null,
  "bathrooms": null,
  "floor_level": "mid",
  "furnishing": "fully_furnished",
  "tenant_type_allowed": "single tenant only",
  "has_aircon": true,
  "has_private_bathroom": false,
  "cooking_allowed": true,
  "wifi_included": true,
  "utilities_included": false,
  "landlord_verified": false,
  "agent_name": "Example Agent",
  "is_direct_landlord": false,
  "listing_posted_at": "2026-06-01",
  "scraped_at": "2026-06-06T00:00:00+08:00",
  "image_url": "https://example.com/image.jpg",
  "location_metrics": {
    "walking_to_mrt_minutes": 6,
    "distance_to_mrt_km": 0.5,
    "bus_stop_walk_minutes": 3,
    "supermarket_walk_minutes": 8,
    "hawker_walk_minutes": 10,
    "gym_walk_minutes": 9,
    "clinic_walk_minutes": 7,
    "park_walk_minutes": 12,
    "gym_count_nearby": 2,
    "food_options_nearby": 15,
    "supermarket_nearby": true,
    "clinic_nearby": true,
    "park_nearby": true,
    "quietness_level": 7,
    "safety_level": 8,
    "convenience_level": 8
  },
  "commute_options": [
    {
      "target_area": "Kent Ridge",
      "transport_mode": "Public Transport",
      "commute_minutes": 18,
      "monthly_transport_cost": 70,
      "annual_commute_hours": 156,
      "distance_km": 4.2
    }
  ],
  "note_tags": ["mrt-accessible", "aircon", "wifi-included"],
  "source_evidence": [
    {
      "field": "rental_monthly",
      "value": 1680,
      "evidence": "Rent shown on source listing page",
      "confidence": "high"
    }
  ],
  "missing_fields": ["bedrooms", "bathrooms"],
  "research_notes": "Postal code was not shown on listing page; estimated from address block when available.",
  "confidence": 0.82
}
```

## Field Normalization Rules

Use these normalized values where possible:

| Field | Allowed or preferred values |
|---|---|
| `property_type` | `hdb`, `condo`, `landed`, `apartment`, `executive_condo`, `co_living`, `unknown` |
| `room_type` | `common_room`, `master_room`, `single_room`, `studio`, `whole_unit`, `unknown` |
| `currency` | `SGD` |
| `floor_level` | `low`, `mid`, `high`, `penthouse`, `unknown` |
| `furnishing` | `fully_furnished`, `partially_furnished`, `unfurnished`, `unknown` |
| Boolean fields | `true`, `false`, or `null` when not verifiable |
| Unknown numeric fields | `null`, not `0` |
| Unknown text fields | `null`, not `"unknown"`, except normalized enum fields that explicitly allow `unknown` |

For database import, boolean values will later map to `1`, `0`, or `NULL`.

## Metadata Priority

Agents should prioritize fields in this order:

1. `listing_url`, `source_platform`, `source_listing_id`
2. `title`, `rental_monthly`, `currency`, `room_type`, `property_type`
3. `nearest_mrt`, `area`, `address_text`, `postal_code`, `district`
4. `available_from`, `lease_term_months`, `deposit_months`
5. `has_aircon`, `has_private_bathroom`, `cooking_allowed`, `wifi_included`, `utilities_included`, `furnishing`
6. `walking_to_mrt_minutes`, `distance_to_mrt_km`, nearby amenities, and commute estimates
7. `agent_name`, `is_direct_landlord`, `landlord_verified`, `listing_posted_at`, `image_url`
8. `source_evidence`, `missing_fields`, `research_notes`, `confidence`

## Quality Gates

Before a station file is accepted:

1. JSON must parse successfully.
2. `actual_listing_count` must equal `listings.length`.
3. Every listing must have `listing_url`, `source_platform`, `title`, `rental_monthly`, `currency`, `room_type`, and `nearest_mrt`.
4. Every listing must be rental-focused, not sale-focused.
5. At least 70% of listings should have address or postal-code detail.
6. At least 70% of listings should have one or more room amenity fields filled: aircon, private bathroom, cooking, wifi, utilities, furnishing.
7. Each file should include no more than 20 listings unless the coordinator explicitly requests overflow candidates.
8. Duplicates must be removed or documented in `research_notes`.

## Handling Fewer Than 20 Listings

If an agent cannot find 20 valid rental listings for a station:

1. Keep the valid listings found.
2. Set `actual_listing_count` to the real number.
3. Add the reason to `research_metadata.known_limitations`.
4. Do not pad the file with fake listings.
5. Add up to 5 nearby fallback search areas in `research_notes`, such as adjacent MRT stations or estate names.

## Recommended Search Queries

Agents should try combinations like:

```text
site:99.co/singapore/rooms "{station name}" "room rent"
site:propertyguru.com.sg "{station name}" "room rental"
site:edgeprop.sg/listing "{station name}" "room rent"
site:carousell.sg "{station name}" "room for rent"
"{station name} MRT" "common room" "for rent"
"{station name} MRT" "master room" "for rent"
"{nearby estate}" "room rental" Singapore
```

Use nearby estate names when station names are poor search terms. For example, search `Tiong Bahru room rent`, `Simei room rental`, or `Kovan common room`.

## Singapore MRT Station Coverage

Create one agent and one output file for each unique station below.

### North-South Line

- Jurong East
- Bukit Batok
- Bukit Gombak
- Choa Chu Kang
- Yew Tee
- Kranji
- Marsiling
- Woodlands
- Admiralty
- Sembawang
- Canberra
- Yishun
- Khatib
- Yio Chu Kang
- Ang Mo Kio
- Bishan
- Braddell
- Toa Payoh
- Novena
- Newton
- Orchard
- Somerset
- Dhoby Ghaut
- City Hall
- Raffles Place
- Marina Bay
- Marina South Pier

### East-West Line

- Pasir Ris
- Tampines
- Simei
- Tanah Merah
- Bedok
- Kembangan
- Eunos
- Paya Lebar
- Aljunied
- Kallang
- Lavender
- Bugis
- Tanjong Pagar
- Outram Park
- Tiong Bahru
- Redhill
- Queenstown
- Commonwealth
- Buona Vista
- Dover
- Clementi
- Chinese Garden
- Lakeside
- Boon Lay
- Pioneer
- Joo Koon
- Gul Circle
- Tuas Crescent
- Tuas West Road
- Tuas Link
- Expo
- Changi Airport

### North East Line

- HarbourFront
- Chinatown
- Clarke Quay
- Little India
- Farrer Park
- Boon Keng
- Potong Pasir
- Woodleigh
- Serangoon
- Kovan
- Hougang
- Buangkok
- Sengkang
- Punggol

### Circle Line

- Telok Blangah
- Labrador Park
- Pasir Panjang
- Haw Par Villa
- Kent Ridge
- One-North
- Holland Village
- Farrer Road
- Botanic Gardens
- Caldecott
- Marymount
- Lorong Chuan
- Bartley
- Tai Seng
- MacPherson
- Dakota
- Mountbatten
- Stadium
- Nicoll Highway
- Promenade
- Bras Basah
- Esplanade
- Bayfront

### Downtown Line

- Bukit Panjang
- Cashew
- Hillview
- Beauty World
- King Albert Park
- Sixth Avenue
- Tan Kah Kee
- Stevens
- Rochor
- Downtown
- Telok Ayer
- Fort Canning
- Bencoolen
- Jalan Besar
- Bendemeer
- Geylang Bahru
- Mattar
- Ubi
- Kaki Bukit
- Bedok North
- Bedok Reservoir
- Tampines West
- Tampines East
- Upper Changi

### Thomson-East Coast Line

- Woodlands North
- Woodlands South
- Springleaf
- Lentor
- Mayflower
- Bright Hill
- Upper Thomson
- Napier
- Orchard Boulevard
- Great World
- Havelock
- Maxwell
- Shenton Way
- Gardens by the Bay
- Tanjong Rhu
- Katong Park
- Tanjong Katong
- Marine Parade
- Marine Terrace
- Siglap
- Bayshore

## Coordinator Merge Plan

After station agents complete their files:

1. Validate every `house_{station_slug}.json` file with a JSON parser.
2. Deduplicate listings across nearby stations using `listing_url`, `source_platform + source_listing_id`, and normalized address/rent/title similarity.
3. Preserve station-level files as raw research output.
4. Create a merged normalized file at `backend/data/listings/house_listings_merged.json`.
5. Load merged records into `house_properties`, `house_location_metrics`, and `house_commute_options` only after validation.
6. Keep rejected rows in a separate audit file with rejection reasons, such as sale listing, duplicate, missing rent, or invalid URL.

## Definition Of Done

The research pass is complete when:

1. Every MRT station has a corresponding `house_{station_slug}.json` file.
2. Each station file has up to 20 valid rental listings.
3. Each listing has a source URL and core rent metadata.
4. Missing values are explicit and documented.
5. The coordinator can import the data into the existing SQLite schema without manual reshaping.