import unittest
from pathlib import Path

from scripts.check_british_english import scan_text


class BritishEnglishCheckTests(unittest.TestCase):
    def test_flags_high_confidence_american_prose(self) -> None:
        findings = scan_text(
            Path("guide.md"),
            "The organization analyzed normalized artifacts.\n",
        )

        self.assertEqual(
            [(finding.found, finding.preferred) for finding in findings],
            [
                ("organization", "organisation"),
                ("analyzed", "analysed"),
                ("normalized", "normalised"),
                ("artifacts", "artefacts"),
            ],
        )

    def test_preserves_code_urls_and_official_titles(self) -> None:
        text = """Use `normalized_artifact` and [artefact](https://example.org/artifact).

```json
{"status": "normalized", "artifact": true}
```

Read Simple Knowledge Organization System and Artifact attestations.
"""

        self.assertEqual(scan_text(Path("guide.md"), text), [])

    def test_flags_likely_noun_license_but_not_clear_verb(self) -> None:
        findings = scan_text(
            Path("guide.md"),
            "Use an open license. A provider can license the data.\n",
        )

        self.assertEqual(
            [(finding.found, finding.preferred) for finding in findings],
            [("license", "licence (noun)")],
        )


if __name__ == "__main__":
    unittest.main()
