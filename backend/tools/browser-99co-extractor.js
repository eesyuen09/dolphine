async function run99coExtract(page, options = {}) {
  const rangeStart = options.rangeStart || 0;
  const rangeEnd = options.rangeEnd || 50;
  const researchedAt = options.researchedAt || "2026-06-06T00:00:00+08:00";
  const manifest = await page.evaluate(async () => await (await fetch("http://127.0.0.1:3125/manifest")).json());
  const targetSlugs = Array.isArray(options.slugs) ? new Set(options.slugs) : null;
  const stations = targetSlugs
    ? manifest.stations.filter((station) => targetSlugs.has(station.slug))
    : manifest.stations.slice(rangeStart, rangeEnd);

  async function extractStation(station) {
    const sourceUrl = `https://www.99.co/singapore/rent/rooms/${station.slug.replaceAll("_", "-")}`;
    const fallbackSourceUrls = [
      `https://www.propertyguru.com.sg/property-for-rent?search=true&property_type=R&freetext=${encodeURIComponent(`${station.name} MRT room rental`)}`,
      `https://www.carousell.sg/search/${encodeURIComponent(`${station.name} MRT room rental`)}?addRecent=false&canChangeKeyword=false&includeSuggestions=false`,
      `https://www.edgeprop.sg/listings?listing_type=rental&keyword=${encodeURIComponent(`${station.name} MRT room`)}`
    ];
    try {
      await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      const pageState = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.slice(0, 500) }));
      if (/page not found|404/i.test(`${pageState.title}\n${pageState.text}`)) {
        const payload = {
          station_slug: station.slug,
          station_name: station.name,
          source_url: sourceUrl,
          extracted_at: researchedAt,
          listings: [],
          error: "99.co page not found; switch immediately to fallback listing websites.",
          fallback_source_urls: fallbackSourceUrls
        };
        await page.evaluate(async (failedPayload) => {
          await fetch("http://127.0.0.1:3125/station", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(failedPayload)
          });
        }, payload);
        return { station_slug: station.slug, count: 0, error: payload.error, fallback_source_urls: fallbackSourceUrls };
      }
      await page.waitForFunction(
        () => document.querySelector('script[type="application/ld+json"]') && document.body.innerText.includes("S$"),
        null,
        { timeout: 30000 }
      );

      const payload = await page.evaluate(({ station, researchedAt }) => {
        const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
          .map((script) => {
            try {
              return JSON.parse(script.textContent);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .find((item) => item["@type"] === "RealEstateListing");
        const elements = jsonLd?.mainEntity?.itemListElement || [];
        const lines = document.body.innerText.split("\n").map((line) => line.trim()).filter(Boolean);
        let cursor = 0;

        const normalizePropertyType = (value) => {
          const text = String(value || "").toLowerCase();
          if (text.includes("executive")) return "executive_condo";
          if (text.includes("hdb")) return "hdb";
          if (text.includes("condo")) return "condo";
          if (text.includes("apartment")) return "apartment";
          if (text.includes("landed") || text.includes("terraced")) return "landed";
          return "unknown";
        };
        const normalizeRoomType = (value) => {
          const text = String(value || "").toLowerCase();
          if (text.includes("master")) return "master_room";
          if (text.includes("common")) return "common_room";
          if (text.includes("studio")) return "studio";
          if (text.includes("room") || text.includes("1 bed")) return "single_room";
          return "unknown";
        };
        const parseBoolTag = (block, yesPatterns, noPatterns = []) => {
          if (noPatterns.some((pattern) => pattern.test(block))) return false;
          if (yesPatterns.some((pattern) => pattern.test(block))) return true;
          return null;
        };
        const normalizeFloorLevel = (block) => {
          if (/penthouse/i.test(block)) return "penthouse";
          if (/high floor/i.test(block)) return "high";
          if (/low floor/i.test(block)) return "low";
          if (/mid floor/i.test(block)) return "mid";
          return "unknown";
        };
        const normalizeFurnishing = (block) => {
          if (/partially furnished|semi furnished/i.test(block)) return "partially_furnished";
          if (/fully furnished|furnished/i.test(block)) return "fully_furnished";
          if (/unfurnished/i.test(block)) return "unfurnished";
          return "unknown";
        };
        const sourceIdFromUrl = (url) => {
          const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
          return last.split("-").pop() || last;
        };
        const compactAddress = (streetAddress = "") => {
          const postal = streetAddress.match(/\b\d{6}\b/)?.[0] || null;
          const beforeCountry = streetAddress.split(",")[0] || streetAddress;
          const address = postal ? beforeCountry.replace(new RegExp(`\\s*${postal}\\b.*$`), "").trim() : beforeCountry.trim();
          return { address, postal, display: postal ? `${address}, ${postal}` : address };
        };
        const findLineIndex = (address, postal) => {
          let index = postal ? lines.findIndex((line, lineIndex) => lineIndex >= cursor && line.includes(postal)) : -1;
          if (index === -1 && address) {
            const normalized = address.toLowerCase().replace(/\s+/g, "");
            index = lines.findIndex((line, lineIndex) => lineIndex >= cursor && line.toLowerCase().replace(/\s+/g, "").includes(normalized.slice(0, 18)));
          }
          return index;
        };

        function listingFromItem(item) {
          const place = item.item || {};
          const url = place.url;
          const { address, postal, display } = compactAddress(place.address?.streetAddress || "");
          const lineIndex = findLineIndex(address, postal);
          if (!url || lineIndex === -1) return null;

          const before = lines.slice(Math.max(0, lineIndex - 15), lineIndex);
          const after = lines.slice(lineIndex + 1, lineIndex + 35);
          const block = [...before, lines[lineIndex], ...after].join("\n");
          const priceLine = [...before].reverse().find((line) => /^S\$\s*[\d,]+\/mo$/i.test(line));
          const rentalMonthly = priceLine ? Number(priceLine.replace(/[^\d]/g, "")) : null;
          const roomLine = after.find((line) => /^(Common Room|Master Room|Room|Studio|Shared Room|1 Bed)$/i.test(line)) || null;
          const floorAreaLine = after.find((line) => /^[\d,]+\s*sqft$/i.test(line)) || null;
          const floorAreaSqft = floorAreaLine ? Number(floorAreaLine.replace(/[^\d]/g, "")) : null;
          const propertyLine = after.find((line) => /HDB|Condo|Apartment|Terraced|Landed|Executive/i.test(line)) || null;
          const mrtLine = after.find((line) => /MRT\s*·/i.test(line)) || null;
          const mrtMatch = mrtLine?.match(/([A-Za-z][A-Za-z\s-]+MRT)\s*·\s*(\d+)\s*mins?\s*\((\d+)m\)/i);
          const listedIndex = after.findIndex((line) => /^Listed\b/i.test(line));
          const byIndex = after.findIndex((line, index) => index > listedIndex && /^by$/i.test(line));
          const agentName = byIndex >= 0 ? after[byIndex + 1] || null : null;
          const availableMatch = block.match(/AVAIL\s+(\d{2})\/(\d{2})\/(\d{2})/i);
          const tags = after.filter((line) => /MRT|Furnished|Aircon|Wifi|WiFi|Cooking|Utilities|Move-In|Immediate|Landlord|Agent Fee|Female|Male|Professional|Student|Bathroom|Ensuite|Grocery|Market|Park|Bus Stop|Hawker|Quiet|High Floor|No Smoking|Pets|Couples/i.test(line)).slice(0, 12);
          const sourceListingId = sourceIdFromUrl(url);
          const titleRoom = roomLine || "Room";
          const roomType = normalizeRoomType(roomLine || "");
          const walkingMinutes = mrtMatch ? Number(mrtMatch[2]) : null;
          const distanceKm = mrtMatch ? Number((Number(mrtMatch[3]) / 1000).toFixed(3)) : null;
          const missingFields = [];
          const record = {
            source_platform: "99.co",
            source_listing_id: sourceListingId,
            listing_url: url,
            title: `${titleRoom} for Rent in ${address}`,
            description: `99.co room-rental search result for ${display}: ${titleRoom}${floorAreaSqft ? `, ${floorAreaSqft} sqft` : ""}${propertyLine ? `, ${propertyLine}` : ""}${mrtLine ? `, ${mrtLine}` : ""}.`,
            property_type: normalizePropertyType(propertyLine || ""),
            room_type: roomType,
            area: station.name,
            nearest_mrt: mrtMatch ? mrtMatch[1].replace(/\s*MRT$/i, "") : station.name,
            district: null,
            postal_code: postal,
            address_text: display,
            latitude: place.geo?.latitude ?? null,
            longitude: place.geo?.longitude ?? null,
            rental_monthly: rentalMonthly,
            currency: "SGD",
            deposit_months: null,
            available_from: availableMatch ? `20${availableMatch[3]}-${availableMatch[2]}-${availableMatch[1]}` : null,
            lease_term_months: null,
            floor_area_sqft: floorAreaSqft,
            bedrooms: null,
            bathrooms: /1 Bath/i.test(block) ? 1 : null,
            floor_level: normalizeFloorLevel(block),
            furnishing: normalizeFurnishing(block),
            tenant_type_allowed: tags.find((tag) => /Female|Male|Professional|Student|Couples/i.test(tag)) || null,
            has_aircon: parseBoolTag(block, [/aircon/i]),
            has_private_bathroom: /ensuite|attached bathroom/i.test(block) ? true : roomType === "common_room" ? false : null,
            cooking_allowed: parseBoolTag(block, [/cooking allowed|light cooking/i], [/no cooking|cooking not allowed/i]),
            wifi_included: parseBoolTag(block, [/wifi|wi-fi/i]),
            utilities_included: parseBoolTag(block, [/utilities included/i]),
            landlord_verified: /verified as real/i.test(block),
            agent_name: agentName,
            is_direct_landlord: /direct owner listing/i.test(block) ? true : null,
            listing_posted_at: null,
            scraped_at: researchedAt,
            image_url: null,
            location_metrics: {
              walking_to_mrt_minutes: walkingMinutes,
              distance_to_mrt_km: distanceKm,
              bus_stop_walk_minutes: null,
              supermarket_walk_minutes: null,
              hawker_walk_minutes: null,
              gym_walk_minutes: null,
              clinic_walk_minutes: null,
              park_walk_minutes: null,
              gym_count_nearby: null,
              food_options_nearby: null,
              supermarket_nearby: /grocery|fairprice|sheng siong|market/i.test(block) ? true : null,
              clinic_nearby: /clinic/i.test(block) ? true : null,
              park_nearby: /park/i.test(block) ? true : null,
              quietness_level: /quiet/i.test(block) ? 8 : null,
              safety_level: null,
              convenience_level: /convenient|near mrt|shopping|transport/i.test(block) ? 8 : null
            },
            commute_options: [],
            note_tags: ["99co-browser-extract", ...tags.map((tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(Boolean)].slice(0, 12),
            source_evidence: [
              { field: "listing_url", value: url, evidence: "99.co JSON-LD RealEstateListing item URL on public room-rental search page.", confidence: "high" },
              { field: "rental_monthly", value: rentalMonthly, evidence: `Rendered 99.co listing card near position ${item.position} shows ${priceLine || "no parsed price"}.`, confidence: rentalMonthly ? "high" : "low" },
              { field: "address_text", value: display, evidence: "99.co JSON-LD PostalAddress and rendered listing card address.", confidence: "high" }
            ],
            missing_fields: missingFields,
            research_notes: `Extracted from 99.co browser-rendered room search page ${location.href}. Individual listing URL and source id are from JSON-LD; price/details are from rendered listing card text.`,
            confidence: rentalMonthly && url && address ? 0.86 : 0.55
          };

          for (const [key, value] of Object.entries(record)) {
            if (value === null || value === undefined || value === "") missingFields.push(key);
          }
          cursor = lineIndex + 1;
          return record;
        }

        const listings = [];
        for (const item of elements.slice(0, 10)) {
          const listing = listingFromItem(item);
          if (listing && listing.rental_monthly && listing.source_listing_id) listings.push(listing);
        }
        return { station_slug: station.slug, station_name: station.name, source_url: location.href, extracted_at: researchedAt, listings };
      }, { station, researchedAt });

      await page.evaluate(async (payload) => {
        await fetch("http://127.0.0.1:3125/station", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
      }, payload);
      return { station_slug: station.slug, count: payload.listings.length };
    } catch (error) {
      const payload = { station_slug: station.slug, station_name: station.name, source_url: sourceUrl, extracted_at: researchedAt, listings: [], error: error.message, fallback_source_urls: fallbackSourceUrls };
      try {
        await page.evaluate(async (failedPayload) => {
          await fetch("http://127.0.0.1:3125/station", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(failedPayload)
          });
        }, payload);
      } catch {}
      return { station_slug: station.slug, count: 0, error: error.message };
    }
  }

  const summaries = [];
  for (const station of stations) summaries.push(await extractStation(station));
  return {
    rangeStart,
    rangeEnd,
    targetedSlugs: targetSlugs ? [...targetSlugs] : null,
    processed: summaries.length,
    successWithListings: summaries.filter((summary) => summary.count > 0).length,
    totalListings: summaries.reduce((sum, summary) => sum + summary.count, 0),
    failures: summaries.filter((summary) => summary.count === 0).slice(0, 30)
  };
}

globalThis.run99coExtract = run99coExtract;