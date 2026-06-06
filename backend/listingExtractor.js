const DEFAULT_BUDGET_MIN = 900;
const DEFAULT_BUDGET_MAX = 1500;
const DEFAULT_OFFICE_DAYS = 5;
const DEFAULT_DESTINATION_LABEL = "NUS School of Computing";
const DEFAULT_TRANSPORT_MODE = "MRT/Bus";
const EXTERNAL_API_TIMEOUT_MS = Number(process.env.EXTERNAL_API_TIMEOUT_MS || 4500);
const OPENAI_API_TIMEOUT_MS = Number(process.env.OPENAI_API_TIMEOUT_MS || 15000);
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

const sampleListings = [
  "Queenstown common room, S$1450/month, 6 min walk to Queenstown MRT, 3B2B, aircon, wifi included, cooking allowed, no owner staying, utilities included.",
  "Jurong East common room, S$1100/month, 10 min walk to MRT, 5B2B, aircon, no cooking, utilities not included.",
  "Dover master room, S$1550/month, 7 min walk to Dover MRT, 3B2B, private bathroom, aircon, furnished, quiet block.",
  "Clementi common room, S$1300/month, 5 min walk to Clementi MRT, 4B2B, wifi included, cooking allowed, strong food access.",
  "Punggol co-living room, S$950/month, 9 min walk to Punggol MRT, co-living, furnished, washing machine, longer commute."
];

const locationDirectory = [
  {
    label: "NUS School of Computing",
    area: "Kent Ridge",
    nearestMrt: "Kent Ridge MRT",
    postalCode: "117417",
    latLng: { lat: 1.2949, lng: 103.7738 }
  },
  {
    label: "NUS Kent Ridge",
    area: "Kent Ridge",
    nearestMrt: "Kent Ridge MRT",
    postalCode: "119077",
    latLng: { lat: 1.2966, lng: 103.7764 }
  },
  {
    label: "NUS UTown",
    area: "Kent Ridge",
    nearestMrt: "Kent Ridge MRT",
    postalCode: "138607",
    latLng: { lat: 1.3039, lng: 103.7742 }
  },
  {
    label: "Kent Ridge MRT",
    area: "Kent Ridge",
    nearestMrt: "Kent Ridge MRT",
    postalCode: "119074",
    latLng: { lat: 1.2935, lng: 103.7845 }
  },
  {
    label: "One-North",
    area: "One-North",
    nearestMrt: "one-north MRT",
    postalCode: "138632",
    latLng: { lat: 1.2997, lng: 103.7871 }
  },
  {
    label: "Buona Vista",
    area: "Buona Vista",
    nearestMrt: "Buona Vista MRT",
    postalCode: "138617",
    latLng: { lat: 1.3072, lng: 103.7902 }
  },
  {
    label: "Raffles Place",
    area: "CBD",
    nearestMrt: "Raffles Place MRT",
    postalCode: "048621",
    latLng: { lat: 1.284, lng: 103.8513 }
  },
  {
    label: "Tanjong Pagar",
    area: "CBD",
    nearestMrt: "Tanjong Pagar MRT",
    postalCode: "079903",
    latLng: { lat: 1.2764, lng: 103.8458 }
  },
  {
    label: "Marina Bay",
    area: "Marina Bay",
    nearestMrt: "Marina Bay MRT",
    postalCode: "018984",
    latLng: { lat: 1.2763, lng: 103.8547 }
  },
  {
    label: "National University Hospital",
    area: "Kent Ridge",
    nearestMrt: "Kent Ridge MRT",
    postalCode: "119074",
    latLng: { lat: 1.2945, lng: 103.7832 }
  },
  {
    label: "SMU",
    area: "Bras Basah",
    nearestMrt: "Bencoolen MRT",
    postalCode: "178899",
    latLng: { lat: 1.2966, lng: 103.8501 }
  },
  {
    label: "SUTD",
    area: "Changi",
    nearestMrt: "Upper Changi MRT",
    postalCode: "487372",
    latLng: { lat: 1.3414, lng: 103.9639 }
  },
  {
    label: "NTU",
    area: "Jurong West",
    nearestMrt: "Pioneer MRT",
    postalCode: "639798",
    latLng: { lat: 1.3483, lng: 103.6831 }
  }
];

const areaProfiles = [
  {
    area: "Queenstown",
    aliases: ["queenstown", "commonwealth", "mei ling", "meiling"],
    nearestMrt: "Queenstown MRT",
    latLng: { lat: 1.2942, lng: 103.8061 },
    foodAccess: "Strong hawker and casual dinner options",
    gymAccess: "Several gyms within a short evening route",
    quietness: "Moderate-quiet residential pocket",
    monthlyTransport: 68,
    commuteToKentRidge: 12
  },
  {
    area: "Dover",
    aliases: ["dover"],
    nearestMrt: "Dover MRT",
    latLng: { lat: 1.3114, lng: 103.7786 },
    foodAccess: "Decent daily food, less variety late at night",
    gymAccess: "Limited but workable nearby",
    quietness: "Calmer surroundings",
    monthlyTransport: 60,
    commuteToKentRidge: 10
  },
  {
    area: "Clementi",
    aliases: ["clementi", "sunset way"],
    nearestMrt: "Clementi MRT",
    latLng: { lat: 1.3149, lng: 103.7653 },
    foodAccess: "Excellent affordable food and student-friendly options",
    gymAccess: "Good access around central Clementi",
    quietness: "Busier student area",
    monthlyTransport: 75,
    commuteToKentRidge: 18
  },
  {
    area: "Jurong East",
    aliases: ["jurong east", "jurong gateway"],
    nearestMrt: "Jurong East MRT",
    latLng: { lat: 1.3331, lng: 103.7423 },
    foodAccess: "Good malls and daily food access",
    gymAccess: "Acceptable gym access",
    quietness: "Moderate",
    monthlyTransport: 95,
    commuteToKentRidge: 38
  },
  {
    area: "Punggol",
    aliases: ["punggol"],
    nearestMrt: "Punggol MRT",
    latLng: { lat: 1.4052, lng: 103.9023 },
    foodAccess: "Basic food access, less convenient for Kent Ridge routine",
    gymAccess: "Limited compared with central-west options",
    quietness: "Quiet residential environment",
    monthlyTransport: 110,
    commuteToKentRidge: 55
  },
  {
    area: "Buona Vista",
    aliases: ["buona vista", "one-north", "one north"],
    nearestMrt: "Buona Vista MRT",
    latLng: { lat: 1.3072, lng: 103.7902 },
    foodAccess: "Strong weekday lunch and cafe access",
    gymAccess: "Good gym access around business parks",
    quietness: "Mixed work-residential rhythm",
    monthlyTransport: 62,
    commuteToKentRidge: 8
  }
];

const roomTypePatterns = [
  { pattern: /\bcommon\s*room\b/i, value: "Common room" },
  { pattern: /\bmaster\s*room\b/i, value: "Master room" },
  { pattern: /\bstudio\b/i, value: "Studio" },
  { pattern: /\bwhole\s*(?:unit|apartment|flat)\b/i, value: "Whole unit" },
  { pattern: /\bco[-\s]?living\b/i, value: "Co-living room" }
];

const knownPostalCodes = new Map(
  [...locationDirectory, ...areaProfiles.map((profile) => ({ postalCode: null, ...profile }))]
    .filter((item) => item.postalCode)
    .map((item) => [
      item.postalCode,
      {
        postalCode: item.postalCode,
        label: item.label || item.area,
        area: item.area,
        latLng: item.latLng
      }
    ])
);

let cachedOneMapToken = null;
let cachedOneMapTokenExpiry = 0;

export async function extractListings(payload = {}) {
  const warnings = [];
  const profile = normalizeProfile(payload);
  const destination = await resolveDestination(profile, warnings);
  const { sources, usedSampleListings } = normalizeListingSources(payload);
  const isIntentionalSampleShortlist = Boolean(
    payload && typeof payload === "object" && payload.useSampleListings === true
  );
  const urlOnlySources = sources.filter((source) => source.url && !source.text);

  if (usedSampleListings && !isIntentionalSampleShortlist) {
    warnings.push("No listing text or URL was provided. Returned sample room listings for demo continuity.");
  }

  if (urlOnlySources.length > 0 && !shouldFetchListingUrls()) {
    warnings.push(
      "URL fetch is disabled. URL-only inputs are normalized from their URL text and will have missing fields until copied listing text is provided."
    );
  }

  const rooms = [];
  const postalValidations = [];

  for (const [index, source] of sources.entries()) {
    const room = await buildRoomListing(source, index, profile, destination, warnings);
    if (room.postalCodeStatus) {
      postalValidations.push({
        listingId: room.id,
        postalCode: room.postalCode || null,
        status: room.postalCodeStatus,
        source: room.postalCodeSource || null
      });
    }
    rooms.push(room);
  }

  const rankedRooms = rankRooms(rooms, profile).map((room, index) => ({
    ...room,
    rankLabel: getRankLabel(room, index)
  }));

  return {
    profile: {
      destinationLabel: destination.label,
      destinationArea: destination.area,
      destinationPostalCode: destination.postalCode || null,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      officeDays: profile.officeDays,
      transportMode: profile.transportMode,
      preferredRoomType: profile.preferredRoomType,
      mustHaves: profile.mustHaves,
      rankedPriorities: profile.rankedPriorities
    },
    rooms: rankedRooms,
    extractedRooms: rankedRooms,
    sourceCount: sources.length,
    validation: {
      destination: destination.validation,
      postalCodes: postalValidations
    },
    warnings,
    summary: `Extracted and ranked ${rankedRooms.length} room listing${rankedRooms.length === 1 ? "" : "s"} for ${destination.label}.`
  };
}

function normalizeProfile(payload) {
  const input = typeof payload === "object" && payload !== null ? payload : {};
  const profile = input.profile || input.preferences || input;

  return {
    destinationInput:
      profile.destinationInput ||
      profile.destinationLabel ||
      profile.targetArea ||
      profile.workplace ||
      profile.workplaceOrStudy ||
      DEFAULT_DESTINATION_LABEL,
    customLocationHelper: profile.customLocationHelper || profile.nearestMrtOrPostalCode || "",
    budgetMin: normalizeNumber(profile.budgetMin ?? profile.minBudget, DEFAULT_BUDGET_MIN),
    budgetMax: normalizeNumber(profile.budgetMax ?? profile.maxBudget ?? profile.budget, DEFAULT_BUDGET_MAX),
    officeDays: clamp(normalizeNumber(profile.officeDays ?? profile.officeDaysPerWeek, DEFAULT_OFFICE_DAYS), 0, 7),
    transportMode: profile.transportMode || DEFAULT_TRANSPORT_MODE,
    preferredRoomType: profile.preferredRoomType || "No preference",
    mustHaves: Array.isArray(profile.mustHaves) ? profile.mustHaves : [],
    rankedPriorities: Array.isArray(profile.rankedPriorities) ? profile.rankedPriorities : []
  };
}

function normalizeListingSources(payload) {
  if (typeof payload === "string") {
    return { sources: splitListingText(payload), usedSampleListings: false };
  }

  if (!payload || typeof payload !== "object") {
    return {
      sources: sampleListings.map((text) => ({ text, url: "", skipOpenAI: true })),
      usedSampleListings: true
    };
  }

  const rawSources = [];
  const listingArrays = [payload.listings, payload.listingInputs, payload.inputs].filter(Array.isArray);

  for (const entries of listingArrays) {
    for (const entry of entries) {
      if (typeof entry === "string") {
        const source = sourceFromListingBox(entry);
        if (source) rawSources.push(source);
      } else if (entry && typeof entry === "object") {
        const text = String(entry.text || entry.rawText || entry.description || "").trim();
        const url = String(entry.url || entry.listedUrl || entry.sourceUrl || "").trim();
        if (text || url) rawSources.push({ text, url });
      }
    }
  }

  for (const textKey of ["text", "listingText", "pastedText", "rawText"]) {
    if (payload[textKey]) rawSources.push(...splitListingText(String(payload[textKey])));
  }

  for (const urlKey of ["url", "listingUrl", "sourceUrl"]) {
    if (payload[urlKey]) rawSources.push({ text: "", url: String(payload[urlKey]).trim() });
  }

  for (const urlsKey of ["urls", "listingUrls", "sourceUrls"]) {
    if (Array.isArray(payload[urlsKey])) {
      for (const url of payload[urlsKey]) {
        if (url) rawSources.push({ text: "", url: String(url).trim() });
      }
    }
  }

  const sources = dedupeSources(rawSources);

  if (sources.length === 0) {
    return {
      sources: sampleListings.map((text) => ({ text, url: "", skipOpenAI: true })),
      usedSampleListings: true
    };
  }

  return { sources, usedSampleListings: false };
}

function sourceFromListingBox(entry) {
  const text = String(entry || "").trim();
  if (!text) return null;

  const urls = extractUrls(text);
  if (urls.length === 1 && text === urls[0]) {
    return { text: "", url: urls[0] };
  }

  return { text, url: urls[0] || "" };
}

function splitListingText(text) {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) return [];

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.flatMap((line) => splitListingText(line));
  }

  const urlMatches = extractUrls(normalized);
  const textWithoutUrls = normalized.replace(urlPattern(), "").trim();

  if (urlMatches.length > 0 && !textWithoutUrls) {
    return urlMatches.map((url) => ({ text: "", url }));
  }

  const sentenceListings = textWithoutUrls
    .split(/(?<=\.)\s+(?=[A-Z0-9][^.]{0,80}(?:S\$|SGD|\$|\broom\b|\bstudio\b|\bunit\b))/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const textSources = sentenceListings.length > 0 ? sentenceListings : [textWithoutUrls || normalized];
  const sources = textSources.map((entry) => ({ text: entry, url: "" }));

  for (const url of urlMatches) {
    sources.push({ text: "", url });
  }

  return sources;
}

function dedupeSources(sources) {
  const seen = new Set();
  const deduped = [];

  for (const source of sources) {
    const normalized = {
      text: String(source.text || "").trim(),
      url: String(source.url || "").trim()
    };
    const key = `${normalized.text}::${normalized.url}`;
    if (!normalized.text && !normalized.url) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

async function buildRoomListing(source, index, profile, destination, warnings) {
  const fetchedText = source.url ? await maybeFetchListingUrlText(source.url, warnings) : "";
  const rawText = [source.text, fetchedText].filter(Boolean).join("\n").trim();
  const parseText = rawText || slugTextFromUrl(source.url) || source.url || "";
  const aiFields = source.skipOpenAI
    ? null
    : await extractRoomFieldsWithOpenAI({ parseText, sourceUrl: source.url, warnings });
  const urls = [...extractUrls(parseText), source.url].filter(Boolean);
  const listedUrl = aiFields?.listedUrl || urls[0] || `https://example.com/listings/generated-${index + 1}`;
  const textWithoutUrls = parseText.replace(urlPattern(), " ");

  const areaProfile = detectAreaProfile(`${textWithoutUrls} ${aiFields?.area || ""} ${aiFields?.nearestMrt || ""}`, source.url);
  const area = normalizeString(aiFields?.area) || areaProfile?.area || titleCase(firstUrlSegment(source.url)) || "Singapore";
  const roomType = normalizeRoomType(aiFields?.roomType) || detectRoomType(textWithoutUrls) || "Common room";
  const unitType = normalizeString(aiFields?.unitType) || detectUnitType(textWithoutUrls, roomType);
  const nearestMrt = normalizeMrtName(aiFields?.nearestMrt) || detectNearestMrt(textWithoutUrls) || areaProfile?.nearestMrt || "MRT unknown";
  const rent = normalizePositiveInteger(aiFields?.rent) || detectRent(textWithoutUrls);
  const mrtWalkMinutes = normalizePositiveInteger(aiFields?.mrtWalkMinutes) || detectMrtWalkMinutes(textWithoutUrls);
  const postalCode = normalizePostalCode(aiFields?.postalCode) || detectPostalCode(textWithoutUrls);
  const amenities = uniqueList([...normalizeStringArray(aiFields?.amenities), ...detectAmenities(textWithoutUrls, roomType)]);
  const missingFields = uniqueList([...normalizeStringArray(aiFields?.missingFields), ...getMissingFields(textWithoutUrls, amenities)]);
  const postalValidation = postalCode ? await validatePostalCode(postalCode, warnings) : null;
  const listingLatLng = postalValidation?.latLng || areaProfile?.latLng || null;
  const commuteResult = await computeCommuteMinutes({
    listingLatLng,
    areaProfile,
    destination,
    transportMode: profile.transportMode,
    warnings
  });
  const commuteMinutes = commuteResult.minutes;
  const annualCommuteHours = Math.round(((commuteMinutes * 2 * Math.max(profile.officeDays, 5) * 52) / 60) / 10) * 10;
  const room = {
    id: uniqueRoomId(`${area}-${roomType}-${rent || index + 1}`, index),
    rankLabel: "",
    title: normalizeString(aiFields?.title) || detectTitle(textWithoutUrls, area, roomType),
    area,
    rent: rent || estimateRent(roomType, areaProfile),
    roomType,
    unitType,
    nearestMrt,
    mrtWalkMinutes: mrtWalkMinutes || estimateMrtWalkMinutes(nearestMrt),
    commuteMinutes,
    annualCommuteHours,
    monthlyTransport: areaProfile?.monthlyTransport || estimateMonthlyTransport(commuteMinutes, profile.transportMode),
    foodAccess: areaProfile?.foodAccess || "Food access needs confirmation from listing details",
    gymAccess: areaProfile?.gymAccess || "Gym access needs confirmation from listing details",
    quietness: areaProfile?.quietness || "Quietness unknown from listing details",
    amenities,
    missingFields,
    pros: [],
    cons: [],
    hiddenRisks: [],
    whyHigh: [],
    tradeoffs: [],
    confidence: estimateExtractionConfidence({
      rent,
      roomType,
      unitType,
      nearestMrt,
      mrtWalkMinutes,
      amenities,
      postalValidation,
      rawText,
      sourceUrl: source.url
    }),
    listedUrl,
    shortReason: "",
    likelyRegret: "",
    photoTone: ["aqua", "sand", "coral"][index % 3],
    sourceText: rawText || null,
    postalCode: postalCode || null,
    postalCodeStatus: postalValidation?.status || null,
    postalCodeSource: postalValidation?.source || null,
    commuteSource: commuteResult.source,
    extractionSource: aiFields ? "openai" : "local-parser"
  };

  const analysis = buildRoomAnalysis(room, profile);
  return { ...room, ...analysis };
}

async function extractRoomFieldsWithOpenAI({ parseText, sourceUrl, warnings }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    addWarning(warnings, "OPENAI_API_KEY is not configured. Used local listing parser for extraction.");
    return null;
  }

  const inputText = String(parseText || "").trim();
  if (!inputText) return null;

  try {
    const data = await fetchJson("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      timeoutMs: OPENAI_API_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract Singapore room rental listing details into strict JSON. Use null when unknown. Do not invent facts. Amenities must use these labels when present: Aircon, WiFi included, Cooking allowed, Private bathroom, No owner staying, Furnished, Washing machine, Utilities included."
          },
          {
            role: "user",
            content: JSON.stringify({
              sourceUrl: sourceUrl || null,
              listingText: inputText,
              expectedJsonShape: {
                title: "string|null",
                area: "string|null",
                rent: "number|null",
                roomType: "Common room|Master room|Studio|Whole unit|Co-living room|null",
                unitType: "string|null",
                nearestMrt: "string|null",
                mrtWalkMinutes: "number|null",
                postalCode: "six digit string|null",
                amenities: ["string"],
                missingFields: ["string"],
                listedUrl: "string|null"
              }
            })
          }
        ]
      })
    });

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      addWarning(warnings, "OpenAI extraction returned no content. Used local parser for that listing.");
      return null;
    }

    return normalizeOpenAiFields(JSON.parse(content));
  } catch (error) {
    addWarning(warnings, `OpenAI extraction failed: ${error.message}. Used local parser fallback.`);
    return null;
  }
}

function normalizeOpenAiFields(fields) {
  if (!fields || typeof fields !== "object") return null;

  return {
    title: normalizeString(fields.title),
    area: normalizeString(fields.area),
    rent: normalizePositiveInteger(fields.rent),
    roomType: normalizeRoomType(fields.roomType),
    unitType: normalizeString(fields.unitType),
    nearestMrt: normalizeMrtName(fields.nearestMrt),
    mrtWalkMinutes: normalizePositiveInteger(fields.mrtWalkMinutes),
    postalCode: normalizePostalCode(fields.postalCode),
    amenities: normalizeStringArray(fields.amenities),
    missingFields: normalizeStringArray(fields.missingFields),
    listedUrl: normalizeUrl(fields.listedUrl)
  };
}

function detectAreaProfile(text, url) {
  const haystack = `${text} ${slugTextFromUrl(url)}`.toLowerCase();
  return areaProfiles.find((profile) => profile.aliases.some((alias) => haystack.includes(alias)));
}

function detectRoomType(text) {
  return roomTypePatterns.find(({ pattern }) => pattern.test(text))?.value || null;
}

function detectUnitType(text, roomType) {
  const compact = text.match(/\b(\d+)\s*b\s*(\d+)\s*b\b/i);
  if (compact) return `${compact[1]}B${compact[2]}B`;

  const verbose = text.match(/\b(\d+)\s*(?:bed|bedroom|bedrooms)\s*(\d+)\s*(?:bath|bathroom|bathrooms)\b/i);
  if (verbose) return `${verbose[1]}B${verbose[2]}B`;

  if (/co[-\s]?living/i.test(text)) return "Co-living";
  if (roomType === "Studio") return "Studio";
  if (roomType === "Whole unit") return "Whole unit";
  return "Unit type unknown";
}

function detectNearestMrt(text) {
  const matches = [...String(text || "").matchAll(/\b([A-Za-z][A-Za-z' -]{1,40})\s+MRT\b/gi)];

  for (const match of matches) {
    const stationName = match[1]
      .replace(/\b\d{1,2}\s*(?:min|mins|minute|minutes)\b/gi, "")
      .replace(/\b(?:min|mins|minute|minutes)\b/gi, "")
      .replace(/\b(?:walk|walking|to|from|near|at|the)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (stationName && !/^(?:mrt|station)$/i.test(stationName)) {
      return `${titleCase(stationName)} MRT`;
    }
  }

  return null;
}

function detectRent(text) {
  const rentMatch =
    text.match(/(?:S\$|SGD|\$)\s*([\d,]{3,5})(?:\s*\/?\s*(?:month|mo|mth))?/i) ||
    text.match(/\b([\d,]{3,5})\s*(?:per\s*month|\/month|monthly|pcm)\b/i);

  if (!rentMatch) return null;
  const rent = Number(rentMatch[1].replace(/,/g, ""));
  return Number.isFinite(rent) ? rent : null;
}

function detectMrtWalkMinutes(text) {
  const match =
    text.match(/\b(\d{1,2})\s*(?:min|mins|minute|minutes)\s*(?:walk|walking)[^.,;]*\bMRT\b/i) ||
    text.match(/\b(\d{1,2})\s*(?:min|mins|minute|minutes)\s*(?:to|from)[^.,;]*\bMRT\b/i);
  if (!match) return null;
  return Number(match[1]);
}

function detectPostalCode(text) {
  return text.match(/\b\d{6}\b/)?.[0] || null;
}

function detectAmenities(text, roomType) {
  const amenities = [];
  const lowerText = text.toLowerCase();

  if (/\b(?:aircon|air-con|a\/c|ac)\b/i.test(text)) amenities.push("Aircon");
  if (/\bwi[-\s]?fi\b/i.test(text)) amenities.push("WiFi included");
  if (/\b(?:cooking allowed|can cook|cooking ok|full cooking|light cooking)\b/i.test(text) && !/\bno cooking\b/i.test(text)) {
    amenities.push("Cooking allowed");
  }
  if (/\b(?:private bathroom|private bath|attached bathroom|ensuite)\b/i.test(text) || roomType === "Master room") {
    amenities.push("Private bathroom");
  }
  if (/\b(?:no owner|owner not staying|owner-free|owner free)\b/i.test(text)) amenities.push("No owner staying");
  if (/\bfurnished\b/i.test(text)) amenities.push("Furnished");
  if (/\b(?:washing machine|washer)\b/i.test(text)) amenities.push("Washing machine");
  if (/\butilities included\b/i.test(text) && !lowerText.includes("utilities not included")) amenities.push("Utilities included");

  return [...new Set(amenities)];
}

function getMissingFields(text, amenities) {
  const missingFields = [];
  if (!/\b\d+\s*(?:sqft|sq ft|sqm|m2)\b/i.test(text)) missingFields.push("Room size");
  if (!/\b(?:visitor|guest)\b/i.test(text)) missingFields.push("Visitor policy");
  if (amenities.includes("Aircon") && !/\baircon servicing\b/i.test(text)) missingFields.push("Aircon servicing terms");
  if (!/\b(?:owner staying|owner not staying|no owner|owner-free|owner free)\b/i.test(text)) {
    missingFields.push("Owner staying status");
  }
  if (!/\b(?:utilities included|utilities not included|utilities capped|utility cap)\b/i.test(text)) {
    missingFields.push("Utilities policy");
  }
  return [...new Set(missingFields)];
}

function detectTitle(text, area, roomType) {
  const firstChunk = text
    .split(/[.,;\n]/)[0]
    ?.trim()
    .replace(/\s+/g, " ");

  if (firstChunk && firstChunk.length >= 8 && firstChunk.length <= 70 && /room|studio|unit|co[-\s]?living/i.test(firstChunk)) {
    return titleCase(firstChunk.replace(/\bS\$\d+.*$/i, "").trim());
  }

  return `${area} ${roomType}`;
}

async function resolveDestination(profile, warnings) {
  const helper = profile.customLocationHelper.trim();
  const requested = helper || profile.destinationInput || DEFAULT_DESTINATION_LABEL;

  if (/^\d{6}$/.test(requested)) {
    const validation = await validatePostalCode(requested, warnings);
    if (validation?.latLng) {
      return {
        label: validation.label || requested,
        area: validation.area || "Singapore",
        postalCode: requested,
        latLng: validation.latLng,
        validation
      };
    }
  }

  const knownLocation = findKnownLocation(requested) || findKnownLocation(profile.destinationInput);
  if (knownLocation) {
    return {
      ...knownLocation,
      validation: {
        status: "valid",
        source: "local-demo-directory",
        label: knownLocation.label,
        latLng: knownLocation.latLng
      }
    };
  }

  warnings.push(`Destination "${requested}" is not in the local demo directory. Used ${DEFAULT_DESTINATION_LABEL} for commute estimates.`);
  const fallback = findKnownLocation(DEFAULT_DESTINATION_LABEL);
  return {
    ...fallback,
    validation: {
      status: "fallback",
      source: "local-demo-directory",
      label: fallback.label,
      latLng: fallback.latLng
    }
  };
}

function findKnownLocation(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().replace(/\s+mrt$/, "").trim();
  return (
    locationDirectory.find((location) => {
      const labels = [location.label, location.area, location.nearestMrt].map((item) =>
        String(item).toLowerCase().replace(/\s+mrt$/, "").trim()
      );
      return labels.includes(normalized);
    }) || null
  );
}

async function validatePostalCode(postalCode, warnings) {
  if (!/^\d{6}$/.test(postalCode)) {
    return { status: "invalid", source: "format", postalCode };
  }

  const oneMapValidation = await validatePostalCodeWithOneMap(postalCode, warnings);
  if (oneMapValidation) return oneMapValidation;

  const sgLocateValidation = await validatePostalCodeWithSgLocate(postalCode, warnings);
  if (sgLocateValidation) return sgLocateValidation;

  const localRecord = knownPostalCodes.get(postalCode);
  if (localRecord) {
    return {
      status: "valid",
      source: "local-demo-directory",
      postalCode,
      label: localRecord.label,
      area: localRecord.area,
      latLng: localRecord.latLng
    };
  }

  warnings.push(
    `Postal code ${postalCode} could not be validated because OneMap or SG Locate credentials are not configured.`
  );
  return { status: "unverified", source: "not-configured", postalCode };
}

async function validatePostalCodeWithOneMap(postalCode, warnings) {
  const token = await getOneMapToken(warnings);
  if (!token) return null;

  const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  url.searchParams.set("searchVal", postalCode);
  url.searchParams.set("returnGeom", "Y");
  url.searchParams.set("getAddrDetails", "Y");
  url.searchParams.set("pageNum", "1");

  try {
    const data = await fetchJson(url, {
      headers: {
        Authorization: token
      }
    });
    const result = Array.isArray(data.results)
      ? data.results.find((entry) => String(entry.POSTAL || "").trim() === postalCode)
      : null;

    if (!result) return { status: "invalid", source: "onemap-search", postalCode };

    return {
      status: "valid",
      source: "onemap-search",
      postalCode,
      label: result.BUILDING && result.BUILDING !== "NIL" ? result.BUILDING : result.SEARCHVAL || result.ADDRESS,
      area: result.ROAD_NAME || "Singapore",
      latLng: parseLatLng(result.LATITUDE, result.LONGITUDE || result.LONGTITUDE)
    };
  } catch (error) {
    warnings.push(`OneMap postal validation failed for ${postalCode}: ${error.message}`);
    return null;
  }
}

async function validatePostalCodeWithSgLocate(postalCode, warnings) {
  const apiKey = process.env.SGLOCATE_API_KEY;
  const apiSecret = process.env.SGLOCATE_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  const body = new URLSearchParams({ APIKey: apiKey, APISecret: apiSecret, Postcode: postalCode });

  try {
    const data = await fetchJson("https://www.sglocate.com/api/json/searchwithpostcode.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    const response = data.APIResponse || data;
    const postcodes = response.Postcodes || response.PostCodes || response.postcodes || [];
    const records = Array.isArray(postcodes) ? postcodes : [postcodes].filter(Boolean);
    const record = records.find((entry) => String(entry.Postcode || entry.postcode || "") === postalCode);
    const isSuccess = response.IsSuccess === true || response.IsSuccess === "true" || response.ErrorCode === 1;

    if (!isSuccess || !record) return { status: "invalid", source: "sglocate", postalCode };

    return {
      status: "valid",
      source: "sglocate",
      postalCode,
      label: record.BuildingName || record.StreetName || postalCode,
      area: record.StreetName || "Singapore",
      latLng: parseLatLng(record.Latitude, record.Longitude)
    };
  } catch (error) {
    warnings.push(`SG Locate postal validation failed for ${postalCode}: ${error.message}`);
    return null;
  }
}

async function computeCommuteMinutes({ listingLatLng, areaProfile, destination, transportMode, warnings }) {
  const fallback = estimateCommuteMinutes(areaProfile, destination, transportMode);

  if (!listingLatLng || !destination.latLng) {
    return { minutes: fallback, source: "local-demo-estimate" };
  }

  const token = await getOneMapToken(warnings);
  if (!token) {
    addWarning(warnings, "OneMap credentials are not configured. Used local commute estimates instead of OneMap Routing.");
    return { minutes: fallback, source: "local-demo-estimate" };
  }

  const url = new URL("https://www.onemap.gov.sg/api/public/routingsvc/route");
  url.searchParams.set("start", `${listingLatLng.lat},${listingLatLng.lng}`);
  url.searchParams.set("end", `${destination.latLng.lat},${destination.latLng.lng}`);

  if (transportMode === "Drive") {
    url.searchParams.set("routeType", "drive");
  } else if (transportMode === "Walk/Cycle") {
    url.searchParams.set("routeType", "cycle");
  } else {
    url.searchParams.set("routeType", "pt");
    url.searchParams.set("mode", "TRANSIT");
    url.searchParams.set("date", formatOneMapDate(new Date()));
    url.searchParams.set("time", "08:15:00");
    url.searchParams.set("maxWalkDistance", "1000");
    url.searchParams.set("numItineraries", "1");
  }

  try {
    const data = await fetchJson(url, {
      headers: {
        Authorization: token
      }
    });
    const totalSeconds = extractRouteSeconds(data);
    if (!totalSeconds) {
      warnings.push("OneMap Routing returned no duration. Used local commute estimate.");
      return { minutes: fallback, source: "local-demo-estimate" };
    }
    return { minutes: Math.max(1, Math.round(totalSeconds / 60)), source: "onemap-routing" };
  } catch (error) {
    warnings.push(`OneMap Routing failed: ${error.message}. Used local commute estimate.`);
    return { minutes: fallback, source: "local-demo-estimate" };
  }
}

async function getOneMapToken(warnings) {
  const staticToken = process.env.ONEMAP_ACCESS_TOKEN || process.env.ONEMAP_TOKEN;
  if (staticToken) return staticToken;

  if (cachedOneMapToken && cachedOneMapTokenExpiry > Date.now() + 60_000) {
    return cachedOneMapToken;
  }

  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD || process.env.ONEMAP_EMAIL_PASSWORD;
  if (!email || !password) return null;

  try {
    const data = await fetchJson("https://www.onemap.gov.sg/api/auth/post/getToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!data.access_token) {
      warnings.push("OneMap authentication did not return an access token.");
      return null;
    }

    cachedOneMapToken = data.access_token;
    cachedOneMapTokenExpiry = Number(data.expiry_timestamp || 0) * 1000;
    return cachedOneMapToken;
  } catch (error) {
    warnings.push(`OneMap authentication failed: ${error.message}`);
    return null;
  }
}

async function maybeFetchListingUrlText(url, warnings) {
  if (!url || !shouldFetchListingUrls()) return "";

  try {
    const responseText = await fetchText(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "User-Agent": "Mozilla/5.0 (compatible; DolphineHackathon/1.0; +https://localhost)"
      }
    });
    return htmlToPlainText(responseText).slice(0, 8000);
  } catch (error) {
    warnings.push(`Could not fetch listing URL ${url}: ${error.message}`);
    return "";
  }
}

function shouldFetchListingUrls() {
  if (process.env.ENABLE_LISTING_URL_FETCH === "false") return false;
  return process.env.ENABLE_LISTING_URL_FETCH === "true" || Boolean(process.env.OPENAI_API_KEY);
}

function buildRoomAnalysis(room, profile) {
  const pros = [];
  const cons = [];
  const hiddenRisks = [];
  const whyHigh = [];
  const tradeoffs = [];
  const lowerAmenities = new Set(room.amenities.map((amenity) => amenity.toLowerCase()));
  const withinBudget = room.rent <= profile.budgetMax;
  const belowMinBudget = room.rent < profile.budgetMin;

  if (room.commuteMinutes <= 20) {
    pros.push("Short commute");
    whyHigh.push(`${room.commuteMinutes} min commute to ${profile.destinationInput || DEFAULT_DESTINATION_LABEL}`);
  } else if (room.commuteMinutes >= 35) {
    cons.push("Longer commute");
    tradeoffs.push(`${room.commuteMinutes} min commute`);
  }

  if (withinBudget) {
    pros.push("Within budget");
    whyHigh.push(`Within S$${profile.budgetMax.toLocaleString("en-SG")} budget`);
  } else {
    cons.push(`S$${(room.rent - profile.budgetMax).toLocaleString("en-SG")} above max budget`);
    tradeoffs.push("Higher rent pressure");
  }

  if (belowMinBudget) {
    hiddenRisks.push("Very low rent may indicate stricter rules, older flat condition, or missing utilities");
  }

  if (room.mrtWalkMinutes <= 7) {
    pros.push("Close to MRT");
    whyHigh.push(`${room.mrtWalkMinutes} min walk to ${room.nearestMrt}`);
  } else if (room.mrtWalkMinutes >= 10) {
    cons.push("Longer MRT walk");
    tradeoffs.push(`${room.mrtWalkMinutes} min walk to MRT`);
  }

  if (lowerAmenities.has("cooking allowed")) {
    pros.push("Cooking allowed");
    whyHigh.push("Cooking allowed");
  } else if (profile.mustHaves.includes("Cooking allowed")) {
    cons.push("Cooking policy missing or restricted");
    tradeoffs.push("Cooking may be restricted");
  }

  if (lowerAmenities.has("no owner staying")) {
    pros.push("No owner staying");
    whyHigh.push("No owner staying");
  } else if (profile.mustHaves.includes("No owner staying")) {
    cons.push("Owner staying status unknown");
  }

  if (lowerAmenities.has("private bathroom")) {
    pros.push("Private bathroom");
  } else if (room.roomType !== "Studio" && room.roomType !== "Whole unit") {
    cons.push("Shared bathroom");
    tradeoffs.push("Shared bathroom");
  }

  for (const missingField of room.missingFields) {
    if (missingField === "Utilities policy") hiddenRisks.push("Utilities may be capped or excluded");
    if (missingField === "Visitor policy") hiddenRisks.push("Visitor policy unknown");
    if (missingField === "Aircon servicing terms") hiddenRisks.push("Aircon servicing unclear");
    if (missingField === "Owner staying status") hiddenRisks.push("Owner staying status unknown");
    if (missingField === "Room size") hiddenRisks.push("Room size unknown");
  }

  const shortReason = buildShortReason(room, profile, withinBudget);
  const likelyRegret = buildLikelyRegret(room, withinBudget, lowerAmenities);

  return {
    pros: uniqueList(pros).slice(0, 6),
    cons: uniqueList(cons).slice(0, 5),
    hiddenRisks: uniqueList(hiddenRisks).slice(0, 5),
    whyHigh: uniqueList(whyHigh).slice(0, 5),
    tradeoffs: uniqueList(tradeoffs).slice(0, 4),
    shortReason,
    likelyRegret
  };
}

function rankRooms(rooms, profile) {
  return [...rooms].sort((roomA, roomB) => getRoomFitScore(roomB, profile) - getRoomFitScore(roomA, profile));
}

function getRoomFitScore(room, profile) {
  const prioritySet = new Set(profile.rankedPriorities);
  const amenitySet = new Set(room.amenities);
  const preferredRoomFit =
    profile.preferredRoomType === "No preference" || room.roomType === profile.preferredRoomType || room.unitType === profile.preferredRoomType;
  const budgetScore = Math.max(0, 30 - Math.max(0, room.rent - profile.budgetMax) / 25);
  const commuteScore = Math.max(0, 35 - room.commuteMinutes * 0.65);
  const mrtScore = Math.max(0, 15 - room.mrtWalkMinutes * 0.8);
  const amenityScore = profile.mustHaves.filter((mustHave) => amenitySet.has(mustHave)).length * 4;
  const priorityBoost =
    (prioritySet.has("Short commute") && room.commuteMinutes <= 20 ? 8 : 0) +
    (prioritySet.has("Lower rent") && room.rent <= profile.budgetMax ? 5 : 0) +
    (prioritySet.has("Near MRT") && room.mrtWalkMinutes <= 7 ? 5 : 0) +
    (prioritySet.has("More privacy") && amenitySet.has("Private bathroom") ? 5 : 0) +
    (prioritySet.has("Gym access") && !/needs confirmation/i.test(room.gymAccess) ? 3 : 0) +
    (prioritySet.has("Quiet environment") && /quiet|calmer/i.test(room.quietness) ? 4 : 0);
  const dealBreakerPenalty = profile.mustHaves.filter((mustHave) => !amenitySet.has(mustHave)).length * 6;

  return (
    budgetScore +
    commuteScore +
    mrtScore +
    amenityScore +
    priorityBoost +
    (preferredRoomFit ? 7 : 0) +
    room.confidence * 0.08 -
    dealBreakerPenalty
  );
}

function getRankLabel(room, index) {
  if (index === 0) return "#1 Best Overall Fit";
  if (room.rent <= 1150) return `#${index + 1} Best Budget Pick`;
  if (room.amenities.includes("Private bathroom")) return `#${index + 1} Best Comfort Pick`;
  if (room.mrtWalkMinutes <= 6) return `#${index + 1} Best Convenience Pick`;
  return `#${index + 1} Alternative Pick`;
}

function buildShortReason(room, profile, withinBudget) {
  if (room.commuteMinutes <= 20 && withinBudget) {
    return "Strong balance of commute, budget, MRT access, and weekly routine.";
  }

  if (!withinBudget) {
    return "Comfortable fit, but the rent needs a budget tradeoff.";
  }

  if (room.rent <= profile.budgetMin) {
    return "Good budget fallback, but check hidden rules and commute cost.";
  }

  if (room.commuteMinutes >= 35) {
    return "Lower rent comes with a meaningful commute penalty.";
  }

  return "Viable room if the missing listing details check out.";
}

function buildLikelyRegret(room, withinBudget, amenities) {
  if (!withinBudget) return "Higher rent pressure.";
  if (room.commuteMinutes >= 35) return "Commute fatigue.";
  if (!amenities.has("cooking allowed")) return "Food routine friction.";
  if (!amenities.has("private bathroom") && room.roomType === "Master room") return "Bathroom detail mismatch.";
  return "Higher rent pressure, not commute fatigue.";
}

function estimateExtractionConfidence({ rent, roomType, unitType, nearestMrt, mrtWalkMinutes, amenities, postalValidation, rawText, sourceUrl }) {
  let confidence = 48;
  if (rawText && rawText.length > 30) confidence += 8;
  if (sourceUrl) confidence += 3;
  if (rent) confidence += 12;
  if (roomType && roomType !== "Common room") confidence += 8;
  if (unitType && unitType !== "Unit type unknown") confidence += 7;
  if (nearestMrt && nearestMrt !== "MRT unknown") confidence += 7;
  if (mrtWalkMinutes) confidence += 7;
  confidence += Math.min(8, amenities.length);
  if (postalValidation?.status === "valid") confidence += 5;
  if (postalValidation?.status === "invalid") confidence -= 12;
  return clamp(Math.round(confidence), 35, 94);
}

function estimateCommuteMinutes(areaProfile, destination, transportMode) {
  if (transportMode === "Drive") {
    return Math.max(8, Math.round((areaProfile?.commuteToKentRidge || 35) * 0.65));
  }

  if (destination.area === areaProfile?.area) return 8;
  if (/kent ridge|nus/i.test(destination.label) || destination.area === "Kent Ridge") {
    return areaProfile?.commuteToKentRidge || 35;
  }

  if (destination.area === "CBD") {
    const cbdEstimates = { Queenstown: 24, Dover: 32, Clementi: 36, "Jurong East": 42, Punggol: 45, "Buona Vista": 28 };
    return cbdEstimates[areaProfile?.area] || 35;
  }

  return areaProfile?.commuteToKentRidge || 35;
}

function estimateRent(roomType, areaProfile) {
  const baseByArea = {
    Queenstown: 1450,
    Dover: 1500,
    Clementi: 1300,
    "Jurong East": 1100,
    Punggol: 950,
    "Buona Vista": 1500
  };
  const base = baseByArea[areaProfile?.area] || 1300;
  if (roomType === "Master room") return base + 150;
  if (roomType === "Studio") return base + 500;
  if (roomType === "Whole unit") return base + 1800;
  return base;
}

function estimateMrtWalkMinutes(nearestMrt) {
  return nearestMrt === "MRT unknown" ? 12 : 8;
}

function estimateMonthlyTransport(commuteMinutes, transportMode) {
  if (transportMode === "Drive") return Math.max(180, Math.round(commuteMinutes * 8));
  if (transportMode === "Walk/Cycle") return Math.max(20, Math.round(commuteMinutes * 0.8));
  return Math.max(55, Math.round(commuteMinutes * 2.4));
}

function extractRouteSeconds(data) {
  if (Number.isFinite(Number(data?.route_summary?.total_time))) return Number(data.route_summary.total_time);
  if (Number.isFinite(Number(data?.plan?.itineraries?.[0]?.duration))) return Number(data.plan.itineraries[0].duration);
  if (Number.isFinite(Number(data?.itineraries?.[0]?.duration))) return Number(data.itineraries[0].duration);
  if (Number.isFinite(Number(data?.duration))) return Number(data.duration);
  return null;
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    throw new Error("External API returned non-JSON response");
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }

  return data;
}

async function fetchText(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = EXTERNAL_API_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToPlainText(html) {
  return String(html || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function formatOneMapDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}-${date.getFullYear()}`;
}

function parseLatLng(lat, lng) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  return { lat: parsedLat, lng: parsedLng };
}

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim();
  if (!normalizedValue || /^null$/i.test(normalizedValue) || /^unknown$/i.test(normalizedValue)) return null;
  return normalizedValue;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeString).filter(Boolean);
}

function normalizeRoomType(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  const matchedType = roomTypePatterns.find(({ value: roomType }) => roomType.toLowerCase() === normalizedValue.toLowerCase());
  if (matchedType) return matchedType.value;

  if (/common/i.test(normalizedValue)) return "Common room";
  if (/master/i.test(normalizedValue)) return "Master room";
  if (/studio/i.test(normalizedValue)) return "Studio";
  if (/whole|entire/i.test(normalizedValue)) return "Whole unit";
  if (/co[-\s]?living/i.test(normalizedValue)) return "Co-living room";
  return null;
}

function normalizeMrtName(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;
  return /\bMRT\b/i.test(normalizedValue) ? titleCase(normalizedValue) : `${titleCase(normalizedValue)} MRT`;
}

function normalizePositiveInteger(value) {
  const parsedValue = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return Math.round(parsedValue);
}

function normalizePostalCode(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;
  const match = normalizedValue.match(/\b\d{6}\b/);
  return match?.[0] || null;
}

function normalizeUrl(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  try {
    return new URL(normalizedValue).toString();
  } catch (_error) {
    return null;
  }
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function urlPattern() {
  return /https?:\/\/[^\s)]+/gi;
}

function extractUrls(text) {
  return String(text || "").match(urlPattern()) || [];
}

function slugTextFromUrl(url) {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);
    return decodeURIComponent(parsedUrl.pathname)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_/]+/g, " ")
      .trim();
  } catch (_error) {
    return String(url).replace(/[-_/]+/g, " ");
  }
}

function firstUrlSegment(url) {
  const slug = slugTextFromUrl(url);
  return slug.split(/\s+/).find((segment) => segment.length > 3) || "";
}

function uniqueRoomId(base, index) {
  return `${String(base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${index + 1}`;
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\bMrt\b/g, "MRT")
    .replace(/\bNus\b/g, "NUS")
    .replace(/\bSmu\b/g, "SMU")
    .replace(/\bNtu\b/g, "NTU");
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function addWarning(warnings, message) {
  if (!warnings.includes(message)) warnings.push(message);
}
