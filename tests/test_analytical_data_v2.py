"""Challenge the additive datetime/spatial candidate without changing RC.1."""

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_analytical_data_v2 as candidate

EXAMPLE = ROOT / "profiles/analytical-data/v2/examples/library-observations"
VECTORS = json.loads(
    (ROOT / "profiles/analytical-data/v2/conformance-vectors.json").read_text()
)


class AnalyticalV2Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.manifest = json.loads((EXAMPLE / candidate.MANIFEST).read_text())
        self.body = (EXAMPLE / "observations.csv").read_bytes()

    def validate(self):
        self.manifest["tables"][0]["sha256"] = hashlib.sha256(self.body).hexdigest()
        (self.root / "observations.csv").write_bytes(self.body)
        (self.root / candidate.MANIFEST).write_text(json.dumps(self.manifest))
        return candidate.validate_package(self.root)

    def test_synthetic_example_preserves_zero_states_and_datum_gap(self):
        result = self.validate()["tables"][0]
        self.assertEqual(result["rows"], 2)
        self.assertEqual(result["trueNumericZeroes"], 1)
        self.assertEqual(result["valueStates"], {"suppressed": 1})
        self.assertEqual(result["spatial"]["gaps"], ["Vertical datum is not recorded"])
        self.assertEqual((self.root / "observations.csv").read_bytes(), self.body)

    def test_shared_datetime_vectors(self):
        for row in VECTORS["datetime"]:
            with self.subTest(literal=row["literal"]):
                if row["valid"]:
                    candidate.datetime_instant(row["literal"])
                else:
                    with self.assertRaises(ValueError):
                        candidate.datetime_instant(row["literal"])

    def test_equal_instants_and_nanosecond_distinction(self):
        a, b = VECTORS["equivalent_instants"]
        self.assertEqual(candidate.datetime_instant(a), candidate.datetime_instant(b))
        a, b = VECTORS["distinct_instants"]
        self.assertEqual(
            candidate.datetime_instant(b) - candidate.datetime_instant(a), 1
        )

    def test_datetime_key_equivalence_rejects_offset_duplicates(self):
        self.body = self.body.replace(
            b"North,2026-11-14T10:00:00.000000001Z", b"North,2026-11-14T10:00:00Z"
        ).replace(b"South,", b"North,")
        with self.assertRaisesRegex(ValueError, "Duplicate observation key"):
            self.validate()

    def test_unknown_offset_metadata_is_rejected(self):
        self.manifest["tables"][0]["source"]["observedAt"] = "2026-11-14T22:00:00-00:00"
        with self.assertRaises(ValueError):
            self.validate()

    def test_crs_axis_and_unit_mismatches_are_rejected(self):
        for key, value in [
            ("axes", ["latitude", "longitude"]),
            ("unit", "metre"),
            ("crs", "http://example.invalid/unknown-crs"),
        ]:
            with self.subTest(key=key):
                original = self.manifest["tables"][0]["spatial"][key]
                self.manifest["tables"][0]["spatial"][key] = value
                with self.assertRaises(ValueError):
                    self.validate()
                self.manifest["tables"][0]["spatial"][key] = original

    def test_coordinate_field_units_are_checked(self):
        self.manifest["tables"][0]["fields"][2]["unit"] = "metre"
        with self.assertRaisesRegex(ValueError, "incompatible units"):
            self.validate()

    def test_extent_order_domain_and_precision_are_checked(self):
        for extent in [
            ["0", "51", "-2", "53"],
            ["-181", "51", "0", "53"],
            ["-1.499999999999999999999", "51", "0", "53"],
        ]:
            with self.subTest(extent=extent):
                self.manifest["tables"][0]["spatial"]["extent"] = extent
                with self.assertRaises(ValueError):
                    self.validate()

    def test_both_coordinate_states_are_explicit_but_partial_pair_fails(self):
        for field in self.manifest["tables"][0]["fields"][2:4]:
            field["valueStates"] = [{"token": "", "state": "notAvailable"}]
        original = self.body
        self.body = original.replace(b"-1.5,52.2", b",")
        self.assertEqual(
            self.validate()["tables"][0]["spatial"]["missingCoordinatePairs"], 1
        )
        self.body = original.replace(b"-1.5,52.2", b",52.2")
        with self.assertRaisesRegex(ValueError, "partial coordinate pair"):
            self.validate()

    def test_declared_vertical_datum_requires_a_safe_source(self):
        vertical = self.manifest["tables"][0]["spatial"]["vertical"]
        vertical.update(datumStatus="declared", datum="file:///private/source")
        with self.assertRaises(ValueError):
            self.validate()
        vertical["datum"] = "https://example.invalid/declared-datum"
        self.assertEqual(self.validate()["tables"][0]["spatial"]["gaps"], [])

    def test_nan_json_is_rejected(self):
        self.manifest["tables"][0]["spatial"]["extent"] = [
            float("nan"),
            "51",
            "0",
            "53",
        ]
        with self.assertRaisesRegex(ValueError, "Non-finite JSON"):
            self.validate()

    def test_numeric_state_cannot_shadow_zero(self):
        self.manifest["tables"][0]["fields"][-1]["valueStates"] = [
            {"token": "0", "state": "suppressed"}
        ]
        with self.assertRaisesRegex(ValueError, "shadows a typed value"):
            self.validate()

    def test_v1_contract_and_validator_are_frozen(self):
        self.assertEqual(
            hashlib.sha256(
                (ROOT / "scripts/check_analytical_data.py").read_bytes()
            ).hexdigest(),
            "8c4e65c7fe1165d784c4447a80d35e4425702d67b7650a0529f123b0505874c9",
        )
        self.assertEqual(
            hashlib.sha256(
                (ROOT / "profiles/analytical-data/v1/package.schema.json").read_bytes()
            ).hexdigest(),
            "676cbd90441f31b3b9babcca1c23618b5e7ce1113e9eba9972f02fe9942a7ccb",
        )

    def test_v1_is_not_silently_migrated(self):
        self.manifest["profileVersion"] = "1.0.0-rc.1"
        self.manifest["conformsTo"] = [
            "https://chris-page-gov.github.io/okf-explorer/profile/analytical-data/v1/"
        ]
        with self.assertRaises(ValueError):
            self.validate()


if __name__ == "__main__":
    unittest.main()
