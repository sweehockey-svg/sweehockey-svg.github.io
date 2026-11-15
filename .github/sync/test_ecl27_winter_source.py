from unittest import TestCase, main

from ecl27_winter_source import select_divisions


class WinterSourceTest(TestCase):
    def test_selects_only_named_official_divisions(self):
        rows = [
            {"leagueID": 535, "leagueName": "ECL '27 Winter Registration", "has_results": 0},
            {"leagueID": 507, "leagueName": "ECL '26 Spring Elite", "has_results": 1},
            {"leagueID": 545, "leagueName": "ECL '27 Winter Pro Qualifier", "has_results": 1},
            {"leagueID": 550, "leagueName": "ECL ’27: Winter - Elite", "has_results": 0},
            {"leagueID": 551, "leagueName": "ECL '27 Winter Pro", "has_results": 1},
        ]
        self.assertEqual(select_divisions(rows), {"Elite": (550, False), "Pro": (551, True)})

    def test_ambiguous_division_stops_instead_of_publishing_wrong_league(self):
        rows = [
            {"leagueID": n, "leagueName": "ECL '27 Winter Pro", "has_results": 0}
            for n in (550, 551)
        ]
        with self.assertRaises(RuntimeError):
            select_divisions(rows)


if __name__ == "__main__":
    main()
