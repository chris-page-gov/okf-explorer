"""Generate a source-only worked question for the XGov OKF core Reader view."""

import hashlib
import html
import json
import re
from pathlib import Path
from urllib.parse import quote, urlencode


SCHEME = 'capabilities'
CONCEPT_ID = 'notifications'
ROUTE = 'capabilities/notifications.md'
QUESTION = (
    'What does “Send notifications and messages” and its displayed match count '
    'tell a Reader about a repository’s actual notification capability?'
)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def generate(output: Path, core_descriptor: dict) -> dict:
    """Create deterministic HTML, SVG and evidence tied to core and taxonomy bytes."""
    output = Path(output)
    node = core_descriptor.get('nodes', {}).get(ROUTE)
    if not isinstance(node, dict) or node.get('source_path') != 'concepts/capabilities/notifications.md':
        raise ValueError('Core concept route or source path differs from the declared walkthrough')

    md_path = output / node['source_path']
    taxonomy_path = output / 'source/taxonomy.json'
    descriptor_path = output / 'okf-core-explorer.json'
    md_bytes = md_path.read_bytes()
    taxonomy_bytes = taxonomy_path.read_bytes()
    descriptor_bytes = descriptor_path.read_bytes()
    md_sha = _sha256(md_bytes)
    taxonomy_sha = _sha256(taxonomy_bytes)
    descriptor_sha = _sha256(descriptor_bytes)
    if md_sha != node.get('source_sha256'):
        raise ValueError('Core Markdown bytes differ from the projection source digest')

    taxonomy = json.loads(taxonomy_bytes)
    rules = taxonomy.get(SCHEME)
    if not isinstance(rules, list):
        raise ValueError('Taxonomy has no capabilities scheme')
    matches = [(index, rule) for index, rule in enumerate(rules)
               if isinstance(rule, dict) and rule.get('id') == CONCEPT_ID]
    if len(matches) != 1:
        raise ValueError('Taxonomy must contain exactly one notifications capability rule')
    taxonomy_index, rule = matches[0]
    if node.get('taxonomy_record') != rule:
        raise ValueError('Core frontmatter taxonomy record differs from its source JSON object')

    body = node.get('body', '')
    match = re.search(r'(?m)^(\d[\d,]*) repositories match the experimental name/description rules\.$', body)
    if not match:
        raise ValueError('Core concept body has no declared experimental match count')
    match_count = int(match.group(1).replace(',', ''))
    if taxonomy.get('status') != 'experimental-unreviewed':
        raise ValueError('Taxonomy status is not the declared experimental-unreviewed status')
    if len(core_descriptor.get('edges', [])) != 0:
        raise ValueError('The taxonomy-only walkthrough expects zero authored core edges')

    field_pointer = f'/{SCHEME}/{taxonomy_index}'
    evidence = {
        'schema': 'xgov-core-taxonomy-walkthrough-evidence.v1',
        'question': QUESTION,
        'answer_scope': 'taxonomy-source-and-the-linked-core-concept-only',
        'core_bundle': {
            'schema': core_descriptor.get('schema'), 'bundle_id': core_descriptor.get('bundle_id'),
            'version': core_descriptor.get('version'), 'snapshot': core_descriptor.get('snapshot'),
            'descriptor_path': 'okf-core-explorer.json', 'descriptor_bytes': len(descriptor_bytes),
            'descriptor_sha256': descriptor_sha,
        },
        'concept': {
            'semantic_id': node.get('semantic_id'), 'route': ROUTE,
            'source_path': node['source_path'], 'source_bytes': len(md_bytes),
            'source_sha256': md_sha, 'title': rule.get('label'), 'experimental_match_count': match_count,
            'core_edges_in_bundle': 0,
        },
        'taxonomy_source': {
            'path': 'source/taxonomy.json', 'source_authoring_path': 'config/taxonomy.json',
            'bytes': len(taxonomy_bytes), 'sha256': taxonomy_sha,
            'field_pointer': field_pointer, 'rule': rule,
            'status': taxonomy.get('status'), 'policy': taxonomy.get('policy'),
        },
        'answer': {
            'summary': (
                f'The concept records {match_count:,} experimental name/description matches. '
                'The count describes this catalogue rule; it does not prove that any matching '
                'repository can provide a notification service.'
            ),
            'negative_controls': [
                'A taxonomy match is an unreviewed suggestion, not verified capability.',
                'A zero match count does not establish that no relevant software exists.',
                'The core bundle supplies zero authored concept-to-concept edges; this does not establish that no real-world relationships exist.',
                'This source-only question makes no claim about a particular repository, licence, SBOM or reuse permission.',
            ],
        },
    }
    esc = lambda value: html.escape(str(value), quote=True)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 290" role="img" aria-labelledby="title desc">
<title id="title">Source path for the notifications concept</title>
<desc id="desc">A taxonomy rule generates a typed Markdown concept and a core Reader node. The core graph has zero authored edges; the count remains an experimental name and description match.</desc>
<style>.box rect{{fill:#f0f4f8;stroke:#36556f;stroke-width:2}}.box text{{fill:#172b4d;font:600 16px system-ui,sans-serif}}.box text:nth-of-type(2),.box text:nth-of-type(3){{font:14px system-ui,sans-serif}}.box text:nth-of-type(4){{font:12px ui-monospace,monospace}}.connector{{fill:none;stroke:#36556f;stroke-width:3}}marker path{{fill:#36556f;stroke:none}}</style>
<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z"/></marker></defs>
<g class="box"><rect x="25" y="55" width="310" height="155" rx="12"/><text x="180" y="88" text-anchor="middle">Authored taxonomy</text><text x="180" y="123" text-anchor="middle">config/taxonomy.json</text><text x="180" y="151" text-anchor="middle">{esc(field_pointer)}</text><text x="180" y="181" text-anchor="middle">SHA-256 {taxonomy_sha[:16]}…</text></g>
<g class="box"><rect x="405" y="55" width="310" height="155" rx="12"/><text x="560" y="88" text-anchor="middle">Typed OKF 0.3 Markdown</text><text x="560" y="123" text-anchor="middle">{esc(node['source_path'])}</text><text x="560" y="151" text-anchor="middle">{match_count:,} experimental matches</text><text x="560" y="181" text-anchor="middle">SHA-256 {md_sha[:16]}…</text></g>
<g class="box"><rect x="785" y="55" width="310" height="155" rx="12"/><text x="940" y="88" text-anchor="middle">Core Reader projection</text><text x="940" y="123" text-anchor="middle">{esc(ROUTE)}</text><text x="940" y="151" text-anchor="middle">0 authored core edges</text><text x="940" y="181" text-anchor="middle">SHA-256 {descriptor_sha[:16]}…</text></g>
<path class="connector" d="M335 133 H397 M715 133 H777" marker-end="url(#arrow)"/><text x="560" y="253" text-anchor="middle" style="fill:#172b4d;font:14px system-ui,sans-serif">A taxonomy match is not a verified service capability; zero matches do not establish absence.</text>
</svg>'''
    svg_path = output / 'walkthrough/core-taxonomy.svg'
    svg_path.parent.mkdir(parents=True, exist_ok=True)
    svg_path.write_text(svg, encoding='utf-8')
    mobile_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 700" role="img" aria-labelledby="title desc">
<title id="title">Source path for the notifications concept</title>
<desc id="desc">A vertical, mobile-sized view of the taxonomy rule, typed Markdown concept and core Reader projection. The core graph has zero authored edges.</desc>
<style>.box rect{{fill:#f0f4f8;stroke:#36556f;stroke-width:2}}.box text{{fill:#172b4d;font:600 16px system-ui,sans-serif}}.box text:nth-of-type(2),.box text:nth-of-type(3){{font:14px system-ui,sans-serif}}.box text:nth-of-type(4){{font:12px ui-monospace,monospace}}.connector{{fill:none;stroke:#36556f;stroke-width:3}}marker path{{fill:#36556f;stroke:none}}.note{{fill:#172b4d;font:13px system-ui,sans-serif}}</style>
<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z"/></marker></defs>
<g class="box"><rect x="30" y="20" width="360" height="150" rx="12"/><text x="210" y="55" text-anchor="middle">Authored taxonomy</text><text x="210" y="88" text-anchor="middle">config/taxonomy.json</text><text x="210" y="115" text-anchor="middle">{esc(field_pointer)}</text><text x="210" y="145" text-anchor="middle">SHA-256 {taxonomy_sha[:16]}…</text></g>
<g class="box"><rect x="30" y="260" width="360" height="150" rx="12"/><text x="210" y="295" text-anchor="middle">Typed OKF 0.3 Markdown</text><text x="210" y="328" text-anchor="middle">{esc(node['source_path'])}</text><text x="210" y="355" text-anchor="middle">{match_count:,} experimental matches</text><text x="210" y="385" text-anchor="middle">SHA-256 {md_sha[:16]}…</text></g>
<g class="box"><rect x="30" y="500" width="360" height="150" rx="12"/><text x="210" y="535" text-anchor="middle">Core Reader projection</text><text x="210" y="568" text-anchor="middle">{esc(ROUTE)}</text><text x="210" y="595" text-anchor="middle">0 authored core edges</text><text x="210" y="625" text-anchor="middle">SHA-256 {descriptor_sha[:16]}…</text></g>
<path class="connector" d="M210 170 V250 M210 410 V490" marker-end="url(#arrow)"/><text class="note" x="210" y="680" text-anchor="middle">A match is not verified capability; zero is not absence.</text>
</svg>'''
    mobile_svg_path = output / 'walkthrough/core-taxonomy-mobile.svg'
    mobile_svg_path.write_text(mobile_svg, encoding='utf-8')
    evidence['diagrams'] = {
        'desktop': {'path': 'walkthrough/core-taxonomy.svg', 'sha256': _sha256(svg.encode('utf-8'))},
        'mobile': {'path': 'walkthrough/core-taxonomy-mobile.svg', 'sha256': _sha256(mobile_svg.encode('utf-8'))},
    }
    reader_url = ("https://chris-page-gov.github.io/okf-explorer/explore/?"
                  + urlencode({"bundle": core_descriptor["bundle_id"], "view": "reader"})
                  + "#" + quote(ROUTE, safe="/"))
    evidence["reader_url"] = reader_url
    evidence_bytes = (json.dumps(evidence, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    evidence_path = output / 'walkthrough/evidence/core-taxonomy.json'
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_bytes(evidence_bytes)

    page = f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>What does the notifications concept mean?</title><style>
body{{font:1rem/1.55 system-ui,sans-serif;max-width:980px;margin:2rem auto;padding:0 1rem;color:#172b4d}}h1,h2{{line-height:1.2}}a{{color:#005ea5}}.answer,.limits,.sources{{border:1px solid #8795a1;border-radius:.6rem;padding:1rem;margin:1rem 0}}figure{{margin:1.5rem 0}}figure picture,figure img{{display:block;width:100%;height:auto}}.digest,.sources code{{overflow-wrap:anywhere}}.digest{{font-family:ui-monospace,monospace;font-size:.9rem}}</style></head><body>
<p><a href="../index.md">XGov OKF bundle index</a> · <a href="../okf-core-explorer.json">Core Reader projection</a> · <a href="{esc(reader_url)}">Open this concept in Explorer</a></p>
<h1>What does the notifications concept mean?</h1>
<section class="answer"><h2>Worked question</h2><p><strong>{esc(QUESTION)}</strong></p>
<p>The linked concept records <strong>{match_count:,} repositories matching experimental name and description rules</strong>. Its terms are {esc(', '.join(rule.get('terms', [])))}. The taxonomy says the rules match whole tokens or phrases in repository names and descriptions; labels are proposals, not government classifications. Read the count as a result of that rule, not proof that any repository can provide the service.</p>
<p>The linked Markdown body also states that matches are suggestions and that a zero count does not establish absence. The 0.3 core projection contains zero authored concept-to-concept edges, so it supplies no core relation that would support a stronger answer.</p></section>
<figure><picture><source media="(max-width: 600px)" srcset="core-taxonomy-mobile.svg"><img src="core-taxonomy.svg" alt="Taxonomy source flows into the typed notifications concept and its Reader projection; the graph has zero authored edges"></picture><figcaption>Source-to-Reader path for this one concept. The desktop and mobile diagrams bind the exact taxonomy, concept and descriptor hashes below.</figcaption></figure>
<section class="limits"><h2>Negative controls</h2><ul>{''.join('<li>'+esc(item)+'</li>' for item in evidence['answer']['negative_controls'])}</ul></section>
<section class="sources"><h2>Source trail</h2><ul>
<li><a href="../source/taxonomy.json">Generated taxonomy source projection</a>; authored at <code>config/taxonomy.json</code>, field <code>{esc(field_pointer)}</code>, SHA-256 <code>{taxonomy_sha}</code>.</li>
<li><a href="../{esc(node['source_path'])}">Exact typed Markdown concept</a>, SHA-256 <code>{md_sha}</code>.</li>
<li><a href="../okf-core-explorer.json">Core Reader descriptor</a>, bundle <code>{esc(core_descriptor.get('bundle_id'))}</code>, version <code>{esc(core_descriptor.get('version'))}</code>, snapshot <code>{esc(core_descriptor.get('snapshot'))}</code>, SHA-256 <code>{descriptor_sha}</code>.</li>
<li>Desktop diagram SHA-256 <code>{_sha256(svg.encode('utf-8'))}</code>; mobile diagram SHA-256 <code>{_sha256(mobile_svg.encode('utf-8'))}</code>.</li>
<li><a href="evidence/core-taxonomy.json">Machine-readable evidence</a>, SHA-256 <code>{_sha256(evidence_bytes)}</code>.</li></ul>
<p>This question uses the taxonomy and core concept only. It does not assess an individual repository or make a claim about licence, SBOM, security or reuse permission.</p></section>
</body></html>'''
    page_path = output / 'walkthrough/core-taxonomy.html'
    page_path.write_text(page, encoding='utf-8')
    return {
        'path': 'walkthrough/core-taxonomy.html',
        'diagram': 'walkthrough/core-taxonomy.svg',
        'mobile_diagram': 'walkthrough/core-taxonomy-mobile.svg',
        'evidence': 'walkthrough/evidence/core-taxonomy.json',
        'question': QUESTION,
        'source_count': 2,
        'source_sha256': {'taxonomy': taxonomy_sha, 'concept': md_sha, 'core_descriptor': descriptor_sha},
        'evidence_sha256': _sha256(evidence_bytes),
        'diagram_sha256': _sha256(svg.encode('utf-8')),
        'mobile_diagram_sha256': _sha256(mobile_svg.encode('utf-8')),
    }
