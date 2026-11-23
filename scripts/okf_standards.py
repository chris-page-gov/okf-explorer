"""Read version-specific specification references from the authored register."""

import json
from pathlib import Path


REGISTER = Path(__file__).resolve().parents[1] / "registry/okf-standards.json"


def specification_for(version: str) -> str:
    register = json.loads(REGISTER.read_text(encoding="utf-8"))
    entries = [register["current_core"], *register["historical_core"]]
    for entry in entries:
        if entry["version"] == version and entry.get("pinned_commit") and entry.get("specification"):
            return entry["specification"]
    raise ValueError(f"No verified specification is registered for OKF {version}")
