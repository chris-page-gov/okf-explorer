"""Emit a bounded, deterministic public evidence archive for reviewed import."""

from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import stat
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "tmp/heritage-candidate"
FILES = (
    "questions/results.json",
    "journeys/results.json",
    "site-candidate-receipt.json",
    "okf-explorer-build-manifest.json",
    "okf-publication-identity.json",
    "source-commit.txt",
)
MAX_FILE_BYTES = 1024 * 1024
MAX_TOTAL_BYTES = 2 * 1024 * 1024
MAX_ZIP_BYTES = 256 * 1024
MAX_LOG_BYTES = 384 * 1024
CHUNK_CHARACTERS = 8192
MARKER = "OKF_HERITAGE_PUBLIC_EVIDENCE_V1"


def archive_bytes(root: Path) -> bytes:
    """Read only the fixed public files, rejecting links and oversized input."""
    root = root.absolute()
    for ancestor in (root, *root.parents):
        if ancestor.is_symlink():
            raise ValueError("evidence root must not contain symlinks")
    payloads = []
    total = 0
    for name in FILES:
        path = root / name
        for ancestor in path.relative_to(root).parents:
            if (root / ancestor).is_symlink():
                raise ValueError("evidence path must not contain symlinks")
        descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(descriptor, "rb") as stream:
            metadata = os.fstat(stream.fileno())
            if not stat.S_ISREG(metadata.st_mode):
                raise ValueError("evidence must be regular files")
            if metadata.st_size > MAX_FILE_BYTES:
                raise ValueError("evidence file exceeds byte limit")
            raw = stream.read(MAX_FILE_BYTES + 1)
        if len(raw) > MAX_FILE_BYTES:
            raise ValueError("evidence file exceeds byte limit")
        total += len(raw)
        if total > MAX_TOTAL_BYTES:
            raise ValueError("evidence exceeds total byte limit")
        payloads.append((name, raw))
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=9) as archive:
        for name, raw in payloads:
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, raw, compresslevel=9)
    raw_zip = output.getvalue()
    if len(raw_zip) > MAX_ZIP_BYTES:
        raise ValueError("evidence ZIP exceeds byte limit")
    return raw_zip


def transport_text(raw_zip: bytes) -> str:
    if len(raw_zip) > MAX_ZIP_BYTES:
        raise ValueError("evidence ZIP exceeds byte limit")
    encoded = base64.b64encode(raw_zip).decode("ascii")
    chunks = [encoded[n:n + CHUNK_CHARACTERS]
              for n in range(0, len(encoded), CHUNK_CHARACTERS)]
    envelope = json.dumps({"bytes": len(raw_zip),
                           "sha256": hashlib.sha256(raw_zip).hexdigest(),
                           "chunks": len(chunks)}, sort_keys=True, separators=(",", ":"))
    lines = [f"{MARKER} BEGIN {envelope}"]
    lines.extend(f"{MARKER} CHUNK {n}/{len(chunks)} {chunk}"
                 for n, chunk in enumerate(chunks, 1))
    lines.append(f"{MARKER} END")
    result = "\n".join(lines) + "\n"
    if len(result.encode("ascii")) > MAX_LOG_BYTES:
        raise ValueError("evidence transport exceeds log byte limit")
    return result


if __name__ == "__main__":
    # Validate the entire archive and envelope before printing any payload.
    print(transport_text(archive_bytes(ROOT)), end="")
