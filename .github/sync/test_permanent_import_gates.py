"""Regression checks for permanent storage boundaries (not transient graphics)."""
from pathlib import Path
import unittest

SYNC = Path(__file__).resolve().parent


class PermanentImportGateTests(unittest.TestCase):
    def read(self, name):
        return (SYNC / name).read_text(encoding="utf-8")

    def test_every_permanent_import_gates_before_writes(self):
        targets = {
            "import-scl27-official-teams.psql": "insert into public.sportsgamer_league_roster_current",
            "import-broadcast-league-roster.psql": "insert into public.sportsgamer_league_roster_current",
            "import-fantasy-sportsgamer-pool.psql": "insert into public.ehockey_fantasy_player_pool",
            "import-fantasy-sportsgamer-match-stats.psql": "insert into public.ehockey_fantasy_match_player_stats",
            "import-swedish-player-stats.psql": "insert into public.sportsgamer_team_player_stats",
            "import-current-swedish-player-stats.psql": "insert into public.sportsgamer_team_player_stats",
        }
        for name, write in targets.items():
            with self.subTest(name=name):
                sql = self.read(name)
                include = ("\\ir filter-permanent-player-statistics.psql"
                           if name in ("import-swedish-player-stats.psql", "import-current-swedish-player-stats.psql")
                           else "\\ir permanent-player-scope.psql")
                self.assertLess(sql.index(include), sql.index(write))

    def test_images_and_registrations_do_not_establish_scope(self):
        sql = self.read("permanent-player-scope.psql")
        for forbidden in ("graphics_portrait", "self_profiles", "league_roster_current",
                          "player_cohort_cleanup_archive"):
            self.assertNotIn(forbidden, sql)
        self.assertIn("country_code in ('SE','NO','DK')", sql)
        self.assertIn("total_goalie_games,0)>0", sql)

    def test_old_sec_identity_and_merged_aliases_are_preserved(self):
        sql = self.read("permanent-player-scope.psql")
        self.assertIn("i.source_code='SEC'", sql)
        self.assertIn("'SEC:'||p.external_source||':'||p.external_player_id", sql)
        self.assertIn("with recursive seeds", sql)
        self.assertIn("merged_into_player_id", sql)

    def test_new_statistics_need_actual_sec_scl_play(self):
        sql = self.read("filter-permanent-player-statistics.psql")
        self.assertIn("^(SEC|SCL)([^A-Z]|$)", sql)
        for field in ("regular_skater_games", "playoff_skater_games",
                      "regular_goalie_games", "playoff_goalie_games",
                      "participant_regular_games", "participant_playoff_games"):
            self.assertIn(field, sql)
        self.assertNotIn("listed_in_roster", sql)
        self.assertIn('delete from :"player_stats_stage"', sql)
        self.assertNotIn("ehockey_player_nationality", sql)

    def test_foreign_match_rows_need_verified_scope_or_actual_scl_play(self):
        sql = self.read("import-fantasy-sportsgamer-match-stats.psql")
        self.assertIn("source_league_id in (520,527)", sql)
        self.assertIn("coalesce(skater_games,0)+coalesce(goalie_games,0)>0", sql)
        self.assertIn("delete from fantasy_match_player_stats_stage", sql)


if __name__ == "__main__":
    unittest.main()
