from __future__ import annotations

import io
import json
import sys
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import acquire_heritage_evaluation_sources as acquire  # noqa: E402


def column_name(index: int) -> str:
    result = ""
    value = index + 1
    while value:
        value, remainder = divmod(value - 1, 26)
        result = chr(ord("A") + remainder) + result
    return result


def sheet_xml(rows: list[list[str]]) -> str:
    serialized_rows = []
    for row_number, row in enumerate(rows, start=1):
        cells = []
        for column, value in enumerate(row):
            reference = f"{column_name(column)}{row_number}"
            escaped = (
                str(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )
            cells.append(f'<c r="{reference}" t="inlineStr"><is><t>{escaped}</t></is></c>')
        serialized_rows.append(f'<row r="{row_number}">{"".join(cells)}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(serialized_rows)}</sheetData></worksheet>'
    )


def xlsx_bytes(sheets: list[tuple[str, list[list[str]]]]) -> bytes:
    workbook_sheets = []
    relationships = []
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for index, (name, rows) in enumerate(sheets, start=1):
            workbook_sheets.append(
                f'<sheet name="{name}" sheetId="{index}" r:id="rId{index}"/>'
            )
            relationships.append(
                '<Relationship '
                f'Id="rId{index}" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                f'Target="worksheets/sheet{index}.xml"/>'
            )
            archive.writestr(f"xl/worksheets/sheet{index}.xml", sheet_xml(rows))
        archive.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<sheets>{"".join(workbook_sheets)}</sheets></workbook>',
        )
        archive.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f'{"".join(relationships)}</Relationships>',
        )
    return output.getvalue()


def har_test_workbook() -> bytes:
    header = ["Designated Site Name", "List Entry", "Local Planning Authority", "Condition"]
    return xlsx_bytes(
        [
            ("Introduction", [["Official annual register"], ["Method notes"]]),
            (
                "Entries",
                [
                    ["Heritage at Risk entries"],
                    header,
                    ["Coventry Cathedral", "1342941", "Coventry City Council", "Poor"],
                    ["Outside", "1000000", "Birmingham City Council", "Poor"],
                ],
            ),
            (
                "Additions",
                [header, ["Test addition", "1000001", "Nuneaton & Bedworth Borough Council", "Poor"]],
            ),
            (
                "Positive Removals",
                [header, ["Test removal", "1000002", "Stratford upon Avon District Council", "Fair"]],
            ),
        ]
    )


class HeritageSourceAcquisitionTest(unittest.TestCase):
    def test_sniffs_open_containers_and_rejects_challenge_html(self) -> None:
        workbook = har_test_workbook()
        self.assertEqual("xlsx", acquire.sniff_workbook(workbook))

        ods = io.BytesIO()
        with zipfile.ZipFile(ods, "w") as archive:
            archive.writestr("mimetype", "application/vnd.oasis.opendocument.spreadsheet")
            archive.writestr("content.xml", "<root/>")
        self.assertEqual("ods", acquire.sniff_workbook(ods.getvalue()))
        self.assertEqual("xls", acquire.sniff_workbook(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1rest"))
        with self.assertRaisesRegex(acquire.AcquisitionError, "HTML"):
            acquire.sniff_workbook(b"<!doctype html><html>Performing security verification</html>")

    def test_semantic_sheet_and_header_discovery_filters_all_three_roles(self) -> None:
        workbook = har_test_workbook()
        workbook_format, sections, schema = acquire.workbook_sections(
            2025,
            workbook,
            source_url=acquire.HAR_WORKBOOK_URL.format(year=2025),
        )

        self.assertEqual("xlsx", workbook_format)
        self.assertEqual(
            ["entry", "addition", "positive removal"],
            [section["event_type"] for section in sections],
        )
        self.assertEqual([1, 1, 1], [len(section["rows"]) for section in sections])
        self.assertEqual("E08000026", sections[0]["rows"][0]["scope_geographies"][0]["code"])
        self.assertEqual("E07000219", sections[1]["rows"][0]["scope_geographies"][0]["code"])
        self.assertEqual("E07000221", sections[2]["rows"][0]["scope_geographies"][0]["code"])
        self.assertEqual([], schema["missing_semantic_roles"])
        self.assertEqual(2, sections[0]["header_row"])
        self.assertEqual(3, sections[0]["rows"][0]["source_row"])
        self.assertEqual("1342941", sections[0]["rows"][0]["List Entry"])
        self.assertEqual("Coventry Cathedral", sections[0]["rows"][0]["Name"])

    def test_scope_matching_keeps_multi_lpa_and_labels_county_only_unknown(self) -> None:
        memberships, _ = acquire.scope_memberships(
            {"Local Planning Authority": "Rugby Borough Council / Warwick District Council"}
        )
        self.assertEqual(
            ["E07000220", "E07000222"],
            [membership["code"] for membership in memberships],
        )

        county, _ = acquire.scope_memberships({"County": "Warwickshire"})
        self.assertEqual("E10000031", county[0]["code"])
        self.assertIn("no-lad", county[0]["basis"])

        # Warwick must not be inferred merely from the longer word Warwickshire.
        self.assertNotIn("E07000222", {membership["code"] for membership in county})

    def test_scope_matching_does_not_treat_locality_names_as_lad_evidence(self) -> None:
        memberships, evidence = acquire.scope_memberships(
            {
                "Locality": "Warwick Bridge",
                "Civil Parish": "Wetheral",
                "County": "Cumbria",
                "Local Planning Authority": "Carlisle City Council",
                "Region": "North West",
            }
        )
        self.assertEqual([], memberships)
        self.assertEqual([], evidence)

        town_only, _ = acquire.scope_memberships(
            {"Town": "Rugby", "Local Planning Authority": "West Northamptonshire Council"}
        )
        self.assertEqual([], town_only)

        authority, authority_evidence = acquire.scope_memberships(
            {"Local Planning Authority": "Warwick District Council"}
        )
        self.assertEqual(["E07000222"], [row["code"] for row in authority])
        self.assertEqual("Local Planning Authority", authority_evidence[0]["field"])
        self.assertEqual("source-local-authority-field", authority[0]["basis"])

    def test_contact_values_are_excluded_but_source_column_is_auditable(self) -> None:
        sanitized, excluded = acquire.sanitize_source_row(
            {
                "Published site name": "Example",
                "Published contact": "Named person, phone and email",
            }
        )

        self.assertEqual("Example", sanitized["Published site name"])
        self.assertEqual("", sanitized["Published contact"])
        self.assertEqual(["Published contact"], excluded)

    def test_nhle_deduplication_retains_every_spatial_membership(self) -> None:
        layers = [
            {
                "id": 0,
                "name": "Listed Buildings",
                "features": [
                    {
                        "attributes": {"OBJECTID": 1, "ListEntry": 1001},
                        "geometry": {"points": [[-1.5, 52.4]]},
                        "scope_geographies": acquire.geography_rows(["E08000026"]),
                    },
                    {
                        "attributes": {"OBJECTID": 2, "ListEntry": 1002},
                        "geometry": {"points": [[-1.4, 52.3]]},
                        "scope_geographies": acquire.geography_rows(["E07000222"]),
                    },
                ],
            },
            {
                "id": 6,
                "name": "Scheduled Monuments",
                "features": [
                    {
                        "attributes": {"OBJECTID": 9, "ListEntry": 1001},
                        "geometry": {"rings": []},
                        "scope_geographies": acquire.geography_rows(["E07000222"]),
                    }
                ],
            },
        ]
        deduplicated, reconciliation = acquire.dedupe_nhle_layers(layers, expected_count=2)

        first = deduplicated[0]["features"][0]
        self.assertEqual([0, 6], first["source_layer_ids"])
        self.assertEqual(
            ["E07000222", "E08000026"],
            [item["code"] for item in first["scope_geographies"]],
        )
        self.assertEqual(2, reconciliation["observed_unique_list_entries"])
        self.assertEqual(1, len(reconciliation["cross_layer_duplicates"]))
        with self.assertRaisesRegex(acquire.AcquisitionError, "observed 2, expected 3"):
            acquire.dedupe_nhle_layers(layers, expected_count=3)

    def test_mapped_har_is_joined_as_optional_geometry_not_denominator(self) -> None:
        row = {
            "record_id": "row-1",
            "uid": "HAR-ABC",
            "source_values": {"uid": "HAR-ABC", "List Entry": "1342941"},
            "scope_geographies": acquire.geography_rows(["E08000026"]),
        }
        annual = [{"year": 2025, "rows": [row]}]
        mapped = {
            2025: [
                {
                    "attributes": {"FID": 7, "uid": "HAR-ABC", "List_Entry": 1342941},
                    "geometry": {"rings": [[[0, 0], [1, 0], [0, 0]]]},
                    "spatialReference": {"wkid": 4326, "latestWkid": 4326},
                    "scope_geographies": acquire.geography_rows(["E08000026"]),
                }
            ]
        }

        report = acquire.join_mapped_har(annual, mapped)

        self.assertIn("geometry", row)
        self.assertEqual(4326, row["spatialReference"]["wkid"])
        self.assertEqual("uid", row["mapped_geometry_join"][0]["method"])
        self.assertEqual("geometry-enrichment-only", report[0]["completeness_role"])
        self.assertEqual(1, report[0]["mapped_features_joined"])
        self.assertEqual(1, report[0]["spreadsheet_rows_with_geometry"])

    def test_arcgis_output_crs_is_required_and_mapped_joins_reject_mixed_crs(self) -> None:
        self.assertEqual(
            {"wkid": 4326, "latestWkid": 4326},
            acquire.require_output_spatial_reference(
                {"wkid": 4326, "latestWkid": 4326}, context="test"
            ),
        )
        with self.assertRaisesRegex(acquire.AcquisitionError, "expected EPSG:4326"):
            acquire.require_output_spatial_reference({"wkid": 27700}, context="test")

        row = {
            "record_id": "row-mixed",
            "uid": "HAR-MIXED",
            "source_values": {"uid": "HAR-MIXED"},
            "scope_geographies": [],
        }
        features = [
            {
                "attributes": {"FID": 1, "uid": "HAR-MIXED"},
                "geometry": {"rings": [[[0, 0], [1, 0], [0, 0]]]},
                "spatialReference": {"wkid": 4326},
            },
            {
                "attributes": {"FID": 2, "uid": "HAR-MIXED"},
                "geometry": {"rings": [[[0, 0], [2, 0], [0, 0]]]},
                "spatialReference": {"wkid": 27700},
            },
        ]
        with self.assertRaisesRegex(acquire.AcquisitionError, "missing or mixed"):
            acquire.join_mapped_har([{"year": 2025, "rows": [row]}], {2025: features})

    def test_real_annual_header_aliases_join_to_mapped_feature_schema(self) -> None:
        row = {
            "record_id": "entry-row",
            "source_values": {
                "Published site name": "Church of St Example, Example Parish",
                "List Entry Number (LEN) or Conservation Area Number (CAN)": "1234567",
                "Risk methodology": "Place of worship",
            },
            "scope_geographies": [],
        }
        feature = {
            "attributes": {
                "FID": 9,
                "EntryName": "Church of St Example",
                "List_Entry": 1234567,
                "Risk_Metho": "Place of worship",
            }
        }

        row_keys = acquire.har_row_keys(row)
        feature_keys = acquire.har_feature_keys(feature)
        self.assertNotEqual(row_keys[1], feature_keys[1])
        self.assertEqual(row_keys[1][:2], feature_keys[1][:2])

        annual = [{"year": 2025, "rows": [row]}]
        report = acquire.join_mapped_har(annual, {2025: [feature]})
        self.assertEqual("list-entry-methodology", row["mapped_geometry_join"][0]["method"])
        self.assertEqual(1, report[0]["mapped_features_joined"])

    def test_deterministic_snapshot_gzip_has_stable_bytes_and_zero_time(self) -> None:
        payload = acquire.json_bytes({"b": 2, "a": [1, "é"]})
        first = acquire.deterministic_gzip(payload)
        second = acquire.deterministic_gzip(payload)

        self.assertEqual(first, second)
        self.assertEqual(b"\x00\x00\x00\x00", first[4:8])
        self.assertEqual(json.loads(payload), json.loads(acquire.gzip.decompress(first)))

    def test_json_provenance_digest_ignores_wire_key_order(self) -> None:
        headers = {"content-type": "application/json"}
        first = acquire.response_sha256(b'{"b":2,"a":1}', headers)
        second = acquire.response_sha256(b'{ "a": 1, "b": 2 }', headers)

        self.assertEqual(first, second)
        payload, basis = acquire.provenance_payload(b'{"b":2,"a":1}', headers)
        self.assertEqual("canonical-json", basis)
        self.assertEqual({"a": 1, "b": 2}, json.loads(payload))

        arcgis_a = b'{"features":[{"attributes":{"OBJECTID":1}}],"fields":["wire-a"]}'
        arcgis_b = b'{"fields":["wire-b"],"features":[{"attributes":{"OBJECTID":1}}]}'
        self.assertEqual(
            acquire.response_sha256(arcgis_a, headers),
            acquire.response_sha256(arcgis_b, headers),
        )


if __name__ == "__main__":
    unittest.main()
