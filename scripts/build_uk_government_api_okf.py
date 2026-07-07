#!/usr/bin/env python3
"""Build a large-corpus OKF exemplar from the UK Government API Catalogue."""

from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import json
import math
import re
import shutil
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "uk-government-apis"
DEFAULT_SOURCE_URL = "https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv"

ACRONYM_CONTEXT = {
    "HMPPS": {
        "expanded": "HM Prison and Probation Service",
        "description": "HMPPS is an executive agency sponsored by the Ministry of Justice.",
        "source_url": "https://www.gov.uk/government/organisations/hm-prison-and-probation-service",
    }
}

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}

TOPIC_RULES = [
    ("Tax and customs", r"\b(tax|vat|hmrc|customs|tariff|eori|excise|duty|self assessment|income)\b"),
    ("Health and care", r"\b(nhs|health|care|patient|fhir|hl7|clinical|hospital|ambulance|vaccination|medicine)\b"),
    ("Transport", r"\b(transport|vehicle|driver|dvla|road|traffic|rail|bus|journey|tfl)\b"),
    ("Environment", r"\b(environment|flood|rainfall|water|tide|air|ecology|fish|catchment|defra)\b"),
    ("Geospatial", r"\b(geo|map|mapping|address|postcode|uprn|uspn|os |ordnance|places|gazetteer|arcgis)\b"),
    ("Planning and property", r"\b(land|property|planning|building|energy performance|epc|registry|register)\b"),
    ("Business and economy", r"\b(company|companies|business|trade|tariff|quota|commercial|insolvency)\b"),
    ("Education and skills", r"\b(education|teacher|teaching|apprentice|qualification|ofqual|school)\b"),
    ("Justice and policing", r"\b(court|tribunal|prison|police|justice|offender|hmpps|crime)\b"),
    ("Government services", r"\b(gov\.uk|notify|pay|search|organisations|content|service)\b"),
]

STYLE_RULES = [
    ("FHIR", r"\bfhir\b"),
    ("HL7 v3", r"\bhl7\b"),
    ("SOAP/WSDL", r"\bsoap|wsdl\b"),
    ("SPARQL", r"\bsparql|linkeddata|linked data\b"),
    ("GraphQL", r"\bgraphql\b"),
    ("OGC API", r"\bogc|wfs|wmts|vector tile|arcgis\b"),
    ("MESH", r"\bmesh\b"),
    ("EDIFACT", r"\bedifact\b"),
    ("Streaming", r"\bstream|streaming|push|notifications?\b"),
]

ACRONYMS = {
    "api": "API",
    "bgs": "BGS",
    "cefas": "Cefas",
    "dfe": "DfE",
    "defra": "Defra",
    "dvla": "DVLA",
    "dwp": "DWP",
    "gds": "GDS",
    "govuk": "GOV.UK",
    "hm": "HM",
    "hmpps": "HMPPS",
    "hmrc": "HMRC",
    "mhclg": "MHCLG",
    "nhs": "NHS",
    "ons": "ONS",
    "ord": "ORD",
    "os": "OS",
    "tfl": "TfL",
    "uk": "UK",
}


@dataclass(frozen=True)
class SourceRow:
    ordinal: int
    raw: dict[str, str]
    slug: str
    provider: str
    provider_title: str


def slugify(value: str, fallback: str = "item") -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or fallback


def provider_title(slug: str) -> str:
    parts = [part for part in slug.split("-") if part]
    titled: list[str] = []
    for part in parts:
        titled.append(ACRONYMS.get(part, part.capitalize()))
    text = " ".join(titled)
    replacements = {
        "Office Of National Statistics": "Office for National Statistics",
        "Department For": "Department for",
        "Ministry Of": "Ministry of",
        "The Office Of": "The Office of",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text or slug


def host(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value if re.match(r"^[a-z]+://", value, re.I) else f"https://{value}")
    return parsed.netloc.lower().removeprefix("www.")


def context_for_row(row: dict[str, str]) -> tuple[str, list[dict[str, str]], list[dict[str, str]]]:
    haystack = " ".join(str(row.get(key, "")) for key in ["name", "description", "url", "documentation", "maintainer"]).upper()
    expansions: list[dict[str, str]] = []
    links: list[dict[str, str]] = []
    notes: list[str] = []
    for acronym, context in ACRONYM_CONTEXT.items():
        if re.search(rf"\b{re.escape(acronym)}\b", haystack):
            expansions.append({"acronym": acronym, "expanded": context["expanded"], "source_url": context["source_url"]})
            links.append({"label": context["expanded"], "url": context["source_url"], "description": context["description"]})
            notes.append(f"{acronym} refers to {context['expanded']}. {context['description']}")
    return " ".join(notes), expansions, links


def normalize_license(value: str) -> tuple[str, str]:
    text = value.strip()
    if not text:
        return "not-specified", "Not specified"
    low = text.lower()
    if "nationalarchives.gov.uk/doc/open-government-licence" in low or "open government licence" in low or "ogl" in low:
        return "open-government-licence-v3", "Open Government Licence v3.0"
    parsed_host = host(text)
    if parsed_host:
        return slugify(parsed_host), parsed_host
    return slugify(text), text


def classify_topics(row: dict[str, str]) -> list[str]:
    text = " ".join([row.get("name", ""), row.get("description", ""), row.get("provider", "")]).lower()
    topics = [label for label, pattern in TOPIC_RULES if re.search(pattern, text)]
    return topics or ["Public administration"]


def classify_styles(row: dict[str, str]) -> list[str]:
    text = " ".join([row.get("name", ""), row.get("description", ""), row.get("url", ""), row.get("documentation", "")]).lower()
    styles = [label for label, pattern in STYLE_RULES if re.search(pattern, text)]
    if not styles:
        styles.append("REST/HTTP")
    return styles


def classify_access(row: dict[str, str]) -> str:
    text = " ".join([row.get("name", ""), row.get("description", ""), row.get("documentation", "")]).lower()
    if "no api key" in text or "no requirement for registration" in text or "open and unrestricted" in text:
        return "anonymous"
    if "oauth" in text:
        return "oauth2"
    if "api key" in text or "subscription key" in text:
        return "api-key"
    if "approval" in text or "approved" in text or "register" in text:
        return "approval-required"
    return "unknown"


def classify_visibility(row: dict[str, str]) -> str:
    text = " ".join([row.get("description", ""), row.get("documentation", "")]).lower()
    if "internal-only" in text or "internal only" in text:
        return "catalogue-listed-internal-component"
    if "not publicly accessible" in text or "approval" in text or "approved" in text:
        return "catalogue-listed-restricted"
    return "catalogue-listed-access-not-assumed"


def classify_contract_status(row: dict[str, str]) -> str:
    text = " ".join([row.get("url", ""), row.get("documentation", ""), row.get("description", "")]).lower()
    if "openapi" in text or "swagger" in text:
        return "openapi-indicated"
    if "asyncapi" in text:
        return "asyncapi-indicated"
    if "wsdl" in text:
        return "wsdl-indicated"
    if row.get("documentation", "").strip():
        return "documentation-only"
    return "undocumented-in-catalogue"


def classify_family(provider_slug: str, title: str) -> str:
    text = f"{provider_slug} {title}".lower()
    if re.search(r"\b(nhs|health|hospital|ambulance|care)\b", text):
        return "health"
    if re.search(r"\b(council|borough|county|district|city|combined-authority|mayor)\b", text):
        return "local government"
    if re.search(r"\b(department|ministry|office|hmrc|cabinet|treasury|home-office|defra|dwp|ofsted)\b", text):
        return "central government"
    if re.search(r"\b(environment|natural|forestry|geological|met-office|ordnance|statistics|ons|research)\b", text):
        return "environment and science"
    return "other public body"


def lifecycle_status(row: dict[str, str]) -> str:
    if row.get("endDate", "").strip():
        return "retired-or-ended"
    if row.get("startDate", "").strip():
        return "active"
    return "catalogue-listed"


def quality_metrics(row: dict[str, str], styles: list[str], access_model: str, contract_status: str) -> dict[str, Any]:
    discoverability = sum(bool(row.get(key, "").strip()) for key in ["name", "description", "url", "provider"]) / 4
    documentation = 1.0 if row.get("documentation", "").strip() else 0.2
    contract = 1.0 if contract_status.endswith("indicated") else 0.45 if contract_status == "documentation-only" else 0.1
    access = 0.85 if access_model != "unknown" else 0.25
    lifecycle = sum(bool(row.get(key, "").strip()) for key in ["dateAdded", "dateUpdated"]) / 2
    interoperability = 0.75 if styles else 0.25
    overall = (discoverability + documentation + contract + access + lifecycle + interoperability) / 6
    return {
        "overall": round(overall, 3),
        "metrics": {
            "discoverability": round(discoverability, 3),
            "documentation": documentation,
            "contract_signal": contract,
            "access_clarity": access,
            "lifecycle_metadata": lifecycle,
            "interoperability_signal": interoperability,
        },
        "notes": [
            "Scores are deterministic catalogue-metadata signals, not assurance results.",
            "No credentials or live API calls are stored or executed by this bundle.",
        ],
    }


def read_source(source: str) -> tuple[str, bytes]:
    if re.match(r"^https?://", source):
        with urlopen(source, timeout=30) as response:
            return source, response.read()
    path = Path(source)
    return path.resolve().as_uri(), path.read_bytes()


def load_rows(source: str) -> tuple[str, str, list[SourceRow]]:
    source_url, raw = read_source(source)
    source_hash = hashlib.sha256(raw).hexdigest()
    text = raw.decode("utf-8-sig")
    rows: list[SourceRow] = []
    seen: Counter[str] = Counter()
    for ordinal, raw_row in enumerate(csv.DictReader(text.splitlines())):
        row = {key: (value or "").strip() for key, value in raw_row.items()}
        name = row.get("name", "") or f"API {ordinal + 1}"
        provider = slugify(row.get("provider", "") or "unknown-provider", "unknown-provider")
        base = f"{provider}-{slugify(name, 'api')}"
        seen[base] += 1
        slug = base if seen[base] == 1 else f"{base}-{seen[base]}"
        rows.append(SourceRow(ordinal=ordinal, raw=row, slug=slug, provider=provider, provider_title=provider_title(provider)))
    return source_url, source_hash, rows


def facet_values(api: dict[str, Any], key: str) -> list[str]:
    value = api.get(key)
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(item) for item in value if item not in {"", None}]
    return [str(value)]


def facet_counts(apis: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    for api in apis:
        counts.update(facet_values(api, key))
    return [{"value": value, "count": count} for value, count in counts.most_common()]


def entropy(counts: list[int]) -> float:
    total = sum(counts)
    if total <= 0:
        return 0.0
    value = 0.0
    for count in counts:
        p = count / total
        value -= p * math.log2(p)
    return value


def facet_analysis(apis: list[dict[str, Any]], key: str, label: str, control: str, recommendation: str) -> dict[str, Any]:
    rows = facet_counts(apis, key)
    total = len(apis) or 1
    covered = sum(1 for api in apis if facet_values(api, key))
    counts = [row["count"] for row in rows]
    top_share = max(counts) / total if counts else 0.0
    expected_reduction = 1.0 - sum((count / total) ** 2 for count in counts) if counts else 0.0
    return {
        "key": key,
        "label": label,
        "coverage": round(covered / total, 4),
        "cardinality": len(rows),
        "top_share": round(top_share, 4),
        "entropy": round(entropy(counts), 4),
        "expected_reduction": round(expected_reduction, 4),
        "recommended_control": control,
        "recommendation": recommendation,
        "hierarchy_available": key == "publisher",
        "values": rows[:16],
    }


def tokenize(value: str) -> list[str]:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower()
    tokens: list[str] = []
    seen: set[str] = set()
    for match in re.finditer(r"[a-z0-9][a-z0-9._-]*", text):
        token = match.group(0).strip("._-")
        if len(token) < 2 or token in STOP_WORDS or token in seen:
            continue
        seen.add(token)
        tokens.append(token)
    return tokens


def search_shard(value: str, length: int = 2) -> str:
    clean = re.sub(r"[^a-z0-9]", "", value.lower())
    return clean[:length] or "_"


def search_docs(apis: list[dict[str, Any]]) -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    for ordinal, api in enumerate(apis):
        docs.append(
            {
                "ordinal": ordinal,
                "name": api["name"],
                "title": api["title"],
                "publisher": api["publisher"],
                "publisher_title": api["publisher_title"],
                "resource_count": api["resource_count"],
                "formats": api["formats"],
                "tags": api["tags"],
                "topics": api["topics"],
                "quality_score": api["quality"]["overall"],
                "timestamp": api.get("timestamp", ""),
                "notes": api.get("notes", ""),
                "context_note": api.get("context_note", ""),
                "endpoint_host": api.get("endpoint_host", ""),
                "documentation_host": api.get("documentation_host", ""),
                "access_model": api.get("access_model", ""),
                "contract_status": api.get("contract_status", ""),
                "documentation": api.get("documentation", ""),
                "url": api.get("url", ""),
                "open": api["route"],
            }
        )
    return docs


def build_search(apis: list[dict[str, Any]]) -> dict[str, str]:
    result_docs = search_docs(apis)
    postings: dict[str, dict[int, list[int]]] = defaultdict(dict)
    weights = {"title": 16, "publisher": 8, "context": 6, "description": 5, "topics": 4, "tags": 3, "url": 2}
    masks = {"title": 1, "publisher": 2, "context": 4, "description": 8, "topics": 16, "tags": 32, "url": 64}
    for doc in result_docs:
        fields = {
            "title": doc["title"],
            "publisher": doc["publisher_title"],
            "description": doc.get("notes", ""),
            "context": doc.get("context_note", ""),
            "topics": " ".join(doc.get("topics", [])),
            "tags": " ".join(doc.get("tags", [])),
            "url": " ".join(str(doc.get(key, "")) for key in ["open", "url", "documentation", "endpoint_host", "documentation_host"]),
        }
        for field, value in fields.items():
            for token in tokenize(str(value)):
                score, mask = postings[token].get(doc["ordinal"], [0, 0])
                postings[token][doc["ordinal"]] = [score + weights[field], mask | masks[field]]

    postings_path = "data/search/postings-0.json"
    lexicon_rows = [
        {"token": token, "df": len(rows), "postings": postings_path}
        for token, rows in sorted(postings.items(), key=lambda item: item[0])
    ]
    lexicon_by_shard: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in lexicon_rows:
        lexicon_by_shard[search_shard(row["token"])].append(row)

    prefix_payloads: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    for row in lexicon_rows:
        token = row["token"]
        for length in range(3, min(8, len(token)) + 1):
            prefix = token[:length]
            prefix_payloads[search_shard(prefix)][prefix].append({"token": token, "df": row["df"]})
    for payload in prefix_payloads.values():
        for prefix, rows in payload.items():
            payload[prefix] = sorted(rows, key=lambda item: (-item["df"], item["token"]))[:16]

    return {
        "manifest": {
            "schema": "okf-static-search.v1",
            "token_min_length": 2,
            "prefix_min_length": 3,
            "lexicon_shard_length": 2,
            "result_limit": 200,
            "result_doc_chunk_size": 1000,
            "weights": weights,
            "field_masks": masks,
            "counts": {"documents": len(result_docs), "tokens": len(lexicon_rows), "postings": sum(len(rows) for rows in postings.values())},
            "entrypoints": {
                "lexicon": {shard: f"data/search/lexicon/{shard}.json" for shard in sorted(lexicon_by_shard)},
                "prefixes": {shard: f"data/search/prefixes/{shard}.json" for shard in sorted(prefix_payloads)},
                "postings": [postings_path],
                "result_docs": ["data/search/results-0.json"],
                "facets": "data/facets.json",
                "doc_map": "data/search/doc-map.json",
            },
        },
        "lexicon": dict(sorted(lexicon_by_shard.items())),
        "prefixes": {shard: dict(sorted(payload.items())) for shard, payload in sorted(prefix_payloads.items())},
        "postings": {"tokens": {token: [[ordinal, score_mask[0], score_mask[1]] for ordinal, score_mask in sorted(rows.items())] for token, rows in sorted(postings.items())}},
        "result_docs": result_docs,
        "doc_map": {str(doc["ordinal"]): doc["open"] for doc in result_docs},
    }


def build_corpus(rows: list[SourceRow], source_url: str, source_hash: str) -> dict[str, Any]:
    latest_date = max((row.raw.get("dateUpdated") or row.raw.get("dateAdded") or "1970-01-01" for row in rows), default="1970-01-01")
    generated_at = f"{latest_date}T00:00:00Z"
    apis: list[dict[str, Any]] = []
    resources: list[dict[str, Any]] = []
    relationships: list[dict[str, Any]] = []
    publisher_counts: Counter[str] = Counter()
    publisher_resources: Counter[str] = Counter()

    for source_row in rows:
        row = source_row.raw
        styles = classify_styles(row)
        topics = classify_topics(row)
        access_model = classify_access(row)
        visibility = classify_visibility(row)
        contract_status = classify_contract_status(row)
        licence_id, licence_title = normalize_license(row.get("license", ""))
        endpoint_host = host(row.get("url", ""))
        documentation_host = host(row.get("documentation", ""))
        context_note, acronym_expansions, context_links = context_for_row(row)
        family = classify_family(source_row.provider, source_row.provider_title)
        status = lifecycle_status(row)
        area_served = row.get("areaServed", "") or "not-specified"
        route = f"dataset/{source_row.slug}"
        api_resources: list[str] = []

        def add_resource(kind: str, title: str, url: str, fmt: str) -> None:
            if not url:
                return
            rid = f"{source_row.slug}-{kind}"
            resources.append(
                {
                    "id": rid,
                    "dataset": source_row.slug,
                    "name": title,
                    "description": f"{kind.replace('_', ' ').title()} for {row.get('name', '')}",
                    "format": fmt,
                    "source_format": fmt,
                    "format_confidence": 1.0,
                    "concept_id": f"api-resources/{source_row.provider}/{source_row.slug}/{kind}.md",
                    "route": f"resource/{rid}",
                    "dataset_concept_id": f"api-products/{source_row.provider}/{source_row.slug}.md",
                    "provenance": {"source": "GOV.UK API Catalogue", "source_url": source_url, "source_sha256": source_hash},
                    "host": host(url),
                    "url": url,
                    "resource_type": kind,
                    "position": len(api_resources),
                    "created": row.get("dateAdded", ""),
                    "metadata_modified": row.get("dateUpdated", ""),
                    "last_modified": row.get("dateUpdated", ""),
                    "schema_type": contract_status if kind == "documentation" else "",
                    "schema_url": url if contract_status.endswith("indicated") and kind == "documentation" else "",
                }
            )
            api_resources.append(rid)
            relationships.append({"source": route, "target": f"resource/{rid}", "kind": "has endpoint" if kind == "endpoint" else f"has {kind}"})

        add_resource("endpoint", f"Endpoint: {row.get('name', '')}", row.get("url", ""), "HTTP endpoint")
        add_resource("documentation", f"Documentation: {row.get('name', '')}", row.get("documentation", ""), "Documentation")
        add_resource("licence", f"Licence: {licence_title}", row.get("license", ""), "Licence")

        tags = sorted({slugify(topic) for topic in topics} | {slugify(style) for style in styles} | {source_row.provider})
        quality = quality_metrics(row, styles, access_model, contract_status)
        api = {
            "id": row.get("url", "") or source_row.slug,
            "name": source_row.slug,
            "title": row.get("name", "") or source_row.slug,
            "notes": row.get("description", ""),
            "context_note": context_note,
            "acronym_expansions": acronym_expansions,
            "context_links": context_links,
            "publisher": source_row.provider,
            "publisher_title": source_row.provider_title,
            "resource_count": len(api_resources),
            "resource_ids": api_resources,
            "formats": styles,
            "interaction_style": styles,
            "tags": tags,
            "topics": topics,
            "timestamp": row.get("dateUpdated") or row.get("dateAdded") or "",
            "metadata_created": row.get("dateAdded", ""),
            "metadata_modified": row.get("dateUpdated", ""),
            "license_id": licence_id,
            "license_title": licence_title,
            "license_source_id": row.get("license", ""),
            "license_source_title": licence_title,
            "license_confidence": 0.9 if licence_id != "not-specified" else 0.2,
            "host": endpoint_host,
            "endpoint_host": endpoint_host or "not-specified",
            "documentation_host": documentation_host or "not-specified",
            "resource_hosts": sorted({value for value in [endpoint_host, documentation_host, host(row.get("license", ""))] if value}),
            "concept_id": f"api-products/{source_row.provider}/{source_row.slug}.md",
            "route": route,
            "publisher_concept_id": f"organisations/{source_row.provider}.md",
            "quality": quality,
            "provenance": {
                "source": "GOV.UK API Catalogue CSV",
                "source_url": source_url,
                "source_sha256": source_hash,
                "source_row": source_row.ordinal + 1,
                "source_repository": "co-cddo/api-catalogue",
                "observed_status": "observed",
            },
            "url": row.get("url", ""),
            "documentation": row.get("documentation", ""),
            "maintainer": row.get("maintainer", ""),
            "area_served": area_served,
            "start_date": row.get("startDate", ""),
            "end_date": row.get("endDate", ""),
            "state": status,
            "type": "API Product",
            "isopen": licence_id == "open-government-licence-v3",
            "private": visibility != "catalogue-listed-access-not-assumed",
            "extras": {
                "visibility": visibility,
                "access_model": access_model,
                "contract_status": contract_status,
                "organisation_family": family,
                "sample_policy": {
                    "static_examples": False,
                    "mock_available": False,
                    "sandbox_available": False,
                    "live_try_available": False,
                    "side_effectful": None,
                    "requires_approval": access_model in {"approval-required", "unknown"},
                    "secret_value_stored_in_okf": False,
                },
            },
            "visibility": visibility,
            "access_model": access_model,
            "contract_status": contract_status,
            "lifecycle_status": status,
            "organisation_family": family,
            "areaServed": area_served,
            "groups": [{"title": topic} for topic in topics],
        }
        apis.append(api)
        publisher_counts[source_row.provider] += 1
        publisher_resources[source_row.provider] += len(api_resources)
        relationships.append({"source": route, "target": f"publisher/{source_row.provider}", "kind": "published by"})
        if contract_status != "undocumented-in-catalogue":
            relationships.append({"source": route, "target": f"contract-status/{contract_status}", "kind": "has contract signal"})
        relationships.append({"source": route, "target": f"access-model/{access_model}", "kind": "uses access model"})
        for style in styles:
            relationships.append({"source": route, "target": f"interaction-style/{style}", "kind": "uses interaction style"})

    publishers = [
        {
            "id": provider,
            "name": provider,
            "title": provider_title(provider),
            "description": f"Provider in the GOV.UK API Catalogue with {publisher_counts[provider]} listed API products.",
            "dataset_count": publisher_counts[provider],
            "resource_count": publisher_resources[provider],
            "concept_id": f"organisations/{provider}.md",
            "route": f"publisher/{provider}",
            "provenance": {"source": "GOV.UK API Catalogue CSV", "source_url": source_url, "source_sha256": source_hash},
            "state": "catalogue-listed",
            "approval_status": "not-assessed",
            "type": classify_family(provider, provider_title(provider)),
        }
        for provider in sorted(publisher_counts)
    ]

    facet_keys = [
        ("publisher", "Provider", "searchable-select", "primary"),
        ("organisation_family", "Organisation family", "chips", "primary"),
        ("topic", "Domain", "chips", "primary"),
        ("interaction_style", "Interaction style", "chips", "primary"),
        ("access_model", "Access model", "chips", "primary"),
        ("visibility", "Visibility", "chips", "secondary"),
        ("contract_status", "Contract status", "chips", "primary"),
        ("lifecycle_status", "Lifecycle status", "chips", "secondary"),
        ("documentation_host", "Documentation host", "searchable-select", "advanced"),
        ("endpoint_host", "Endpoint host", "searchable-select", "advanced"),
        ("license", "Licence", "chips", "secondary"),
        ("update_year", "Update year", "histogram", "secondary"),
        ("area_served", "Area served", "chips", "secondary"),
    ]

    # Derived facet fields expected by the generic Explorer reducer.
    for api in apis:
        api["topic"] = api["topics"]
        api["license"] = api["license_id"]
        api["update_year"] = str(api.get("metadata_modified") or api.get("timestamp") or "")[:4] or "not-specified"

    facets = {key: facet_counts(apis, key) for key, *_ in facet_keys}
    facets["resource_type"] = [{"value": value, "count": count} for value, count in Counter(resource["resource_type"] for resource in resources).most_common()]
    facets["format"] = facet_counts(apis, "formats")
    facets["host"] = facet_counts(apis, "endpoint_host")

    analysis_facets = [facet_analysis(apis, key, label, control, rec) for key, label, control, rec in facet_keys]
    family_groups: dict[str, Counter[str]] = defaultdict(Counter)
    for api in apis:
        family_groups[api["organisation_family"]][api["publisher"]] += 1
    hierarchies = [
        {
            "id": "hierarchy/provider-family",
            "label": "Organisation family to provider",
            "facet": "publisher",
            "levels": ["organisation family", "provider"],
            "values": [
                {
                    "id": f"facet/organisation_family/{family}",
                    "label": family,
                    "count": sum(providers.values()),
                    "route": f"facet/organisation_family/{family}",
                    "children": [
                        {"id": f"facet/publisher/{provider}", "label": provider_title(provider), "count": count, "route": f"facet/publisher/{provider}"}
                        for provider, count in providers.most_common(8)
                    ],
                }
                for family, providers in sorted(family_groups.items())
            ],
        }
    ]

    top_publishers = [
        {"id": publisher["name"], "label": publisher["title"], "dataset_count": publisher["dataset_count"], "resource_count": publisher["resource_count"]}
        for publisher in sorted(publishers, key=lambda item: (-int(item["dataset_count"]), item["title"]))[:16]
    ]
    recent = sorted(apis, key=lambda item: item.get("timestamp", ""), reverse=True)[:16]
    graph_nodes = [{"id": "corpus/overview", "label": "UK Government APIs", "type": "corpus", "count": len(apis)}]
    for key in ["organisation_family", "interaction_style", "topic", "access_model", "contract_status"]:
        for row in facets.get(key, [])[:6]:
            graph_nodes.append({"id": f"facet/{key}/{row['value']}", "label": row["value"], "type": key, "count": row["count"]})
    graph_edges = [{"source": "corpus/overview", "target": node["id"], "label": "summarised by", "count": node.get("count")} for node in graph_nodes[1:]]

    relationship_counts = Counter(row["kind"] for row in relationships)
    analysis = {
        "schema": "okf-explorer-analysis.v1",
        "generated_at": generated_at,
        "source_bundle": "okf-explorer.json",
        "summary": {
            "title": "UK Government APIs overview",
            "description": "Catalogue-derived operational view of UK public-sector API products, providers, access signals, documentation, lifecycle metadata, and quality gaps.",
            "record_count": len(apis),
            "resource_count": len(resources),
            "relationship_count": len(relationships),
            "notices": [
                "This is an observed public catalogue view, not an assurance register.",
                "API inclusion does not imply public accessibility; access conditions stay explicit.",
                "No API keys, client secrets, tokens, certificates, or live calls are stored in the OKF bundle.",
            ],
        },
        "graph_overview": {"nodes": graph_nodes, "edges": graph_edges},
        "timeline_overview": {
            "buckets": [
                {
                    "id": f"year:{year}",
                    "label": year,
                    "count": count,
                    "route": f"facet/update_year/{year}",
                    "samples": [doc for doc in search_docs([api for api in apis if api["update_year"] == year])[:2]],
                }
                for year, count in Counter(api["update_year"] for api in apis if api["update_year"] != "not-specified").most_common()
            ]
        },
        "relationship_overview": {
            "types": [
                {
                    "kind": kind,
                    "count": count,
                    "samples": [
                        {"source": rel["source"], "target": rel["target"], "label": kind}
                        for rel in relationships
                        if rel["kind"] == kind
                    ][:2],
                }
                for kind, count in relationship_counts.most_common()
            ],
            "top_connected": [
                {"id": f"publisher/{publisher['name']}", "label": publisher["title"], "type": "publisher", "count": publisher["dataset_count"]}
                for publisher in sorted(publishers, key=lambda item: (-int(item["dataset_count"]), item["title"]))[:12]
            ],
        },
        "resource_overview": {
            "total_resources": len(resources),
            "high_resource_datasets": [
                {"route": api["route"], "label": api["title"], "count": api["resource_count"], "publisher": api["publisher_title"]}
                for api in sorted(apis, key=lambda item: (-int(item["resource_count"]), item["title"]))[:16]
            ],
            "distributions": {
                "resource_type": facets["resource_type"],
                "interaction_style": facets["interaction_style"],
                "documentation_host": facets["documentation_host"][:16],
                "endpoint_host": facets["endpoint_host"][:16],
            },
        },
        "facet_analysis": analysis_facets,
        "hierarchies": hierarchies,
        "ontology_candidates": [
            {
                "id": "schema.org/APIReference",
                "label": "schema.org APIReference",
                "confidence": 0.68,
                "coverage": 1.0,
                "classes": ["APIReference", "WebAPI", "Organization", "CreativeWork"],
                "properties": ["provider", "documentation", "license", "dateModified"],
                "notes": ["Useful for publication semantics; not sufficient for executable API contracts."],
            }
        ],
        "narrative": {
            "title": "UK Government APIs as an OKF control-plane view",
            "body": "This exemplar treats the public API Catalogue as a seed inventory and turns each row into an API Product concept with provider, documentation, endpoint, access, lifecycle, contract-signal, and quality metadata. It deliberately records access requirements and evidence while excluding secrets and live execution.",
        },
    }

    overview = {
        "schema": "okf-large-overview.v1",
        "title": "UK Government APIs",
        "generated_at": generated_at,
        "counts": {
            "datasets": len(apis),
            "resources": len(resources),
            "publishers": len(publishers),
            "relationships": len(relationships),
            "api_products": len(apis),
            "api_resources": len(resources),
            "providers": len(publishers),
        },
        "top_publishers": top_publishers,
        "recent_datasets": search_docs(recent),
        "format_counts": facets["interaction_style"],
        "facet_previews": {key: rows[:18] for key, rows in facets.items()},
        "notices": analysis["summary"]["notices"],
    }

    search = build_search(apis)
    manifest = {
        "title": "UK Government APIs static corpus",
        "generated_at": generated_at,
        "counts": overview["counts"],
        "indexes": {
            "overview": "data/overview.json",
            "analysis": "data/analysis/overview.json",
            "search": "data/search/manifest.json",
            "facets": "data/facets.json",
            "graph": "data/graph.json",
        },
        "chunks": {
            "datasets": ["data/apis-0.json"],
            "resources": ["data/resources-0.json"],
            "publishers": ["data/providers-0.json"],
            "relationships": ["data/relationships-0.json"],
        },
        "performance": {
            "startup_mode": "overview-first",
            "full_record_hydration": "lazy",
            "relationship_hydration": "lazy",
            "search": "static worker shards",
        },
        "search": {
            "schema": search["manifest"]["schema"],
            "documents": len(apis),
            "tokens": search["manifest"]["counts"]["tokens"],
            "result_limit": search["manifest"]["result_limit"],
        },
    }
    descriptor = {
        "schema": "okf-explorer-large-corpus.v1",
        "kind": "okf-large-corpus",
        "title": "UK Government APIs OKF",
        "description": "Large-corpus OKF exemplar generated from the GOV.UK API Catalogue, with API-domain facets, typed relationships, search shards, and operational metadata.",
        "generated_at": generated_at,
        "entrypoints": {
            "viewer": "../next/",
            "data_manifest": "data/manifest.json",
            "overview_index": "data/overview.json",
            "analysis_overview": "data/analysis/overview.json",
            "search_manifest": "data/search/manifest.json",
            "notes": "../sources/UK-Government-API-OKF.md",
        },
        "counts": overview["counts"],
        "performance": manifest["performance"],
        "source": {
            "title": "GOV.UK API Catalogue",
            "url": "https://www.api.gov.uk/",
            "data_url": source_url,
            "source_sha256": source_hash,
            "license": "Open Government Licence v3.0 unless otherwise stated",
        },
        "vocabulary": {
            "record_singular": "API product",
            "record_plural": "API products",
            "resource_singular": "API evidence",
            "resource_plural": "API evidence",
            "publisher_singular": "provider",
            "publisher_plural": "providers",
            "format_plural": "interaction styles",
            "resource_stack_label": "Evidence stack",
            "search_placeholder": "Search API products, providers, documentation, domains",
        },
        "extensions": {
            "okf-explorer-analysis.v1": {"mode": "external", "entrypoint": "analysis_overview"},
            "okf-api-catalogue.v1": {
                "mode": "derived",
                "source": "GOV.UK API Catalogue CSV",
                "secret_values_stored": False,
                "live_calls_enabled": False,
            },
        },
    }
    graph = {
        "node_counts": {"dataset": len(apis), "resource": len(resources), "publisher": len(publishers)},
        "edge_counts": [{"kind": kind, "count": count} for kind, count in relationship_counts.most_common()],
        "relationship_index": "data/relationships-0.json",
        "top_publishers": top_publishers,
    }
    return {
        "descriptor": descriptor,
        "manifest": manifest,
        "overview": overview,
        "analysis": analysis,
        "apis": apis,
        "resources": resources,
        "publishers": publishers,
        "relationships": relationships,
        "facets": facets,
        "graph": graph,
        "search": search,
    }


def render_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def output_files(corpus: dict[str, Any]) -> dict[Path, str]:
    files = {
        Path("okf-explorer.json"): render_json(corpus["descriptor"]),
        Path("data/manifest.json"): render_json(corpus["manifest"]),
        Path("data/overview.json"): render_json(corpus["overview"]),
        Path("data/analysis/overview.json"): render_json(corpus["analysis"]),
        Path("data/apis-0.json"): render_json(corpus["apis"]),
        Path("data/resources-0.json"): render_json(corpus["resources"]),
        Path("data/providers-0.json"): render_json(corpus["publishers"]),
        Path("data/relationships-0.json"): render_json(corpus["relationships"]),
        Path("data/facets.json"): render_json(corpus["facets"]),
        Path("data/graph.json"): render_json(corpus["graph"]),
        Path("data/search/manifest.json"): render_json(corpus["search"]["manifest"]),
        Path("data/search/postings-0.json"): render_json(corpus["search"]["postings"]),
        Path("data/search/results-0.json"): render_json(corpus["search"]["result_docs"]),
        Path("data/search/doc-map.json"): render_json(corpus["search"]["doc_map"]),
    }
    for shard, rows in corpus["search"]["lexicon"].items():
        files[Path(f"data/search/lexicon/{shard}.json")] = render_json(rows)
    for shard, payload in corpus["search"]["prefixes"].items():
        files[Path(f"data/search/prefixes/{shard}.json")] = render_json(payload)
    return files


def write_files(output: Path, files: dict[Path, str]) -> None:
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for rel_path, content in files.items():
        target = output / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")


def check_files(output: Path, files: dict[Path, str]) -> list[str]:
    errors: list[str] = []
    for rel_path, expected in sorted(files.items()):
        target = output / rel_path
        if not target.exists():
            errors.append(f"{target.relative_to(ROOT)} is missing")
            continue
        current = target.read_text(encoding="utf-8")
        if current != expected:
            diff = "\n".join(
                difflib.unified_diff(
                    current.splitlines(),
                    expected.splitlines(),
                    fromfile=f"{target.relative_to(ROOT)} (current)",
                    tofile=f"{target.relative_to(ROOT)} (generated)",
                    lineterm="",
                    n=3,
                )
            )
            errors.append(f"{target.relative_to(ROOT)} is out of date:\n{diff}")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=DEFAULT_SOURCE_URL, help="CSV source path or URL")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="generated corpus directory")
    parser.add_argument("--check", action="store_true", help="fail if generated files are not synchronized")
    args = parser.parse_args(argv)

    output = args.output if args.output.is_absolute() else ROOT / args.output
    source_url, source_hash, rows = load_rows(args.source)
    corpus = build_corpus(rows, source_url, source_hash)
    files = output_files(corpus)
    if args.check:
        errors = check_files(output, files)
        if errors:
            print("UK Government API OKF check failed:", file=sys.stderr)
            for error in errors[:12]:
                print(f"- {error}", file=sys.stderr)
            if len(errors) > 12:
                print(f"- ... {len(errors) - 12} more differences", file=sys.stderr)
            return 1
        print(f"UK Government API OKF is synchronized with {len(corpus['apis'])} API products")
        return 0
    write_files(output, files)
    print(f"wrote {output.relative_to(ROOT)} with {len(corpus['apis'])} API products")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
