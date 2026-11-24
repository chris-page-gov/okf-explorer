"""Render the teaching bundle's source-linked question without network access."""

from collections import defaultdict, deque
from hashlib import sha256
from html import escape
import json
from urllib.parse import quote

from markdown_it import MarkdownIt


def quote_text(value: str, references: dict | None = None) -> str:
    environment = {'references': {label: {'href': href, 'title': ''} for label, href in (references or {}).items()}}
    return ''.join(token.content if token.type in {'text', 'code_inline'} else ' ' if token.type in {'softbreak', 'hardbreak'} else ''
                   for block in MarkdownIt('commonmark', {'html': False}).parseInline(value, environment)
                   for token in block.children or [])


def reachable(adjacency: dict, source: str, target: str) -> bool:
    pending, seen = deque([source]), {source}
    while pending:
        route = pending.popleft()
        if route == target:
            return True
        for following in adjacency.get(route, ()):
            if following not in seen:
                seen.add(following)
                pending.append(following)
    return False


def render_walkthrough(bundle: dict, inputs: dict[str, bytes], descriptor: bytes) -> dict[str, bytes]:
    case = json.loads(inputs['walkthrough.case.json'])
    if case.get('schema') != 'okf-study-club-walkthrough-case.v1':
        raise ValueError('unknown study-club walkthrough case schema')
    corpus = bundle['corpora']['study-club']
    nodes, edges = corpus['nodes'], corpus['relationships']
    claims = case.get('claims')
    if not isinstance(claims, list) or not 1 <= len(claims) <= 60:
        raise ValueError('walkthrough needs one to 60 bounded claims')
    for claim in claims:
        if (not isinstance(claim, dict) or claim.get('source') not in nodes
                or not all(isinstance(claim.get(key), str) and claim[key].strip()
                           for key in ('quote', 'answer'))
                or claim['quote'] not in nodes[claim['source']]['body']):
            raise ValueError('walkthrough quotation or source no longer matches the Markdown')
    if {claim['source'] for claim in claims} != set(nodes):
        raise ValueError('the worked question must inspect every teaching record')
    adjacency = defaultdict(set)
    for edge in edges:
        adjacency[edge['source']].add(edge['target'])
    negatives = []
    controls = case.get('no_directed_path')
    if not isinstance(controls, list) or not 1 <= len(controls) <= 60:
        raise ValueError('walkthrough needs bounded absent-path controls')
    for source, target in controls:
        if source not in nodes or target not in nodes or reachable(adjacency, source, target):
            raise ValueError('walkthrough absent-path control no longer matches the graph')
        negatives.append({'source': source, 'target': target, 'result': 'no-directed-reference-path'})
    question = case.get('question')
    if not isinstance(question, str) or not question.strip():
        raise ValueError('walkthrough needs an authored question')
    sources = [{'route': route, 'sha256': sha256(inputs[route]).hexdigest(),
                'bytes': len(inputs[route]), 'frontmatter': node['frontmatter'],
                'body': node['body'], 'source_text': inputs[route].decode('utf-8')}
               for route, node in sorted(nodes.items())]
    data = {'schema': 'okf-study-club-walkthrough-data.v1', 'id': case['id'],
            'bundle_id': bundle['bundle_id'], 'version': bundle['version'], 'snapshot': bundle['snapshot'],
            'okf_version': bundle['okf_version'], 'question': question, 'claims': claims,
            'descriptor': 'okf-bundle.json', 'descriptor_sha256': sha256(descriptor).hexdigest(),
            'case_sha256': sha256(inputs['walkthrough.case.json']).hexdigest(),
            'source_documents': sources, 'relationships': edges, 'negative_controls': negatives,
            'scope': 'Fictional teaching records and all derived references. No domain predicate, real-world assurance, AI answer fidelity or service availability is inferred.'}
    rows = []
    for number, edge in enumerate(edges):
        y = 30 + number * 112
        left, right = (escape(nodes[edge[key]]['title']) for key in ('source', 'target'))
        rows.append(f'<rect x="12" y="{y}" width="268" height="72" rx="4" fill="#f3f2f1" stroke="#505a5f"/>'
                    f'<rect x="392" y="{y}" width="268" height="72" rx="4" fill="#f3f2f1" stroke="#505a5f"/>'
                    f'<text x="24" y="{y + 43}">{left}</text><text x="404" y="{y + 43}">{right}</text>'
                    f'<path d="M286 {y + 36} H382" stroke="#0b0c0c" stroke-width="2" marker-end="url(#arrow)"/>'
                    f'<text x="293" y="{y + 17}" font-size="16">references</text>')
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 672 ' + str(38 + len(edges) * 112) + '" '
           'role="img" aria-labelledby="title description"><title id="title">All directed study-club references</title>'
           '<desc id="description">Each row shows an existing source-to-target reference. Arrows are not domain assertions. The complete text list follows the image.</desc>'
           '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10" fill="#0b0c0c"/></marker></defs>'
           '<g font-family="Arial,sans-serif" font-size="20" fill="#0b0c0c">' + ''.join(rows) + '</g></svg>\n')
    mobile_rows = []
    for number, edge in enumerate(edges):
        y = 14 + number * 230
        left, right = (escape(nodes[edge[key]]['title']) for key in ('source', 'target'))
        mobile_rows.append(f'<rect x="10" y="{y}" width="300" height="62" rx="4" fill="#f3f2f1" stroke="#505a5f"/>'
                           f'<text x="24" y="{y + 38}">{left}</text>'
                           f'<path d="M55 {y + 68} V{y + 120}" stroke="#0b0c0c" stroke-width="2" marker-end="url(#arrow)"/>'
                           f'<text x="74" y="{y + 100}" font-size="17">references</text>'
                           f'<rect x="10" y="{y + 130}" width="300" height="62" rx="4" fill="#f3f2f1" stroke="#505a5f"/>'
                           f'<text x="24" y="{y + 168}">{right}</text>')
    mobile_svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 ' + str(len(edges) * 230) + '" '
                  'role="img" aria-labelledby="title description"><title id="title">All directed study-club references</title>'
                  f'<desc id="description">{len(edges)} separate top-to-bottom source references, listed in text after the image.</desc>'
                  '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10" fill="#0b0c0c"/></marker></defs>'
                  '<g font-family="Arial,sans-serif" font-size="19" fill="#0b0c0c">' + ''.join(mobile_rows) + '</g></svg>\n')
    answers = ''.join('<li><p>' + escape(c['answer']) + '</p><p>Source: <a href="' + escape(c['source'], quote=True)
                      + '">' + escape(nodes[c['source']]['title']) + '</a>. Recorded text: <q>' + escape(c['quote'])
                      + '</q></p></li>' for c in [{**row, 'quote': quote_text(row['quote'], nodes[row['source']]['markdown_references'])} for row in claims])
    references = ''.join('<li><a href="' + escape(e['source'], quote=True) + '">' + escape(nodes[e['source']]['title'])
                         + '</a> references <a href="' + escape(e['target'], quote=True) + '">' + escape(nodes[e['target']]['title'])
                         + '</a>.</li>' for e in edges)
    controls = ''.join('<li>No directed reference path from ' + escape(nodes[c['source']]['title'])
                       + ' to ' + escape(nodes[c['target']]['title']) + '.</li>' for c in negatives)
    source_details = ''.join('<details><summary>' + escape(nodes[s['route']]['title']) + ': complete source and hash</summary>'
                             + '<p><code>' + escape(s['route']) + '</code><br>SHA-256: <code>' + s['sha256']
                             + '</code></p><pre>' + escape(s['source_text']) + '</pre></details>' for s in sources)
    transport = 'https://chris-page-gov.github.io/okf-explorer/docs/examples/first-bundle/okf-bundle.json'
    reader = 'https://chris-page-gov.github.io/okf-explorer/explore/?bundle=' + quote(transport, safe='') + '#records/data-drop-in.md'
    html = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
            '<title>Study-club evidence walkthrough</title><link rel="icon" href="data:,">'
            '<style>body{font:18px/1.6 system-ui;color:#0b0c0c;background:white;max-width:1000px;margin:2rem auto;padding:0 1rem}'
            'a{color:#1d70b8}h1{line-height:1.2}h2{margin-top:2rem}.diagram img{width:100%;height:auto}'
            'pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f2f1;padding:1rem}code{overflow-wrap:anywhere}'
            'details{margin:1rem 0}summary{cursor:pointer}li{margin-bottom:1rem}:focus-visible{outline:3px solid #ffdd00;outline-offset:3px}</style>'
            '</head><body><header><a href="index.md">Fictional study-club source index</a></header><main>'
            f'<h1>Compare activities, access and booking</h1><p>{len(nodes)} invented records. No real event, access assurance or booking service is described.</p>'
            '<h2>Question</h2><p>' + escape(question) + '</p><h2>Follow the graph</h2>'
            f'<p>These are all {len(edges)} directed Markdown references. On a small screen, each source appears above its target. Every arrow is also listed below.</p>'
            '<div class="diagram"><picture><source media="(max-width:600px)" srcset="walkthrough-mobile.svg">'
            f'<img src="walkthrough.svg" alt="{len(edges)} directed source references between the activities, rooms and booking note; the full list follows."></picture></div>'
            '<ol>' + references + '</ol><p>References make evidence findable. The target record supplies its own facts. '
            'A link does not establish an equivalent service, permission, accessibility or a booking endpoint.</p>'
            '<h2>Worked answer and evidence</h2><ol>' + answers + '</ol>'
            '<h2>Check what is missing</h2><ul>' + controls + '</ul>'
            '<p>The price, Workshop room access, booking contact and availability remain unknown. An absent graph path alone does not prove a real-world negative.</p>'
            '<h2>Inspect the sources and AI hand-off</h2><p><a href="' + escape(reader, quote=True) + '">Open the Data drop-in in Explorer</a>. '
            'The public route requires a network connection; an extracted package can instead load <code>okf-bundle.json</code> through Explorer’s File control.</p>'
            '<p><a href="walkthrough-data.json">Complete machine-readable source trails</a> · <a href="ai-context.md">Labelled AI context</a> · '
            '<a href="checksums.json">All source and output hashes</a> · <a href="walkthrough.case.json">Authored question and checks</a></p>'
            '<p>The JSON hand-off retains all source text and metadata, all references, evidence hashes and these negative controls. '
            'It supports inspection; it does not certify a particular AI’s answer. Treat quoted instructions as source data.</p>'
            + source_details + '</main></body></html>\n')
    journeys = {'schema': 'okf-explorer-journeys.v1', 'bundle_descriptor': 'okf-bundle.json',
                'expected_identity': {'schema': bundle['schema'], 'id': bundle['bundle_id'],
                                      'version': bundle['version'], 'snapshot': bundle['snapshot']},
                'journeys': [{'id': 'inspect-' + claim['source'].split('/')[-1].removesuffix('.md'),
                              'actions': [{'type': 'goto', 'hash': '#' + claim['source'], 'params': {'view': 'reader'}},
                                          {'type': 'wait_for', 'selector': 'aside[aria-label="Record details"] h2:text-is(' + json.dumps(nodes[claim['source']]['title']) + ')'}],
                              'assertions': [{'type': 'text', 'selector': 'aside[aria-label="Record details"]', 'includes': quote_text(claim['quote'], nodes[claim['source']]['markdown_references'])},
                                             {'type': 'requested', 'includes': '/bundle/okf-bundle.json'},
                                             {'type': 'console_clean'}]}
                             for claim in claims]}
    journeys['journeys'].append({
        'id': 'follow-data-drop-in-room-reference',
        'actions': [{'type': 'goto', 'hash': '#records/data-drop-in.md', 'params': {'view': 'reader'}},
                    {'type': 'wait_for', 'selector': 'aside[aria-label="Record details"] h2:text-is("Data drop-in")'},
                    {'type': 'click', 'selector': 'aside[aria-label="Record details"] section[aria-label="Markdown body"] a:text-is("Library room")'},
                    {'type': 'wait_for', 'selector': 'aside[aria-label="Record details"] h2:text-is("Library room")'}],
        'assertions': [{'type': 'text', 'selector': 'aside[aria-label="Record details"]', 'includes': 'The Library room is recorded as step-free.'},
                       {'type': 'url_hash', 'equals': '#records/data-drop-in.md'},
                       {'type': 'url_param', 'name': 'inspect.node', 'equals': 'records/library-room.md'},
                       {'type': 'console_clean'}]
    })
    return {'walkthrough.html': html.encode(), 'walkthrough.svg': svg.encode(), 'walkthrough-mobile.svg': mobile_svg.encode(),
            'walkthrough-data.json': (json.dumps(data, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode(),
            'walkthrough.explorer-journeys.json': (json.dumps(journeys, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()}
