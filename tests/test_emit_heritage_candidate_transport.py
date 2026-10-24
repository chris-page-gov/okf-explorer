from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import emit_heritage_candidate_transport as transport  # noqa: E402


class HeritageCandidateTransportTests(unittest.TestCase):
    def inputs(self, root: Path) -> dict[str, bytes]:
        inputs = {name: (name + "\n").encode() for name in transport.FILES}
        for name, raw in inputs.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        (root / "must-not-disclose.txt").write_text("unrelated input")
        return inputs

    def test_exact_deterministic_archive_and_numbered_log_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inputs = self.inputs(root)
            raw_zip = transport.archive_bytes(root)
            self.assertEqual(raw_zip, transport.archive_bytes(root))
            with patch.object(transport, "CHUNK_CHARACTERS", 64):
                lines = transport.transport_text(raw_zip).splitlines()
            prefix = transport.MARKER
            envelope = json.loads(lines[0].removeprefix(f"{prefix} BEGIN "))
            self.assertEqual(f"{prefix} END", lines[-1])
            payloads = []
            for number, line in enumerate(lines[1:-1], 1):
                payload = line.removeprefix(
                    f"{prefix} CHUNK {number}/{envelope['chunks']} ")
                self.assertLessEqual(len(payload), 64)
                payloads.append(payload)
            self.assertEqual(envelope["chunks"], len(payloads))
            decoded = base64.b64decode("".join(payloads), validate=True)
            self.assertEqual(raw_zip, decoded)
            self.assertEqual(envelope["bytes"], len(decoded))
            self.assertEqual(envelope["sha256"], hashlib.sha256(decoded).hexdigest())
            with zipfile.ZipFile(io.BytesIO(decoded)) as archive:
                self.assertEqual(list(transport.FILES), archive.namelist())
                self.assertEqual(inputs, {name: archive.read(name)
                                          for name in archive.namelist()})

    def test_rejects_file_and_directory_symlinks(self) -> None:
        for link_directory in (False, True):
            with self.subTest(directory=link_directory), tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / "evidence"
                self.inputs(root)
                path = root / transport.FILES[0]
                if link_directory:
                    path.parent.rename(root / "actual-questions")
                    path.parent.symlink_to(root / "actual-questions", target_is_directory=True)
                else:
                    path.rename(path.with_suffix(".actual"))
                    path.symlink_to(path.with_suffix(".actual"))
                with self.assertRaises((ValueError, OSError)):
                    transport.archive_bytes(root)

    def test_rejects_root_symlink_and_nonregular_file_without_blocking(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "evidence"
            self.inputs(root)
            alias = Path(directory) / "alias"
            alias.symlink_to(root, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "symlinks"):
                transport.archive_bytes(alias)
            path = root / transport.FILES[0]
            path.unlink()
            os.mkfifo(path)
            with self.assertRaisesRegex(ValueError, "regular"):
                transport.archive_bytes(root)

    def test_rejects_each_byte_limit(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.inputs(root)
            for limit, method, argument in (
                ("MAX_FILE_BYTES", transport.archive_bytes, root),
                ("MAX_TOTAL_BYTES", transport.archive_bytes, root),
                ("MAX_ZIP_BYTES", transport.archive_bytes, root),
                ("MAX_LOG_BYTES", transport.transport_text, b"test"),
            ):
                with self.subTest(limit=limit), patch.object(transport, limit, 1):
                    with self.assertRaisesRegex(ValueError, "limit"):
                        method(argument)
            (root / transport.FILES[0]).write_bytes(os.urandom(4096))
            with patch.object(transport, "MAX_ZIP_BYTES", 1024):
                with self.assertRaisesRegex(ValueError, "ZIP"):
                    transport.archive_bytes(root)


if __name__ == "__main__":
    unittest.main()
