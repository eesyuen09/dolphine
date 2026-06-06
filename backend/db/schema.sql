PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  workplace TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Singapore',
  budget_monthly INTEGER NOT NULL CHECK (budget_monthly > 0),
  currency TEXT NOT NULL DEFAULT 'SGD',
  office_days_per_week INTEGER NOT NULL CHECK (office_days_per_week BETWEEN 0 AND 7),
  working_days_json TEXT NOT NULL CHECK (json_valid(working_days_json)),
  transport_modes_json TEXT NOT NULL CHECK (json_valid(transport_modes_json)),
  priorities_json TEXT NOT NULL CHECK (json_valid(priorities_json)),
  deal_breakers_json TEXT NOT NULL CHECK (json_valid(deal_breakers_json)),
  needs_private_bathroom INTEGER CHECK (needs_private_bathroom IN (0, 1)),
  needs_aircon INTEGER CHECK (needs_aircon IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS house_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_platform TEXT NOT NULL,
  source_listing_id TEXT NOT NULL,
  listing_url TEXT NOT NULL,
  title TEXT NOT NULL,
  property_type TEXT NOT NULL,
  room_type TEXT NOT NULL,
  area TEXT NOT NULL,
  district TEXT,
  postal_code TEXT,
  address_text TEXT,
  latitude REAL,
  longitude REAL,
  rental_monthly INTEGER NOT NULL CHECK (rental_monthly > 0),
  currency TEXT NOT NULL DEFAULT 'SGD',
  deposit_months REAL,
  available_from TEXT,
  lease_term_months INTEGER,
  floor_area_sqft INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor_level TEXT,
  furnishing TEXT,
  tenant_type_allowed TEXT,
  has_aircon INTEGER NOT NULL DEFAULT 0 CHECK (has_aircon IN (0, 1)),
  has_private_bathroom INTEGER NOT NULL DEFAULT 0 CHECK (has_private_bathroom IN (0, 1)),
  cooking_allowed INTEGER NOT NULL DEFAULT 0 CHECK (cooking_allowed IN (0, 1)),
  wifi_included INTEGER NOT NULL DEFAULT 0 CHECK (wifi_included IN (0, 1)),
  utilities_included INTEGER NOT NULL DEFAULT 0 CHECK (utilities_included IN (0, 1)),
  landlord_verified INTEGER NOT NULL DEFAULT 0 CHECK (landlord_verified IN (0, 1)),
  listing_posted_at TEXT,
  scraped_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  image_url TEXT,
  source_payload_json TEXT CHECK (source_payload_json IS NULL OR json_valid(source_payload_json)),
  note_tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(note_tags_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_platform, source_listing_id)
);

CREATE TABLE IF NOT EXISTS house_location_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_property_id INTEGER NOT NULL UNIQUE,
  nearest_mrt TEXT,
  walking_to_mrt_minutes INTEGER CHECK (walking_to_mrt_minutes >= 0),
  distance_to_mrt_km REAL CHECK (distance_to_mrt_km >= 0),
  bus_stop_walk_minutes INTEGER CHECK (bus_stop_walk_minutes >= 0),
  supermarket_walk_minutes INTEGER CHECK (supermarket_walk_minutes >= 0),
  hawker_walk_minutes INTEGER CHECK (hawker_walk_minutes >= 0),
  gym_walk_minutes INTEGER CHECK (gym_walk_minutes >= 0),
  clinic_walk_minutes INTEGER CHECK (clinic_walk_minutes >= 0),
  park_walk_minutes INTEGER CHECK (park_walk_minutes >= 0),
  gym_count_nearby INTEGER NOT NULL DEFAULT 0 CHECK (gym_count_nearby >= 0),
  food_options_nearby INTEGER NOT NULL DEFAULT 0 CHECK (food_options_nearby >= 0),
  supermarket_nearby INTEGER NOT NULL DEFAULT 0 CHECK (supermarket_nearby IN (0, 1)),
  clinic_nearby INTEGER NOT NULL DEFAULT 0 CHECK (clinic_nearby IN (0, 1)),
  park_nearby INTEGER NOT NULL DEFAULT 0 CHECK (park_nearby IN (0, 1)),
  quietness_level INTEGER CHECK (quietness_level BETWEEN 1 AND 10),
  safety_level INTEGER CHECK (safety_level BETWEEN 1 AND 10),
  convenience_level INTEGER CHECK (convenience_level BETWEEN 1 AND 10),
  FOREIGN KEY (house_property_id) REFERENCES house_properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS house_commute_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_property_id INTEGER NOT NULL,
  target_area TEXT NOT NULL,
  transport_mode TEXT NOT NULL,
  commute_minutes INTEGER NOT NULL CHECK (commute_minutes >= 0),
  monthly_transport_cost INTEGER CHECK (monthly_transport_cost >= 0),
  annual_commute_hours REAL CHECK (annual_commute_hours >= 0),
  distance_km REAL CHECK (distance_km >= 0),
  FOREIGN KEY (house_property_id) REFERENCES house_properties(id) ON DELETE CASCADE,
  UNIQUE (house_property_id, target_area, transport_mode)
);

CREATE TABLE IF NOT EXISTS house_analyse_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_property_id INTEGER NOT NULL,
  user_profile_id INTEGER NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  match_label TEXT NOT NULL,
  affordability_score INTEGER CHECK (affordability_score BETWEEN 0 AND 10),
  commute_score INTEGER CHECK (commute_score BETWEEN 0 AND 10),
  convenience_score INTEGER CHECK (convenience_score BETWEEN 0 AND 10),
  comfort_score INTEGER CHECK (comfort_score BETWEEN 0 AND 10),
  safety_score INTEGER CHECK (safety_score BETWEEN 0 AND 10),
  quietness_score INTEGER CHECK (quietness_score BETWEEN 0 AND 10),
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 10),
  estimated_commute_minutes INTEGER CHECK (estimated_commute_minutes >= 0),
  annual_commute_hours REAL CHECK (annual_commute_hours >= 0),
  monthly_transport_cost INTEGER CHECK (monthly_transport_cost >= 0),
  deal_breaker_hits_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(deal_breaker_hits_json)),
  reasons_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reasons_json)),
  tradeoffs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tradeoffs_json)),
  questions_for_agent_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(questions_for_agent_json)),
  recommendation_summary TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  analysed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (house_property_id) REFERENCES house_properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  UNIQUE (house_property_id, user_profile_id, model_name)
);

CREATE INDEX IF NOT EXISTS idx_house_properties_budget_area
  ON house_properties (area, rental_monthly);

CREATE INDEX IF NOT EXISTS idx_house_properties_source
  ON house_properties (source_platform, source_listing_id);

CREATE INDEX IF NOT EXISTS idx_house_commute_target
  ON house_commute_options (target_area, transport_mode, commute_minutes);

CREATE INDEX IF NOT EXISTS idx_house_analyse_user_score
  ON house_analyse_results (user_profile_id, overall_score DESC);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  rent INTEGER NOT NULL,
  mrt_walk INTEGER NOT NULL,
  food_score INTEGER NOT NULL,
  comfort_score INTEGER NOT NULL,
  accessibility_score INTEGER NOT NULL,
  aircon INTEGER NOT NULL DEFAULT 0,
  wifi INTEGER NOT NULL DEFAULT 0,
  cooking INTEGER NOT NULL DEFAULT 0,
  private_bath INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  notes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_commutes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  target_area TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE (room_id, target_area)
);