#!/usr/bin/env python3
"""Validate terminal R2 while preserving the exact validator shipped in R1."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import check_evaluation_foundry as foundry
import check_promotion_envelope as promotion


TERMINAL_LINK_RECEIPT_NAME = "link-observation-receipt.json"
TERMINAL_LINK_RECEIPT_MAX_BYTES = 16 * 1024 * 1024
_R1_LOAD_DOCUMENT = promotion.load_document


def load_terminal_document(path: Path) -> dict[str, Any]:
    """Apply the larger reviewed bound only to the complete terminal link receipt."""

    resolved = Path(path)
    if resolved.name != TERMINAL_LINK_RECEIPT_NAME:
        return _R1_LOAD_DOCUMENT(resolved)
    previous = foundry.MAX_CONTROL_FILE_BYTES
    try:
        foundry.MAX_CONTROL_FILE_BYTES = TERMINAL_LINK_RECEIPT_MAX_BYTES
        return _R1_LOAD_DOCUMENT(resolved)
    finally:
        foundry.MAX_CONTROL_FILE_BYTES = previous


def main(argv: list[str] | None = None) -> int:
    original = promotion.load_document
    promotion.load_document = load_terminal_document
    try:
        return promotion.main(argv)
    finally:
        promotion.load_document = original


if __name__ == "__main__":
    sys.exit(main())
