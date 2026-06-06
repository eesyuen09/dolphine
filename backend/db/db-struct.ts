type UserProfile = {
  workplace: "Kent Ridge";
  country: "Singapore"; //Fixed
  budget: 1500;
  currency: "SGD"; //Fixed
  officeDaysPerWeek: 3;
  workingDays: ["Monday", "Wednesday", "Friday"];
  transportMode: ["Public Transport", "Cycling"]; // "Public Transport", "Cycling", "Driving"
  priorities: priorityType[];
  dealBreakers: dealBreakerType[]; // deal breakers are non-negotiable requirements
  isPrivateBathroomNeeded: true,
  isAirconNeeded: true, // True / False / Undefined
};

type priorityType = 
  "Gym access" | "Quiet environment" | "Affordable food";

type dealBreakerType =
  "Commute over 45 min" | "Rent above 1500" | "No MRT access" | "No supermarket nearby";



type HousingProfile = {
  id: "queenstown";
  area: "Queenstown"; // Define nearest MRT station  
  postalCode: "141000";
  rentalMonthly: 1450;
  currency: "SGD";
  distanceToMrtKm: 5;
  commuteTimeMinutes: 12;
  transportMode: "Public Transport"; // "Public Transport", "Cycling", "Driving"
  rent: 1450;
  commuteMinutes: 12;
  annualCommuteHours: 180;
  monthlyTransportCost: 68;

  nearestMrt: "Queenstown MRT";
  walkingToMrtMinutes: 6;

  gymCountNearby: 5;
  foodOptionsNearby: 18;
  supermarketNearby: true;
  clinicNearby: true;
  parkNearby: true;
  hasAircon: true;
  hasPrivateBathroom: true;
  
  quietnessLevel: 7; // 1-10
  safetyLevel: 8; // 1-10
  convenienceLevel: 9; // 1-10

  noteTags: [
    "Good MRT access",
    "Mature estate",
    "Strong food options"
  ];
};

type HousingAnalyseResult = {
  // TODO: Define the structure of the analysis result based on the user's profile and housing profile
}

