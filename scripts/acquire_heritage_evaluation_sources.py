#!/usr/bin/env python3
"""Acquire the frozen Coventry and Warwickshire heritage source snapshot.

This command is intentionally separate from the deterministic corpus builder.
It is the only heritage-evaluation step which contacts mutable upstream sources.
Every accepted response is hashed, every spatial query is bound to one of the
six pinned ONS boundaries, and HTML challenge pages are rejected rather than
mistaken for workbooks.

The annual Historic England workbook URLs do not expose reliable filename
extensions.  The parser therefore identifies XLSX, ODS and legacy XLS from
their bytes.  XLS conversion uses a local LibreOffice/soffice executable; it
does not send the workbook to another service.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import mimetypes
import posixpath
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "source-snapshot.json.gz"
)

ONS_ITEM_ID = "92150c7aa60540c5814abe3b26bce6d0"
ONS_ITEM_URL = f"https://www.arcgis.com/home/item.html?id={ONS_ITEM_ID}"
ONS_SERVICE = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
    "Local_Authority_Districts_DEC_2025_Boundaries_UK_BFC/FeatureServer/0"
)
NHLE_ITEM_ID = "767f279327a24845bf47dfe5eae9862b"
NHLE_ITEM_URL = f"https://www.arcgis.com/home/item.html?id={NHLE_ITEM_ID}"
NHLE_SERVICE = (
    "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/"
    "National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer"
)
HAR_ANNUAL_PAGE = (
    "https://historicengland.org.uk/listing/heritage-at-risk/search-register/"
    "annual-heritage-at-risk-registers-and-maps/"
)
HAR_WORKBOOK_URL = (
    "https://historicengland.org.uk/content/docs/har/"
    "har-{year}-entries-additions-removals/"
)
OPEN_DATA_TERMS = (
    "https://historicengland.org.uk/terms/website-terms-conditions/open-data-hub/"
)
OGL = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"

BOUNDARIES: tuple[dict[str, Any], ...] = (
    {
        "code": "E08000026",
        "name": "Coventry",
        "aliases": (
            "Coventry",
            "City of Coventry",
            "Coventry City Council",
            "City of Coventry Council",
            "Coventry UA",
        ),
    },
    {
        "code": "E07000218",
        "name": "North Warwickshire",
        "aliases": (
            "North Warwickshire",
            "North Warwickshire Borough Council",
            "North Warks",
        ),
    },
    {
        "code": "E07000219",
        "name": "Nuneaton and Bedworth",
        "aliases": (
            "Nuneaton and Bedworth",
            "Nuneaton & Bedworth",
            "Nuneaton and Bedworth Borough Council",
            "Nuneaton & Bedworth Borough Council",
        ),
    },
    {
        "code": "E07000220",
        "name": "Rugby",
        "aliases": ("Rugby", "Rugby Borough Council"),
    },
    {
        "code": "E07000221",
        "name": "Stratford-on-Avon",
        "aliases": (
            "Stratford-on-Avon",
            "Stratford upon Avon",
            "Stratford-on-Avon District Council",
            "Stratford upon Avon District Council",
            "Stratford-on-Avon DC",
        ),
    },
    {
        "code": "E07000222",
        "name": "Warwick",
        "aliases": ("Warwick", "Warwick District", "Warwick District Council", "Warwick DC"),
    },
)
BOUNDARY_BY_CODE = {item["code"]: item for item in BOUNDARIES}
EXPECTED_BOUNDARY_NAMES = {item["code"]: item["name"] for item in BOUNDARIES}

NHLE_LAYERS: tuple[tuple[int, str], ...] = (
    (0, "Listed Buildings"),
    (1, "Building Preservation Notices"),
    (2, "Certificates of Immunity"),
    (6, "Scheduled Monuments"),
    (7, "Registered Parks and Gardens"),
    (8, "Registered Battlefields"),
    (9, "Protected Wreck Sites"),
    (10, "World Heritage Sites"),
)
# Layers 0/1/2 are the canonical point/multipoint records used by the builder.
# Their paired polygon layers are alternate spatial representations of the
# same ListEntry identities.  An entry is in scope if either official
# representation intersects; this matters for seven listed buildings which
# straddle the evaluation boundary while their representative point is just
# outside it.  Polygon features are never emitted as extra records.
NHLE_SPATIAL_EVIDENCE_LAYERS: dict[int, tuple[int, ...]] = {
    0: (0, 3),
    1: (1, 4),
    2: (2, 5),
    6: (6,),
    7: (7,),
    8: (8,),
    9: (9,),
    10: (10,),
}
EXPECTED_NHLE_COUNT = 6_556

HAR_MAP_SERVICES: dict[int, str] = {
    2021: (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/"
        "HAR_2021_OTHR/FeatureServer/0"
    ),
    2022: (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/"
        "Historic_England_Heritage_at_Risk_Register_2022/FeatureServer/0"
    ),
    2023: (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/"
        "Historic_England_Heritage_at_Risk_Register_2023/FeatureServer/0"
    ),
    2024: (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/"
        "Historic_England_Heritage_at_Risk_Register_2024/FeatureServer/0"
    ),
    2025: (
        "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/"
        "HAR_2025_OTHR_WGS84/FeatureServer/0"
    ),
}

ROLE_EVENT = {
    "entries": "entry",
    "additions": "addition",
    "positive_removals": "positive removal",
}

XML_NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}


class AcquisitionError(RuntimeError):
    """Raised when a source cannot be acquired without weakening a gate."""


@dataclass(frozen=True)
class Download:
    url: str
    final_url: str
    status: int
    headers: dict[str, str]
    body: bytes
    request_id: str


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    ).encode("utf-8")


def deterministic_gzip(value: bytes, *, compresslevel: int = 9) -> bytes:
    output = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=output, compresslevel=compresslevel, mtime=0) as stream:
        stream.write(value)
    return output.getvalue()


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return re.sub(r"\s+", " ", str(value)).strip()


def normalized_text(value: Any) -> str:
    folded = unicodedata.normalize("NFKD", clean_text(value)).encode("ascii", "ignore").decode("ascii")
    folded = folded.casefold().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", folded).strip()


def normalized_header(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", normalized_text(value)).strip("_")


def content_type(headers: dict[str, str]) -> str:
    return headers.get("content-type", "").split(";", 1)[0].strip().lower()


def provenance_payload(body: bytes, headers: dict[str, str]) -> tuple[bytes, str]:
    media_type = content_type(headers)
    prefix = body.lstrip()[:1]
    if "json" in media_type or prefix in {b"{", b"["}:
        try:
            value = json.loads(body)
            if isinstance(value, dict) and isinstance(value.get("features"), list):
                features = list(value["features"])

                def feature_key(feature: Any) -> tuple[str, str]:
                    if not isinstance(feature, dict):
                        return ("", clean_text(feature))
                    attributes = (
                        feature.get("attributes")
                        if isinstance(feature.get("attributes"), dict)
                        else feature.get("properties", {})
                    )
                    identifier = next(
                        (
                            clean_text(attributes.get(key))
                            for key in ("OBJECTID", "FID", "ListEntry", "List_Entry")
                            if attributes.get(key) is not None
                        ),
                        "",
                    )
                    return identifier, sha256_bytes(json_bytes(feature))

                accepted = {
                    "features": sorted(features, key=feature_key),
                    "spatialReference": value.get("spatialReference"),
                }
                return json_bytes(accepted), "accepted-arcgis-feature-json"
            if isinstance(value, dict) and isinstance(value.get("objectIds"), list):
                accepted = {
                    "objectIdFieldName": value.get("objectIdFieldName"),
                    "objectIds": sorted(value["objectIds"], key=lambda item: clean_text(item)),
                }
                return json_bytes(accepted), "accepted-arcgis-object-ids-json"
            return json_bytes(value), "canonical-json"
        except (UnicodeDecodeError, json.JSONDecodeError):
            pass
    return body, "raw-bytes"


def response_sha256(body: bytes, headers: dict[str, str]) -> str:
    payload, _ = provenance_payload(body, headers)
    return sha256_bytes(payload)


def selected_headers(headers: Any) -> dict[str, str]:
    allowed = {
        "content-type",
        "content-length",
        "content-disposition",
        "etag",
        "last-modified",
        "cache-control",
    }
    return {
        str(key).lower(): clean_text(value)
        for key, value in headers.items()
        if str(key).lower() in allowed
    }


class HttpClient:
    def __init__(self, *, timeout: float = 60.0, user_agent: str | None = None) -> None:
        self.timeout = timeout
        self.user_agent = user_agent or (
            "okf-explorer-heritage-evaluation-acquirer/1.0 "
            "(+https://github.com/chris-page-gov/okf-explorer)"
        )
        self.receipts: list[dict[str, Any]] = []

    def request(
        self,
        url: str,
        *,
        method: str = "GET",
        parameters: dict[str, Any] | None = None,
        provenance_parameters: dict[str, Any] | None = None,
    ) -> Download:
        parameters = parameters or {}
        encoded = urllib.parse.urlencode(parameters).encode("utf-8")
        request_url = url
        body: bytes | None = None
        if method.upper() == "GET" and encoded:
            request_url = f"{url}{'&' if '?' in url else '?'}{encoded.decode('ascii')}"
        elif method.upper() == "POST":
            body = encoded
        request_id = f"request-{len(self.receipts) + 1:04d}"
        request = urllib.request.Request(
            request_url,
            data=body,
            method=method.upper(),
            headers={
                "Accept": "application/json, application/geo+json, application/octet-stream, */*",
                "User-Agent": self.user_agent,
                **({"Content-Type": "application/x-www-form-urlencoded"} if body is not None else {}),
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                response_body = response.read()
                status = int(response.status)
                final_url = response.geturl()
                headers = selected_headers(response.headers)
        except urllib.error.HTTPError as exc:
            response_body = exc.read()
            headers = selected_headers(exc.headers)
            receipt = self._receipt(
                request_id,
                method,
                url,
                provenance_parameters or parameters,
                encoded if body is not None else None,
                int(exc.code),
                exc.geturl(),
                headers,
                response_body,
            )
            self.receipts.append(receipt)
            challenge = headers.get("content-type", "").startswith("text/html")
            hint = " (HTML challenge page)" if challenge else ""
            raise AcquisitionError(f"{url} returned HTTP {exc.code}{hint}") from exc
        except urllib.error.URLError as exc:
            raise AcquisitionError(f"could not retrieve {url}: {exc.reason}") from exc

        receipt = self._receipt(
            request_id,
            method,
            url,
            provenance_parameters or parameters,
            encoded if body is not None else None,
            status,
            final_url,
            headers,
            response_body,
        )
        self.receipts.append(receipt)
        return Download(url, final_url, status, headers, response_body, request_id)

    @staticmethod
    def _receipt(
        request_id: str,
        method: str,
        url: str,
        parameters: dict[str, Any],
        request_body: bytes | None,
        status: int,
        final_url: str,
        headers: dict[str, str],
        body: bytes,
    ) -> dict[str, Any]:
        digest_payload, digest_basis = provenance_payload(body, headers)
        return {
            "id": request_id,
            "method": method.upper(),
            "url": url,
            "parameters": parameters,
            "request_body_sha256": sha256_bytes(request_body) if request_body is not None else "",
            "status": status,
            "final_url": final_url,
            "response_headers": headers,
            "response_media_type": content_type(headers),
            "response_bytes": len(digest_payload),
            "response_sha256": sha256_bytes(digest_payload),
            "response_digest_basis": digest_basis,
        }

    def json(
        self,
        url: str,
        *,
        method: str = "GET",
        parameters: dict[str, Any] | None = None,
        provenance_parameters: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], Download]:
        download = self.request(
            url,
            method=method,
            parameters=parameters,
            provenance_parameters=provenance_parameters,
        )
        try:
            value = json.loads(download.body)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise AcquisitionError(f"{url} did not return JSON") from exc
        if not isinstance(value, dict):
            raise AcquisitionError(f"{url} returned a non-object JSON response")
        if isinstance(value.get("error"), dict):
            error = value["error"]
            raise AcquisitionError(
                f"ArcGIS error from {url}: {error.get('code')} {error.get('message')}"
            )
        return value, download


def sniff_workbook(body: bytes, declared_type: str = "") -> str:
    if body.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "xls"
    if body.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(body)) as archive:
                names = set(archive.namelist())
                if "xl/workbook.xml" in names:
                    return "xlsx"
                if "content.xml" in names:
                    if "mimetype" not in names:
                        return "ods"
                    mime = archive.read("mimetype").decode("ascii", "replace").strip()
                    if mime == "application/vnd.oasis.opendocument.spreadsheet":
                        return "ods"
        except zipfile.BadZipFile as exc:
            raise AcquisitionError("workbook has a ZIP signature but is not a valid ZIP file") from exc
    prefix = body[:1024].lstrip().lower()
    if prefix.startswith((b"<!doctype html", b"<html", b"<head")) or b"<html" in prefix:
        raise AcquisitionError("workbook endpoint returned HTML, probably a challenge or error page")
    if "spreadsheetml" in declared_type or "openxml" in declared_type:
        raise AcquisitionError("declared XLSX response has no valid XLSX container")
    if "opendocument.spreadsheet" in declared_type:
        raise AcquisitionError("declared ODS response has no valid ODS container")
    raise AcquisitionError("unrecognized workbook container")


def excel_column_index(reference: str) -> int:
    match = re.match(r"([A-Za-z]+)", reference)
    if not match:
        return 0
    result = 0
    for char in match.group(1).upper():
        result = result * 26 + (ord(char) - ord("A") + 1)
    return result - 1


def xlsx_date_styles(archive: zipfile.ZipFile) -> set[int]:
    if "xl/styles.xml" not in archive.namelist():
        return set()
    root = ET.fromstring(archive.read("xl/styles.xml"))
    custom: dict[int, str] = {}
    for item in root.findall("main:numFmts/main:numFmt", XML_NS):
        try:
            custom[int(item.attrib.get("numFmtId", "-1"))] = item.attrib.get("formatCode", "")
        except ValueError:
            continue
    styles: set[int] = set()
    built_in = set(range(14, 23)) | set(range(27, 37)) | set(range(45, 48)) | set(range(50, 59))
    for index, cell_format in enumerate(root.findall("main:cellXfs/main:xf", XML_NS)):
        try:
            num_format = int(cell_format.attrib.get("numFmtId", "0"))
        except ValueError:
            continue
        code = custom.get(num_format, "")
        stripped = re.sub(r'"[^"]*"|\[[^]]*\]|\\.', "", code).casefold()
        if num_format in built_in or (
            any(token in stripped for token in ("yy", "dd", "hh", "ss"))
            and not re.fullmatch(r"[0#?,. %]+", stripped)
        ):
            styles.add(index)
    return styles


def excel_serial(value: str) -> str:
    try:
        serial = float(value)
    except ValueError:
        return value
    converted = datetime(1899, 12, 30) + timedelta(days=serial)
    if converted.time() == datetime.min.time():
        return converted.date().isoformat()
    return converted.isoformat(timespec="seconds")


def parse_xlsx(body: bytes) -> list[dict[str, Any]]:
    with zipfile.ZipFile(io.BytesIO(body)) as archive:
        names = set(archive.namelist())
        if "xl/workbook.xml" not in names:
            raise AcquisitionError("XLSX workbook.xml is missing")
        shared: list[str] = []
        if "xl/sharedStrings.xml" in names:
            strings_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in strings_root.findall("main:si", XML_NS):
                shared.append("".join(item.itertext()))
        date_styles = xlsx_date_styles(archive)
        rels_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relationships = {
            item.attrib["Id"]: item.attrib["Target"]
            for item in rels_root.findall("pkgrel:Relationship", XML_NS)
            if item.attrib.get("Id") and item.attrib.get("Target")
        }
        workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
        result: list[dict[str, Any]] = []
        for sheet in workbook_root.findall("main:sheets/main:sheet", XML_NS):
            name = sheet.attrib.get("name", "Sheet")
            rel_id = sheet.attrib.get(f"{{{XML_NS['rel']}}}id", "")
            target = relationships.get(rel_id, "")
            if target.startswith("/"):
                path = target.lstrip("/")
            else:
                path = posixpath.normpath(posixpath.join("xl", target))
            if path not in names:
                raise AcquisitionError(f"XLSX sheet target {path!r} is missing")
            sheet_root = ET.fromstring(archive.read(path))
            rows: list[list[str]] = []
            for row_element in sheet_root.findall(".//main:sheetData/main:row", XML_NS):
                row: list[str] = []
                for cell in row_element.findall("main:c", XML_NS):
                    column = excel_column_index(cell.attrib.get("r", ""))
                    while len(row) <= column:
                        row.append("")
                    value_element = cell.find("main:v", XML_NS)
                    inline = cell.find("main:is", XML_NS)
                    cell_type = cell.attrib.get("t", "")
                    raw = value_element.text if value_element is not None and value_element.text is not None else ""
                    if cell_type == "s" and raw:
                        try:
                            value = shared[int(raw)]
                        except (ValueError, IndexError):
                            value = raw
                    elif cell_type == "inlineStr" and inline is not None:
                        value = "".join(inline.itertext())
                    elif cell_type == "b":
                        value = "true" if raw == "1" else "false"
                    elif cell_type == "d":
                        value = raw
                    elif raw and int(cell.attrib.get("s", "0") or 0) in date_styles:
                        value = excel_serial(raw)
                    else:
                        value = raw
                    row[column] = clean_text(value)
                while row and not row[-1]:
                    row.pop()
                rows.append(row)
            result.append({"name": name, "rows": rows})
        return result


def ods_cell_value(cell: ET.Element) -> str:
    value_type = cell.attrib.get(f"{{{XML_NS['office']}}}value-type", "")
    if value_type == "date":
        return clean_text(cell.attrib.get(f"{{{XML_NS['office']}}}date-value", ""))
    if value_type in {"float", "currency", "percentage"}:
        return clean_text(cell.attrib.get(f"{{{XML_NS['office']}}}value", ""))
    if value_type == "boolean":
        return clean_text(cell.attrib.get(f"{{{XML_NS['office']}}}boolean-value", ""))
    paragraphs = ["".join(paragraph.itertext()) for paragraph in cell.findall(".//text:p", XML_NS)]
    return clean_text("\n".join(paragraphs))


def parse_ods(body: bytes) -> list[dict[str, Any]]:
    with zipfile.ZipFile(io.BytesIO(body)) as archive:
        try:
            content = archive.read("content.xml")
        except KeyError as exc:
            raise AcquisitionError("ODS content.xml is missing") from exc
    root = ET.fromstring(content)
    result: list[dict[str, Any]] = []
    for table in root.findall(".//table:table", XML_NS):
        name = table.attrib.get(f"{{{XML_NS['table']}}}name", "Sheet")
        rows: list[list[str]] = []
        for row_element in table.findall("table:table-row", XML_NS):
            row: list[str] = []
            for cell in list(row_element):
                if cell.tag not in {
                    f"{{{XML_NS['table']}}}table-cell",
                    f"{{{XML_NS['table']}}}covered-table-cell",
                }:
                    continue
                repeat = int(cell.attrib.get(f"{{{XML_NS['table']}}}number-columns-repeated", "1"))
                value = ods_cell_value(cell)
                # Large empty repeats are a compact representation of unused columns.
                if value:
                    row.extend([value] * min(repeat, 10_000))
                else:
                    row.extend([""] * min(repeat, 512 - min(len(row), 512)))
            while row and not row[-1]:
                row.pop()
            row_repeat = int(row_element.attrib.get(f"{{{XML_NS['table']}}}number-rows-repeated", "1"))
            if row:
                rows.extend([list(row) for _ in range(min(row_repeat, 10_000))])
            elif row_repeat == 1:
                rows.append([])
        result.append({"name": name, "rows": rows})
    return result


def convert_xls_to_xlsx(body: bytes, *, converter: str | None = None) -> bytes:
    executable = converter or shutil.which("soffice") or shutil.which("libreoffice")
    if not executable:
        raise AcquisitionError(
            "legacy XLS workbook requires LibreOffice/soffice for deterministic local conversion"
        )
    with tempfile.TemporaryDirectory(prefix="okf-har-xls-") as directory:
        workdir = Path(directory)
        source = workdir / "source.xls"
        source.write_bytes(body)
        completed = subprocess.run(
            [
                executable,
                "--headless",
                "--convert-to",
                "xlsx",
                "--outdir",
                str(workdir),
                str(source),
            ],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=120,
        )
        converted = workdir / "source.xlsx"
        if completed.returncode != 0 or not converted.exists():
            message = clean_text(completed.stderr or completed.stdout)
            raise AcquisitionError(f"LibreOffice could not convert legacy XLS: {message}")
        return converted.read_bytes()


def parse_workbook(
    body: bytes,
    declared_type: str = "",
    *,
    converter: str | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    workbook_format = sniff_workbook(body, declared_type)
    if workbook_format == "xlsx":
        return workbook_format, parse_xlsx(body)
    if workbook_format == "ods":
        return workbook_format, parse_ods(body)
    converted = convert_xls_to_xlsx(body, converter=converter)
    return workbook_format, parse_xlsx(converted)


def header_concepts(row: Sequence[Any]) -> set[str]:
    joined = [normalized_text(value) for value in row if clean_text(value)]
    concepts: set[str] = set()
    for value in joined:
        if re.search(r"\b(name|site|asset|entry name|designated site)\b", value):
            concepts.add("name")
        if re.search(r"\b(list entry|uid|unique id|reference|ref no|har id)\b", value):
            concepts.add("identifier")
        if re.search(
            r"\b(local planning|lpa|local authority|unitary|district|borough|county|"
            r"location|parish|town|city)\b",
            value,
        ):
            concepts.add("location")
        if re.search(r"\b(condition|trend|vulnerability|priority|risk|assessment)\b", value):
            concepts.add("risk")
        if re.search(r"\b(designation|heritage category|grade|site type)\b", value):
            concepts.add("designation")
        if re.search(r"\b(url|link|web|hyperlink)\b", value):
            concepts.add("url")
    return concepts


def discover_header(rows: Sequence[Sequence[Any]], *, scan_rows: int = 80) -> int | None:
    candidates: list[tuple[int, int, int]] = []
    for index, row in enumerate(rows[:scan_rows]):
        nonempty = sum(bool(clean_text(value)) for value in row)
        concepts = header_concepts(row)
        if nonempty >= 3 and len(concepts) >= 3 and ({"name", "identifier"} & concepts) and "location" in concepts:
            candidates.append((len(concepts), nonempty, -index))
    if not candidates:
        return None
    best = max(candidates)
    return -best[2]


def classify_sheet(name: str, rows: Sequence[Sequence[Any]]) -> str:
    normalized = normalized_text(name)
    if re.search(r"\b(removal|removals|removed)\b", normalized):
        return "positive_removals"
    if re.search(r"\b(addition|additions|added|new entries)\b", normalized):
        return "additions"
    if re.search(
        r"\b(introduction|intro|information|read me|please read|how to use|notes|method)\b",
        normalized,
    ):
        return "introduction"
    if re.search(r"\b(entries|entry|register|sites at risk|heritage at risk)\b", normalized):
        return "entries"

    header_index = discover_header(rows)
    if header_index is None:
        return "unknown"
    nearby = normalized_text(" ".join(clean_text(value) for row in rows[: header_index + 1] for value in row))
    if re.search(r"\b(removal|removals|removed)\b", nearby):
        return "positive_removals"
    if re.search(r"\b(addition|additions|added|new entries)\b", nearby):
        return "additions"
    return "entries"


def unique_headers(row: Sequence[Any]) -> list[str]:
    result: list[str] = []
    counts: Counter[str] = Counter()
    for index, value in enumerate(row, start=1):
        base = clean_text(value) or f"Column {index}"
        counts[base.casefold()] += 1
        suffix = counts[base.casefold()]
        result.append(base if suffix == 1 else f"{base} [{suffix}]")
    return result


def data_rows(sheet: dict[str, Any]) -> tuple[int, list[str], list[tuple[int, dict[str, str]]]]:
    rows = sheet.get("rows") if isinstance(sheet.get("rows"), list) else []
    header_index = discover_header(rows)
    if header_index is None:
        if any(any(clean_text(value) for value in row) for row in rows):
            raise AcquisitionError(f"could not discover a semantic header in sheet {sheet.get('name')!r}")
        return 0, [], []
    headers = unique_headers(rows[header_index])
    result: list[tuple[int, dict[str, str]]] = []
    for row_index, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
        values = [clean_text(value) for value in row]
        if not any(values):
            continue
        if len(values) > len(headers):
            headers.extend(f"Column {index}" for index in range(len(headers) + 1, len(values) + 1))
        values.extend([""] * (len(headers) - len(values)))
        result.append((row_index, dict(zip(headers, values, strict=True))))
    return header_index + 1, headers, result


LAD_AUTHORITY_HEADER_TERMS = (
    "local_planning",
    "lpa",
    "local_authority",
    "unitary",
    "district",
    "borough",
    "council",
)


def phrase_present(value: str, phrase: str) -> bool:
    return f" {normalized_text(phrase)} " in f" {normalized_text(value)} "


def scope_memberships(row: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    authority_fields = [
        (key, clean_text(value))
        for key, value in row.items()
        if any(term in normalized_header(key) for term in LAD_AUTHORITY_HEADER_TERMS)
        and clean_text(value)
    ]
    matched: dict[str, dict[str, str]] = {}
    evidence: list[dict[str, str]] = []
    for key, value in authority_fields:
        for boundary in BOUNDARIES:
            if boundary["code"] in value or any(phrase_present(value, alias) for alias in boundary["aliases"]):
                matched[boundary["code"]] = {
                    "code": boundary["code"],
                    "name": boundary["name"],
                    "basis": "source-local-authority-field",
                }
                evidence.append({"field": key, "value": value, "matched_code": boundary["code"]})
    # Some annual schemas expose only a county.  Keep those rows without
    # inventing a district assignment; E10000031 is explicitly source-derived.
    if not matched:
        for key, value in row.items():
            value = clean_text(value)
            if (
                "county" in normalized_header(key)
                and value
                and phrase_present(value, "Warwickshire")
            ):
                matched["E10000031"] = {
                    "code": "E10000031",
                    "name": "Warwickshire",
                    "basis": "source-county-field-no-lad-assertion",
                }
                evidence.append({"field": key, "value": value, "matched_code": "E10000031"})
    memberships = [matched[code] for code in sorted(matched)]
    evidence.sort(key=lambda item: (item["matched_code"], item["field"], item["value"]))
    return memberships, evidence


def flexible_source_value(
    row: dict[str, Any],
    *candidate_names: str,
    prefixes: Sequence[str] = (),
) -> str:
    normalized = {normalized_header(key): clean_text(value) for key, value in row.items()}
    for candidate in candidate_names:
        value = normalized.get(normalized_header(candidate), "")
        if value:
            return value
    normalized_prefixes = tuple(normalized_header(prefix) for prefix in prefixes)
    for key in sorted(normalized):
        if normalized[key] and any(key.startswith(prefix) for prefix in normalized_prefixes):
            return normalized[key]
    return ""


def canonical_har_fields(row: dict[str, Any]) -> dict[str, str]:
    """Expose stable semantic aliases while retaining every physical column."""
    candidates = {
        "uid": flexible_source_value(row, "uid", "legacy uid", "har uid"),
        "List Entry": flexible_source_value(
            row,
            "list entry",
            "list entry number",
            prefixes=("list entry number (len)", "list entry number"),
        ),
        "Name": flexible_source_value(
            row,
            "name",
            "published site name",
            "entry name",
            "site name",
            "designated site name",
        ),
        "Assessment Type": flexible_source_value(
            row, "assessment type", "risk methodology", "risk method", "methodology"
        ),
        "Designation": flexible_source_value(
            row, "designation", "heritage category", "designation type"
        ),
        "Site Type": flexible_source_value(row, "site type", "broad term", "site type broad"),
        "Site Subtype": flexible_source_value(
            row, "site subtype", "narrow term", "site type narrow"
        ),
    }
    return {key: value for key, value in candidates.items() if value}


CONTACT_FIELD_PATTERN = re.compile(
    r"(^|_)(published_)?(contact|contact_details|named_contact|email|e_mail|telephone|phone|mobile)($|_)"
)


def sanitize_source_row(row: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    sanitized: dict[str, Any] = {}
    excluded: list[str] = []
    for key, value in row.items():
        if CONTACT_FIELD_PATTERN.search(normalized_header(key)):
            sanitized[key] = ""
            if clean_text(value):
                excluded.append(key)
        else:
            sanitized[key] = value
    return sanitized, sorted(excluded, key=lambda value: (value.casefold(), value))


def har_identity(year: int, role: str, row: dict[str, Any]) -> tuple[str, str]:
    canonical = canonical_har_fields(row)
    uid = clean_text(canonical.get("uid"))
    if uid:
        seed = {"year": year, "role": role, "uid": normalized_text(uid)}
        basis = "source-uid"
    else:
        lpa = flexible_source_value(
            row,
            "local planning authority",
            "district/borough",
            "district/ borough",
            "unitary authority",
        )
        seed = {
            "year": year,
            "role": role,
            "list_entry_or_ca": canonical.get("List Entry", ""),
            "name": normalized_text(canonical.get("Name", "")),
            "assessment_type": normalized_text(canonical.get("Assessment Type", "")),
            "designation": normalized_text(canonical.get("Designation", "")),
            "local_planning_authority": normalized_text(lpa),
        }
        basis = "source-composite"
    return sha256_bytes(json_bytes(seed))[:20], basis


def workbook_sections(
    year: int,
    body: bytes,
    *,
    source_url: str,
    declared_type: str = "",
    converter: str | None = None,
    require_roles: bool = True,
) -> tuple[str, list[dict[str, Any]], dict[str, Any]]:
    workbook_format, sheets = parse_workbook(body, declared_type, converter=converter)
    classified = [(sheet, classify_sheet(clean_text(sheet.get("name")), sheet.get("rows", []))) for sheet in sheets]
    present = {role for _, role in classified}
    required = set(ROLE_EVENT)
    missing = sorted(required - present)
    if missing and require_roles:
        raise AcquisitionError(f"HAR {year} workbook is missing semantic sheets: {', '.join(missing)}")

    sections: list[dict[str, Any]] = []
    workbook_schema: dict[str, Any] = {
        "format": workbook_format,
        "sheets": [],
        "missing_semantic_roles": missing,
    }
    for sheet, role in classified:
        name = clean_text(sheet.get("name"))
        schema_row: dict[str, Any] = {
            "name": name,
            "semantic_role": role,
            "physical_rows": len(sheet.get("rows", [])),
        }
        if role not in ROLE_EVENT:
            workbook_schema["sheets"].append(schema_row)
            continue
        header_row, headers, rows = data_rows(sheet)
        selected: list[dict[str, Any]] = []
        identity_occurrences: Counter[str] = Counter()
        identity_collisions: list[dict[str, Any]] = []
        for source_row_number, raw in rows:
            sanitized, excluded_fields = sanitize_source_row(raw)
            memberships, scope_evidence = scope_memberships(sanitized)
            if not memberships:
                continue
            base_id, identity_basis = har_identity(year, role, sanitized)
            identity_occurrences[base_id] += 1
            occurrence = identity_occurrences[base_id]
            record_id = base_id if occurrence == 1 else f"{base_id}-{occurrence}"
            if occurrence > 1:
                identity_collisions.append(
                    {
                        "base_record_id": base_id,
                        "occurrence": occurrence,
                        "source_sheet": name,
                        "source_row": source_row_number,
                    }
                )
            canonical = canonical_har_fields(sanitized)
            selected.append(
                {
                    **sanitized,
                    **canonical,
                    "record_id": record_id,
                    "identity_basis": identity_basis,
                    "event_type": ROLE_EVENT[role],
                    "source_sheet": name,
                    "source_row": source_row_number,
                    "scope_geographies": memberships,
                    "scope_match_evidence": scope_evidence,
                    "normalized_fields": canonical,
                    "source_excluded_fields": excluded_fields,
                    "source_values": sanitized,
                }
            )
        selected.sort(key=lambda row: (clean_text(row["record_id"]), int(row["source_row"])))
        schema_row.update(
            {
                "header_row": header_row,
                "headers": headers,
                "source_data_rows": len(rows),
                "scope_rows": len(selected),
                "identity_collisions": identity_collisions,
            }
        )
        workbook_schema["sheets"].append(schema_row)
        sections.append(
            {
                "year": year,
                "event_type": ROLE_EVENT[role],
                "semantic_role": role,
                "source_url": source_url,
                "sha256": sha256_bytes(body),
                "workbook_format": workbook_format,
                "source_sheet": name,
                "header_row": header_row,
                "source_headers": headers,
                "source_data_rows": len(rows),
                "identity_collisions": identity_collisions,
                "rows": selected,
            }
        )
    sections.sort(key=lambda item: (item["year"], list(ROLE_EVENT).index(item["semantic_role"]), item["source_sheet"]))
    return workbook_format, sections, workbook_schema


def arcgis_geometry(boundary: dict[str, Any]) -> dict[str, Any]:
    geometry = boundary.get("geometry")
    if not isinstance(geometry, dict) or not isinstance(geometry.get("rings"), list):
        raise AcquisitionError(f"boundary {boundary.get('code')} has no ArcGIS polygon geometry")
    result = dict(geometry)
    result["spatialReference"] = {"wkid": 27700}
    return result


def geometry_query_parameters(boundary: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    serialized = json.dumps(arcgis_geometry(boundary), sort_keys=True, separators=(",", ":"))
    parameters = {
        "where": "1=1",
        "geometry": serialized,
        "geometryType": "esriGeometryPolygon",
        "inSR": "27700",
        "spatialRel": "esriSpatialRelIntersects",
        "returnIdsOnly": "true",
        "f": "json",
    }
    provenance = {
        **{key: value for key, value in parameters.items() if key != "geometry"},
        "boundary_code": boundary["code"],
        "geometry_sha256": sha256_bytes(serialized.encode("utf-8")),
    }
    return parameters, provenance


def acquire_boundaries(client: HttpClient) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    codes = [item["code"] for item in BOUNDARIES]
    where = "LAD25CD IN (" + ",".join(f"'{code}'" for code in codes) + ")"
    response, download = client.json(
        f"{ONS_SERVICE}/query",
        method="POST",
        parameters={
            "where": where,
            "outFields": "*",
            "returnGeometry": "true",
            "outSR": "27700",
            "orderByFields": "LAD25CD",
            "f": "json",
        },
    )
    features = response.get("features")
    if not isinstance(features, list):
        raise AcquisitionError("ONS boundary response has no features array")
    by_code: dict[str, dict[str, Any]] = {}
    for feature in features:
        attributes = feature.get("attributes") if isinstance(feature.get("attributes"), dict) else {}
        code = clean_text(attributes.get("LAD25CD"))
        name = clean_text(attributes.get("LAD25NM"))
        if code in by_code:
            raise AcquisitionError(f"ONS boundary response duplicated {code}")
        if code in EXPECTED_BOUNDARY_NAMES and name != EXPECTED_BOUNDARY_NAMES[code]:
            raise AcquisitionError(f"ONS boundary {code} is {name!r}, expected {EXPECTED_BOUNDARY_NAMES[code]!r}")
        if code in EXPECTED_BOUNDARY_NAMES:
            declared = BOUNDARY_BY_CODE[code]
            geometry = feature.get("geometry")
            if not isinstance(geometry, dict) or not geometry.get("rings"):
                raise AcquisitionError(f"ONS boundary {code} has no polygon rings")
            by_code[code] = {
                "code": code,
                "name": name,
                "aliases": list(declared["aliases"]),
                "geometry": geometry,
                "source_attributes": attributes,
                "source_object_id": attributes.get("FID"),
            }
    missing = sorted(set(codes) - set(by_code))
    extra = sorted(set(by_code) - set(codes))
    if missing or extra or len(by_code) != 6:
        raise AcquisitionError(f"ONS boundary identity gate failed; missing={missing}, extra={extra}")
    ordered = [by_code[code] for code in codes]
    source = {
        "id": "ons-lad-dec-2025-bfc",
        "kind": "scope-boundary",
        "title": "Local Authority Districts (December 2025) Boundaries UK BFC",
        "item_id": ONS_ITEM_ID,
        "item_url": ONS_ITEM_URL,
        "service_url": ONS_SERVICE,
        "request_id": download.request_id,
        "sha256": response_sha256(download.body, download.headers),
        "bytes": len(provenance_payload(download.body, download.headers)[0]),
        "digest_basis": provenance_payload(download.body, download.headers)[1],
        "media_type": content_type(download.headers) or "application/json",
        "license": OGL,
        "attribution": (
            "Source: Office for National Statistics licensed under the Open Government Licence v.3.0. "
            "Contains OS data © Crown copyright and database right 2026."
        ),
    }
    return ordered, source


def layer_edit_state(layers_response: dict[str, Any], layer_ids: Iterable[int]) -> dict[int, Any]:
    wanted = set(layer_ids)
    result: dict[int, Any] = {}
    for layer in layers_response.get("layers", []):
        try:
            layer_id = int(layer.get("id"))
        except (TypeError, ValueError):
            continue
        if layer_id in wanted:
            editing = layer.get("editingInfo") if isinstance(layer.get("editingInfo"), dict) else {}
            result[layer_id] = editing.get("lastEditDate")
    return result


def query_spatial_object_ids(
    client: HttpClient,
    layer_url: str,
    boundaries: Sequence[dict[str, Any]],
) -> tuple[dict[int, set[str]], str]:
    memberships: dict[int, set[str]] = defaultdict(set)
    object_id_field = ""
    for boundary in boundaries:
        parameters, provenance = geometry_query_parameters(boundary)
        response, _ = client.json(
            f"{layer_url}/query",
            method="POST",
            parameters=parameters,
            provenance_parameters=provenance,
        )
        field = clean_text(response.get("objectIdFieldName"))
        if field:
            if object_id_field and object_id_field != field:
                raise AcquisitionError(f"ArcGIS object ID field changed from {object_id_field} to {field}")
            object_id_field = field
        object_ids = response.get("objectIds") or []
        if not isinstance(object_ids, list):
            raise AcquisitionError(f"{layer_url} returnIdsOnly response has no objectIds array")
        for object_id in object_ids:
            try:
                memberships[int(object_id)].add(boundary["code"])
            except (TypeError, ValueError) as exc:
                raise AcquisitionError(f"{layer_url} returned invalid object ID {object_id!r}") from exc
    return memberships, object_id_field


def arcgis_epsg_code(value: Any) -> int | None:
    """Return the EPSG code declared by an ArcGIS spatial-reference object."""

    if not isinstance(value, dict):
        return None
    candidate = value.get("latestWkid") or value.get("wkid")
    if isinstance(candidate, bool):
        return None
    try:
        code = int(candidate)
    except (TypeError, ValueError):
        return None
    return code if code > 0 else None


def require_output_spatial_reference(
    value: Any,
    *,
    context: str,
    expected_epsg: int = 4326,
) -> dict[str, Any]:
    """Fail closed unless ArcGIS confirms the requested output CRS."""

    code = arcgis_epsg_code(value)
    if code != expected_epsg:
        raise AcquisitionError(
            f"{context} returned spatialReference {value!r}; expected EPSG:{expected_epsg}"
        )
    return dict(value)


def fetch_object_features(
    client: HttpClient,
    layer_url: str,
    object_ids: Iterable[int],
    *,
    chunk_size: int = 1_500,
) -> list[dict[str, Any]]:
    ordered = sorted(set(object_ids))
    result: list[dict[str, Any]] = []
    for offset in range(0, len(ordered), chunk_size):
        chunk = ordered[offset : offset + chunk_size]
        response, _ = client.json(
            f"{layer_url}/query",
            method="POST",
            parameters={
                "objectIds": ",".join(str(value) for value in chunk),
                "outFields": "*",
                "returnGeometry": "true",
                "outSR": "4326",
                "f": "json",
            },
        )
        features = response.get("features")
        if not isinstance(features, list):
            raise AcquisitionError(f"{layer_url} feature query has no features array")
        spatial_reference = require_output_spatial_reference(
            response.get("spatialReference"),
            context=f"{layer_url} feature query",
        )
        for feature in features:
            if isinstance(feature, dict):
                copied = dict(feature)
                copied["spatialReference"] = spatial_reference
                result.append(copied)
    return result


def list_entry_value(feature: dict[str, Any]) -> str:
    attributes = feature.get("attributes") if isinstance(feature.get("attributes"), dict) else {}
    return clean_text(attributes.get("ListEntry") or attributes.get("List_Entry"))


def fetch_features_by_list_entry(
    client: HttpClient,
    layer_url: str,
    list_entries: Iterable[str],
    *,
    chunk_size: int = 250,
) -> list[dict[str, Any]]:
    ordered = sorted({entry for entry in list_entries if re.fullmatch(r"\d+", entry)}, key=int)
    result: list[dict[str, Any]] = []
    for offset in range(0, len(ordered), chunk_size):
        chunk = ordered[offset : offset + chunk_size]
        response, _ = client.json(
            f"{layer_url}/query",
            method="POST",
            parameters={
                "where": "ListEntry IN (" + ",".join(chunk) + ")",
                "outFields": "*",
                "returnGeometry": "true",
                "outSR": "4326",
                "f": "json",
            },
        )
        features = response.get("features")
        if not isinstance(features, list):
            raise AcquisitionError(f"{layer_url} ListEntry query has no features array")
        spatial_reference = require_output_spatial_reference(
            response.get("spatialReference"),
            context=f"{layer_url} ListEntry query",
        )
        for feature in features:
            if isinstance(feature, dict):
                copied = dict(feature)
                copied["spatialReference"] = spatial_reference
                result.append(copied)
    returned = {list_entry_value(feature) for feature in result}
    missing = sorted(set(ordered) - returned, key=int)
    if missing:
        raise AcquisitionError(f"{layer_url} did not return canonical features for ListEntry {missing[:10]}")
    return result


def feature_object_id(feature: dict[str, Any], object_id_field: str = "") -> int:
    attributes = feature.get("attributes") if isinstance(feature.get("attributes"), dict) else {}
    candidates = [object_id_field, "OBJECTID", "FID", "ObjectId", "objectid"]
    for candidate in candidates:
        if candidate and attributes.get(candidate) is not None:
            try:
                return int(attributes[candidate])
            except (TypeError, ValueError):
                continue
    raise AcquisitionError("ArcGIS feature has no usable object ID")


def geography_rows(codes: Iterable[str]) -> list[dict[str, str]]:
    return [
        {"code": code, "name": BOUNDARY_BY_CODE[code]["name"], "basis": "exact-source-geometry-intersection"}
        for code in sorted(set(codes))
    ]


def dedupe_nhle_layers(
    layers: Sequence[dict[str, Any]], *, expected_count: int | None = EXPECTED_NHLE_COUNT
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    seen: dict[str, tuple[int, dict[str, Any]]] = {}
    duplicates: list[dict[str, Any]] = []
    output_by_layer: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for layer in sorted(layers, key=lambda value: int(value["id"])):
        layer_id = int(layer["id"])
        for feature in sorted(layer.get("features", []), key=feature_object_id):
            attributes = feature.get("attributes") if isinstance(feature.get("attributes"), dict) else {}
            list_entry = clean_text(attributes.get("ListEntry") or attributes.get("List_Entry"))
            if not re.fullmatch(r"\d+", list_entry):
                raise AcquisitionError(f"NHLE layer {layer_id} feature has invalid ListEntry {list_entry!r}")
            if list_entry not in seen:
                copied = dict(feature)
                copied["source_layer_ids"] = [layer_id]
                seen[list_entry] = (layer_id, copied)
                output_by_layer[layer_id].append(copied)
                continue
            canonical_layer, canonical = seen[list_entry]
            canonical_codes = {
                item["code"]
                for item in canonical.get("scope_geographies", [])
                if isinstance(item, dict) and item.get("code") in BOUNDARY_BY_CODE
            }
            duplicate_codes = {
                item["code"]
                for item in feature.get("scope_geographies", [])
                if isinstance(item, dict) and item.get("code") in BOUNDARY_BY_CODE
            }
            canonical["scope_geographies"] = geography_rows(canonical_codes | duplicate_codes)
            canonical["source_layer_ids"] = sorted(set(canonical.get("source_layer_ids", [])) | {layer_id})
            duplicates.append(
                {
                    "list_entry": list_entry,
                    "canonical_layer": canonical_layer,
                    "duplicate_layer": layer_id,
                }
            )
    observed = len(seen)
    if expected_count is not None and observed != expected_count:
        by_layer = {str(layer_id): len(rows) for layer_id, rows in sorted(output_by_layer.items())}
        raise AcquisitionError(
            f"NHLE denominator reconciliation failed: observed {observed}, expected {expected_count}; "
            f"deduplicated layer counts={by_layer}"
        )
    output = [
        {
            **{key: value for key, value in layer.items() if key != "features"},
            "features": output_by_layer.get(int(layer["id"]), []),
        }
        for layer in sorted(layers, key=lambda value: int(value["id"]))
    ]
    reconciliation = {
        "expected_unique_list_entries": expected_count,
        "observed_unique_list_entries": observed,
        "raw_features": sum(len(layer.get("features", [])) for layer in layers),
        "cross_layer_duplicates": duplicates,
        "deduplicated_by_layer": {
            str(layer["id"]): len(layer["features"]) for layer in output
        },
    }
    return output, reconciliation


def acquire_nhle(
    client: HttpClient,
    boundaries: Sequence[dict[str, Any]],
    *,
    expected_count: int | None = EXPECTED_NHLE_COUNT,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    layer_ids = [item[0] for item in NHLE_LAYERS]
    evidence_layer_ids = sorted(
        {layer_id for values in NHLE_SPATIAL_EVIDENCE_LAYERS.values() for layer_id in values}
    )
    before, before_download = client.json(f"{NHLE_SERVICE}/layers", parameters={"f": "json"})
    before_state = layer_edit_state(before, evidence_layer_ids)
    if set(before_state) != set(evidence_layer_ids):
        raise AcquisitionError("NHLE layers metadata did not contain every required layer")
    source_layers = {int(item["id"]): item for item in before.get("layers", []) if item.get("id") is not None}
    layers: list[dict[str, Any]] = []
    for layer_id, declared_name in NHLE_LAYERS:
        layer_url = f"{NHLE_SERVICE}/{layer_id}"
        canonical_memberships, object_id_field = query_spatial_object_ids(
            client, layer_url, boundaries
        )
        features = fetch_object_features(client, layer_url, canonical_memberships)
        canonical_by_entry: dict[str, dict[str, Any]] = {}
        membership_by_entry: dict[str, set[str]] = defaultdict(set)
        evidence_by_entry: dict[str, dict[str, set[int]]] = defaultdict(lambda: defaultdict(set))
        returned_ids: set[int] = set()
        for feature in features:
            object_id = feature_object_id(feature, object_id_field)
            returned_ids.add(object_id)
            entry = list_entry_value(feature)
            if not re.fullmatch(r"\d+", entry):
                raise AcquisitionError(f"NHLE layer {layer_id} feature has invalid ListEntry {entry!r}")
            if entry in canonical_by_entry:
                raise AcquisitionError(f"NHLE layer {layer_id} duplicated ListEntry {entry}")
            canonical_by_entry[entry] = feature
            for code in canonical_memberships.get(object_id, set()):
                membership_by_entry[entry].add(code)
                evidence_by_entry[entry][code].add(layer_id)
        missing_ids = sorted(set(canonical_memberships) - returned_ids)
        extra_ids = sorted(returned_ids - set(canonical_memberships))
        if missing_ids or extra_ids:
            raise AcquisitionError(
                f"NHLE layer {layer_id} object reconciliation failed; "
                f"missing={missing_ids[:10]}, extra={extra_ids[:10]}"
            )

        for evidence_layer_id in NHLE_SPATIAL_EVIDENCE_LAYERS[layer_id]:
            if evidence_layer_id == layer_id:
                continue
            evidence_url = f"{NHLE_SERVICE}/{evidence_layer_id}"
            evidence_memberships, evidence_oid_field = query_spatial_object_ids(
                client, evidence_url, boundaries
            )
            evidence_features = fetch_object_features(client, evidence_url, evidence_memberships)
            for evidence_feature in evidence_features:
                evidence_object_id = feature_object_id(evidence_feature, evidence_oid_field)
                entry = list_entry_value(evidence_feature)
                if not re.fullmatch(r"\d+", entry):
                    raise AcquisitionError(
                        f"NHLE spatial evidence layer {evidence_layer_id} has invalid ListEntry {entry!r}"
                    )
                for code in evidence_memberships.get(evidence_object_id, set()):
                    membership_by_entry[entry].add(code)
                    evidence_by_entry[entry][code].add(evidence_layer_id)

        missing_entries = set(membership_by_entry) - set(canonical_by_entry)
        for feature in fetch_features_by_list_entry(client, layer_url, missing_entries):
            entry = list_entry_value(feature)
            if entry in canonical_by_entry:
                raise AcquisitionError(f"NHLE canonical recovery duplicated ListEntry {entry}")
            canonical_by_entry[entry] = feature
        for entry, feature in canonical_by_entry.items():
            feature["scope_geographies"] = geography_rows(membership_by_entry.get(entry, set()))
            feature["scope_membership_basis"] = (
                "Union of ArcGIS esriSpatialRelIntersects results for the canonical representation "
                "and its official alternate polygon representation"
            )
            feature["scope_membership_evidence"] = [
                {
                    "code": code,
                    "layer_ids": sorted(evidence_by_entry[entry][code]),
                }
                for code in sorted(evidence_by_entry[entry])
            ]
            feature["source_spatial_layer_ids"] = sorted(
                {value for code in evidence_by_entry[entry].values() for value in code}
            )
        features = sorted(canonical_by_entry.values(), key=feature_object_id)
        metadata = source_layers.get(layer_id, {})
        layers.append(
            {
                "id": layer_id,
                "name": clean_text(metadata.get("name")) or declared_name,
                "geometry_type": metadata.get("geometryType"),
                "object_id_field": object_id_field,
                "data_last_edit_date": before_state[layer_id],
                "fields": metadata.get("fields", []),
                "features": features,
            }
        )
    after, after_download = client.json(f"{NHLE_SERVICE}/layers", parameters={"f": "json"})
    after_state = layer_edit_state(after, evidence_layer_ids)
    if before_state != after_state:
        raise AcquisitionError(
            f"NHLE changed during acquisition: before={before_state}, after={after_state}"
        )
    deduplicated, reconciliation = dedupe_nhle_layers(layers, expected_count=expected_count)
    source = {
        "id": "historic-england-nhle-v02",
        "kind": "designation-register",
        "title": "National Heritage List for England open data",
        "item_id": NHLE_ITEM_ID,
        "item_url": NHLE_ITEM_URL,
        "service_url": NHLE_SERVICE,
        "layer_ids": layer_ids,
        "spatial_evidence_layer_ids": evidence_layer_ids,
        "spatial_identity_policy": (
            "Layers 0/1/2 supply canonical records; paired polygon layers 3/4/5 supply alternate "
            "intersection evidence only. Other categories use their single polygon layer."
        ),
        "metadata_request_ids": [before_download.request_id, after_download.request_id],
        "metadata_sha256_before": response_sha256(before_download.body, before_download.headers),
        "metadata_sha256_after": response_sha256(after_download.body, after_download.headers),
        "metadata_digest_basis": "canonical-json",
        "data_last_edit_dates": {str(key): value for key, value in sorted(before_state.items())},
        "license": OGL,
        "terms": OPEN_DATA_TERMS,
        "attribution": (
            "© Historic England 2026. Contains Ordnance Survey data © Crown copyright "
            "and database right 2026."
        ),
    }
    return {"layers": deduplicated, "reconciliation": reconciliation}, source, reconciliation


def read_workbook_override(directory: Path, year: int) -> tuple[bytes, str] | None:
    matches = sorted(path for path in directory.glob(f"har-{year}*") if path.is_file())
    if not matches:
        return None
    if len(matches) > 1:
        raise AcquisitionError(f"multiple workbook overrides found for {year}: {[path.name for path in matches]}")
    path = matches[0]
    return path.read_bytes(), path.name


def acquire_har_workbooks(
    client: HttpClient,
    *,
    workbook_dir: Path | None = None,
    raw_dir: Path | None = None,
    converter: str | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    annual: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []
    schemas: list[dict[str, Any]] = []
    for year in range(2013, 2026):
        url = HAR_WORKBOOK_URL.format(year=year)
        override = read_workbook_override(workbook_dir, year) if workbook_dir else None
        if override:
            body, filename = override
            declared_type = mimetypes.guess_type(filename)[0] or ""
            final_url = url
            headers = {"content-type": declared_type}
            request_id = ""
            transport = "provided-local-cache"
        else:
            download = client.request(url)
            body = download.body
            filename = clean_text(download.headers.get("content-disposition")) or f"har-{year}"
            declared_type = content_type(download.headers)
            final_url = download.final_url
            headers = download.headers
            request_id = download.request_id
            transport = "official-https-download"
        workbook_format, sections, schema = workbook_sections(
            year,
            body,
            source_url=url,
            declared_type=declared_type,
            converter=converter,
        )
        annual.extend(sections)
        schema.update({"year": year, "source_url": url, "sha256": sha256_bytes(body)})
        schemas.append(schema)
        if raw_dir:
            raw_dir.mkdir(parents=True, exist_ok=True)
            (raw_dir / f"har-{year}.{workbook_format}").write_bytes(body)
        sources.append(
            {
                "id": f"historic-england-har-{year}-workbook",
                "kind": "annual-risk-register",
                "title": f"Heritage at Risk {year}: entries, additions and positive removals",
                "year": year,
                "source_url": url,
                "annual_index_url": HAR_ANNUAL_PAGE,
                "final_url": final_url,
                "request_id": request_id,
                "transport": transport,
                "filename_or_disposition": filename,
                "format": workbook_format,
                "declared_media_type": declared_type,
                "response_headers": headers,
                "sha256": sha256_bytes(body),
                "bytes": len(body),
                "semantic_sheets": schema["sheets"],
                "license": OGL,
                "terms": OPEN_DATA_TERMS,
                "attribution": "© Historic England 2026.",
            }
        )
    annual.sort(key=lambda item: (item["year"], list(ROLE_EVENT).index(item["semantic_role"]), item["source_sheet"]))
    return annual, sources, schemas


def acquire_mapped_har(
    client: HttpClient,
    boundaries: Sequence[dict[str, Any]],
) -> tuple[dict[int, list[dict[str, Any]]], list[dict[str, Any]]]:
    mapped: dict[int, list[dict[str, Any]]] = {}
    sources: list[dict[str, Any]] = []
    for year, layer_url in sorted(HAR_MAP_SERVICES.items()):
        metadata, metadata_download = client.json(layer_url, parameters={"f": "json"})
        object_id_field = clean_text(metadata.get("objectIdField"))
        if not object_id_field:
            for field in metadata.get("fields", []):
                if field.get("type") == "esriFieldTypeOID":
                    object_id_field = clean_text(field.get("name"))
                    break
        memberships, returned_field = query_spatial_object_ids(client, layer_url, boundaries)
        object_id_field = returned_field or object_id_field
        features = fetch_object_features(client, layer_url, memberships)
        for feature in features:
            object_id = feature_object_id(feature, object_id_field)
            feature["scope_geographies"] = geography_rows(memberships.get(object_id, set()))
        features.sort(key=lambda feature: feature_object_id(feature, object_id_field))
        mapped[year] = features
        sources.append(
            {
                "id": f"historic-england-har-{year}-mapped-layer",
                "kind": "optional-risk-geometry",
                "year": year,
                "service_url": layer_url,
                "metadata_request_id": metadata_download.request_id,
                "metadata_sha256": response_sha256(
                    metadata_download.body, metadata_download.headers
                ),
                "metadata_digest_basis": "canonical-json",
                "data_last_edit_date": (
                    metadata.get("editingInfo", {}).get("lastEditDate")
                    if isinstance(metadata.get("editingInfo"), dict)
                    else None
                ),
                "features_intersecting_scope": len(features),
                "completeness_role": "geometry-enrichment-only",
                "limitation": (
                    "Mapped HAR geometry is not the annual denominator; Historic England states "
                    "that Conservation Area spatial coverage is incomplete."
                ),
                "license": OGL,
                "terms": OPEN_DATA_TERMS,
            }
        )
    return mapped, sources


def normalized_name(value: str) -> str:
    return normalized_text(value)


def har_row_keys(row: dict[str, Any]) -> tuple[str, tuple[str, str, str], tuple[str, str]]:
    raw = row.get("source_values") if isinstance(row.get("source_values"), dict) else row
    uid = flexible_source_value(raw, "uid", "legacy uid", "unique id", "har uid")
    list_entry = flexible_source_value(
        raw,
        "list entry",
        "list entry number",
        "list_entry",
        "listentry",
        prefixes=("list entry number (len)", "list entry number"),
    )
    methodology = flexible_source_value(
        raw, "assessment type", "risk methodology", "risk method", "methodology"
    )
    name = flexible_source_value(
        raw,
        "name",
        "published site name",
        "entry name",
        "site name",
        "name of site",
        "designated site name",
    )
    return normalized_text(uid), (normalized_text(list_entry), normalized_text(methodology), normalized_name(name)), (
        normalized_text(list_entry),
        normalized_name(name),
    )


def har_feature_keys(feature: dict[str, Any]) -> tuple[str, tuple[str, str, str], tuple[str, str]]:
    attributes = feature.get("attributes") if isinstance(feature.get("attributes"), dict) else {}
    values = {normalized_header(key): clean_text(value) for key, value in attributes.items()}

    def first(*keys: str) -> str:
        return next(
            (
                values.get(normalized_header(key), "")
                for key in keys
                if values.get(normalized_header(key), "")
            ),
            "",
        )

    uid = first("uid", "unique id", "har uid")
    list_entry = first("list entry", "list_entry", "listentry")
    methodology = first("risk metho", "risk method", "risk methodology", "assessment type")
    name = first("entry name", "entryname", "name", "site name")
    return normalized_text(uid), (normalized_text(list_entry), normalized_text(methodology), normalized_name(name)), (
        normalized_text(list_entry),
        normalized_name(name),
    )


def combine_geometries(features: Sequence[dict[str, Any]]) -> dict[str, Any] | None:
    geometries = [feature.get("geometry") for feature in features if isinstance(feature.get("geometry"), dict)]
    if not geometries:
        return None
    if len(geometries) == 1:
        return dict(geometries[0])
    if all("rings" in geometry for geometry in geometries):
        # Preserve all Esri rings.  The builder retains the original source form
        # and projects it conservatively for preview/bounds.
        return {"rings": [ring for geometry in geometries for ring in geometry.get("rings", [])]}
    if all("points" in geometry for geometry in geometries):
        return {"points": [point for geometry in geometries for point in geometry.get("points", [])]}
    return dict(geometries[0])


def join_mapped_har(
    annual: list[dict[str, Any]],
    mapped: dict[int, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    report: list[dict[str, Any]] = []
    sections_by_year: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for section in annual:
        sections_by_year[int(section["year"])].append(section)
    for year, features in sorted(mapped.items()):
        rows = [row for section in sections_by_year.get(year, []) for row in section.get("rows", [])]
        uid_index: dict[str, list[dict[str, Any]]] = defaultdict(list)
        composite_index: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
        list_method_index: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        fallback_index: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            uid, composite, fallback = har_row_keys(row)
            if uid:
                uid_index[uid].append(row)
            if all(composite):
                composite_index[composite].append(row)
            if all(composite[:2]):
                list_method_index[composite[:2]].append(row)
            if all(fallback):
                fallback_index[fallback].append(row)
        joined_features: dict[str, list[dict[str, Any]]] = defaultdict(list)
        unmatched = 0
        ambiguous = 0
        mapped_features_joined = 0
        one_to_many_feature_joins = 0
        for feature in features:
            uid, composite, fallback = har_feature_keys(feature)
            candidates = uid_index.get(uid, []) if uid else []
            method = "uid"
            if not candidates and all(composite):
                candidates = composite_index.get(composite, [])
                method = "list-entry-method-name"
            if not candidates and all(composite[:2]):
                candidates = list_method_index.get(composite[:2], [])
                method = "list-entry-methodology"
            if not candidates and all(fallback):
                candidates = fallback_index.get(fallback, [])
                method = "list-entry-name"
            if not candidates:
                unmatched += 1
                continue
            if len(candidates) > 1 and method == "list-entry-name":
                ambiguous += 1
                continue
            if len(candidates) > 1:
                # Entry and Addition sheets can intentionally contain the same
                # assessment in its first year.  Geometry describes the source
                # assessment and is valid for both annual event rows.
                one_to_many_feature_joins += 1
            mapped_features_joined += 1
            for row in candidates:
                joined_features[row["record_id"]].append(feature)
                row.setdefault("mapped_geometry_join", []).append(
                    {
                        "year": year,
                        "method": method,
                        "source_object_id": feature_object_id(feature),
                        "source_service": HAR_MAP_SERVICES[year],
                        "scope_geographies": feature.get("scope_geographies", []),
                        "candidate_rows_for_feature": len(candidates),
                    }
                )
        for row in rows:
            matches = joined_features.get(row["record_id"], [])
            if matches:
                geometry = combine_geometries(matches)
                if geometry:
                    geometry_features = [
                        feature
                        for feature in matches
                        if isinstance(feature.get("geometry"), dict)
                    ]
                    references = [
                        feature.get("spatialReference") for feature in geometry_features
                    ]
                    codes = {arcgis_epsg_code(reference) for reference in references}
                    if None in codes or len(codes) != 1:
                        raise AcquisitionError(
                            f"mapped HAR {year} row {row['record_id']} has missing or mixed "
                            f"spatial references: {references!r}"
                        )
                    row["geometry"] = geometry
                    row["spatialReference"] = dict(references[0])
                existing = {
                    item["code"]: item
                    for item in row.get("scope_geographies", [])
                    if isinstance(item, dict) and item.get("code")
                }
                for feature in matches:
                    for item in feature.get("scope_geographies", []):
                        if isinstance(item, dict) and item.get("code") in BOUNDARY_BY_CODE:
                            existing[item["code"]] = item
                row["scope_geographies"] = [existing[key] for key in sorted(existing)]
        report.append(
            {
                "year": year,
                "mapped_features": len(features),
                "mapped_features_joined": mapped_features_joined,
                "row_geometry_links": sum(len(value) for value in joined_features.values()),
                "spreadsheet_rows_with_geometry": len(joined_features),
                "one_to_many_feature_joins": one_to_many_feature_joins,
                "unmatched_features": unmatched,
                "ambiguous_features": ambiguous,
                "completeness_role": "geometry-enrichment-only",
            }
        )
    return report


def source_snapshot(
    *,
    observed_at: str,
    boundaries: list[dict[str, Any]],
    nhle: dict[str, Any],
    annual: list[dict[str, Any]],
    workbook_schemas: list[dict[str, Any]],
    mapped_report: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    requests: list[dict[str, Any]],
    nhle_reconciliation: dict[str, Any],
) -> dict[str, Any]:
    observed_date = observed_at[:10].replace("-", "")
    denominators: list[dict[str, Any]] = [
        {
            "id": "nhle-current-spatial-intersection",
            "definition": (
                "Unique NHLE ListEntry values in layers 0, 1, 2, 6, 7, 8, 9 and 10 whose "
                "official feature geometry intersects at least one pinned December 2025 BFC LAD polygon."
            ),
            "method": "ArcGIS esriSpatialRelIntersects per LAD; union by ListEntry; retain all memberships",
            "status": "complete-for-pinned-source-snapshot",
            "count": nhle_reconciliation["observed_unique_list_entries"],
            "expected_count": nhle_reconciliation["expected_unique_list_entries"],
            "layer_counts": nhle_reconciliation["deduplicated_by_layer"],
        }
    ]
    for section in annual:
        denominators.append(
            {
                "id": f"har-{section['year']}-{section['semantic_role']}-scope-rows",
                "definition": (
                    f"Rows in the official {section['year']} {section['source_sheet']} sheet whose sanctioned "
                    "source local-authority or district fields match Coventry or a Warwickshire LAD, or whose "
                    "county field explicitly records Warwickshire without a district assertion."
                ),
                "method": (
                    "Year-specific semantic header discovery; authoritative local-government field matching; "
                    "county-only Warwickshire retained without inferring a LAD"
                ),
                "status": "complete-for-source-workbook-sheet",
                "count": len(section.get("rows", [])),
                "source_data_rows": section.get("source_data_rows", 0),
            }
        )
    return {
        "schema": "heritage-evaluation-source-snapshot.v1",
        "snapshot_id": f"heritage-coventry-warwickshire-{observed_date}-v2",
        "observed_at": observed_at,
        "source_title": (
            "Historic England NHLE and annual Heritage at Risk sources intersected with "
            "ONS December 2025 BFC boundaries"
        ),
        "source_url": "https://historicengland.org.uk/listing/the-list/",
        "source_data_url": NHLE_SERVICE,
        "source_adapter": "historic-england-ons-deterministic-acquisition-v2",
        "geometry_delivery": {
            "crs": "EPSG:4326",
            "arcgis_out_sr": "4326",
            "coordinate_order": "longitude-latitude",
            "coordinate_transformation": "none-after-source-delivery",
            "basis": (
                "Every retained NHLE and mapped HAR geometry is requested from ArcGIS "
                "with outSR=4326. Response spatialReference values are validated; source "
                "receipts and per-feature declarations, where present, bind this contract."
            ),
        },
        "publication": {
            "public_base": "https://chris-page-gov.github.io/okf-explorer/evaluation/heritage/",
            "role": "faithful",
            "title": "Coventry and Warwickshire Heritage Evaluation",
            "description": (
                "Source-backed NHLE spatial intersection and sanctioned annual Heritage at Risk "
                "observations for functionality evaluation."
            ),
            "status": "evaluation-source-snapshot",
            "license": OGL,
            "publisher": "https://historicengland.org.uk/",
            "publisher_title": "Historic England",
        },
        "scope": {
            "assertion_scope": "real-world",
            "vintage": "Local Authority Districts (December 2025) Boundaries UK BFC",
            "boundary_item_id": ONS_ITEM_ID,
            "boundary_service": ONS_SERVICE,
            "intersection_method": (
                "ArcGIS esriSpatialRelIntersects independently against each full-resolution source LAD "
                "polygon; one List Entry emitted once with every intersected LAD retained."
            ),
            "boundaries": boundaries,
        },
        "nhle": nhle,
        "har": {
            "annual": annual,
            "workbook_schemas": workbook_schemas,
            "mapped_geometry_join": mapped_report,
            "mapped_geometry_completeness": "optional enrichment only; never the HAR denominator",
        },
        "sources": sources,
        "denominators": denominators,
        "requests": requests,
        "limitations": [
            (
                "NHLE geometry establishes intersection with the evaluation scope; it does not make a "
                "legal-curtilage determination."
            ),
            (
                "Annual HAR spreadsheets define annual observations and events. Optional mapped HAR "
                "features enrich geometry only because Conservation Area spatial coverage is incomplete."
            ),
            (
                "Historic England rich List-entry text is linked at source and is not bulk-harvested; "
                "images, map tiles, logos and user contributions are excluded."
            ),
            (
                "A county-only Warwickshire workbook match is retained as E10000031 and is not silently "
                "assigned to one of the five LADs."
            ),
            (
                "Published contact, email and telephone values are deliberately excluded from normalized "
                "rows; their source columns and the immutable workbook hash remain recorded."
            ),
        ],
        "link_validation": {"live_receipts": []},
    }


def write_snapshot(path: Path, snapshot: dict[str, Any]) -> None:
    payload = deterministic_gzip(json_bytes(snapshot)) if path.suffix == ".gz" else json_bytes(snapshot)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def acquire(args: argparse.Namespace) -> dict[str, Any]:
    client = HttpClient(timeout=args.timeout, user_agent=args.user_agent)
    boundaries, boundary_source = acquire_boundaries(client)
    nhle, nhle_source, nhle_reconciliation = acquire_nhle(
        client,
        boundaries,
        expected_count=None if args.expected_nhle_count < 0 else args.expected_nhle_count,
    )
    annual, workbook_sources, workbook_schemas = acquire_har_workbooks(
        client,
        workbook_dir=args.workbook_dir,
        raw_dir=args.raw_dir,
        converter=args.soffice,
    )
    mapped_report: list[dict[str, Any]] = []
    mapped_sources: list[dict[str, Any]] = []
    if not args.no_har_map:
        mapped, mapped_sources = acquire_mapped_har(client, boundaries)
        mapped_report = join_mapped_har(annual, mapped)
    return source_snapshot(
        observed_at=args.observed_at,
        boundaries=boundaries,
        nhle=nhle,
        annual=annual,
        workbook_schemas=workbook_schemas,
        mapped_report=mapped_report,
        sources=[boundary_source, nhle_source, *workbook_sources, *mapped_sources],
        requests=client.receipts,
        nhle_reconciliation=nhle_reconciliation,
    )


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    value.add_argument(
        "--workbook-dir",
        type=Path,
        help="Directory containing exactly one har-YEAR* official workbook for each 2013–2025 year",
    )
    value.add_argument("--raw-dir", type=Path, help="Optional directory in which to retain raw annual workbook bytes")
    value.add_argument("--observed-at", default=utc_now())
    value.add_argument("--expected-nhle-count", type=int, default=EXPECTED_NHLE_COUNT)
    value.add_argument("--no-har-map", action="store_true", help="Skip optional 2021–2025 mapped HAR geometry")
    value.add_argument("--soffice", help="Explicit LibreOffice/soffice executable for legacy XLS conversion")
    value.add_argument("--timeout", type=float, default=60.0)
    value.add_argument("--user-agent")
    return value


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        snapshot = acquire(args)
        write_snapshot(args.output, snapshot)
    except (AcquisitionError, OSError, subprocess.SubprocessError, ET.ParseError, zipfile.BadZipFile) as exc:
        print(f"heritage source acquisition failed: {exc}", file=sys.stderr)
        return 1
    count = snapshot["nhle"]["reconciliation"]["observed_unique_list_entries"]
    har_rows = sum(len(section.get("rows", [])) for section in snapshot["har"]["annual"])
    print(f"wrote {args.output} with {count:,} NHLE List entries and {har_rows:,} annual HAR rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
