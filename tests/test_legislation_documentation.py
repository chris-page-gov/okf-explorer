from __future__ import annotations

import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs" / "uk-legislation"
ASSETS = ROOT / "docs" / "assets" / "uk-legislation-manual"


class LegislationDocumentationTest(unittest.TestCase):
    def test_documentation_spine_is_complete(self) -> None:
        expected = {
            "index.md",
            "getting-started.md",
            "personas-and-user-journeys.md",
            "illustrated-manual.md",
            "agent-research-guide.md",
            "evaluation-and-quality.md",
            "maintenance.md",
        }
        self.assertEqual(expected, {path.name for path in DOCS.glob("*.md")})

        index = (DOCS / "index.md").read_text(encoding="utf-8")
        for filename in sorted(expected - {"index.md"}):
            self.assertIn(f"({filename})", index)

    def test_personas_and_user_journeys_cover_legal_and_maintenance_roles(self) -> None:
        document = (DOCS / "personas-and-user-journeys.md").read_text(encoding="utf-8")
        for persona in (
            "Barrister",
            "Pupil barrister or paralegal",
            "Policy researcher",
            "Legislative data engineer",
            "Knowledge curator",
            "AI operator or evaluator",
        ):
            self.assertIn(persona, document)
        for journey in range(1, 7):
            self.assertIn(f"### J{journey}", document)

    def test_illustrations_have_reproducible_manifest_and_manual_links(self) -> None:
        manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual("okf-explorer-illustrated-manual.v1", manifest["schema"])
        self.assertEqual({"overview", "search-human-rights-act", "legal-work-provenance", "live-provision-tree"}, {item["id"] for item in manifest["items"]})
        manual = (DOCS / "illustrated-manual.md").read_text(encoding="utf-8")
        for item in manifest["items"]:
            image = ASSETS / item["image"]
            self.assertTrue(image.is_file(), item["image"])
            self.assertGreater(image.stat().st_size, 20_000, item["image"])
            self.assertTrue(image.read_bytes().startswith(b"\xff\xd8\xff"), item["image"])
            self.assertTrue(item["route"].startswith("https://chris-page-gov.github.io/ai-infrastructure-wiki/next/"))
            self.assertTrue(item["expected_text"])
            self.assertIn(f"../assets/uk-legislation-manual/{item['image']}", manual)

    def test_readme_promotes_legislation_in_opening_examples(self) -> None:
        opening = (ROOT / "README.md").read_text(encoding="utf-8").split("## Read Locally", 1)[0]
        self.assertIn("| UK Legislation OKF |", opening)
        self.assertIn("[Documentation spine][legislation-docs]", opening)
        self.assertIn("[legislation-manual]", opening)


if __name__ == "__main__":
    unittest.main()
