#!/usr/bin/env python3
"""Check authored documentation prose for high-confidence US spellings."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


DEFAULT_PATHS = (Path("docs/beginners"), Path("docs/documentation-style.md"))

# These are exact published titles. The surrounding explanation still uses
# British English.
OFFICIAL_TITLES = (
    "Artifact attestations",
    "Data Catalog Vocabulary",
    "GitHub Artifact Attestations",
    "Simple Knowledge Organization System",
    "Supply-chain Levels for Software Artifacts",
)

PREFERRED_FORMS = {
    "acknowledgment": "acknowledgement",
    "acknowledgments": "acknowledgements",
    "analyze": "analyse",
    "analyzed": "analysed",
    "analyzes": "analyses",
    "analyzing": "analysing",
    "artifact": "artefact",
    "artifacts": "artefacts",
    "authorization": "authorisation",
    "authorizations": "authorisations",
    "authorize": "authorise",
    "authorized": "authorised",
    "authorizes": "authorises",
    "authorizing": "authorising",
    "behavior": "behaviour",
    "behavioral": "behavioural",
    "behaviors": "behaviours",
    "canceled": "cancelled",
    "canceling": "cancelling",
    "catalog": "catalogue",
    "cataloged": "catalogued",
    "cataloging": "cataloguing",
    "catalogs": "catalogues",
    "centralization": "centralisation",
    "centralized": "centralised",
    "centralizing": "centralising",
    "center": "centre",
    "centered": "centred",
    "centering": "centring",
    "centers": "centres",
    "color": "colour",
    "colored": "coloured",
    "coloring": "colouring",
    "colors": "colours",
    "customization": "customisation",
    "customize": "customise",
    "customized": "customised",
    "customizing": "customising",
    "defense": "defence",
    "defenses": "defences",
    "dialog": "dialogue",
    "dialogs": "dialogues",
    "digitization": "digitisation",
    "digitize": "digitise",
    "digitized": "digitised",
    "digitizing": "digitising",
    "favor": "favour",
    "favored": "favoured",
    "favoring": "favouring",
    "favorite": "favourite",
    "favorites": "favourites",
    "fulfill": "fulfil",
    "fulfillment": "fulfilment",
    "honor": "honour",
    "honored": "honoured",
    "honoring": "honouring",
    "judgment": "judgement",
    "judgments": "judgements",
    "labeled": "labelled",
    "labeling": "labelling",
    "materialization": "materialisation",
    "materialize": "materialise",
    "materialized": "materialised",
    "materializes": "materialises",
    "materializing": "materialising",
    "minimization": "minimisation",
    "minimize": "minimise",
    "minimized": "minimised",
    "minimizing": "minimising",
    "modeled": "modelled",
    "modeling": "modelling",
    "normalization": "normalisation",
    "normalize": "normalise",
    "normalized": "normalised",
    "normalizes": "normalises",
    "normalizing": "normalising",
    "offense": "offence",
    "offenses": "offences",
    "optimization": "optimisation",
    "optimizations": "optimisations",
    "optimize": "optimise",
    "optimized": "optimised",
    "optimizing": "optimising",
    "organization": "organisation",
    "organizational": "organisational",
    "organizations": "organisations",
    "organize": "organise",
    "organized": "organised",
    "organizes": "organises",
    "organizing": "organising",
    "prioritization": "prioritisation",
    "prioritize": "prioritise",
    "prioritized": "prioritised",
    "prioritizing": "prioritising",
    "recognize": "recognise",
    "recognized": "recognised",
    "recognizable": "recognisable",
    "recognizes": "recognises",
    "recognizing": "recognising",
    "sanitize": "sanitise",
    "sanitized": "sanitised",
    "sanitization": "sanitisation",
    "sanitizing": "sanitising",
    "serialization": "serialisation",
    "serializations": "serialisations",
    "serialize": "serialise",
    "serialized": "serialised",
    "serializes": "serialises",
    "serializing": "serialising",
    "specialization": "specialisation",
    "specialize": "specialise",
    "specialized": "specialised",
    "specializing": "specialising",
    "standardization": "standardisation",
    "standardize": "standardise",
    "standardized": "standardised",
    "standardizing": "standardising",
    "summarize": "summarise",
    "summarized": "summarised",
    "summarizes": "summarises",
    "summarizing": "summarising",
    "synchronization": "synchronisation",
    "synchronized": "synchronised",
    "synchronizing": "synchronising",
    "traveled": "travelled",
    "traveler": "traveller",
    "travelers": "travellers",
    "traveling": "travelling",
    "visualization": "visualisation",
    "visualizations": "visualisations",
    "visualize": "visualise",
    "visualized": "visualised",
    "visualizing": "visualising",
    "emphasize": "emphasise",
    "emphasized": "emphasised",
    "emphasizes": "emphasises",
    "emphasizing": "emphasising",
    "rematerialize": "rematerialise",
    "rematerialized": "rematerialised",
    "rematerializes": "rematerialises",
    "rematerializing": "rematerialising",
}

WORD_PATTERN = re.compile(
    r"\b(" + "|".join(sorted(map(re.escape, PREFERRED_FORMS), key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)
LIKELY_NOUN_LICENSE = re.compile(
    r"\b(?:a|an|the|this|that|its|open|content|data|software|source|under)\s+license\b",
    re.IGNORECASE,
)
FENCE = re.compile(r"^\s*(```+|~~~+)")
INLINE_CODE = re.compile(r"(`+)(.+?)\1")
LINK_TARGET = re.compile(r"\]\((?:<[^>]+>|[^)]+)\)")
BARE_URL = re.compile(r"https?://\S+")


@dataclass(frozen=True)
class Finding:
    path: Path
    line: int
    column: int
    found: str
    preferred: str


def _mask_exact_text(line: str) -> str:
    masked = INLINE_CODE.sub("", line)
    masked = LINK_TARGET.sub("]", masked)
    masked = BARE_URL.sub("", masked)
    for title in OFFICIAL_TITLES:
        masked = masked.replace(title, "")
    return masked


def scan_text(path: Path, text: str) -> list[Finding]:
    findings: list[Finding] = []
    fence_marker: str | None = None

    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        fence_match = FENCE.match(raw_line)
        if fence_match:
            marker = fence_match.group(1)[0]
            if fence_marker is None:
                fence_marker = marker
            elif marker == fence_marker:
                fence_marker = None
            continue
        if fence_marker is not None:
            continue

        line = _mask_exact_text(raw_line)
        occupied: set[tuple[int, int]] = set()
        for match in WORD_PATTERN.finditer(line):
            found = match.group(0)
            preferred = PREFERRED_FORMS[found.lower()]
            findings.append(
                Finding(path, line_number, match.start() + 1, found, preferred)
            )
            occupied.add(match.span())

        for match in LIKELY_NOUN_LICENSE.finditer(line):
            license_start = match.end() - len("license")
            span = (license_start, match.end())
            if span not in occupied:
                findings.append(
                    Finding(path, line_number, license_start + 1, "license", "licence (noun)")
                )

    return findings


def markdown_files(paths: Iterable[Path]) -> list[Path]:
    files: set[Path] = set()
    for path in paths:
        if path.is_dir():
            files.update(candidate for candidate in path.rglob("*.md") if candidate.is_file())
        elif path.is_file() and path.suffix.lower() == ".md":
            files.add(path)
        else:
            raise FileNotFoundError(f"documentation path does not exist or is not Markdown: {path}")
    return sorted(files)


def check(paths: Sequence[Path]) -> list[Finding]:
    findings: list[Finding] = []
    for path in markdown_files(paths):
        findings.extend(scan_text(path, path.read_text(encoding="utf-8")))
    return findings


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        default=list(DEFAULT_PATHS),
        help="Markdown files or directories (default: beginner guide and style guide)",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        files = markdown_files(args.paths)
    except FileNotFoundError as error:
        print(error, file=sys.stderr)
        return 2

    findings: list[Finding] = []
    for path in files:
        findings.extend(scan_text(path, path.read_text(encoding="utf-8")))

    for finding in findings:
        print(
            f"{finding.path}:{finding.line}:{finding.column}: "
            f"use {finding.preferred!r} instead of {finding.found!r} in prose"
        )
    if findings:
        print(f"British-English check failed: {len(findings)} finding(s) in {len(files)} file(s).")
        return 1

    print(f"British-English check passed: {len(files)} Markdown file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
