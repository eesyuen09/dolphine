from types import SimpleNamespace
import unittest

from algorithm.src.agents.room_ranker import rank_rooms


def prefs(**overrides):
    defaults = {
        "workplace": None,
        "budget": 1200,
        "room_type": "common_room",
        "work_days_per_week": 5,
        "must_haves": ["wifi"],
        "nice_to_haves": [],
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def neighbourhood(nb_id, name, score):
    return {
        "id": nb_id,
        "name": name,
        "total_score": score,
        "commute": {},
    }


def listing(room_id, nb_id, rent, **overrides):
    data = {
        "id": room_id,
        "location": {"neighbourhood_id": nb_id},
        "listing": {
            "rent": rent,
            "room_type": "common_room",
            "available": True,
        },
        "amenities": {"wifi": True},
    }
    data.update(overrides)
    return data


class RoomRankerTest(unittest.TestCase):
    def test_top_neighbourhood_room_wins_over_higher_room_score_elsewhere(self):
        rooms, fallback = rank_rooms(
            [
                neighbourhood("top", "Top Area", 95),
                neighbourhood("second", "Second Area", 90),
            ],
            [
                listing("second-cheaper", "second", 700),
                listing("top-pricier", "top", 1190),
            ],
            prefs(),
        )

        self.assertEqual("top", rooms[0]["neighbourhood"]["id"])
        self.assertEqual("top-pricier", rooms[0]["id"])
        self.assertIsNone(fallback)

    def test_fallback_explains_when_top_neighbourhood_has_no_viable_rooms(self):
        rooms, fallback = rank_rooms(
            [
                neighbourhood("top", "Top Area", 95),
                neighbourhood("second", "Second Area", 90),
            ],
            [
                listing("top-over-budget", "top", 1300),
                listing("second-viable", "second", 900),
            ],
            prefs(),
        )

        self.assertEqual("second", rooms[0]["neighbourhood"]["id"])
        self.assertEqual("second-viable", rooms[0]["id"])
        self.assertIn("Top neighbourhood Top Area has no viable rooms", fallback)
        self.assertIn("next-best areas", fallback)


if __name__ == "__main__":
    unittest.main()
