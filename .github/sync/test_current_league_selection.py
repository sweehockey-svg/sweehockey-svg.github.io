import ast
import pathlib
import re
import unittest
from types import SimpleNamespace


class CurrentLeagueSelection(unittest.TestCase):
    def test_running_regional_league_survives_newer_ids(self):
        source = ast.parse(pathlib.Path(__file__).with_name('export_current_swedish_player_stats.py').read_text(encoding='utf-8'))
        function = next(node for node in source.body if isinstance(node, ast.FunctionDef) and node.name == 'resolve_leagues')
        active = [{'leagueID': id, 'leagueName': name, 'activeLeague': 1} for id, name in
                  [(420, 'WECL 4'), (523, 'WECL 5'), (524, 'German Championship League 13 - Div I'),
                   (525, 'German Championship League 13 - Div II'), (526, 'German Championship League 13 - Pokal'),
                   (527, 'SCL 2027'), (529, 'FCL 2027'), (532, 'WV 4 Nations 2026')]]
        namespace = dict(Any=object, re=re, SELECTED_IDS=[], SELECTED_META=[], REQUESTED_IDS=[], RECENT_WINDOW=8,
                         CURRENT_NAME_RE=re.compile(r'\b(ECL|SCL|SEC|FCL|GCL|WECL|ROECL)\b|WORLD\s*CUP|\b4\s*NATIONS\b|CHAMPIONSHIP\s+LEAGUE', re.I),
                         base=SimpleNamespace(integer=lambda value: int(value or 0), select=lambda *args: active))
        exec(compile(ast.Module(body=[function], type_ignores=[]), '<selection>', 'exec'), namespace)
        self.assertEqual(namespace['resolve_leagues'](None), [523, 524, 525, 526, 527, 529, 532])


if __name__ == '__main__':
    unittest.main()
