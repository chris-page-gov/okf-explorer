from __future__ import annotations

import contextlib
import copy
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_heritage_tiny_snapshot as tiny_builder  # noqa: E402


class HeritageTinySnapshotTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.parent, cls.compressed, cls.payload = tiny_builder.load_parent(
            tiny_builder.DEFAULT_SOURCE
        )

    def build(self, parent: dict | None = None) -> dict:
        return tiny_builder.build_tiny_snapshot(
            parent if parent is not None else self.parent,
            source_file_bytes=self.compressed,
            source_payload_bytes=self.payload,
        )

    def test_exact_source_rows_form_two_assets_and_one_linked_risk_record(self) -> None:
        tiny = self.build()
        features = [
            feature
            for layer in tiny["nhle"]["layers"]
            for feature in layer["features"]
        ]
        list_entries = [tiny_builder.feature_list_entry(row) for row in features]
        annual = tiny["har"]["annual"]
        har_rows = [row for section in annual for row in section["rows"]]

        self.assertEqual(["1342941", "1184627"], list_entries)
        self.assertEqual(1, len(har_rows))
        self.assertEqual("1184627", tiny_builder.row_list_entry(har_rows[0]))
        self.assertEqual(2025, annual[0]["year"])
        self.assertEqual("entry", annual[0]["event_type"])
        self.assertEqual("real-world", tiny["scope"]["assertion_scope"])
        self.assertEqual("tiny", tiny["publication"]["role"])
        self.assertEqual(
            ["E08000026", "E07000221"],
            [boundary["code"] for boundary in tiny["scope"]["boundaries"]],
        )

        # The selected payloads are byte-for-byte data objects from the parent,
        # not rewritten or invented approximations.
        parent_features = {
            tiny_builder.feature_list_entry(feature): feature
            for layer in self.parent["nhle"]["layers"]
            for feature in layer["features"]
            if tiny_builder.feature_list_entry(feature) in set(list_entries)
        }
        self.assertEqual(
            [parent_features[identifier] for identifier in list_entries], features
        )
        parent_har = next(
            row
            for section in self.parent["har"]["annual"]
            if section["year"] == 2025 and section["event_type"] == "entry"
            for row in section["rows"]
            if tiny_builder.row_list_entry(row) == "1184627"
        )
        self.assertEqual(parent_har, har_rows[0])

    def test_receipts_bind_parent_selected_objects_and_omitted_boundary_geometry(self) -> None:
        tiny = self.build()
        provenance = tiny["subset_provenance"]
        self.assertEqual("none", provenance["network_access"])
        self.assertEqual(self.parent["snapshot_id"], provenance["parent"]["snapshot_id"])
        self.assertEqual(
            hashlib.sha256(self.compressed).hexdigest(),
            provenance["parent"]["compressed_file_sha256"],
        )
        self.assertEqual(
            hashlib.sha256(self.payload).hexdigest(),
            provenance["parent"]["uncompressed_json_sha256"],
        )
        self.assertEqual(
            {"har_rows": 1, "nhle_features": 2, "records": 3, "scope_boundaries": 2},
            provenance["counts"],
        )
        self.assertEqual(
            ["1342941", "1184627", "1184627"],
            [row["list_entry"] for row in provenance["selection"]],
        )

        parent_boundaries = {
            row["code"]: row for row in self.parent["scope"]["boundaries"]
        }
        for boundary in tiny["scope"]["boundaries"]:
            self.assertNotIn("geometry", boundary)
            expected = tiny_builder.sha256_bytes(
                tiny_builder.canonical_json_bytes(
                    parent_boundaries[boundary["code"]]["geometry"]
                )
            )
            self.assertEqual(expected, boundary["source_geometry_receipt"]["sha256"])

        self.assertEqual(
            list(tiny_builder.SOURCE_IDS),
            [source["id"] for source in tiny["sources"]],
        )

    def test_output_and_check_are_byte_deterministic(self) -> None:
        first = tiny_builder.rendered_json_bytes(self.build())
        second = tiny_builder.rendered_json_bytes(self.build())
        self.assertEqual(first, second)
        self.assertEqual(
            first,
            tiny_builder.DEFAULT_OUTPUT.read_bytes(),
            "committed tiny fixture must be synchronised with its frozen parent",
        )

        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "source-snapshot.json"
            quiet = io.StringIO()
            with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
                self.assertEqual(
                    0,
                    tiny_builder.main(
                        [
                            "--source",
                            str(tiny_builder.DEFAULT_SOURCE),
                            "--output",
                            str(output),
                        ]
                    ),
                )
                self.assertEqual(
                    0,
                    tiny_builder.main(
                        [
                            "--source",
                            str(tiny_builder.DEFAULT_SOURCE),
                            "--output",
                            str(output),
                            "--check",
                        ]
                    ),
                )
                output.write_text("{}\n", encoding="utf-8")
                self.assertEqual(
                    1,
                    tiny_builder.main(
                        [
                            "--source",
                            str(tiny_builder.DEFAULT_SOURCE),
                            "--output",
                            str(output),
                            "--check",
                        ]
                    ),
                )

    def test_selection_fails_closed_when_a_required_identity_disappears(self) -> None:
        parent = copy.deepcopy(self.parent)
        for layer in parent["nhle"]["layers"]:
            layer["features"] = [
                feature
                for feature in layer["features"]
                if tiny_builder.feature_list_entry(feature) != "1342941"
            ]
        with self.assertRaisesRegex(
            tiny_builder.SnapshotSelectionError, "required NHLE selection missing: 1342941"
        ):
            self.build(parent)


if __name__ == "__main__":
    unittest.main()
