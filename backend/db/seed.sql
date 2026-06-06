INSERT INTO rooms (id, name, area, rent, mrt_walk, food_score, comfort_score, accessibility_score, aircon, wifi, cooking, private_bath, image, notes) VALUES
  (1, 'Common Room at Queenstown Residences', 'Queenstown', 1180, 5, 8, 8, 9, 1, 1, 1, 0, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80', 'Bright unit with strong MRT access, fair rent, and food options around Mei Ling Market.'),
  (2, 'Master Room near Tiong Bahru Market', 'Tiong Bahru', 1680, 9, 10, 9, 7, 1, 1, 1, 1, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80', 'Premium comfort and excellent food access, but rent is higher and MRT walk is longer.'),
  (3, 'Budget Room beside Aljunied MRT', 'Aljunied', 850, 3, 9, 5, 8, 0, 1, 0, 0, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80', 'Very affordable and close to MRT, best for users who can compromise on comfort.'),
  (4, 'Quiet Room at Clementi Avenue', 'Clementi', 1050, 11, 8, 8, 7, 1, 1, 0, 0, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80', 'Comfortable and practical for Buona Vista or west-side tenants, with a longer MRT walk.'),
  (5, 'Compact Room near Paya Lebar Quarter', 'Paya Lebar', 1250, 4, 9, 7, 9, 1, 1, 1, 0, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 'Strong all-rounder for east-side access, with convenient food and transport nearby.');

INSERT INTO room_commutes (room_id, target_area, minutes) VALUES
  (1, 'Raffles Place', 18), (1, 'Buona Vista', 10), (1, 'Tanjong Pagar', 20), (1, 'Paya Lebar', 31),
  (2, 'Raffles Place', 15), (2, 'Buona Vista', 21), (2, 'Tanjong Pagar', 14), (2, 'Paya Lebar', 28),
  (3, 'Raffles Place', 22), (3, 'Buona Vista', 35), (3, 'Tanjong Pagar', 25), (3, 'Paya Lebar', 8),
  (4, 'Raffles Place', 32), (4, 'Buona Vista', 12), (4, 'Tanjong Pagar', 34), (4, 'Paya Lebar', 42),
  (5, 'Raffles Place', 19), (5, 'Buona Vista', 34), (5, 'Tanjong Pagar', 22), (5, 'Paya Lebar', 4);