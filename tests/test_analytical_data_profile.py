"""Contract checks for the opt-in analytical CSV profile."""

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "profiles/analytical-data/v1/example"
sys.path.insert(0, str(ROOT / "scripts"))

import check_analytical_data as analytical


class AnalyticalDataProfileTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.package = Path(tmp.name) / "example"
        shutil.copytree(EXAMPLE, self.package)
        self.path = self.package / analytical.MANIFEST
        self.manifest = json.loads(self.path.read_bytes())
        self.table = self.manifest["tables"][0]
        self.data = self.package / self.table["path"]

    def save(self):
        self.path.write_text(json.dumps(self.manifest), encoding="utf-8")

    def data_change(self, before, after):
        raw = self.data.read_bytes().replace(before, after, 1)
        self.data.write_bytes(raw)
        self.table["sha256"] = hashlib.sha256(raw).hexdigest()
        self.save()

    def test_exact_candidate_receipt_distinguishes_zero_and_states(self):
        result = analytical.validate_package(self.package)
        self.assertEqual(result["validatedProfile"], analytical.PROFILE)
        self.assertEqual(result["profileVersion"], "1.0.0-rc.1")
        self.assertEqual(result["profileStatus"], "candidate")
        self.assertEqual(
            result["manifestSha256"], hashlib.sha256(self.path.read_bytes()).hexdigest()
        )
        self.assertEqual(result["tables"][0]["trueNumericZeroes"], 1)
        self.assertEqual(
            result["tables"][0]["valueStates"], {"roundedToZero": 1, "suppressed": 1}
        )

    def test_additional_profiles_stay_unevaluated(self):
        other = "https://example.org/profile/other/v1/"
        self.manifest["conformsTo"].append(other)
        self.save()
        result = analytical.validate_package(self.package)
        self.assertEqual(result["unevaluatedProfiles"], [other])

    def test_requires_exact_profile_and_version(self):
        for key, value in (
            ("conformsTo", [analytical.PROFILE.replace("/v1/", "/v2/")]),
            ("profileVersion", "2.0.0"),
        ):
            with self.subTest(key=key):
                self.manifest = json.loads((EXAMPLE / analytical.MANIFEST).read_bytes())
                self.manifest[key] = value
                self.save()
                with self.assertRaisesRegex(ValueError, "Manifest"):
                    analytical.validate_package(self.package)

    def test_changed_bytes_fail_before_interpretation(self):
        self.data.write_bytes(self.data.read_bytes() + b"\n")
        with self.assertRaisesRegex(ValueError, "digest mismatch"):
            analytical.validate_package(self.package)

    def test_header_is_exact(self):
        self.data_change(b"area_code,", b"Area_Code,")
        with self.assertRaisesRegex(ValueError, "ordered field declarations"):
            analytical.validate_package(self.package)

    def test_special_token_cannot_hide_a_typed_zero(self):
        self.table["fields"][-1]["valueStates"].append(
            {"token": "0", "state": "suppressed"}
        )
        self.save()
        with self.assertRaisesRegex(ValueError, "shadows a typed value"):
            analytical.validate_package(self.package)

    def test_duplicate_observations_use_typed_key_identity(self):
        self.data_change(b"EXAMPLE_B,2026", b"EXAMPLE_A,02026")
        with self.assertRaisesRegex(ValueError, "Duplicate observation key"):
            analytical.validate_package(self.package)

    def test_empty_value_requires_a_declaration(self):
        self.data_change(b"EXAMPLE_A,2026,0", b"EXAMPLE_A,2026,")
        with self.assertRaisesRegex(ValueError, "Blank value requires"):
            analytical.validate_package(self.package)

    def test_invalid_value_and_vocabulary(self):
        self.data_change(b"EXAMPLE_A,2026,0", b"EXAMPLE_A,2026,1.25")
        with self.assertRaisesRegex(ValueError, "Expected integer"):
            analytical.validate_package(self.package)
        self.data_change(b"EXAMPLE_A,2026,1.25", b"EXAMPLE_Z,2026,0")
        self.table["fields"][0]["allowedValues"] = ["EXAMPLE_A"]
        self.save()
        with self.assertRaisesRegex(ValueError, "outside the declared vocabulary"):
            analytical.validate_package(self.package)

    def test_rejects_external_paths_and_credentialled_sources(self):
        self.table["path"] = "../outside.csv"
        self.save()
        with self.assertRaisesRegex(ValueError, "unsafe repository-relative path"):
            analytical.validate_package(self.package)
        self.table["source"]["url"] = "https://user@example.org/observations"
        self.save()
        with self.assertRaisesRegex(ValueError, "failed format"):
            analytical.validate_package(self.package)

    def test_rejects_control_characters_and_invalid_observation_time(self):
        self.table["fields"][0]["name"] = "area_code\n"
        self.save()
        with self.assertRaisesRegex(ValueError, "failed pattern"):
            analytical.validate_package(self.package)
        self.table["fields"][0]["name"] = "area_code"
        self.table["source"]["observedAt"] = "2026-11-31T12:00:00Z"
        self.save()
        with self.assertRaisesRegex(ValueError, "failed format"):
            analytical.validate_package(self.package)

    def test_resource_limit_is_unassessed(self):
        with (
            patch.object(analytical, "MAX_ROWS", 1),
            self.assertRaises(analytical.ArtifactReadError),
        ):
            analytical.validate_package(self.package)
