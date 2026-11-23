from __future__ import annotations

import subprocess
import sys
import unittest

import soupsieve
from bs4 import BeautifulSoup
from soupsieve import SelectorSyntaxError


class PythonDependencySecurityTests(unittest.TestCase):
    def test_soupsieve_security_floor_is_resolved(self) -> None:
        version = tuple(int(part) for part in soupsieve.__version__.split(".")[:3])
        self.assertGreaterEqual(version, (4, 0, 0))

    def test_reported_selector_resource_exhaustion_inputs_are_bounded(self) -> None:
        scripts = {
            "regex_escape": r"import soupsieve as s; s.compile('[a' + '\\9' * 26 + '=x]')",
            "nested_pseudo": "import soupsieve as s; n=330; s.compile(':is(' * n + 'a' + ')' * n)",
            "deep_descendants": (
                "from bs4 import BeautifulSoup; import soupsieve as s; "
                "n=200; soup=BeautifulSoup('<div>'*n+'</div>'*n, 'html.parser'); "
                "assert s.select('section div div div', soup)==[]"
            ),
        }
        for name, script in scripts.items():
            with self.subTest(name=name):
                result = subprocess.run(
                    [sys.executable, "-c", script],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_complex_sibling_has_trigger_is_rejected_and_basic_selectors_work(self) -> None:
        with self.assertRaises(SelectorSyntaxError):
            soupsieve.compile("div:has(a ~ b)")

        soup = BeautifulSoup(
            '<main><article class="featured" data-kind="report"><h1>Report</h1>'
            '</article><article><h1>Other</h1></article></main>',
            "html.parser",
        )
        self.assertEqual(
            len(soupsieve.select("main > article.featured[data-kind='report'] h1", soup)),
            1,
        )
        self.assertEqual(
            soupsieve.select_one("article:has(> h1)", soup).get("class"),
            ["featured"],
        )
        self.assertEqual(
            [node.get_text() for node in soupsieve.select("article + article h1", soup)],
            ["Other"],
        )


if __name__ == "__main__":
    unittest.main()
