#!/usr/bin/env python3
"""
Transform raw house_listings_merged.json into the Dolphine algorithm's listing schema.
"""
import json
import math
from collections import Counter, defaultdict

# ── Paths ────────────────────────────────────────────────────────────────────
SRC = "/Users/samsonchew/Desktop/sea openai hackathon/dolphine/backend/data/listings/house_listings_merged.json"
DST = "/Users/samsonchew/Desktop/sea openai hackathon/dolphine/algorithm/data/listings.json"

# ── Verified Unsplash image pool (HTTP 200 confirmed) ────────────────────────
VERIFIED_IMAGE_URLS = [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1556909211-36987daf7b4d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=900&q=80",
]
print(f"Verified image pool: {len(VERIFIED_IMAGE_URLS)} URLs")

# ── Neighbourhood mapping (case-insensitive) ─────────────────────────────────
# Each key is a neighbourhood_id; values are the area/MRT keywords to match
NEIGHBOURHOOD_MAP = {
    "queenstown":  ["queenstown", "commonwealth", "redhill"],
    "clementi":    ["clementi"],
    "tiong_bahru": ["tiong bahru", "outram park"],
    "jurong_east": ["jurong east", "chinese garden", "bukit batok", "lakeside", "boon lay"],
    "paya_lebar":  ["paya lebar", "eunos", "aljunied", "dakota", "macpherson", "mountbatten"],
    "woodlands":   ["woodlands", "admiralty", "marsiling", "canberra", "sembawang"],
    "buona_vista": ["buona vista", "one-north", "dover", "holland village", "kent ridge", "labrador park"],
    "bishan":      ["bishan", "marymount", "braddell", "bright hill", "ang mo kio"],
    "tampines":    ["tampines", "simei", "bedok", "pasir ris", "tampines west", "tanah merah"],
}

def resolve_neighbourhood(area: str, mrt: str) -> str | None:
    """Return neighbourhood_id or None if no match."""
    candidates = [s.lower().strip() for s in [area or "", mrt or ""] if s]
    for nb_id, keywords in NEIGHBOURHOOD_MAP.items():
        for kw in keywords:
            for c in candidates:
                if kw in c or c in kw:
                    return nb_id
    return None

def normalize_room_type(room_type: str) -> str:
    """Normalize room_type per spec."""
    if room_type in ("single_room", "unknown", None, ""):
        return "common_room"
    if room_type in ("common_room", "master_room", "studio"):
        return room_type
    return "common_room"

def to_bool(val) -> bool:
    """Convert truthy/null to bool; null → False."""
    if val is None:
        return False
    return bool(val)

# ── Load source ───────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    source = json.load(f)

raw_listings = source["listings"]
print(f"Source listings: {len(raw_listings)}")

# ── Transform ─────────────────────────────────────────────────────────────────
seq_counters: defaultdict[str, int] = defaultdict(int)
output: list[dict] = []
skipped_no_rent = 0
skipped_no_neighbourhood = 0
image_idx = 0

for listing in raw_listings:
    # Skip if no rent
    rent = listing.get("rental_monthly")
    if not rent:
        skipped_no_rent += 1
        continue

    # Map neighbourhood
    area = listing.get("area") or ""
    mrt = listing.get("nearest_mrt") or ""
    nb_id = resolve_neighbourhood(area, mrt)
    if nb_id is None:
        skipped_no_neighbourhood += 1
        continue

    # Sequence counter per neighbourhood
    seq_counters[nb_id] += 1
    seq = seq_counters[nb_id]

    # Build ID
    listing_id = f"lst_{nb_id}_{seq}"

    # Location metrics
    loc_metrics = listing.get("location_metrics") or {}
    mrt_walk = loc_metrics.get("walking_to_mrt_minutes") or 10

    # Normalize room type
    room_type = normalize_room_type(listing.get("room_type", ""))

    # Property type — uppercase for unit_type display
    property_type = listing.get("property_type") or "hdb"
    unit_type = property_type.upper()

    # Amenities
    has_aircon = to_bool(listing.get("has_aircon"))
    wifi = to_bool(listing.get("wifi_included"))
    cooking = to_bool(listing.get("cooking_allowed"))
    private_bath = to_bool(listing.get("has_private_bathroom"))
    furnished = listing.get("furnishing") == "fully_furnished"

    # Confidence
    raw_conf = listing.get("confidence")
    if raw_conf is not None:
        confidence_int = round(float(raw_conf) * 100)
    else:
        confidence_int = 80

    # is_direct_landlord
    is_direct = to_bool(listing.get("is_direct_landlord"))

    # Assign image deterministically
    image_url = VERIFIED_IMAGE_URLS[image_idx % len(VERIFIED_IMAGE_URLS)]
    image_idx += 1

    # Build output record
    record = {
        "id": listing_id,
        "source": "99.co",
        "location": {
            "neighbourhood_id": nb_id,
            "address": listing.get("address_text") or "",
            "mrt": mrt,
            "mrt_walk_minutes": mrt_walk,
        },
        "listing": {
            "name": listing.get("title") or "",
            "room_type": room_type,
            "rent": rent,
            "unit_type": unit_type,
            "available": True,
            "url": listing.get("listing_url") or "",
        },
        "amenities": {
            "aircon": has_aircon,
            "wifi": wifi,
            "cooking": cooking,
            "private_bath": private_bath,
            "furnished": furnished,
            "washing_machine": False,
        },
        "property": {
            "type": property_type,
        },
        "media": {
            "image_url": image_url,
        },
        "metadata": {
            "is_direct_landlord": is_direct,
            "confidence": confidence_int,
            "source_url": listing.get("listing_url") or "",
        },
    }
    output.append(record)

# ── Write output ──────────────────────────────────────────────────────────────
with open(DST, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\nTransform complete:")
print(f"  Output listings:         {len(output)}")
print(f"  Skipped (no rent):       {skipped_no_rent}")
print(f"  Skipped (no neighbour):  {skipped_no_neighbourhood}")
print(f"  By neighbourhood:        {dict(Counter(r['location']['neighbourhood_id'] for r in output))}")
print(f"  All have image_url:      {all(r['media']['image_url'] for r in output)}")
print(f"  All have rent:           {all(r['listing']['rent'] for r in output)}")
if output:
    rents = [r['listing']['rent'] for r in output]
    print(f"  Rent range:              {min(rents)} – {max(rents)} SGD")
print(f"  Verified image pool:     {len(VERIFIED_IMAGE_URLS)}")
