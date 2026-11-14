#!/usr/bin/env python3
"""Check only the public routes explicitly listed in the access directory."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

from build_public_bundle_access import load

MAX_DESCRIPTOR_BYTES = 16 * 1024 * 1024


def fetch(url: str, *, complete: bool = True) -> tuple[bytes, int]:
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or parsed.username or parsed.password
            or parsed.hostname not in {"raw.githubusercontent.com", "chris-page-gov.github.io"}
            or parsed.query or parsed.fragment):
        raise ValueError("route must be credential-free public bundle HTTPS")
    request = Request(url, headers={"User-Agent": "OKF-public-access-check/1.0"})
    with urlopen(request, timeout=30) as response:
        # Check the redirect target before reading any returned content.
        final = urlsplit(response.url)
        if final.scheme != "https" or final.hostname != parsed.hostname or final.username or final.password:
            raise ValueError("redirect is outside the public HTTPS access check")
        content = response.read(MAX_DESCRIPTOR_BYTES + 1 if complete else 1)
        if complete and len(content) > MAX_DESCRIPTOR_BYTES:
            raise ValueError("response exceeds the 16 MiB check budget")
        return content, response.status


def check(bundle: dict) -> dict:
    result = {"repository": bundle["repository"], "checks": [], "errors": []}
    routes = [("descriptor", bundle["descriptor"]),
              ("raw-fallback", bundle.get("equivalent_raw_descriptor"))]
    observed = set()
    for kind, url in routes:
        if not url or url in observed:
            continue
        observed.add(url)
        try:
            content, status = fetch(url)
            digest = hashlib.sha256(content).hexdigest()
            if digest != bundle["descriptor_sha256"]:
                raise ValueError("descriptor differs from the dated directory snapshot")
            descriptor = json.loads(content)
            result["checks"].append({"kind": kind, "url": url, "status": status,
                                     "sha256": digest, "schema": descriptor.get("schema")})
            for key in ("overview_index", "data_manifest"):
                entry = descriptor.get("entrypoints", {}).get(key)
                path = entry.get("path") if isinstance(entry, dict) else entry
                if path:
                    target = urljoin(url, path)
                    if not target.startswith(url.rsplit("/", 1)[0] + "/"):
                        raise ValueError(f"{key}: entrypoint leaves its descriptor directory")
                    data, code = fetch(target)
                    json.loads(data)
                    if isinstance(entry, dict) and entry.get("sha256"):
                        if hashlib.sha256(data).hexdigest() != entry["sha256"]:
                            raise ValueError(f"{key}: declared digest differs")
                    result["checks"].append({"kind": kind + ":" + key, "url": target, "status": code})
        except Exception as error:
            result["errors"].append({"kind": kind, "url": url, "error": str(error)})
    try:
        _, status = fetch(bundle["semantic_descriptor"], complete=False)
        result["checks"].append({"kind": "semantic-route-http-only", "url": bundle["semantic_descriptor"], "status": status})
    except Exception as error:
        result["errors"].append({"kind": "semantic-route-http-only", "error": str(error)})
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, load()["bundles"]))
    receipt = {"schema": "okf-public-access-http-check.v1",
               "observed_at": datetime.now(timezone.utc).isoformat(),
               "scope": "Exact descriptors, declared overview/data JSON entrypoints and semantic HTTP availability only. Browser use, all records, semantic correctness and ChatGPT Voice are not tested.",
               "repositories": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for result in results:
        print(f"{result['repository'].rsplit('/', 1)[-1]}: {len(result['checks'])} checks, {len(result['errors'])} errors")
    return int(any(result["errors"] for result in results))


if __name__ == "__main__":
    raise SystemExit(main())
