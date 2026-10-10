"""Freeze selected DWP pages without changing acquisition evidence or projections."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
SELECTION = {"adm-chapter-a4": [34, 36, 37], "adm-chapter-f1": [17, 18]}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def freeze(root, output):
    root = root.resolve()
    revision = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True
    ).strip()
    inventory_path = root / "source/adm-2026-09-19/inventory.json"
    inventory_bytes = inventory_path.read_bytes()
    inventory = json.loads(inventory_bytes)
    documents = {d["id"]: d for d in inventory["documents"]}
    pages = []
    bindings = []
    for document, numbers in SELECTION.items():
        item = documents[document]
        page_path = root / item["pages_path"]
        page_bytes = page_path.read_bytes()
        extracted = json.loads(page_bytes)
        source_digest = digest((root / item["pdf_path"]).read_bytes())
        if source_digest != extracted["source_sha256"] or source_digest != item["sha256"]:
            raise ValueError(f"PDF digest mismatch: {document}")
        if digest(page_bytes) != item["pages_sha256"]:
            raise ValueError(f"Extraction digest mismatch: {document}")
        receipt_path = item["acquisition"]["receipt_path"]
        receipt_bytes = (root / receipt_path).read_bytes()
        receipt = json.loads(receipt_bytes)
        if receipt["sha256"] != source_digest:
            raise ValueError(f"Acquisition receipt mismatch: {document}")
        for number in numbers:
            page = next(p for p in extracted["pages"] if p["page"] == number)
            pages.append({
                "id": f"{document}/page/{number}",
                "document_id": document, "pdf_page": number,
                "text": page["text"],
                "text_sha256": digest(page["text"].encode()),
                "source_url": page["url"],
                "source_sha256": source_digest,
                "extraction_path": item["pages_path"],
                "extraction_sha256": digest(page_bytes),
                "extraction": extracted["extraction"],
                "acquisition_receipt": receipt,
                "extraction_observed_at": item["extraction_observed_at"],
                "source_classification": {key: item[key] for key in (
                    "role", "publication", "document_dates", "current_attachment", "legal_status"
                )},
            })
        bindings.append({"path": item["pages_path"], "sha256": digest(page_bytes)})
        bindings.append({"path": receipt_path, "sha256": digest(receipt_bytes)})
    kit = "evaluation/okf_uc_evaluation_starter_2026-09-25"
    question_path = f"{kit}/participant/questions/uc-dla-001.txt"
    case_path = "evaluation/out-of-sample/uc-disabled-child-supersession-001.json"
    case_bytes = (root / case_path).read_bytes()
    case = json.loads(case_bytes)
    question_bytes = (root / question_path).read_bytes()
    reference_path = f"{kit}/assessor/reference-answer.md"
    reference_bytes = (root / reference_path).read_bytes()
    package = {
        "schema": "okf-controlled-language-evidence.v1",
        "locale": "en-GB", "time_zone": "Europe/London",
        "case_id": "uc-dla-001",
        "question": question_bytes.decode().strip(),
        "selection_method": "fixed source-guided page selection; no retrieval comparison",
        "repository": {"url": "https://github.com/chris-page-gov/okf-dwp", "revision": revision},
        "source_bindings": bindings + [
            {"path": question_path, "sha256": digest(question_bytes)},
            {"path": case_path, "sha256": digest(case_bytes)},
            {"path": "source/adm-2026-09-19/inventory.json", "sha256": digest(inventory_bytes)},
        ],
        "acquisition": {
            "generated_at": inventory["generated_at"],
            "licence_url": inventory["licence_url"],
            "attribution": inventory["attribution"],
            "rights_evidence": inventory["rights_evidence"],
        },
        "pages": pages,
        "evidence_status": "insufficient",
        "ai_answer": None,
        "limitations": inventory["limitations"] + case["limitations"] + [
            "Source-guided subset added for presentation testing; this does not repair the observed retrieval miss.",
            "No historical statutory bodies or independent specialist acceptance in this package.",
            "Assessment-period boundaries and individual award history are absent.",
            "All derived explanations are unreviewed research artefacts.",
        ],
        "required_unknowns": case["required_unknowns"],
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / "evidence.json").write_text(json.dumps(package, indent=2, ensure_ascii=False) + "\n")
    # Separate assessor baseline. It never enters a model rendering request.
    (output / "baseline-reference.md").write_bytes(reference_bytes)
    (output / "baseline-provenance.json").write_text(json.dumps({
        "path": reference_path, "sha256": digest(reference_bytes),
        "revision": revision,
        "status": "existing unreviewed model-derived assessor reference; not an Ask OKF answer",
    }, indent=2) + "\n")
    print(output / "evidence.json")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dwp-root", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=HERE / "fixtures")
    args = parser.parse_args()
    freeze(args.dwp_root, args.output)
