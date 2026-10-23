"""Bounded JSON adapter for the pinned heuristic checker. No dictionary."""
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("pinned_ste_lint", HERE / "vendor/ste_lint.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

def check(text):
    if len(text.encode()) > 32768:
        raise ValueError("Rendering exceeds 32,768-byte limit")
    result = checker.lint(text, "descriptive")
    result["findings"] = checker.lint_detail(text, "descriptive")
    result["checker"] = "AminBlg/SimpleEnglish/evals/ste_lint.py"
    result["checker_revision"] = "a6fcb4fde098b33617cc1578d151ebf58774b883"
    result["rules_checked"] = list(result["violations"])
    result["measurement"] = "regex heuristic counts; not ASD-STE100 conformance or comprehension"
    result["finding_locations"] = "upstream approximate line numbers; snippets may be shortened"
    return result

if __name__ == "__main__":
    # Bound reads before parsing; the same limit applies through the CLI and API.
    raw = sys.stdin.buffer.read(32769)
    if len(raw) > 32768:
        raise SystemExit("Rendering exceeds 32,768-byte limit")
    print(json.dumps(check(raw.decode("utf-8")), indent=2, ensure_ascii=False))
