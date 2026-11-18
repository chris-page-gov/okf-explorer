"""Combine exact deployed guide evidence and manual observations into one receipt."""

from __future__ import annotations

import argparse
from base64 import b64decode
from hashlib import sha256
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urljoin, urlsplit

from jsonschema import Draft202012Validator, ValidationError

if __package__:
    from .audit_beginner_guide_sources import classification
else:
    from audit_beginner_guide_sources import classification


SCHEMA = Path(__file__).resolve().parents[1] / "profiles/beginner-guide-audit/v1/receipt.schema.json"
MANUAL_CHECKS = {
    "keyboard_order", "focus_visibility", "landmarks", "heading_order", "accessible_names",
    "link_purpose", "contrast", "zoom_200_percent", "narrow", "touch", "reduced_motion",
    "independent_sidebar_scrolling",
}
ENGINES = {"chrome": "chromium", "firefox": "firefox", "webkit": "webkit"}


def read(path: Path, limit: int = 2 * 1024 * 1024) -> tuple[dict, str]:
    with path.open("rb") as source:
        raw = source.read(limit + 1)
    if len(raw) > limit:
        raise ValueError(f"Audit input exceeds its byte limit: {path.name}")
    document = json.loads(raw)
    if not isinstance(document, dict):
        raise ValueError(f"Expected an audit object: {path.name}")
    return document, sha256(raw).hexdigest()


def suites(rows):
    for row in rows:
        yield from row.get("specs", [])
        yield from suites(row.get("suites", []))


def browser_observations(report: dict, expected: dict, references: dict, guide_base: str, reference_sha: str) -> list[dict]:
    if report.get("stats", {}).get("unexpected") or report.get("errors"):
        raise ValueError("The browser report contains failures")
    observations = []
    for spec in suites(report["suites"]):
        for test in spec["tests"]:
            for result in test["results"]:
                attachments = [item for item in result["attachments"] if item["name"] == "observed-guide-fragments"]
                if not attachments:
                    continue
                if result["status"] != "passed" or len(attachments) != 1:
                    raise ValueError("The browser guide journey did not complete cleanly")
                data = json.loads(b64decode(attachments[0]["body"], validate=True))
                if (
                    data.pop("publication") != expected or data.pop("guide_base") != guide_base
                    or data.pop("cross_references_sha256") != reference_sha
                ):
                    raise ValueError("Browser observations do not identify the exact deployed candidate")
                chapters = data["chapters"]
                observed = {row["route"]: row["headings"] for row in chapters}
                if observed != references or len(chapters) != len(references):
                    raise ValueError("Browser observations do not cover the exact chapter and fragment set")
                observations.append(data)
    if {item["project"]: item["engine"] for item in observations} != ENGINES or len(observations) != len(ENGINES):
        raise ValueError("Expected exact observations from Chrome, Firefox and WebKit")
    return sorted(observations, key=lambda item: item["project"])


def source_summary(source: dict, reference_sha: str, chapters: set[str], exceptions: dict) -> dict:
    if source["cross_references_sha256"] != reference_sha or source["observations"] is not True:
        raise ValueError("Expected observed external source URLs from this exact guide")
    rows = source["sources"]
    urls = {row["requested_url"] for row in rows}
    if len(urls) != len(rows) or not exceptions.keys() <= urls:
        raise ValueError("Source observations or review exceptions contain unknown or duplicate URLs")
    unresolved = []
    observed = expected_no_fetch = 0
    for row in rows:
        url = row["requested_url"]
        if (row["classification"], row["dereference"]) != classification(url) or not set(row["guide_pages"]) <= chapters:
            raise ValueError("External source classification or guide routes differ")
        if not row["dereference"] and row["status"] == "no-fetch-expected":
            expected_no_fetch += 1
        elif row["dereference"] and row.get("tool") and row.get("observed_at"):
            observed += 1
            if (row["status"] != "observed" or row.get("redirects")
                    or not (row.get("title") or row.get("prefix_sha256"))) and url not in exceptions:
                unresolved.append(url)
        else:
            raise ValueError("An external source is missing its expected observation")
    return {
        "classified": len(rows), "observed": observed, "expected_no_fetch": expected_no_fetch,
        "exceptions_open": sorted(unresolved),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("candidate", "references", "sources", "browser-report", "manual", "output"):
        parser.add_argument(f"--{name}", required=True, type=Path)
    parser.add_argument("--guide-base", required=True)
    args = parser.parse_args()
    try:
        base = urlsplit(args.guide_base)
        if (base.scheme != "https" or not base.path.endswith("/docs/beginners/")
                or not base.hostname or base.username or base.password or base.query or base.fragment):
            raise ValueError("Use the exact published HTTPS guide base")
        candidate, _ = read(args.candidate)
        references, reference_sha = read(args.references)
        if candidate["schema"] != "okf-site-candidate-receipt.v1" or references["schema"] != "okf-beginner-guide-cross-references.v1":
            raise ValueError("Site or guide identity uses an unexpected schema")
        pages = references["pages"]
        exact_routes = {urljoin(args.guide_base, name): headings for name, headings in pages.items()}
        expected = {
            "commit": candidate["publication_identity"]["commit"],
            "identity_sha256": candidate["publication_identity"]["sha256"],
            "manifest_sha256": candidate["explorer"]["manifest_sha256"],
        }
        report, report_sha = read(args.browser_report)
        browsers = browser_observations(report, expected, exact_routes, args.guide_base, reference_sha)
        manual, manual_sha = read(args.manual)
        if set(manual["chapters"]) != set(exact_routes) or any(
            set(chapter["checks"]) != MANUAL_CHECKS for chapter in manual["chapters"].values()
        ):
            raise ValueError("Manual observations must cover every chapter and named audit check")
        sources, sources_sha = read(args.sources)
        external = source_summary(sources, reference_sha, set(pages), manual["source_exceptions"])
        findings = sum(list(row["checks"].values()).count("finding") for row in manual["chapters"].values())
        status = "findings-open" if findings or external["exceptions_open"] else "complete"
        receipt = {
            "schema": "okf-beginner-guide-release-audit.v1", "status": status, "commit": expected["commit"],
            "site_sha256": candidate["site"]["tree_sha256"], "explorer_manifest_sha256": expected["manifest_sha256"],
            "guide_base": args.guide_base, "cross_references_sha256": reference_sha,
            "source_inventory_sha256": sources_sha, "browser_report_sha256": report_sha, "manual_sha256": manual_sha,
            "tool": "Playwright " + report["config"]["version"], "browsers": browsers, "manual": manual,
            "source_summary": external, "limitations": ["URL observations describe availability and returned identity."],
        }
        schema = json.loads(SCHEMA.read_bytes())
        Draft202012Validator(schema, format_checker=Draft202012Validator.FORMAT_CHECKER).validate(receipt)
        summary = (f"# Beginner guide release audit\n\nCommit `{receipt['commit']}`\n\n"
                   f"- {len(pages)} chapters and {sum(map(len, pages.values()))} fragments checked in three browsers.\n"
                   f"- Manual findings open across the guide — {findings}.\n"
                   f"- External source observations — {external['observed']}. Expected no-fetch entries — "
                   f"{external['expected_no_fetch']}. Unresolved observations — {len(external['exceptions_open'])}.\n")
        if args.output.exists():
            raise ValueError("Choose an unused audit output directory")
        with TemporaryDirectory(dir=args.output.parent, prefix="okf-guide-audit-") as temporary:
            staged = Path(temporary) / "audit"
            staged.mkdir()
            (staged / "receipt.json").write_text(
                json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
            )
            (staged / "README.md").write_text(summary, encoding="utf-8")
            staged.rename(args.output)
    except (KeyError, OSError, TypeError, ValueError, ValidationError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
