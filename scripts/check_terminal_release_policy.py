#!/usr/bin/env python3
"""Run promotion release policy with the bounded terminal-link document loader."""

from __future__ import annotations

import sys

import check_promotion_envelope as promotion
import check_release_policy as release
from check_terminal_promotion_envelope import load_terminal_document


def main(argv: list[str] | None = None) -> int:
    original = promotion.load_document
    promotion.load_document = load_terminal_document
    try:
        return release.main(argv)
    finally:
        promotion.load_document = original


if __name__ == "__main__":
    sys.exit(main())
