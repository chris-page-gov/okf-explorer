#!/usr/bin/env python3
"""Build a large-corpus OKF exemplar for UK Government data-access APIs."""

from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import heapq
import html
import json
import math
import re
import sys
import time
import unicodedata
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import parse_qsl, urlencode, urlparse, urlsplit, urlunsplit
from urllib.request import Request, urlopen

# datetime.UTC is Python 3.11+; keep the script runnable on Python 3.10.
UTC = timezone.utc

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "uk-government-apis"
DEFAULT_SOURCE_URL = "https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv"
DEFAULT_CKAN_API_URL = "https://ckan.publishing.service.gov.uk/api/3/action/package_search"
DEFAULT_OS_API_ROOT = "https://api.os.uk/"
DEFAULT_ONS_API_ROOT = "https://api.beta.ons.gov.uk/v1"
OGL_V3_ID = "open-government-licence-v3"
OGL_V3_TITLE = "Open Government Licence v3.0"
OGL_V3_URL = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
ONS_TERMS_URL = "https://www.ons.gov.uk/help/terms-conditions#using-ons-content"
OS_LICENCE_ID = "ordnance-survey-licence-required"
OS_LICENCE_TITLE = "Ordnance Survey licence required"
OS_LICENCE_URL = "https://www.ordnancesurvey.co.uk/licensing"
REQUEST_HEADERS = {"User-Agent": "OKF Explorer UK Government API bundle generator"}
MAX_CHECK_DIFF_LINES = 400
MAX_CHECK_DIFF_BYTES = 200_000
SEARCH_RESULT_DOC_CHUNK_SIZE = 1000
MAX_SEARCH_POSTINGS_PER_TOKEN = 2000
MAX_SEARCH_NOTES_CHARS = 360
MAX_SEARCH_CONTEXT_CHARS = 180
MAX_SEARCH_URL_CHARS = 500
MAX_RECORD_NOTES_CHARS = 1200
MARKDOWN_RECORD_TYPES = {"API Product", "Provider API Portal", "API Operation", "Schema", "Contract", "Capability Document"}
CONTRACT_SOURCE_STATUSES = {"capability-document", "openapi-indicated", "wsdl-indicated", "dataset-api", "code-list", "taxonomy"}
CONTRACT_PROTOCOLS = {"WMS", "WFS", "WMTS", "WCS", "OGC API", "SPARQL", "OpenAPI", "SOAP/WSDL"}
STANDARDS_REFERENCES = [
    {
        "id": "dcat-3",
        "title": "Data Catalog Vocabulary (DCAT) Version 3",
        "short_title": "DCAT 3",
        "url": "https://www.w3.org/TR/vocab-dcat-3/",
        "local_concept": "../standards/dcat.md",
        "role": "Catalogue vocabulary for DataService, Dataset, endpoint, licence, publisher and provenance metadata.",
    },
    {
        "id": "dcat-ap-3",
        "title": "DCAT Application Profile for data portals in Europe 3.0.0",
        "short_title": "DCAT-AP 3.0.0",
        "url": "https://semiceu.github.io/DCAT-AP/releases/3.0.0/",
        "local_concept": "../standards/dcat-ap.md",
        "role": "Application profile used to make DCAT catalogue records federatable across data portals.",
    },
    {
        "id": "openapi-3",
        "title": "OpenAPI Specification",
        "short_title": "OpenAPI 3",
        "url": "https://spec.openapis.org/oas/v3.2.0.html",
        "local_concept": "../standards/openapi.md",
        "role": "Executable HTTP API contract vocabulary for servers, paths, operations, schemas and security schemes.",
    },
    {
        "id": "dqv",
        "title": "Data Quality Vocabulary",
        "short_title": "DQV",
        "url": "https://www.w3.org/TR/vocab-dqv/",
        "local_concept": "../standards/dqv.md",
        "role": "Companion vocabulary for quality annotations where OKF metadata-quality signals need standards context.",
    },
    {
        "id": "prov-o",
        "title": "PROV-O",
        "short_title": "PROV",
        "url": "https://www.w3.org/TR/prov-o/",
        "local_concept": "../standards/w3c-prov.md",
        "role": "Provenance model for harvest activity, source adapter and observation metadata.",
    },
]
DCAT_TYPE_BY_RECORD_TYPE = {
    "API Product": "dcat:DataService",
    "Data Access API Endpoint": "dcat:DataService",
    "Data Product": "dcat:Dataset",
    "API Operation": "dcat:DataService endpoint",
    "Provider API Portal": "dcat:Catalog landing page",
    "Capability Document": "dcterms:Standard",
    "Contract": "dcterms:Standard",
    "Schema": "dcterms:Standard",
}
OPENAPI_TYPE_BY_RECORD_TYPE = {
    "API Product": "OpenAPI Object",
    "Data Access API Endpoint": "Server Object or Path Item",
    "Data Product": "external data asset",
    "API Operation": "Operation Object",
    "Provider API Portal": "externalDocs",
    "Capability Document": "OpenAPI Description or external contract",
    "Contract": "OpenAPI Description or external contract",
    "Schema": "Schema Object",
}
OPENAPI_SECURITY_SCHEME_BY_ACCESS_MODEL = {
    "anonymous": "none",
    "open": "none",
    "api-key": "apiKey",
    "oauth2": "oauth2",
    "approval-required": "metadata-only",
    "unknown": "unknown",
}

API_LIKE_CKAN_FORMATS = [
    "WMS",
    "WFS",
    "WMTS",
    "WCS",
    "OGC API - Features",
    "OGC WFS",
    "OGC WMS",
    "ogc wfs",
    "ogc wms",
    "ArcGIS GeoServices REST API",
    "arcgis geoservices rest api",
    "Esri REST",
    "ESRI REST API",
    "ESRI Rest API",
    "esri rest api",
    "SPARQL",
    "API",
    "api",
]
API_LIKE_FORMAT_LOOKUP = {value.casefold(): value for value in API_LIKE_CKAN_FORMATS}

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
    ("Geospatial", r"\b(geo|map|mapping|address|postcode|uprn|usrn|os |ordnance|places|gazetteer|arcgis|wms|wfs|ogc)\b"),
    ("Planning and property", r"\b(land|property|planning|building|energy performance|epc|registry|register|address)\b"),
    ("Business and economy", r"\b(company|companies|business|trade|tariff|quota|commercial|insolvency|economy)\b"),
    ("Education and skills", r"\b(education|teacher|teaching|apprentice|qualification|ofqual|school)\b"),
    ("Justice and policing", r"\b(court|tribunal|prison|police|justice|offender|hmpps|crime)\b"),
    ("Government services", r"\b(gov\.uk|notify|pay|search|organisations|content|service)\b"),
    ("Population and statistics", r"\b(ons|statistics|population|census|deaths|births|labour|wellbeing|dataset)\b"),
]

STYLE_RULES = [
    ("FHIR", r"\bfhir\b"),
    ("HL7 v3", r"\bhl7\b"),
    ("SOAP/WSDL", r"\bsoap|wsdl\b"),
    ("SPARQL", r"\bsparql|linkeddata|linked data\b"),
    ("GraphQL", r"\bgraphql\b"),
    ("OGC API", r"\bogc api\b"),
    ("WMS", r"\bwms|wmts\b"),
    ("WFS", r"\bwfs|wcs\b"),
    ("ArcGIS REST", r"\barcgis|esri rest|geoservices\b"),
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
    "gov": "GOV",
    "govuk": "GOV.UK",
    "hm": "HM",
    "hmpps": "HMPPS",
    "hmrc": "HMRC",
    "mhclg": "MHCLG",
    "ngd": "NGD",
    "nhs": "NHS",
    "ons": "ONS",
    "ord": "ORD",
    "os": "OS",
    "tfl": "TfL",
    "uk": "UK",
    "wcs": "WCS",
    "wfs": "WFS",
    "wms": "WMS",
    "wmts": "WMTS",
}

# Query-string keys that commonly carry credentials in harvested metadata;
# redact_url() drops any pair whose key (case-insensitively) matches one of these.
CREDENTIAL_QUERY_PARAMS = frozenset(
    {
        "password",
        "passwd",
        "pwd",
        "token",
        "access_token",
        "apikey",
        "api_key",
        "key",
        "secret",
        "client_secret",
        "login",
        "auth",
        "authorization",
        "sig",
        "signature",
    }
)

PROVIDER_CANONICAL_ALIASES = {
    "department-for-communities-and-local-government": "ministry-of-housing-communities-and-local-government",
    "department-for-levelling-up-housing-and-communities": "ministry-of-housing-communities-and-local-government",
    "dluhc": "ministry-of-housing-communities-and-local-government",
    "mhclg": "ministry-of-housing-communities-and-local-government",
    "hydrographic-office": "uk-hydrographic-office",
    "the-hydrographic-office": "uk-hydrographic-office",
    "uk-hydrographic-office": "uk-hydrographic-office",
    "office-of-national-statistics": "office-for-national-statistics",
    "ons": "office-for-national-statistics",
    "ordnance-survey": "ordnance-survey",
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
        "Hm Revenue Customs": "HM Revenue Customs",
        "Ordnance Survey": "Ordnance Survey",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text or slug


def canonical_url(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value if re.match(r"^[a-z]+://", value, re.I) else f"https://{value}")
    scheme = (parsed.scheme or "https").lower()
    netloc = parsed.netloc.lower().removeprefix("www.")
    path = re.sub(r"/+", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/")
    query = parsed.query
    return f"{scheme}://{netloc}{path}{f'?{query}' if query else ''}"


def credential_query_param(name: str) -> bool:
    key = name.lower()
    return key in CREDENTIAL_QUERY_PARAMS or "token" in key or "secret" in key or "password" in key or key.endswith("key")


def host(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value if re.match(r"^[a-z]+://", value, re.I) else f"https://{value}")
    return parsed.netloc.lower().removeprefix("www.")


def safe_url(value: Any) -> str:
    """Return value stripped if it looks like an http(s) URL, else "" (drops javascript:, data:, mailto:, ...)."""
    text = str(value or "").strip()
    return text if re.match(r"^https?://", text, re.I) else ""


def redact_url(url: str) -> tuple[str, int]:
    """Strip credential-shaped query parameters from a harvested URL.

    Returns (url, 0) unchanged (byte-identical) when there is no query string or
    nothing to redact; otherwise returns a rebuilt URL and the number of query
    parameters that were dropped.
    """
    split = urlsplit(url)
    if not split.query:
        return url, 0
    pairs = parse_qsl(split.query, keep_blank_values=True)
    kept = [(key, value) for key, value in pairs if not credential_query_param(key)]
    dropped = len(pairs) - len(kept)
    if dropped == 0:
        return url, 0
    rebuilt = urlunsplit((split.scheme, split.netloc, split.path, urlencode(kept), split.fragment))
    return rebuilt, dropped


def now_utc() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_provider_slug(slug: str, title: str = "") -> str:
    direct = PROVIDER_CANONICAL_ALIASES.get(slug)
    if direct:
        return direct
    title_slug = slugify(title)
    return PROVIDER_CANONICAL_ALIASES.get(title_slug, slug)


def quality_band(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score >= 0.55:
        return "medium"
    if score > 0:
        return "low"
    return "not-assessed"


def data_classification_for(visibility: str, access_model: str) -> str:
    text = f"{visibility} {access_model}".lower()
    if "internal" in text or "private" in text:
        return "restricted-metadata"
    if "approval" in text or "api-key" in text or "oauth" in text:
        return "public-metadata-controlled-access"
    if "public" in text or "anonymous" in text:
        return "public-open-metadata"
    return "catalogue-metadata"


def environment_for(title: str, description: str, url: str, visibility: str) -> str:
    text = f"{title} {description} {url} {visibility}".lower()
    if "sandbox" in text or "test " in text or "staging" in text:
        return "sandbox-or-test"
    if "deprecated" in text or "retired" in text:
        return "retired"
    return "production-or-public"


def assurance_status_for(source_tier: str, confidence: str, access_model: str, contract_status: str, license_id: str) -> str:
    if confidence == "assured":
        return "assured"
    if source_tier == "provider_native_api" and access_model != "unknown" and contract_status != "undocumented-in-catalogue":
        return "assured"
    if confidence == "declared":
        return "declared"
    if license_id != "not-specified" and access_model != "unknown" and contract_status != "undocumented-in-catalogue":
        return "declared"
    return "observed"


def credential_requirements_for(access_model: str) -> list[dict[str, Any]]:
    if access_model in {"anonymous", "open"}:
        return [{"type": "none", "secret_value_stored_in_okf": False, "notes": "No credential requirement observed in public metadata."}]
    if access_model == "oauth2":
        return [
            {
                "type": "oauth2",
                "secret_ref_allowed": True,
                "secret_value_stored_in_okf": False,
                "broker_required": True,
                "notes": "OAuth credentials must be held by an external broker or secret manager.",
            }
        ]
    if access_model == "api-key":
        return [
            {
                "type": "api_key",
                "secret_ref_allowed": True,
                "secret_value_stored_in_okf": False,
                "broker_required": True,
                "notes": "API key requirement inferred from public documentation; no key value is stored.",
            }
        ]
    if access_model == "approval-required":
        return [
            {
                "type": "approval_required",
                "secret_value_stored_in_okf": False,
                "broker_required": True,
                "notes": "Access requires an approval or onboarding process before credentials are issued.",
            }
        ]
    return [{"type": "unknown", "secret_value_stored_in_okf": False, "notes": "No machine-readable credential model found in public metadata."}]


def sample_policy_for(record_type: str, access_model: str, url: str, protocols: list[str]) -> dict[str, Any] | None:
    if record_type not in {"API Operation", "API Product"}:
        return None
    return {
        "mode": "static-placeholder",
        "live_calls_enabled": False,
        "secret_values_stored_in_okf": False,
        "credential_handling": "external-broker-required" if access_model not in {"anonymous", "open"} else "no-credential-observed",
        "request_templates": [
            {
                "method": "GET",
                "url_template": url,
                "protocols": protocols,
                "notes": "Template only; execute through an approved client or credential broker.",
            }
        ]
        if url
        else [],
    }


def openapi_security_scheme(access_model: str) -> str:
    return OPENAPI_SECURITY_SCHEME_BY_ACCESS_MODEL.get(access_model, "unknown")


def standards_required_missing(
    *,
    record_type: str,
    title: str,
    description: str,
    url: str,
    documentation: str,
    publisher: str,
    license_id: str,
    access_model: str,
) -> tuple[list[str], list[str]]:
    dcat_missing: list[str] = []
    openapi_missing: list[str] = []
    if record_type in {"API Product", "Data Access API Endpoint"}:
        if not url:
            dcat_missing.append("dcat:endpointURL")
            openapi_missing.append("servers[].url")
        if not documentation:
            dcat_missing.append("dcat:endpointDescription")
            openapi_missing.append("externalDocs.url")
    if record_type == "Data Product" and not url:
        dcat_missing.append("dcat:landingPage or dcat:distribution")
    if record_type == "API Operation":
        if not url:
            openapi_missing.append("paths.<path>")
        openapi_missing.extend(["HTTP method", "parameters", "responses"])
    if not title:
        dcat_missing.append("dcterms:title")
        openapi_missing.append("info.title or operation.summary")
    if not description:
        dcat_missing.append("dcterms:description")
        openapi_missing.append("info.description or operation.description")
    if not publisher:
        dcat_missing.append("dcterms:publisher")
    if license_id in {"", "not-specified"}:
        dcat_missing.append("dcterms:license")
        openapi_missing.append("info.license")
    if record_type in {"API Product", "Data Access API Endpoint", "API Operation"} and access_model == "unknown":
        openapi_missing.append("components.securitySchemes")
    return sorted(set(dcat_missing)), sorted(set(openapi_missing))


def standards_export_status(record_type: str, dcat_missing: list[str], openapi_missing: list[str]) -> tuple[str, str]:
    if record_type == "API Operation":
        return "roll-up-to-parent-service", "operation-fragment"
    if record_type in {"Contract", "Capability Document"}:
        return "contract-reference", "contract-reference"
    if record_type == "Schema":
        return "schema-reference", "schema-reference"
    if record_type == "Provider API Portal":
        return "catalogue-landing-page", "documentation-reference"
    if record_type == "Data Product":
        return ("metadata-ready" if not dcat_missing else "metadata-gaps"), "not-openapi-native"
    dcat_status = "data-service-ready" if not dcat_missing else "data-service-with-gaps"
    openapi_status = "service-stub-ready" if not openapi_missing else "service-stub-with-gaps"
    return dcat_status, openapi_status


def standards_alignment_for_record(
    *,
    record_type: str,
    title: str,
    description: str,
    url: str,
    documentation: str,
    publisher: str,
    license_id: str,
    access_model: str,
    protocols: list[str],
) -> dict[str, Any]:
    dcat_type = DCAT_TYPE_BY_RECORD_TYPE.get(record_type, "okf:Concept")
    openapi_type = OPENAPI_TYPE_BY_RECORD_TYPE.get(record_type, "no direct OpenAPI equivalent")
    dcat_missing, openapi_missing = standards_required_missing(
        record_type=record_type,
        title=title,
        description=description,
        url=url,
        documentation=documentation,
        publisher=publisher,
        license_id=license_id,
        access_model=access_model,
    )
    dcat_status, openapi_status = standards_export_status(record_type, dcat_missing, openapi_missing)
    protocol_terms = sorted(set(protocols or []))
    return {
        "claim": "standards-alignable-not-conformant",
        "profiles": ["DCAT 3", "DCAT-AP 3.0.0", "OpenAPI 3"],
        "dcat": {
            "term": dcat_type,
            "export_status": dcat_status,
            "required_missing": dcat_missing,
            "properties": [
                "dcterms:title",
                "dcterms:description",
                "dcterms:publisher",
                "dcterms:license",
                "dcat:keyword",
                "dcat:theme",
            ]
            + (["dcat:endpointURL", "dcat:endpointDescription"] if record_type in {"API Product", "Data Access API Endpoint", "API Operation"} else []),
        },
        "openapi": {
            "term": openapi_type,
            "export_status": openapi_status,
            "required_missing": openapi_missing,
            "security_scheme_type": openapi_security_scheme(access_model),
            "protocol_terms": protocol_terms,
        },
        "notes": [
            "OKF records are source metadata and standards-alignable; generated records are not DCAT-AP RDF or complete OpenAPI descriptions unless an exporter emits those artefacts.",
            "OpenAPI operation, parameter and response schemas are only exportable where source contracts provide them.",
        ],
    }


def date_prefix(value: Any) -> str:
    match = re.search(r"\d{4}-\d{2}-\d{2}", str(value or ""))
    return match.group(0) if match else ""


def infer_observed_at(
    rows: list[SourceRow],
    ckan_packages: list[dict[str, Any]] | None = None,
    ons_datasets: list[dict[str, Any]] | None = None,
) -> str:
    dates: list[str] = []
    for source_row in rows:
        dates.extend(
            date
            for date in [date_prefix(source_row.raw.get("dateUpdated")), date_prefix(source_row.raw.get("dateAdded"))]
            if date
        )
    for package in ckan_packages or []:
        dates.extend(
            date
            for date in [date_prefix(package.get("metadata_modified")), date_prefix(package.get("metadata_created"))]
            if date
        )
        for resource in package.get("resources", []):
            dates.extend(
                date
                for date in [
                    date_prefix(resource.get("metadata_modified")),
                    date_prefix(resource.get("last_modified")),
                    date_prefix(resource.get("created")),
                ]
                if date
            )
    for dataset in ons_datasets or []:
        date = date_prefix(dataset.get("last_updated"))
        if date:
            dates.append(date)
    return f"{max(dates, default='1970-01-01')}T00:00:00Z"


def request_bytes(url: str, attempts: int = 3, backoff_seconds: float = 2.0) -> bytes:
    """Fetch a URL, retrying transient network failures with backoff."""
    last_error: Exception | None = None
    for attempt in range(attempts):
        request = Request(url, headers=REQUEST_HEADERS)
        try:
            with urlopen(request, timeout=45) as response:
                return response.read()
        except HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504):
                raise
            last_error = exc
        except Exception as exc:  # noqa: BLE001 - URLError/TimeoutError/socket errors are transient here.
            last_error = exc
        if attempt + 1 < attempts:
            time.sleep(backoff_seconds * (2**attempt))
    raise last_error  # type: ignore[misc]


def request_json(url: str) -> Any:
    return json.loads(request_bytes(url).decode("utf-8"))


def read_source(source: str) -> tuple[str, bytes]:
    if re.match(r"^https?://", source):
        return source, request_bytes(source)
    path = Path(source)
    return path.resolve().as_uri(), path.read_bytes()


def rows_from_csv(source_url: str, raw: bytes) -> tuple[str, list[SourceRow]]:
    source_hash = hashlib.sha256(raw).hexdigest()
    text = raw.decode("utf-8-sig")
    rows: list[SourceRow] = []
    seen: Counter[str] = Counter()
    for ordinal, raw_row in enumerate(csv.DictReader(text.splitlines())):
        # Ragged rows put overflow cells in a list under the None key; skip non-string cells.
        row = {key: (value or "").strip() for key, value in raw_row.items() if isinstance(key, str) and (value is None or isinstance(value, str))}
        name = row.get("name", "") or f"API {ordinal + 1}"
        provider = slugify(row.get("provider", "") or "unknown-provider", "unknown-provider")
        base = f"{provider}-{slugify(name, 'api')}"
        seen[base] += 1
        slug = base if seen[base] == 1 else f"{base}-{seen[base]}"
        rows.append(SourceRow(ordinal=ordinal, raw=row, slug=slug, provider=provider, provider_title=provider_title(provider)))
    return source_hash, rows


def load_rows(source: str) -> tuple[str, str, list[SourceRow]]:
    source_url, raw = read_source(source)
    source_hash, rows = rows_from_csv(source_url, raw)
    return source_url, source_hash, rows


def ckan_api_query() -> str:
    quoted = " OR ".join(json.dumps(value) for value in API_LIKE_CKAN_FORMATS)
    return f"res_format:({quoted})"


def load_ckan_packages(api_url: str = DEFAULT_CKAN_API_URL, rows_per_page: int = 1000, max_packages: int = 0) -> tuple[str, list[dict[str, Any]]]:
    packages: list[dict[str, Any]] = []
    start = 0
    query = ckan_api_query()
    while True:
        limit = rows_per_page
        if max_packages and len(packages) + limit > max_packages:
            limit = max_packages - len(packages)
        if limit <= 0:
            break
        # Pin the sort order so paginated harvests are deterministic across runs.
        url = f"{api_url}?{urlencode({'fq': query, 'rows': str(limit), 'start': str(start), 'sort': 'name asc'})}"
        payload = request_json(url)
        result = payload.get("result", {})
        batch = result.get("results", [])
        packages.extend(batch)
        start += len(batch)
        if not batch or start >= int(result.get("count") or 0):
            break
        if max_packages and len(packages) >= max_packages:
            break
    return f"{api_url}?fq={query}", packages


def discover_os_documents(root_url: str = DEFAULT_OS_API_ROOT, max_documents: int = 80) -> dict[str, dict[str, Any]]:
    documents: dict[str, dict[str, Any]] = {}
    queue: deque[str] = deque([root_url])
    while queue and len(documents) < max_documents:
        url = queue.popleft()
        normalized = canonical_url(url)
        if normalized in documents:
            continue
        try:
            document = request_json(url)
        except Exception as exc:  # noqa: BLE001 - source robustness belongs in provenance.
            documents[normalized] = {"title": url, "description": f"Fetch failed: {exc}", "links": [], "fetch_error": str(exc), "source_url": url}
            continue
        document["source_url"] = url
        documents[normalized] = document
        for link in document.get("links", []):
            href = str(link.get("href", ""))
            link_type = link.get("type")
            rel = link.get("rel")
            if not href.startswith("https://api.os.uk"):
                continue
            if rel not in {"api-grouping", "landing-page"}:
                continue
            if link_type != "application/json":
                continue
            if canonical_url(href) not in documents:
                queue.append(href)
    return documents


def load_ons_payloads(root_url: str = DEFAULT_ONS_API_ROOT) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    root = request_json(root_url)
    datasets = request_json(f"{root_url.rstrip('/')}/datasets?limit=1000").get("items", [])
    topics = request_json(f"{root_url.rstrip('/')}/topics").get("items", [])
    code_lists = request_json(f"{root_url.rstrip('/')}/code-lists?limit=1000").get("items", [])
    return root, datasets, topics, code_lists


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
    low = text.lower()
    simplified = re.sub(r"[-_]+", " ", low).strip()
    if not text or simplified in {"not specified", "notspecified", "licence not specified", "license not specified", "n/a", "na", "unknown", "none"}:
        return "not-specified", "Not specified"
    if (
        "nationalarchives.gov.uk/doc/open-government-licence" in low
        or "open government licence" in low
        or low in {"ogl", "uk-ogl", "ogl-uk-3.0", "ogl3", "ogl-v3", "open-government-licence-v3"}
    ):
        return OGL_V3_ID, OGL_V3_TITLE
    parsed_host = host(text)
    if parsed_host:
        return slugify(parsed_host), parsed_host
    return slugify(text), text


def normalize_license_fields(source_id: str, source_title: str = "") -> tuple[str, str, str]:
    id_value = source_id.strip()
    title_value = source_title.strip()
    id_license, id_title = normalize_license(id_value)
    title_license, title_title = normalize_license(title_value)
    if OGL_V3_ID in {id_license, title_license}:
        return OGL_V3_ID, OGL_V3_TITLE, id_value or title_value
    if id_license != "not-specified":
        return id_license, title_value or id_title, id_value or title_value
    if title_license != "not-specified":
        return title_license, title_title, id_value or title_value
    if id_value or title_value:
        source_text = id_value or title_value
        if normalize_license(source_text)[0] == "not-specified":
            return "not-specified", "Not specified", ""
        return "not-specified", "Not specified", ""
    return "not-specified", "Not specified", ""


def provider_terms_license(
    publisher: str,
    publisher_title: str,
    license_id: str,
    license_title: str,
    license_source_id: str = "",
) -> tuple[str, str, str, float, str]:
    if license_id != "not-specified":
        return license_id, license_title, license_source_id, 0.9, "source-declared"
    canonical = canonical_provider_slug(publisher, publisher_title)
    if canonical == "office-for-national-statistics":
        return OGL_V3_ID, OGL_V3_TITLE, ONS_TERMS_URL, 0.75, "provider-terms-inferred"
    if canonical == "ordnance-survey":
        return OS_LICENCE_ID, OS_LICENCE_TITLE, OS_LICENCE_URL, 0.7, "provider-terms-inferred"
    return license_id, license_title, license_source_id, 0.2, "not-specified"


def classify_topics_from_text(*values: str) -> list[str]:
    text = " ".join(value for value in values if value).lower()
    topics = [label for label, pattern in TOPIC_RULES if re.search(pattern, text)]
    return topics or ["Public administration"]


def classify_topics(row: dict[str, str]) -> list[str]:
    return classify_topics_from_text(row.get("name", ""), row.get("description", ""), row.get("provider", ""))


def classify_styles_from_text(*values: str) -> list[str]:
    text = " ".join(value for value in values if value).lower()
    styles = [label for label, pattern in STYLE_RULES if re.search(pattern, text)]
    if not styles:
        styles.append("REST/HTTP")
    return styles


def classify_styles(row: dict[str, str]) -> list[str]:
    return classify_styles_from_text(row.get("name", ""), row.get("description", ""), row.get("url", ""), row.get("documentation", ""))


def protocol_for_resource(resource_format: str, url: str = "") -> str:
    text = f"{resource_format} {url}".lower()
    if "arcgis" in text or "esri" in text or "mapserver" in text or "featureserver" in text:
        return "ArcGIS REST"
    if "ogc api" in text:
        return "OGC API"
    if "wmts" in text:
        return "WMTS"
    if "wms" in text:
        return "WMS"
    if "wfs" in text:
        return "WFS"
    if "wcs" in text:
        return "WCS"
    if "sparql" in text:
        return "SPARQL"
    if "wsdl" in text:
        return "WSDL"
    if "openapi" in text or "swagger" in text:
        return "OpenAPI"
    return "REST/HTTP"


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


def quality_metrics(
    *,
    title: str,
    description: str,
    url: str,
    documentation: str,
    publisher: str,
    styles: list[str],
    access_model: str,
    contract_status: str,
    created: str = "",
    modified: str = "",
) -> dict[str, Any]:
    discoverability = sum(bool(value.strip()) for value in [title, description, url, publisher]) / 4
    documentation_score = 1.0 if documentation.strip() else 0.2
    contract = 1.0 if contract_status.endswith("indicated") else 0.65 if contract_status in {"capability-document", "service-description"} else 0.45 if contract_status == "documentation-only" else 0.1
    access = 0.85 if access_model != "unknown" else 0.25
    lifecycle = sum(bool(value.strip()) for value in [created, modified]) / 2
    interoperability = 0.75 if styles else 0.25
    overall = (discoverability + documentation_score + contract + access + lifecycle + interoperability) / 6
    return {
        "overall": round(overall, 3),
        "metrics": {
            "discoverability": round(discoverability, 3),
            "documentation": documentation_score,
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


def truncate_text(value: Any, limit: int) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def plain_text(value: Any, limit: int = MAX_RECORD_NOTES_CHARS) -> str:
    text = str(value or "")
    # Unescape entities BEFORE stripping tags so entity-encoded markup
    # (e.g. &lt;img onerror=…&gt;) cannot resurface as live HTML downstream.
    text = html.unescape(text)
    text = re.sub(r"(?is)<(script|style).*?</\1>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    # Upstream text sometimes contains literal backslash-n escape sequences.
    text = text.replace("\\r\\n", " ").replace("\\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return truncate_text(text, limit)


def search_shard(value: str, length: int = 2) -> str:
    clean = re.sub(r"[^a-z0-9]", "", value.lower())
    return clean[:length] or "_"


def record_route(slug: str) -> str:
    return f"dataset/{slug}"


def resource_route(resource_id: str) -> str:
    return f"resource/{resource_id}"


def source_provenance(
    *,
    source: str,
    source_url: str,
    source_tier: str,
    adapter: str,
    confidence: str,
    observed_at: str,
    source_sha256: str = "",
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    provenance = {
        "source": source,
        "source_url": source_url,
        "source_tier": source_tier,
        "source_adapter": adapter,
        "confidence": confidence,
        "observed_at": observed_at,
    }
    if source_sha256:
        provenance["source_sha256"] = source_sha256
    if extra:
        provenance.update(extra)
    return provenance


class CorpusBuilder:
    def __init__(self, source_url: str, source_hash: str, observed_at: str) -> None:
        self.source_url = source_url
        self.source_hash = source_hash
        self.observed_at = observed_at
        self.records: list[dict[str, Any]] = []
        self.resources: list[dict[str, Any]] = []
        self.relationships: list[dict[str, Any]] = []
        self.seen_records: set[str] = set()
        # Keyed by (record_type, canonical_url) so dedup is cross-adapter but never
        # collapses different record types that happen to share a canonical URL.
        self.seen_endpoint_urls: set[tuple[str, str]] = set()
        self.credential_params_redacted = 0
        self.unsafe_urls_dropped = 0
        self.duplicate_slugs_dropped = 0
        self.duplicate_endpoints_skipped = 0

    def clean_url(self, value: Any) -> str:
        """Sanitize a harvested URL for storage: reject unsafe schemes, then redact credential-shaped query params."""
        url = safe_url(value)
        if not url:
            if str(value or "").strip():
                self.unsafe_urls_dropped += 1
            return ""
        cleaned, dropped = redact_url(url)
        if dropped:
            self.credential_params_redacted += dropped
        return cleaned

    def register_endpoint(self, record_type: str, canonical: str) -> bool:
        """Track a canonical endpoint URL within a record type; return False if it was already seen."""
        if not canonical:
            return True
        key = (record_type, canonical)
        if key in self.seen_endpoint_urls:
            self.duplicate_endpoints_skipped += 1
            return False
        self.seen_endpoint_urls.add(key)
        return True

    def add_relationship(self, source: str, target: str, kind: str, **extra: Any) -> None:
        # Every edge carries provenance per the aims doc (UK-Government-API-OKF.md):
        # all current edges are derived from harvested source structure at build
        # time; adapters may override these fields via **extra for richer evidence.
        row = {
            "source": source,
            "target": target,
            "kind": kind,
            "evidence_type": "harvested_structure",
            "confidence": "high",
            "observed_at": self.observed_at,
        }
        row.update(extra)
        self.relationships.append(row)

    def add_resource(
        self,
        *,
        dataset_slug: str,
        kind: str,
        title: str,
        url: str,
        fmt: str,
        provenance: dict[str, Any],
        description: str = "",
        schema_type: str = "",
        schema_url: str = "",
        created: str = "",
        modified: str = "",
    ) -> str:
        if not url:
            return ""
        base = f"{dataset_slug}-{slugify(kind)}-{slugify(title or url, 'resource')}"
        rid = base[:180]
        seen_ids = {resource["id"] for resource in self.resources}
        if rid in seen_ids:
            rid = f"{rid}-{len(seen_ids) + 1}"
        self.resources.append(
            {
                "id": rid,
                "dataset": dataset_slug,
                "name": title,
                "description": description or f"{kind.replace('_', ' ').title()} for {dataset_slug}",
                "format": fmt,
                "source_format": fmt,
                "format_confidence": 1.0,
                "concept_id": f"api-resources/{dataset_slug}/{slugify(kind)}.md",
                "route": resource_route(rid),
                "dataset_concept_id": f"api-records/{dataset_slug}.md",
                "provenance": provenance,
                "host": host(url),
                "url": url,
                "resource_type": kind,
                "position": len([resource for resource in self.resources if resource["dataset"] == dataset_slug]),
                "created": created,
                "metadata_modified": modified,
                "last_modified": modified,
                "schema_type": schema_type,
                "schema_url": schema_url,
            }
        )
        self.add_relationship(record_route(dataset_slug), resource_route(rid), f"has {kind}")
        return rid

    def add_record(
        self,
        *,
        slug: str,
        title: str,
        record_type: str,
        publisher: str,
        publisher_title_value: str,
        description: str = "",
        url: str = "",
        documentation: str = "",
        topics: list[str] | None = None,
        protocols: list[str] | None = None,
        tags: list[str] | None = None,
        timestamp: str = "",
        created: str = "",
        modified: str = "",
        license_id: str = "not-specified",
        license_title: str = "Not specified",
        license_source_id: str = "",
        license_confidence: float | None = None,
        license_basis: str = "",
        access_model: str = "unknown",
        visibility: str = "catalogue-listed-access-not-assumed",
        contract_status: str = "undocumented-in-catalogue",
        lifecycle: str = "catalogue-listed",
        source_tier: str = "observed",
        source_adapter: str = "unknown",
        confidence: str = "observed",
        provenance: dict[str, Any] | None = None,
        context_note: str = "",
        acronym_expansions: list[dict[str, str]] | None = None,
        context_links: list[dict[str, str]] | None = None,
        extras: dict[str, Any] | None = None,
        area_served: str = "not-specified",
    ) -> dict[str, Any] | None:
        if slug in self.seen_records:
            self.duplicate_slugs_dropped += 1
            print(f"warning: duplicate slug {slug!r} dropped (source_adapter={source_adapter!r})", file=sys.stderr)
            return None
        self.seen_records.add(slug)
        protocols = protocols or classify_styles_from_text(title, description, url, documentation)
        topics = topics or classify_topics_from_text(title, description, publisher_title_value)
        tags = sorted(set(tags or []) | {slugify(topic) for topic in topics} | {slugify(protocol) for protocol in protocols} | {publisher})
        provenance = provenance or source_provenance(
            source=source_adapter,
            source_url=url or documentation,
            source_tier=source_tier,
            adapter=source_adapter,
            confidence=confidence,
            observed_at=self.observed_at,
        )
        family = classify_family(publisher, publisher_title_value)
        endpoint_host = host(url)
        documentation_host = host(documentation)
        canonical_publisher = canonical_provider_slug(publisher, publisher_title_value)
        canonical_publisher_title = provider_title(canonical_publisher)
        resolved_license_id, resolved_license_title, resolved_license_source_id, inferred_license_confidence, inferred_license_basis = provider_terms_license(
            publisher,
            publisher_title_value,
            license_id,
            license_title,
            license_source_id,
        )
        license_id = resolved_license_id
        license_title = resolved_license_title
        license_source_id = resolved_license_source_id
        license_confidence = inferred_license_confidence if license_confidence is None else license_confidence
        license_basis = license_basis or inferred_license_basis
        quality = quality_metrics(
            title=title,
            description=description,
            url=url,
            documentation=documentation,
            publisher=publisher_title_value,
            styles=protocols,
            access_model=access_model,
            contract_status=contract_status,
            created=created,
            modified=modified,
        )
        standards_alignment = standards_alignment_for_record(
            record_type=record_type,
            title=title,
            description=description,
            url=url,
            documentation=documentation,
            publisher=publisher_title_value,
            license_id=license_id,
            access_model=access_model,
            protocols=protocols,
        )
        notes = plain_text(description)
        record = {
            "id": url or slug,
            "name": slug,
            "title": plain_text(title, 300) or slug,
            "notes": notes,
            "context_note": context_note,
            "acronym_expansions": acronym_expansions or [],
            "context_links": context_links or [],
            "publisher": publisher,
            "publisher_title": publisher_title_value,
            "canonical_publisher": canonical_publisher,
            "canonical_publisher_title": canonical_publisher_title,
            "resource_count": 0,
            "resource_ids": [],
            "formats": protocols,
            "interaction_style": protocols,
            "protocol": protocols,
            "tags": tags,
            "topics": topics,
            "topic": topics,
            "timestamp": timestamp or modified or created,
            "metadata_created": created,
            "metadata_modified": modified or timestamp,
            "license_id": license_id,
            "license_title": license_title,
            "license_source_id": license_source_id,
            "license_source_title": license_title,
            "license_confidence": license_confidence,
            "license_basis": license_basis,
            "license": license_id,
            "host": endpoint_host,
            "endpoint_host": endpoint_host or "not-specified",
            "documentation_host": documentation_host or "not-specified",
            "resource_hosts": sorted({value for value in [endpoint_host, documentation_host] if value}),
            "concept_id": f"api-records/{slug}.md",
            "route": record_route(slug),
            "publisher_concept_id": f"organisations/{publisher}.md",
            "quality": quality,
            "quality_band": quality_band(float(quality.get("overall", 0))),
            "standards_alignment": standards_alignment,
            "standards_profiles": standards_alignment["profiles"],
            "dcat_type": standards_alignment["dcat"]["term"],
            "dcat_export_status": standards_alignment["dcat"]["export_status"],
            "openapi_type": standards_alignment["openapi"]["term"],
            "openapi_export_status": standards_alignment["openapi"]["export_status"],
            "openapi_security_scheme": standards_alignment["openapi"]["security_scheme_type"],
            "provenance": provenance,
            "url": url,
            "documentation": documentation,
            "area_served": area_served or "not-specified",
            "areaServed": area_served or "not-specified",
            "state": lifecycle,
            "type": record_type,
            "record_type": record_type,
            "source_tier": source_tier,
            "source_adapter": source_adapter,
            "confidence": confidence,
            "assurance_status": assurance_status_for(source_tier, confidence, access_model, contract_status, license_id),
            "isopen": license_id == OGL_V3_ID,
            "private": visibility in {"private", "internal", "restricted-internal", "closed"},
            "extras": {
                "visibility": visibility,
                "access_model": access_model,
                "contract_status": contract_status,
                "organisation_family": family,
                "source_tier": source_tier,
                "source_adapter": source_adapter,
                "confidence": confidence,
                "assurance_status": assurance_status_for(source_tier, confidence, access_model, contract_status, license_id),
                "canonical_publisher": canonical_publisher,
                "data_classification": data_classification_for(visibility, access_model),
                "environment": environment_for(title, description, url, visibility),
                "credential_requirements": credential_requirements_for(access_model),
                "license_basis": license_basis,
                "dcat_type": standards_alignment["dcat"]["term"],
                "openapi_type": standards_alignment["openapi"]["term"],
                "dcat_export_status": standards_alignment["dcat"]["export_status"],
                "openapi_export_status": standards_alignment["openapi"]["export_status"],
                **(extras or {}),
            },
            "visibility": visibility,
            "access_model": access_model,
            "credential_requirements": credential_requirements_for(access_model),
            "contract_status": contract_status,
            "lifecycle_status": lifecycle,
            "data_classification": data_classification_for(visibility, access_model),
            "environment": environment_for(title, description, url, visibility),
            "organisation_family": family,
            "groups": [{"title": topic} for topic in topics],
        }
        sample_policy = sample_policy_for(record_type, access_model, url, protocols)
        if sample_policy:
            record["sample_policy"] = sample_policy
            record["extras"]["sample_policy"] = sample_policy
        self.records.append(record)
        self.add_relationship(record_route(slug), f"publisher/{publisher}", "published by")
        self.add_relationship(record_route(slug), f"source-adapter/{source_adapter}", "harvested by")
        self.add_relationship(record_route(slug), f"confidence/{confidence}", "has confidence")
        for protocol in protocols:
            self.add_relationship(record_route(slug), f"protocol/{protocol}", "uses protocol")
        return record

    def attach_resource_ids(self) -> None:
        by_dataset: dict[str, list[str]] = defaultdict(list)
        hosts_by_dataset: dict[str, set[str]] = defaultdict(set)
        for resource in self.resources:
            by_dataset[resource["dataset"]].append(resource["id"])
            if resource.get("host"):
                hosts_by_dataset[resource["dataset"]].add(resource["host"])
        for record in self.records:
            ids = by_dataset.get(record["name"], [])
            record["resource_ids"] = ids
            record["resource_count"] = len(ids)
            record["resource_hosts"] = sorted(set(record.get("resource_hosts", [])) | hosts_by_dataset.get(record["name"], set()))


def add_api_catalogue_records(builder: CorpusBuilder, rows: list[SourceRow], source_url: str, source_hash: str) -> None:
    for source_row in rows:
        row = dict(source_row.raw)
        row["url"] = builder.clean_url(row.get("url", ""))
        row["documentation"] = builder.clean_url(row.get("documentation", ""))
        styles = classify_styles(row)
        topics = classify_topics(row)
        access_model = classify_access(row)
        visibility = classify_visibility(row)
        contract_status = classify_contract_status(row)
        licence_id, licence_title = normalize_license(row.get("license", ""))
        context_note, acronym_expansions, context_links = context_for_row(row)
        status = lifecycle_status(row)
        provenance = source_provenance(
            source="GOV.UK API Catalogue CSV",
            source_url=source_url,
            source_tier="declared_api_catalogue",
            adapter="api_gov_uk_catalogue",
            confidence="declared",
            observed_at=builder.observed_at,
            source_sha256=source_hash,
            extra={"source_row": source_row.ordinal + 1, "source_repository": "co-cddo/api-catalogue"},
        )
        record = builder.add_record(
            slug=source_row.slug,
            title=row.get("name", "") or source_row.slug,
            record_type="API Product",
            publisher=source_row.provider,
            publisher_title_value=source_row.provider_title,
            description=row.get("description", ""),
            url=row.get("url", ""),
            documentation=row.get("documentation", ""),
            topics=topics,
            protocols=styles,
            timestamp=row.get("dateUpdated") or row.get("dateAdded") or "",
            created=row.get("dateAdded", ""),
            modified=row.get("dateUpdated", ""),
            license_id=licence_id,
            license_title=licence_title,
            license_source_id=row.get("license", ""),
            access_model=access_model,
            visibility=visibility,
            contract_status=contract_status,
            lifecycle=status,
            source_tier="declared_api_catalogue",
            source_adapter="api_gov_uk_catalogue",
            confidence="declared",
            provenance=provenance,
            context_note=context_note,
            acronym_expansions=acronym_expansions,
            context_links=context_links,
            area_served=row.get("areaServed", "") or "not-specified",
        )
        if not record:
            continue
        if row.get("url"):
            builder.add_resource(
                dataset_slug=source_row.slug,
                kind="endpoint",
                title=f"Endpoint: {row.get('name', '')}",
                url=row.get("url", ""),
                fmt="HTTP endpoint",
                provenance=provenance,
                created=row.get("dateAdded", ""),
                modified=row.get("dateUpdated", ""),
            )
        if row.get("documentation"):
            builder.add_resource(
                dataset_slug=source_row.slug,
                kind="documentation",
                title=f"Documentation: {row.get('name', '')}",
                url=row.get("documentation", ""),
                fmt="Documentation",
                provenance=provenance,
                schema_type=contract_status,
                schema_url=row.get("documentation", "") if contract_status.endswith("indicated") else "",
                created=row.get("dateAdded", ""),
                modified=row.get("dateUpdated", ""),
            )
        if row.get("license"):
            builder.add_resource(
                dataset_slug=source_row.slug,
                kind="licence",
                title=f"Licence: {licence_title}",
                url=row.get("license", ""),
                fmt="Licence",
                provenance=provenance,
                created=row.get("dateAdded", ""),
                modified=row.get("dateUpdated", ""),
            )
        if contract_status != "undocumented-in-catalogue":
            builder.add_relationship(record_route(source_row.slug), f"contract-status/{contract_status}", "has contract signal")
        builder.add_relationship(record_route(source_row.slug), f"access-model/{access_model}", "uses access model")


def api_like_resource(resource: dict[str, Any]) -> bool:
    fmt = str(resource.get("format") or resource.get("format_name") or "")
    if fmt.casefold() in API_LIKE_FORMAT_LOOKUP:
        return True
    return protocol_for_resource(fmt, str(resource.get("url") or "")) != "REST/HTTP" or fmt.casefold() == "api"


def org_from_package(package: dict[str, Any]) -> tuple[str, str]:
    organisation = package.get("organization") or {}
    title = organisation.get("title") or package.get("organization", {}).get("name") or package.get("owner_org") or "data.gov.uk publisher"
    slug = slugify(organisation.get("name") or title, "data-gov-uk-publisher")
    return slug, provider_title(slug) if title == slug else str(title)


def add_ckan_records(builder: CorpusBuilder, packages: list[dict[str, Any]], source_url: str) -> None:
    for package in packages:
        publisher, publisher_name = org_from_package(package)
        package_slug = slugify(f"data-gov-uk-{package.get('name') or package.get('id')}", "data-gov-uk-dataset")
        modified = package.get("metadata_modified") or package.get("metadata_created") or ""
        licence_id, licence_title, licence_source_id = normalize_license_fields(str(package.get("license_id") or ""), str(package.get("license_title") or ""))
        data_product_provenance = source_provenance(
            source="data.gov.uk CKAN package_search",
            source_url=source_url,
            source_tier="data_access_endpoint",
            adapter="data_gov_uk_ckan",
            confidence="observed",
            observed_at=builder.observed_at,
            extra={"ckan_package_id": package.get("id"), "ckan_package_name": package.get("name")},
        )
        package_url = builder.clean_url(package.get("url")) or f"https://www.data.gov.uk/dataset/{package.get('name', '')}"
        data_product = builder.add_record(
            slug=package_slug,
            title=package.get("title") or package.get("name") or package_slug,
            record_type="Data Product",
            publisher=publisher,
            publisher_title_value=publisher_name,
            description=package.get("notes", ""),
            url=package_url,
            documentation=package_url,
            topics=classify_topics_from_text(package.get("title", ""), package.get("notes", ""), publisher_name),
            protocols=["Dataset metadata"],
            timestamp=modified,
            created=package.get("metadata_created") or "",
            modified=modified,
            license_id=licence_id,
            license_title=licence_title,
            license_source_id=licence_source_id,
            access_model="anonymous",
            visibility="public-data-catalogue",
            contract_status="dataset-metadata",
            lifecycle=package.get("state") or "catalogue-listed",
            source_tier="data_access_endpoint",
            source_adapter="data_gov_uk_ckan",
            confidence="observed",
            provenance=data_product_provenance,
        )
        if data_product:
            builder.add_resource(
                dataset_slug=package_slug,
                kind="catalogue_record",
                title="data.gov.uk dataset record",
                url=package_url,
                fmt="CKAN package",
                provenance=data_product_provenance,
                modified=modified,
            )

        for resource in package.get("resources", []):
            if not api_like_resource(resource):
                continue
            endpoint_url = builder.clean_url(resource.get("url"))
            canonical = canonical_url(endpoint_url)
            if not builder.register_endpoint("Data Access API Endpoint", canonical):
                continue
            fmt = str(resource.get("format") or "")
            protocol = protocol_for_resource(fmt, endpoint_url)
            endpoint_slug = slugify(f"data-gov-uk-{resource.get('id') or endpoint_url}", "data-access-endpoint")
            endpoint_provenance = source_provenance(
                source="data.gov.uk CKAN resource",
                source_url=source_url,
                source_tier="data_access_endpoint",
                adapter="data_gov_uk_ckan",
                confidence="observed",
                observed_at=builder.observed_at,
                extra={"ckan_package_id": package.get("id"), "ckan_resource_id": resource.get("id"), "source_format": fmt},
            )
            endpoint = builder.add_record(
                slug=endpoint_slug,
                title=resource.get("name") or f"{package.get('title') or package.get('name')} {protocol}",
                record_type="Data Access API Endpoint",
                publisher=publisher,
                publisher_title_value=publisher_name,
                description=resource.get("description") or package.get("notes", ""),
                url=endpoint_url,
                documentation=package_url,
                topics=classify_topics_from_text(package.get("title", ""), resource.get("name", ""), fmt, endpoint_url, publisher_name),
                protocols=[protocol],
                timestamp=resource.get("metadata_modified") or modified,
                created=resource.get("created") or package.get("metadata_created") or "",
                modified=resource.get("last_modified") or resource.get("metadata_modified") or modified,
                license_id=licence_id,
                license_title=licence_title,
                license_source_id=licence_source_id,
                access_model="anonymous",
                visibility="public-data-catalogue",
                contract_status="capability-document" if protocol in {"WMS", "WFS", "WMTS", "WCS", "OGC API", "SPARQL"} else "service-description",
                lifecycle=resource.get("state") or package.get("state") or "catalogue-listed",
                source_tier="data_access_endpoint",
                source_adapter="data_gov_uk_ckan",
                confidence="observed",
                provenance=endpoint_provenance,
                extras={"parent_data_product": package_slug, "ckan_resource_format": fmt},
            )
            if not endpoint:
                continue
            builder.add_resource(
                dataset_slug=endpoint_slug,
                kind="endpoint",
                title=resource.get("name") or f"{protocol} endpoint",
                url=endpoint_url,
                fmt=protocol,
                provenance=endpoint_provenance,
                description=resource.get("description") or "",
                schema_type=protocol,
                created=resource.get("created") or "",
                modified=resource.get("last_modified") or resource.get("metadata_modified") or modified,
            )
            builder.add_relationship(record_route(endpoint_slug), record_route(package_slug), "exposes data product")
            builder.add_relationship(record_route(package_slug), record_route(endpoint_slug), "exposed through endpoint")


def os_product_slug(url: str, title: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/") or title
    return slugify(f"ordnance-survey-{path}", "ordnance-survey-api")


def add_os_records(builder: CorpusBuilder, documents: dict[str, dict[str, Any]], root_url: str = DEFAULT_OS_API_ROOT) -> None:
    publisher = "ordnance-survey"
    publisher_name = "Ordnance Survey"
    root_doc = documents.get(canonical_url(root_url)) or {}
    root_provenance = source_provenance(
        source="Ordnance Survey API root",
        source_url=root_url,
        source_tier="provider_native_api",
        adapter="ordnance_survey_api_os_uk",
        confidence="declared",
        observed_at=builder.observed_at,
    )
    builder.add_record(
        slug="ordnance-survey-api-portal",
        title=root_doc.get("title") or "Ordnance Survey API portal",
        record_type="Provider API Portal",
        publisher=publisher,
        publisher_title_value=publisher_name,
        description=root_doc.get("description", ""),
        url=root_url,
        documentation="https://docs.os.uk/welcome",
        topics=["Geospatial"],
        protocols=["REST/HTTP"],
        access_model="api-key",
        visibility="public-developer-portal",
        contract_status="service-description",
        source_tier="provider_native_api",
        source_adapter="ordnance_survey_api_os_uk",
        confidence="declared",
        provenance=root_provenance,
    )

    for document_url, document in sorted(documents.items()):
        if document_url == canonical_url(root_url):
            continue
        document_url = builder.clean_url(document_url)
        title = document.get("title") or document_url
        links = document.get("links", [])
        service_links = [link for link in links if link.get("rel") == "service-endpoint"]
        doc_links = [link for link in links if link.get("rel") == "documentation"]
        if not service_links and not doc_links:
            continue
        slug = os_product_slug(document_url, title)
        raw_docs_url = next((str(link.get("href")) for link in doc_links if link.get("href")), "")
        docs_url = builder.clean_url(raw_docs_url) or "https://docs.os.uk/welcome"
        protocols = sorted({protocol_for_resource(str(link.get("type") or ""), str(link.get("href") or "")) for link in service_links}) or ["REST/HTTP"]
        provenance = source_provenance(
            source="Ordnance Survey API link document",
            source_url=document.get("source_url") or document_url,
            source_tier="provider_native_api",
            adapter="ordnance_survey_api_os_uk",
            confidence="declared",
            observed_at=builder.observed_at,
        )
        record = builder.add_record(
            slug=slug,
            title=title,
            record_type="API Product",
            publisher=publisher,
            publisher_title_value=publisher_name,
            description=document.get("description", ""),
            url=document_url,
            documentation=docs_url,
            topics=["Geospatial"],
            protocols=protocols,
            access_model="api-key",
            visibility="public-developer-portal",
            contract_status="service-description",
            source_tier="provider_native_api",
            source_adapter="ordnance_survey_api_os_uk",
            confidence="declared",
            provenance=provenance,
            extras={"provider_api_group": True},
        )
        if not record:
            continue
        builder.add_relationship(record_route(slug), "dataset/ordnance-survey-api-portal", "listed in provider portal")
        for link in service_links:
            href = builder.clean_url(link.get("href"))
            link_type = link.get("type")
            link_title = str(link.get("title") or href)
            protocol = protocol_for_resource(" ".join(link_type) if isinstance(link_type, list) else str(link_type or ""), href)
            kind = "contract" if href.endswith((".yaml", ".yml", ".json")) or "openapi" in href.lower() else "endpoint"
            builder.add_resource(
                dataset_slug=slug,
                kind=kind,
                title=link_title,
                url=href,
                fmt=protocol,
                provenance=provenance,
                description=str(link.get("description") or ""),
                schema_type="openapi-indicated" if kind == "contract" else protocol,
                schema_url=href if kind == "contract" else "",
            )
            operation_slug = slugify(f"ordnance-survey-operation-{href}", "ordnance-survey-operation")
            if "operation" in link_title.lower() or "{" in href or kind == "endpoint":
                operation = builder.add_record(
                    slug=operation_slug,
                    title=link_title,
                    record_type="API Operation",
                    publisher=publisher,
                    publisher_title_value=publisher_name,
                    description=str(link.get("description") or f"Callable operation exposed by {title}."),
                    url=href,
                    documentation=docs_url,
                    topics=["Geospatial"],
                    protocols=[protocol],
                    access_model="api-key",
                    visibility="public-developer-portal",
                    contract_status="service-description",
                    source_tier="provider_native_api",
                    source_adapter="ordnance_survey_api_os_uk",
                    confidence="declared",
                    provenance=provenance,
                    extras={"parent_api_product": slug},
                )
                if operation:
                    builder.add_relationship(record_route(slug), record_route(operation_slug), "has operation")
        for link in doc_links:
            builder.add_resource(
                dataset_slug=slug,
                kind="documentation",
                title=str(link.get("title") or "Documentation"),
                url=builder.clean_url(link.get("href")),
                fmt="Documentation",
                provenance=provenance,
                description=str(link.get("description") or ""),
            )


def add_ons_records(
    builder: CorpusBuilder,
    root: dict[str, Any],
    datasets: list[dict[str, Any]],
    topics: list[dict[str, Any]],
    code_lists: list[dict[str, Any]],
    root_url: str = DEFAULT_ONS_API_ROOT,
) -> None:
    publisher = "office-for-national-statistics"
    publisher_name = "Office for National Statistics"
    provenance = source_provenance(
        source="ONS Beta API",
        source_url=root_url,
        source_tier="provider_native_api",
        adapter="ons_beta_api",
        confidence="declared",
        observed_at=builder.observed_at,
    )
    api = builder.add_record(
        slug="office-for-national-statistics-ons-beta-api",
        title="ONS Beta API",
        record_type="API Product",
        publisher=publisher,
        publisher_title_value=publisher_name,
        description="The Office for National Statistics API makes datasets and other data available programmatically using HTTP.",
        url=root_url,
        documentation="https://developer.ons.gov.uk/",
        topics=["Population and statistics"],
        protocols=["REST/HTTP"],
        access_model="anonymous",
        visibility="public-open-api",
        contract_status="service-description",
        source_tier="provider_native_api",
        source_adapter="ons_beta_api",
        confidence="declared",
        provenance=provenance,
        extras={"root_routes": sorted(root.get("api", {}).keys()) if isinstance(root.get("api"), dict) else []},
    )
    if api:
        builder.add_resource(
            dataset_slug="office-for-national-statistics-ons-beta-api",
            kind="documentation",
            title="ONS Developer Hub",
            url="https://developer.ons.gov.uk/",
            fmt="Documentation",
            provenance=provenance,
        )
        builder.add_resource(
            dataset_slug="office-for-national-statistics-ons-beta-api",
            kind="endpoint",
            title="ONS API root",
            url=root_url,
            fmt="REST/HTTP",
            provenance=provenance,
        )

    operation_templates = [
        ("list-datasets", "List datasets", f"{root_url}/datasets"),
        ("get-dataset", "Get dataset", f"{root_url}/datasets/{{dataset_id}}"),
        ("list-editions", "List dataset editions", f"{root_url}/datasets/{{dataset_id}}/editions"),
        ("get-version", "Get dataset version", f"{root_url}/datasets/{{dataset_id}}/editions/{{edition}}/versions/{{version}}"),
        ("filter-dataset", "Filter a dataset", f"{root_url}/filters"),
        ("list-code-lists", "List code lists", f"{root_url}/code-lists"),
        ("list-topics", "List topics", f"{root_url}/topics"),
    ]
    for suffix, title, url in operation_templates:
        slug = f"office-for-national-statistics-ons-beta-api-{suffix}"
        operation = builder.add_record(
            slug=slug,
            title=f"ONS Beta API: {title}",
            record_type="API Operation",
            publisher=publisher,
            publisher_title_value=publisher_name,
            description=f"Template operation for the ONS Beta API: {title}.",
            url=url,
            documentation="https://developer.ons.gov.uk/",
            topics=["Population and statistics"],
            protocols=["REST/HTTP"],
            access_model="anonymous",
            visibility="public-open-api",
            contract_status="service-description",
            source_tier="provider_native_api",
            source_adapter="ons_beta_api",
            confidence="declared",
            provenance=provenance,
            extras={"parent_api_product": "office-for-national-statistics-ons-beta-api"},
        )
        if operation:
            builder.add_relationship("dataset/office-for-national-statistics-ons-beta-api", record_route(slug), "has operation")

    for dataset in datasets:
        dataset_id = str(dataset.get("id") or dataset.get("title") or "")
        if not dataset_id:
            continue
        slug = slugify(f"ons-dataset-{dataset_id}", "ons-dataset")
        self_link = builder.clean_url(dataset.get("links", {}).get("self", {}).get("href")) or f"{root_url}/datasets/{dataset_id}"
        latest_version = builder.clean_url(dataset.get("links", {}).get("latest_version", {}).get("href", ""))
        topics_for_dataset = classify_topics_from_text(dataset.get("title", ""), dataset.get("description", ""), "ONS statistics")
        data_product = builder.add_record(
            slug=slug,
            title=dataset.get("title") or dataset_id,
            record_type="Data Product",
            publisher=publisher,
            publisher_title_value=publisher_name,
            description=dataset.get("description", ""),
            url=self_link,
            documentation=self_link,
            topics=topics_for_dataset,
            protocols=["REST/HTTP"],
            timestamp=dataset.get("last_updated", ""),
            modified=dataset.get("last_updated", ""),
            license_id=OGL_V3_ID,
            license_title=OGL_V3_TITLE,
            license_source_id=OGL_V3_URL,
            access_model="anonymous",
            visibility="public-open-api",
            contract_status="dataset-api",
            lifecycle=dataset.get("state") or "published",
            source_tier="provider_native_api",
            source_adapter="ons_beta_api",
            confidence="declared",
            provenance=source_provenance(
                source="ONS Beta API datasets endpoint",
                source_url=f"{root_url}/datasets",
                source_tier="provider_native_api",
                adapter="ons_beta_api",
                confidence="declared",
                observed_at=builder.observed_at,
                extra={"ons_dataset_id": dataset_id},
            ),
            extras={"parent_api_product": "office-for-national-statistics-ons-beta-api", "latest_version": latest_version, "release_frequency": dataset.get("release_frequency", "")},
        )
        if not data_product:
            continue
        builder.add_resource(
            dataset_slug=slug,
            kind="endpoint",
            title="ONS dataset endpoint",
            url=self_link,
            fmt="REST/HTTP",
            provenance=provenance,
            modified=dataset.get("last_updated", ""),
        )
        if latest_version:
            builder.add_resource(
                dataset_slug=slug,
                kind="endpoint",
                title="ONS latest version endpoint",
                url=latest_version,
                fmt="REST/HTTP",
                provenance=provenance,
                modified=dataset.get("last_updated", ""),
            )
        builder.add_relationship("dataset/office-for-national-statistics-ons-beta-api", record_route(slug), "exposes data product")

    for topic in topics:
        slug_value = topic.get("slug") or topic.get("id") or topic.get("title")
        if not slug_value:
            continue
        slug = slugify(f"ons-topic-{slug_value}", "ons-topic")
        topic_url = builder.clean_url(topic.get("links", {}).get("self", {}).get("href")) or f"{root_url}/topics/{topic.get('id', '')}"
        schema = builder.add_record(
            slug=slug,
            title=topic.get("title") or str(slug_value),
            record_type="Schema",
            publisher=publisher,
            publisher_title_value=publisher_name,
            description=topic.get("description", ""),
            url=topic_url,
            documentation=topic_url,
            topics=["Population and statistics"],
            protocols=["REST/HTTP"],
            access_model="anonymous",
            visibility="public-open-api",
            contract_status="taxonomy",
            lifecycle=topic.get("state") or "published",
            source_tier="provider_native_api",
            source_adapter="ons_beta_api",
            confidence="declared",
            provenance=provenance,
            extras={"schema_kind": "topic"},
        )
        if schema:
            builder.add_relationship("dataset/office-for-national-statistics-ons-beta-api", record_route(slug), "uses schema")

    for code_list in code_lists:
        links = code_list.get("links", {})
        self_link = links.get("self", {})
        code_id = self_link.get("id") or code_list.get("id")
        if not code_id:
            continue
        slug = slugify(f"ons-code-list-{code_id}", "ons-code-list")
        code_url = builder.clean_url(self_link.get("href")) or f"{root_url}/code-lists/{code_id}"
        code_url = code_url.replace("http://api.beta.ons.gov.uk", "https://api.beta.ons.gov.uk")
        schema = builder.add_record(
            slug=slug,
            title=f"ONS code list: {code_id}",
            record_type="Schema",
            publisher=publisher,
            publisher_title_value=publisher_name,
            description=f"Code list exposed by the ONS Beta API: {code_id}.",
            url=code_url,
            documentation=code_url,
            topics=["Population and statistics"],
            protocols=["REST/HTTP"],
            access_model="anonymous",
            visibility="public-open-api",
            contract_status="code-list",
            lifecycle="published",
            source_tier="provider_native_api",
            source_adapter="ons_beta_api",
            confidence="declared",
            provenance=provenance,
            extras={"schema_kind": "code_list"},
        )
        if schema:
            builder.add_relationship("dataset/office-for-national-statistics-ons-beta-api", record_route(slug), "uses schema")


def contract_kind_for(record: dict[str, Any]) -> str:
    if record.get("record_type") == "Schema":
        return "Contract"
    if record.get("contract_status") == "capability-document" or set(record.get("protocol", [])) & {"WMS", "WFS", "WMTS", "WCS", "OGC API", "SPARQL"}:
        return "Capability Document"
    return "Contract"


def add_contract_records(builder: CorpusBuilder) -> None:
    source_records = list(builder.records)
    for record in source_records:
        if record.get("record_type") in {"Contract", "Capability Document"}:
            continue
        status = str(record.get("contract_status") or "")
        protocols = list(record.get("protocol") or record.get("formats") or [])
        if status not in CONTRACT_SOURCE_STATUSES and not (set(protocols) & CONTRACT_PROTOCOLS):
            continue
        contract_url = record.get("documentation") or record.get("url") or ""
        if not contract_url:
            continue
        contract_type = contract_kind_for(record)
        slug = slugify(f"contract-{record['name']}-{status or '-'.join(protocols)}", "contract")
        provenance = source_provenance(
            source="Contract discovery from harvested API metadata",
            source_url=record.get("provenance", {}).get("source_url") or contract_url,
            source_tier="contract_discovery",
            adapter="contract_discovery",
            confidence="observed",
            observed_at=builder.observed_at,
            extra={"describes_record": record["name"], "contract_signal": status or ",".join(protocols)},
        )
        contract = builder.add_record(
            slug=slug,
            title=f"{record['title']} contract",
            record_type=contract_type,
            publisher=record["publisher"],
            publisher_title_value=record["publisher_title"],
            description=f"Machine-readable or service-description contract inferred for {record['title']} from public metadata.",
            url=contract_url,
            documentation=record.get("documentation") or contract_url,
            topics=record.get("topics", []),
            protocols=protocols or ["REST/HTTP"],
            timestamp=record.get("timestamp", ""),
            created=record.get("metadata_created", ""),
            modified=record.get("metadata_modified", ""),
            license_id=record.get("license_id", "not-specified"),
            license_title=record.get("license_title", "Not specified"),
            license_source_id=record.get("license_source_id", ""),
            access_model=record.get("access_model", "unknown"),
            visibility=record.get("visibility", "catalogue-listed-access-not-assumed"),
            contract_status=status or "service-description",
            lifecycle=record.get("lifecycle_status", "catalogue-listed"),
            source_tier="contract_discovery",
            source_adapter="contract_discovery",
            confidence="observed",
            provenance=provenance,
            extras={"describes_record": record["name"], "parent_record_type": record.get("record_type", "")},
            area_served=record.get("area_served", "not-specified"),
        )
        if not contract:
            continue
        builder.add_relationship(record["route"], contract["route"], "described by", evidence_type="contract_signal", confidence="medium")
        builder.add_relationship(contract["route"], record["route"], "describes", evidence_type="contract_signal", confidence="medium")


def add_declared_product_crosslinks(builder: CorpusBuilder) -> None:
    records = list(builder.records)
    candidates = [
        record
        for record in records
        if not (record.get("record_type") == "API Product" and record.get("source_tier") == "declared_api_catalogue")
        and record.get("record_type") in {"API Product", "Data Product", "Data Access API Endpoint", "Contract", "Capability Document"}
    ]
    by_host: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_provider: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in candidates:
        for value in {candidate.get("endpoint_host", ""), candidate.get("documentation_host", "")}:
            if value and value != "not-specified":
                by_host[value].append(candidate)
        by_provider[candidate.get("canonical_publisher") or candidate.get("publisher", "")].append(candidate)

    seen: set[tuple[str, str, str]] = set()
    for record in records:
        if record.get("record_type") != "API Product" or record.get("source_tier") != "declared_api_catalogue":
            continue
        targets: list[tuple[dict[str, Any], str, str]] = []
        for value in [record.get("endpoint_host", ""), record.get("documentation_host", "")]:
            if not value or value == "not-specified":
                continue
            for target in by_host.get(value, [])[:12]:
                targets.append((target, "shares endpoint host", value))
        provider_key = record.get("canonical_publisher") or record.get("publisher", "")
        record_topics = set(record.get("topics") or [])
        provider_matches = []
        for target in by_provider.get(provider_key, []):
            overlap = record_topics & set(target.get("topics") or [])
            score = (2 if overlap else 0) + int(target.get("resource_count") or 0)
            provider_matches.append((score, target))
        for _score, target in sorted(provider_matches, key=lambda item: (-item[0], item[1]["title"]))[:5]:
            targets.append((target, "same provider catalogue evidence", provider_key))
        for target, kind, match_key in targets:
            if target["route"] == record["route"]:
                continue
            key = (record["route"], target["route"], kind)
            if key in seen:
                continue
            seen.add(key)
            builder.add_relationship(
                record["route"],
                target["route"],
                kind,
                evidence_type="inferred_metadata_match",
                confidence="medium",
                match_key=match_key,
            )


def annotate_relationship_density(records: list[dict[str, Any]], relationships: list[dict[str, Any]]) -> None:
    counts: Counter[str] = Counter()
    for relationship in relationships:
        counts[str(relationship.get("source", ""))] += 1
        counts[str(relationship.get("target", ""))] += 1
    for record in records:
        count = counts.get(record["route"], 0)
        record["relationship_count"] = count
        if count >= 25:
            density = "high"
        elif count >= 8:
            density = "medium"
        elif count:
            density = "low"
        else:
            density = "none"
        record["relationship_density"] = density
        record["extras"]["relationship_density"] = density


def yaml_scalar(value: Any) -> str:
    text = str(value or "").replace("\n", " ").replace('"', '\\"')
    return f'"{text}"'


def markdown_link(label: str, target: str) -> str:
    return f"[{label}]({target})" if target else label


def render_record_markdown(record: dict[str, Any]) -> str:
    tags = ", ".join(record.get("tags", [])[:12])
    frontmatter = [
        "---",
        f"type: {yaml_scalar(record.get('record_type'))}",
        f"title: {yaml_scalar(record.get('title'))}",
        f"description: {yaml_scalar(record.get('notes'))}",
        f"resource: {yaml_scalar(record.get('url'))}",
        f"timestamp: {yaml_scalar(record.get('timestamp'))}",
        f"tags: {yaml_scalar(tags)}",
        f"confidence: {yaml_scalar(record.get('confidence'))}",
        f"source_adapter: {yaml_scalar(record.get('source_adapter'))}",
        "---",
        "",
    ]
    lines = [*frontmatter, f"# {record.get('title')}", "", record.get("notes") or "No description available.", ""]
    lines.extend(
        [
            "## Metadata",
            "",
            f"- Type: {record.get('record_type')}",
            f"- Provider: {markdown_link(record.get('publisher_title', ''), '../' + record.get('publisher_concept_id', ''))}",
            f"- Canonical provider: {record.get('canonical_publisher_title')}",
            f"- Source adapter: {record.get('source_adapter')}",
            f"- Source tier: {record.get('source_tier')}",
            f"- Confidence: {record.get('confidence')}",
            f"- Assurance status: {record.get('assurance_status')}",
            f"- Access model: {record.get('access_model')}",
            f"- Contract status: {record.get('contract_status')}",
            f"- Licence: {record.get('license_title')} ({record.get('license_id')})",
            f"- Licence basis: {record.get('license_basis')}",
            f"- Licence source: {record.get('license_source_id') or 'not-specified'}",
            f"- Licence confidence: {record.get('license_confidence')}",
            f"- Quality band: {record.get('quality_band')}",
            f"- DCAT term: `{record.get('dcat_type')}`",
            f"- OpenAPI term: `{record.get('openapi_type')}`",
            "",
        ]
    )
    if record.get("url"):
        lines.append(f"- Endpoint: {record['url']}")
    if record.get("documentation"):
        lines.append(f"- Documentation: {record['documentation']}")
    alignment = record.get("standards_alignment") or {}
    if alignment:
        dcat = alignment.get("dcat", {})
        openapi = alignment.get("openapi", {})
        lines.extend(
            [
                "",
                "## Standards Alignment",
                "",
                "This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.",
                "",
                f"- DCAT / DCAT-AP: `{dcat.get('term', record.get('dcat_type'))}`; export status `{dcat.get('export_status', 'not-specified')}`.",
                f"- DCAT missing requirements: {', '.join(f'`{item}`' for item in dcat.get('required_missing', [])) or 'none recorded'}",
                f"- OpenAPI: `{openapi.get('term', record.get('openapi_type'))}`; export status `{openapi.get('export_status', 'not-specified')}`.",
                f"- OpenAPI security scheme: `{openapi.get('security_scheme_type', record.get('openapi_security_scheme', 'unknown'))}`.",
                f"- OpenAPI missing requirements: {', '.join(f'`{item}`' for item in openapi.get('required_missing', [])) or 'none recorded'}",
                f"- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)",
            ]
        )
    lines.extend(["", "## Credential Requirements", ""])
    for requirement in record.get("credential_requirements", []):
        lines.append(f"- {requirement.get('type')}: secret value stored in OKF = {requirement.get('secret_value_stored_in_okf')}")
    if record.get("sample_policy"):
        lines.extend(["", "## Sample Policy", "", f"- Mode: {record['sample_policy'].get('mode')}", f"- Live calls enabled: {record['sample_policy'].get('live_calls_enabled')}"])
    lines.extend(["", "## Provenance", "", f"- Source: {record.get('provenance', {}).get('source', '')}", f"- Source URL: {record.get('provenance', {}).get('source_url', '')}", ""])
    return "\n".join(lines)


def render_publisher_markdown(publisher: dict[str, Any]) -> str:
    return "\n".join(
        [
            "---",
            'type: "Organisation"',
            f"title: {yaml_scalar(publisher.get('title'))}",
            f"description: {yaml_scalar(publisher.get('description'))}",
            f"timestamp: {yaml_scalar(publisher.get('provenance', {}).get('observed_at', ''))}",
            "---",
            "",
            f"# {publisher.get('title')}",
            "",
            publisher.get("description", ""),
            "",
            "## Catalogue Metrics",
            "",
            f"- Records: {publisher.get('dataset_count')}",
            f"- Resources: {publisher.get('resource_count')}",
            f"- Canonical organisation: {publisher.get('canonical_id', publisher.get('name'))}",
            "",
        ]
    )


def markdown_output_files(corpus: dict[str, Any]) -> dict[Path, str]:
    files: dict[Path, str] = {}
    records = corpus["records"]
    selected_records = [record for record in records if record.get("record_type") in MARKDOWN_RECORD_TYPES]
    for record in selected_records:
        files[Path(record["concept_id"])] = render_record_markdown(record)
    for publisher in corpus["publishers"]:
        files[Path(publisher["concept_id"])] = render_publisher_markdown(publisher)
    counts = corpus["descriptor"]["counts"]
    files[Path("index.md")] = "\n".join(
        [
            "---",
            'type: "Index"',
            'title: "UK Government APIs OKF"',
            'description: "Generated Markdown entry point for the UK Government APIs OKF exemplar."',
            "---",
            "",
            "# UK Government APIs OKF",
            "",
            "This Markdown layer is generated from the same source records as the large-corpus Explorer descriptor.",
            "",
            "## Counts",
            "",
            f"- API products: {counts.get('api_products')}",
            f"- Data access endpoints: {counts.get('data_access_endpoints')}",
            f"- Data products: {counts.get('data_products')}",
            f"- Contracts and capability documents: {counts.get('contracts')}",
            f"- Operations: {counts.get('operations')}",
            f"- Schemas: {counts.get('schemas')}",
            "",
            "## Licence Inference",
            "",
            "Source-declared licences are preserved and canonicalised first. ONS records with no explicit source licence are assigned Open Government Licence v3.0 from the ONS website terms; Ordnance Survey provider-native API records are assigned an OS licence-required status from OS licensing guidance. Both are marked `provider-terms-inferred` with lower confidence than source-declared licences.",
            "",
            "## Standards Alignment",
            "",
            "Each generated API/data record carries compact DCAT/OpenAPI alignment fields: `dcat_type`, `openapi_type`, export-readiness status, OpenAPI security-scheme type and missing standard requirements. The pack remains standards-alignable rather than DCAT-AP/OpenAPI conformant until RDF or `openapi` artefacts are emitted by an exporter.",
            "",
            "## Entry Points",
            "",
            "- [Explorer descriptor](okf-explorer.json)",
            "- [Specification notes](../sources/UK-Government-API-OKF.md)",
            "- [Standards crosswalk](../docs/okf-standards-crosswalk.md)",
            "",
        ]
    )
    files[Path("log.md")] = "\n".join(
        [
            "---",
            'type: "Log"',
            'title: "UK Government APIs OKF generation log"',
            "---",
            "",
            f"## {corpus['descriptor']['generated_at'][:10]}",
            "",
            "- Generated multi-source OKF Explorer descriptor, JSON shards, selected Markdown concepts, provenance-bearing relationships and data-hygiene warnings.",
            "- Canonicalised OGL licence variants, inferred OGL v3.0 for ONS records where source metadata omitted a licence, and inferred OS licence-required status for Ordnance Survey provider-native records; inferred records are counted in `licence_inferred_from_provider_terms`.",
            "- Added DCAT/OpenAPI alignment metadata, standards references and export-readiness gap summaries to records, descriptors and selected Markdown concept pages.",
            "",
        ]
    )
    return files


def search_docs(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    for ordinal, record in enumerate(records):
        docs.append(
            {
                "ordinal": ordinal,
                "name": record["name"],
                "title": record["title"],
                "publisher": record["publisher"],
                "publisher_title": record["publisher_title"],
                "resource_count": record["resource_count"],
                "formats": record["formats"],
                "tags": record["tags"],
                "topics": record["topics"],
                "quality_score": record["quality"]["overall"],
                "timestamp": record.get("timestamp", ""),
                "notes": truncate_text(record.get("notes", ""), MAX_SEARCH_NOTES_CHARS),
                "context_note": truncate_text(record.get("context_note", ""), MAX_SEARCH_CONTEXT_CHARS),
                "endpoint_host": record.get("endpoint_host", ""),
                "documentation_host": record.get("documentation_host", ""),
                "access_model": record.get("access_model", ""),
                "contract_status": record.get("contract_status", ""),
                "license_id": record.get("license_id", ""),
                "license_title": record.get("license_title", ""),
                "license_source_id": record.get("license_source_id", ""),
                "license_source_title": record.get("license_source_title", ""),
                "license_confidence": record.get("license_confidence"),
                "license_basis": record.get("license_basis", ""),
                "record_type": record.get("record_type", ""),
                "source_tier": record.get("source_tier", ""),
                "source_adapter": record.get("source_adapter", ""),
                "confidence": record.get("confidence", ""),
                "dcat_type": record.get("dcat_type", ""),
                "dcat_export_status": record.get("dcat_export_status", ""),
                "openapi_type": record.get("openapi_type", ""),
                "openapi_export_status": record.get("openapi_export_status", ""),
                "openapi_security_scheme": record.get("openapi_security_scheme", ""),
                "protocol": record.get("protocol", []),
                "documentation": truncate_text(record.get("documentation", ""), MAX_SEARCH_URL_CHARS),
                "url": truncate_text(record.get("url", ""), MAX_SEARCH_URL_CHARS),
                "open": record["route"],
                # Optional legal-corpus fields. They remain absent/empty for
                # ordinary API records and let the generic large-corpus
                # Explorer progressively resolve official legislation text.
                "legislation_id_uri": record.get("legislation_id_uri", ""),
                "document_uri": record.get("document_uri", ""),
                "structure_url": record.get("structure_url", ""),
                "table_of_contents_url": record.get("table_of_contents_url", ""),
                "document_type": record.get("document_type", ""),
                "type_code": record.get("type_code", ""),
                "category": record.get("category", ""),
                "year": record.get("year", ""),
                "number": record.get("number", ""),
                "creation_date": record.get("creation_date", ""),
                "published_at": record.get("published_at", ""),
                "updated_at": record.get("updated_at", ""),
                "jurisdiction": record.get("jurisdiction", []),
                "legal_status": record.get("legal_status", ""),
                "schema_org_type": record.get("schema_org_type", ""),
                "eli_class": record.get("eli_class", ""),
                "manifestations": record.get("manifestations", {}),
                "effects_made_url": record.get("effects_made_url", ""),
                "effects_received_url": record.get("effects_received_url", ""),
            }
        )
    return docs


def build_search(records: list[dict[str, Any]], max_postings_per_token: int = MAX_SEARCH_POSTINGS_PER_TOKEN) -> dict[str, Any]:
    result_docs = search_docs(records)
    posting_heaps: dict[str, list[tuple[int, int, int, int]]] = defaultdict(list)
    document_frequency: Counter[str] = Counter()
    weights = {
        "title": 16,
        "publisher": 8,
        "context": 6,
        "description": 5,
        "topics": 4,
        "record_type": 4,
        "protocol": 4,
        "standards": 4,
        "source": 3,
        "tags": 3,
        "url": 2,
    }
    masks = {"title": 1, "publisher": 2, "context": 4, "description": 8, "topics": 16, "tags": 32, "url": 64, "record_type": 128, "protocol": 256, "source": 512, "standards": 1024}
    for doc in result_docs:
        token_scores: dict[str, list[int]] = {}
        fields = {
            "title": doc["title"],
            "publisher": doc["publisher_title"],
            "description": doc.get("notes", ""),
            "context": doc.get("context_note", ""),
            "topics": " ".join(doc.get("topics", [])),
            "record_type": doc.get("record_type", ""),
            "protocol": " ".join(doc.get("protocol", [])),
            "standards": " ".join(str(doc.get(key, "")) for key in ["dcat_type", "dcat_export_status", "openapi_type", "openapi_export_status", "openapi_security_scheme"]),
            "source": " ".join(str(doc.get(key, "")) for key in ["source_tier", "source_adapter", "confidence"]),
            "tags": " ".join(doc.get("tags", [])),
            "url": " ".join(str(doc.get(key, "")) for key in ["open", "url", "documentation", "endpoint_host", "documentation_host"]),
        }
        for field, value in fields.items():
            for token in tokenize(str(value)):
                score, mask = token_scores.get(token, [0, 0])
                token_scores[token] = [score + weights[field], mask | masks[field]]
        for token, (score, mask) in token_scores.items():
            document_frequency[token] += 1
            heap = posting_heaps[token]
            item = (score, -doc["ordinal"], doc["ordinal"], mask)
            if len(heap) < max_postings_per_token:
                heapq.heappush(heap, item)
            elif item[:2] > heap[0][:2]:
                heapq.heapreplace(heap, item)

    postings_by_path: dict[str, dict[str, list[list[int]]]] = defaultdict(dict)
    lexicon_rows: list[dict[str, Any]] = []
    for token, heap in sorted(posting_heaps.items(), key=lambda item: item[0]):
        postings_path = f"data/search/postings/{search_shard(token)}.json"
        ranked = sorted(heap, key=lambda item: (-item[0], item[2]))
        postings_by_path[postings_path][token] = [[ordinal, score, mask] for score, _negative_ordinal, ordinal, mask in ranked]
        lexicon_rows.append({"token": token, "df": document_frequency[token], "postings": postings_path})
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

    result_doc_chunks = chunk_paths("search/results", result_docs, SEARCH_RESULT_DOC_CHUNK_SIZE)
    return {
        "manifest": {
            "schema": "okf-static-search.v1",
            "token_min_length": 2,
            "prefix_min_length": 3,
            "lexicon_shard_length": 2,
            "result_limit": 200,
            "result_doc_chunk_size": SEARCH_RESULT_DOC_CHUNK_SIZE,
            "weights": weights,
            "field_masks": masks,
            "counts": {
                "documents": len(result_docs),
                "tokens": len(lexicon_rows),
                "postings": sum(len(token_rows) for token_map in postings_by_path.values() for token_rows in token_map.values()),
                "uncapped_postings": sum(document_frequency.values()),
                "max_postings_per_token": max_postings_per_token,
            },
            "entrypoints": {
                "lexicon": {shard: f"data/search/lexicon/{shard}.json" for shard in sorted(lexicon_by_shard)},
                "prefixes": {shard: f"data/search/prefixes/{shard}.json" for shard in sorted(prefix_payloads)},
                "postings": sorted(postings_by_path),
                "result_docs": [path.as_posix() for path, _rows in result_doc_chunks],
                "facets": "data/facets.json",
                "doc_map": "data/search/doc-map.json",
            },
        },
        "lexicon": dict(sorted(lexicon_by_shard.items())),
        "prefixes": {shard: dict(sorted(payload.items())) for shard, payload in sorted(prefix_payloads.items())},
        "postings": {path: {"tokens": dict(sorted(tokens.items()))} for path, tokens in sorted(postings_by_path.items())},
        "result_doc_chunks": result_doc_chunks,
        "doc_map": {str(doc["ordinal"]): doc["open"] for doc in result_docs},
    }


def chunk_paths(prefix: str, rows: list[dict[str, Any]], chunk_size: int = 1000) -> list[tuple[Path, list[dict[str, Any]]]]:
    if not rows:
        return [(Path(f"data/{prefix}-0.json"), [])]
    return [(Path(f"data/{prefix}-{index // chunk_size}.json"), rows[index : index + chunk_size]) for index in range(0, len(rows), chunk_size)]


def relationship_bucket(route: str) -> str:
    value = 0x811C9DC5
    for byte in route.encode("utf-8"):
        value ^= byte
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{(value >> 24) & 0xFF:02x}"


def build_relationship_adjacency(
    relationships: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[tuple[Path, dict[str, list[dict[str, Any]]]]]]:
    by_route: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for relationship in relationships:
        source = str(relationship.get("source", ""))
        target = str(relationship.get("target", ""))
        if source:
            by_route[source].append(relationship)
        if target and target != source:
            by_route[target].append(relationship)
    buckets: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(dict)
    for route, rows in sorted(by_route.items()):
        buckets[relationship_bucket(route)][route] = rows
    bucket_files = [
        (Path(f"data/adjacency/{bucket}.json"), routes)
        for bucket, routes in sorted(buckets.items())
    ]
    manifest = {
        "schema": "okf-relationship-adjacency.v1",
        "algorithm": "fnv1a32-prefix-2",
        "routes": len(by_route),
        "relationships": len(relationships),
        "buckets": {bucket: f"data/adjacency/{bucket}.json" for bucket in sorted(buckets)},
    }
    return manifest, bucket_files


def canonical_counts(records: list[dict[str, Any]]) -> dict[str, int]:
    declared_api_products = sum(1 for record in records if record.get("record_type") == "API Product" and record.get("source_tier") == "declared_api_catalogue")
    provider_native_api_products = sum(1 for record in records if record.get("record_type") == "API Product" and record.get("source_tier") == "provider_native_api")
    return {
        "declared_api_products": declared_api_products,
        "provider_native_api_products": provider_native_api_products,
        "data_access_endpoints": sum(1 for record in records if record.get("record_type") == "Data Access API Endpoint"),
        "data_products": sum(1 for record in records if record.get("record_type") == "Data Product"),
        "contracts": sum(1 for record in records if record.get("record_type") in {"Contract", "Capability Document"}),
        "operations": sum(1 for record in records if record.get("record_type") == "API Operation"),
        "schemas": sum(1 for record in records if record.get("record_type") == "Schema"),
        "api_products": declared_api_products + provider_native_api_products,
    }


def build_corpus(
    rows: list[SourceRow],
    source_url: str,
    source_hash: str,
    *,
    ckan_packages: list[dict[str, Any]] | None = None,
    ckan_source_url: str = DEFAULT_CKAN_API_URL,
    os_documents: dict[str, dict[str, Any]] | None = None,
    os_root_url: str = DEFAULT_OS_API_ROOT,
    ons_root: dict[str, Any] | None = None,
    ons_datasets: list[dict[str, Any]] | None = None,
    ons_topics: list[dict[str, Any]] | None = None,
    ons_code_lists: list[dict[str, Any]] | None = None,
    ons_root_url: str = DEFAULT_ONS_API_ROOT,
) -> dict[str, Any]:
    observed_at = infer_observed_at(rows, ckan_packages, ons_datasets)
    builder = CorpusBuilder(source_url, source_hash, observed_at)
    add_api_catalogue_records(builder, rows, source_url, source_hash)
    if ckan_packages:
        add_ckan_records(builder, ckan_packages, ckan_source_url)
    if os_documents:
        add_os_records(builder, os_documents, os_root_url)
    if ons_root is not None:
        add_ons_records(builder, ons_root, ons_datasets or [], ons_topics or [], ons_code_lists or [], ons_root_url)
    add_contract_records(builder)
    add_declared_product_crosslinks(builder)
    builder.attach_resource_ids()

    records = builder.records
    resources = builder.resources
    relationships = builder.relationships
    annotate_relationship_density(records, relationships)
    publisher_counts: Counter[str] = Counter(record["publisher"] for record in records)
    publisher_resources: Counter[str] = Counter()
    for record in records:
        publisher_resources[record["publisher"]] += int(record.get("resource_count") or 0)

    publishers = [
        {
            "id": provider,
            "name": provider,
            "title": provider_title(provider),
            "description": f"Provider with {publisher_counts[provider]} records in the UK Government API OKF.",
            "dataset_count": publisher_counts[provider],
            "resource_count": publisher_resources[provider],
            "canonical_id": canonical_provider_slug(provider, provider_title(provider)),
            "canonical_title": provider_title(canonical_provider_slug(provider, provider_title(provider))),
            "concept_id": f"organisations/{provider}.md",
            "route": f"publisher/{provider}",
            "provenance": {"source": "Generated provider aggregation", "source_url": source_url, "source_sha256": source_hash},
            "state": "catalogue-listed",
            "approval_status": "not-assessed",
            "type": classify_family(provider, provider_title(provider)),
        }
        for provider in sorted(publisher_counts)
    ]

    for record in records:
        record["update_year"] = str(record.get("metadata_modified") or record.get("timestamp") or "")[:4] or "not-specified"

    facet_keys = [
        ("record_type", "Record type", "chips", "primary"),
        ("source_adapter", "Source", "chips", "primary"),
        ("source_tier", "Source tier", "chips", "primary"),
        ("confidence", "Confidence", "chips", "primary"),
        ("assurance_status", "Assurance status", "chips", "primary"),
        ("protocol", "Protocol", "chips", "primary"),
        ("publisher", "Provider", "searchable-select", "primary"),
        ("canonical_publisher", "Canonical provider", "searchable-select", "primary"),
        ("organisation_family", "Organisation family", "chips", "primary"),
        ("topic", "Domain", "chips", "primary"),
        ("interaction_style", "Interaction style", "chips", "secondary"),
        ("access_model", "Access model", "chips", "primary"),
        ("dcat_type", "DCAT term", "chips", "secondary"),
        ("openapi_type", "OpenAPI term", "chips", "secondary"),
        ("dcat_export_status", "DCAT export status", "chips", "secondary"),
        ("openapi_export_status", "OpenAPI export status", "chips", "secondary"),
        ("openapi_security_scheme", "OpenAPI security scheme", "chips", "secondary"),
        ("visibility", "Visibility", "chips", "secondary"),
        ("contract_status", "Contract status", "chips", "primary"),
        ("lifecycle_status", "Lifecycle status", "chips", "secondary"),
        ("documentation_host", "Documentation host", "searchable-select", "advanced"),
        ("endpoint_host", "Endpoint host", "searchable-select", "advanced"),
        ("license", "Licence", "chips", "secondary"),
        ("update_year", "Update year", "histogram", "secondary"),
        ("area_served", "Area served", "chips", "secondary"),
        ("quality_band", "Quality band", "chips", "primary"),
        ("data_classification", "Data classification", "chips", "secondary"),
        ("environment", "Environment", "chips", "secondary"),
        ("relationship_density", "Relationship density", "chips", "secondary"),
    ]
    facets = {key: facet_counts(records, key) for key, *_ in facet_keys}
    facets["resource_type"] = [{"value": value, "count": count} for value, count in Counter(resource["resource_type"] for resource in resources).most_common()]
    facets["format"] = facet_counts(records, "formats")
    facets["host"] = facet_counts(records, "endpoint_host")

    analysis_facets = [facet_analysis(records, key, label, control, rec) for key, label, control, rec in facet_keys]
    family_groups: dict[str, Counter[str]] = defaultdict(Counter)
    for record in records:
        family_groups[record["organisation_family"]][record["publisher"]] += 1
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
    recent = sorted(records, key=lambda item: item.get("timestamp", ""), reverse=True)[:16]
    graph_nodes = [{"id": "corpus/overview", "label": "UK Government APIs", "type": "corpus", "count": len(records)}]
    for key in ["record_type", "source_adapter", "protocol", "topic", "confidence"]:
        for row in facets.get(key, [])[:6]:
            graph_nodes.append({"id": f"facet/{key}/{row['value']}", "label": row["value"], "type": key, "count": row["count"]})
    graph_edges = [{"source": "corpus/overview", "target": node["id"], "label": "summarised by", "count": node.get("count")} for node in graph_nodes[1:]]

    relationship_counts = Counter(row["kind"] for row in relationships)
    count_values = {
        "datasets": len(records),
        "resources": len(resources),
        "publishers": len(publishers),
        "relationships": len(relationships),
        "api_resources": len(resources),
        "providers": len(publishers),
        **canonical_counts(records),
    }
    warnings = {
        "credential_parameters_redacted": builder.credential_params_redacted,
        "unsafe_urls_dropped": builder.unsafe_urls_dropped,
        "duplicate_slugs_dropped": builder.duplicate_slugs_dropped,
        "duplicate_endpoints_skipped": builder.duplicate_endpoints_skipped,
        "missing_contract": sum(1 for record in records if record.get("record_type") in {"API Product", "Data Access API Endpoint"} and record.get("contract_status") == "undocumented-in-catalogue"),
        "unknown_access": sum(1 for record in records if record.get("access_model") == "unknown"),
        "api_key_only": sum(1 for record in records if record.get("access_model") == "api-key"),
        "missing_licence": sum(1 for record in records if record.get("license_id") == "not-specified"),
        "licence_inferred_from_provider_terms": sum(1 for record in records if record.get("license_basis") == "provider-terms-inferred"),
    }
    latest_date = max((str(record.get("timestamp") or record.get("metadata_modified") or "")[:10] for record in records if record.get("timestamp") or record.get("metadata_modified")), default="1970-01-01")
    generated_at = f"{latest_date}T00:00:00Z"
    dcat_gap_counts: Counter[str] = Counter()
    openapi_gap_counts: Counter[str] = Counter()
    for record in records:
        alignment = record.get("standards_alignment", {})
        dcat_gap_counts.update(alignment.get("dcat", {}).get("required_missing", []))
        openapi_gap_counts.update(alignment.get("openapi", {}).get("required_missing", []))
    standards_alignment_overview = {
        "claim": "standards-alignable-not-conformant",
        "crosswalk": "../docs/okf-standards-crosswalk.md",
        "standards": STANDARDS_REFERENCES,
        "dcat_type_counts": [{"term": term, "count": count} for term, count in Counter(record.get("dcat_type", "not-specified") for record in records).most_common()],
        "openapi_type_counts": [{"term": term, "count": count} for term, count in Counter(record.get("openapi_type", "not-specified") for record in records).most_common()],
        "dcat_export_status_counts": [{"status": status, "count": count} for status, count in Counter(record.get("dcat_export_status", "not-specified") for record in records).most_common()],
        "openapi_export_status_counts": [{"status": status, "count": count} for status, count in Counter(record.get("openapi_export_status", "not-specified") for record in records).most_common()],
        "openapi_security_scheme_counts": [{"scheme": scheme, "count": count} for scheme, count in Counter(record.get("openapi_security_scheme", "not-specified") for record in records).most_common()],
        "dcat_common_missing": [{"property": prop, "count": count} for prop, count in dcat_gap_counts.most_common()],
        "openapi_common_missing": [{"field": field, "count": count} for field, count in openapi_gap_counts.most_common()],
        "export_policy": {
            "dcat": "Generated records are DCAT/DCAT-AP alignable metadata. A conformant export still requires RDF serialisation and profile validation.",
            "openapi": "Generated records can produce OpenAPI service stubs or operation fragments where endpoint metadata exists. Complete OpenAPI requires source paths, methods, parameters, responses and schemas.",
        },
    }
    analysis = {
        "schema": "okf-explorer-analysis.v1",
        "generated_at": generated_at,
        "source_bundle": "okf-explorer.json",
        "summary": {
            "title": "UK Government APIs overview",
            "description": "Multi-source operational view of declared public-sector API products, provider-native APIs, data access endpoints, datasets, operations, schemas and quality gaps.",
            "record_count": len(records),
            "resource_count": len(resources),
            "relationship_count": len(relationships),
            "notices": [
                "This is an observed public catalogue view, not an assurance register.",
                "Formal API products, data access endpoints, data products and operations are counted separately.",
                "API inclusion does not imply public accessibility; access conditions stay explicit.",
                "No API keys, client secrets, tokens, certificates, or live calls are stored in the OKF bundle.",
                "Selected concept records are also emitted as browser-compatible Markdown files.",
                "ONS records without explicit source licence metadata inherit an inferred Open Government Licence v3.0 from ONS website terms; Ordnance Survey provider-native records inherit an inferred OS licence-required status from OS licensing guidance. Both have lower confidence than source-declared licences.",
                "API/data records now carry compact DCAT/OpenAPI alignment metadata for export readiness, but the bundle is standards-alignable rather than DCAT-AP or OpenAPI conformant until exporters emit those artefacts.",
            ],
        },
        "canonical_counts": count_values,
        "warnings": warnings,
        "standards_alignment": standards_alignment_overview,
        "graph_overview": {"nodes": graph_nodes, "edges": graph_edges},
        "timeline_overview": {
            "buckets": [
                {
                    "id": f"year:{year}",
                    "label": year,
                    "count": count,
                    "route": f"facet/update_year/{year}",
                    "samples": [doc for doc in search_docs([record for record in records if record["update_year"] == year])[:2]],
                }
                for year, count in Counter(record["update_year"] for record in records if record["update_year"] != "not-specified").most_common()
            ]
        },
        "relationship_overview": {
            "types": [
                {
                    "kind": kind,
                    "count": count,
                    "samples": [{"source": rel["source"], "target": rel["target"], "label": kind} for rel in relationships if rel["kind"] == kind][:2],
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
                {"route": record["route"], "label": record["title"], "count": record["resource_count"], "publisher": record["publisher_title"]}
                for record in sorted(records, key=lambda item: (-int(item["resource_count"]), item["title"]))[:16]
            ],
            "distributions": {
                "resource_type": facets["resource_type"],
                "record_type": facets["record_type"],
                "source_adapter": facets["source_adapter"],
                "protocol": facets["protocol"],
                "quality_band": facets["quality_band"],
                "assurance_status": facets["assurance_status"],
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
                "classes": ["APIReference", "WebAPI", "Organization", "CreativeWork", "Dataset"],
                "properties": ["provider", "documentation", "license", "dateModified"],
                "notes": ["Useful for publication semantics; not sufficient for executable API contracts."],
            }
        ],
        "narrative": {
            "title": "UK Government APIs as an OKF control-plane view",
            "body": "This exemplar now separates declared API products from provider-native APIs, data access endpoints, data products, operations and schemas. It records source tier, adapter and confidence for each concept while excluding secrets and live execution.",
        },
    }

    overview = {
        "schema": "okf-large-overview.v1",
        "title": "UK Government APIs",
        "generated_at": generated_at,
        "counts": count_values,
        "warnings": warnings,
        "top_publishers": top_publishers,
        "recent_datasets": search_docs(recent),
        "format_counts": facets["protocol"],
        "facet_previews": {key: rows[:18] for key, rows in facets.items()},
        "notices": analysis["summary"]["notices"],
        "standards_alignment": standards_alignment_overview,
    }

    search = build_search(records)
    record_chunks = chunk_paths("apis", records)
    resource_chunks = chunk_paths("resources", resources)
    publisher_chunks = chunk_paths("providers", publishers)
    relationship_chunks = chunk_paths("relationships", relationships, chunk_size=2000)
    relationship_adjacency, relationship_adjacency_buckets = build_relationship_adjacency(relationships)
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
            "relationship_adjacency": "data/adjacency/manifest.json",
        },
        "chunks": {
            "datasets": [str(path) for path, _ in record_chunks],
            "resources": [str(path) for path, _ in resource_chunks],
            "publishers": [str(path) for path, _ in publisher_chunks],
            "relationships": [str(path) for path, _ in relationship_chunks],
        },
        "performance": {
            "startup_mode": "overview-first",
            "full_record_hydration": "lazy",
            "relationship_hydration": "lazy",
            "route_relationship_hydration": "hash-sharded adjacency",
            "search": "static worker shards",
        },
        "search": {
            "schema": search["manifest"]["schema"],
            "documents": len(records),
            "tokens": search["manifest"]["counts"]["tokens"],
            "result_limit": search["manifest"]["result_limit"],
        },
    }
    descriptor = {
        "@context": "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld",
        "@id": "https://chris-page-gov.github.io/okf-uk-government-apis/okf-explorer.json",
        "schema": "okf-explorer-large-corpus.v1",
        "kind": "okf-large-corpus",
        "title": "UK Government APIs OKF",
        "description": "Large-corpus OKF exemplar generated from GOV.UK API Catalogue, data.gov.uk, Ordnance Survey and ONS public API sources, with API-domain facets, typed relationships, search shards, and operational metadata.",
        "version": "0.4.0",
        "status": "preview",
        "profile": "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/",
        "publisher": "https://github.com/chris-page-gov",
        "license": OGL_V3_URL,
        "semantic_descriptor": "https://chris-page-gov.github.io/okf-uk-government-apis/bundle.yamlld",
        "generated_at": generated_at,
        "entrypoints": {
            "viewer": "../next/",
            "data_manifest": "data/manifest.json",
            "overview_index": "data/overview.json",
            "analysis_overview": "data/analysis/overview.json",
            "search_manifest": "data/search/manifest.json",
            "relationship_adjacency": "data/adjacency/manifest.json",
            "markdown_index": "index.md",
            "notes": "../sources/UK-Government-API-OKF.md",
            "standards_crosswalk": "../docs/okf-standards-crosswalk.md",
        },
        "counts": overview["counts"],
        "performance": manifest["performance"],
        "source": {
            "title": "UK Government public API discovery sources",
            "url": "https://www.api.gov.uk/",
            "data_url": source_url,
            "source_sha256": source_hash,
            "license": "Open Government Licence v3.0 unless otherwise stated",
            "source_tiers": ["declared_api_catalogue", "provider_native_api", "data_access_endpoint", "contract_discovery"],
            "adapters": ["api_gov_uk_catalogue", "data_gov_uk_ckan", "ordnance_survey_api_os_uk", "ons_beta_api", "contract_discovery"],
            "standards": STANDARDS_REFERENCES,
        },
        "vocabulary": {
            "record_singular": "API/data record",
            "record_plural": "API/data records",
            "resource_singular": "API evidence",
            "resource_plural": "API evidence",
            "publisher_singular": "provider",
            "publisher_plural": "providers",
            "format_plural": "protocols",
            "resource_stack_label": "Evidence stack",
            "search_placeholder": "Search API products, data endpoints, datasets, providers, protocols",
            "standard_term_style": "monospace",
        },
        "extensions": {
            "okf-explorer-analysis.v1": {"mode": "external", "entrypoint": "analysis_overview"},
            "okf-standards-crosswalk.v1": {
                "mode": "standards-alignable",
                "crosswalk": "../docs/okf-standards-crosswalk.md",
                "claim": "Records carry DCAT/OpenAPI mappings and export-readiness gaps; the pack is not DCAT-AP RDF or complete OpenAPI without an exporter.",
                "standards": STANDARDS_REFERENCES,
                "dcat_names_rendering": "monospace",
            },
            "okf-api-catalogue.v2": {
                "mode": "multi-source-derived",
                "source_adapters": ["api_gov_uk_catalogue", "data_gov_uk_ckan", "ordnance_survey_api_os_uk", "ons_beta_api", "contract_discovery"],
                "secret_values_stored": False,
                "live_calls_enabled": False,
                "markdown_record_types": sorted(MARKDOWN_RECORD_TYPES),
            },
        },
    }
    graph = {
        "node_counts": {
            "dataset": len(records),
            "resource": len(resources),
            "publisher": len(publishers),
            "api_product": count_values["api_products"],
            "data_access_endpoint": count_values["data_access_endpoints"],
            "data_product": count_values["data_products"],
            "operation": count_values["operations"],
            "schema": count_values["schemas"],
        },
        "edge_counts": [{"kind": kind, "count": count} for kind, count in relationship_counts.most_common()],
        "relationship_index": "data/relationships-0.json",
        "top_publishers": top_publishers,
    }
    return {
        "descriptor": descriptor,
        "manifest": manifest,
        "overview": overview,
        "analysis": analysis,
        "records": records,
        "resources": resources,
        "publishers": publishers,
        "relationships": relationships,
        "record_chunks": record_chunks,
        "resource_chunks": resource_chunks,
        "publisher_chunks": publisher_chunks,
        "relationship_chunks": relationship_chunks,
        "relationship_adjacency": relationship_adjacency,
        "relationship_adjacency_buckets": relationship_adjacency_buckets,
        "facets": facets,
        "graph": graph,
        "search": search,
    }


def render_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n"


def output_files(corpus: dict[str, Any]) -> dict[Path, str]:
    files = {
        Path("okf-explorer.json"): render_json(corpus["descriptor"]),
        Path("data/manifest.json"): render_json(corpus["manifest"]),
        Path("data/overview.json"): render_json(corpus["overview"]),
        Path("data/analysis/overview.json"): render_json(corpus["analysis"]),
        Path("data/facets.json"): render_json(corpus["facets"]),
        Path("data/graph.json"): render_json(corpus["graph"]),
        Path("data/adjacency/manifest.json"): render_json(corpus["relationship_adjacency"]),
        Path("data/search/manifest.json"): render_json(corpus["search"]["manifest"]),
        Path("data/search/doc-map.json"): render_json(corpus["search"]["doc_map"]),
    }
    for path, rows in corpus["record_chunks"]:
        files[path] = render_json(rows)
    for path, rows in corpus["resource_chunks"]:
        files[path] = render_json(rows)
    for path, rows in corpus["publisher_chunks"]:
        files[path] = render_json(rows)
    for path, rows in corpus["relationship_chunks"]:
        files[path] = render_json(rows)
    for path, routes in corpus["relationship_adjacency_buckets"]:
        files[path] = render_json(routes)
    for shard, rows in corpus["search"]["lexicon"].items():
        files[Path(f"data/search/lexicon/{shard}.json")] = render_json(rows)
    for shard, payload in corpus["search"]["prefixes"].items():
        files[Path(f"data/search/prefixes/{shard}.json")] = render_json(payload)
    for path, payload in corpus["search"]["postings"].items():
        files[Path(path)] = render_json(payload)
    for path, rows in corpus["search"]["result_doc_chunks"]:
        files[path] = render_json(rows)
    files.update(markdown_output_files(corpus))
    return files


def clear_output_files(output: Path) -> None:
    if not output.exists():
        output.mkdir(parents=True)
        return
    for path in sorted(output.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if path.is_file() or path.is_symlink():
            path.unlink()
        elif path.is_dir():
            try:
                path.rmdir()
            except OSError:
                pass


def write_files(output: Path, files: dict[Path, str | bytes]) -> None:
    clear_output_files(output)
    output.mkdir(parents=True, exist_ok=True)
    for rel_path, content in files.items():
        target = output / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            target.write_bytes(content)
        else:
            target.write_text(content, encoding="utf-8")


def check_files(output: Path, files: dict[Path, str | bytes]) -> list[str]:
    errors: list[str] = []
    expected_paths = set(files)
    for rel_path, expected in sorted(files.items()):
        target = output / rel_path
        if not target.exists():
            errors.append(f"{display_path(target)} is missing")
            continue
        if isinstance(expected, bytes):
            if target.read_bytes() != expected:
                errors.append(f"{display_path(target)} is out of date")
            continue
        current = target.read_text(encoding="utf-8")
        if current != expected:
            current_lines = current.splitlines()
            expected_lines = expected.splitlines()
            if len(current) > MAX_CHECK_DIFF_BYTES or len(expected) > MAX_CHECK_DIFF_BYTES or len(current_lines) > MAX_CHECK_DIFF_LINES or len(expected_lines) > MAX_CHECK_DIFF_LINES:
                errors.append(
                    f"{display_path(target)} is out of date "
                    f"(current {len(current_lines)} lines, sha256 {hashlib.sha256(current.encode('utf-8')).hexdigest()}; "
                    f"generated {len(expected_lines)} lines, sha256 {hashlib.sha256(expected.encode('utf-8')).hexdigest()})"
                )
            else:
                diff = "\n".join(
                    difflib.unified_diff(
                        current_lines,
                        expected_lines,
                        fromfile=f"{display_path(target)} (current)",
                        tofile=f"{display_path(target)} (generated)",
                        lineterm="",
                        n=3,
                    )
                )
                errors.append(f"{display_path(target)} is out of date:\n{diff}")
    if output.exists():
        for target in sorted(path for path in output.rglob("*") if path.is_file()):
            rel_path = target.relative_to(output)
            if rel_path not in expected_paths and target.name != ".DS_Store":
                errors.append(f"{display_path(target)} is unexpected")
    return errors


def load_fixture_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=DEFAULT_SOURCE_URL, help="GOV.UK API Catalogue CSV source path or URL")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="generated corpus directory")
    parser.add_argument("--check", action="store_true", help="fail if generated files are not synchronized")
    parser.add_argument("--skip-ckan", action="store_true", help="skip data.gov.uk CKAN enrichment")
    parser.add_argument("--skip-os", action="store_true", help="skip Ordnance Survey API enrichment")
    parser.add_argument("--skip-ons", action="store_true", help="skip ONS API enrichment")
    parser.add_argument("--max-ckan-packages", type=int, default=0, help="limit CKAN packages for local debugging; 0 means all")
    parser.add_argument("--ckan-fixture", type=Path, help="read CKAN package_search fixture JSON instead of live data.gov.uk")
    parser.add_argument("--os-fixture", type=Path, help="read OS document-map fixture JSON instead of live api.os.uk")
    parser.add_argument("--ons-fixture", type=Path, help="read ONS fixture JSON with root/datasets/topics/code_lists instead of live API")
    args = parser.parse_args(argv)

    output = args.output if args.output.is_absolute() else ROOT / args.output
    source_url, source_hash, rows = load_rows(args.source)

    ckan_source_url = DEFAULT_CKAN_API_URL
    ckan_packages: list[dict[str, Any]] = []
    if not args.skip_ckan:
        if args.ckan_fixture:
            fixture = load_fixture_json(args.ckan_fixture)
            ckan_source_url = args.ckan_fixture.resolve().as_uri()
            ckan_packages = fixture.get("result", {}).get("results", fixture.get("packages", []))
        else:
            ckan_source_url, ckan_packages = load_ckan_packages(max_packages=args.max_ckan_packages)

    os_documents: dict[str, dict[str, Any]] = {}
    if not args.skip_os:
        if args.os_fixture:
            os_documents = load_fixture_json(args.os_fixture)
        else:
            os_documents = discover_os_documents()

    ons_root: dict[str, Any] | None = None
    ons_datasets: list[dict[str, Any]] = []
    ons_topics: list[dict[str, Any]] = []
    ons_code_lists: list[dict[str, Any]] = []
    if not args.skip_ons:
        if args.ons_fixture:
            fixture = load_fixture_json(args.ons_fixture)
            ons_root = fixture.get("root", {})
            ons_datasets = fixture.get("datasets", [])
            ons_topics = fixture.get("topics", [])
            ons_code_lists = fixture.get("code_lists", [])
        else:
            ons_root, ons_datasets, ons_topics, ons_code_lists = load_ons_payloads()

    corpus = build_corpus(
        rows,
        source_url,
        source_hash,
        ckan_packages=ckan_packages,
        ckan_source_url=ckan_source_url,
        os_documents=os_documents,
        ons_root=ons_root,
        ons_datasets=ons_datasets,
        ons_topics=ons_topics,
        ons_code_lists=ons_code_lists,
    )
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
        print(
            "UK Government API OKF is synchronized with "
            f"{corpus['descriptor']['counts']['declared_api_products']} declared API products, "
            f"{corpus['descriptor']['counts']['data_access_endpoints']} data access endpoints, "
            f"{corpus['descriptor']['counts']['data_products']} data products"
        )
        return 0
    write_files(output, files)
    print(
        f"wrote {display_path(output)} with "
        f"{corpus['descriptor']['counts']['declared_api_products']} declared API products, "
        f"{corpus['descriptor']['counts']['data_access_endpoints']} data access endpoints, "
        f"{corpus['descriptor']['counts']['data_products']} data products"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
