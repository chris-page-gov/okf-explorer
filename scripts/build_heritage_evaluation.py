#!/usr/bin/env python3
"""Build the Coventry and Warwickshire Evaluation Foundry heritage corpus.

The builder consumes a frozen, normalized source snapshot. Network acquisition
is deliberately separate so ``--check`` never depends on a mutable live source.
Publication bases are source configuration. ``--public-base`` is a migration
preview/one-off override; persist the accepted base in each frozen snapshot so
subsequent default ``--check`` runs require no implicit environment setting.
"""

from __future__ import annotations

import argparse
import base64
import copy
import gzip
import hashlib
import io
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlparse

import build_uk_government_api_okf as large_corpus
import heritage_build_io
import okf_semantic

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "source-snapshot.json.gz"
)
DEFAULT_OUTPUT = ROOT / "evaluation" / "heritage"
PUBLIC_BASE = (
    "https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/"
)
EXPLORER_BASE = "https://chris-page-gov.github.io/okf-explorer/"
EXPLORER_REPOSITORY = "https://github.com/chris-page-gov/okf-explorer"
PUBLICATION_REPOSITORY = (
    "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire"
)
EVALUATION_PROFILE_SCHEMA_URL = (
    f"{EXPLORER_BASE}evaluation-foundry/schemas/okf-evaluation-profile.v2.schema.json"
)
OGL = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
NHLE_SERVICE = (
    "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/"
    "National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer"
)
NHLE_ITEM = "https://www.arcgis.com/home/item.html?id=767f279327a24845bf47dfe5eae9862b"
NHLE_SEARCH = "https://historicengland.org.uk/listing/the-list/list-entry/"
HAR_SEARCH_RESULTS = (
    "https://historicengland.org.uk/listing/heritage-at-risk/search-register/results"
)
HAR_ANNUAL = (
    "https://historicengland.org.uk/listing/heritage-at-risk/search-register/"
    "annual-heritage-at-risk-registers-and-maps/"
)
ONS_BOUNDARY_SERVICE = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
    "Local_Authority_Districts_DEC_2025_Boundaries_UK_BFC/FeatureServer/0"
)
PROFILE_PATH = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "evaluation-profile.yaml"
)
MAPPING_PATH = PROFILE_PATH.with_name("mapping-proposals.yaml")
JOURNEYS_PATH = PROFILE_PATH.with_name("journeys.json")
QUESTIONS_PATH = PROFILE_PATH.with_name("questions.json")
FEATURE_COVERAGE_PATH = PROFILE_PATH.with_name("feature-coverage.json")
PROTECTED_SOURCE_RECEIPT_PATH = (
    PROFILE_PATH.parent / "evidence" / "protected-source-link-receipt.json"
)
TINY_SNAPSHOT = PROFILE_PATH.parent / "tiny" / "source-snapshot.json"
SYNTHETIC_SNAPSHOT = PROFILE_PATH.parent / "synthetic" / "source-snapshot.json"

LAYER_TYPES = {
    0: ("Listed Building", "listed-building"),
    1: ("Building Preservation Notice", "building-preservation-notice"),
    2: ("Certificate of Immunity", "certificate-of-immunity"),
    6: ("Scheduled Monument", "scheduled-monument"),
    7: ("Registered Park and Garden", "registered-park-and-garden"),
    8: ("Registered Battlefield", "registered-battlefield"),
    9: ("Protected Wreck Site", "protected-wreck-site"),
    10: ("World Heritage Site", "world-heritage-site"),
}
DATE_FIELDS = (
    "ListDate",
    "SchedDate",
    "RegDate",
    "DesigDate",
    "InscrDate",
    "BPNStart",
    "COIStart",
)
AMENDMENT_FIELDS = ("AmendDate", "BPNExpire", "COIExpire")
GRADE_ALIASES = {
    "I": ["Grade I", "Grade 1", "Grade One"],
    "II": ["Grade II", "Grade 2", "Grade Two"],
    "II*": ["Grade II star", "Grade 2 star", "Grade Two Star", "Grade II*"],
}
ASSERTION_STATUSES = {"official", "normalized", "inferred", "model-derived"}
ASSERTION_SCOPES = {"real-world", "synthetic-fixture"}
OUTPUT_TREE_ALGORITHM = "sha256-over-canonical-json-path-bytes-digest-list-v1"
HISTORIC_ENGLAND_ORIGINS = {
    "historicengland.org.uk",
    "www.historicengland.org.uk",
}
NHLE_ARCGIS_ORIGINS = {"services-eu1.arcgis.com"}

# These discovery names are deliberately few, independently reviewed and
# provenance-bound.  They improve retrieval without replacing the statutory
# NHLE title or asserting exact semantic equivalence.  In particular, Jephson
# Gardens is a named component of the wider registered landscape, not an
# alternative legal title for the whole registration.
REVIEWED_SEARCH_NAMES: dict[str, dict[str, Any]] = {
    "1342941": {
        "aliases": [
            "New Coventry Cathedral",
            "Modern Coventry Cathedral",
            "Basil Spence Cathedral",
        ],
        "relationship": "reviewed-descriptive-name",
        "evidence_title": "Official NHLE entry describing the new cathedral, built 1951–62",
        "evidence_url": "https://historicengland.org.uk/listing/the-list/list-entry/1342941",
    },
    "1116402": {
        "aliases": [
            "St Mary's Guildhall",
            "St Mary's Guildhall, Coventry",
            "Saint Mary's Guildhall",
        ],
        "relationship": "familiar-name",
        "evidence_title": "Historic England Archive: St Mary's Hall (St Mary's Guildhall)",
        "evidence_url": "https://historicengland.org.uk/images-books/photos/item/AA42/00537",
    },
    "1035500": {
        "aliases": [
            "Collegiate Church of St Mary",
            "Collegiate Church of St Mary, Warwick",
            "Collegiate Church of Saint Mary",
            "St Mary's Church, Warwick",
        ],
        "relationship": "familiar-name",
        "evidence_title": "Historic England grant visit: Collegiate Church of St Mary",
        "evidence_url": (
            "https://historicengland.org.uk/advice/grants/visit/"
            "collegiate-church-of-st-mary-old-square-cv34-4ra/"
        ),
    },
    "1000498": {
        "aliases": ["Jephson Gardens"],
        "relationship": "component-name",
        "evidence_title": "Official NHLE entry naming Jephson Gardens within Spa Gardens",
        "evidence_url": "https://historicengland.org.uk/listing/the-list/list-entry/1000498",
    },
}


def publication_config(snapshot: dict[str, Any]) -> dict[str, str]:
    """Return the explicitly namespaced publication identity for a snapshot."""
    declared = snapshot.get("publication") if isinstance(snapshot.get("publication"), dict) else {}
    base = safe_http_url(declared.get("public_base")) or PUBLIC_BASE
    base = f"{base.rstrip('/')}/"
    role = clean_text(declared.get("role")) or "faithful"
    family_base = safe_http_url(declared.get("family_public_base"))
    if not family_base:
        family_base = (
            base.removesuffix(f"{role}/")
            if role in {"tiny", "synthetic"} and base.endswith(f"/{role}/")
            else base
        )
    family_base = f"{family_base.rstrip('/')}/"
    return {
        "public_base": base,
        "family_public_base": family_base,
        "role": role,
        "title": clean_text(declared.get("title")) or "Coventry and Warwickshire Heritage Evaluation",
        "description": clean_text(declared.get("description"))
        or (
            "Functionality evaluation containing every supported NHLE open-data record "
            "intersecting exact Coventry and Warwickshire local-authority boundaries, plus "
            "sanctioned annual Heritage at Risk observations."
        ),
        "status": clean_text(declared.get("status")) or "evaluation-provisional",
        "license": safe_http_url(declared.get("license")) or OGL,
        "publisher": safe_http_url(declared.get("publisher")) or "https://historicengland.org.uk/",
        "publisher_title": clean_text(declared.get("publisher_title")) or "Historic England",
    }


def retarget_publication(
    snapshot: dict[str, Any], family_public_base: str, *, fixture: str
) -> dict[str, Any]:
    """Return a snapshot copy retargeted to one safe publication family base."""

    parsed = urlparse(clean_text(family_public_base))
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("--public-base must be an absolute HTTPS URL without credentials, query or fragment")
    family_base = f"{family_public_base.rstrip('/')}/"
    role = publication_config(snapshot)["role"]
    suffix = role if role in {"tiny", "synthetic"} else fixture
    public_base = (
        f"{family_base}{suffix}/"
        if suffix in {"tiny", "synthetic"}
        and not family_base.rstrip("/").endswith(f"/{suffix}")
        else family_base
    )
    result = copy.deepcopy(snapshot)
    publication = result.setdefault("publication", {})
    publication["public_base"] = public_base
    publication["family_public_base"] = (
        family_base.removesuffix(f"{suffix}/")
        if suffix in {"tiny", "synthetic"} and family_base.endswith(f"/{suffix}/")
        else family_base
    )
    return result


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_snapshot(path: Path) -> dict[str, Any]:
    payload = gzip.decompress(path.read_bytes()) if path.suffix == ".gz" else path.read_bytes()
    snapshot = json.loads(payload.decode("utf-8"))
    if snapshot.get("schema") != "heritage-evaluation-source-snapshot.v1":
        raise ValueError("source snapshot must use heritage-evaluation-source-snapshot.v1")
    return snapshot


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def output_tree_receipt(
    files: dict[Path, str | bytes],
) -> dict[str, Any]:
    """Root a complete generated tree with one explicit canonical algorithm.

    Paths are sorted by POSIX spelling.  Each row contains ``path``, ``bytes``
    and the SHA-256 of the exact file bytes.  The tree digest is SHA-256 over
    the UTF-8, compact, key-sorted JSON array rendered by ``render_json``.
    """

    entries: list[dict[str, Any]] = []
    for path, content in sorted(files.items(), key=lambda item: item[0].as_posix()):
        raw = content if isinstance(content, bytes) else content.encode("utf-8")
        entries.append(
            {
                "path": path.as_posix(),
                "bytes": len(raw),
                "sha256": sha256_bytes(raw),
            }
        )
    canonical = large_corpus.render_json(entries).encode("utf-8")
    return {
        "algorithm": OUTPUT_TREE_ALGORITHM,
        "files": len(entries),
        "bytes": sum(entry["bytes"] for entry in entries),
        "tree_sha256": sha256_bytes(canonical),
    }


def slugify(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-") or "item"


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def unique_text_values(values: Iterable[Any]) -> list[str]:
    """Return non-empty text once, preserving first-source order."""
    return list(dict.fromkeys(clean for value in values if (clean := clean_text(value))))


def first_value(values: Iterable[Any]) -> str:
    return next((clean_text(value) for value in values if clean_text(value)), "")


def iso_date(value: Any) -> str:
    if value in {None, ""}:
        return ""
    if isinstance(value, (int, float)) and math.isfinite(value):
        try:
            return datetime.fromtimestamp(float(value) / 1000, tz=timezone.utc).date().isoformat()
        except (OverflowError, OSError, ValueError):
            return ""
    candidate = clean_text(value)
    if not candidate:
        return ""
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}(?:T.*)?", candidate):
        return candidate[:10]
    for pattern in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(candidate, pattern).date().isoformat()
        except ValueError:
            pass
    return ""


def safe_http_url(value: Any, *, origins: set[str] | None = None) -> str:
    candidate = clean_text(value)
    try:
        parsed = urlparse(candidate)
    except ValueError:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        return ""
    if origins and parsed.netloc.lower() not in origins:
        return ""
    return candidate


def official_historic_england_url(value: Any) -> str:
    candidate = safe_http_url(value, origins=HISTORIC_ENGLAND_ORIGINS)
    return candidate if candidate and urlparse(candidate).scheme == "https" else ""


def official_har_source_url(value: Any, year: int) -> str:
    """Return a sanctioned annual-register URL, rejecting supplied lookalikes."""

    declared = clean_text(value)
    if not declared:
        return HAR_ANNUAL
    candidate = official_historic_england_url(declared)
    path = urlparse(candidate).path if candidate else ""
    allowed_year_path = f"/content/docs/har/har-{year}-entries-additions-removals/"
    if candidate == HAR_ANNUAL:
        return candidate
    if not candidate or path.rstrip("/") != allowed_year_path.rstrip("/"):
        raise ValueError(
            f"HAR {year} source URL must be the sanctioned Historic England annual source"
        )
    return candidate


def explorer_record_iri(public_base: str, route: str) -> str:
    bundle = f"{public_base.rstrip('/')}/okf-explorer.json"
    route_token = base64.urlsafe_b64encode(route.encode("utf-8")).decode("ascii").rstrip("=")
    return (
        f"{EXPLORER_BASE}?bundle={quote(bundle, safe='')}"
        f"#record:{route_token}"
    )


def exact_nhle_list_entry_binding(value: Any, list_entry: Any) -> bool:
    """Whether ``value`` is exactly the official NHLE page for ``list_entry``."""

    identifier = clean_text(list_entry)
    candidate = official_historic_england_url(value)
    if not candidate or not identifier.isdigit():
        return False
    parsed = urlparse(candidate)
    return (
        parsed.path == f"/listing/the-list/list-entry/{identifier}"
        and not parsed.params
        and not parsed.query
        and not parsed.fragment
    )


def list_entry_url(list_entry: str, declared: Any = "") -> str:
    canonical = f"{NHLE_SEARCH}{quote(list_entry)}"
    declared_text = clean_text(declared)
    if declared_text:
        if not exact_nhle_list_entry_binding(declared_text, list_entry):
            raise ValueError(
                f"NHLE {list_entry} supplied rich page is not the identifier-bound Historic England page"
            )
        return canonical
    return canonical


def har_register_search_url(list_entry: str, declared: Any = "") -> str:
    """Return the live HAR register search bound to one List Entry Number.

    Historic England's former ``search-register/list-entry/<LEN>`` route is no
    longer a live record page.  Frozen source rows may still contain that
    official deprecated route, so accept it only when its path binds the same
    identifier and normalize it to the current ``results?q=<LEN>`` search.
    """

    identifier = clean_text(list_entry)
    declared_text = clean_text(declared)
    if not identifier.isdigit():
        if declared_text:
            raise ValueError(
                "HAR register search requires a numeric List Entry Number for identifier binding"
            )
        return ""

    canonical = f"{HAR_SEARCH_RESULTS}?q={quote(identifier, safe='')}"
    if not declared_text:
        return canonical

    candidate = official_historic_england_url(declared_text)
    if not candidate:
        raise ValueError(
            f"HAR List entry {identifier} supplied search URL is not sanctioned Historic England HTTPS"
        )

    parsed = urlparse(candidate)
    path = parsed.path.rstrip("/")
    current_path = urlparse(HAR_SEARCH_RESULTS).path
    deprecated_path = (
        "/listing/heritage-at-risk/search-register/list-entry/"
        f"{identifier}"
    )
    current_binding = (
        path == current_path
        and parse_qsl(parsed.query, keep_blank_values=True) == [("q", identifier)]
        and not parsed.fragment
    )
    deprecated_binding = (
        path == deprecated_path and not parsed.query and not parsed.fragment
    )
    if current_binding or deprecated_binding:
        return canonical
    raise ValueError(
        f"HAR List entry {identifier} supplied search URL does not bind the exact q parameter"
    )


def exact_har_register_search_binding(value: Any, list_entry: Any) -> bool:
    """Whether ``value`` is the canonical HAR search for exactly ``list_entry``."""

    identifier = clean_text(list_entry)
    candidate = official_historic_england_url(value)
    if not candidate or not identifier.isdigit():
        return False
    parsed = urlparse(candidate)
    return (
        parsed.scheme == "https"
        and parsed.netloc.lower() == "historicengland.org.uk"
        and parsed.path == urlparse(HAR_SEARCH_RESULTS).path
        and parse_qsl(parsed.query, keep_blank_values=True) == [("q", identifier)]
        and not parsed.fragment
    )


def flatten_coordinates(value: Any) -> list[tuple[float, float]]:
    coordinates: list[tuple[float, float]] = []
    if isinstance(value, (list, tuple)):
        if len(value) >= 2 and all(isinstance(item, (int, float)) for item in value[:2]):
            coordinates.append((float(value[0]), float(value[1])))
        else:
            for item in value:
                coordinates.extend(flatten_coordinates(item))
    return coordinates


def ring_signed_area(ring: list[Any]) -> float:
    points = flatten_coordinates(ring)
    if len(points) < 3:
        return 0.0
    if points[0] != points[-1]:
        points.append(points[0])
    return sum(
        left[0] * right[1] - right[0] * left[1]
        for left, right in zip(points, points[1:], strict=False)
    ) / 2


def point_in_ring(point: tuple[float, float], ring: list[Any]) -> bool:
    points = flatten_coordinates(ring)
    if len(points) < 3:
        return False
    inside = False
    x, y = point
    previous = points[-1]
    for current in points:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > y) != (y2 > y):
            crossing = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < crossing:
                inside = not inside
        previous = current
    return inside


def esri_rings_to_geojson(rings_value: Any) -> dict[str, Any] | None:
    """Convert ArcGIS clockwise exteriors/counter-clockwise holes losslessly."""

    if not isinstance(rings_value, list) or not rings_value:
        return None
    rings: list[list[Any]] = []
    for raw in rings_value:
        if not isinstance(raw, list) or len(flatten_coordinates(raw)) < 3:
            raise ValueError("ArcGIS polygon contains an invalid ring")
        ring = list(raw)
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        rings.append(ring)

    areas = [ring_signed_area(ring) for ring in rings]
    exterior_indexes = [index for index, area in enumerate(areas) if area < 0]
    hole_indexes = [index for index, area in enumerate(areas) if area > 0]
    # Degenerate rings cannot encode a hole. Retaining them as an exterior is
    # conservative and preserves the source coordinates for inspection.
    exterior_indexes.extend(index for index, area in enumerate(areas) if area == 0)
    if not exterior_indexes:
        exterior_indexes = [max(range(len(rings)), key=lambda index: abs(areas[index]))]
        hole_indexes = [index for index in range(len(rings)) if index not in exterior_indexes]

    polygons: dict[int, list[list[Any]]] = {
        index: [rings[index]] for index in exterior_indexes
    }
    for hole_index in hole_indexes:
        point = flatten_coordinates(rings[hole_index])[0]
        containers = [
            exterior_index
            for exterior_index in exterior_indexes
            if point_in_ring(point, rings[exterior_index])
        ]
        if not containers:
            raise ValueError("ArcGIS interior ring is not contained by an exterior ring")
        container = min(containers, key=lambda index: abs(areas[index]))
        polygons[container].append(rings[hole_index])

    coordinates = [polygons[index] for index in sorted(exterior_indexes)]
    if len(coordinates) == 1:
        return {"type": "Polygon", "coordinates": coordinates[0]}
    return {"type": "MultiPolygon", "coordinates": coordinates}


def esri_geometry_to_geojson(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    if value.get("type") and "coordinates" in value:
        return {"type": value["type"], "coordinates": value["coordinates"]}
    if "x" in value and "y" in value:
        return {"type": "Point", "coordinates": [value["x"], value["y"]]}
    if isinstance(value.get("points"), list):
        return {"type": "MultiPoint", "coordinates": value["points"]}
    if isinstance(value.get("paths"), list):
        paths = value["paths"]
        return {
            "type": "LineString" if len(paths) == 1 else "MultiLineString",
            "coordinates": paths[0] if len(paths) == 1 else paths,
        }
    if isinstance(value.get("rings"), list):
        return esri_rings_to_geojson(value["rings"])
    return None


def arcgis_crs(value: Any) -> str:
    if not isinstance(value, dict):
        return ""
    candidate = value.get("latestWkid") or value.get("wkid")
    if isinstance(candidate, bool):
        return ""
    try:
        code = int(candidate)
    except (TypeError, ValueError):
        return ""
    return f"EPSG:{code}" if code > 0 else ""


def source_geometry_crs(snapshot: dict[str, Any], spatial_reference: Any) -> str:
    delivery = snapshot.get("geometry_delivery")
    if not isinstance(delivery, dict):
        raise ValueError("source snapshot with geometry must declare geometry_delivery")
    declared = clean_text(delivery.get("crs")).upper()
    out_sr = clean_text(delivery.get("arcgis_out_sr"))
    if not re.fullmatch(r"EPSG:\d+", declared):
        raise ValueError(f"geometry_delivery has invalid CRS {declared!r}")
    if out_sr and declared != f"EPSG:{out_sr}":
        raise ValueError(
            f"geometry_delivery CRS {declared} conflicts with ArcGIS outSR={out_sr}"
        )
    observed = arcgis_crs(spatial_reference)
    if observed and observed != declared:
        raise ValueError(
            f"source feature spatialReference {observed} conflicts with geometry_delivery {declared}"
        )
    if declared != "EPSG:4326":
        raise ValueError(
            f"geometry normalization does not transform coordinates from {declared}; EPSG:4326 is required"
        )
    return declared


def spatial_projection(
    geometry_value: Any,
    snapshot: dict[str, Any],
    spatial_reference: Any = None,
) -> tuple[dict[str, Any] | None, dict[str, Any], float | None, float | None]:
    geometry = esri_geometry_to_geojson(geometry_value)
    if not geometry:
        return None, {"crs": "EPSG:4326", "derivation": "geometry unavailable"}, None, None
    source_crs = source_geometry_crs(snapshot, spatial_reference)
    coordinates = flatten_coordinates(geometry.get("coordinates"))
    if not coordinates:
        return geometry, {
            "crs": source_crs,
            "source_crs": source_crs,
            "geometry_type": geometry["type"],
            "geometry_derivation": (
                "Esri geometry structure normalized to GeoJSON; coordinates were delivered "
                "by ArcGIS in EPSG:4326 and were not transformed by the builder"
            ),
        }, None, None
    if any(not (-180 <= x <= 180 and -90 <= y <= 90) for x, y in coordinates):
        raise ValueError("EPSG:4326 source geometry contains coordinates outside longitude/latitude bounds")
    west = min(point[0] for point in coordinates)
    east = max(point[0] for point in coordinates)
    south = min(point[1] for point in coordinates)
    north = max(point[1] for point in coordinates)
    spatial: dict[str, Any] = {
        "crs": source_crs,
        "source_crs": source_crs,
        "geometry_type": geometry["type"],
        "bbox": [west, south, east, north],
        "geometry_derivation": (
            "Esri geometry structure normalized to GeoJSON; coordinates were delivered "
            "by ArcGIS in EPSG:4326 (outSR=4326) and were not transformed by the builder"
        ),
    }
    if geometry["type"] == "Point":
        longitude, latitude = coordinates[0]
        return geometry, spatial, latitude, longitude
    longitude = (west + east) / 2
    latitude = (south + north) / 2
    spatial["representative_point"] = {
        "coordinates": [longitude, latitude],
        "derivation": "derived from source geometry bounding-box centre; may fall outside the feature",
    }
    return geometry, spatial, None, None


def title_aliases(
    title: str,
    list_entry: str,
    category: str,
    grade: str,
    places: list[dict[str, Any]],
    ngr: str,
    extra_aliases: Iterable[Any] = (),
) -> list[str]:
    values = {
        f"NHLE {list_entry}",
        f"List Entry {list_entry}",
        f"National Heritage List {list_entry}",
        category,
        ngr,
        *(clean_text(place.get("name")) for place in places),
        *(clean_text(place.get("code")) for place in places),
        *GRADE_ALIASES.get(grade, []),
        *(clean_text(alias) for alias in extra_aliases),
    }
    replacements = [
        (r"\bST\.?\b", "Saint"),
        (r"\bSAINT\b", "St"),
        (r"&", "and"),
        (r"\bTHE\s+", ""),
    ]
    for pattern, replacement in replacements:
        variant = re.sub(pattern, replacement, title, flags=re.IGNORECASE)
        if variant != title:
            values.add(variant)
    title_case = title.title()
    if title_case != title:
        values.add(title_case)
    category_variants = {
        "Listed Building": ["Listing", "Listed structure"],
        "Scheduled Monument": ["Scheduling", "Ancient monument"],
        "Registered Park and Garden": ["Park and Garden", "Registered landscape"],
        "Registered Battlefield": ["Battlefield"],
        "Certificate of Immunity": ["COI", "Certificate of immunity from listing"],
        "Building Preservation Notice": ["BPN"],
    }
    values.update(category_variants.get(category, []))
    # Common retrieval phrasing joins an unmistakable object word from the
    # official title to each intersected place. It is a search variant, never
    # a replacement display name or an asserted historical alias.
    object_terms = (
        "Cathedral",
        "Castle",
        "Church",
        "Abbey",
        "Priory",
        "Guildhall",
        "Hall",
        "House",
        "Bridge",
        "Monument",
        "Park",
        "Garden",
        "School",
        "Hospital",
        "Canal",
    )
    for term in object_terms:
        if re.search(rf"\b{re.escape(term)}\b", title, re.IGNORECASE):
            values.update(
                f"{clean_text(place.get('name'))} {term}"
                for place in places
                if isinstance(place, dict) and clean_text(place.get("name"))
            )
    return sorted({clean_text(value) for value in values if clean_text(value)}, key=lambda item: (item.casefold(), item))


def feature_attributes(feature: dict[str, Any]) -> dict[str, Any]:
    return feature.get("properties") if isinstance(feature.get("properties"), dict) else feature.get("attributes", {})


def nhle_record(feature: dict[str, Any], layer: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any]:
    public_base = publication_config(snapshot)["public_base"]
    attributes = feature_attributes(feature)
    layer_id = int(layer["id"])
    if layer_id not in LAYER_TYPES:
        raise ValueError(f"unsupported or duplicate NHLE layer {layer_id}")
    category, category_slug = LAYER_TYPES[layer_id]
    list_entry = clean_text(attributes.get("ListEntry") or attributes.get("List_Entry"))
    if not re.fullmatch(r"\d+", list_entry):
        raise ValueError(f"NHLE feature has invalid ListEntry {list_entry!r}")
    title = clean_text(attributes.get("Name") or attributes.get("EntryName")) or f"NHLE List entry {list_entry}"
    grade = clean_text(attributes.get("Grade"))
    designation_date = first_value(iso_date(attributes.get(field)) for field in DATE_FIELDS)
    amendment_date = first_value(iso_date(attributes.get(field)) for field in AMENDMENT_FIELDS)
    geometry, spatial, latitude, longitude = spatial_projection(
        feature.get("geometry"),
        snapshot,
        feature.get("spatialReference") or attributes.get("spatialReference"),
    )
    places = feature.get("scope_geographies") or []
    if not isinstance(places, list):
        places = []
    place_names = [clean_text(place.get("name")) for place in places if isinstance(place, dict)]
    place_codes = [clean_text(place.get("code")) for place in places if isinstance(place, dict)]
    spatial["geographies"] = places
    spatial["intersection_method"] = snapshot.get("scope", {}).get("intersection_method", "")
    ngr = clean_text(attributes.get("NGR"))
    rich_url = list_entry_url(list_entry, attributes.get("hyperlink"))
    object_id = clean_text(attributes.get("OBJECTID") or attributes.get("FID"))
    query_parameters = {
        "where": f"ListEntry='{list_entry}'",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "json",
    }
    query_url = f"{NHLE_SERVICE}/{layer_id}/query?{urlencode(query_parameters)}"
    route = f"asset/{list_entry}"
    reviewed_name = REVIEWED_SEARCH_NAMES.get(list_entry, {})
    reviewed_aliases = (
        reviewed_name.get("aliases", [])
        if isinstance(reviewed_name.get("aliases"), list)
        else []
    )
    alias_evidence_url = official_historic_england_url(reviewed_name.get("evidence_url"))
    resource_ids = [
        f"resource/{list_entry}/rich-page",
        f"resource/{list_entry}/source-feature",
    ]
    if alias_evidence_url and alias_evidence_url != rich_url:
        resource_ids.append(f"resource/{list_entry}/reviewed-name-evidence")
    category_note = f"Official {category.lower()} record from the National Heritage List for England."
    location_note = f"It intersects {', '.join(place_names)}." if place_names else "Its declared scope intersection was not retained."
    record: dict[str, Any] = {
        "@id": f"https://historicengland.org.uk/listing/the-list/list-entry/{list_entry}",
        "@type": "https://schema.org/LandmarksOrHistoricalBuildings",
        "id": f"nhle:{list_entry}",
        "record_id": f"nhle:{list_entry}",
        "native_id": list_entry,
        "name": f"nhle-{list_entry}",
        "title": title,
        "notes": f"{category_note} {location_note} Full official descriptive and legal text remains on the linked List entry page.",
        "context_note": " · ".join(filter(None, [category, grade and f"Grade {grade}", *place_names, ngr])),
        "search_aliases": title_aliases(
            title,
            list_entry,
            category,
            grade,
            places,
            ngr,
            [
                *(
                    feature.get("search_aliases", [])
                    if isinstance(feature.get("search_aliases"), list)
                    else []
                ),
                *reviewed_aliases,
            ],
        ),
        "publisher": "historic-england",
        "publisher_title": "Historic England",
        "resource_count": len(resource_ids),
        "resource_ids": resource_ids,
        "formats": ["HTML", "ArcGIS JSON", "GeoJSON"],
        "tags": sorted({category_slug, grade, *place_codes, "nhle", "designated-heritage"} - {""}),
        "topics": ["Designated heritage", category],
        "timestamp": amendment_date or designation_date,
        "metadata_created": designation_date,
        "metadata_modified": amendment_date,
        "license_id": "OGL-3.0",
        "license_title": "Open Government Licence v3.0",
        "license_source_id": "OGL-3.0",
        "license_source_title": "Historic England open data terms",
        "license_confidence": 1.0,
        "license_basis": "source-declared",
        "route": route,
        "concept_id": f"nhle:{list_entry}",
        "url": rich_url,
        "documentation": f"{public_base}methodology.html",
        "source_api_url": query_url,
        "record_type": "Heritage Asset",
        "type": category,
        "heritage_category": category,
        "grade": grade,
        "designation_year": designation_date[:4] if designation_date else "",
        "amendment_year": amendment_date[:4] if amendment_date else "",
        "geometry_type": spatial.get("geometry_type", "Unavailable"),
        "local_authority": place_names,
        "geography_code": place_codes,
        "county": "Warwickshire and Coventry evaluation scope",
        "source_tier": "official-register-open-data",
        "source_adapter": "historic-england-nhle-arcgis",
        "source_surface": "NHLE FeatureServer",
        "confidence": "source-declared fields; exact deterministic spatial intersection",
        "assertion_status": "official",
        "assertion_scope": "real-world",
        "protocol": ["ArcGIS REST", "HTTPS"],
        "isopen": True,
        "private": False,
        "area_served": unique_text_values([*place_names, "England"]),
        "spatial": spatial,
        "quality": {
            "overall": round(sum([bool(title), bool(list_entry), bool(rich_url), bool(geometry), bool(places), bool(designation_date)]) / 6, 3),
            "metrics": {
                "identity": 1.0,
                "source_link": 1.0 if rich_url else 0.0,
                "geometry": 1.0 if geometry else 0.0,
                "scope_assignment": 1.0 if places else 0.0,
                "designation_date": 1.0 if designation_date else 0.0,
            },
            "notes": ["Quality measures metadata presence, not heritage significance or source truth."],
        },
        "provenance": {
            "source": "National Heritage List for England",
            "source_item": NHLE_ITEM,
            "source_service": NHLE_SERVICE,
            "source_layer": f"{layer_id}: {layer.get('name', category)}",
            "source_object_id": object_id,
            "source_list_entry": list_entry,
            "source_observed_at": snapshot.get("observed_at", ""),
            "scope_boundary": "ONS Local Authority Districts December 2025 BFC",
            "scope_codes": place_codes,
            "assertion_status": "official",
            "assertion_scope": "real-world",
        },
        "extras": {
            "list_entry_number": list_entry,
            "capture_scale": attributes.get("CaptureScale"),
            "national_grid_reference": ngr,
            "easting": attributes.get("Easting"),
            "northing": attributes.get("Northing"),
            "area_hectares": attributes.get("area_ha"),
            "designation_date": designation_date,
            "amendment_or_expiry_date": amendment_date,
            "source_geometry_spatial_reference": feature.get("spatialReference") or attributes.get("spatialReference"),
            "rich_text_policy": "linked-at-source-not-bulk-reproduced",
            **(
                {
                    "reviewed_search_names": reviewed_aliases,
                    "reviewed_search_name_relationship": reviewed_name.get("relationship", ""),
                    "reviewed_search_name_evidence_title": reviewed_name.get("evidence_title", ""),
                    "reviewed_search_name_evidence_url": alias_evidence_url,
                    "reviewed_search_name_policy": (
                        "Discovery-only evidence; the official display title and source identity are unchanged."
                    ),
                }
                if reviewed_aliases
                else {}
            ),
        },
    }
    if geometry:
        record["geometry"] = geometry
    if latitude is not None and longitude is not None:
        record["latitude"] = latitude
        record["longitude"] = longitude
    return record


def normalized_key_map(row: dict[str, Any]) -> dict[str, Any]:
    return {re.sub(r"[^a-z0-9]+", "_", clean_text(key).lower()).strip("_"): value for key, value in row.items()}


def field_value(row: dict[str, Any], *names: str) -> str:
    normalized = normalized_key_map(row)
    return first_value(normalized.get(re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")) for name in names)


def har_record(row: dict[str, Any], annual: dict[str, Any], index: int, snapshot: dict[str, Any]) -> dict[str, Any]:
    public_base = publication_config(snapshot)["public_base"]
    year = int(annual["year"])
    event_type = clean_text(row.get("event_type") or annual.get("event_type") or "entry").lower()
    list_entry = field_value(row, "list entry", "list entry number", "list_entry", "listentry")
    name = field_value(row, "name", "entry name", "site name", "name of site") or f"Heritage at Risk {event_type} {index + 1}"
    methodology = field_value(row, "assessment type", "risk methodology", "risk_methodology", "methodology")
    category = field_value(row, "designation", "heritage category", "heritage_category", "designation type")
    grade = field_value(row, "grade")
    lpa = field_value(row, "local planning authority", "lpa", "local_authority")
    county = field_value(row, "county")
    condition = field_value(row, "condition")
    vulnerability = field_value(row, "vulnerability", "principal vulnerability")
    trend = field_value(row, "trend")
    ownership = field_value(row, "ownership", "ownership type")
    priority = field_value(row, "priority category", "priority")
    site_type = field_value(row, "site type", "broad term", "site type broad")
    subtype = field_value(row, "site subtype", "narrow term", "site type narrow")
    source_url = official_har_source_url(annual.get("source_url"), year)
    workbook_format = clean_text(annual.get("workbook_format")).lower()
    spreadsheet_format = {
        "ods": "OpenDocument Spreadsheet",
        "xlsx": "Microsoft Excel Open XML Spreadsheet",
        "xls": "Microsoft Excel Spreadsheet",
    }.get(workbook_format, "Spreadsheet")
    row_id = clean_text(row.get("record_id") or row.get("uid"))
    stable_seed = "|".join([str(year), event_type, list_entry, methodology, name, lpa, row_id])
    stable_id = row_id or hashlib.sha256(stable_seed.encode("utf-8")).hexdigest()[:16]
    route = f"risk/{year}/{slugify(event_type)}/{stable_id}"
    places = row.get("scope_geographies") if isinstance(row.get("scope_geographies"), list) else []
    place_names = [clean_text(place.get("name")) for place in places if isinstance(place, dict)]
    place_codes = [clean_text(place.get("code")) for place in places if isinstance(place, dict)]
    declared_search_url = field_value(row, "url", "har link", "link")
    register_search_url = har_register_search_url(list_entry, declared_search_url)
    record_type = {
        "entry": "Heritage at Risk Observation",
        "addition": "Heritage at Risk Addition",
        "removal": "Heritage at Risk Positive Removal",
        "positive removal": "Heritage at Risk Positive Removal",
    }.get(event_type, "Heritage at Risk Event")
    geometry, spatial, latitude, longitude = spatial_projection(
        row.get("geometry"), snapshot, row.get("spatialReference")
    )
    spatial["geographies"] = places
    aliases = {
        f"HAR {year}",
        f"Heritage at Risk {year}",
        f"Heritage at Risk register {year}",
        f"risk register {year}",
        f"annual register {year}",
        f"workbook {year}",
        "annual register provenance",
        "source workbook row",
        list_entry and f"NHLE {list_entry}",
        list_entry and f"List Entry {list_entry}",
        methodology,
        category,
        grade,
        lpa,
        county,
        condition,
        vulnerability,
        trend,
        ownership,
        priority,
        site_type,
        subtype,
        *place_names,
        *place_codes,
    }
    # A missing annual column/value is searchable as explicitly unknown, never
    # as a guessed category.  Field-labelled variants also let beginners find
    # a facet by the words used in the interface rather than knowing its value.
    aliases.update(
        {
            f"condition {condition}" if condition else "condition unknown",
            f"vulnerability {vulnerability}" if vulnerability else "vulnerability field",
            f"trend {trend}" if trend else "trend field",
            f"ownership {ownership}" if ownership else "ownership field",
            f"priority category {priority}" if priority else "priority category field",
        }
    )
    record_name = f"har-{year}-{slugify(event_type)}-{stable_id}"
    resource_ids = [f"resource/{record_name}/spreadsheet"]
    if register_search_url:
        resource_ids.append(f"resource/{record_name}/register-search")
    return {
        "@id": explorer_record_iri(public_base, route),
        "@type": "https://www.w3.org/ns/prov#Entity",
        "id": f"har:{year}:{event_type}:{stable_id}",
        "record_id": f"har:{year}:{event_type}:{stable_id}",
        "native_id": row_id,
        "name": record_name,
        "title": name,
        "notes": f"Official {year} Heritage at Risk {event_type} row. Annual rows are snapshots, not live condition claims.",
        "context_note": " · ".join(filter(None, [str(year), record_type, methodology, category, grade, lpa, condition, trend])),
        "search_aliases": sorted({clean_text(value) for value in aliases if clean_text(value)}, key=lambda value: (value.casefold(), value)),
        "publisher": "historic-england",
        "publisher_title": "Historic England",
        "resource_count": len(resource_ids),
        "resource_ids": resource_ids,
        "formats": [spreadsheet_format, "HTML"] if register_search_url else [spreadsheet_format],
        "tags": sorted({"heritage-at-risk", slugify(event_type), slugify(methodology), slugify(category), grade, *place_codes} - {""}),
        "topics": ["Heritage at Risk", category or "Heritage risk assessment"],
        "timestamp": "",
        "metadata_created": "",
        "metadata_modified": "",
        "year": str(year),
        "temporal_coverage": str(year),
        "date_precision": "year",
        "license_id": "OGL-3.0",
        "license_title": "Open Government Licence v3.0",
        "license_source_id": "OGL-3.0",
        "license_source_title": "Historic England annual Heritage at Risk source",
        "license_confidence": 1.0,
        "license_basis": "source-declared",
        "route": route,
        "concept_id": f"har:{year}:{stable_id}",
        "url": register_search_url or source_url,
        "documentation": f"{public_base}methodology.html",
        "record_type": record_type,
        "type": methodology or record_type,
        "heritage_category": category,
        "grade": grade,
        "local_authority": place_names or ([lpa] if lpa else []),
        "geography_code": place_codes,
        "county": county or "Warwickshire and Coventry evaluation scope",
        "register_year": str(year),
        "risk_event": event_type,
        "risk_status": "at risk" if event_type in {"entry", "addition"} else "removed for positive reason",
        "risk_methodology": methodology,
        "condition": condition,
        "vulnerability": vulnerability,
        "trend": trend,
        "ownership": ownership,
        "priority_category": priority,
        "site_type": site_type,
        "site_subtype": subtype,
        "geometry_type": spatial.get("geometry_type", "Unavailable"),
        "source_tier": "official-annual-register",
        "source_adapter": "historic-england-har-annual-spreadsheet",
        "source_surface": f"HAR {year} annual spreadsheet",
        "source_workbook_format": workbook_format or "unknown",
        "confidence": "source-declared annual snapshot; scope normalized from source location fields",
        "assertion_status": "official",
        "assertion_scope": "real-world",
        "protocol": ["HTTPS"],
        "isopen": True,
        "private": False,
        "area_served": unique_text_values([*place_names, lpa, county, "England"]),
        "spatial": spatial,
        "quality": {
            "overall": round(sum([bool(name), bool(source_url), bool(year), bool(lpa or places), bool(list_entry), bool(methodology)]) / 6, 3),
            "metrics": {
                "identity": 1.0 if row_id or list_entry else 0.5,
                "source_link": 1.0,
                "scope_assignment": 1.0 if lpa or places else 0.0,
                "list_entry_link": 1.0 if list_entry else 0.0,
                "assessment_type": 1.0 if methodology else 0.0,
            },
            "notes": ["Annual spreadsheet schemas change over time; missing fields remain unknown."],
        },
        "provenance": {
            "source": f"Heritage at Risk {year} entries, additions and removals",
            "source_url": source_url,
            "source_sha256": annual.get("sha256", ""),
            "source_sheet": row.get("source_sheet", ""),
            "source_row": row.get("source_row", index + 1),
            "source_workbook_format": workbook_format or "unknown",
            "source_observed_at": snapshot.get("observed_at", ""),
            "scope_codes": place_codes,
            "scope_match_evidence": row.get("scope_match_evidence", []),
            "assertion_status": "official",
            "assertion_scope": "real-world",
        },
        "extras": {
            "list_entry_number": list_entry,
            "assessment_type": methodology,
            "site_type_broad": site_type,
            "site_type_narrow": subtype,
            "condition": condition,
            "principal_vulnerability": vulnerability,
            "trend": trend,
            "ownership": ownership,
            "priority_category": priority,
            "scope_match_evidence": row.get("scope_match_evidence", []),
            "source_values": row.get("source_values", row),
        },
        **({"geometry": geometry} if geometry else {}),
        **({"latitude": latitude, "longitude": longitude} if latitude is not None and longitude is not None else {}),
    }


def source_records(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(snapshot.get("normalized_records"), list):
        records = [dict(record) for record in snapshot["normalized_records"]]
    else:
        records = []
        seen_entries: set[str] = set()
        for layer in snapshot.get("nhle", {}).get("layers", []):
            for feature in layer.get("features", []):
                record = nhle_record(feature, layer, snapshot)
                native_id = record["native_id"]
                if native_id in seen_entries:
                    raise ValueError(f"duplicate NHLE ListEntry {native_id} remains after source acquisition")
                seen_entries.add(native_id)
                records.append(record)
        for annual in snapshot.get("har", {}).get("annual", []):
            for index, row in enumerate(annual.get("rows", [])):
                records.append(har_record(row, annual, index, snapshot))
    routes = [record.get("route") for record in records]
    if len(routes) != len(set(routes)):
        duplicates = [route for route, count in Counter(routes).items() if count > 1]
        raise ValueError(f"duplicate record routes: {duplicates[:10]}")
    public_base = publication_config(snapshot)["public_base"]
    for record in records:
        status = record.get("assertion_status")
        scope = record.get("assertion_scope")
        if status not in ASSERTION_STATUSES or scope not in ASSERTION_SCOPES:
            raise ValueError(f"record {record.get('route')} has invalid assertion status/scope")
        route = clean_text(record.get("route"))
        expected_iri = (
            official_historic_england_url(record.get("url"))
            if route.startswith("asset/")
            else explorer_record_iri(public_base, route)
        )
        if safe_http_url(record.get("@id")) != expected_iri:
            raise ValueError(
                f"record {route} semantic IRI must resolve to its official page or exact Explorer deep link"
            )
    return sorted(records, key=lambda record: record["route"])


def resource_rows(records: list[dict[str, Any]], snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(snapshot.get("normalized_resources"), list):
        return [dict(resource) for resource in snapshot["normalized_resources"]]
    resources: list[dict[str, Any]] = []
    for record in records:
        dataset = record["name"]
        route = record["route"]
        if route.startswith("asset/"):
            list_entry = record["native_id"]
            resources.extend(
                [
                    {
                        "id": f"{list_entry}-rich-page",
                        "dataset": dataset,
                        "name": "Official rich List entry page",
                        "description": "Official descriptive, historical, legal and source content retained at Historic England.",
                        "format": "HTML",
                        "source_format": "HTML",
                        "route": f"resource/{list_entry}/rich-page",
                        "url": record["url"],
                        "host": "historicengland.org.uk",
                        "resource_type": "official-record-page",
                        "position": 0,
                        "provenance": {"assertion_status": "official", "assertion_scope": "real-world"},
                    },
                    {
                        "id": f"{list_entry}-source-feature",
                        "dataset": dataset,
                        "name": "Official NHLE ArcGIS feature",
                        "description": "Machine-readable source fields and geometry for this List entry.",
                        "format": "ArcGIS JSON",
                        "source_format": "ArcGIS FeatureServer query",
                        "route": f"resource/{list_entry}/source-feature",
                        "url": record["source_api_url"],
                        "host": "services-eu1.arcgis.com",
                        "resource_type": "official-source-feature",
                        "position": 1,
                        "provenance": {"assertion_status": "official", "assertion_scope": "real-world"},
                    },
                ]
            )
            reviewed_name = REVIEWED_SEARCH_NAMES.get(clean_text(list_entry), {})
            evidence_url = official_historic_england_url(reviewed_name.get("evidence_url"))
            if evidence_url and evidence_url != record["url"]:
                resources.append(
                    {
                        "id": f"{list_entry}-reviewed-name-evidence",
                        "dataset": dataset,
                        "name": clean_text(reviewed_name.get("evidence_title"))
                        or "Official evidence for a reviewed discovery name",
                        "description": (
                            "Historic England evidence supporting a familiar discovery name; "
                            "the statutory NHLE title and identity remain unchanged."
                        ),
                        "format": "HTML",
                        "source_format": "HTML",
                        "route": f"resource/{list_entry}/reviewed-name-evidence",
                        "url": evidence_url,
                        "host": "historicengland.org.uk",
                        "resource_type": "official-search-name-evidence",
                        "position": 2,
                        "provenance": {
                            "assertion_status": "official",
                            "assertion_scope": "real-world",
                            "search_name_relationship": reviewed_name.get("relationship", ""),
                        },
                    }
                )
        else:
            stable = record["name"]
            source_url = official_har_source_url(
                record["provenance"].get("source_url"),
                int(record.get("register_year", 0)),
            )
            spreadsheet_format = next(
                (value for value in record.get("formats", []) if value != "HTML"),
                "Spreadsheet",
            )
            resources.append(
                {
                    "id": f"{stable}-spreadsheet",
                    "dataset": dataset,
                    "name": f"Official {record.get('register_year')} Heritage at Risk spreadsheet",
                    "description": "Sanctioned annual source for entries, additions and positive removals.",
                    "format": spreadsheet_format,
                    "source_format": record.get("source_workbook_format", "unknown").upper(),
                    "route": f"resource/{stable}/spreadsheet",
                    "url": source_url,
                    "host": "historicengland.org.uk",
                    "resource_type": "official-annual-source",
                    "position": 0,
                    "provenance": {"assertion_status": "official", "assertion_scope": record["assertion_scope"]},
                }
            )
            if record.get("url") and record["url"] != source_url:
                resources.append(
                    {
                        "id": f"{stable}-register-search",
                        "dataset": dataset,
                        "name": "Official Heritage at Risk register search",
                        "description": (
                            "Official live register search bound to the source row's List Entry Number; "
                            "the annual snapshot remains the time-specific evidence."
                        ),
                        "format": "HTML",
                        "source_format": "HTML",
                        "route": f"resource/{stable}/register-search",
                        "url": record["url"],
                        "host": "historicengland.org.uk",
                        "resource_type": "official-register-search",
                        "position": 1,
                        "provenance": {"assertion_status": "official", "assertion_scope": record["assertion_scope"]},
                    }
                )
    return resources


def relationship_row(
    source: str,
    target: str,
    kind: str,
    predicate: str,
    *,
    authority: str,
    derivation: str,
    evidence: list[str | dict[str, Any]],
    observed_at: str,
    scope: str = "real-world",
    default_source: str = PUBLIC_BASE,
    source_iri: str = "",
    target_iri: str = "",
    inverse_label: str = "is related from",
) -> dict[str, Any]:
    assertion_status = "official" if authority == "official" else "normalized"
    accepted_evidence: list[tuple[str, dict[str, Any]]] = []
    for value in evidence:
        details = dict(value) if isinstance(value, dict) else {}
        url = safe_http_url(details.get("url") if details else value)
        if url:
            accepted_evidence.append((url, details))
    valid_evidence = [url for url, _ in accepted_evidence]
    digest = hashlib.sha256(f"{source}|{predicate}|{target}".encode()).hexdigest()[:20]
    evidence_rows: list[dict[str, Any]] = []
    for index, (url, details) in enumerate(accepted_evidence):
        source_value = clean_text(details.get("source_value"))
        evidence_rows.append({
            "@id": f"{default_source}id/evidence/{digest}-{index + 1}",
            "type": clean_text(details.get("type")) or "source-record",
            "url": url,
            "source_artifact": clean_text(details.get("source_artifact")) or url,
            "source_field": clean_text(details.get("source_field")) or "source identity or geometry",
            **({"source_value": source_value} if source_value else {}),
            "source_value_sha256": (
                sha256_bytes(source_value.encode("utf-8"))
                if source_value
                else sha256_bytes(f"{source}|{predicate}|{target}|{url}".encode("utf-8"))
            ),
            "source_value_hash_canonicalization": (
                "UTF-8 exact retained source text"
                if source_value
                else "UTF-8 source route, predicate, target and URL joined with vertical bars"
            ),
            **(
                {"locator": clean_text(details.get("locator"))}
                if clean_text(details.get("locator"))
                else {}
            ),
            "retrieved_at": observed_at,
        })
    activity = f"{default_source.rstrip('/')}/methodology.html#relationship-projection-rules"
    return {
        "schema": "okf-relationship-assertion.v2",
        "id": f"{default_source}id/assertion/{digest}",
        "source": source,
        "target": target,
        "source_iri": source_iri,
        "target_iri": target_iri,
        "kind": kind,
        "label": kind,
        "inverse_label": inverse_label,
        "predicate": predicate,
        "authority": {
            "class": authority,
            "label": "Official source relationship" if authority == "official" else "Deterministically normalized relationship",
            "source": valid_evidence[0] if valid_evidence else default_source,
        },
        "derivation": derivation,
        "derivation_activity": activity,
        "confidence": 1.0,
        "confidence_score": 1.0,
        "observed_at": observed_at,
        "freshness": "current",
        "evidence": evidence_rows,
        "rights": {
            "source": OGL,
            "assertion": "Underlying source rights are retained; this deterministic relationship projection is published with the evaluation.",
        },
        "assertion_status": assertion_status,
        "assertion_scope": scope,
    }


def normalize_relationship_contract(
    rows: list[dict[str, Any]],
    records: list[dict[str, Any]],
    snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    publication = publication_config(snapshot)
    public_base = publication["public_base"]
    observed_at = clean_text(snapshot.get("observed_at"))
    iri_by_route = {record["route"]: record["@id"] for record in records}
    for boundary in snapshot.get("scope", {}).get("boundaries", []):
        iri_by_route[f"geography/{boundary['code']}"] = (
            f"https://statistics.data.gov.uk/id/statistical-geography/{boundary['code']}"
        )
    inverse_defaults = {
        "https://schema.org/containedInPlace": "contains",
        "https://www.w3.org/ns/prov#specializationOf": "is assessed by",
        "https://www.w3.org/ns/prov#wasRevisionOf": "has next annual observation",
        "https://schema.org/architect": "possibly designed",
        "https://schema.org/about": "has proposed intervention",
    }
    normalized: list[dict[str, Any]] = []
    for raw in rows:
        row = dict(raw)
        source = clean_text(row.get("source"))
        target = clean_text(row.get("target"))
        predicate = safe_http_url(row.get("predicate"))
        if not source or not target or not predicate:
            raise ValueError(f"relationship must have source, target and absolute predicate: {row!r}")
        expected_source_iri = iri_by_route.get(source, "")
        expected_target_iri = iri_by_route.get(target, "")
        declared_source_iri = safe_http_url(row.get("source_iri"))
        declared_target_iri = safe_http_url(row.get("target_iri"))
        if declared_source_iri and declared_source_iri != expected_source_iri:
            raise ValueError(f"relationship source IRI does not match registered route {source}")
        if declared_target_iri and declared_target_iri != expected_target_iri:
            raise ValueError(f"relationship target IRI does not match registered route {target}")
        source_iri = declared_source_iri or expected_source_iri
        target_iri = declared_target_iri or expected_target_iri
        if not source_iri or not target_iri:
            raise ValueError(f"relationship endpoints have no semantic IRI: {source} -> {target}")
        status = clean_text(row.get("assertion_status")) or "normalized"
        scope = clean_text(row.get("assertion_scope")) or snapshot.get("scope", {}).get("assertion_scope", "real-world")
        authority_class = "synthetic" if scope == "synthetic-fixture" else {
            "official": "official",
            "normalized": "derived",
            "inferred": "derived",
            "model-derived": "model-assisted",
        }.get(status, "unclassified")
        authority = dict(row.get("authority")) if isinstance(row.get("authority"), dict) else {}
        authority.update(
            {
                "class": authority_class,
                "label": clean_text(authority.get("label")) or f"{status.title()} relationship assertion",
                "source": safe_http_url(authority.get("source")) or public_base,
            }
        )
        digest = hashlib.sha256(f"{source}|{predicate}|{target}".encode()).hexdigest()[:20]
        identifier = safe_http_url(row.get("id")) or f"{public_base}id/assertion/{digest}"
        raw_evidence = row.get("evidence") if isinstance(row.get("evidence"), list) else []
        evidence: list[dict[str, Any]] = []
        for index, value in enumerate(raw_evidence):
            if isinstance(value, dict):
                evidence_url = safe_http_url(value.get("url") or value.get("resource") or value.get("@id"))
                evidence_row = dict(value)
            else:
                evidence_url = safe_http_url(value)
                evidence_row = {}
            if not evidence_url:
                continue
            evidence_row.update(
                {
                    "@id": safe_http_url(evidence_row.get("@id")) or f"{public_base}id/evidence/{digest}-{index + 1}",
                    "type": clean_text(evidence_row.get("type")) or "source-record",
                    "url": evidence_url,
                    "source_field": clean_text(evidence_row.get("source_field")) or "source identity or declared relationship",
                    "source_value_sha256": clean_text(evidence_row.get("source_value_sha256"))
                    or sha256_bytes(f"{source}|{predicate}|{target}|{evidence_url}".encode("utf-8")),
                    "retrieved_at": clean_text(evidence_row.get("retrieved_at")) or observed_at,
                }
            )
            evidence.append(evidence_row)
        if not evidence:
            evidence.append(
                {
                    "@id": f"{public_base}id/evidence/{digest}-1",
                    "type": "evaluation-declaration",
                    "url": authority["source"],
                    "source_field": "relationship declaration",
                    "source_value_sha256": sha256_bytes(
                        f"{source}|{predicate}|{target}|{status}|{scope}".encode("utf-8")
                    ),
                    "retrieved_at": observed_at,
                }
            )
        methodology_rule_url = f"{public_base}methodology.html#relationship-projection-rules"
        declared_activity = clean_text(row.get("derivation_activity"))
        if declared_activity and safe_http_url(declared_activity) != methodology_rule_url:
            raise ValueError(
                "relationship derivation activity must resolve to the published methodology rules"
            )
        activity = methodology_rule_url
        row.update(
            {
                "schema": "okf-relationship-assertion.v2",
                "id": identifier,
                "source": source,
                "target": target,
                "source_iri": source_iri,
                "target_iri": target_iri,
                "predicate": predicate,
                "kind": clean_text(row.get("kind") or row.get("label")) or predicate.rsplit("/", 1)[-1],
                "label": clean_text(row.get("label") or row.get("kind")) or predicate.rsplit("/", 1)[-1],
                "inverse_label": clean_text(row.get("inverse_label")) or inverse_defaults.get(predicate, "is related from"),
                "assertion_status": status,
                "assertion_scope": scope,
                "authority": authority,
                "derivation": clean_text(row.get("derivation")) or "Deterministic relationship projection.",
                "derivation_activity": activity,
                "confidence_score": float(row.get("confidence_score", row.get("confidence", 1.0))),
                "observed_at": clean_text(row.get("observed_at")) or observed_at,
                "freshness": clean_text(row.get("freshness")) or "current",
                "evidence": evidence,
                "rights": row.get("rights")
                if isinstance(row.get("rights"), (dict, str))
                else {
                    "source": publication["license"],
                    "assertion": "Underlying source rights are retained; this relationship projection follows the declared evaluation licence.",
                },
            }
        )
        if status == "model-derived":
            row.setdefault("review_status", "unreviewed synthetic fixture" if scope == "synthetic-fixture" else "requires human review")
        if status == "inferred":
            row.setdefault("rule", methodology_rule_url)
            row.setdefault("supporting_assertions", [identifier])
        normalized.append(row)
    return normalized


def relationship_rows(records: list[dict[str, Any]], snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(snapshot.get("normalized_relationships"), list):
        return normalize_relationship_contract(
            [dict(row) for row in snapshot["normalized_relationships"]], records, snapshot
        )
    observed_at = snapshot.get("observed_at", "")
    public_base = publication_config(snapshot)["public_base"]
    relationships: list[dict[str, Any]] = []
    asset_route_by_entry = {
        clean_text(record.get("native_id")): record["route"]
        for record in records
        if record["route"].startswith("asset/")
    }
    iri_by_route = {record["route"]: record["@id"] for record in records}
    observations_by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        route = record["route"]
        for place in record.get("spatial", {}).get("geographies", []):
            code = clean_text(place.get("code")) if isinstance(place, dict) else ""
            if code:
                if route.startswith("asset/"):
                    derivation = "exact ArcGIS spatial intersection with the pinned ONS boundary"
                    evidence: list[str | dict[str, Any]] = [
                        ONS_BOUNDARY_SERVICE,
                        record.get("source_api_url") or record.get("url"),
                    ]
                else:
                    scope_evidence = record.get("provenance", {}).get("scope_match_evidence", [])
                    matching_evidence = next(
                        (
                            row
                            for row in scope_evidence
                            if isinstance(row, dict) and clean_text(row.get("matched_code")) == code
                        ),
                        None,
                    )
                    if not matching_evidence:
                        raise ValueError(
                            f"HAR record {route} has geography {code} without reversible source-field evidence"
                        )
                    basis = clean_text(place.get("basis")) if isinstance(place, dict) else ""
                    derivation = (
                        "source-declared county field retained as Warwickshire county identity without LAD inference"
                        if basis == "source-county-field-no-lad-assertion"
                        else (
                            "source-declared local-authority field normalized by the documented reversible "
                            "HAR location mapping; no spatial intersection claimed"
                        )
                    )
                    source_url = record.get("provenance", {}).get("source_url") or HAR_ANNUAL
                    evidence = [
                        {
                            "url": source_url,
                            "type": "source-workbook-row",
                            "source_artifact": source_url,
                            "source_field": matching_evidence.get("field", ""),
                            "source_value": matching_evidence.get("value", ""),
                            "locator": (
                                f"{record.get('provenance', {}).get('source_sheet', '')} "
                                f"row {record.get('provenance', {}).get('source_row', '')}"
                            ).strip(),
                        }
                    ]
                relationships.append(
                    relationship_row(
                        route,
                        f"geography/{code}",
                        "located in",
                        "https://schema.org/containedInPlace",
                        authority="derived",
                        derivation=derivation,
                        evidence=evidence,
                        observed_at=observed_at,
                        scope=record["assertion_scope"],
                        default_source=public_base,
                        source_iri=record["@id"],
                        target_iri=f"https://statistics.data.gov.uk/id/statistical-geography/{code}",
                        inverse_label="contains",
                    )
                )
        if route.startswith("risk/"):
            list_entry = clean_text(record.get("extras", {}).get("list_entry_number"))
            if list_entry and list_entry in asset_route_by_entry:
                relationships.append(
                    relationship_row(
                        route,
                        asset_route_by_entry[list_entry],
                        "assesses",
                        "https://www.w3.org/ns/prov#specializationOf",
                        authority="official",
                        derivation="source-declared NHLE List entry number",
                        evidence=[record["provenance"].get("source_url", HAR_ANNUAL), record["url"]],
                        observed_at=observed_at,
                        scope=record["assertion_scope"],
                        default_source=public_base,
                        source_iri=record["@id"],
                        target_iri=iri_by_route[asset_route_by_entry[list_entry]],
                        inverse_label="is assessed by",
                    )
                )
            continuity_key = "|".join(
                [
                    list_entry or slugify(record["title"]),
                    clean_text(record.get("risk_methodology")),
                    clean_text(record.get("local_authority")),
                ]
            )
            observations_by_key[continuity_key].append(record)
    for observations in observations_by_key.values():
        event_priority = {"entry": 0, "addition": 1, "positive removal": 2, "removal": 2}
        by_year: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for observation in observations:
            by_year[clean_text(observation.get("register_year"))].append(observation)
        ordered = [
            sorted(
                by_year[year],
                key=lambda record: (
                    event_priority.get(clean_text(record.get("risk_event")).lower(), 9),
                    record["route"],
                ),
            )[0]
            for year in sorted(year for year in by_year if year)
        ]
        for previous, current in zip(ordered, ordered[1:]):
            relationships.append(
                relationship_row(
                    current["route"],
                    previous["route"],
                    "previous annual observation",
                    "https://www.w3.org/ns/prov#wasRevisionOf",
                    authority="derived",
                    derivation="same source List entry/name and assessment methodology across adjacent available annual snapshots",
                    evidence=[current["provenance"].get("source_url", HAR_ANNUAL), previous["provenance"].get("source_url", HAR_ANNUAL)],
                    observed_at=observed_at,
                    scope=current["assertion_scope"],
                    default_source=public_base,
                    source_iri=current["@id"],
                    target_iri=previous["@id"],
                    inverse_label="has next annual observation",
                )
            )
    unique: dict[tuple[str, str, str], dict[str, Any]] = {}
    for relationship in relationships:
        key = (relationship["source"], relationship["predicate"], relationship["target"])
        unique[key] = relationship
    return normalize_relationship_contract([unique[key] for key in sorted(unique)], records, snapshot)


def enrich_relationship_search_aliases(
    records: list[dict[str, Any]], relationships: list[dict[str, Any]]
) -> None:
    """Project real record/edge vocabulary into discovery without changing claims.

    The Graph remains the authoritative relationship presentation.  These
    bounded aliases let a beginner search for the words shown by Graph,
    provenance and YAML-LD panels, then inspect the actual qualified edge.
    """
    by_route = {record["route"]: record for record in records}
    aliases_by_route: dict[str, set[str]] = defaultdict(set)
    for record in records:
        aliases_by_route[record["route"]].update(
            {
                "YAML-LD @id",
                "semantic identifier",
                f"assertion status {clean_text(record.get('assertion_status'))}",
                f"assertion scope {clean_text(record.get('assertion_scope'))}",
            }
        )
        if clean_text(record.get("license_id")) == "OGL-3.0":
            aliases_by_route[record["route"]].add("Open Government Licence")
        if isinstance(record.get("geometry"), dict):
            aliases_by_route[record["route"]].update(
                {"source geometry", "geometry source CRS"}
            )

    for relationship in relationships:
        source = clean_text(relationship.get("source"))
        target = clean_text(relationship.get("target"))
        predicate = clean_text(relationship.get("predicate"))
        kind = clean_text(relationship.get("kind") or relationship.get("label"))
        authority = clean_text(relationship.get("authority", {}).get("class"))
        predicate_term = predicate.rsplit("/", 1)[-1].rsplit("#", 1)[-1]
        shared = {
            "source-backed relationship",
            "relationship evidence",
            f"relationship authority {authority}",
            kind,
            predicate_term,
        }
        source_only: set[str] = set()
        if predicate.endswith("containedInPlace"):
            source_only.add("contained in place")
        elif predicate.endswith("specializationOf"):
            source_only.update({"risk observation assesses NHLE", "List Entry exact join"})
        elif predicate.endswith("wasRevisionOf"):
            shared.add("previous annual observation")
        if source in by_route:
            aliases_by_route[source].update({*shared, *source_only})
        if target in by_route:
            aliases_by_route[target].update(shared)

    for route, added in aliases_by_route.items():
        record = by_route[route]
        existing = record.get("search_aliases")
        values = existing if isinstance(existing, list) else []
        record["search_aliases"] = sorted(
            {*unique_text_values(values), *unique_text_values(added)},
            key=lambda value: (value.casefold(), value),
        )


def facet_rows(records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    keys = [
        "record_type",
        "heritage_category",
        "grade",
        "local_authority",
        "geography_code",
        "designation_year",
        "amendment_year",
        "geometry_type",
        "register_year",
        "risk_event",
        "risk_status",
        "risk_methodology",
        "condition",
        "vulnerability",
        "trend",
        "ownership",
        "priority_category",
        "site_type",
        "site_subtype",
        "source_adapter",
        "assertion_status",
        "assertion_scope",
    ]
    facets: dict[str, list[dict[str, Any]]] = {}
    for key in keys:
        counts: Counter[str] = Counter()
        for record in records:
            value = record.get(key)
            values = value if isinstance(value, list) else [value]
            counts.update(clean_text(item) for item in values if clean_text(item))
        facets[key] = [
            {"value": value, "count": count}
            for value, count in sorted(counts.items(), key=lambda item: (-item[1], item[0].casefold()))
        ]
    topic_counts = Counter(topic for record in records for topic in record.get("topics", []) if clean_text(topic))
    facets["topic"] = [
        {"value": value, "count": count}
        for value, count in sorted(topic_counts.items(), key=lambda item: (-item[1], item[0].casefold()))
    ]
    facets["format"] = [
        {"value": value, "count": count}
        for value, count in Counter(fmt for record in records for fmt in record.get("formats", [])).most_common()
    ]
    license_counts = Counter(
        clean_text(record.get("license_id")) or "Unspecified" for record in records
    )
    facets["license"] = [
        {"value": value, "count": count}
        for value, count in sorted(
            license_counts.items(), key=lambda item: (-item[1], item[0].casefold())
        )
    ]
    return facets


def publisher_rows(
    records: list[dict[str, Any]],
    resources: list[dict[str, Any]],
    snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    if isinstance(snapshot.get("normalized_publishers"), list):
        publishers = [dict(publisher) for publisher in snapshot["normalized_publishers"]]
        if len(publishers) == 1:
            publishers[0]["dataset_count"] = len(records)
            publishers[0]["resource_count"] = len(resources)
        return publishers
    return [
        {
            "id": "historic-england",
            "name": "historic-england",
            "title": "Historic England",
            "description": "Public body maintaining the National Heritage List for England and Heritage at Risk Register.",
            "route": "publisher/historic-england",
            "dataset_count": len(records),
            "resource_count": len(resources),
            "formats": sorted({fmt for record in records for fmt in record.get("formats", [])}),
            "topics": ["Designated heritage", "Heritage at Risk"],
            "url": "https://historicengland.org.uk/",
        }
    ]


def graph_and_analysis(
    records: list[dict[str, Any]],
    resources: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    facets: dict[str, list[dict[str, Any]]],
    generated_at: str,
    snapshot: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    publication = publication_config(snapshot)
    public_base = publication["public_base"]
    relationship_counts = Counter(row["kind"] for row in relationships)
    type_rows = facets["record_type"]
    geography_rows = facets["geography_code"]
    graph_nodes = [
        {"id": "scope/coventry-warwickshire", "label": "Coventry and Warwickshire", "type": "evaluation scope", "count": len(records)},
        *[
            {"id": f"record-type/{slugify(row['value'])}", "label": row["value"], "type": "record type", "count": row["count"]}
            for row in type_rows
        ],
        *[
            {"id": f"geography/{row['value']}", "label": row["value"], "type": "geography", "count": row["count"]}
            for row in geography_rows
        ],
    ]
    graph_edges = [
        {
            "source": f"record-type/{slugify(row['value'])}",
            "target": "scope/coventry-warwickshire",
            "label": "included in",
            "count": row["count"],
            "authority": {"class": "derived", "label": "Derived from the frozen corpus", "source": public_base},
            "derivation": "record-type aggregation",
            "confidence": 1.0,
        }
        for row in type_rows
    ]
    timeline = Counter(record.get("timestamp", "")[:4] for record in records if record.get("timestamp"))
    if publication["role"] == "synthetic":
        notices = [
            "Every record and relationship in this supplement is invented for interface testing.",
            "This corpus is default-off and excluded from faithful counts and search.",
            "Synthetic examples demonstrate semantics unsupported or sparse in the real source without implying those claims are true.",
        ]
    else:
        notices = [
            "This is a functionality evaluation, not a replacement for the National Heritage List for England or Heritage at Risk Register.",
            "Historic England rich List pages remain linked official resources; their narrative text is not bulk-reproduced.",
            "Polygon markers use labelled bounding-box representative points; select the source geometry for authoritative shape evidence.",
            "Synthetic demonstrations are published as a separate default-off corpus and are absent from these counts.",
        ]
    analysis = {
        "schema": "okf-explorer-analysis.v1",
        "generated_at": generated_at,
        "source_bundle": "okf-explorer.json",
        "display": {
            "title": publication["title"],
            "subtitle": publication["description"],
        },
        "summary": {
            "title": "What this source can demonstrate",
            "description": "Search, facets, types, resources, graph, timeline, map, provenance and selected-record inspection over one durable result set.",
            "record_count": len(records),
            "resource_count": len(resources),
            "relationship_count": len(relationships),
            "notices": notices,
        },
        "graph_overview": {"nodes": graph_nodes, "edges": graph_edges},
        "timeline_overview": {
            "buckets": [
                {"id": year, "label": year, "count": count, "route": f"facet/timestamp/{year}"}
                for year, count in sorted(timeline.items())
            ]
        },
        "relationship_overview": {
            "types": [
                {
                    "kind": kind,
                    "count": count,
                    "samples": [
                        {"source": row["source"], "target": row["target"], "label": row["kind"]}
                        for row in relationships
                        if row["kind"] == kind
                    ][:2],
                }
                for kind, count in relationship_counts.most_common()
            ]
        },
        "resource_overview": {
            "total_resources": len(resources),
            "distributions": {key: facets.get(key, []) for key in ("record_type", "heritage_category", "risk_methodology", "format")},
        },
        "facet_analysis": [
            {
                "key": key,
                "label": key.replace("_", " ").title(),
                "value_type": "ordinal" if key in {"grade", "register_year", "designation_year"} else "nominal",
                "coverage": round(sum(row["count"] for row in rows) / max(1, len(records)), 3),
                "cardinality": len(rows),
                "presentation": "visible-distribution" if len(rows) <= 12 else "searchable-facet",
                "values": rows[:24],
            }
            for key, rows in facets.items()
            if rows
        ],
        "ontology_candidates": [
            {
                "id": "schema.org/LandmarksOrHistoricalBuildings",
                "label": "schema.org LandmarksOrHistoricalBuildings",
                "confidence": 0.95,
                "coverage": round(
                    sum(record["route"].startswith("asset/") for record in records)
                    / max(1, len(records)),
                    3,
                ),
                "classes": ["LandmarksOrHistoricalBuildings", "Place", "Event"],
                "properties": ["identifier", "name", "containedInPlace", "subjectOf"],
                "notes": ["Projection only; OKF and source-native terms remain authoritative for the evaluation."],
            }
        ],
        "narrative": {
            "title": "One evidence-bound result set, several views",
            "body": "Search and facets establish the result set. Reader, Graph, Links, Timeline, Type, Resources, Map, Narrative and the data card are projections of that same durable state.",
        },
        "source_denominators": snapshot.get("denominators", []),
    }
    graph = {
        "node_counts": {
            "record": len(records),
            "heritage_asset": sum(record["route"].startswith("asset/") for record in records),
            "risk_record": sum(record["route"].startswith("risk/") for record in records),
            "synthetic_record": sum(
                record.get("assertion_scope") == "synthetic-fixture" for record in records
            ),
            "resource": len(resources),
            "geography": len(geography_rows),
        },
        "edge_counts": [{"kind": kind, "count": count} for kind, count in relationship_counts.most_common()],
        "relationship_index": "data/relationships-0.json.gz",
        "relationship_adjacency": "data/adjacency/manifest.json",
        "top_publishers": [
            {
                "id": f"publisher/{slugify(publication['publisher_title'])}",
                "label": publication["publisher_title"],
                "dataset_count": len(records),
                "resource_count": len(resources),
            }
        ],
    }
    return graph, analysis


def record_locator(records: list[dict[str, Any]], chunk_size: int, chunk_paths: list[Path], snapshot_id: str) -> tuple[dict[str, Any], list[tuple[Path, dict[str, list[int]]]]]:
    buckets: dict[str, dict[str, list[int]]] = defaultdict(dict)
    for ordinal, record in enumerate(records):
        route = record["route"]
        bucket = large_corpus.relationship_bucket(route)
        buckets[bucket][route] = [ordinal // chunk_size, ordinal % chunk_size]
    files = [(Path(f"data/records/{bucket}.json"), routes) for bucket, routes in sorted(buckets.items())]
    manifest = {
        "schema": "okf-record-locator-sharded.v1",
        "algorithm": "fnv1a32-prefix-2",
        "snapshot": snapshot_id,
        "records": len(records),
        "chunk_size": chunk_size,
        "record_chunks": [path.as_posix() for path in chunk_paths],
        "buckets": {bucket: f"data/records/{bucket}.json" for bucket in sorted(buckets)},
        "bucket_count": len(buckets),
    }
    return manifest, files


def gzip_json(value: Any) -> bytes:
    output = io.BytesIO()
    with gzip.GzipFile(
        filename="",
        mode="wb",
        fileobj=output,
        compresslevel=6,
        mtime=0,
    ) as stream:
        stream.write(large_corpus.render_json(value).encode("utf-8"))
    return output.getvalue()


def geojson_files(records: list[dict[str, Any]]) -> tuple[dict[Path, str], dict[str, str]]:
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    route_to_path: dict[str, str] = {}
    for record in records:
        geometry = record.get("geometry")
        if not isinstance(geometry, dict):
            continue
        bucket = large_corpus.relationship_bucket(record["route"])
        path = f"data/geo/{bucket}.geojson"
        route_to_path[record["route"]] = path
        buckets[bucket].append(
            {
                "type": "Feature",
                "id": record["id"],
                "geometry": geometry,
                "properties": {
                    "route": record["route"],
                    "title": record["title"],
                    "record_type": record["record_type"],
                    "heritage_category": record.get("heritage_category", ""),
                    "grade": record.get("grade", ""),
                    "assertion_status": record["assertion_status"],
                    "assertion_scope": record["assertion_scope"],
                },
            }
        )
    files = {
        Path(f"data/geo/{bucket}.geojson"): large_corpus.render_json(
            {"type": "FeatureCollection", "features": sorted(features, key=lambda feature: feature["properties"]["route"])}
        )
        for bucket, features in sorted(buckets.items())
    }
    return files, route_to_path


def add_geo_resources(
    records: list[dict[str, Any]],
    resources: list[dict[str, Any]],
    route_to_path: dict[str, str],
    public_base: str,
) -> None:
    for record in records:
        path = route_to_path.get(record["route"])
        if not path:
            continue
        resource_id = f"{record['name']}-geometry"
        resource_route = f"resource/{record['name']}/geometry"
        resources.append(
            {
                "id": resource_id,
                "dataset": record["name"],
                "name": "Frozen evaluation geometry shard",
                "description": "Snapshot-bound GeoJSON containing this feature and a bounded set of peers.",
                "format": "GeoJSON",
                "source_format": "GeoJSON",
                "route": resource_route,
                "url": f"{public_base}{path}",
                "host": "chris-page-gov.github.io",
                "resource_type": "normalized-spatial-projection",
                "position": record["resource_count"],
                "provenance": {
                    "assertion_status": "normalized",
                    "assertion_scope": record["assertion_scope"],
                    "source": record["provenance"].get("source_service") or record["provenance"].get("source_url"),
                },
            }
        )
        record["resource_ids"].append(resource_route)
        record["resource_count"] += 1


def validate_resource_references(
    records: list[dict[str, Any]], resources: list[dict[str, Any]]
) -> None:
    """Fail closed when a record advertises a resource the corpus cannot hydrate."""
    routes = [clean_text(resource.get("route")) for resource in resources]
    duplicates = [route for route, count in Counter(routes).items() if route and count > 1]
    if duplicates:
        raise ValueError(f"duplicate resource routes: {duplicates[:10]}")
    resource_routes = set(routes)
    record_names = {clean_text(record.get("name")) for record in records}
    failures: list[str] = []
    for record in records:
        advertised = [clean_text(value) for value in record.get("resource_ids", [])]
        if len(advertised) != len(set(advertised)):
            failures.append(f"{record['route']}: duplicate resource_ids")
        if record.get("resource_count") != len(advertised):
            failures.append(
                f"{record['route']}: resource_count {record.get('resource_count')} "
                f"does not match {len(advertised)} advertised routes"
            )
        failures.extend(
            f"{record['route']}: unresolved resource {route}"
            for route in advertised
            if route not in resource_routes
        )
    failures.extend(
        f"{resource.get('route')}: unknown dataset {resource.get('dataset')}"
        for resource in resources
        if clean_text(resource.get("dataset")) not in record_names
    )
    if failures:
        raise ValueError("resource referential integrity failed: " + "; ".join(failures[:40]))


def semantic_artifacts(
    records: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    snapshot: dict[str, Any],
    generated_at: str,
) -> dict[str, Any]:
    """Author YAML-LD, then derive governed semantic artifacts from its parse.

    The normalized source snapshot is too large for a hand-maintained graph, so
    this is an explicit deterministic authoring stage.  ``draft_document`` is
    rendered as YAML-LD and immediately reparsed by the safe YAML 1.2 loader;
    every downstream semantic file consumes that parsed authoring source.
    """
    publication = publication_config(snapshot)
    public_base = publication["public_base"]
    nodes: dict[str, dict[str, Any]] = {}
    for record in records:
        node = {
            "@id": record["@id"],
            "@type": record.get("@type") or "https://schema.org/Thing",
            "route": record["route"],
            "title": record["title"],
            "type": record.get("record_type", "Record"),
            "assertion_status": record["assertion_status"],
            "assertion_scope": record["assertion_scope"],
        }
        nodes[node["@id"]] = node
    for boundary in snapshot.get("scope", {}).get("boundaries", []):
        iri = f"https://statistics.data.gov.uk/id/statistical-geography/{boundary['code']}"
        nodes[iri] = {
            "@id": iri,
            "@type": "https://schema.org/AdministrativeArea",
            "route": f"geography/{boundary['code']}",
            "title": boundary["name"],
            "type": "Official statistical geography",
            "identifier": boundary["code"],
            "assertion_status": "official",
            "assertion_scope": "real-world",
        }
    assertions: list[dict[str, Any]] = []
    for relationship in relationships:
        source_iri = relationship["source_iri"]
        target_iri = relationship["target_iri"]
        predicate = relationship["predicate"]
        if source_iri not in nodes or target_iri not in nodes:
            raise ValueError(
                f"semantic relationship endpoint is not registered: {source_iri} -> {target_iri}"
            )
        direct = nodes[source_iri].get(predicate)
        target_ref = {"@id": target_iri}
        if direct is None:
            nodes[source_iri][predicate] = target_ref
        elif isinstance(direct, list):
            if target_ref not in direct:
                direct.append(target_ref)
        elif direct != target_ref:
            nodes[source_iri][predicate] = [direct, target_ref]
        assertion = {
            "@id": relationship["id"],
            "@type": ["rdf:Statement", "okf:RelationshipAssertion"],
            "source": source_iri,
            "predicate": predicate,
            "target": target_iri,
            "kind": relationship["kind"],
            "inverse_label": relationship["inverse_label"],
            "assertion_status": relationship["assertion_status"],
            "assertion_scope": relationship["assertion_scope"],
            "authority": relationship["authority"],
            "derivation": relationship["derivation_activity"],
            "observed_at": relationship["observed_at"],
            "evidence": relationship["evidence"],
            "rights": relationship["rights"],
            "confidence_score": relationship.get("confidence_score", 1.0),
        }
        for key in (
            "derivation_activity",
            "rule",
            "supporting_assertions",
            "review_status",
            "stale_after",
        ):
            if relationship.get(key):
                assertion[key] = relationship[key]
        assertions.append(assertion)
    draft_document = {
        "@context": [okf_semantic.CONTEXT_URL, okf_semantic.SEMANTIC_CONTEXT_URL],
        "@id": public_base,
        "@type": "okf:Bundle",
        "title": publication["title"],
        "description": publication["description"],
        "version": "1.0.0",
        "status": publication["status"],
        "profile": {"@id": EVALUATION_PROFILE_SCHEMA_URL},
        "descriptor": {"@id": f"{public_base}okf-explorer.json"},
        "publisher": {"@id": publication["publisher"]},
        "license": {"@id": publication["license"]},
        "generated": {"by": "process:heritage-evaluation-builder", "at": generated_at},
        "assertion_status": "normalized",
        "assertion_scope": snapshot.get("scope", {}).get("assertion_scope", "real-world"),
        "@graph": sorted(nodes.values(), key=lambda node: node["@id"]),
        "assertions": sorted(assertions, key=lambda assertion: assertion["@id"]),
    }
    yaml_ld = okf_semantic.render_yaml_ld(draft_document)
    materialization = okf_semantic.materialize_yaml_ld(
        yaml_ld,
        source=f"generated:{snapshot.get('snapshot_id', '')}:okf-bundle.yamlld",
    )
    document = materialization.document
    semantic_errors = okf_semantic.validate_semantic_assertions(document)
    if semantic_errors:
        raise ValueError("invalid direct/reified YAML-LD assertions:\n- " + "\n- ".join(semantic_errors))
    registry_input = {
        node["route"]: node
        for node in document.get("@graph", [])
        if isinstance(node, dict) and node.get("route")
    }
    iri_registry = okf_semantic.build_iri_route_registry(
        registry_input, snapshot=snapshot.get("snapshot_id", "")
    )
    predicate_registry = okf_semantic.predicate_registry_from_relationships(
        relationships,
        snapshot=snapshot.get("snapshot_id", ""),
        generated_at_value=generated_at,
    )
    registry_text = large_corpus.render_json(iri_registry)
    predicate_text = large_corpus.render_json(predicate_registry)
    extension = {
        "schema": "okf-semantic-model.v1",
        "status": "experimental",
        "contexts": [
            okf_semantic.context_reference(okf_semantic.CONTEXT_URL),
            okf_semantic.context_reference(okf_semantic.SEMANTIC_CONTEXT_URL),
        ],
        "id_registry": {
            "path": "data/semantic/iri-route-registry.json",
            "sha256": sha256_bytes(registry_text.encode("utf-8")),
            "media_type": "application/json",
        },
        "predicate_registry": {
            "path": "data/semantic/predicate-registry.json",
            "sha256": sha256_bytes(predicate_text.encode("utf-8")),
            "media_type": "application/json",
        },
        "inference": {"status": "not-run"},
    }
    extension_errors = okf_semantic.schema_errors(extension, "semantic-model.schema.json")
    if extension_errors:
        raise ValueError("invalid semantic-model extension:\n- " + "\n- ".join(extension_errors))
    return {
        "document": document,
        "yaml_ld": yaml_ld,
        "json_ld": materialization.json_ld,
        "normalized_graph": {
            "algorithm": "URDNA2015",
            "media_type": "application/n-quads",
            "sha256": materialization.normalized_graph_sha256,
            "statements": materialization.normalized_statements,
            "source_data_model_sha256": materialization.source_data_model_sha256,
        },
        "iri_registry": iri_registry,
        "predicate_registry": predicate_registry,
        "extension": extension,
        "validation_report": {
            "schema": "okf-semantic-validation-report.v1",
            "generated_at": generated_at,
            "snapshot": snapshot.get("snapshot_id", ""),
            "valid": True,
            "errors": [],
            "normalized_graph": {
                "algorithm": "URDNA2015",
                "media_type": "application/n-quads",
                "sha256": materialization.normalized_graph_sha256,
                "statements": materialization.normalized_statements,
                "source_data_model_sha256": materialization.source_data_model_sha256,
            },
            "counts": {
                "nodes": len(nodes),
                "assertions": len(assertions),
                "predicates": predicate_registry["counts"]["predicates"],
                "registered_iris": iri_registry["counts"]["entries"],
            },
            "checks": [
                "deterministic YAML-LD authoring source parsed with safe YAML 1.2",
                "JSON-LD materialized from the parsed YAML-LD data model",
                "YAML-LD and JSON-LD share one URDNA2015 normalized graph identity",
                "semantic extension schema",
                "IRI-route registry schema and root digest",
                "predicate registry schema and root digest",
                "one direct triple and one reified assertion per relationship",
            ],
        },
    }


def semantic_descriptor(corpus: dict[str, Any], _snapshot: dict[str, Any]) -> dict[str, Any]:
    return corpus["semantic"]["document"]


def markdown_files(corpus: dict[str, Any], snapshot: dict[str, Any]) -> dict[Path, str]:
    publication = publication_config(snapshot)
    public_base = publication["public_base"]
    family_public_base = publication["family_public_base"]
    role = publication["role"]
    generated_at = corpus["descriptor"]["generated_at"]
    counts = corpus["descriptor"]["counts"]
    record_claim = (
        "invented, explicitly synthetic capability records"
        if publication["role"] == "synthetic"
        else "source-backed records"
    )
    boundary_note = (
        "Every item is invented and labelled synthetic. Nothing here is loaded, counted or searched by the faithful corpus."
        if publication["role"] == "synthetic"
        else "The corpus contains only official fields and visibly labelled mechanical normalizations. Synthetic capability examples are isolated in a different bundle and namespace and do not affect these counts."
    )
    descriptor_url = f"{public_base}okf-explorer.json"
    explorer_url = f"{EXPLORER_BASE}?bundle={quote(descriptor_url, safe='')}"
    entry_scope = {
        "faithful": "faithful source-backed evaluation corpus",
        "tiny": "tiny source-backed assurance subset",
        "synthetic": "separate, default-off synthetic capability supplement",
    }.get(role, "scoped evaluation corpus")
    entry_links = [
        f"- [Open the {entry_scope} in OKF Explorer]({explorer_url})",
        f"- [Read this corpus landing page as HTML]({public_base}index.html)",
        f"- [Read this corpus methodology as HTML]({public_base}methodology.html)",
    ]
    if role != "faithful":
        entry_links.append(
            f"- [Return to the faithful evaluation corpus]({family_public_base}index.html)"
        )
    entry_links.extend(
        [
            "- [Read the evaluation profile as HTML]"
            f"({family_public_base}evaluation-foundry/fixtures/heritage-warwickshire/profile.html)",
            "- [Read the full evaluation report as HTML]"
            f"({family_public_base}docs/heritage-evaluation-report.html)",
            "- [Inspect the immutable exemplar release]"
            "(https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
            "releases/tag/heritage-coventry-warwickshire-20260804)",
        ]
    )
    published_entry_points = "\n".join(entry_links)
    index = f'''---
"@context": https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@id": {public_base}
type: Evaluation Corpus
title: {publication['title']}
description: {publication['description']}
resource: {public_base}okf-explorer.json
generated:
  by: process:heritage-evaluation-builder
  at: "{generated_at}"
assertion_status: normalized
assertion_scope: {snapshot.get('scope', {}).get('assertion_scope', 'real-world')}
aliases:
  - Warwickshire heritage
  - Coventry heritage
tags:
  - evaluation-foundry
  - {'synthetic-capability' if publication['role'] == 'synthetic' else 'historic-england'}
  - yaml-ld
---

# {publication['title']}

## Start here

This corpus demonstrates OKF Explorer functionality over **{counts['records']:,}**
{record_claim}. It is an evaluation, not a source of legal or operational truth.

Published entry points for this {entry_scope}:

{published_entry_points}

## Publication boundary

{boundary_note}
'''
    method_content = (
        '''## Synthetic scope

This corpus is a hand-authored interface fixture. It does not query Historic
England, assert a designation, name a real person, or describe a real proposal.
Its invented place, person and future event demonstrate typed nodes, qualified
uncertainty and proposed-event relationships that are sparse or absent in the
faithful source.

## Isolation

The descriptor declares `assertion_scope: synthetic-fixture` and sets
`default_loaded`, `include_in_counts` and `include_in_search` to `false`.
Its namespace, routes, search index and plane digests are separate from the
faithful corpus.

## Rights and link validation

The invented fixture is dedicated under CC0. Its links resolve only to its own
published warning and documentation; it never constructs fictitious Historic
England List-entry URLs.'''
        if publication["role"] == "synthetic"
        else '''## Tiny assurance subset

This is a declared three-record assurance subset: two exact NHLE List entries
and one exact 2025 Heritage at Risk row. It is designed for fast producer,
negative-case and real-browser consumer checks. It is not the Coventry and
Warwickshire denominator and must not be used as a completeness claim.

## Source preservation

The records are copied from the faithful frozen acquisition by exact identity,
without inventing substitute values. Coventry and Stratford-on-Avon boundary
coordinates were used by the parent spatial intersection. Their large
coordinate arrays are intentionally omitted here, while canonical SHA-256
geometry receipts and source boundary attributes preserve the identity check.

## Geometry

Both NHLE assurance anchors retain their source multipoint coordinates. The
fixture therefore exercises explicit source locations without pretending that
its omitted boundary polygons are present.

## Link validation

The same identifier-binding and local Markdown-to-HTML link gates apply to the
tiny fixture. Its NHLE rich pages, HAR register searches bound to exact source
List Entry Numbers and frozen source-feature URLs are kept distinct.'''
        if publication["role"] == "tiny"
        else '''## Scope

Inclusion is an intersection with Coventry (`E08000026`) or one of the five
Warwickshire local-authority boundaries in the pinned ONS December 2025 BFC
layer. A record intersecting several boundaries is emitted once and retains
every intersection.

## Source layers

- The National Heritage List for England FeatureServer supplies identifiers,
  names, categories, grades, dates, National Grid references and geometry.
- Sanctioned annual Heritage at Risk spreadsheets supply annual entries,
  additions and positive removals. Missing historical columns remain unknown.
- Historic England's NHLE rich HTML pages and HAR register searches remain
  linked official resources; their narrative is not bulk-copied into this
  repository, and an opaque HAR item route is never inferred.

## Geometry

ArcGIS delivered retained source geometry in WGS 84 (`EPSG:4326`) because the
acquisition requested `outSR=4326`. The builder validates that declaration and
normalizes only the Esri geometry structure; it does not transform coordinates.
Source points remain explicit points. Polygon and multipoint records use a
clearly labelled bounding-box centre only for schematic orientation; source
geometry is retained in bounded GeoJSON shards.

## Link validation

Every NHLE rich page and HAR register search is bound to its source identifier
and allowed origin. Local Markdown-to-HTML links and fragments are checked by
the assembled-site audit. The publication gate additionally opens
representative source pages and every task-critical deployed route in a real
browser.'''
    )
    method_content += '''

## Relationship projection rules

Relationships use the record IRIs registered by the YAML-LD semantic layer.
Official annual HAR-to-NHLE links come only from a source List entry field;
boundary links are deterministic projections of the recorded intersection.
Derivation and rule links return to this published explanation rather than to
an unserved identifier path. Annual HAR rows retain year precision and never
invent a day or month.'''
    methodology = f'''---
"@context": https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@id": {public_base}methodology.html
type: Methodology
title: {publication['title']} methodology
description: Scope, acquisition, normalization, link and completeness rules for the exemplar.
resource: {public_base}data/source-provenance.json
generated:
  by: process:heritage-evaluation-builder
  at: "{generated_at}"
assertion_status: normalized
assertion_scope: {snapshot.get('scope', {}).get('assertion_scope', 'real-world')}
---

# {publication['title']} methodology

{method_content}

## Frozen source

**Snapshot:** `{snapshot.get('snapshot_id', '')}`

**Observed:** `{snapshot.get('observed_at', '')}`
'''
    log = f"# Heritage evaluation generation log\n\n## {generated_at[:10]}\n\n- Built {counts['records']:,} records ({counts['heritage_assets']:,} NHLE assets, {counts['risk_records']:,} annual Heritage at Risk records and {counts['synthetic_records']:,} synthetic records).\n- Generated typo-tolerant static search, exact facets, graph adjacency, record locator, GeoJSON shards and per-plane digests.\n- Kept synthetic assertions outside the faithful namespace and counts.\n"
    return {Path("index.md"): index, Path("methodology.md"): methodology, Path("log.md"): log}


def build_normalized_core(
    snapshot: dict[str, Any],
    generated_at: str,
    *,
    planes: set[str] | None = None,
) -> dict[str, Any]:
    """Normalize one frozen source snapshot independently of output planes."""
    selected_planes = planes or set(heritage_build_io.PLANES)
    publication = publication_config(snapshot)
    public_base = publication["public_base"]
    records = source_records(snapshot)
    geo_files, route_to_geo = geojson_files(records)
    resources = resource_rows(records, snapshot)
    add_geo_resources(records, resources, route_to_geo, public_base)
    validate_resource_references(records, resources)
    relationships = relationship_rows(records, snapshot)
    enrich_relationship_search_aliases(records, relationships)
    facets = facet_rows(records)
    publishers = publisher_rows(records, resources, snapshot)
    common = {
        "records": records,
        "resources": resources,
        "publishers": publishers,
        "relationships": relationships,
        "facets": facets,
        "geo_files": geo_files,
    }
    if selected_planes == {"semantic"}:
        return {
            **common,
            "semantic": semantic_artifacts(
                records, relationships, snapshot, generated_at
            ),
        }
    search = large_corpus.build_search(
        records,
        max_postings_per_token=10_000,
        filter_facets=facets,
        search_entities=[
            {
                "id": slugify(publication["publisher_title"]),
                "label": publication["publisher_title"],
                "aliases": ["HE"]
                if publication["publisher_title"] == "Historic England"
                else [],
                "kind": "organisation",
            },
            *[
                {"id": boundary["code"], "label": boundary["name"], "aliases": boundary.get("aliases", []), "kind": "geography"}
                for boundary in snapshot.get("scope", {}).get("boundaries", [])
            ],
        ],
        enable_typo_tolerance=True,
    )
    search_snapshot = snapshot.get("snapshot_id", "")
    search["manifest"]["snapshot"] = search_snapshot
    if isinstance(search.get("shard_metadata"), dict):
        search["shard_metadata"]["snapshot"] = search_snapshot
        for rows in search["shard_metadata"].get("shards", {}).values():
            for row in rows:
                row["snapshot"] = search_snapshot
        search["manifest"]["shard_manifest_sha256"] = sha256_bytes(
            large_corpus.render_json(search["shard_metadata"].get("shards", {})).encode(
                "utf-8"
            )
        )
    if selected_planes == {"search"}:
        return {**common, "search": search}
    chunk_size = 500
    raw_record_chunks = large_corpus.chunk_paths("records", records, chunk_size=chunk_size)
    record_chunks = [(path.with_suffix(".json.gz"), rows) for path, rows in raw_record_chunks]
    resource_chunks = [(path.with_suffix(".json.gz"), rows) for path, rows in large_corpus.chunk_paths("resources", resources, chunk_size=1000)]
    publisher_chunks = large_corpus.chunk_paths("publishers", publishers, chunk_size=1000)
    relationship_chunks = [(path.with_suffix(".json.gz"), rows) for path, rows in large_corpus.chunk_paths("relationships", relationships, chunk_size=2000)]
    adjacency, adjacency_buckets = large_corpus.build_relationship_adjacency(relationships)
    adjacency["snapshot"] = snapshot.get("snapshot_id", "")
    adjacency["buckets"] = {bucket: path.replace(".json", ".json.gz") for bucket, path in adjacency["buckets"].items()}
    adjacency_buckets = [(path.with_suffix(".json.gz"), routes) for path, routes in adjacency_buckets]
    locator, locator_buckets = record_locator(records, chunk_size, [path for path, _ in record_chunks], snapshot.get("snapshot_id", ""))
    graph, analysis = graph_and_analysis(records, resources, relationships, facets, generated_at, snapshot)
    needs_semantic = bool(
        selected_planes & {"semantic", "control", "presentation"}
    )
    semantic = (
        semantic_artifacts(records, relationships, snapshot, generated_at)
        if needs_semantic
        else {"extension": {}}
    )
    counts = {
        "records": len(records),
        "datasets": len(records),
        "heritage_assets": sum(record["route"].startswith("asset/") for record in records),
        "risk_records": sum(record["route"].startswith("risk/") for record in records),
        "synthetic_records": sum(record["assertion_scope"] == "synthetic-fixture" for record in records),
        "resources": len(resources),
        "publishers": len(publishers),
        "relationships": len(relationships),
        "geographies": len(facets["geography_code"]),
        "register_years": len(facets["register_year"]),
    }
    overview = {
        "schema": "okf-large-overview.v1",
        "title": publication["title"],
        "generated_at": generated_at,
        "counts": counts,
        "warnings": analysis["summary"]["notices"],
        "top_publishers": publishers,
        "recent_datasets": large_corpus.search_docs(sorted(records, key=lambda record: record.get("timestamp", ""), reverse=True)[:16]),
        "format_counts": facets["format"],
        "facet_previews": {key: rows[:18] for key, rows in facets.items()},
        "notices": analysis["summary"]["notices"],
    }
    performance = {
        "startup_mode": "overview-first",
        "full_record_hydration": "lazy",
        "record_hydration": "hash-sharded locator",
        "relationship_hydration": "hash-sharded adjacency",
        "search": "static worker shards with bounded one-edit typo tolerance",
        "geometry": "bounded local GeoJSON shards",
    }
    manifest = {
        "title": publication["title"],
        "generated_at": generated_at,
        "snapshot": snapshot.get("snapshot_id", ""),
        "counts": counts,
        "indexes": {
            "overview": "data/overview.json",
            "analysis": "data/analysis/overview.json",
            "search": "data/search/manifest.json",
            "facets": "data/facets.json",
            "graph": "data/graph.json",
            "relationship_adjacency": "data/adjacency/manifest.json",
            "record_locator": "data/records/manifest.json",
            "source_provenance": "data/source-provenance.json",
            "link_validation": "data/link-validation.json",
            "link_validation_shards": "data/link-validation/manifest.json",
            "semantic_shards": "data/semantic/manifest.json",
            "plane_roots": "assurance/plane-roots.json",
        },
        "chunks": {
            "datasets": [path.as_posix() for path, _ in record_chunks],
            "resources": [path.as_posix() for path, _ in resource_chunks],
            "publishers": [path.as_posix() for path, _ in publisher_chunks],
            "relationships": [path.as_posix() for path, _ in relationship_chunks],
        },
        "performance": performance,
        "search": {
            "schema": search["manifest"]["schema"],
            "documents": len(records),
            "tokens": search["manifest"]["counts"]["tokens"],
            "result_limit": search["manifest"]["result_limit"],
            "typo_tolerance": search["manifest"]["typo_tolerance"],
        },
    }
    entrypoints = {
        "viewer": EXPLORER_BASE,
        "data_manifest": "data/manifest.json",
        "overview_index": "data/overview.json",
        "analysis_overview": "data/analysis/overview.json",
        "search_manifest": "data/search/manifest.json",
        "relationship_adjacency": "data/adjacency/manifest.json",
        "record_locator": "data/records/manifest.json",
        "markdown_index": "index.md",
        "notes": "methodology.md",
        "evaluation_profile": (
            f"{publication['family_public_base']}evaluation-foundry/fixtures/"
            "heritage-warwickshire/profile.html"
        ),
        "evaluation_report": (
            f"{publication['family_public_base']}docs/heritage-evaluation-report.html"
        ),
        "feature_coverage": (
            f"{publication['family_public_base']}evaluation-foundry/fixtures/"
            "heritage-warwickshire/feature-coverage.json"
        ),
        "journeys": (
            f"{publication['family_public_base']}evaluation-foundry/fixtures/"
            "heritage-warwickshire/journeys.json"
        ),
        "plane_roots": "assurance/plane-roots.json",
    }
    if publication["role"] == "faithful":
        entrypoints.update(
            {
                "tiny_fixture": "tiny/okf-explorer.json",
                "synthetic_supplement": "synthetic/okf-explorer.json",
            }
        )
    else:
        entrypoints["faithful_corpus"] = (
            f"{publication['family_public_base']}okf-explorer.json"
        )
    descriptor = {
        "@context": "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld",
        "@id": f"{public_base}okf-explorer.json",
        "base_namespace": public_base,
        "schema": "okf-explorer-large-corpus.v1",
        "kind": "okf-large-corpus",
        "okf_version": "0.2",
        "core_conformance": "Markdown concept layer with additive YAML-LD semantic projection",
        "title": publication["title"],
        "description": publication["description"],
        "version": "1.0.0",
        "status": publication["status"],
        "assertion_scope": snapshot.get("scope", {}).get("assertion_scope", "real-world"),
        "default_loaded": publication["role"] == "faithful",
        "include_in_counts": publication["role"] != "synthetic",
        "include_in_search": publication["role"] != "synthetic",
        "profile": EVALUATION_PROFILE_SCHEMA_URL,
        "publisher": PUBLICATION_REPOSITORY,
        "license": publication["license"],
        "semantic_descriptor": f"{public_base}okf-bundle.yamlld",
        "generated_at": generated_at,
        "snapshot": snapshot.get("snapshot_id", ""),
        "entrypoints": entrypoints,
        "counts": counts,
        "performance": performance,
        "source": {
            "title": clean_text(snapshot.get("source_title")) or "Historic England NHLE and annual Heritage at Risk sources clipped with ONS December 2025 BFC boundaries",
            "url": safe_http_url(snapshot.get("source_url")) or "https://historicengland.org.uk/listing/the-list/",
            "data_url": safe_http_url(snapshot.get("source_data_url")) or NHLE_SERVICE,
            "license": publication["license"],
            "source_adapter": clean_text(snapshot.get("source_adapter")) or "heritage-evaluation-frozen-snapshot",
            "observed_at": snapshot.get("observed_at", ""),
            "snapshot_id": snapshot.get("snapshot_id", ""),
            "denominators": snapshot.get("denominators", []),
        },
        "vocabulary": {
            "record_singular": "heritage record",
            "record_plural": "heritage records",
            "resource_singular": "source or representation",
            "resource_plural": "sources and representations",
            "publisher_singular": "authority",
            "publisher_plural": "authorities",
            "format_plural": "representations",
            "resource_stack_label": "Evidence and representation stack",
            "search_placeholder": "Search names, List entries, places, aliases, grades, risk fields — misspellings tolerated",
        },
        "extensions": {
            "okf-explorer-analysis.v1": {"mode": "external", "entrypoint": "analysis_overview"},
            "okf-semantic-model.v1": semantic["extension"],
            "okf-evaluation-foundry.v1": {
                "corpus_role": publication["role"],
                "publication_boundary": (
                    "Invented, default-off functionality fixture; never a real-world claim."
                    if publication["role"] == "synthetic"
                    else "Functionality evaluation; not an assured source register or replacement for Historic England."
                ),
                "faithful_scope": "real-world",
                "tiny_fixture": "separate-corpus",
                "synthetic_supplement": "separate-default-off-corpus",
            },
            "okf-heritage-evaluation.v1": {
                "scope_codes": [boundary["code"] for boundary in snapshot.get("scope", {}).get("boundaries", [])],
                "scope_vintage": snapshot.get("scope", {}).get("vintage", "December 2025"),
                "rich_text_policy": "link-only-with-source-identifier-validation",
                "geometry_policy": "source-geometry-plus-labelled-representative-point",
            },
        },
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
        "relationship_adjacency": adjacency,
        "relationship_adjacency_buckets": adjacency_buckets,
        "record_locator": locator,
        "record_locator_buckets": locator_buckets,
        "facets": facets,
        "graph": graph,
        "search": search,
        "geo_files": geo_files,
        "semantic": semantic,
    }


def build_corpus(snapshot: dict[str, Any], generated_at: str) -> dict[str, Any]:
    """Compatibility alias for callers written before the modular emitters."""

    return build_normalized_core(snapshot, generated_at)


def source_provenance(snapshot: dict[str, Any]) -> dict[str, Any]:
    sources = copy.deepcopy(snapshot.get("sources", []))
    acquisition_prefilter: Counter[str] = Counter()
    for source in sources:
        for sheet in source.get("semantic_sheets", []):
            scope_rows = sheet.get("scope_rows")
            if isinstance(scope_rows, int):
                role = clean_text(sheet.get("semantic_role"))
                acquisition_prefilter[role] += scope_rows
                sheet["scope_rows_stage"] = (
                    "acquisition-prefilter-before-authoritative-geography-reconciliation"
                )

    authoritative_emitted: Counter[str] = Counter()
    denominator_pattern = re.compile(
        r"har-\d{4}-(entries|additions|positive_removals)-scope-rows"
    )
    for denominator in snapshot.get("denominators", []):
        match = denominator_pattern.fullmatch(clean_text(denominator.get("id")))
        count = denominator.get("count")
        if match and isinstance(count, int):
            authoritative_emitted[match.group(1)] += count

    provenance = {
        "schema": "heritage-evaluation-source-provenance.v1",
        "snapshot_id": snapshot.get("snapshot_id", ""),
        "observed_at": snapshot.get("observed_at", ""),
        "geometry_delivery": snapshot.get("geometry_delivery", {}),
        "scope": snapshot.get("scope", {}),
        "sources": sources,
        "denominators": snapshot.get("denominators", []),
        "requests": snapshot.get("requests", []),
        "limitations": snapshot.get("limitations", []),
    }
    if acquisition_prefilter:
        roles = sorted(set(acquisition_prefilter) | set(authoritative_emitted))
        excluded = {
            role: acquisition_prefilter[role] - authoritative_emitted[role]
            for role in roles
        }
        if any(count < 0 for count in excluded.values()):
            raise ValueError(
                "authoritative HAR scope count exceeds acquisition prefilter count"
            )
        prefilter_total = sum(acquisition_prefilter.values())
        emitted_total = sum(authoritative_emitted.values())
        provenance["scope_reconciliation"] = {
            "acquisition_prefilter": {
                "rows": prefilter_total,
                "by_event_kind": dict(sorted(acquisition_prefilter.items())),
                "field": "sources[].semantic_sheets[].scope_rows",
            },
            "authoritative_emitted": {
                "rows": emitted_total,
                "by_event_kind": dict(sorted(authoritative_emitted.items())),
                "field": "denominators[har-*-*-scope-rows].count",
            },
            "excluded_after_authoritative_geography_reconciliation": {
                "rows": prefilter_total - emitted_total,
                "by_event_kind": dict(sorted(excluded.items())),
            },
            "method": (
                "The acquisition prefilter supported broad workbook discovery. "
                "The authoritative emitted stage accepts only sanctioned local-"
                "authority fields or explicit Warwickshire county evidence and "
                "excludes locality-only matches such as Warwick Bridge in Cumbria."
            ),
        }
    return provenance


def link_validation(
    records: list[dict[str, Any]],
    resources: list[dict[str, Any]],
    snapshot: dict[str, Any],
    relationships: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    record_checks: list[dict[str, Any]] = []
    resource_checks: list[dict[str, Any]] = []
    failures: list[str] = []
    rich_bindings = 0
    relationship_ui_links = 0
    publication = publication_config(snapshot)
    public_base = publication["public_base"]
    record_by_name = {record["name"]: record for record in records}
    record_iri_by_route = {record["route"]: record["@id"] for record in records}
    geography_iri_by_route = {
        f"geography/{boundary['code']}":
            f"https://statistics.data.gov.uk/id/statistical-geography/{boundary['code']}"
        for boundary in snapshot.get("scope", {}).get("boundaries", [])
    }

    def allowed_relationship_link(value: Any) -> bool:
        url = safe_http_url(value)
        if not url:
            return False
        if url in {OGL, "https://creativecommons.org/publicdomain/zero/1.0/"}:
            return True
        if url == public_base or url.startswith(f"{public_base}methodology.html"):
            return True
        if official_historic_england_url(url):
            return True
        if url.startswith(f"{NHLE_SERVICE}/") or url == NHLE_SERVICE:
            return True
        if url.startswith(ONS_BOUNDARY_SERVICE):
            return True
        return url in record_iri_by_route.values() or url in geography_iri_by_route.values()

    for record in records:
        url = safe_http_url(record.get("url"))
        status = "valid-origin-and-identifier-binding"
        basis = "explicit origin allowlist, canonical URL, source identity and dereferenceable semantic IRI"
        route = clean_text(record.get("route"))
        expected_iri = (
            official_historic_england_url(url)
            if route.startswith("asset/")
            else explorer_record_iri(public_base, route)
        )
        if not url:
            status = "invalid"
            failures.append(f"{route}: invalid primary URL")
        elif route.startswith("asset/") and not official_historic_england_url(url):
            status = "invalid"
            failures.append(f"{route}: rich page is outside the Historic England origin allowlist")
        elif route.startswith("asset/") and not exact_nhle_list_entry_binding(
            url, record["native_id"]
        ):
            status = "invalid"
            failures.append(f"{route}: rich page does not bind its List entry")
        elif route.startswith("asset/"):
            rich_bindings += 1
        elif route.startswith("risk/"):
            list_entry = clean_text(record.get("extras", {}).get("list_entry_number"))
            if not official_historic_england_url(url):
                status = "invalid"
                failures.append(f"{route}: annual record URL is outside the Historic England origin allowlist")
            elif list_entry and not exact_har_register_search_binding(url, list_entry):
                status = "invalid"
                failures.append(
                    f"{route}: annual register search does not bind exact q={list_entry}"
                )
            elif list_entry:
                rich_bindings += 1
        elif record.get("assertion_scope") == "synthetic-fixture" and not url.startswith(public_base):
            status = "invalid"
            failures.append(f"{route}: synthetic primary URL is outside its isolated corpus namespace")
        if safe_http_url(record.get("@id")) != expected_iri:
            status = "invalid"
            failures.append(f"{route}: semantic IRI is not its exact dereferenceable record page")
        if safe_http_url(record.get("documentation")) != f"{public_base}methodology.html":
            status = "invalid"
            failures.append(f"{route}: documentation does not bind the published methodology page")
        source_api_url = clean_text(record.get("source_api_url"))
        if source_api_url and not source_api_url.startswith(f"{NHLE_SERVICE}/"):
            status = "invalid"
            failures.append(f"{route}: source API URL is outside the canonical NHLE FeatureServer")
        record_checks.append(
            {
                "kind": "record-primary",
                "route": route,
                "url": url,
                "status": status,
                "basis": basis,
            }
        )
    for resource in resources:
        route = clean_text(resource.get("route"))
        url = safe_http_url(resource.get("url"))
        record = record_by_name.get(clean_text(resource.get("dataset")))
        status = "valid-origin-and-corpus-binding"
        basis = "URL syntax, source/generated origin and exact record-to-resource route binding"
        if not url:
            status = "invalid"
            failures.append(f"{resource['route']}: invalid resource URL")
        elif not record:
            status = "invalid"
            failures.append(f"{route}: resource dataset does not resolve to a corpus record")
        elif route not in record.get("resource_ids", []):
            status = "invalid"
            failures.append(f"{route}: resource route is not advertised by its record")
        elif resource.get("resource_type") == "official-record-page":
            list_entry = clean_text(record.get("extras", {}).get("list_entry_number"))
            if not official_historic_england_url(url):
                status = "invalid"
                failures.append(f"{route}: official page is outside the Historic England origin allowlist")
            elif list_entry and not exact_nhle_list_entry_binding(url, list_entry):
                status = "invalid"
                failures.append(f"{route}: official rich page does not bind List entry {list_entry}")
            elif list_entry:
                rich_bindings += 1
                basis = "official source row/feature plus exact List-entry URL binding"
        elif resource.get("resource_type") == "official-register-search":
            list_entry = clean_text(record.get("extras", {}).get("list_entry_number"))
            if not official_historic_england_url(url):
                status = "invalid"
                failures.append(
                    f"{route}: official register search is outside the Historic England origin allowlist"
                )
            elif not list_entry or not exact_har_register_search_binding(url, list_entry):
                status = "invalid"
                failures.append(
                    f"{route}: official register search does not bind exact q={list_entry}"
                )
            else:
                rich_bindings += 1
                basis = "official HAR register results path plus exact q=ListEntry binding"
        elif resource.get("resource_type") == "official-source-feature":
            list_entry = clean_text(record.get("native_id"))
            decoded_url = unquote(url)
            if not url.startswith(f"{NHLE_SERVICE}/"):
                status = "invalid"
                failures.append(f"{route}: source feature is outside the canonical NHLE FeatureServer")
            elif list_entry and f"ListEntry='{list_entry}'" not in decoded_url:
                status = "invalid"
                failures.append(f"{route}: ArcGIS query does not bind List entry {list_entry}")
            basis = "canonical FeatureServer layer and exact ListEntry query binding"
        elif resource.get("resource_type") == "official-annual-source":
            try:
                official_har_source_url(url, int(record.get("register_year", 0)))
            except ValueError:
                status = "invalid"
                failures.append(f"{route}: annual source is not the sanctioned Historic England URL")
            basis = "Historic England origin allowlist and exact annual-register year path"
        elif resource.get("resource_type") == "official-search-name-evidence":
            if not official_historic_england_url(url):
                status = "invalid"
                failures.append(f"{route}: reviewed-name evidence is outside Historic England")
            basis = "reviewed discovery-name evidence on the Historic England origin allowlist"
        elif resource.get("resource_type") == "normalized-spatial-projection":
            expected_prefix = f"{public_base}data/geo/"
            if not url.startswith(expected_prefix) or not url.endswith(".geojson"):
                status = "invalid"
                failures.append(f"{route}: generated geometry URL is outside its corpus namespace")
            basis = "generated file namespace plus record-advertised route binding"
        elif resource.get("resource_type") == "synthetic-scenario-note":
            if not url.startswith(public_base):
                status = "invalid"
                failures.append(f"{route}: synthetic note is outside its isolated corpus namespace")
            basis = "isolated synthetic corpus namespace plus record-advertised route binding"
        else:
            status = "invalid"
            failures.append(f"{route}: resource type has no explicit URL-origin policy")
        resource_checks.append(
            {
                "kind": "resource",
                "record_route": record.get("route", "") if record else "",
                "route": route,
                "url": url,
                "status": status,
                "basis": basis,
            }
        )
    for relationship in relationships or []:
        source = clean_text(relationship.get("source"))
        target = clean_text(relationship.get("target"))
        expected_source = record_iri_by_route.get(source) or geography_iri_by_route.get(source)
        expected_target = record_iri_by_route.get(target) or geography_iri_by_route.get(target)
        for label, actual, expected in (
            ("source IRI", safe_http_url(relationship.get("source_iri")), expected_source),
            ("target IRI", safe_http_url(relationship.get("target_iri")), expected_target),
        ):
            relationship_ui_links += 1
            if not expected or actual != expected:
                failures.append(f"{source} -> {target}: {label} does not match its registered route")
        authority = relationship.get("authority") if isinstance(relationship.get("authority"), dict) else {}
        relationship_links = [
            ("authority source", authority.get("source")),
            ("derivation activity", relationship.get("derivation_activity")),
        ]
        rule = clean_text(relationship.get("rule"))
        if rule:
            relationship_links.append(("rule", rule))
        rights = relationship.get("rights") if isinstance(relationship.get("rights"), dict) else {}
        if rights.get("source"):
            relationship_links.append(("rights source", rights.get("source")))
        for evidence in relationship.get("evidence", []):
            value = evidence.get("url") if isinstance(evidence, dict) else evidence
            relationship_links.append(("evidence", value))
        for label, value in relationship_links:
            relationship_ui_links += 1
            if not allowed_relationship_link(value):
                failures.append(f"{source} -> {target}: {label} is outside the explicit link policy")
    if failures:
        raise ValueError("link validation failed: " + "; ".join(failures[:20]))
    internal_references = sum(len(record.get("resource_ids", [])) for record in records)
    return {
        "schema": "heritage-evaluation-link-validation.v2",
        "snapshot": snapshot.get("snapshot_id", ""),
        "checked_at": snapshot.get("observed_at", ""),
        "method": "Every record, resource and relationship-panel URL is parsed with credentials rejected and checked against an explicit source or generated-origin policy. Internal routes resolve; official NHLE rich pages and FeatureServer queries bind the frozen ListEntry; HAR register searches bind the exact q=ListEntry parameter; annual sources bind their register year; semantic endpoint IRIs bind registered Explorer routes or official pages. Individual external HTML pages are not represented as bulk live-HTTP checks.",
        "counts": {
            "record_links": len(record_checks),
            "resource_links": len(resource_checks),
            "relationship_ui_links": relationship_ui_links,
            "internal_resource_references": internal_references,
            "identifier_bound_rich_links": rich_bindings,
            "live_external_receipts": 0,
            "failures": 0,
        },
        "observations": {
            "included": False,
            "policy": (
                "Timestamped network and browser observations belong to an independent "
                "promotion/evidence envelope which references this candidate root."
            ),
        },
        "validation_levels": {
            "all_record_urls": "structural-origin-and-source-identity",
            "all_resource_urls": "structural-origin-and-corpus-route",
            "all_relationship_panel_urls": "structural-origin-and-registered-route",
            "all_internal_resource_references": "resolved",
            "individual_external_html_availability": "not-claimed for every generated URL occurrence; the terminal browser gate covers every external destination authored into the evaluation report",
            "assembled_local_html_and_markdown": "checked by scripts/build_site.py",
        },
        "checks": [*record_checks, *resource_checks],
        "record_checks": record_checks,
        "resource_checks": resource_checks,
        "limitations": [
            "The source site rate limits and challenges bulk HTML requests; identifier and corpus binding is complete, while every unique external destination authored into the evaluation report is checked in a real browser without bulk-requesting all generated occurrences.",
            "A successful link does not expand the licence or authorize bulk reproduction of rich-page narrative.",
        ],
    }


def _sharded_rows(
    rows: list[dict[str, Any]],
    *,
    identity,
    order_identity=None,
    root: Path,
    kind: str,
    buckets: int = 64,
) -> tuple[dict[str, Any], dict[Path, bytes]]:
    """Return deterministic gzip shards keyed by stable identity hashes."""

    ordering = order_identity or identity
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[heritage_build_io.stable_bucket(str(identity(row)), buckets=buckets)].append(row)
    files: dict[Path, bytes] = {}
    entries: list[dict[str, Any]] = []
    for bucket, values in sorted(grouped.items()):
        ordered = sorted(values, key=lambda value: str(ordering(value)))
        path = root / f"{bucket}.json.gz"
        content = gzip_json(ordered)
        files[path] = content
        entries.append(
            {
                "bucket": bucket,
                "path": path.as_posix(),
                "items": len(ordered),
                "bytes": len(content),
                "sha256": sha256_bytes(content),
            }
        )
    root_basis = [
        {"bucket": row["bucket"], "sha256": row["sha256"]} for row in entries
    ]
    manifest = {
        "kind": kind,
        "algorithm": "sha256(identity)-mod-64-gzip-canonical-json-v1",
        "buckets": buckets,
        "items": len(rows),
        "shards": entries,
        "root_sha256": sha256_bytes(large_corpus.render_json(root_basis).encode("utf-8")),
    }
    return manifest, files


def emit_control_plane(corpus: dict[str, Any], snapshot: dict[str, Any]) -> dict[Path, str | bytes]:
    files: dict[Path, str | bytes] = {
        Path("okf-explorer.json"): large_corpus.render_json(corpus["descriptor"])
    }
    if publication_config(snapshot)["role"] == "faithful":
        for source, target in (
            (MAPPING_PATH, Path("mapping-proposals.yaml")),
            (JOURNEYS_PATH, Path("journeys.json")),
            (QUESTIONS_PATH, Path("questions.json")),
            (FEATURE_COVERAGE_PATH, Path("feature-coverage.json")),
        ):
            if source.is_file():
                files[target] = source.read_text(encoding="utf-8")
        if PROFILE_PATH.is_file():
            files[Path("evaluation-profile.yaml")] = published_evaluation_profile()
    return files


def emit_data_plane(corpus: dict[str, Any], snapshot: dict[str, Any]) -> dict[Path, str | bytes]:
    files: dict[Path, str | bytes] = {
        Path("data/manifest.json"): large_corpus.render_json(corpus["manifest"]),
        Path("data/overview.json"): large_corpus.render_json(corpus["overview"]),
        Path("data/analysis/overview.json"): large_corpus.render_json(corpus["analysis"]),
        Path("data/facets.json"): large_corpus.render_json(corpus["facets"]),
        Path("data/graph.json"): large_corpus.render_json(corpus["graph"]),
        Path("data/adjacency/manifest.json"): large_corpus.render_json(corpus["relationship_adjacency"]),
        Path("data/records/manifest.json"): large_corpus.render_json(corpus["record_locator"]),
        Path("data/source-provenance.json"): large_corpus.render_json(source_provenance(snapshot)),
    }
    validation = link_validation(
        corpus["records"], corpus["resources"], snapshot, corpus["relationships"]
    )
    checks = validation.pop("checks")
    validation.pop("record_checks")
    validation.pop("resource_checks")
    link_manifest, link_files = _sharded_rows(
        checks,
        identity=lambda row: clean_text(row.get("url")),
        order_identity=lambda row: "|".join(
            clean_text(row.get(key)) for key in ("url", "kind", "route", "record_route")
        ),
        root=Path("data/link-validation/shards"),
        kind="link-intents",
    )
    link_manifest.update(
        {
            "schema": "heritage-evaluation-link-validation-shards.v1",
            "snapshot": snapshot.get("snapshot_id", ""),
            "shard_key": "canonical URL",
            "occurrence_order": "URL, kind, route, record route",
            "observations_included": False,
        }
    )
    validation["shard_manifest"] = "data/link-validation/manifest.json"
    validation["checks_materialized_inline"] = False
    files[Path("data/link-validation.json")] = large_corpus.render_json(validation)
    files[Path("data/link-validation/manifest.json")] = large_corpus.render_json(link_manifest)
    files.update(link_files)
    for key in ("record_chunks", "resource_chunks", "publisher_chunks", "relationship_chunks"):
        for path, rows in corpus[key]:
            files[path] = gzip_json(rows) if path.suffix == ".gz" else large_corpus.render_json(rows)
    for path, routes in corpus["relationship_adjacency_buckets"]:
        files[path] = gzip_json(routes)
    for path, routes in corpus["record_locator_buckets"]:
        files[path] = large_corpus.render_json(routes)
    files.update(corpus["geo_files"])
    return files


def emit_search_plane(corpus: dict[str, Any], _snapshot: dict[str, Any]) -> dict[Path, str | bytes]:
    files: dict[Path, str | bytes] = {
        Path("data/search/manifest.json"): large_corpus.render_json(corpus["search"]["manifest"])
    }
    files.update(large_corpus.rendered_search_data_files(corpus["search"]))
    if corpus["search"].get("shard_metadata"):
        files[Path("data/search/shards.json")] = large_corpus.render_json(
            corpus["search"]["shard_metadata"]
        )
    return files


def emit_semantic_plane(corpus: dict[str, Any], snapshot: dict[str, Any]) -> dict[Path, str | bytes]:
    semantic = semantic_descriptor(corpus, snapshot)
    normalized_graph = corpus["semantic"]["normalized_graph"]
    node_manifest, node_files = _sharded_rows(
        semantic.get("@graph", []),
        identity=lambda row: row.get("@id", ""),
        root=Path("data/semantic/nodes"),
        kind="semantic-nodes",
    )
    assertion_manifest, assertion_files = _sharded_rows(
        semantic.get("assertions", []),
        identity=lambda row: row.get("@id", ""),
        root=Path("data/semantic/assertions"),
        kind="reified-assertions",
    )
    shard_manifest = {
        "schema": "okf-semantic-shard-manifest.v1",
        "snapshot": snapshot.get("snapshot_id", ""),
        "canonical_authoring": "okf-bundle.yamlld",
        "json_ld_projection": "okf-bundle.jsonld",
        "materialization": "JSON-LD is deterministically emitted from the parsed YAML-LD data model.",
        "semantic_identity": normalized_graph,
        "legacy_duplicate_removed": "data/semantic/assertions.jsonld",
        "nodes": node_manifest,
        "assertions": assertion_manifest,
    }
    files: dict[Path, str | bytes] = {
        Path("okf-bundle.yamlld"): corpus["semantic"]["yaml_ld"],
        Path("okf-bundle.jsonld"): corpus["semantic"]["json_ld"],
        Path("data/semantic/manifest.json"): large_corpus.render_json(shard_manifest),
        Path("data/semantic/iri-route-registry.json"): large_corpus.render_json(
            corpus["semantic"]["iri_registry"]
        ),
        Path("data/semantic/predicate-registry.json"): large_corpus.render_json(
            corpus["semantic"]["predicate_registry"]
        ),
        Path("data/semantic/validation-report.json"): large_corpus.render_json(
            corpus["semantic"]["validation_report"]
        ),
    }
    files.update(node_files)
    files.update(assertion_files)
    return files


def published_evaluation_profile() -> str:
    """Materialize fixture-relative profile references for the corpus root.

    The authoring profile lives three directories below the repository root,
    whereas its published copy lives at the faithful corpus root. Keeping the
    authoring-relative traversal in that copy made every candidate and plane
    reference escape the independent publication unit. This deterministic
    presentation transform preserves the authoring source while making the
    published profile self-consistent and linking producer-only tools back to
    their owning repository.
    """

    value = PROFILE_PATH.read_text(encoding="utf-8")
    value = value.replace("../../../evaluation/heritage/", "")
    value = value.replace(
        "../../../scripts/",
        f"{EXPLORER_REPOSITORY}/blob/main/scripts/",
    )
    return value


def emit_presentation_plane(corpus: dict[str, Any], snapshot: dict[str, Any]) -> dict[Path, str | bytes]:
    return dict(markdown_files(corpus, snapshot))


PLANE_EMITTERS = {
    "control": emit_control_plane,
    "data": emit_data_plane,
    "search": emit_search_plane,
    "semantic": emit_semantic_plane,
    "presentation": emit_presentation_plane,
}


def emit_output_planes(
    corpus: dict[str, Any],
    snapshot: dict[str, Any],
    *,
    planes: set[str] | None = None,
    selectors: tuple[str, ...] = (),
) -> dict[Path, str | bytes]:
    selected = planes or set(PLANE_EMITTERS)
    unknown = selected - set(PLANE_EMITTERS)
    if unknown:
        raise ValueError(f"unknown output planes: {', '.join(sorted(unknown))}")
    files: dict[Path, str | bytes] = {}
    for plane in heritage_build_io.PLANES:
        if plane in selected:
            files.update(PLANE_EMITTERS[plane](corpus, snapshot))
    if selectors:
        files = {
            path: content
            for path, content in files.items()
            if heritage_build_io.matches_selectors(path, selectors)
        }
    return files


def output_files(corpus: dict[str, Any], snapshot: dict[str, Any]) -> dict[Path, str | bytes]:
    """Render and integrity-bind every candidate plane."""

    return heritage_build_io.finalize_full_candidate(
        emit_output_planes(corpus, snapshot)
    )


def bind_plane_roots(files: dict[Path, str | bytes]) -> dict[Path, str | bytes]:
    """Compatibility wrapper for the former in-place plane binder."""

    return heritage_build_io.finalize_full_candidate(files)


def existing_generated_at(output: Path, *, snapshot_id: str = "") -> str:
    descriptor = output / "okf-explorer.json"
    if not descriptor.is_file():
        return ""
    try:
        payload = json.loads(descriptor.read_text(encoding="utf-8"))
        if snapshot_id and clean_text(payload.get("snapshot")) != snapshot_id:
            return ""
        return clean_text(payload.get("generated_at"))
    except (OSError, json.JSONDecodeError):
        return ""


def existing_presentation_core(
    output: Path, *, snapshot_id: str
) -> tuple[dict[str, Any], int]:
    """Load immutable descriptor facts for a presentation-only rebuild."""

    descriptor_path = output / "okf-explorer.json"
    try:
        descriptor = json.loads(descriptor_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(
            "presentation-only build requires an existing valid candidate descriptor"
        ) from exc
    if clean_text(descriptor.get("snapshot")) != snapshot_id:
        raise ValueError(
            "presentation-only build candidate snapshot does not match the source snapshot"
        )
    records = descriptor.get("counts", {}).get("records")
    if not isinstance(records, int) or records < 0:
        raise ValueError("candidate descriptor has no valid record count")
    return {"descriptor": descriptor}, records


def fixture_targets(name: str) -> list[tuple[str, Path, Path]]:
    targets = {
        "faithful": (DEFAULT_SNAPSHOT, DEFAULT_OUTPUT),
        "tiny": (TINY_SNAPSHOT, DEFAULT_OUTPUT / "tiny"),
        "synthetic": (SYNTHETIC_SNAPSHOT, DEFAULT_OUTPUT / "synthetic"),
    }
    names = tuple(targets) if name == "all" else (name,)
    return [(fixture, *targets[fixture]) for fixture in names]


def _candidate_observation(
    output: Path,
    snapshot: dict[str, Any],
    *,
    records: int,
) -> dict[str, Any]:
    descriptor = (output / "okf-explorer.json").read_bytes()
    plane_roots = json.loads((output / heritage_build_io.PLANE_ROOTS).read_text(encoding="utf-8"))
    return {
        "schema": "okf-evaluation-candidate-observation.v1",
        "observed_at": now_utc(),
        "candidate": {
            "descriptor_sha256": sha256_bytes(descriptor),
            "release_root_sha256": plane_roots["release_root_sha256"],
            "snapshot": snapshot.get("snapshot_id", ""),
            "records": records,
        },
        "boundary": (
            "This timestamped run observation references the immutable candidate and is "
            "not included in its build manifest or release root."
        ),
    }


def build_target(
    *,
    label: str,
    snapshot_path: Path,
    output: Path,
    generated_at_value: str | None,
    planes: set[str],
    selectors: tuple[str, ...],
    check: bool,
    observation_output: Path | None,
    public_base_override: str | None,
) -> int:
    if not snapshot_path.is_file():
        print(f"missing frozen source snapshot: {snapshot_path}", file=sys.stderr)
        return 1
    try:
        snapshot = read_snapshot(snapshot_path)
        if public_base_override:
            snapshot = retarget_publication(
                snapshot, public_base_override, fixture=label
            )
        # Build identity is a candidate self-fact.  Reuse it when present and
        # otherwise derive it from the frozen snapshot, never from wall-clock
        # run time.  Wall-clock observations go in the external envelope.
        generated_at = (
            generated_at_value
            or existing_generated_at(
                output, snapshot_id=clean_text(snapshot.get("snapshot_id"))
            )
            or clean_text(snapshot.get("observed_at"))
        )
        if not generated_at:
            raise ValueError("snapshot must provide observed_at or --generated-at")
        selective = bool(planes or selectors)
        selected_planes = planes or set(PLANE_EMITTERS)
        if selective and selected_planes == {"presentation"}:
            corpus, record_count = existing_presentation_core(
                output, snapshot_id=clean_text(snapshot.get("snapshot_id"))
            )
        else:
            corpus = build_normalized_core(
                snapshot, generated_at, planes=selected_planes
            )
            record_count = len(corpus["records"])
        emitted = emit_output_planes(
            corpus,
            snapshot,
            planes=selected_planes,
            selectors=selectors,
        )
        if selectors and not emitted:
            raise ValueError("--select-path patterns matched no generated outputs")
        files = (
            heritage_build_io.finalize_selected_candidate(
                output,
                emitted,
                replaced_planes=selected_planes,
                selectors=selectors,
            )
            if selective
            else heritage_build_io.finalize_full_candidate(emitted)
        )
        roots = json.loads(
            heritage_build_io.content_bytes(files[heritage_build_io.PLANE_ROOTS]).decode("utf-8")
        )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"heritage evaluation build failed ({label}): {exc}", file=sys.stderr)
        return 1

    if check:
        errors = heritage_build_io.check_managed_files(output, files)
        if errors:
            print(f"Heritage evaluation check failed ({label}):", file=sys.stderr)
            for error in errors[:80]:
                print(f"- {error}", file=sys.stderr)
            return 1
        print(
            f"Heritage evaluation {label} is synchronized with {record_count:,} "
            f"records; selected_files={len(files)} "
            f"release_root_sha256={roots['release_root_sha256']}"
        )
        return 0

    try:
        if (
            observation_output is not None
            and observation_output.resolve().is_relative_to(output.resolve())
        ):
            raise ValueError("observation output must be outside the candidate directory")
        stats = heritage_build_io.write_managed_files(output, files)
        if observation_output is not None:
            destination = observation_output
            heritage_build_io.atomic_write_if_changed(
                destination,
                large_corpus.render_json(
                    _candidate_observation(
                        output, snapshot, records=record_count
                    )
                ),
            )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"heritage evaluation write failed ({label}): {exc}", file=sys.stderr)
        return 1
    display = output.relative_to(ROOT) if output.is_relative_to(ROOT) else output
    print(
        f"wrote {stats['changed']:,} changed, retained {stats['unchanged']:,} unchanged "
        f"and removed {stats['removed']:,} stale owned files for {record_count:,} "
        f"heritage records to {display}; release_root_sha256={roots['release_root_sha256']}"
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        epilog=(
            "After a publication cutover, persist the accepted public_base and "
            "family_public_base in the frozen source snapshots. This keeps ordinary "
            "--check invocations deterministic without an implicit override."
        ),
    )
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--generated-at")
    parser.add_argument(
        "--public-base",
        help=(
            "Retarget the publication family to an absolute HTTPS base. Named tiny "
            "and synthetic fixtures are placed below tiny/ and synthetic/."
        ),
    )
    parser.add_argument(
        "--fixture",
        choices=("faithful", "tiny", "synthetic", "all"),
        help="Select a named fixture family; overrides --snapshot and --output.",
    )
    parser.add_argument(
        "--plane",
        action="append",
        choices=heritage_build_io.PLANES,
        default=[],
        help="Rebuild/check one output plane; repeat for multiple planes.",
    )
    parser.add_argument(
        "--select-path",
        action="append",
        default=[],
        metavar="GLOB",
        help="Within selected planes, rebuild/check only matching generated paths.",
    )
    parser.add_argument(
        "--observation-output",
        type=Path,
        help="Write a timestamped observation envelope outside the candidate root.",
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    if args.check and args.observation_output:
        parser.error("--observation-output cannot be combined with --check")

    if args.fixture:
        targets = fixture_targets(args.fixture)
    else:
        snapshot_path = args.snapshot if args.snapshot.is_absolute() else ROOT / args.snapshot
        output = args.output if args.output.is_absolute() else ROOT / args.output
        label = (
            "faithful"
            if snapshot_path.resolve() == DEFAULT_SNAPSHOT.resolve()
            and output.resolve() == DEFAULT_OUTPUT.resolve()
            else "custom"
        )
        targets = [(label, snapshot_path, output)]

    observation = args.observation_output
    if observation is not None and not observation.is_absolute():
        observation = ROOT / observation
    status = 0
    for label, snapshot_path, output in targets:
        target_observation = observation
        if target_observation is not None and len(targets) > 1:
            target_observation = target_observation / f"{label}.json"
        status = max(
            status,
            build_target(
                label=label,
                snapshot_path=snapshot_path,
                output=output,
                generated_at_value=args.generated_at,
                planes=set(args.plane),
                selectors=tuple(args.select_path),
                check=args.check,
                observation_output=target_observation,
                public_base_override=args.public_base,
            ),
        )
    return status


if __name__ == "__main__":
    raise SystemExit(main())
