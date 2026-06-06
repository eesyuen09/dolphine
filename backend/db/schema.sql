PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS listing_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_uri TEXT,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  record_count INTEGER NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS neighbourhoods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generated_by_model TEXT,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_listing_count INTEGER NOT NULL DEFAULT 0 CHECK (source_listing_count >= 0),
  rent_benchmark_json TEXT NOT NULL CHECK (json_valid(rent_benchmark_json)),
  mrt_json TEXT NOT NULL CHECK (json_valid(mrt_json)),
  food_score INTEGER NOT NULL CHECK (food_score BETWEEN 0 AND 10),
  food_hawker_centres INTEGER NOT NULL DEFAULT 0 CHECK (food_hawker_centres >= 0),
  food_supermarkets INTEGER NOT NULL DEFAULT 0 CHECK (food_supermarkets >= 0),
  food_convenience_stores_24h INTEGER NOT NULL DEFAULT 0 CHECK (food_convenience_stores_24h >= 0),
  food_restaurants_cafes_count TEXT NOT NULL CHECK (food_restaurants_cafes_count IN ('few', 'some', 'many')),
  gym_score INTEGER NOT NULL CHECK (gym_score BETWEEN 0 AND 10),
  activesg_gym INTEGER NOT NULL DEFAULT 0 CHECK (activesg_gym IN (0, 1)),
  private_gyms_within_1km INTEGER NOT NULL DEFAULT 0 CHECK (private_gyms_within_1km >= 0),
  nearest_gym_walk_minutes INTEGER CHECK (nearest_gym_walk_minutes >= 0),
  parks_score INTEGER NOT NULL CHECK (parks_score BETWEEN 0 AND 10),
  nearest_park TEXT,
  nearest_park_walk_minutes INTEGER CHECK (nearest_park_walk_minutes >= 0),
  has_large_park INTEGER NOT NULL DEFAULT 0 CHECK (has_large_park IN (0, 1)),
  healthcare_score INTEGER NOT NULL CHECK (healthcare_score BETWEEN 0 AND 10),
  nearest_clinic_walk_minutes INTEGER CHECK (nearest_clinic_walk_minutes >= 0),
  nearest_hospital TEXT,
  nearest_hospital_minutes INTEGER CHECK (nearest_hospital_minutes >= 0),
  quietness_score INTEGER NOT NULL CHECK (quietness_score BETWEEN 0 AND 10),
  noise_profile TEXT NOT NULL,
  area_type TEXT NOT NULL CHECK (area_type IN ('residential', 'mixed', 'commercial', 'industrial-adjacent')),
  lifestyle_tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(lifestyle_tags_json)),
  source_evidence_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_evidence_json)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neighbourhood_commutes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  neighbourhood_id TEXT NOT NULL,
  target_area TEXT NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes >= 0),
  cost_sgd REAL NOT NULL CHECK (cost_sgd >= 0),
  FOREIGN KEY (neighbourhood_id) REFERENCES neighbourhoods(id) ON DELETE CASCADE,
  UNIQUE (neighbourhood_id, target_area)
);

CREATE TABLE IF NOT EXISTS neighbourhood_aliases (
  alias TEXT PRIMARY KEY,
  neighbourhood_id TEXT NOT NULL,
  match_method TEXT NOT NULL DEFAULT 'source_area' CHECK (match_method IN ('source_area', 'postal_prefix', 'geo_radius', 'manual')),
  confidence REAL NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  FOREIGN KEY (neighbourhood_id) REFERENCES neighbourhoods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS postal_to_neighbourhood (
  postal_prefix TEXT PRIMARY KEY,
  neighbourhood_id TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  FOREIGN KEY (neighbourhood_id) REFERENCES neighbourhoods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  import_batch_id INTEGER,
  source TEXT NOT NULL,
  source_listing_id TEXT NOT NULL,
  neighbourhood_id TEXT,
  address TEXT,
  postal_code TEXT,
  latitude REAL,
  longitude REAL,
  room_type TEXT NOT NULL CHECK (room_type IN ('common_room', 'master_room')),
  rent INTEGER NOT NULL CHECK (rent > 0),
  currency TEXT NOT NULL DEFAULT 'SGD',
  lease_term_months INTEGER CHECK (lease_term_months IS NULL OR lease_term_months > 0),
  available_from TEXT,
  aircon INTEGER CHECK (aircon IS NULL OR aircon IN (0, 1)),
  wifi INTEGER CHECK (wifi IS NULL OR wifi IN (0, 1)),
  cooking INTEGER CHECK (cooking IS NULL OR cooking IN (0, 1)),
  private_bath INTEGER CHECK (private_bath IS NULL OR private_bath IN (0, 1)),
  furnished INTEGER CHECK (furnished IS NULL OR furnished IN (0, 1)),
  washing_machine INTEGER CHECK (washing_machine IS NULL OR washing_machine IN (0, 1)),
  property_type TEXT,
  floor_level TEXT,
  facing TEXT,
  image_url TEXT,
  listing_url TEXT,
  posted_date TEXT,
  agent_name TEXT,
  is_direct_landlord INTEGER CHECK (is_direct_landlord IS NULL OR is_direct_landlord IN (0, 1)),
  raw_payload_json TEXT NOT NULL CHECK (json_valid(raw_payload_json)),
  normalized_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_batch_id) REFERENCES listing_import_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (neighbourhood_id) REFERENCES neighbourhoods(id) ON DELETE SET NULL,
  UNIQUE (source, source_listing_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  workplace TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Singapore',
  budget_monthly INTEGER NOT NULL CHECK (budget_monthly > 0),
  currency TEXT NOT NULL DEFAULT 'SGD',
  preferred_room_type TEXT CHECK (preferred_room_type IS NULL OR preferred_room_type IN ('common_room', 'master_room')),
  preferred_available_from TEXT,
  office_days_per_week INTEGER NOT NULL CHECK (office_days_per_week BETWEEN 0 AND 7),
  working_days_json TEXT NOT NULL CHECK (json_valid(working_days_json)),
  transport_modes_json TEXT NOT NULL CHECK (json_valid(transport_modes_json)),
  priorities_json TEXT NOT NULL CHECK (json_valid(priorities_json)),
  deal_breakers_json TEXT NOT NULL CHECK (json_valid(deal_breakers_json)),
  must_haves_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(must_haves_json)),
  nice_to_haves_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(nice_to_haves_json)),
  needs_private_bathroom INTEGER CHECK (needs_private_bathroom IN (0, 1)),
  needs_aircon INTEGER CHECK (needs_aircon IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_profile_id INTEGER NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT,
  scoring_strategy TEXT NOT NULL DEFAULT 'two_stage_filter_rank',
  hard_filters_json TEXT NOT NULL CHECK (json_valid(hard_filters_json)),
  ranking_weights_json TEXT NOT NULL CHECK (json_valid(ranking_weights_json)),
  candidate_count INTEGER NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  filtered_out_count INTEGER NOT NULL DEFAULT 0 CHECK (filtered_out_count >= 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  summary TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS neighbourhood_scoring_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation_run_id INTEGER NOT NULL,
  neighbourhood_id TEXT NOT NULL,
  neighbourhood_score INTEGER NOT NULL CHECK (neighbourhood_score BETWEEN 0 AND 100),
  commute_score INTEGER CHECK (commute_score BETWEEN 0 AND 10),
  rent_score INTEGER CHECK (rent_score BETWEEN 0 AND 10),
  food_score INTEGER CHECK (food_score BETWEEN 0 AND 10),
  gym_score INTEGER CHECK (gym_score BETWEEN 0 AND 10),
  quietness_score INTEGER CHECK (quietness_score BETWEEN 0 AND 10),
  healthcare_score INTEGER CHECK (healthcare_score BETWEEN 0 AND 10),
  reasons_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reasons_json)),
  risks_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(risks_json)),
  insight_summary TEXT NOT NULL,
  FOREIGN KEY (recommendation_run_id) REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (neighbourhood_id) REFERENCES neighbourhoods(id) ON DELETE CASCADE,
  UNIQUE (recommendation_run_id, neighbourhood_id)
);

CREATE TABLE IF NOT EXISTS listing_scoring_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation_run_id INTEGER NOT NULL,
  listing_id TEXT NOT NULL,
  neighbourhood_id TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  final_score INTEGER NOT NULL CHECK (final_score BETWEEN 0 AND 100),
  neighbourhood_score INTEGER NOT NULL CHECK (neighbourhood_score BETWEEN 0 AND 100),
  budget_headroom_score INTEGER NOT NULL CHECK (budget_headroom_score BETWEEN 0 AND 100),
  feature_match_score INTEGER NOT NULL CHECK (feature_match_score BETWEEN 0 AND 100),
  affordability_score INTEGER CHECK (affordability_score BETWEEN 0 AND 10),
  commute_score INTEGER CHECK (commute_score BETWEEN 0 AND 10),
  deal_breaker_hits_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(deal_breaker_hits_json)),
  matched_must_haves_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(matched_must_haves_json)),
  matched_nice_to_haves_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(matched_nice_to_haves_json)),
  reasons_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reasons_json)),
  tradeoffs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tradeoffs_json)),
  recommended_questions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(recommended_questions_json)),
  insight_summary TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recommendation_run_id) REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (neighbourhood_id) REFERENCES neighbourhoods(id) ON DELETE CASCADE,
  UNIQUE (recommendation_run_id, listing_id),
  UNIQUE (recommendation_run_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_listings_filter
  ON listings (room_type, rent, neighbourhood_id, available_from);

CREATE INDEX IF NOT EXISTS idx_listings_source
  ON listings (source, source_listing_id);

CREATE INDEX IF NOT EXISTS idx_neighbourhood_commutes_target
  ON neighbourhood_commutes (target_area, minutes);

CREATE INDEX IF NOT EXISTS idx_recommendation_runs_user
  ON recommendation_runs (user_profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_scoring_run_rank
  ON listing_scoring_insights (recommendation_run_id, rank);

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