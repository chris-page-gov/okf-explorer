#!/usr/bin/env python3
"""Check rendered full-corpus pages and build visual contact sheets."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageOps


PAGE_PATTERN = re.compile(r"page-(\d+)\.png")
WHITE = Image.new("L", (1, 1), 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("render_root", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--contact-sheet-dir", type=Path)
    return parser.parse_args()


def page_number(path: Path) -> int:
    match = PAGE_PATTERN.fullmatch(path.name)
    if match is None:
        raise ValueError(f"Unexpected rendered page name: {path}")
    return int(match.group(1))


def analyse_page(path: Path) -> dict[str, Any]:
    with Image.open(path) as source:
        image = ImageOps.grayscale(source)
        width, height = image.size
        white = WHITE.resize(image.size)
        difference = ImageChops.difference(image, white)
        content_mask = difference.point(lambda value: 255 if value >= 18 else 0)
        bounding_box = content_mask.getbbox()
        histogram = content_mask.histogram()
    if bounding_box is None:
        raise ValueError(f"Rendered page is blank: {path}")
    left, top, right, bottom = bounding_box
    if min(left, top, width - right, height - bottom) < 3:
        raise ValueError(f"Rendered content touches a page edge: {path}")
    ink_fraction = histogram[255] / (width * height)
    if not 0.002 <= ink_fraction <= 0.45:
        raise ValueError(
            f"Unexpected rendered ink fraction {ink_fraction:.4f}: {path}"
        )
    return {
        "path": str(path),
        "width": width,
        "height": height,
        "content_box": [left, top, right, bottom],
        "ink_fraction": round(ink_fraction, 6),
    }


def make_contact_sheets(
    pages: list[tuple[str, int, Path]],
    output_dir: Path,
) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    columns = 10
    rows = 10
    cell_width = 150
    cell_height = 205
    label_height = 25
    paths: list[str] = []
    for start in range(0, len(pages), columns * rows):
        batch = pages[start : start + columns * rows]
        sheet = Image.new(
            "RGB",
            (columns * cell_width, rows * cell_height),
            "#d8dde3",
        )
        draw = ImageDraw.Draw(sheet)
        for offset, (family_id, number, path) in enumerate(batch):
            column = offset % columns
            row = offset // columns
            x = column * cell_width
            y = row * cell_height
            with Image.open(path) as source:
                thumbnail = source.convert("RGB")
                thumbnail.thumbnail((cell_width - 8, cell_height - label_height - 8))
            page_x = x + (cell_width - thumbnail.width) // 2
            sheet.paste(thumbnail, (page_x, y + label_height + 2))
            label = f"{start + offset + 1}: {family_id[:14]} p{number}"
            draw.text((x + 3, y + 5), label, fill="#17212b")
        contact_path = output_dir / f"contact-{start // 100 + 1:02d}.png"
        sheet.save(contact_path, optimize=True)
        paths.append(str(contact_path))
    return paths


def main() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    rendered_pages: list[tuple[str, int, Path]] = []
    page_counts: dict[str, int] = {}
    page_findings: list[dict[str, Any]] = []
    for document in manifest["profile"]["documents"]:
        family_id = document["family_id"]
        directory = args.render_root / family_id
        paths = sorted(directory.glob("page-*.png"), key=page_number)
        expected_numbers = list(range(1, len(paths) + 1))
        if [page_number(path) for path in paths] != expected_numbers:
            raise ValueError(f"Rendered page sequence is incomplete for {family_id}")
        if not paths:
            raise ValueError(f"No rendered pages found for {family_id}")
        page_counts[family_id] = len(paths)
        for path in paths:
            number = page_number(path)
            rendered_pages.append((family_id, number, path))
            finding = analyse_page(path)
            finding.update({"family_id": family_id, "page": number})
            page_findings.append(finding)

    contact_sheets: list[str] = []
    if args.contact_sheet_dir is not None:
        contact_sheets = make_contact_sheets(rendered_pages, args.contact_sheet_dir)
    report = {
        "schema": "explore-okf-full-corpus-render-qa.v1",
        "document_count": len(page_counts),
        "page_count": len(rendered_pages),
        "page_count_distribution": dict(sorted(Counter(page_counts.values()).items())),
        "minimum_pages": min(page_counts.values()),
        "maximum_pages": max(page_counts.values()),
        "minimum_ink_fraction": min(
            finding["ink_fraction"] for finding in page_findings
        ),
        "maximum_ink_fraction": max(
            finding["ink_fraction"] for finding in page_findings
        ),
        "contact_sheets": contact_sheets,
        "status": "automated_page_geometry_pass",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        f"{json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)}\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
