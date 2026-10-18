import ast
import unittest
from pathlib import Path
from typing import Any

tree = ast.parse(Path(__file__).with_name("export_swedish_player_stats.py").read_text(encoding="utf-8"))
functions = ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ("number", "goalie_rates")], type_ignores=[])
scope = {"Any": Any}
exec(compile(functions, "<goalie-rates>", "exec"), scope)
rates = scope["goalie_rates"]

class GoalieRatesTests(unittest.TestCase):
    def test_public_sportsgamer_example(self):
        self.assertEqual(rates(77, 25, 6), (0.7549, 4.1667))
    def test_zero_saves_and_shutout(self):
        self.assertEqual(rates(0, 3, 1), (0.0, 3.0))
        self.assertEqual(rates(20, 0, 1), (1.0, 0.0))
    def test_no_games_or_no_shots(self):
        self.assertEqual(rates(0, 0, 0), (None, None))
        self.assertEqual(rates(0, 0, 1), (None, 0.0))
    def test_strings(self):
        self.assertEqual(rates("77", "25", "6"), (0.7549, 4.1667))

if __name__ == "__main__":
    unittest.main()
