"""Generate a bundle-specific, source-linked complex-question visual."""

import argparse
from html import escape
import gzip
import hashlib
import json
from pathlib import Path
import re
import textwrap
from urllib.parse import quote, urlencode, urlsplit

from capture import sha
from build_core_projection import document as core_document

SITE = "https://chris-page-gov.github.io/okf-hansard/"
READER = "https://chris-page-gov.github.io/okf-explorer/explore/"


def link(url, label):
    parsed = urlsplit(url)
    if (parsed.scheme not in {"", "http", "https"} or url.startswith("//")
            or "\\" in url or parsed.username or parsed.password
            or any(ord(character) < 32 or ord(character) == 127 for character in url)):
        raise ValueError("Unsafe walkthrough source link")
    return f'<a href="{escape(url, quote=True)}">{escape(label)}</a>'


def explorer(asset, view, route="", *, base=SITE):
    query = urlencode({"bundle": base + asset, "view": view})
    return READER + "?" + query + ("#" + quote(route) if route else "")


def graph_record(graph, route):
    locator = json.loads((graph / "records/locator.json").read_bytes())
    value = 0x811C9DC5
    for part in route.encode("utf-8"):
        value = ((value ^ part) * 0x01000193) & 0xFFFFFFFF
    bucket = f"{value >> 24:02x}"
    reference = locator["buckets"][bucket]
    raw = (graph / reference["path"]).read_bytes()
    if sha(raw) != reference["sha256"]:
        raise ValueError("The record route bucket digest does not match its descriptor")
    position = json.loads(raw).get(route)
    if not position:
        raise ValueError(f"Missing required record route {route}")
    rows = json.loads((graph / locator["record_chunks"][position[0]]).read_bytes())
    return rows[position[1]]


def incident_edges(graph, route):
    runtime = json.loads((graph / "relationships/runtime.json").read_bytes())
    locator_ref = runtime["route_locator"]
    locator_raw = (graph / locator_ref["path"]).read_bytes()
    if sha(locator_raw) != locator_ref["sha256"]:
        raise ValueError("The relationship route locator digest does not match its descriptor")
    locator = json.loads(locator_raw)
    prefix = hashlib.sha256(route.encode("utf-8")).hexdigest()[:2]
    bucket_ref = next((row for row in locator["buckets"] if row["bucket"] == prefix), None)
    if bucket_ref is None:
        return []
    bucket_raw = (graph / "relationships" / f"bucket-{prefix}.json.gz").read_bytes()
    if sha(bucket_raw) != bucket_ref["sha256"]:
        raise ValueError("The relationship route bucket digest does not match its descriptor")
    bucket = json.loads(gzip.decompress(bucket_raw))
    route_ref = next((row for row in bucket["routes"] if row["route"] == route), None)
    if route_ref is None:
        return []
    found = []
    for chunk in route_ref["chunks"]:
        rows = json.loads(gzip.decompress((graph / chunk).read_bytes()))
        found.extend(row for row in rows if row["source"] == route or row["target"] == route)
    return found


def week_case(site):
    demo = json.loads((site / "demo.json").read_bytes())
    timeline = json.loads((site / "demo-timeline.json").read_bytes())
    case = next(row for row in demo["examples"] if row["id"] == "railways-bill")
    rows = sorted(case["rows"], key=lambda row: (row["date"], row["house"], row["title"]))
    if len(rows) != 3:
        raise ValueError("The Railways Bill walkthrough requires the complete three-record trail")
    timeline_nodes = timeline["corpora"]["hansard"]["nodes"]
    route = next((node["id"] for node in timeline_nodes.values()
                  if node.get("url") == rows[0]["url"]), None)
    if route is None:
        raise ValueError("The week Railways Bill source is missing from its timeline bundle")
    sources = [{"date": row["date"], "house": row["house"], "title": row["title"], "url": row["url"]}
               for row in rows]
    answer = ("The captured trail lists " + "; ".join(
        f"{row['title']} in the {row['house']} on {row['date']}" for row in rows)
        + ". These are three linked records, not a complete legal history of the Bill.")
    return {
        "id": "hansard-week-railways-bill-v1",
        "question": "Which recorded stages of Bill 4030 appear in the Commons and Lords, in date order, and what does this evidence not establish?",
        "answer": answer,
        "scope": "Three explicit Hansard stage records surfaced by the week bundle's worked Railways Bill example; the 18 November record is within the captured November extension.",
        "sources": sources,
        "negative_control": "A name or alias match alone does not establish substantive relevance. This trail does not establish enactment, legal effect, or that no other stages occurred.",
        "graph": {"descriptor": "graph/okf-explorer.json", "timeline": "demo-timeline.json", "route": route,
                  "entry_route": "dataset/debate/lords-2026-11-18-debate-5ee3bf1a-449e-4d6d-a0ce-f725ce734996.md"},
        "coverage": {"from": "2026-11-16", "through": "2026-11-19", "observed_on": "2026-11-20"},
    }


def month_case(site):
    coverage = json.loads((site / "coverage.json").read_bytes())
    days = coverage["dates"]
    if not days:
        raise ValueError("November walkthrough requires date-by-date coverage evidence")
    latest = max(row["date"] for row in days)
    through_rows = [row for row in days if row["date"] <= latest]
    records = []
    for row in sorted(through_rows, key=lambda item: item["date"]):
        houses = row.get("houses", {})
        contributions = sum(value.get("contributions", 0) for value in houses.values())
        records.append({"date": row["date"], "contributions": contributions,
                        "commons": houses.get("Commons", {}).get("contributions", 0),
                        "lords": houses.get("Lords", {}).get("contributions", 0),
                        "commons_status": houses.get("Commons", {}).get("status", "unrecorded"),
                        "lords_status": houses.get("Lords", {}).get("status", "unrecorded")})
    total = sum(row["contributions"] for row in records)
    route = "dataset/debate/lords-2026-11-18-debate-5ee3bf1a-449e-4d6d-a0ce-f725ce734996.md"
    record = graph_record(site / "graph", route)
    business_edge = next((edge for edge in incident_edges(site / "graph", route)
                          if edge["source"] == route and edge["target"] == "dataset/entity/bill-4030.md"
                          and edge["kind"] == "has business concerning"), None)
    if not business_edge:
        raise ValueError("The 18 November Lords Railways Bill business assertion is absent")
    day = next(row for row in records if row["date"] == "2026-11-18")
    answer = (f"The graph links the 18 November Lords proceedings section ‘{record['title']}’ to Bill 4030 "
              f"with a ‘{business_edge['kind']}’ assertion. Date coverage records {day['commons']:,} Commons "
              f"and {day['lords']:,} Lords contributions that day. It does not establish that the Commons "
              "discussed this Bill or that the Bill passed. The full snapshot records "
              f"{total:,} contributions across {len(records)} date entries through {latest}; a no-calendar-sitting "
              "entry differs from a source gap, and dates after the cutoff remain outside scope.")
    return {
        "id": "hansard-november-coverage-v1",
        "question": f"On 18 November, which House’s proceedings are linked to Bill 4030, what does the same-date coverage say about Commons and Lords activity, and can those records establish that the Commons debated or the Bill passed? How far does this snapshot cover?",
        "answer": answer,
        "scope": f"The generated November coverage record has {len(records)} date entries from {min(row['date'] for row in records)} through {latest}; later November dates are outside this snapshot.",
        "dates": records,
        "sources": [{"title": "18 November Lords Railways Bill proceedings", "url": record["url"]},
                    {"title": "Date-by-date coverage and verification", "url": "coverage.json"},
                    {"title": "November sitting and contribution finder", "url": "history.html"}],
        "negative_control": f"The presence of Commons activity on 18 November does not establish Commons debate on Bill 4030. A search returning no result after {latest} is outside this snapshot’s declared coverage.",
        "graph": {"descriptor": "graph/okf-explorer.json", "history": "history.html",
                  "route": route, "entry_route": route, "target_route": "dataset/entity/bill-4030.md",
                  "assertion_id": business_edge["id"], "assertion_kind": business_edge["kind"]},
        "coverage": {"from": min(row["date"] for row in records), "through": latest,
                     "contributions": total, "graph_records": coverage.get("graph_records"),
                     "assertions": coverage.get("assertions")},
    }


def svg(case, month):
    if month:
        rows = case["dates"]
        width, row_height = 900, 24
        maximum = max((row["contributions"] for row in rows), default=1) or 1
        height = 80 + row_height * len(rows)
        bars = []
        for i, row in enumerate(rows):
            y = 42 + i * row_height
            count = row["contributions"]
            length = round(500 * count / maximum)
            colour = "#176b5b" if count else "#a5a5a5"
            bars.append(f'<text x="18" y="{y+14}">{row["date"]}</text><rect x="135" y="{y}" width="{length}" height="16" fill="{colour}"/><text x="{145+length}" y="{y+14}">{count:,} contributions</text>')
        return f'<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 {width} {height}"><title id="title">Daily contribution coverage</title><desc id="desc">Observed November date entries through {escape(case["coverage"]["through"])}; grey zero bars denote dates with no captured contributions, not dates beyond the snapshot.</desc><text x="18" y="24">Date</text><text x="135" y="24">Total contributions</text>{"".join(bars)}</svg>'
    rows = case["sources"]
    width, height = 900, 180
    positions = [100, 410, 720]
    points = []
    for i, (row, x) in enumerate(zip(rows, positions)):
        title = escape(row["title"])
        label = f'{row["date"]} · {row["house"]}'
        points.append(f'<g><circle cx="{x}" cy="80" r="20" fill="#176b5b"/><text x="{x}" y="125" text-anchor="middle">{escape(label)}</text><text x="{x}" y="146" text-anchor="middle">{title[:45]}</text></g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 {width} {height}"><title id="title">Railways Bill stage trail</title><desc id="desc">Three retained records in chronological order. Official source links are listed below the diagram.</desc><line x1="100" y1="80" x2="720" y2="80" stroke="#777" stroke-width="3"/>{"".join(points)}</svg>'


def mobile_svg(case, month, *, compact=False):
    if month and not compact:
        rows = case['dates']
        maximum = max((row['contributions'] for row in rows), default=1) or 1
        marks = []
        for index, row in enumerate(rows):
            y = 55 + index * 25
            length = round(135 * row['contributions'] / maximum)
            marks.append(f'<text x="8" y="{y+12}">{escape(row["date"])}</text><rect x="110" y="{y}" width="{length}" height="16" fill="#176b5b"/><text x="255" y="{y+12}">{row["contributions"]:,}</text>')
        content = '<text x="8" y="25">Date</text><text x="110" y="25">Total contributions</text>' + ''.join(marks)
        height = 75 + 25 * len(rows)
        title = 'Daily contribution totals within this snapshot'
    else:
        if compact:
            steps = [('Read the compact source', f'{case["typed_concepts"]} typed documents', 'Exact Markdown and digests'),
                     ('Check the citations', 'Zero graph relationships', 'Keep the source scope'),
                     ('Retrieve further evidence', 'Coverage or full graph', 'Declare the new scope')]
            title = 'Read, check and extend the compact evidence'
        else:
            steps = [(row['date'] + ' · ' + row['house'], *textwrap.wrap(row['title'], width=29))
                     for row in case['sources']]
            title = 'Three captured Bill-stage sources in date order'
        marks = []
        for index, lines in enumerate(steps):
            y = 15 + index * 180
            marks.append(f'<rect x="10" y="{y}" width="320" height="135" rx="8" fill="#edf4fa" stroke="#172f4d"/>')
            for position, line in enumerate(lines):
                marks.append(f'<text x="170" y="{y+38+position*27}" text-anchor="middle">{escape(line)}</text>')
            if index < len(steps)-1:
                marks.append(f'<path d="M170 {y+135}V{y+173}m-6-8 6 8 6-8" fill="none" stroke="#172f4d" stroke-width="2"/>')
        content = ''.join(marks)
        height = 160 + (len(steps)-1)*180
    font = 12 if month and not compact else 16
    return f'<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 340 {height}"><title id="title">{title}</title><desc id="desc">Read the accompanying answer, source links and negative controls for the evidence boundary.</desc><g fill="#172f4d" font-family="system-ui" font-size="{font}">{content}</g></svg>\n'


def responsive_picture(stem, alternative):
    return (f'<picture><source media="(max-width: 600px)" srcset="{stem}-mobile.svg">'
            f'<img src="{stem}.svg" alt="{escape(alternative, quote=True)}" '
            'style="display:block;width:100%;height:auto"></picture>'
            f'<p>{link(stem + ".svg", "Open the full-size diagram")}</p>')


def build_core_walkthrough(site, *, month=False):
    raw = (site / "okf-core.json").read_bytes()
    descriptor = json.loads(raw)
    corpus = descriptor["corpora"]["hansard"]
    if corpus["relationships"]:
        raise ValueError("The compact-core walkthrough requires its declared zero-edge scope")
    documents, sources = {}, []
    for route, node in corpus["nodes"].items():
        path = site / node["source_path"]
        if not path.resolve().is_relative_to(site.resolve()) or path.is_symlink():
            raise ValueError("Core walkthrough source escapes the publication")
        source = path.read_bytes()
        doc = core_document(path, site / "okf")
        if (len(source) != node["source_bytes"] or sha(source) != node["source_sha256"]
                or source.decode() != node["source_markdown"]
                or doc["frontmatter"] != node["source_frontmatter"]
                or doc["body"] != node["body"]):
            raise ValueError("Core walkthrough source differs from its Reader projection")
        documents[route] = doc
        sources.append({"path": node["source_path"], "route": route,
                        "sha256": node["source_sha256"], "bytes": len(source), "role": node["core_role"]})
    concepts = [doc for doc in documents.values() if doc["role"] == "concept"]
    if len(concepts) != (1 if month else 3):
        raise ValueError("Changed compact-core scope requires a reviewed question")
    if month:
        description = documents["sittings.md"]["frontmatter"]["description"]
        interval = re.search(r"from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})", description)
        if not interval:
            raise ValueError("The sitting source does not declare the required date interval")
        question = "What dates does the compact November entry point declare, can this one-record bundle establish which House debated Bill 4030, and where must I go to check those claims?"
        answer = (f"The sitting entry point declares captured sittings from {interval[1]} to {interval[2]}. "
                  "It has one typed evidence index and no graph relationships. It links to the coverage report, "
                  "contribution finder and full graph. The compact record alone cannot establish which House "
                  "debated Bill 4030 or that the Bill passed; those questions require separately retrieved evidence.")
        negative = ["A linked coverage report is not evidence already read from this compact record.",
                    "No Bill or House relationship can be inferred from its zero-edge core graph."]
        stage_sources = []
    else:
        body = documents["railways-bill.md"]["body"]
        pattern = r"^- (\d{4}-\d{2}-\d{2}) · (Commons|Lords) · Formal Bill stage · \[([^\]]+)\]\((https://hansard\.parliament\.uk/[^)]+)\)$"
        matches = sorted(re.findall(pattern, body, re.MULTILINE))
        if len(matches) != 3:
            raise ValueError("The compact Bill source must contain its three explicit stage citations")
        stage_sources = [{"date": day, "house": house, "title": title, "url": url}
                         for day, house, title, url in matches]
        question = "Using only the compact week entry point, which formal Bill 4030 stages are cited, in which House and date order, and can this bundle prove a complete legislative history?"
        answer = ("The compact Railways Bill document cites " + "; ".join(
            f"{row['title']} in the {row['house']} on {row['date']}" for row in stage_sources)
            + ". These are explicit source citations in one of three typed entry-point documents. "
              "The compact projection asserts no graph relationships; it does not prove a complete Bill history, enactment or legal effect.")
        negative = ["Three cited stages do not establish that there were no other stages.",
                    "A link or shared name does not establish a governed relationship or legal effect."]
    case = {"schema": "hansard-compact-core-question.v1", "id": "hansard-" + ("november" if month else "week") + "-compact-core",
            "question": question, "answer": answer, "negative_controls": negative,
            "bundle_descriptor": "okf-core.json", "descriptor_sha256": sha(raw),
            "expected_identity": {key: descriptor[key] for key in ("schema", "id", "version", "snapshot")},
            "typed_concepts": len(concepts), "graph_relationships": 0,
            "source_documents": sources, "stage_citations_from_core_body": stage_sources,
            "scope": "Only the exact compact Markdown source and its explicit citations; full-graph assertions and linked external contents are outside this answer."}
    visual = f'''<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 900 210"><title id="title">Compact core question and evidence boundary</title><desc id="desc">Read {len(concepts)} typed entry-point documents, inspect their exact source citations, then retrieve separate evidence before making a graph claim.</desc><path d="M270 100H330M570 100H630" stroke="#172f4d" stroke-width="3"/><g fill="#edf4fa" stroke="#172f4d"><rect x="10" y="35" width="260" height="130" rx="8"/><rect x="330" y="35" width="240" height="130" rx="8"/><rect x="630" y="35" width="260" height="130" rx="8"/></g><g fill="#172f4d" font-family="system-ui" font-size="17" text-anchor="middle"><text x="140" y="75">Read the compact source</text><text x="140" y="110">{len(concepts)} typed documents</text><text x="140" y="140">Exact Markdown and digests</text><text x="450" y="75">Check the citations</text><text x="450" y="110">Zero graph relationships</text><text x="450" y="140">Preserve the source scope</text><text x="760" y="75">Retrieve further evidence</text><text x="760" y="110">Coverage or full graph</text><text x="760" y="140">Keep the new scope explicit</text></g></svg>\n'''
    case["svg_sha256"] = sha(visual.encode())
    mobile = mobile_svg(case, month, compact=True)
    case["mobile_svg_sha256"] = sha(mobile.encode())
    (site / "core-walkthrough-mobile.svg").write_text(mobile)
    (site / "core-walkthrough.json").write_text(json.dumps(case, ensure_ascii=False, indent=2) + "\n")
    (site / "core-walkthrough.svg").write_text(visual)
    rows = "".join(f'<tr><th scope="row">{link(row["path"], row["path"])}</th><td>{escape(row["role"])}</td><td>{row["sha256"]}</td></tr>' for row in sources)
    official = "".join(f'<li>{link(row["url"], row["title"])} · {row["date"]} · {row["house"]}</li>' for row in stage_sources)
    html = f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hansard compact-core question walkthrough</title><style>body{{font:1rem/1.55 system-ui;margin:0;color:#172f4d}}main{{max-width:70rem;margin:2rem auto;padding:0 1rem}}svg{{width:100%;height:auto}}table{{border-collapse:collapse;table-layout:fixed;width:100%}}th,td{{text-align:left;vertical-align:top;border:1px solid #aaa;padding:.5rem;overflow-wrap:anywhere}}a{{color:#004b80}}.limit{{border-left:4px solid #7a3e00;background:#fff6e5;padding:1rem}}</style></head><body><main><p>{link("okf/index.md", "Compact Markdown index")} · {link("walkthrough.html", "Full-graph question walkthrough")}</p><h1>Question for this compact bundle</h1><p>{escape(question)}</p><h2>Answer from this bundle</h2><p>{escape(answer)}</p><p class="limit">{escape(case["scope"])}</p><h2>Visual evidence journey</h2>{visual}<h2>Exact source documents</h2><table><caption>All documents in this compact source root</caption><thead><tr><th scope="col">Document</th><th scope="col">Role</th><th scope="col">SHA-256</th></tr></thead><tbody>{rows}</tbody></table>{'<h2>Stage citations in the compact body</h2><ul>'+official+'</ul>' if official else ''}<h2>Negative controls</h2><ul>{''.join('<li>'+escape(value)+'</li>' for value in negative)}</ul><h2>Continue with a declared scope</h2><p>{link(explorer("okf-core.json", "reader", "sittings.md" if month else "railways-bill.md", base=SITE + ("november/" if month else "")), "Read this compact bundle in Explorer")} · {link("core-walkthrough.json", "Machine-readable question and source bindings")} · {link("coverage.json", "Retrieve the separate coverage report")} · {link("graph/okf-explorer.json", "Retrieve the separate full-graph descriptor")}</p></main></body></html>\n'''
    html = html.replace(visual, responsive_picture('core-walkthrough', 'Read the compact source, check citations and retrieve separate evidence.'))
    (site / "core-walkthrough.html").write_text(html)
    return {"id": case["id"], "descriptor_sha256": case["descriptor_sha256"],
            "typed_concepts": len(concepts), "graph_relationships": 0}


def build(site, *, month=False):
    compact = build_core_walkthrough(site, month=month)
    case = month_case(site) if month else week_case(site)
    descriptor_raw = (site / case["graph"]["descriptor"]).read_bytes()
    descriptor = json.loads(descriptor_raw)
    case["expected_identity"] = {key: descriptor[key] for key in ("schema", "id", "version", "snapshot")}
    case["descriptor_sha256"] = sha(descriptor_raw)
    reader_interaction = {
        "keyboard_navigation": "Focus the target graph node and press Enter to open its record.",
        "target_route": "dataset/entity/bill-4030.md",
        "keyboard_acceptance": "replayable",
        "pointer_selection": "replayable-with-reader-0.9.0",
        "pointer_requirement": "The Bill card mouse journey was replayed with Reader 0.9.0. Use keyboard activation with an earlier Reader that intercepts the click.",
    }
    case["reader_interaction"] = reader_interaction
    visual = svg(case, month) + "\n"
    mobile = mobile_svg(case, month)
    (site / "walkthrough-mobile.svg").write_text(mobile)
    case["mobile_svg_sha256"] = sha(mobile.encode())
    case["svg_sha256"] = sha(visual.encode())
    case["source_projection_sha256"] = sha((site / "okf-core.json").read_bytes())
    (site / "walkthrough.json").write_text(json.dumps(case, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (site / "walkthrough.svg").write_text(visual, encoding="utf-8")
    source_links = ([link(row["url"], f'{row["date"]} · {row["house"]} · {row["title"]}') for row in case["sources"]]
                    if not month else [link(row["url"], row["title"]) for row in case["sources"]])
    descriptor = case["graph"]["descriptor"]
    graph_url = explorer(descriptor, "graph", case["graph"]["entry_route"],
                         base=SITE + ("november/" if month else ""))
    other = (explorer("demo-timeline.json", "timeline", case["graph"].get("route", ""))
             if not month else "history.html")
    html = f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hansard source walkthrough</title><link rel="icon" href="data:,"><link rel="stylesheet" href="site.css"><style>main{{max-width:70rem;margin:2rem auto;padding:0 1rem;font:1rem/1.55 system-ui}}svg{{max-width:100%;height:auto}}svg text{{font:13px system-ui}}.negative{{border-left:4px solid #7a3e00;padding:.5rem 1rem;background:#fff6e5}}.sources li{{margin:.6rem 0}}</style></head>
<body><main><p><a href="okf/index.md">OKF source index</a></p><h1>Question, evidence and coverage</h1><h2>Question</h2><p>{escape(case["question"])}</p><h2>Answer from the inspected bundle</h2><p>{escape(case["answer"])}</p><p><strong>Scope:</strong> {escape(case["scope"])}</p><h2>Visual source trail</h2>{visual}<h2>Sources</h2><ul class="sources">{"".join("<li>"+item+"</li>" for item in source_links)}</ul><h2>Graph and Reader</h2><p>{link(graph_url, "Open the graph in OKF Explorer")} · {link(other, "Open the related timeline or date finder")}</p><p>To follow the Bill 4030 graph node, focus it and press Enter. The browser journey checks the exact destination route.</p><p>{escape(reader_interaction["pointer_requirement"])}</p><p>{link("core-walkthrough.html", "Read the separate compact-core question walkthrough")}</p>{f'<p class="negative"><strong>Pointer limitation:</strong> {escape(reader_interaction["pointer_limitation"])}</p>' if reader_interaction.get("pointer_limitation") else ''}<p class="negative"><strong>Negative control:</strong> {escape(case["negative_control"])}</p><p>See the <a href="walkthrough.json">machine-readable walkthrough and source references</a>, <a href="okf-core.json">focused core Reader projection</a>, <a href="graph/okf-explorer.json">full source and graph descriptor</a> and <a href="coverage.json">coverage receipt</a>.</p></main></body></html>'''
    html = html.replace(visual, responsive_picture('walkthrough', 'Daily captured contribution totals.' if month else 'Three captured Bill-stage records in date order.'))
    (site / "walkthrough.html").write_text(html, encoding="utf-8")
    return {"id": case["id"], "svg_sha256": case["svg_sha256"],
            "projection_sha256": case["source_projection_sha256"],
            "source_count": len(case.get("sources", [])),
            "coverage": case["coverage"], "compact_core_walkthrough": compact}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path)
    parser.add_argument("--month", action="store_true")
    args = parser.parse_args()
    print(json.dumps(build(args.site, month=args.month), indent=2))
