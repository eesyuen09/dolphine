INSERT OR IGNORE INTO listing_import_batches (id, source, source_uri, record_count, status, notes) VALUES
  (1, 'mixed-demo-market-scrape', 'backend/data/listings.json', 4, 'completed', 'Dummy normalized listings shaped like PropertyGuru and 99.co input.');

INSERT OR IGNORE INTO neighbourhoods (
  id, name, generated_by_model, source_listing_count, rent_benchmark_json, mrt_json,
  food_score, food_hawker_centres, food_supermarkets, food_convenience_stores_24h,
  food_restaurants_cafes_count, gym_score, activesg_gym, private_gyms_within_1km,
  nearest_gym_walk_minutes, parks_score, nearest_park, nearest_park_walk_minutes,
  has_large_park, healthcare_score, nearest_clinic_walk_minutes, nearest_hospital,
  nearest_hospital_minutes, quietness_score, noise_profile, area_type,
  lifestyle_tags_json, source_evidence_json
) VALUES
  ('queenstown', 'Queenstown', 'demo-neighbourhood-agent', 1, '{"common_room":{"min":950,"max":1500,"typical":1200},"master_room":{"min":1400,"max":1900,"typical":1650}}', '{"nearest_station":"Queenstown MRT","walk_minutes":5,"lines":["East-West Line"],"stations_within_10min":2}', 8, 2, 1, 2, 'many', 8, 1, 1, 7, 7, 'Queenstown Park', 8, 0, 8, 5, 'Alexandra Hospital', 10, 7, 'Residential estate with mature amenities and light road noise near main roads.', 'residential', '["mrt-accessible","hawker-nearby","gym-friendly","family-area"]', '["demo listing aggregate","manual hackathon estimate"]'),
  ('tiong_bahru', 'Tiong Bahru', 'demo-neighbourhood-agent', 1, '{"common_room":{"min":1200,"max":1700,"typical":1450},"master_room":{"min":1600,"max":2300,"typical":1900}}', '{"nearest_station":"Tiong Bahru MRT","walk_minutes":8,"lines":["East-West Line"],"stations_within_10min":1}', 10, 2, 2, 3, 'many', 8, 0, 3, 6, 6, 'Tiong Bahru Park', 12, 0, 8, 6, 'Singapore General Hospital', 8, 6, 'Mixed heritage estate with excellent food but more visitor and traffic activity.', 'mixed', '["hawker-nearby","expat-popular","premium","nightlife"]', '["demo listing aggregate","manual hackathon estimate"]'),
  ('clementi', 'Clementi', 'demo-neighbourhood-agent', 1, '{"common_room":{"min":850,"max":1300,"typical":1050},"master_room":{"min":1300,"max":1700,"typical":1500}}', '{"nearest_station":"Clementi MRT","walk_minutes":9,"lines":["East-West Line"],"stations_within_10min":1}', 8, 2, 2, 2, 'many', 6, 1, 1, 13, 8, 'Clementi Woods Park', 6, 1, 7, 9, 'National University Hospital', 12, 8, 'Student-friendly west-side residential town with quieter blocks away from the centre.', 'residential', '["student-friendly","budget-friendly","near-nature","quiet"]', '["demo listing aggregate","manual hackathon estimate"]'),
  ('paya_lebar', 'Paya Lebar', 'demo-neighbourhood-agent', 1, '{"common_room":{"min":1000,"max":1500,"typical":1250},"master_room":{"min":1500,"max":2100,"typical":1750}}', '{"nearest_station":"Paya Lebar MRT","walk_minutes":4,"lines":["East-West Line","Circle Line"],"stations_within_10min":2}', 9, 1, 2, 4, 'many', 7, 0, 3, 5, 5, 'Geylang East Park', 10, 0, 7, 5, 'Parkway East Hospital', 18, 5, 'Busy interchange district with strong transport and food access but less quietness.', 'commercial', '["mrt-accessible","hawker-nearby","nightlife","expat-popular"]', '["demo listing aggregate","manual hackathon estimate"]');

INSERT OR IGNORE INTO neighbourhood_commutes (neighbourhood_id, target_area, minutes, cost_sgd) VALUES
  ('queenstown', 'Kent Ridge', 10, 1.20), ('queenstown', 'Raffles Place', 18, 1.60), ('queenstown', 'Tanjong Pagar', 20, 1.60), ('queenstown', 'Orchard', 15, 1.40), ('queenstown', 'Jurong East', 25, 1.80), ('queenstown', 'Paya Lebar', 31, 2.00), ('queenstown', 'Woodlands', 45, 2.40), ('queenstown', 'Tampines', 40, 2.20), ('queenstown', 'Changi', 50, 2.60), ('queenstown', 'Novena', 22, 1.60),
  ('tiong_bahru', 'Kent Ridge', 21, 1.70), ('tiong_bahru', 'Raffles Place', 15, 1.30), ('tiong_bahru', 'Tanjong Pagar', 14, 1.20), ('tiong_bahru', 'Orchard', 18, 1.50), ('tiong_bahru', 'Jurong East', 31, 2.00), ('tiong_bahru', 'Paya Lebar', 28, 1.90), ('tiong_bahru', 'Woodlands', 52, 2.50), ('tiong_bahru', 'Tampines', 43, 2.30), ('tiong_bahru', 'Changi', 55, 2.70), ('tiong_bahru', 'Novena', 24, 1.60),
  ('clementi', 'Kent Ridge', 12, 1.20), ('clementi', 'Raffles Place', 32, 1.90), ('clementi', 'Tanjong Pagar', 34, 2.00), ('clementi', 'Orchard', 28, 1.80), ('clementi', 'Jurong East', 10, 1.20), ('clementi', 'Paya Lebar', 42, 2.30), ('clementi', 'Woodlands', 42, 2.30), ('clementi', 'Tampines', 55, 2.60), ('clementi', 'Changi', 65, 2.80), ('clementi', 'Novena', 35, 2.00),
  ('paya_lebar', 'Kent Ridge', 34, 2.10), ('paya_lebar', 'Raffles Place', 19, 1.50), ('paya_lebar', 'Tanjong Pagar', 22, 1.60), ('paya_lebar', 'Orchard', 24, 1.70), ('paya_lebar', 'Jurong East', 45, 2.40), ('paya_lebar', 'Paya Lebar', 4, 0.90), ('paya_lebar', 'Woodlands', 50, 2.50), ('paya_lebar', 'Tampines', 20, 1.50), ('paya_lebar', 'Changi', 34, 2.00), ('paya_lebar', 'Novena', 22, 1.60);

INSERT OR IGNORE INTO neighbourhood_aliases (alias, neighbourhood_id, match_method, confidence) VALUES
  ('Queenstown', 'queenstown', 'source_area', 1),
  ('Tiong Bahru', 'tiong_bahru', 'source_area', 1),
  ('Clementi', 'clementi', 'source_area', 1),
  ('Paya Lebar', 'paya_lebar', 'source_area', 1);

INSERT OR IGNORE INTO postal_to_neighbourhood (postal_prefix, neighbourhood_id, confidence) VALUES
  ('14', 'queenstown', 0.8),
  ('16', 'tiong_bahru', 0.75),
  ('12', 'clementi', 0.8),
  ('40', 'paya_lebar', 0.75);

INSERT OR IGNORE INTO listings (
  id, import_batch_id, source, source_listing_id, neighbourhood_id, address, postal_code,
  latitude, longitude, room_type, rent, currency, lease_term_months, available_from,
  aircon, wifi, cooking, private_bath, furnished, washing_machine, property_type,
  floor_level, facing, image_url, listing_url, posted_date, agent_name,
  is_direct_landlord, raw_payload_json
) VALUES
  ('99co-queenstown-18271', 1, '99.co', '99co-queenstown-18271', 'queenstown', 'Stirling Road, Queenstown', '141000', 1.2948, 103.8060, 'master_room', 1450, 'SGD', 12, '2026-07-01', 1, 1, 1, 1, 1, 1, 'HDB', 'mid', 'north', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80', 'https://www.99.co/singapore/rooms/property/queenstown-residences-room-18271', '2026-05-25', 'Demo Agent', 0, '{"source":"99.co","portalRentLabel":"S$1,450/mo","listingQuality":"complete"}'),
  ('pg-tiong-bahru-90812', 1, 'propertyguru', 'pg-tiong-bahru-90812', 'tiong_bahru', 'Seng Poh Road, Tiong Bahru', '168730', 1.2845, 103.8324, 'master_room', 1680, 'SGD', 12, '2026-06-20', 1, 1, 1, 1, 1, 1, 'Condo', 'high', 'east', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80', 'https://www.propertyguru.com.sg/listing/pg-tiong-bahru-90812', '2026-05-30', 'Demo Guru Agent', 0, '{"source":"propertyguru","portalRentLabel":"S$1,680/mo","listingQuality":"complete"}'),
  ('99co-clementi-44219', 1, '99.co', '99co-clementi-44219', 'clementi', 'Clementi Avenue 3', '120430', 1.3151, 103.7652, 'common_room', 1050, 'SGD', 6, '2026-07-10', 1, 1, 0, 0, 1, 1, 'HDB', 'low', 'south', 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80', 'https://www.99.co/singapore/rooms/property/clementi-avenue-room-44219', '2026-06-01', NULL, 1, '{"source":"99.co","portalRentLabel":"S$1,050/mo","listingQuality":"partial"}'),
  ('pg-paya-lebar-77102', 1, 'propertyguru', 'pg-paya-lebar-77102', 'paya_lebar', 'Paya Lebar Road', '409051', 1.3180, 103.8927, 'common_room', 1250, 'SGD', 12, '2026-06-18', 1, 1, 1, 0, 1, 1, 'Condo', 'mid', 'west', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 'https://www.propertyguru.com.sg/listing/pg-paya-lebar-77102', '2026-05-28', 'Demo PL Agent', 0, '{"source":"propertyguru","portalRentLabel":"S$1,250/mo","listingQuality":"complete"}');

INSERT OR IGNORE INTO user_profiles (
  id, display_name, workplace, country, budget_monthly, currency, office_days_per_week,
  working_days_json, transport_modes_json, priorities_json, deal_breakers_json,
  needs_private_bathroom, needs_aircon
) VALUES
  (
    1,
    'Kent Ridge Hybrid Tenant',
    'Kent Ridge',
    'Singapore',
    1500,
    'SGD',
    3,
    '["Monday","Wednesday","Friday"]',
    '["Public Transport","Cycling"]',
    '["Gym access","Quiet environment","Affordable food"]',
    '["Commute over 45 min","Rent above 1500","No MRT access","No supermarket nearby"]',
    1,
    1
  ),
  (
    2,
    'CBD Budget Tenant',
    'Raffles Place',
    'Singapore',
    1200,
    'SGD',
    5,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
    '["Public Transport"]',
    '["Affordable food","Quiet environment"]',
    '["Rent above 1200","Commute over 35 min"]',
    0,
    1
  );

INSERT OR IGNORE INTO recommendation_runs (
  id, user_profile_id, model_name, model_version, hard_filters_json,
  ranking_weights_json, candidate_count, filtered_out_count, status, summary,
  completed_at
) VALUES
  (
    1,
    1,
    'demo-two-stage-ranker',
    '2026-06-06',
    '{"max_rent":1500,"room_type":"common_room_or_master_room","requires_neighbourhood":true,"available_before":"2026-07-15"}',
    '{"neighbourhood_score":0.60,"budget_headroom_score":0.20,"feature_match_score":0.20}',
    3,
    1,
    'completed',
    'Ranked listings by joining normalized market listings with generated neighbourhood intelligence for a Kent Ridge profile.',
    '2026-06-06T10:00:00Z'
  );

INSERT OR IGNORE INTO neighbourhood_scoring_insights (
  recommendation_run_id, neighbourhood_id, neighbourhood_score, commute_score,
  rent_score, food_score, gym_score, quietness_score, healthcare_score,
  reasons_json, risks_json, insight_summary
) VALUES
  (1, 'queenstown', 90, 10, 7, 8, 8, 7, 8, '["Fast Kent Ridge commute","Strong MRT access","Good food and gym coverage"]', '["Rent can be close to the user budget"]', 'Queenstown is the strongest neighbourhood fit for the Kent Ridge profile.'),
  (1, 'clementi', 82, 9, 9, 8, 6, 8, 7, '["Lowest rent pressure","Short commute to Kent Ridge","Quiet student-friendly area"]', '["Some listings may have longer MRT walks"]', 'Clementi is a strong budget-conscious west-side fallback.'),
  (1, 'paya_lebar', 64, 5, 8, 9, 7, 5, 7, '["Excellent transport interchange","Good food access"]', '["Longer Kent Ridge commute","Less quiet environment"]', 'Paya Lebar is convenient generally but weaker for Kent Ridge-specific commuting.');

INSERT OR IGNORE INTO listing_scoring_insights (
  recommendation_run_id, listing_id, neighbourhood_id, rank, final_score,
  neighbourhood_score, budget_headroom_score, feature_match_score, affordability_score,
  commute_score, deal_breaker_hits_json, matched_must_haves_json,
  matched_nice_to_haves_json, reasons_json, tradeoffs_json,
  recommended_questions_json, insight_summary, confidence
) VALUES
  (1, '99co-queenstown-18271', 'queenstown', 1, 91, 90, 85, 96, 8, 10, '[]', '["aircon","private_bath","valid_neighbourhood"]', '["wifi","cooking","washing_machine"]', '["Under the stated budget","Private bathroom and aircon available","Strong neighbourhood intelligence fit"]', '["Close to budget ceiling"]', '["Confirm utilities split","Ask about household visitor rules"]', 'Best current match because the listing features align with the user requirements and Queenstown scores highly for Kent Ridge.', 0.88),
  (1, '99co-clementi-44219', 'clementi', 2, 74, 82, 100, 55, 10, 9, '["No private bathroom"]', '["aircon","valid_neighbourhood"]', '["wifi","washing_machine"]', '["Low rent","Strong Kent Ridge commute","Quiet neighbourhood"]', '["Shared bathroom","Cooking not allowed"]', '["Confirm bathroom sharing count","Ask whether light cooking is allowed"]', 'Good budget fallback, but it misses the private bathroom preference.', 0.76),
  (1, 'pg-paya-lebar-77102', 'paya_lebar', 3, 67, 64, 92, 72, 9, 5, '[]', '["aircon","valid_neighbourhood"]', '["wifi","cooking","washing_machine"]', '["Good rent","Excellent food and MRT access"]', '["Longer commute to Kent Ridge","No private bathroom"]', '["Verify room size","Confirm commute during preferred office hours"]', 'A decent general listing but less aligned with the Kent Ridge commute goal.', 0.72);

INSERT OR IGNORE INTO house_properties (
  id, source_platform, source_listing_id, listing_url, title, property_type, room_type,
  area, district, postal_code, address_text, latitude, longitude, rental_monthly, currency,
  deposit_months, available_from, lease_term_months, floor_area_sqft, bedrooms, bathrooms,
  floor_level, furnishing, tenant_type_allowed, has_aircon, has_private_bathroom,
  cooking_allowed, wifi_included, utilities_included, landlord_verified, listing_posted_at,
  scraped_at, image_url, source_payload_json, note_tags_json
) VALUES
  (
    1,
    '99.co',
    '99co-queenstown-18271',
    'https://www.99.co/singapore/rooms/property/queenstown-residences-room-18271',
    'Common Room at Queenstown Residences',
    'HDB',
    'Common Room',
    'Queenstown',
    'D03',
    '141000',
    'Near Queenstown MRT and Mei Ling Market',
    1.2948,
    103.8060,
    1450,
    'SGD',
    1,
    '2026-07-01',
    12,
    120,
    1,
    1,
    'Mid',
    'Fully furnished',
    'Single professional or student',
    1,
    1,
    1,
    1,
    0,
    1,
    '2026-05-25T09:00:00Z',
    '2026-06-06T09:30:00Z',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80',
    '{"portalRentLabel":"S$1,450/mo","agentName":"Demo Agent","listingQuality":"complete"}',
    '["Good MRT access","Mature estate","Strong food options"]'
  ),
  (
    2,
    'PropertyGuru',
    'pg-tiong-bahru-90812',
    'https://www.propertyguru.com.sg/listing/pg-tiong-bahru-90812',
    'Master Room near Tiong Bahru Market',
    'Condo',
    'Master Room',
    'Tiong Bahru',
    'D03',
    '168730',
    'Walkable to Tiong Bahru Market and MRT',
    1.2845,
    103.8324,
    1680,
    'SGD',
    1.5,
    '2026-06-20',
    12,
    180,
    1,
    1,
    'High',
    'Fully furnished',
    'Single professional',
    1,
    1,
    1,
    1,
    1,
    1,
    '2026-05-30T11:15:00Z',
    '2026-06-06T09:30:00Z',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80',
    '{"portalRentLabel":"S$1,680/mo","agentName":"Demo Guru Agent","listingQuality":"complete"}',
    '["Private bathroom","Excellent food access","Higher rent"]'
  ),
  (
    3,
    '99.co',
    '99co-clementi-44219',
    'https://www.99.co/singapore/rooms/property/clementi-avenue-room-44219',
    'Quiet Room at Clementi Avenue',
    'HDB',
    'Common Room',
    'Clementi',
    'D05',
    '120430',
    'Residential block near Clementi central',
    1.3151,
    103.7652,
    1050,
    'SGD',
    1,
    '2026-07-10',
    6,
    110,
    1,
    1,
    'Low',
    'Partially furnished',
    'Student or professional',
    1,
    0,
    0,
    1,
    0,
    0,
    '2026-06-01T08:20:00Z',
    '2026-06-06T09:30:00Z',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80',
    '{"portalRentLabel":"S$1,050/mo","agentName":"Demo Owner","listingQuality":"partial"}',
    '["Quiet estate","Good west-side commute","Shared bathroom"]'
  ),
  (
    4,
    'PropertyGuru',
    'pg-paya-lebar-77102',
    'https://www.propertyguru.com.sg/listing/pg-paya-lebar-77102',
    'Compact Room near Paya Lebar Quarter',
    'Condo',
    'Common Room',
    'Paya Lebar',
    'D14',
    '409051',
    'Near Paya Lebar MRT interchange',
    1.3180,
    103.8927,
    1250,
    'SGD',
    1,
    '2026-06-18',
    12,
    95,
    1,
    1,
    'Mid',
    'Fully furnished',
    'Single tenant only',
    1,
    0,
    1,
    1,
    0,
    1,
    '2026-05-28T14:40:00Z',
    '2026-06-06T09:30:00Z',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    '{"portalRentLabel":"S$1,250/mo","agentName":"Demo PL Agent","listingQuality":"complete"}',
    '["Interchange access","Strong food options","Compact room"]'
  );

INSERT OR IGNORE INTO house_location_metrics (
  house_property_id, nearest_mrt, walking_to_mrt_minutes, distance_to_mrt_km,
  bus_stop_walk_minutes, supermarket_walk_minutes, hawker_walk_minutes, gym_walk_minutes,
  clinic_walk_minutes, park_walk_minutes, gym_count_nearby, food_options_nearby,
  supermarket_nearby, clinic_nearby, park_nearby, quietness_level, safety_level,
  convenience_level
) VALUES
  (1, 'Queenstown MRT', 6, 0.45, 2, 5, 6, 9, 7, 8, 5, 18, 1, 1, 1, 7, 8, 9),
  (2, 'Tiong Bahru MRT', 9, 0.70, 3, 4, 3, 6, 6, 12, 8, 28, 1, 1, 0, 6, 8, 9),
  (3, 'Clementi MRT', 11, 0.90, 2, 8, 7, 13, 9, 6, 3, 16, 1, 1, 1, 8, 8, 7),
  (4, 'Paya Lebar MRT', 4, 0.30, 1, 3, 4, 5, 5, 10, 6, 24, 1, 1, 0, 5, 7, 9);

INSERT OR IGNORE INTO house_commute_options (
  house_property_id, target_area, transport_mode, commute_minutes, monthly_transport_cost,
  annual_commute_hours, distance_km
) VALUES
  (1, 'Kent Ridge', 'Public Transport', 18, 68, 156, 7.4),
  (1, 'Kent Ridge', 'Cycling', 26, 0, 225.3, 8.2),
  (1, 'Raffles Place', 'Public Transport', 18, 72, 156, 6.1),
  (2, 'Kent Ridge', 'Public Transport', 25, 78, 216.7, 9.8),
  (2, 'Raffles Place', 'Public Transport', 15, 70, 130, 4.2),
  (3, 'Kent Ridge', 'Public Transport', 16, 64, 138.7, 5.9),
  (3, 'Kent Ridge', 'Cycling', 24, 0, 208, 7.1),
  (3, 'Raffles Place', 'Public Transport', 32, 82, 277.3, 13.5),
  (4, 'Kent Ridge', 'Public Transport', 38, 88, 329.3, 17.2),
  (4, 'Raffles Place', 'Public Transport', 19, 72, 164.7, 7.6);

INSERT OR IGNORE INTO house_analyse_results (
  house_property_id, user_profile_id, model_name, model_version, overall_score, match_label,
  affordability_score, commute_score, convenience_score, comfort_score, safety_score,
  quietness_score, risk_score, estimated_commute_minutes, annual_commute_hours,
  monthly_transport_cost, deal_breaker_hits_json, reasons_json, tradeoffs_json,
  questions_for_agent_json, recommendation_summary, confidence
) VALUES
  (
    1,
    1,
    'demo-house-ranker',
    '2026-06-06',
    91,
    'Strong match',
    9,
    9,
    9,
    8,
    8,
    7,
    2,
    18,
    156,
    68,
    '[]',
    '["Within budget","Private bathroom and aircon available","Short Kent Ridge commute","Supermarket and MRT are nearby"]',
    '["Utilities are not included","Mid-floor HDB room rather than condo facilities"]',
    '["Confirm whether visitors are allowed","Confirm exact utility split"]',
    'Best balanced option for the Kent Ridge profile because it satisfies the key deal breakers while keeping commute and daily errands manageable.',
    0.88
  ),
  (
    2,
    1,
    'demo-house-ranker',
    '2026-06-06',
    74,
    'Comfort-led stretch',
    6,
    7,
    9,
    9,
    8,
    6,
    5,
    25,
    216.7,
    78,
    '["Rent above 1500"]',
    '["Private bathroom","Excellent nearby food","Verified listing metadata"]',
    '["Above stated budget","Longer MRT walk than Queenstown"]',
    '["Ask whether price is negotiable","Check if lease can start after July"]',
    'Worth considering only if the user can stretch budget for comfort and private bathroom certainty.',
    0.79
  ),
  (
    3,
    1,
    'demo-house-ranker',
    '2026-06-06',
    68,
    'Budget fallback',
    10,
    9,
    7,
    6,
    8,
    8,
    6,
    16,
    138.7,
    64,
    '["No private bathroom"]',
    '["Lowest rent","Quiet estate","Fast commute to Kent Ridge"]',
    '["Shared bathroom","Cooking not allowed","Longer MRT walk"]',
    '["Confirm bathroom sharing count","Check whether light cooking is allowed"]',
    'A practical fallback if budget becomes the top priority, but it misses the private bathroom requirement.',
    0.76
  ),
  (
    4,
    2,
    'demo-house-ranker',
    '2026-06-06',
    82,
    'CBD budget match',
    9,
    8,
    9,
    7,
    7,
    5,
    3,
    19,
    164.7,
    72,
    '["Rent above 1200"]',
    '["Fast commute to Raffles Place","Near MRT interchange","Strong food options"]',
    '["Slightly above budget","No private bathroom","Compact room"]',
    '["Ask if rent includes utilities","Verify room size in person"]',
    'Good commute and daily convenience for a CBD tenant, with a mild budget stretch.',
    0.81
  );

INSERT OR IGNORE INTO rooms (id, name, area, rent, mrt_walk, food_score, comfort_score, accessibility_score, aircon, wifi, cooking, private_bath, image, notes) VALUES
  (1, 'Common Room at Queenstown Residences', 'Queenstown', 1450, 6, 8, 8, 9, 1, 1, 1, 1, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80', 'Bright unit with strong MRT access, private bathroom, and food options around Mei Ling Market.'),
  (2, 'Master Room near Tiong Bahru Market', 'Tiong Bahru', 1680, 9, 10, 9, 7, 1, 1, 1, 1, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80', 'Premium comfort and excellent food access, but rent is higher and MRT walk is longer.'),
  (3, 'Quiet Room at Clementi Avenue', 'Clementi', 1050, 11, 8, 8, 7, 1, 1, 0, 0, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80', 'Comfortable and practical for Kent Ridge or west-side tenants, with a longer MRT walk.'),
  (4, 'Compact Room near Paya Lebar Quarter', 'Paya Lebar', 1250, 4, 9, 7, 9, 1, 1, 1, 0, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 'Strong all-rounder for CBD access, with convenient food and transport nearby.');

INSERT OR IGNORE INTO room_commutes (room_id, target_area, minutes) VALUES
  (1, 'Raffles Place', 18), (1, 'Buona Vista', 10), (1, 'Kent Ridge', 18), (1, 'Paya Lebar', 31),
  (2, 'Raffles Place', 15), (2, 'Buona Vista', 21), (2, 'Kent Ridge', 25), (2, 'Paya Lebar', 28),
  (3, 'Raffles Place', 32), (3, 'Buona Vista', 12), (3, 'Kent Ridge', 16), (3, 'Paya Lebar', 42),
  (4, 'Raffles Place', 19), (4, 'Buona Vista', 34), (4, 'Kent Ridge', 38), (4, 'Paya Lebar', 4);