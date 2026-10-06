import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "scl_ids", Path(__file__).with_name("prepare-scl-stat-player-ids.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PlayerIdsTest(unittest.TestCase):
    def collect(self, roster, matches):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            root = Path(directory)
            r, m = root / "roster.csv", root / "matches.csv"
            r.write_text(roster, encoding="utf-8")
            m.write_text(matches, encoding="utf-8")
            return module.collect_ids(r, m)

    def test_union_includes_former_players_and_deduplicates(self):
        self.assertEqual(self.collect(
            "sports_gamer_league_id,sports_gamer_player_id\n527,2\n527,1\n",
            "source_league_id,source_player_id\n527,2\n527,3\n527,3\n"), [1, 2, 3])

    def test_roster_only_before_first_match(self):
        self.assertEqual(self.collect(
            "sports_gamer_league_id,sports_gamer_player_id\n527,1\n",
            "source_league_id,source_player_id\n"), [1])

    def test_rejects_other_league(self):
        with self.assertRaises(ValueError):
            self.collect("sports_gamer_league_id,sports_gamer_player_id\n529,1\n",
                         "source_league_id,source_player_id\n")

    def test_rejects_empty_export(self):
        with self.assertRaises(ValueError):
            self.collect("sports_gamer_league_id,sports_gamer_player_id\n",
                         "source_league_id,source_player_id\n")

    def test_rejects_bad_schema(self):
        with self.assertRaises(ValueError):
            self.collect("player_id\n1\n", "source_league_id,source_player_id\n")


if __name__ == "__main__":
    unittest.main()
