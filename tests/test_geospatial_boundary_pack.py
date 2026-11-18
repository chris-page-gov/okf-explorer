from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest

from jsonschema import Draft202012Validator

from scripts.check_boundary_pack import check_pack


SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "profiles" / "geospatial-boundary-pack" / "v1" / "manifest.schema.json"
)


class GeospatialBoundaryPackTest(unittest.TestCase):
    def setUp(self):
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        self.validator = Draft202012Validator(
            schema, format_checker=Draft202012Validator.FORMAT_CHECKER
        )
        overview = {
            "path": "data/overview.geojson",
            "bytes": 100,
            "sha256": "1" * 64,
            "media_type": "application/geo+json",
            "output_crs": "OGC:CRS84",
            "coastal_variant": "coastline-clipped",
            "generalisation": "Synthetic outline at overview scale",
            "feature_id_property": "code",
            "feature_count": 1,
            "source": {
                "publisher": "Fixture",
                "product": "Synthetic boundary",
                "version": "1",
                "url": "https://example.test/synthetic.zip",
                "sha256": "2" * 64,
                "source_crs": "OGC:CRS84",
                "retrieved_on": "2026-11-18",
                "licence": "https://example.test/fictional-licence",
                "attribution": "Synthetic fixture",
                "derivation": "Synthetic polygon",
            },
        }
        detail = deepcopy(overview)
        detail.update(path="data/detail.geojson", bytes=125, sha256="3" * 64)
        self.pack = {
            "schema": "okf-geospatial-boundary-pack.v1",
            "id": "synthetic-v1",
            "geography_family": "synthetic",
            "identifier_scheme": "urn:example:source-code",
            "vintage": "2026-11-18",
            "coverage": {
                "nations": ["England"],
                "crown_dependencies": "excluded",
                "overseas_territories": "excluded",
                "limitations": "Synthetic example in a single nation",
            },
            "detail_min_zoom": 8,
            "representations": {"overview": overview, "detail": detail},
        }

    def test_admits_two_declared_representations(self):
        self.validator.validate(self.pack)

    def test_checks_the_staged_ons_bundle_and_its_manifest_binding(self):
        root = SCHEMA_PATH.parent / "examples" / "uk-countries-december-2025"
        descriptor = json.loads((root / "okf-explorer.json").read_bytes())
        receipt = json.loads((root / "receipt.json").read_bytes())
        binding = descriptor["entrypoints"]["boundary_pack"]
        manifest = root / binding["path"]
        self.assertEqual(binding["bytes"], manifest.stat().st_size)
        result = check_pack(manifest)
        self.assertEqual(binding["sha256"], result["manifest_sha256"])
        self.assertEqual(receipt["validation"], result)
        self.assertEqual(result["features"], 4)

    def test_rejects_unbound_or_unsafe_representations(self):
        changes = {
            "path": "data/../elsewhere.geojson",
            "sha256": "missing-valid-digest",
            "bytes": 5242881,
            "output_crs": "EPSG:27700",
        }
        for field, value in changes.items():
            with self.subTest(field=field):
                pack = deepcopy(self.pack)
                pack["representations"]["overview"][field] = value
                self.assertFalse(self.validator.is_valid(pack))

    def test_requires_explicit_coverage_and_attribution(self):
        self.pack["coverage"]["nations"] = ["England", "England"]
        del self.pack["representations"]["detail"]["source"]["attribution"]
        paths = {tuple(error.absolute_path) for error in self.validator.iter_errors(self.pack)}
        self.assertEqual(
            {("coverage", "nations"), ("representations", "detail", "source")}, paths
        )

    def test_checks_exact_bytes_and_matches_logical_features_across_scales(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "data").mkdir()
            manifest = root / "manifest.json"
            for role in ("overview", "detail"):
                self.write_geometry(root, role, "A")
            manifest.write_text(json.dumps(self.pack), encoding="utf-8")
            self.assertEqual(1, check_pack(manifest)["features"])

            self.write_geometry(root, "detail", "B")
            with self.assertRaisesRegex(ValueError, "bytes do not match"):
                check_pack(manifest)
            manifest.write_text(json.dumps(self.pack), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "identifiers differ"):
                check_pack(manifest)

            self.write_geometry(root, "detail", "A", close_ring=False)
            manifest.write_text(json.dumps(self.pack), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "open ring"):
                check_pack(manifest)

    def test_checks_offline_records_before_shipping_the_pack(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "data").mkdir()
            for role in ("overview", "detail"):
                self.write_geometry(root, role, "A")
            records = root / "data" / "records.json"
            body = b"[]"
            records.write_bytes(body)
            self.pack["offline_resources"] = [
                {"path": "data/records.json", "bytes": len(body), "sha256": sha256(body).hexdigest()}
            ]
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps(self.pack), encoding="utf-8")
            self.assertEqual(1, check_pack(manifest)["features"])
            records.write_bytes(b"{}")
            with self.assertRaisesRegex(ValueError, "differs from its manifest binding"):
                check_pack(manifest)

    def write_geometry(self, root: Path, role: str, code: str, *, close_ring=True):
        ring = [[-1, 51], [0, 51], [0, 52], [-1, 52]]
        if close_ring:
            ring.append(ring[0])
        content = json.dumps({
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature", "properties": {"code": code},
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            }],
        }).encode("utf-8")
        representation = self.pack["representations"][role]
        (root / representation["path"]).write_bytes(content)
        representation.update(bytes=len(content), sha256=sha256(content).hexdigest())
