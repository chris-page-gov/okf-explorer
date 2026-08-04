from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_impacted_heritage_evaluation as impacted  # noqa: E402


class ImpactedHeritageCheckTests(unittest.TestCase):
    def test_selectors_produce_ordered_bounded_commands(self) -> None:
        commands = impacted.selected_commands(
            '["synthetic","tiny"]',
            '["presentation","control"]',
        )
        self.assertEqual(2, len(commands))
        self.assertEqual("tiny", commands[0][commands[0].index("--fixture") + 1])
        self.assertEqual("synthetic", commands[1][commands[1].index("--fixture") + 1])
        self.assertEqual(
            ["control", "presentation"],
            [
                commands[0][index + 1]
                for index, value in enumerate(commands[0])
                if value == "--plane"
            ],
        )

    def test_empty_selection_is_a_noop_and_unknowns_fail_closed(self) -> None:
        self.assertEqual([], impacted.selected_commands("[]", "[]"))
        with self.assertRaisesRegex(ValueError, "unknown builder fixtures"):
            impacted.selected_commands('["mystery"]', "[]")
        with self.assertRaisesRegex(ValueError, "unknown builder planes"):
            impacted.selected_commands('["tiny"]', '["mystery"]')


if __name__ == "__main__":
    unittest.main()
