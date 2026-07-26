from __future__ import annotations

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "apps" / "okf-explorer" / "package.json"
CITATION = ROOT / "CITATION.cff"
CHANGELOG = ROOT / "CHANGELOG.md"


class ReleaseMetadataTest(unittest.TestCase):
    def test_v050_release_metadata_is_synchronized(self) -> None:
        package_version = json.loads(PACKAGE.read_text(encoding="utf-8"))["version"]
        citation = CITATION.read_text(encoding="utf-8")
        changelog = CHANGELOG.read_text(encoding="utf-8")

        self.assertEqual("0.5.0", package_version)
        self.assertEqual(
            [package_version, package_version],
            re.findall(r"^\s*version:\s*\"([^\"]+)\"\s*$", citation, re.MULTILINE),
        )
        self.assertEqual(
            ["2026-07-26", "2026-07-26"],
            re.findall(
                r"^\s*date-released:\s*\"([^\"]+)\"\s*$",
                citation,
                re.MULTILINE,
            ),
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.0 - 2026-07-26 - \S",
        )
        self.assertNotIn("## v0.5.0 - Unreleased", changelog)


if __name__ == "__main__":
    unittest.main()
