"""Extract a bounded, source-located OpenAPI 3.1 operation selection."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
from urllib.parse import unquote

from export_dcat_ap import named as source_iri
from normalise_shacl_report import canonical_json


MAX_INPUT_BYTES = 2 * 1024 * 1024
MAX_OPERATIONS = 32
METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
PATH_CONTEXT = {"summary", "description", "servers", "parameters"}
ROOT_CONTEXT = {"openapi", "info", "servers", "security", "tags", "externalDocs", "components", "jsonSchemaDialect"}


def json_object(pairs: list[tuple[str, object]]) -> dict:
    result = dict(pairs)
    if len(result) != len(pairs):
        raise ValueError("OpenAPI JSON contains a duplicate object field")
    return result


def invalid_number(value: str):
    raise ValueError(f"Invalid JSON number: {value}")


def object_field(value: object, label: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"Expected an OpenAPI {label} object")
    return value


def escape_pointer(value: str) -> str:
    return value.replace("~", "~0").replace("/", "~1")


def require_local_pointer(root: dict, pointer: object) -> None:
    if not isinstance(pointer, str) or not pointer.startswith("#/"):
        raise ValueError("The selection requires fragment-only JSON Pointer references")
    current: object = root
    for part in unquote(pointer[2:]).split("/"):
        if re.search(r"~(?![01])", part):
            raise ValueError("Invalid escape in an OpenAPI JSON Pointer")
        key = part.replace("~1", "/").replace("~0", "~")
        if isinstance(current, dict) and key in current:
            current = current[key]
        elif isinstance(current, list) and re.fullmatch(r"0|[1-9][0-9]*", key) and len(key) < 8 and int(key) < len(current):
            current = current[int(key)]
        else:
            raise ValueError("A local OpenAPI reference points outside the selected document")


def check_references(document: dict) -> None:
    pending: list[object] = [document]
    while pending:
        item = pending.pop()
        if isinstance(item, list):
            pending.extend(item)
        elif isinstance(item, dict):
            if "$dynamicRef" in item or "$id" in item:
                raise ValueError("The bounded selection requires static OpenAPI references in one document scope")
            for key in ("$ref", "operationRef"):
                if key in item:
                    require_local_pointer(document, item[key])
            pending.extend(item.values())


def export_selection(raw: bytes, source: str, operations: list[tuple[str, str]]) -> bytes:
    if not 0 < len(raw) <= MAX_INPUT_BYTES:
        raise ValueError("OpenAPI input must be between 1 byte and 2 MiB")
    source = str(source_iri(source))
    if not 1 <= len(operations) <= MAX_OPERATIONS:
        raise ValueError("Select between 1 and 32 operations")
    try:
        original = object_field(json.loads(raw, object_pairs_hook=json_object, parse_constant=invalid_number), "root")
    except RecursionError as error:
        raise ValueError("OpenAPI JSON exceeds the parse depth") from error
    version = original.get("openapi")
    if not isinstance(version, str) or not re.fullmatch(r"3\.1\.\d+", version):
        raise ValueError("Expected an OpenAPI 3.1 document")
    info = object_field(original.get("info"), "info")
    if any(not isinstance(info.get(key), str) or not info[key].strip() for key in ("title", "version")):
        raise ValueError("OpenAPI info requires a title and version")
    paths = object_field(original.get("paths"), "paths")
    selected: dict[str, dict] = {}
    locations: list[dict] = []
    for method, path in sorted(operations, key=lambda item: (item[1], item[0].lower())):
        method = method.lower()
        if method not in METHODS or not path.startswith("/") or path not in paths:
            raise ValueError("Select a declared OpenAPI method and path")
        item = object_field(paths[path], "path item")
        if "$ref" in item:
            raise ValueError("Selected path items must carry their operation objects directly")
        operation = object_field(item.get(method), "selected operation")
        if "responses" in operation:
            object_field(operation["responses"], "responses")
        target = selected.setdefault(path, {key: value for key, value in item.items() if key in PATH_CONTEXT})
        if method in target:
            raise ValueError("Duplicate OpenAPI operation selection")
        target[method] = operation
        locations.append({
            "method": method.upper(), "path": path,
            "pointer": f"/paths/{escape_pointer(path)}/{method}",
        })
    output = {key: value for key, value in original.items() if key in ROOT_CONTEXT}
    output["paths"] = selected
    check_references(output)
    output["x-okf-source"] = {"document": source, "sha256": sha256(raw).hexdigest(), "operations": locations}
    try:
        encoded = canonical_json(output)
    except RecursionError as error:
        raise ValueError("OpenAPI JSON exceeds the export depth") from error
    if len(encoded) > MAX_INPUT_BYTES:
        raise ValueError("OpenAPI selection exceeds its output byte limit")
    return encoded


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--operation", action="append", nargs=2, metavar=("METHOD", "PATH"), required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        with args.input.open("rb") as stream:
            selection = export_selection(stream.read(MAX_INPUT_BYTES + 1), args.source, args.operation)
        with args.output.open("xb") as output:
            output.write(selection)
    except (OSError, ValueError) as error:
        parser.exit(2, f"OpenAPI selection failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
