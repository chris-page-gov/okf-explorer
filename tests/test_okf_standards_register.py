from __future__ import annotations

import json
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
from shutil import copyfile

from scripts.check_okf_standards_register import check_register


ROOT = Path(__file__).resolve().parents[1]


class TestOkfStandardsRegister(unittest.TestCase):
    def test_repository_register_and_catalogue_links_pass(self) -> None:
        self.assertEqual(check_register(ROOT), [])

    def test_public_source_producer_requires_confirmed_public_visibility(self) -> None:
        register = json.loads((ROOT / "registry/okf-standards.json").read_text())
        register["reviewed_public_producer_sources"][0]["visibility"] = "private"
        access = json.loads((ROOT / "registry/public-bundle-access.json").read_text())
        with patch("scripts.check_okf_standards_register.load_json", side_effect=[register, access]):
            self.assertIn(
                "Public producer source must have public visibility and a pinned owned source reference",
                check_register(ROOT),
            )

    def test_unpinned_historical_reference_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for relative in (
                "registry/okf-standards.json",
                "registry/public-bundle-access.json",
            ):
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                copyfile(ROOT / relative, destination)
            for relative in (
                "registry/public-bundle-access.json",
                "docs/evidence/okf-public-owner-candidates-2026-11-23.json",
            ):
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                copyfile(ROOT / relative, destination)
            register_path = root / "registry/okf-standards.json"
            register = json.loads(register_path.read_text(encoding="utf-8"))
            next(item for item in register["historical_core"] if item["version"] == "0.1")["pinned_commit"] = None
            register_path.write_text(json.dumps(register), encoding="utf-8")
            errors = check_register(root)
            self.assertTrue(any("OKF 0.1" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
