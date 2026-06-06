import { Dispatch, FormEvent, SetStateAction, useEffect, useRef, useState } from "react";
import { BiasWarningsPanel } from "./dolphine/BiasWarningsPanel";
import { NeighbourhoodComparison } from "./dolphine/NeighbourhoodComparison";
import { AIWeightsPanel } from "./dolphine/AIWeightsPanel";
import { VerdictCard } from "./dolphine/VerdictCard";
import { TotalLifeCostMatrix } from "./dolphine/TotalLifeCostMatrix";
import { VibeScoreCard } from "./dolphine/VibeScoreCard";
import { ScoreBreakdownPanel } from "./dolphine/ScoreBreakdownPanel";
import { AgentReasoningBubble } from "./dolphine/AgentReasoningBubble";
import { CorrectnessPanel } from "./dolphine/CorrectnessPanel";
import type { DolphineInsights, RoomExtras } from "./dolphine/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

type TransportMode = "MRT/Bus" | "Walk/Cycle" | "Drive";
type AppStatus = "idle" | "loading" | "results";
type ListingInputMode = "demo" | "text" | "urls";
type RoomTypePreference = "Common room" | "Master room" | "Studio" | "Whole unit" | "No preference";

type LocationOption = {
  id: string;
  label: string;
  area: string;
  nearestMrt: string;
  postalCode?: string;
  latLng: {
    lat: number;
    lng: number;
  };
};

type Profile = {
  destinationInput: string;
  selectedLocationId: string | null;
  customLocationHelper: string;
  budgetMin: number;
  budgetMax: number;
  officeDays: number;
  transportMode: TransportMode;
  preferredRoomType: RoomTypePreference;
  peopleCount: number;
  mustHaves: string[];
  rankedPriorities: string[];
};

type RoomListing = {
  id: string;
  image: string;
  imageUrl?: string;
  rankLabel: string;
  title: string;
  area: string;
  rent: number;
  roomType: string;
  unitType: string;
  nearestMrt: string;
  mrtWalkMinutes: number;
  commuteMinutes: number;
  annualCommuteHours: number;
  monthlyTransport: number;
  foodAccess: string;
  gymAccess: string;
  quietness: string;
  amenities: string[];
  missingFields: string[];
  pros: string[];
  cons: string[];
  hiddenRisks: string[];
  whyHigh: string[];
  tradeoffs: string[];
  confidence: number;
  listedUrl: string;
  shortReason: string;
  likelyRegret: string;
  photoTone: "aqua" | "sand" | "coral";
  regretProbability?: number;
  regretDriver?: string;
  totalMonthlyCost?: number;
  timeTax?: number;
  vibeScore?: RoomExtras["vibeScore"];
  agentInsight?: string;
  twelveMonthForecast?: string;
  scoreBreakdown?: RoomExtras["scoreBreakdown"];
};

const singaporeLocations: LocationOption[] = [
  { id: "nus-kent-ridge", label: "NUS Kent Ridge", area: "Kent Ridge", nearestMrt: "Kent Ridge MRT", postalCode: "119077", latLng: { lat: 1.2966, lng: 103.7764 } },
  { id: "nus-utown", label: "NUS UTown", area: "Kent Ridge", nearestMrt: "Kent Ridge MRT", postalCode: "138607", latLng: { lat: 1.3039, lng: 103.7742 } },
  { id: "nus-soc", label: "NUS School of Computing", area: "Kent Ridge", nearestMrt: "Kent Ridge MRT", postalCode: "117417", latLng: { lat: 1.2949, lng: 103.7738 } },
  { id: "nus-business", label: "NUS Business School", area: "Kent Ridge", nearestMrt: "Kent Ridge MRT", postalCode: "119245", latLng: { lat: 1.293, lng: 103.7758 } },
  { id: "kent-ridge-mrt", label: "Kent Ridge MRT", area: "Kent Ridge", nearestMrt: "Kent Ridge MRT", postalCode: "119074", latLng: { lat: 1.2935, lng: 103.7845 } },
  { id: "one-north", label: "One-North", area: "One-North", nearestMrt: "one-north MRT", postalCode: "138632", latLng: { lat: 1.2997, lng: 103.7871 } },
  { id: "buona-vista", label: "Buona Vista", area: "Buona Vista", nearestMrt: "Buona Vista MRT", postalCode: "138617", latLng: { lat: 1.3072, lng: 103.7902 } },
  { id: "raffles-place", label: "Raffles Place", area: "CBD", nearestMrt: "Raffles Place MRT", postalCode: "048621", latLng: { lat: 1.284, lng: 103.8513 } },
  { id: "tiktok-hq", label: "TikTok HQ (One Raffles Quay)", area: "Raffles Place", nearestMrt: "Raffles Place MRT", postalCode: "048583", latLng: { lat: 1.2814, lng: 103.8514 } },
  { id: "shopee-hq", label: "Shopee HQ (one-north)", area: "Buona Vista", nearestMrt: "one-north MRT", postalCode: "118222", latLng: { lat: 1.2986, lng: 103.7872 } },
  { id: "tanjong-pagar", label: "Tanjong Pagar", area: "CBD", nearestMrt: "Tanjong Pagar MRT", postalCode: "079903", latLng: { lat: 1.2764, lng: 103.8458 } },
  { id: "marina-bay", label: "Marina Bay", area: "Marina Bay", nearestMrt: "Marina Bay MRT", postalCode: "018984", latLng: { lat: 1.2763, lng: 103.8547 } },
  { id: "changi-business-park", label: "Changi Business Park", area: "Changi", nearestMrt: "Expo MRT", postalCode: "486066", latLng: { lat: 1.3346, lng: 103.9628 } },
  { id: "ntu", label: "NTU", area: "Jurong West", nearestMrt: "Pioneer MRT", postalCode: "639798", latLng: { lat: 1.3483, lng: 103.6831 } },
  { id: "smu", label: "SMU", area: "Bras Basah", nearestMrt: "Bencoolen MRT", postalCode: "178899", latLng: { lat: 1.2966, lng: 103.8501 } },
  { id: "sutd", label: "SUTD", area: "Changi", nearestMrt: "Upper Changi MRT", postalCode: "487372", latLng: { lat: 1.3414, lng: 103.9639 } },
  { id: "singapore-management-university", label: "Singapore Management University", area: "Bras Basah", nearestMrt: "Bencoolen MRT", postalCode: "178899", latLng: { lat: 1.2966, lng: 103.8501 } },
  { id: "nuh", label: "National University Hospital", area: "Kent Ridge", nearestMrt: "Kent Ridge MRT", postalCode: "119074", latLng: { lat: 1.2945, lng: 103.7832 } }
];

const mrtStationNames = [
  "Admiralty",
  "Aljunied",
  "Ang Mo Kio",
  "Bartley",
  "Bayfront",
  "Bayshore",
  "Beauty World",
  "Bedok",
  "Bedok North",
  "Bedok Reservoir",
  "Bencoolen",
  "Bendemeer",
  "Bishan",
  "Boon Keng",
  "Boon Lay",
  "Botanic Gardens",
  "Braddell",
  "Bras Basah",
  "Bright Hill",
  "Buangkok",
  "Bugis",
  "Bukit Batok",
  "Bukit Gombak",
  "Bukit Panjang",
  "Buona Vista",
  "Caldecott",
  "Canberra",
  "Cashew",
  "Changi Airport",
  "Chinatown",
  "Chinese Garden",
  "Choa Chu Kang",
  "City Hall",
  "Clarke Quay",
  "Clementi",
  "Commonwealth",
  "Dakota",
  "Dhoby Ghaut",
  "Dover",
  "Downtown",
  "Esplanade",
  "Eunos",
  "Expo",
  "Farrer Park",
  "Farrer Road",
  "Fort Canning",
  "Gardens by the Bay",
  "Geylang Bahru",
  "Great World",
  "Gul Circle",
  "HarbourFront",
  "Havelock",
  "Haw Par Villa",
  "Hillview",
  "Holland Village",
  "Hougang",
  "Hume",
  "Jalan Besar",
  "Joo Koon",
  "Jurong East",
  "Kaki Bukit",
  "Kallang",
  "Katong Park",
  "Kembangan",
  "Kent Ridge",
  "Khatib",
  "Kovan",
  "Kranji",
  "Labrador Park",
  "Lakeside",
  "Lavender",
  "Lentor",
  "Little India",
  "Lorong Chuan",
  "MacPherson",
  "Marina Bay",
  "Marina South Pier",
  "Marine Parade",
  "Marine Terrace",
  "Marsiling",
  "Marymount",
  "Mattar",
  "Maxwell",
  "Mayflower",
  "Mountbatten",
  "Napier",
  "Newton",
  "Nicoll Highway",
  "Novena",
  "one-north",
  "Orchard",
  "Orchard Boulevard",
  "Outram Park",
  "Pasir Panjang",
  "Pasir Ris",
  "Paya Lebar",
  "Pioneer",
  "Potong Pasir",
  "Promenade",
  "Punggol",
  "Punggol Coast",
  "Queenstown",
  "Raffles Place",
  "Redhill",
  "Rochor",
  "Sembawang",
  "Sengkang",
  "Serangoon",
  "Shenton Way",
  "Siglap",
  "Simei",
  "Sixth Avenue",
  "Somerset",
  "Springleaf",
  "Stadium",
  "Stevens",
  "Tai Seng",
  "Tan Kah Kee",
  "Tanah Merah",
  "Tampines",
  "Tampines East",
  "Tampines West",
  "Tanjong Katong",
  "Tanjong Pagar",
  "Tanjong Rhu",
  "Telok Ayer",
  "Telok Blangah",
  "Tiong Bahru",
  "Toa Payoh",
  "Tuas Crescent",
  "Tuas Link",
  "Tuas West Road",
  "Ubi",
  "Upper Changi",
  "Upper Thomson",
  "Woodlands",
  "Woodlands North",
  "Woodlands South",
  "Woodleigh",
  "Yew Tee",
  "Yio Chu Kang",
  "Yishun"
];

const mrtStationOptions: LocationOption[] = mrtStationNames.map((stationName) => ({
  id: `mrt-${stationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
  label: `${stationName} MRT`,
  area: stationName,
  nearestMrt: `${stationName} MRT`,
  latLng: { lat: 0, lng: 0 }
}));

const destinationOptions = [
  ...singaporeLocations,
  ...mrtStationOptions.filter(
    (station) => !singaporeLocations.some((location) => location.label.toLowerCase() === station.label.toLowerCase())
  )
];

const validPostalCodeOptions = singaporeLocations.reduce<{ postalCode: string; label: string; area: string }[]>(
  (options, location) => {
    if (!location.postalCode || options.some((option) => option.postalCode === location.postalCode)) {
      return options;
    }

    return [...options, { postalCode: location.postalCode, label: location.label, area: location.area }];
  },
  []
);

const validPostalCodes = new Set(validPostalCodeOptions.map((option) => option.postalCode));

const mustHaveOptions = [
  "Aircon",
  "WiFi included",
  "Cooking allowed",
  "Private bathroom",
  "No owner staying",
  "Furnished",
  "Washing machine"
];

const priorityOptions = [
  "Short commute",
  "Lower rent",
  "Near MRT",
  "Affordable food",
  "Gym access",
  "Quiet environment",
  "More privacy"
];

const loadingSteps = [
  "Extracting room details",
  "Resolving work/study location",
  "Estimating commute burden",
  "Checking must-haves and deal breakers",
  "Comparing rent against lifestyle impact",
  "Simulating future routine",
  "Ranking rooms"
];

const demoListingText = `Queenstown common room, S$1450/month, 6 min walk to Queenstown MRT, 3B2B, aircon, wifi included, cooking allowed, no owner staying, utilities included.
Jurong East common room, S$1100/month, 10 min walk to MRT, 5B2B, aircon, no cooking, utilities not included.
Dover master room, S$1550/month, 7 min walk to Dover MRT, 3B2B, private bathroom, aircon, furnished, quiet block.
Clementi common room, S$1300/month, 5 min walk to Clementi MRT, 4B2B, wifi included, cooking allowed, strong food access.
Punggol co-living room, S$950/month, 9 min walk to Punggol MRT, co-living, furnished, washing machine, longer commute.`;

const demoRooms: RoomListing[] = [
  {
    id: "queenstown-common",
    rankLabel: "#1 Best Overall Fit",
    title: "Queenstown Common Room",
    area: "Queenstown",
    rent: 1450,
    roomType: "Common room",
    unitType: "3B2B",
    nearestMrt: "Queenstown MRT",
    mrtWalkMinutes: 6,
    commuteMinutes: 12,
    annualCommuteHours: 180,
    monthlyTransport: 68,
    foodAccess: "Strong hawker and casual dinner options",
    gymAccess: "Several gyms within a short evening route",
    quietness: "Moderate-quiet residential pocket",
    amenities: ["Aircon", "WiFi included", "Cooking allowed", "No owner staying", "Utilities included"],
    missingFields: ["Room size", "Visitor policy", "Aircon servicing terms"],
    pros: ["Short commute", "Within budget", "Cooking allowed", "Close to MRT", "Supports gym routine"],
    cons: ["Shared bathroom", "Higher rent than budget option", "Room size unknown"],
    hiddenRisks: ["Utilities may be capped", "Visitor policy unknown", "Aircon servicing unclear"],
    whyHigh: [
      "12 min commute to NUS School of Computing",
      "Within S$1,500 budget",
      "Cooking allowed",
      "No owner staying",
      "Strong MRT access"
    ],
    tradeoffs: ["Common bathroom", "Slightly higher rent than Jurong East"],
    confidence: 91,
    image: "/listing-images/pg-room-12.jpg",
    imageUrl: "/listing-images/pg-room-12.jpg",
    listedUrl: "https://example.com/listings/queenstown-common-room",
    shortReason: "Best balance of commute, budget, cooking, and weekday routine.",
    likelyRegret: "Higher rent pressure, not commute fatigue.",
    photoTone: "aqua"
  },
  {
    id: "dover-master",
    rankLabel: "#2 Best Comfort Fit",
    title: "Dover Master Room",
    area: "Dover",
    rent: 1550,
    roomType: "Master room",
    unitType: "3B2B",
    nearestMrt: "Dover MRT",
    mrtWalkMinutes: 7,
    commuteMinutes: 10,
    annualCommuteHours: 160,
    monthlyTransport: 60,
    foodAccess: "Decent daily food, less variety late at night",
    gymAccess: "Limited but workable nearby",
    quietness: "Calmer surroundings",
    amenities: ["Aircon", "Private bathroom", "Furnished", "Washing machine"],
    missingFields: ["Owner staying status", "Cooking policy", "Utilities policy"],
    pros: ["Private bathroom", "Shortest commute", "Quieter area"],
    cons: ["Above S$1,500 budget", "Cooking policy unclear", "Fewer lifestyle amenities"],
    hiddenRisks: ["Owner staying status unknown", "Utilities policy unclear", "Cooking may be limited"],
    whyHigh: ["10 min commute", "Private bathroom", "Calmer surroundings"],
    tradeoffs: ["S$50 above max budget", "Fewer food and gym choices"],
    confidence: 87,
    image: "/listing-images/pg-room-01.jpg",
    imageUrl: "/listing-images/pg-room-01.jpg",
    listedUrl: "https://example.com/listings/dover-master-room",
    shortReason: "Best if privacy and quiet matter more than strict budget.",
    likelyRegret: "Higher rent and fewer late-night options.",
    photoTone: "sand"
  },
  {
    id: "clementi-common",
    rankLabel: "#3 Best Convenience Fit",
    title: "Clementi Common Room",
    area: "Clementi",
    rent: 1300,
    roomType: "Common room",
    unitType: "4B2B",
    nearestMrt: "Clementi MRT",
    mrtWalkMinutes: 5,
    commuteMinutes: 18,
    annualCommuteHours: 220,
    monthlyTransport: 75,
    foodAccess: "Excellent affordable food and student-friendly options",
    gymAccess: "Good access around central Clementi",
    quietness: "Busier student area",
    amenities: ["Aircon", "WiFi included", "Cooking allowed", "Washing machine"],
    missingFields: ["Owner staying status", "Utilities cap", "Visitor policy"],
    pros: ["Affordable food", "Within budget", "Near MRT", "Cooking allowed"],
    cons: ["Busier surroundings", "Longer commute than Queenstown", "Owner status unknown"],
    hiddenRisks: ["Owner staying status unknown", "Utilities may be capped", "Shared-space rules unclear"],
    whyHigh: ["Within budget", "5 min walk to MRT", "Strong food access"],
    tradeoffs: ["Busier environment", "Less quiet than Dover or Queenstown"],
    confidence: 89,
    image: "/listing-images/pg-room-13.jpg",
    imageUrl: "/listing-images/pg-room-13.jpg",
    listedUrl: "https://example.com/listings/clementi-common-room",
    shortReason: "A practical food-and-MRT option with a manageable commute.",
    likelyRegret: "Busier environment.",
    photoTone: "coral"
  },
  {
    id: "jurong-east-common",
    rankLabel: "#4 Best Budget Fit",
    title: "Jurong East Common Room",
    area: "Jurong East",
    rent: 1100,
    roomType: "Common room",
    unitType: "5B2B",
    nearestMrt: "Jurong East MRT",
    mrtWalkMinutes: 10,
    commuteMinutes: 38,
    annualCommuteHours: 410,
    monthlyTransport: 95,
    foodAccess: "Good malls and daily food access",
    gymAccess: "Acceptable gym access",
    quietness: "Moderate",
    amenities: ["Aircon"],
    missingFields: ["WiFi", "Owner staying status", "Visitor policy", "Aircon servicing"],
    pros: ["Lowest rent", "Large transport hub", "Good food access"],
    cons: ["No cooking", "Utilities not included", "Longer commute"],
    hiddenRisks: ["Utilities not included", "No cooking may affect weekly routine", "Commute fatigue likely"],
    whyHigh: ["S$350 cheaper than Queenstown", "Near a major transport hub", "Good budget fallback"],
    tradeoffs: ["38 min commute", "No cooking", "Utilities not included"],
    confidence: 88,
    image: "/listing-images/pg-room-09.jpg",
    imageUrl: "/listing-images/pg-room-09.jpg",
    listedUrl: "https://example.com/listings/jurong-east-common-room",
    shortReason: "Lowest rent, but the commute and cooking restriction are real lifestyle costs.",
    likelyRegret: "Commute fatigue.",
    photoTone: "sand"
  },
  {
    id: "punggol-coliving",
    rankLabel: "#5 Cheapest Fallback",
    title: "Punggol Co-living Room",
    area: "Punggol",
    rent: 950,
    roomType: "Co-living room",
    unitType: "Co-living",
    nearestMrt: "Punggol MRT",
    mrtWalkMinutes: 9,
    commuteMinutes: 55,
    annualCommuteHours: 590,
    monthlyTransport: 110,
    foodAccess: "Basic food access, less convenient for Kent Ridge routine",
    gymAccess: "Limited compared with central-west options",
    quietness: "Quiet residential environment",
    amenities: ["Furnished", "Washing machine", "WiFi included"],
    missingFields: ["Cooking policy", "Owner staying status", "Utilities cap", "Visitor policy"],
    pros: ["Lowest rent", "Furnished", "Quiet environment"],
    cons: ["Very long commute", "Less relevant to Kent Ridge routine", "Cooking policy unclear"],
    hiddenRisks: ["Long travel time compounds across the year", "Co-living rules may be restrictive", "Visitor policy unknown"],
    whyHigh: ["Lowest rent", "Quiet environment", "Furnished setup"],
    tradeoffs: ["55 min commute", "Higher transport cost", "Weaker gym and food fit"],
    confidence: 84,
    image: "/listing-images/pg-room-08.jpg",
    imageUrl: "/listing-images/pg-room-08.jpg",
    listedUrl: "https://example.com/listings/punggol-coliving-room",
    shortReason: "Acceptable only if rent is the overriding priority.",
    likelyRegret: "Long travel time.",
    photoTone: "coral"
  }
];

const topRoom = demoRooms[0];

const currency = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0
});

function formatMoney(value: number) {
  return currency.format(value).replace("SGD", "S$");
}

function getSelectedLocation(profile: Profile) {
  return destinationOptions.find((location) => location.id === profile.selectedLocationId) ?? null;
}

function getDestinationLabel(profile: Profile) {
  return getSelectedLocation(profile)?.label || profile.destinationInput || "NUS School of Computing";
}

function getWeeklyCommuteHours(room: RoomListing, officeDays: number) {
  return Math.round(((room.commuteMinutes * 2 * officeDays) / 60) * 10) / 10;
}

function App() {
  const [profile, setProfile] = useState<Profile>({
    destinationInput: "NUS School of Computing",
    selectedLocationId: "nus-soc",
    customLocationHelper: "",
    budgetMin: 1000,
    budgetMax: 1500,
    officeDays: 3,
    transportMode: "MRT/Bus",
    preferredRoomType: "No preference",
    peopleCount: 1,
    mustHaves: ["Aircon", "WiFi included", "Cooking allowed", "No owner staying"],
    rankedPriorities: ["Short commute", "Near MRT", "Gym access", "Quiet environment"]
  });
  const [listingMode, setListingMode] = useState<ListingInputMode>("demo");
  const [listingInputs, setListingInputs] = useState<string[]>([""]);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState(topRoom.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const profileRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<number[]>([]);
  const [rooms, setRooms] = useState<RoomListing[]>(demoRooms);
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [insights, setInsights] = useState<DolphineInsights | null>(null);

  useEffect(() => {
    return () => {
      timeoutRef.current.forEach(window.clearTimeout);
    };
  }, []);

  function scrollToProfile() {
    profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function serializeProfileToNL(p: Profile): string {
    const loc = singaporeLocations.find((l) => l.id === p.selectedLocationId);
    const location = loc?.label || p.destinationInput || "NUS School of Computing";
    const parts: string[] = [
      `I work at ${location}.`,
      `My budget is S$${p.budgetMax}/month.`,
      `I work in office ${p.officeDays} day${p.officeDays !== 1 ? "s" : ""} per week.`,
    ];
    if (p.preferredRoomType && p.preferredRoomType !== "No preference") {
      parts.push(`I prefer a ${p.preferredRoomType.toLowerCase()}.`);
    }
    if (p.mustHaves.length > 0) parts.push(`Must haves: ${p.mustHaves.join(", ")}.`);
    if (p.rankedPriorities.length > 0) {
      parts.push(`My top priorities are: ${p.rankedPriorities.slice(0, 3).join(", ")}.`);
      if (p.rankedPriorities.includes("Gym access")) parts.push("I go to the gym regularly.");
      if (p.rankedPriorities.includes("Quiet environment")) parts.push("I prefer a quiet environment.");
    }
    return parts.join(" ");
  }

  async function analyzeRooms() {
    timeoutRef.current.forEach(window.clearTimeout);
    timeoutRef.current = [];
    setStatus("loading");
    setLoadingStep(0);

    loadingSteps.forEach((_, index) => {
      timeoutRef.current.push(window.setTimeout(() => setLoadingStep(index), index * 210));
    });

    try {
      const message = serializeProfileToNL(profile);
      const resp = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message,
          profile,
          listingMode,
          listingInputs: listingMode !== "demo" ? listingInputs : [],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.rooms && data.rooms.length > 0) {
          setRooms(data.rooms);
          setSelectedRoomId(data.rooms[0].id);
        }
        if (data.insights) setInsights(data.insights);
      }
    } catch {
      // API unavailable — keep demoRooms visible
    } finally {
      setStatus("results");
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }

  async function handleChatRefinement(msg: string) {
    if (!msg.trim() || chatLoading) return;
    setChatLoading(true);
    setChatInput("");
    try {
      const resp = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: msg, profile }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.rooms && data.rooms.length > 0) {
          setRooms(data.rooms);
          setSelectedRoomId(data.rooms[0].id);
        }
        if (data.insights) setInsights(data.insights);
      }
    } catch {
      // keep existing results on error
    } finally {
      setChatLoading(false);
    }
  }

  function handleTryAnotherProfile() {
    setStatus("idle");
    window.setTimeout(scrollToProfile, 40);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ocean-radial font-sans text-sea-ink">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-sea-glass/60 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-coral/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 rounded-full bg-sand/80 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <LandingSection onStart={scrollToProfile} />

        <ProfileForm
          refCallback={(node) => {
            profileRef.current = node;
          }}
          profile={profile}
          setProfile={setProfile}
        />

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-white/75 bg-white/76 p-8 text-center shadow-soft backdrop-blur-xl sm:p-10">
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Ready when you are</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-sea-ink sm:text-4xl">
              Let Dolphine analyze it for you.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              Dolphine picks from real listings, models your lifestyle, spots decision blind spots, and gives you an evidence-backed verdict.
            </p>
            <button
              className="mt-8 rounded-full bg-coral px-10 py-4 text-base font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#df5f51] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={status === "loading"}
              type="button"
              onClick={analyzeRooms}
            >
              {status === "loading" ? "Analyzing rooms..." : "Analyze Rooms"}
            </button>
          </div>
        </section>

        {status === "loading" && <LoadingSteps activeStep={loadingStep} />}

        {status === "results" && (
          <ResultsDashboard
            refCallback={(node) => {
              resultsRef.current = node;
            }}
            chatInput={chatInput}
            chatLoading={chatLoading}
            onChatInput={setChatInput}
            onChatSubmit={handleChatRefinement}
            onOpenLandlordMessage={() => setIsModalOpen(true)}
            onSelectRoom={setSelectedRoomId}
            onTryAnotherProfile={handleTryAnotherProfile}
            insights={insights}
            profile={profile}
            rooms={rooms}
            selectedRoom={rooms.find((r) => r.id === selectedRoomId) ?? rooms[0] ?? topRoom}
            selectedRoomId={selectedRoomId}
          />
        )}
      </div>

      <LandlordMessageModal
        destination={getDestinationLabel(profile)}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        room={rooms.find((r) => r.id === selectedRoomId) ?? rooms[0] ?? topRoom}
      />
    </main>
  );
}

function LandingSection({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative grid min-h-screen place-items-center py-24 text-center">
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/35 blur-3xl" />
      <div className="relative mx-auto max-w-4xl animate-rise-in">
        <p className="mb-6 inline-flex rounded-full border border-sea-teal/15 bg-white/70 px-4 py-2 text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
          AI room decision advisor
        </p>
        <h1 className="font-display text-7xl font-extrabold leading-none tracking-[0.035em] text-sea-ink sm:text-8xl lg:text-9xl">
          🐬 DOLPHINE
        </h1>
        <p className="mt-7 font-display text-3xl font-bold tracking-[-0.04em] text-sea-deep sm:text-4xl">
          Find a life, not just a room.
        </p>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600">
          Paste any room listing. Dolphine predicts how that room will fit your daily life before you sign the lease.
        </p>
        <button
          className="mt-10 rounded-full bg-sea-deep px-8 py-4 text-base font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-sea-ink"
          type="button"
          onClick={onStart}
        >
          Find My Best Room
        </button>
      </div>
    </section>
  );
}

function ProfileForm({
  profile,
  refCallback,
  setProfile
}: {
  profile: Profile;
  refCallback: (node: HTMLElement | null) => void;
  setProfile: Dispatch<SetStateAction<Profile>>;
}) {
  return (
    <section className="scroll-mt-8 py-28 sm:py-32 lg:py-40" ref={refCallback}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Life profile</p>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.04em] text-sea-ink sm:text-5xl">
            Tell Dolphine what your week looks like.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-500">
            Keep it lightweight: destination, budget range, living constraints, and the tradeoffs you care about most.
          </p>
        </div>

        <form
          className="glass-card rounded-[2.5rem] p-6 sm:p-8 lg:p-10"
          onSubmit={(event) => event.preventDefault()}
        >
          <LocationCombobox profile={profile} setProfile={setProfile} />

          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <div>
              <span className="text-sm font-extrabold text-sea-ink">Monthly budget range</span>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <MoneyInput
                  label="Min"
                  value={profile.budgetMin}
                  onChange={(value) => setProfile((current) => ({ ...current, budgetMin: value }))}
                />
                <MoneyInput
                  label="Max"
                  value={profile.budgetMax}
                  onChange={(value) => setProfile((current) => ({ ...current, budgetMax: value }))}
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-extrabold text-sea-ink">Office / campus days per week</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <ChoiceButton
                    isActive={profile.officeDays === day}
                    key={day}
                    label={String(day)}
                    onClick={() => setProfile((current) => ({ ...current, officeDays: day }))}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-3">
            <label className="grid content-start gap-2">
              <span className="text-sm font-extrabold text-sea-ink">Transport mode</span>
              <select
                className="rounded-2xl border border-sea-deep/10 bg-white px-4 py-3 text-base font-bold text-sea-ink shadow-sm"
                onChange={(event) =>
                  setProfile((current) => ({ ...current, transportMode: event.target.value as TransportMode }))
                }
                value={profile.transportMode}
              >
                {(["MRT/Bus", "Walk/Cycle", "Drive"] as TransportMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid content-start gap-2">
              <span className="text-sm font-extrabold text-sea-ink">Preferred room type</span>
              <select
                className="rounded-2xl border border-sea-deep/10 bg-white px-4 py-3 text-base font-bold text-sea-ink shadow-sm"
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    preferredRoomType: event.target.value as RoomTypePreference
                  }))
                }
                value={profile.preferredRoomType}
              >
                {(["Common room", "Master room", "Studio", "Whole unit", "No preference"] as RoomTypePreference[]).map(
                  (roomType) => (
                    <option key={roomType} value={roomType}>
                      {roomType}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="grid content-start gap-2">
              <span className="text-sm font-extrabold text-sea-ink">How many people living?</span>
              <input
                className="rounded-2xl border border-sea-deep/10 bg-white px-4 py-3 text-base text-sea-ink shadow-sm"
                min={1}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, peopleCount: Math.max(1, Number(event.target.value) || 1) }))
                }
                type="number"
                value={profile.peopleCount}
              />
            </label>
          </div>

          <ChipGroup
            className="mt-8"
            label="Must-haves"
            options={mustHaveOptions}
            selected={profile.mustHaves}
            onToggle={(option) =>
              setProfile((current) => ({
                ...current,
                mustHaves: current.mustHaves.includes(option)
                  ? current.mustHaves.filter((item) => item !== option)
                  : [...current.mustHaves, option]
              }))
            }
          />

          <fieldset className="mt-8">
            <legend className="mb-3 text-sm font-extrabold text-sea-ink">Rank your top priorities</legend>
            <p className="mb-4 text-sm leading-6 text-slate-500">
              Click in order. Dolphine uses the order as your ranking for this demo.
            </p>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((priority) => {
                const priorityRank = profile.rankedPriorities.indexOf(priority);
                return (
                  <button
                    aria-pressed={priorityRank >= 0}
                    className={`rounded-full border px-4 py-2.5 text-sm font-extrabold transition ${
                      priorityRank >= 0
                        ? "border-sea-deep bg-sea-deep text-white shadow-card"
                        : "border-sea-deep/10 bg-white/90 text-slate-500 hover:border-sea-teal hover:text-sea-deep"
                    }`}
                    key={priority}
                    onClick={() =>
                      setProfile((current) => ({
                        ...current,
                        rankedPriorities:
                          current.rankedPriorities.indexOf(priority) >= 0
                            ? current.rankedPriorities.filter((item) => item !== priority)
                            : [...current.rankedPriorities, priority]
                      }))
                    }
                    type="button"
                  >
                    {priorityRank >= 0 ? `${priorityRank + 1}. ` : ""}
                    {priority}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p className="mt-9 border-t border-sea-deep/10 pt-7 text-sm leading-6 text-slate-500">
            Based on: {getDestinationLabel(profile)} · {formatMoney(profile.budgetMin)}–
            {formatMoney(profile.budgetMax)} · {profile.transportMode} · {profile.peopleCount} person ·{" "}
            {profile.rankedPriorities.slice(0, 3).join(" · ")}
          </p>
        </form>
      </div>
    </section>
  );
}

function LocationCombobox({
  profile,
  setProfile
}: {
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHelperOpen, setIsHelperOpen] = useState(false);
  const query = profile.destinationInput.trim().toLowerCase();
  const helperQuery = profile.customLocationHelper.trim().toLowerCase();
  const filteredLocations = destinationOptions.filter((location) =>
    `${location.label} ${location.area} ${location.nearestMrt}`.toLowerCase().includes(query)
  );
  const filteredMrtStations = mrtStationOptions.filter((station) =>
    `${station.label} ${station.area} ${station.nearestMrt}`.toLowerCase().includes(helperQuery)
  );
  const helperValue = profile.customLocationHelper.trim();
  const filteredPostalCodes = validPostalCodeOptions.filter(
    (option) =>
      option.postalCode.includes(helperValue) ||
      option.label.toLowerCase().includes(helperQuery) ||
      option.area.toLowerCase().includes(helperQuery)
  );
  const exactMatch = destinationOptions.some((location) => location.label.toLowerCase() === query);
  const isCustomLocation = profile.destinationInput.trim().length > 0 && !profile.selectedLocationId;
  const isPostalCodeCandidate = /^\d+$/.test(helperValue);
  const hasPostalCodeFormat = /^\d{6}$/.test(helperValue);
  const isValidPostalCode = hasPostalCodeFormat && validPostalCodes.has(helperValue);
  const isValidHelperMrt = mrtStationOptions.some(
    (station) =>
      station.label.toLowerCase() === helperQuery ||
      station.nearestMrt.toLowerCase() === helperQuery ||
      station.area.toLowerCase() === helperQuery
  );
  const shouldValidateHelper = isCustomLocation && helperValue.length > 0;
  const isHelperInvalid =
    shouldValidateHelper && (isPostalCodeCandidate ? !isValidPostalCode : !isValidHelperMrt);
  const helperMrtSuggestions = (helperQuery ? filteredMrtStations : mrtStationOptions).slice(0, 8);
  const helperPostalSuggestions = isPostalCodeCandidate ? filteredPostalCodes.slice(0, 6) : [];

  function selectLocation(location: LocationOption) {
    setProfile((current) => ({
      ...current,
      destinationInput: location.label,
      selectedLocationId: location.id,
      customLocationHelper: ""
    }));
    setIsOpen(false);
  }

  function selectHelperMrt(station: LocationOption) {
    setProfile((current) => ({ ...current, customLocationHelper: station.nearestMrt }));
    setIsHelperOpen(false);
  }

  function selectHelperPostalCode(postalCode: string) {
    setProfile((current) => ({ ...current, customLocationHelper: postalCode }));
    setIsHelperOpen(false);
  }

  return (
    <div className="relative">
      <label className="grid gap-2">
        <span className="text-sm font-extrabold text-sea-ink">Where do you usually go? (Workplace/Study)</span>
        <input
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="location-options"
          className="rounded-2xl border border-sea-deep/10 bg-white px-4 py-3 text-base text-sea-ink shadow-sm"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            const nextValue = event.target.value;
            const matchedLocation = destinationOptions.find(
              (location) => location.label.toLowerCase() === nextValue.trim().toLowerCase()
            );
            setProfile((current) => ({
              ...current,
              destinationInput: nextValue,
              selectedLocationId: matchedLocation?.id ?? null
            }));
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          role="combobox"
          type="text"
          value={profile.destinationInput}
        />
      </label>

      {isOpen && (
        <div
          className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-3xl border border-sea-deep/10 bg-white p-2 shadow-soft"
          id="location-options"
          role="listbox"
        >
          {(query ? filteredLocations : destinationOptions).slice(0, 8).map((location) => (
            <button
              className="w-full rounded-2xl px-4 py-3 text-left transition hover:bg-sea-mist"
              key={location.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectLocation(location)}
              role="option"
              type="button"
            >
              <span className="block font-extrabold text-sea-ink">{location.label}</span>
              <span className="text-sm font-bold text-slate-500">
                {location.area} · nearest MRT: {location.nearestMrt}
              </span>
            </button>
          ))}

          {query && !exactMatch && (
            <button
              className="w-full rounded-2xl px-4 py-3 text-left font-extrabold text-sea-teal transition hover:bg-sea-mist"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setProfile((current) => ({ ...current, selectedLocationId: null }));
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              Use “{profile.destinationInput}” as custom location
            </button>
          )}
        </div>
      )}

      {isCustomLocation && (
        <div className="relative mt-4 grid gap-2 rounded-3xl bg-sea-mist p-4">
          <label className="text-sm font-extrabold text-sea-ink" htmlFor="custom-location-helper">
            Nearest MRT or postal code?
          </label>
          <input
            aria-autocomplete="list"
            aria-controls="helper-mrt-options"
            aria-describedby="custom-location-helper-message"
            aria-expanded={isHelperOpen}
            aria-invalid={isHelperInvalid}
            className={`rounded-2xl border bg-white px-4 py-3 text-base text-sea-ink shadow-sm ${
              isHelperInvalid ? "border-coral ring-4 ring-coral/10" : "border-sea-deep/10"
            }`}
            id="custom-location-helper"
            onBlur={() => window.setTimeout(() => setIsHelperOpen(false), 120)}
            onChange={(event) => {
              setProfile((current) => ({ ...current, customLocationHelper: event.target.value }));
              setIsHelperOpen(true);
            }}
            onFocus={() => setIsHelperOpen(true)}
            placeholder="e.g. Kent Ridge MRT, 119077, or nearest station"
            role="combobox"
            type="text"
            value={profile.customLocationHelper}
          />
          {isHelperOpen && (!helperQuery || helperMrtSuggestions.length > 0 || helperPostalSuggestions.length > 0) && (
            <div
              className="absolute left-4 right-4 top-[6.9rem] z-20 max-h-72 overflow-auto rounded-3xl border border-sea-deep/10 bg-white p-2 shadow-soft"
              id="helper-mrt-options"
              role="listbox"
            >
              {helperMrtSuggestions.map((station) => (
                <button
                  className="w-full rounded-2xl px-4 py-3 text-left transition hover:bg-sea-mist"
                  key={station.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectHelperMrt(station)}
                  role="option"
                  type="button"
                >
                  <span className="block font-extrabold text-sea-ink">{station.label}</span>
                  <span className="text-sm font-bold text-slate-500">Use as nearest MRT</span>
                </button>
              ))}
              {helperPostalSuggestions.map((option) => (
                <button
                  className="w-full rounded-2xl px-4 py-3 text-left transition hover:bg-sea-mist"
                  key={option.postalCode}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectHelperPostalCode(option.postalCode)}
                  role="option"
                  type="button"
                >
                  <span className="block font-extrabold text-sea-ink">{option.postalCode}</span>
                  <span className="text-sm font-bold text-slate-500">
                    {option.label} · {option.area}
                  </span>
                </button>
              ))}
            </div>
          )}
          <span className="text-sm leading-6 text-slate-500">
            This keeps broad inputs like “NUS” or “Shopee” clear enough for a commute estimate in the demo.
          </span>
          {shouldValidateHelper && (
            <span
              className={`text-sm font-bold leading-6 ${isHelperInvalid ? "text-coral" : "text-sea-teal"}`}
              id="custom-location-helper-message"
            >
              {isHelperInvalid
                ? isPostalCodeCandidate
                  ? hasPostalCodeFormat
                    ? "Invalid Singapore postal code."
                    : "Postal code must be exactly 6 digits."
                  : "Choose an MRT station from the suggestions or enter a recognized Singapore postcode."
                : isValidPostalCode
                  ? "Postal code recognized."
                  : "MRT station recognized."}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MoneyInput({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="flex rounded-2xl border border-sea-deep/10 bg-white px-4 py-3 shadow-sm">
      <span className="mr-3 font-extrabold text-sea-teal">{label}</span>
      <span className="mr-1 font-extrabold text-slate-400">S$</span>
      <input
        className="w-full border-0 bg-transparent p-0 text-base text-sea-ink outline-none"
        min={0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        type="number"
        value={value}
      />
    </label>
  );
}

function ChoiceButton({ isActive, label, onClick }: { isActive: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={isActive}
      className={`rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
        isActive
          ? "border-sea-deep bg-sea-deep text-white shadow-card"
          : "border-sea-deep/10 bg-white text-slate-500 hover:border-sea-teal hover:text-sea-deep"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ChipGroup({
  className = "",
  label,
  onToggle,
  options,
  selected
}: {
  className?: string;
  label: string;
  onToggle: (option: string) => void;
  options: string[];
  selected: string[];
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-3 text-sm font-extrabold text-sea-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option);
          return (
            <button
              aria-pressed={isActive}
              className={`rounded-full border px-4 py-2.5 text-sm font-extrabold transition ${
                isActive
                  ? "border-sea-deep bg-sea-deep text-white shadow-card"
                  : "border-sea-deep/10 bg-white/90 text-slate-500 hover:border-sea-teal hover:text-sea-deep"
              }`}
              key={option}
              onClick={() => onToggle(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RoomListingInput({
  isLoading,
  listingInputs,
  listingMode,
  onAnalyze,
  setListingInputs,
  setListingMode
}: {
  isLoading: boolean;
  listingInputs: string[];
  listingMode: ListingInputMode;
  onAnalyze: () => void;
  setListingInputs: Dispatch<SetStateAction<string[]>>;
  setListingMode: (mode: ListingInputMode) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAnalyze();
  }

  const placeholderText =
    listingMode === "urls"
      ? "Paste one listing URL or copied agent message here. PropertyGuru, 99.co, Facebook, Xiaohongshu, Telegram, WhatsApp, and agent messages all work for the demo."
      : "Queenstown common room, S$1450/month, 6 min walk to Queenstown MRT, 3B2B, aircon, wifi included, cooking allowed, no owner staying, utilities included.";

  function updateListing(index: number, value: string) {
    setListingInputs((current) => current.map((listing, listingIndex) => (listingIndex === index ? value : listing)));
  }

  function addListing() {
    setListingInputs((current) => [...current, ""]);
  }

  function removeListing(index: number) {
    setListingInputs((current) => (current.length === 1 ? [""] : current.filter((_, listingIndex) => listingIndex !== index)));
  }

  return (
    <section className="py-28 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Room listing input"
          text="Paste messy listings, agent messages, or links. Add one room per box so Dolphine can compare them clearly."
          title="Paste rooms you are considering."
        />

        <form className="mt-10 rounded-[2.5rem] border border-white/75 bg-white/76 p-6 shadow-soft backdrop-blur-xl sm:p-8 lg:p-10" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-3">
            <ModeButton
              isActive={listingMode === "demo"}
              label="I don't have listings yet"
              onClick={() => {
                setListingMode("demo");
                setListingInputs([""]);
              }}
            />
            <ModeButton isActive={listingMode === "text"} label="Paste listing text" onClick={() => setListingMode("text")} />
            <ModeButton isActive={listingMode === "urls"} label="Paste listing links" onClick={() => setListingMode("urls")} />
          </div>

          {listingMode === "demo" ? (
            <div className="mt-6 rounded-[2rem] bg-sea-mist p-5 text-sm leading-7 text-slate-600">
              No room links yet. Dolphine will start with a realistic sample shortlist so you can see how the advisor works.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {listingInputs.map((listing, index) => (
                <div className="rounded-[2rem] border border-sea-deep/10 bg-white p-4 shadow-sm" key={index}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="text-sm font-extrabold text-sea-ink" htmlFor={`listing-${index}`}>
                      Listing {index + 1}
                    </label>
                    <button
                      className="rounded-full bg-sea-mist px-3 py-1.5 text-xs font-extrabold text-slate-500 transition hover:bg-coral/10 hover:text-coral"
                      onClick={() => removeListing(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    className="min-h-40 w-full rounded-[1.5rem] border border-sea-deep/10 bg-sea-mist/50 p-4 text-base leading-8 text-sea-ink shadow-sm"
                    id={`listing-${index}`}
                    onChange={(event) => updateListing(index, event.target.value)}
                    placeholder={index === 0 ? placeholderText : "Paste another room listing or URL here."}
                    value={listing}
                  />
                </div>
              ))}

              <button
                className="rounded-full border border-sea-deep/15 bg-white px-5 py-3 text-sm font-extrabold text-sea-deep shadow-card transition hover:border-sea-teal"
                onClick={addListing}
                type="button"
              >
                Add another listing
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 border-t border-sea-deep/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">
              Sources can be PropertyGuru, 99.co, Facebook, Xiaohongshu, Telegram, WhatsApp, or agent messages.
            </p>
            <button
              className="rounded-full bg-coral px-8 py-4 text-base font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#df5f51] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Analyzing rooms..." : "Analyze Rooms"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ModeButton({ isActive, label, onClick }: { isActive: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={isActive}
      className={`rounded-2xl border px-4 py-4 text-sm font-extrabold transition ${
        isActive
          ? "border-sea-deep bg-sea-deep text-white shadow-card"
          : "border-sea-deep/10 bg-white text-slate-500 hover:border-sea-teal hover:text-sea-deep"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function LoadingSteps({ activeStep }: { activeStep: number }) {
  return (
    <section className="mx-auto my-28 w-full max-w-3xl animate-rise-in rounded-[2.5rem] border border-white/80 bg-white/76 p-6 shadow-soft backdrop-blur-xl sm:my-32 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Agent reasoning</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em]">Analyzing your rooms</h2>
        </div>
        <div className="hidden h-14 w-14 items-center justify-center rounded-full bg-sea-foam text-2xl sm:flex">🐬</div>
      </div>

      <div className="grid gap-3">
        {loadingSteps.map((step, index) => {
          const isDone = index < activeStep;
          const isActive = index === activeStep;
          return (
            <div
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                isActive
                  ? "border-sea-teal bg-sea-foam text-sea-deep"
                  : isDone
                    ? "border-sea-teal/20 bg-white text-slate-500"
                    : "border-slate-200 bg-white/70 text-slate-400"
              }`}
              key={step}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${
                  isDone || isActive ? "bg-sea-teal text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span className="font-bold">{step}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResultsDashboard({
  chatInput,
  chatLoading,
  onChatInput,
  onChatSubmit,
  onOpenLandlordMessage,
  onSelectRoom,
  onTryAnotherProfile,
  insights,
  profile,
  refCallback,
  rooms,
  selectedRoom,
  selectedRoomId,
}: {
  chatInput: string;
  chatLoading: boolean;
  onChatInput: (value: string) => void;
  onChatSubmit: (msg: string) => void;
  onOpenLandlordMessage: () => void;
  onSelectRoom: (roomId: string) => void;
  onTryAnotherProfile: () => void;
  insights: DolphineInsights | null;
  profile: Profile;
  refCallback: (node: HTMLElement | null) => void;
  rooms: RoomListing[];
  selectedRoom: RoomListing;
  selectedRoomId: string;
}) {
  const deepDiveRef = useRef<HTMLElement | null>(null);
  return (
    <section className="scroll-mt-8 py-24 sm:py-32 lg:py-40" ref={refCallback}>
      <div className="grid gap-28 sm:gap-32 lg:gap-40">
        <VerdictCard
          winner={rooms[0] ?? null}
          tradeoffs={insights?.tradeoffs ?? null}
          onViewAnalysis={() => deepDiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          onGenerateMessage={onOpenLandlordMessage}
        />
        <DolphineChatRefinement
          input={chatInput}
          isLoading={chatLoading}
          onInput={onChatInput}
          onSubmit={onChatSubmit}
        />
        <RankedRoomRecommendations
          onSelectRoom={onSelectRoom}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
        />
        {insights && <CorrectnessPanel correctness={insights.correctness} />}
        {insights && (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <AIWeightsPanel weights={insights.weights} />
            {insights.biasWarnings.length > 0 && <BiasWarningsPanel warnings={insights.biasWarnings} />}
          </div>
        )}
        {insights && insights.neighbourhoodComparison.length > 0 && (
          <TotalLifeCostMatrix rows={insights.neighbourhoodComparison} selectedArea={rooms[0]?.area} />
        )}
        <TradeoffSection rooms={rooms} tradeoffs={insights?.tradeoffs ?? null} />
        <SelectedRoomDeepDive profile={profile} room={selectedRoom} refCallback={(node) => { deepDiveRef.current = node; }} />
        <FutureLifeSimulator profile={profile} room={selectedRoom} />
        {insights && insights.neighbourhoodComparison.length > 0 && (
          <NeighbourhoodComparison rows={insights.neighbourhoodComparison} />
        )}
        <AlternativePicks rooms={rooms} />
        <LandlordQuestions room={selectedRoom} />
        <DolphineReport
          onGenerateLandlordMessage={onOpenLandlordMessage}
          onTryAnotherProfile={onTryAnotherProfile}
          profile={profile}
          room={selectedRoom}
        />
      </div>
    </section>
  );
}

function ExtractedRoomCards({ profile, rooms }: { profile: Profile; rooms: RoomListing[] }) {
  return (
    <section>
      <SectionHeading
        eyebrow="Extracted room cards"
        text={`Dolphine found structured room details from messy listing text and estimated commute to ${getDestinationLabel(profile)}.`}
        title="Here is what Dolphine understood."
      />
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {rooms.map((room) => (
          <article className="rounded-[2rem] border border-white/75 bg-white/76 p-4 shadow-card backdrop-blur" key={room.id}>
            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <RoomPhoto room={room} />
              <div>
                <h3 className="text-xl font-extrabold text-sea-ink">{room.title}</h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {formatMoney(room.rent)}/month · {room.roomType} · {room.unitType}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {room.mrtWalkMinutes} min walk to {room.nearestMrt}
                  <br />
                  {room.commuteMinutes} min to {getDestinationLabel(profile)}
                </p>
                <p className="mt-4 text-sm font-bold leading-6 text-sea-deep">
                  Extracted: {room.amenities.slice(0, 5).join(" · ")}
                </p>
                <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Confidence: {room.confidence}%
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RankedRoomRecommendations({
  onSelectRoom,
  rooms,
  selectedRoomId
}: {
  onSelectRoom: (roomId: string) => void;
  rooms: RoomListing[];
  selectedRoomId: string;
}) {
  return (
    <section>
      <SectionHeading
        eyebrow="Ranked room recommendations"
        text="These are individual listings, not neighbourhoods. Click any room to update the deep dive."
        title="Your best room matches"
      />
      <div className="mt-10 grid gap-5">
        {rooms.map((room) => (
          <button
            aria-pressed={selectedRoomId === room.id}
            className={`rounded-[2.25rem] border p-5 text-left shadow-card transition hover:-translate-y-1 ${
              selectedRoomId === room.id
                ? "border-sea-teal bg-white ring-4 ring-sea-teal/15"
                : "border-white/75 bg-white/76 hover:border-sea-teal/40"
            }`}
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            type="button"
          >
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <RoomPhoto room={room} />
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-coral">{room.rankLabel}</p>
                <h3 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em] text-sea-ink">
                  {room.title}
                </h3>
                <p className="mt-3 text-base font-bold text-slate-500">{room.shortReason}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <CompactMetric label="Rent" value={`${formatMoney(room.rent)}`} />
                  <CompactMetric label="Commute" value={`${room.commuteMinutes} min`} />
                  <CompactMetric label="MRT walk" value={`${room.mrtWalkMinutes} min`} />
                  <CompactMetric label="Unit" value={room.unitType} />
                </div>

                {room.regretProbability != null && (
                  <div className="mt-5 rounded-2xl bg-sea-mist px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
                        Regret probability
                      </span>
                      <strong
                        className={`text-sm font-extrabold ${
                          room.regretProbability > 50 ? "text-coral" : "text-sea-teal"
                        }`}
                      >
                        {room.regretProbability}%
                      </strong>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/70">
                      <div
                        className={`h-full rounded-full ${
                          room.regretProbability > 50 ? "bg-coral" : "bg-sea-teal"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, room.regretProbability))}%` }}
                      />
                    </div>
                    {room.regretDriver && room.regretProbability <= 50 && (
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{room.regretDriver}</p>
                    )}
                  </div>
                )}

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sea-teal">
                      Why it ranks high
                    </p>
                    <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-slate-600">
                      {room.whyHigh.map((reason) => (
                        <li key={reason}>+ {reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-coral">Tradeoff</p>
                    <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-slate-600">
                      {room.tradeoffs.map((tradeoff) => (
                        <li key={tradeoff}>- {tradeoff}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sea-mist px-4 py-3">
      <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <strong className="mt-1 block text-sea-ink">{value}</strong>
    </div>
  );
}

// Maps a ranked priority label to the room dimension that satisfies it.
// Returns the 0-10 score for that dimension (vibe scores, or budget via totalMonthlyCost).
function getPriorityMatch(
  priority: string,
  room: RoomListing
): { label: string; score: number; detail: string } | null {
  const vibe = room.vibeScore ?? { food: 5, transit: 5, gym: 5, quiet: 5, lifestyle: 5 };
  switch (priority) {
    case "Short commute":
      return { label: priority, score: vibe.transit, detail: `${room.commuteMinutes} min commute` };
    case "Near MRT":
      return { label: priority, score: vibe.transit, detail: `${room.mrtWalkMinutes} min walk to ${room.nearestMrt}` };
    case "Quiet environment":
      return { label: priority, score: vibe.quiet, detail: room.quietness };
    case "Gym access":
      return { label: priority, score: vibe.gym, detail: room.gymAccess };
    case "Affordable food":
      return { label: priority, score: vibe.food, detail: room.foodAccess };
    case "Lower rent": {
      // Budget dimension derived from total monthly cost — lower total = better.
      const total = room.totalMonthlyCost ?? room.rent;
      const score = total <= 1500 ? 9 : total <= 2200 ? 7 : 5;
      return { label: priority, score, detail: `${formatMoney(total)}/month all-in` };
    }
    default:
      return null;
  }
}

function SelectedRoomDeepDive({
  profile,
  refCallback,
  room
}: {
  profile: Profile;
  refCallback?: (node: HTMLElement | null) => void;
  room: RoomListing;
}) {
  const vibe = room.vibeScore ?? { food: 5, transit: 5, gym: 5, quiet: 5, lifestyle: 5 };
  const regret = room.regretProbability;
  const priorityMatches = profile.rankedPriorities
    .slice(0, 3)
    .map((priority) => getPriorityMatch(priority, room))
    .filter((match): match is NonNullable<typeof match> => match != null);

  return (
    <section
      className="scroll-mt-8 rounded-[2.75rem] border border-white/75 bg-white/78 p-7 shadow-soft backdrop-blur-xl sm:p-10 lg:p-12"
      ref={refCallback}
    >
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <RoomPhoto room={room} />
          <h2 className="mt-6 font-display text-4xl font-extrabold tracking-[-0.04em] text-sea-ink">
            {room.title}
          </h2>
          {/* One compact summary line — no field dump */}
          <p className="mt-3 text-base font-bold text-slate-500">
            {room.area} · {formatMoney(room.totalMonthlyCost ?? room.rent)}/mo all-in · {room.commuteMinutes} min to {getDestinationLabel(profile)}
          </p>
          <a
            className="mt-5 inline-flex rounded-full bg-sea-deep px-5 py-3 text-sm font-extrabold text-white transition hover:bg-sea-ink"
            href={room.listedUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open listing URL
          </a>

          {/* Priority match mini list */}
          {priorityMatches.length > 0 && (
            <div className="mt-7 rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-card">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sea-teal">Priority match</p>
              <ul className="mt-4 grid gap-3">
                {priorityMatches.map((match) => {
                  const hit = match.score >= 7;
                  return (
                    <li className="flex items-start gap-3" key={match.label}>
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                          hit ? "bg-sea-teal/15 text-sea-teal" : "bg-coral/15 text-coral"
                        }`}
                      >
                        {hit ? "✓" : "△"}
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-sea-ink">
                          {match.label} <span className="text-slate-400">· {match.score}/10</span>
                        </p>
                        <p className="text-xs font-bold text-slate-500">{match.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Selected room deep dive</p>
          <h3 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-sea-ink">
            How this room fits your life
          </h3>

          <div className="mt-6 grid gap-6">
            <ScoreBreakdownPanel
              breakdown={room.scoreBreakdown ?? []}
              totalScore={Math.round(room.confidence)}
              roomTitle={room.title}
            />

            <VibeScoreCard vibe={vibe} title={`${room.area} · Vibe`} />

            {/* Regret probability block */}
            {regret != null && (
              <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-card">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-sea-teal">Regret probability</p>
                  <strong className={`text-2xl font-extrabold ${regret > 50 ? "text-coral" : "text-sea-deep"}`}>
                    {regret}%
                  </strong>
                </div>
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-sea-mist">
                  <div
                    className={`h-full rounded-full ${regret > 50 ? "bg-coral" : "bg-sea-teal"}`}
                    style={{ width: `${Math.min(100, Math.max(0, regret))}%` }}
                  />
                </div>
                {room.regretDriver && (
                  <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
                    Main reason: {room.regretDriver}
                  </p>
                )}
              </div>
            )}

            <AgentReasoningBubble text={room.agentInsight ?? ""} />

            <div className="grid gap-4">
              <DetailAccordion title="Pros" items={room.pros} tone="positive" />
              <DetailAccordion title="Cons" items={room.cons} tone="negative" />
              <DetailAccordion title="Hidden risks" items={room.hiddenRisks} tone="warning" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailAccordion({
  items,
  title,
  tone
}: {
  items: string[];
  title: string;
  tone: "positive" | "negative" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "bg-sea-mist text-sea-deep"
      : tone === "negative"
        ? "bg-coral/10 text-sea-ink"
        : "bg-sand/80 text-sea-ink";

  return (
    <details className={`rounded-3xl p-5 ${toneClass}`} open={title === "Pros"}>
      <summary className="cursor-pointer text-lg font-extrabold">{title}</summary>
      <ul className="mt-4 grid gap-2 text-sm font-bold leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

function TradeoffSection({
  rooms,
  tradeoffs,
}: {
  rooms: RoomListing[];
  tradeoffs: DolphineInsights["tradeoffs"];
}) {
  const winner = rooms[0];
  const runnerUp = rooms[1];
  if (!winner || !runnerUp) return null;

  const winnerCost = winner.totalMonthlyCost ?? winner.rent;
  const runnerCost = runnerUp.totalMonthlyCost ?? runnerUp.rent;
  const costDelta = Math.round(winnerCost - runnerCost);
  const commuteDelta = winner.commuteMinutes - runnerUp.commuteMinutes;
  const listingPairLabel = `${winner.title} vs ${runnerUp.title}`;
  const verdict =
    tradeoffs?.verdict ||
    `${winner.title} wins because it protects more of your daily routine, while ${runnerUp.title} is the strongest alternative if your priorities shift.`;

  const comparisonRows = [
    {
      label: "Rent",
      winner: formatMoney(winner.rent),
      runner: formatMoney(runnerUp.rent),
      note: costDelta <= 0 ? "Winner also protects total cost" : "Runner-up is cheaper after time/transport",
    },
    {
      label: "Life cost / mo",
      winner: formatMoney(winnerCost),
      runner: formatMoney(runnerCost),
      note: `${costDelta >= 0 ? "+" : ""}${formatMoney(costDelta)} vs runner-up`,
    },
    {
      label: "Commute",
      winner: `${winner.commuteMinutes} min`,
      runner: `${runnerUp.commuteMinutes} min`,
      note: commuteDelta <= 0 ? `${Math.abs(commuteDelta)} min faster` : `${commuteDelta} min slower`,
    },
    {
      label: "MRT walk",
      winner: `${winner.mrtWalkMinutes} min`,
      runner: `${runnerUp.mrtWalkMinutes} min`,
      note: winner.mrtWalkMinutes <= runnerUp.mrtWalkMinutes ? "Lower doorstep friction" : "Runner-up is closer to MRT",
    },
  ];

  return (
    <section className="rounded-[2.75rem] border border-white/75 bg-white/78 p-7 shadow-soft backdrop-blur-xl sm:p-10 lg:p-12">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Top 2 room tradeoff</p>
          <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] text-sea-ink sm:text-5xl">
            {listingPairLabel}
          </h2>
          <p className="mt-4 text-sm font-bold leading-6 text-slate-500">
            Comparing the actual top two listings from your current shortlist.
          </p>
        </div>
        <p className="text-base font-bold leading-8 text-slate-600">{verdict}</p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <TradeoffRoomCard room={winner} title="Best overall fit" tone="winner" />
        <TradeoffRoomCard room={runnerUp} title="Best alternative" tone="runner" />
      </div>

      <div className="mt-6 overflow-hidden rounded-[2rem] border border-sea-deep/10 bg-sea-mist/45">
        {comparisonRows.map((row) => (
          <div className="grid gap-3 border-t border-white/70 p-4 first:border-t-0 md:grid-cols-[160px_1fr_1fr_1fr] md:items-center" key={row.label}>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sea-teal">{row.label}</p>
            <p className="font-display text-2xl font-extrabold text-sea-ink">{row.winner}</p>
            <p className="font-display text-2xl font-extrabold text-slate-500">{row.runner}</p>
            <p className="text-sm font-bold leading-6 text-slate-600">{row.note}</p>
          </div>
        ))}
      </div>

      {tradeoffs && (
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-sea-deep px-4 py-2 text-sm font-extrabold text-white">
            Confidence: {tradeoffs.confidence}
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-sea-deep shadow-card">
            Commute saved: {tradeoffs.annualCommuteHoursSaved} hrs/year
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-sea-deep shadow-card">
            Rent Δ {formatMoney(tradeoffs.rentDifference)}
          </span>
        </div>
      )}
    </section>
  );
}

function TradeoffRoomCard({
  room,
  title,
  tone,
}: {
  room: RoomListing;
  title: string;
  tone: "winner" | "runner";
}) {
  const toneClass = tone === "winner" ? "border-sea-teal/30 bg-sea-mist/70" : "border-sand/80 bg-white";
  return (
    <article className={`rounded-[2rem] border p-6 shadow-card ${toneClass}`}>
      <RoomPhoto room={room} />
      <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-sea-teal">{title}</p>
      <h3 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-sea-ink">
        {room.title}
      </h3>
      <p className="mt-2 text-sm font-bold text-slate-500">
        {room.area} · {room.roomType} · {room.nearestMrt} ({room.mrtWalkMinutes} min walk)
      </p>
      <p className="mt-4 text-base font-bold leading-7 text-slate-700">{room.shortReason}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryPill label="Rent" value={formatMoney(room.rent)} />
        <SummaryPill label="Life cost" value={formatMoney(room.totalMonthlyCost ?? room.rent)} />
        <SummaryPill label="Commute" value={`${room.commuteMinutes} min`} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sea-teal">Why it works</p>
          <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-slate-700">
            {room.pros.slice(0, 3).map((item) => <li key={item}>✓ {item}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-coral">Watch-outs</p>
          <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-slate-700">
            {(room.hiddenRisks.length ? room.hiddenRisks : room.cons).slice(0, 3).map((item) => <li key={item}>⚠ {item}</li>)}
          </ul>
        </div>
      </div>
    </article>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/76 px-4 py-3 shadow-sm">
      <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <strong className="mt-1 block text-sea-deep">{value}</strong>
    </div>
  );
}

function parseFirstNumber(text: string, fallback: number) {
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function parseScoreOutOfTen(text: string, fallback: number) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  return match ? Number(match[1]) : fallback;
}

function FutureLifeSimulator({ profile, room }: { profile: Profile; room: RoomListing }) {
  const destination = getDestinationLabel(profile);
  const weeklyCommuteHours = getWeeklyCommuteHours(room, profile.officeDays);
  const gymMinutes = parseFirstNumber(room.gymAccess, 15);
  const foodScore = parseScoreOutOfTen(room.foodAccess, room.vibeScore?.food ?? 5);
  const quietScore = room.vibeScore?.quiet ?? 5;
  const budgetBuffer = profile.budgetMax - room.rent;
  const verdict =
    room.regretProbability != null && room.regretProbability >= 55
      ? "Hidden friction risk"
      : room.regretProbability != null && room.regretProbability >= 35
        ? "Fragile fit"
        : "High fit";

  const habitCards = [
    {
      label: "Commute survival",
      metric: `${room.commuteMinutes} min`,
      status: room.commuteMinutes <= 25 ? "Low friction" : room.commuteMinutes <= 40 ? "Manageable" : "High friction",
      insight:
        room.commuteMinutes <= 25
          ? `${destination} stays close enough that commute should not dominate your weekday.`
          : `${weeklyCommuteHours} hrs/week in transit means the room must win strongly on rent or lifestyle.`,
    },
    {
      label: "Gym consistency",
      metric: `${gymMinutes} min`,
      status: gymMinutes <= 10 ? "Habit protected" : gymMinutes <= 18 ? "Needs discipline" : "Likely drop-off",
      insight:
        gymMinutes <= 10
          ? "Gym remains a low-effort after-work stop, so the habit is likely to survive."
          : "Gym becomes a second trip; this is where good intentions usually decay.",
    },
    {
      label: "Food routine",
      metric: `${foodScore}/10`,
      status: foodScore >= 7 ? "Easy meals" : foodScore >= 5 ? "Workable" : "Meal friction",
      insight:
        foodScore >= 7
          ? "Affordable meals are nearby enough to reduce delivery dependence."
          : "Food convenience is not a major strength; plan groceries or cooking rules carefully.",
    },
    {
      label: "Recovery & quiet",
      metric: `${quietScore}/10`,
      status: quietScore >= 7 ? "Good recovery" : quietScore >= 5 ? "Neutral" : "Noise risk",
      insight:
        quietScore >= 7
          ? "The area supports downtime after campus/work days."
          : "If quietness matters to you, verify road noise and household rules during viewing.",
    },
    {
      label: "Budget pressure",
      metric: `${formatMoney(Math.max(0, budgetBuffer))}`,
      status: budgetBuffer >= 250 ? "Healthy buffer" : budgetBuffer >= 0 ? "Thin buffer" : "Over cap",
      insight:
        budgetBuffer >= 250
          ? "There is enough headroom for utilities, deposit surprises, and small lifestyle choices."
          : "The rent may fit on paper but leaves little room for utilities or lifestyle drift.",
    },
  ];

  return (
    <section className="glass-card rounded-[2.75rem] p-7 sm:p-10 lg:p-12">
      <SectionHeading
        eyebrow="Future lifestyle fit"
        text="Dolphine stress-tests whether this room protects your habits after the novelty wears off."
        title="Will this room protect your routine?"
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          {habitCards.map((habit) => (
            <article className="rounded-[2rem] bg-white/78 p-5 shadow-card" key={habit.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-sea-teal">{habit.label}</p>
                  <h3 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em] text-sea-ink">
                    {habit.metric}
                  </h3>
                </div>
                <span className="rounded-full bg-sea-mist px-3 py-1 text-xs font-extrabold text-sea-deep">
                  {habit.status}
                </span>
              </div>
              <p className="mt-4 text-sm font-bold leading-6 text-slate-600">{habit.insight}</p>
            </article>
          ))}
        </div>

        <aside className="rounded-[2rem] bg-sea-ink p-6 text-white shadow-card">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sea-glass/70">Lifestyle verdict</p>
          <h3 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em]">{verdict}</h3>
          <p className="mt-4 text-sm font-bold leading-6 text-white/68">{room.twelveMonthForecast || room.agentInsight}</p>
          <div className="mt-6 grid gap-3">
            <SummaryMetric label="Weekly commute time" value={`${weeklyCommuteHours} hrs`} />
            <SummaryMetric label="Annual commute hours" value={`${room.annualCommuteHours} hrs`} />
            <SummaryMetric label="Life cost / month" value={formatMoney(room.totalMonthlyCost ?? room.rent)} />
            <SummaryMetric label="Most likely regret" value={room.likelyRegret} />
          </div>
        </aside>
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-white/44">{label}</span>
      <strong className="mt-1 block text-white">{value}</strong>
    </div>
  );
}

function AlternativePicks({ rooms }: { rooms: RoomListing[] }) {
  const alternatives = rooms
    .slice(1)
    .filter((room, index, list) => list.findIndex((candidate) => candidate.id === room.id) === index);

  if (alternatives.length === 0) return null;

  return (
    <section>
      <SectionHeading
        eyebrow="Alternative picks"
        text="Different priorities lead to different rooms. Each card opens the listing URL."
        title="Other rooms worth considering"
      />
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {alternatives.map((room, index) => {
          const rankDetail = room.rankLabel.replace(/^#\d+\s*/, "").trim();
          const tag = rankDetail ? `Alternative #${index + 2} · ${rankDetail}` : `Alternative #${index + 2}`;
          return (
          <a
            className="rounded-[2rem] border border-white/75 bg-white/72 p-6 shadow-card backdrop-blur transition hover:-translate-y-1 hover:border-sea-teal/35"
            href={room.listedUrl}
            key={room.id}
            rel="noreferrer"
            target="_blank"
          >
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-sea-teal">{tag}</p>
            <h3 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-sea-ink">
              {room.title}
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-600">{room.shortReason}</p>
          </a>
          );
        })}
      </div>
    </section>
  );
}

function LandlordQuestions({ room }: { room: RoomListing }) {
  const questions = [
    "Are utilities included or capped?",
    "Is aircon servicing included?",
    "Are visitors allowed?",
    "Is cooking fully allowed or only light cooking?",
    "Is the owner staying in the unit?",
    "What is the minimum lease period?",
    "Is WiFi included?",
    "Are there cleaning rules for shared spaces?"
  ];

  return (
    <section className="rounded-[2.75rem] border border-white/75 bg-white/76 p-7 shadow-soft backdrop-blur-xl sm:p-10 lg:p-12">
      <SectionHeading
        eyebrow="Questions to ask landlord"
        text={`These are based on missing or risky fields in ${room.title}.`}
        title="Before you say yes, ask these."
      />
      <div className="mt-10 grid gap-3 md:grid-cols-2">
        {questions.map((question) => (
          <div className="rounded-2xl bg-sea-mist px-5 py-4 text-sm font-extrabold leading-6 text-sea-ink" key={question}>
            {question}
          </div>
        ))}
      </div>
    </section>
  );
}

function DolphineReport({
  onGenerateLandlordMessage,
  onTryAnotherProfile,
  profile,
  room
}: {
  onGenerateLandlordMessage: () => void;
  onTryAnotherProfile: () => void;
  profile: Profile;
  room: RoomListing;
}) {
  const cookingText = room.amenities.some((amenity) => /cooking/i.test(amenity))
    ? "cooking appears allowed"
    : "cooking still needs landlord verification";
  const ownerText = room.hiddenRisks.some((risk) => /owner/i.test(risk))
    ? "owner-staying rules need verification"
    : "owner-staying constraints are not flagged";

  return (
    <section className="mb-10 rounded-[2.75rem] border border-sea-teal/20 bg-gradient-to-br from-white via-sea-mist to-sand p-7 shadow-soft sm:p-10 lg:p-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Dolphine report</p>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.04em]">Dolphine Report</h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
            Dolphine recommends {room.title} as your best overall fit. It is within your{" "}
            {formatMoney(profile.budgetMax)} budget, has a short {room.commuteMinutes}-minute commute to{" "}
            {getDestinationLabel(profile)}, {cookingText}, and {ownerText}. {room.shortReason}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            className="rounded-full border border-sea-deep/15 bg-white px-6 py-3.5 font-extrabold text-sea-deep shadow-card transition hover:border-sea-teal"
            onClick={onTryAnotherProfile}
            type="button"
          >
            Try another profile
          </button>
          <button
            className="rounded-full bg-sea-deep px-6 py-3.5 font-extrabold text-white shadow-card transition hover:bg-sea-ink"
            onClick={onGenerateLandlordMessage}
            type="button"
          >
            Generate Landlord Message
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, text, title }: { eyebrow: string; text: string; title: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] text-sea-ink sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-slate-500">{text}</p>
    </div>
  );
}

function RoomPhoto({ room }: { room: RoomListing }) {
  const imageUrl = room.imageUrl || room.image;
  const toneClass =
    room.photoTone === "aqua"
      ? "from-sea-glass via-white to-sea-foam"
      : room.photoTone === "sand"
        ? "from-sand via-white to-sea-glass"
        : "from-coral/20 via-white to-sand";

  if (imageUrl) {
    return (
      <div className="relative h-48 overflow-hidden rounded-[1.5rem] bg-sea-mist">
        <img alt={`${room.title} room photo`} className="h-full w-full object-cover" loading="lazy" src={imageUrl} />
        <div className="absolute inset-0 bg-gradient-to-t from-sea-ink/35 via-transparent to-transparent" />
        <span className="absolute right-5 top-5 rounded-full bg-white/82 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
          Room photo
        </span>
      </div>
    );
  }

  return (
    <div className={`relative h-48 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${toneClass}`}>
      <div className="absolute left-5 top-5 h-16 w-24 rounded-2xl bg-white/55" />
      <div className="absolute bottom-6 left-5 h-3 w-28 rounded-full bg-white/70" />
      <div className="absolute bottom-11 left-5 h-3 w-44 rounded-full bg-white/55" />
      <div className="absolute right-5 top-8 h-28 w-20 rounded-t-full bg-sea-deep/10" />
      <span className="absolute right-5 top-5 rounded-full bg-white/75 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
        Room photo
      </span>
    </div>
  );
}

function RoomFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-sea-mist px-4 py-3">
      <span className="font-bold text-slate-500">{label}</span>
      <strong className="text-right text-sea-ink">{value}</strong>
    </div>
  );
}

function LandlordMessageModal({
  destination,
  isOpen,
  onClose,
  room
}: {
  destination: string;
  isOpen: boolean;
  onClose: () => void;
  room: RoomListing;
}) {
  if (!isOpen) return null;

  const message = `Hi, I'm interested in the ${room.title.toLowerCase()}. I study/work near ${destination} and am looking for a long-term stay. May I check whether utilities are included or capped, whether cooking is fully allowed, whether the owner is staying, and when viewing is available?`;

  return (
    <div
      aria-labelledby="landlord-message-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-sea-ink/45 px-5 py-8 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Generated draft</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em]" id="landlord-message-title">
              Landlord message
            </h2>
          </div>
          <button
            aria-label="Close landlord message"
            className="grid h-10 w-10 place-items-center rounded-full bg-sea-mist text-xl font-extrabold text-sea-deep hover:bg-sea-foam"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-6 rounded-3xl border border-sea-deep/10 bg-sea-mist p-5">
          <p className="text-base leading-8 text-slate-700">{message}</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="rounded-full bg-sea-deep px-6 py-3 font-extrabold text-white transition hover:bg-sea-ink"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DolphineChatRefinement({
  input,
  isLoading,
  onInput,
  onSubmit,
}: {
  input: string;
  isLoading: boolean;
  onInput: (value: string) => void;
  onSubmit: (msg: string) => void;
}) {
  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(input);
    }
  }

  const quickPrompts = ["More quiet", "Lower budget", "Closer to MRT"];

  return (
    <section className="rounded-[2rem] border border-white/75 bg-white/76 p-5 shadow-soft backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-sea-teal">Refine with Dolphine</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-sea-ink">
            Want to tweak the ranking?
          </h2>
        </div>
        <p className="text-sm font-bold text-slate-500">Tell me what matters more — I’ll re-rank it.</p>
      </div>

      <div className="mt-5">
        <textarea
          className="min-h-16 w-full rounded-[1.5rem] border border-sea-deep/10 bg-sea-mist/50 p-4 text-base leading-7 text-sea-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-sea-teal/40"
          disabled={isLoading}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='Try: "I care more about quietness"'
          value={input}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                className="rounded-full bg-sea-mist px-3 py-1.5 text-xs font-extrabold text-sea-deep transition hover:bg-sea-foam disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                key={prompt}
                onClick={() => onSubmit(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            className="rounded-full bg-sea-deep px-6 py-3 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-sea-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !input.trim()}
            onClick={() => onSubmit(input)}
            type="button"
          >
            {isLoading ? "Re-ranking…" : "Ask Dolphine"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default App;
