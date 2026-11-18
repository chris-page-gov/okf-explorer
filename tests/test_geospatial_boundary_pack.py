from copy import deepcopy
import json
from pathlib import Path
import unittest

from jsonschema import Draft202012Validator


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
