from unittest import TestCase, main
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from ecl27_winter_source import select_divisions


class WinterSourceTest(TestCase):
    def test_transfer_dates_come_from_invites_not_the_later_division_move(self):
        spec = spec_from_file_location("winter_transfers", Path(__file__).with_name("export-ecl27-winter-transfers.py"))
        module = module_from_spec(spec)
        spec.loader.exec_module(module)

        def entry(team, league, day, name, league_name, requested=None):
            return dict(playerID=4596, player_name="I-Jeppe-I", teamID=team, leagueID=league,
                        event_date=day, teamName=name, leagueName=league_name, requested=requested)

        history = [
            entry(6987, 508, "2026-04-21", "MRAZIX", "ECL '26 Spring Pro"),
            entry(4523, 535, "2026-11-15", "Refuse Too Lose", "ECL '27 Winter Registration", 542),
            entry(4523, 550, "2026-12-08", "Refuse Too Lose", "ECL '27 Winter Lite"),
        ]
        rows = module.build_rows(history, [{**history[1], "role": "Captain", "event_date": "2026-11-13"}], {535, 550})
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][1], "2026-11-15")
        self.assertEqual(rows[0][5:], (6987, "MRAZIX", "Pro", 508, 4523, "Refuse Too Lose", "Lite", 535))

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
