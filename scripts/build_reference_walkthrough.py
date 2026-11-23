"""Render a source-backed walkthrough; never execute bundle instructions."""

from collections import defaultdict, deque
from hashlib import sha256
from html import escape
import json
from pathlib import Path, PurePosixPath
import re
import textwrap

from markdown_it import MarkdownIt
import build_okf_bundle


ROOT = Path(__file__).resolve().parents[1]


def source_bytes(route: str, root: Path) -> bytes:
    path = PurePosixPath(route)
    if path.is_absolute() or path.as_posix() != route or "\\" in route or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError("walkthrough source must be a contained relative path")
    selected = root
    for part in path.parts:
        selected /= part
        if selected.is_symlink():
            raise ValueError("walkthrough sources must not be symlinks")
    if not selected.is_file() or selected.stat().st_size > 4_000_000:
        raise ValueError("walkthrough source is missing or exceeds its budget")
    return selected.read_bytes()


def reachable(edges: dict, source: str, target: str) -> bool:
    pending, seen = deque([source]), {source}
    while pending:
        route = pending.popleft()
        if route == target:
            return True
        for following in edges.get(route, ()):
            if following not in seen:
                seen.add(following)
                pending.append(following)
    return False


def render_walkthrough(bundle: dict, root: Path = ROOT) -> dict[str, str]:
    case = json.loads(source_bytes("walkthrough.case.json", root))
    if case.get("schema") != "okf-bundle-walkthrough-case.v1":
        raise ValueError("unknown walkthrough case schema")
    markdown = source_bytes("walkthrough.md", root).decode("utf-8")
    question_match = re.search(r"(?ms)^## Question\n\n(.+?)(?:\n\n|\Z)", markdown)
    if not question_match:
        raise ValueError("walkthrough needs its authored question")
    question = " ".join(question_match.group(1).split())
    corpus = bundle["corpora"]["ai-infrastructure-wiki"]
    nodes, relationships = corpus["nodes"], corpus["relationships"]
    for route, fields in case.get("expected_absent_fields", {}).items():
        if route not in nodes or not isinstance(fields, list):
            raise ValueError("walkthrough metadata expectations need known source records")
        for field in fields:
            if nodes[route].get("frontmatter", {}).get(field) not in (None, "", []):
                raise ValueError("walkthrough qualification no longer matches source metadata")
    edge_rows, adjacency = defaultdict(list), defaultdict(set)
    for row in relationships:
        if row.get("relationship_role") == "concept":
            edge_rows[(row["source"], row["target"])].append(row)
            adjacency[row["source"]].add(row["target"])
    trails = case.get("trails")
    if not isinstance(trails, list) or not 1 <= len(trails) <= 8:
        raise ValueError("walkthrough needs one to eight bounded source trails")
    source_rows, verified_trails, svg_rows = {}, [], []
    for lane, trail in enumerate(trails):
        routes = trail.get("routes")
        if not isinstance(routes, list) or not 1 <= len(routes) <= 4:
            raise ValueError("walkthrough trail needs one to four known concepts")
        assertions = []
        y = 76 + lane * 145
        svg_rows.append(f'<text x="20" y="{y - 20}" font-size="19">{escape(trail["label"])}</text>')
        for column, route in enumerate(routes):
            if route not in nodes or nodes[route].get("core_role") != "concept":
                raise ValueError(f"walkthrough route is not a concept: {route}")
            payload = source_bytes(route, root)
            node = nodes[route]
            source_rows[route] = {"route": route, "semantic_id": node["semantic_id"],
                                  "sha256": sha256(payload).hexdigest(), "bytes": len(payload)}
            x = 20 + column * 240
            svg_rows.append(f'<rect x="{x}" y="{y}" width="210" height="86" rx="4" fill="#f3f2f1" stroke="#505a5f"/>')
            for line, label in enumerate(textwrap.wrap(node["title"], 22)):
                svg_rows.append(f'<text x="{x + 12}" y="{y + 27 + line * 23}" font-size="17">{escape(label)}</text>')
            if column:
                rows = edge_rows.get((routes[column - 1], route), [])
                if not rows:
                    raise ValueError("walkthrough would invent a directed relationship")
                assertions.extend({k: row[k] for k in ("id", "source", "target", "source_iri", "target_iri", "predicate", "assertion_status")} for row in rows)
                svg_rows.append(f'<path d="M{x - 28} {y + 43} H{x - 5}" fill="none" stroke="#0b0c0c" stroke-width="2" marker-end="url(#arrow)"/>')
        verified_trails.append({"label": trail["label"], "routes": routes, "assertions": assertions})
    negative = []
    for source, target in case.get("no_directed_concept_path", []):
        if source not in nodes or target not in nodes or reachable(adjacency, source, target):
            raise ValueError("walkthrough negative control no longer matches the concept graph")
        negative.append({"source": source, "target": target, "result": "no-directed-concept-path"})
    height = 76 + len(trails) * 145
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 990 {height}" role="img" aria-labelledby="title description">'
           '<title id="title">Source trails for the council tool-access question</title>'
           '<desc id="description">Separate search lanes. Arrows are existing directed concept references, not an assurance or an invented connection between lanes.</desc>'
           '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10" fill="#0b0c0c"/></marker></defs>'
           '<g fill="#0b0c0c" font-family="Arial, sans-serif">' + "".join(svg_rows) +
           f'<text x="20" y="{height - 12}" font-size="17">Arrows show derived references. Separate lanes do not imply a graph connection.</text></g></svg>\n')
    data = {"schema": "okf-bundle-walkthrough-data.v1", "id": case["id"], "question": question,
            "scope": "Local source/graph trail and negative controls only; live browser, remote AI access and release acceptance are separate.",
            "okf_version": bundle["okf_version"], "graph": "okf-bundle.jsonld", "descriptor": "okf-bundle.json",
            "source_documents": list(source_rows.values()), "trails": verified_trails, "negative_controls": negative,
            "authored_walkthrough_sha256": sha256(markdown.encode()).hexdigest()}
    data["case_sha256"] = sha256(source_bytes("walkthrough.case.json", root)).hexdigest()
    graph_bytes = (json.dumps(build_okf_bundle.build_semantic_document(bundle)[0], ensure_ascii=False,
                              sort_keys=True, indent=2) + "\n").encode()
    descriptor_bytes = (json.dumps(bundle, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    data.update({"graph_sha256": sha256(graph_bytes).hexdigest(),
                 "descriptor_sha256": sha256(descriptor_bytes).hexdigest(),
                 "bundle_id": bundle["bundle_id"], "version": bundle["version"], "snapshot": bundle["snapshot"]})
    body = MarkdownIt("commonmark", {"html": False}).render(markdown)
    diagram = '<p>On a small screen, scroll the diagram sideways. The full steps and source links follow below.</p><div class="diagram" role="region" aria-label="Directed source trails; scroll horizontally on a small screen" tabindex="0"><img src="walkthrough.svg" alt="Separate source trails for consent and evidence, registry and delegation, and security. The full steps follow below."></div>'
    question_end = body.index("</p>", body.index("<h2>Question</h2>")) + 4
    body = body[:question_end] + diagram + body[question_end:]
    document = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width"><title>Council tool-access evidence walkthrough</title><link rel="icon" href="data:,">'
                '<style>body{font:18px/1.6 system-ui;color:#0b0c0c;background:#fff;max-width:1100px;margin:2rem auto;padding:0 1.5rem}a{color:#1d70b8}.diagram{overflow:auto}.diagram img{width:100%;min-width:850px}code{overflow-wrap:anywhere}h2{margin-top:2rem}</style></head><body>'
                '<header><nav aria-label="Bundle"><a href="index.html">Explorer reference bundle</a></nav></header><main>'
                + body + '</main></body></html>\n')
    return {"walkthrough.html": document, "walkthrough.svg": svg,
            "walkthrough-data.json": json.dumps(data,ensure_ascii=False,indent=2,sort_keys=True)+"\n"}
