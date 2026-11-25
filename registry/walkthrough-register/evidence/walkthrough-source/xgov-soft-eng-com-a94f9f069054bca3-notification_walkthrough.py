"""Generate a source-linked, data-only worked question from the pinned inputs."""
from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path
from urllib.parse import quote, urlencode

ARCHIVE_URL = 'https://github.com/chris-page-gov/xgov-soft-eng-com/releases/download/snapshot-40941783959-1/xgov-okf.tar.gz'
TARGETS = (
    'alphagov/notifications-api',
    'alphagov/notifications-local',
    'alphagov/notifications-release',
)


def generate(output: Path, records: list[dict], inputs_root: Path) -> dict:
    output = Path(output)
    inputs_root = Path(inputs_root)
    rows = {record['name'].casefold(): record for record in records}
    selected = []
    source_receipt = json.loads((inputs_root / 'source/current.json').read_text())
    source_path = inputs_root / source_receipt['path']
    feed = json.loads(source_path.read_text())
    if not isinstance(feed, list):
        raise ValueError('Pinned catalogue feed is not a JSON array')
    observations = {}
    extracted = []
    for identity in TARGETS:
        record = rows.get(identity.casefold())
        if record is None or not record['source_rows']:
            raise ValueError(f'Required walkthrough record is absent: {identity}')
        source_index = record['source_rows'][0]
        if type(source_index) is not int or not (0 <= source_index < len(feed)):
            raise ValueError('Walkthrough source row index is outside the pinned feed')
        row = feed[source_index]
        if (row.get('owner', '') + '/' + row.get('name', '')).casefold() != identity.casefold():
            raise ValueError('Walkthrough source row identity differs from the record')
        observation = record.get('history_observation')
        if observation:
            observation_path = inputs_root / observation['path']
            raw_observation = observation_path.read_bytes()
            if hashlib.sha256(raw_observation).hexdigest() != observation['sha256']:
                raise ValueError('Walkthrough history source differs from its pinned digest')
            observation_value = json.loads(raw_observation)
            observations[observation['path']] = {
                'sha256': observation['sha256'], 'bytes': len(raw_observation),
                'source': observation_value,
            }
        else:
            observation_value = None
        row_bytes = json.dumps(row, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode()
        extracted.append({
            'repository': identity, 'source_file': source_receipt['path'],
            'source_file_sha256': source_receipt['sha256'], 'source_row_index_zero_based': source_index,
            'extracted_row_sha256': hashlib.sha256(row_bytes).hexdigest(), 'row': row,
            'history_observation_path': observation['path'] if observation else None,
            'history_observation_sha256': observation['sha256'] if observation else None,
        })
        selected.append((identity, record, row, observation_value))

    evidence_path = output / 'walkthrough/evidence/notification-records.json'
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_payload = {
        'schema': 'xgov-notification-walkthrough-evidence.v1',
        'source_release': 'snapshot-40941783959-1', 'source_commit': '58eb97ad52c50f9e3c869a57797a1d53e96636b4',
        'archive_url': ARCHIVE_URL, 'archive_sha256': 'da822774bcf48c3514324cbdd8aa68b8e5231a496f7f10169b827df4a4b4e8be',
        'catalogue_source_file': source_receipt['path'], 'catalogue_source_sha256': source_receipt['sha256'],
        'catalogue_source_bytes': source_receipt['bytes'],
        'extraction_note': 'Each row is a parsed extraction from the SHA-256-pinned source JSON array. The row digest is over canonical compact JSON; it is not represented as a byte slice of the original file. The exact source file is retained in the published archive.',
        'records': extracted,
        'history_observations': observations,
    }
    def esc(value: object) -> str:
        return html.escape(str(value), quote=True)

    cards = []
    svg_nodes = []
    coordinates = [(185, 105), (520, 105), (855, 105)]
    for index, (identity, record, row, observation) in enumerate(selected):
        x, y = coordinates[index]
        licence = (row.get('license') or {}).get('spdxId') or 'Not reported'
        sbom = row.get('sbom') or 'No SBOM reference reported'
        history_state = record.get('history_coverage') or 'No observation in pinned set'
        evidence_label = ', '.join(
            item.get('label', item.get('id', 'unlabelled'))
            for scheme in ('domains', 'capabilities', 'content_types')
            for item in record.get('classification_evidence', {}).get(scheme, [])
        ) or 'No matching experimental taxonomy suggestion'
        repo_url = row.get('url', '')
        reader_url = ("https://chris-page-gov.github.io/okf-explorer/explore/?"
                      + urlencode({"bundle": "https://chris-page-gov.github.io/xgov-soft-eng-com/okf-explorer.json", "view": "reader"})
                      + "#" + quote(record["route"], safe="/"))
        cards.append(
            '<article class="record"><h3>' + esc(identity) + '</h3>'
            '<p><strong>Source-reported licence:</strong> ' + esc(licence) + '</p>'
            '<p><strong>SBOM field:</strong> ' + esc(sbom) + '</p>'
            '<p><strong>Experimental classification:</strong> ' + esc(evidence_label) + '</p>'
            '<p><strong>History state:</strong> ' + esc(history_state) + '</p>'
            '<p><a href="' + esc(repo_url) + '">Repository source</a></p>'
            '<p><a href="' + esc(reader_url) + '">Open this record in Explorer</a></p>'
            '<p class="digest">Record route ' + esc(record['route']) + '<br>Source SHA-256 '
            + esc(record['provenance']['source_sha256']) + '</p></article>'
        )
        svg_nodes.append(
            f'<g role="group" aria-label="{esc(identity)} evidence"><rect x="{x-145}" y="{y}" width="290" height="92" rx="12"/> '
            f'<text x="{x}" y="{y+30}" text-anchor="middle">{esc(identity)}</text>'
            f'<text x="{x}" y="{y+59}" text-anchor="middle">licence · SBOM reference · history</text></g>'
        )
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 260" role="img" aria-labelledby="diagram-title diagram-description">'
        '<title id="diagram-title">Three Notify repositories and their evidence</title>'
        '<desc id="diagram-description">The three records connect to the pinned catalogue and separate contributor-history observations. No code or SBOM is inspected.</desc>'
        '<style>rect{fill:#e8f2ff;stroke:#1c4f82;stroke-width:2}path{fill:none;stroke:#486581;stroke-width:2}text{font:14px system-ui,sans-serif;fill:#102a43}.source{fill:#fff4ce}</style>'
        '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>'
        '<path d="M185 197 L520 226 M520 197 L520 226 M855 197 L520 226" marker-end="url(#arrow)"/>'
        + ''.join(svg_nodes) + '<rect class="source" x="350" y="217" width="340" height="34" rx="8"/>'
        '<text x="520" y="239" text-anchor="middle">Pinned 29 October catalogue + history observations</text></svg>'
    )
    mobile_nodes = []
    for index, (identity, record, row, observation) in enumerate(selected):
        y = 20 + index * 190
        licence = (row.get('license') or {}).get('spdxId') or 'not reported'
        sbom_state = 'reported' if row.get('sbom') else 'not reported'
        history_state = record.get('history_coverage') or 'no observation'
        mobile_nodes.append(
            f'<g role="group" aria-label="{esc(identity)} evidence">'
            f'<rect x="30" y="{y}" width="360" height="150" rx="12"/>'
            f'<text x="210" y="{y+38}" text-anchor="middle">{esc(identity)}</text>'
            f'<text x="210" y="{y+75}" text-anchor="middle">Licence: {esc(licence)}</text>'
            f'<text x="210" y="{y+102}" text-anchor="middle">SBOM reference: {esc(sbom_state)}</text>'
            f'<text x="210" y="{y+129}" text-anchor="middle">History: {esc(history_state)}</text></g>'
        )
    mobile_svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 800" role="img" aria-labelledby="mobile-title mobile-description">'
        '<title id="mobile-title">Three Notify repositories and their evidence</title>'
        '<desc id="mobile-description">A vertical mobile view of three source-backed records, including licence, SBOM-reference and contributor-history states, joined to the pinned catalogue and history observations.</desc>'
        '<style>rect{fill:#e8f2ff;stroke:#1c4f82;stroke-width:2}path{fill:none;stroke:#486581;stroke-width:2}text{font:13px system-ui,sans-serif;fill:#102a43}.source{fill:#fff4ce}</style>'
        '<defs><marker id="mobile-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>'
        + ''.join(mobile_nodes)
        + '<path d="M210 170 V198 M210 360 V388 M210 550 V578" marker-end="url(#mobile-arrow)"/>'
        + '<rect class="source" x="30" y="600" width="360" height="150" rx="12"/>'
        + '<text x="210" y="640" text-anchor="middle">Pinned 29 October catalogue</text>'
        + '<text x="210" y="675" text-anchor="middle">+ contributor-history observations</text>'
        + '<text x="210" y="710" text-anchor="middle">No code or SBOM is inspected</text></svg>'
    )
    desktop_path = output / 'walkthrough/notification-software.svg'
    mobile_path = output / 'walkthrough/notification-software-mobile.svg'
    desktop_path.write_text(svg, encoding='utf-8')
    mobile_path.write_text(mobile_svg, encoding='utf-8')
    evidence_payload['diagrams'] = {
        'desktop': {'path': 'walkthrough/notification-software.svg', 'sha256': hashlib.sha256(svg.encode()).hexdigest()},
        'mobile': {'path': 'walkthrough/notification-software-mobile.svg', 'sha256': hashlib.sha256(mobile_svg.encode()).hexdigest()},
    }
    raw_evidence = (json.dumps(evidence_payload, ensure_ascii=False, indent=2) + '\n').encode()
    evidence_path.write_bytes(raw_evidence)
    evidence_hash = hashlib.sha256(raw_evidence).hexdigest()
    document = f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
<title>Can these Notify components be reused?</title>
<style>
:root{{font:16px/1.55 system-ui,sans-serif;color:#172b4d;background:#f7f9fc}}body{{max-width:1120px;margin:auto;padding:1.2rem}}h1,h2{{line-height:1.2}}.lead,.caveat,.sources{{background:white;border:1px solid #ccd5e0;border-radius:12px;padding:1rem;margin:1rem 0}}.records{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}}.record{{background:#fff;border:1px solid #b8c5d3;border-radius:12px;padding:1rem;overflow-wrap:anywhere}}.record h3{{font-size:1.05rem}}.digest{{font-size:.78rem;color:#334e68;overflow-wrap:anywhere}}.sources code{{overflow-wrap:anywhere;word-break:break-word}}picture img{{display:block;width:100%;height:auto;margin:1rem 0}}svg{{width:100%;height:auto;margin:1rem 0}}svg rect{{fill:#e8f2ff;stroke:#1c4f82;stroke-width:2}}svg path{{fill:none;stroke:#486581;stroke-width:2}}svg text{{font:14px system-ui,sans-serif;fill:#102a43}}svg .source{{fill:#fff4ce}}a{{color:#005ea8}}a:focus{{outline:3px solid #ffbf47;outline-offset:2px}}@media(max-width:600px){{body{{padding:.8rem}}svg{{min-height:180px}}}}
</style></head><body>
<p><a href="../index.md">Back to the catalogue bundle</a></p>
<h1>Can these Notify components be reused?</h1>
<section class="lead"><p>Compare the three source-reported records before deciding what further review is needed. The pinned metadata supports a qualified comparison; it does not establish that any code is safe, compatible, maintained or licensed for a particular deployment.</p>
<p><strong>Short answer:</strong> the API record reports an MIT licence and an SBOM reference. The local and release records have different evidence gaps. The SBOM reference is not an inspected SBOM. Two contributor-history observations are provider-pending, which is not the same as zero contributors.</p></section>
<h2>Follow the evidence</h2><picture><source media="(max-width: 600px)" srcset="notification-software-mobile.svg"><img src="notification-software.svg" alt="Three source-backed Notify records connected to their pinned catalogue and contributor-history observations"></picture><section class="records">{''.join(cards)}</section>
<section class="caveat"><h2>Negative controls and interpretation</h2><ul>
<li><code>notifications-release</code> has no reported licence and no SBOM reference in this frozen row. This is a missing-field control, not proof that a licence or SBOM does not exist elsewhere.</li>
<li><code>notifications-local</code> also lacks a reported licence. Its SBOM field is only a reference and is not inspected here.</li>
<li>Provider-pending history observations are kept distinct from an empty successful response and from a zero contribution count.</li>
<li>Experimental taxonomy matches are name/description suggestions, not verified capabilities.</li></ul></section>
<section class="sources"><h2>Source trail</h2><p>Catalogue source snapshot: <code>{esc(source_receipt['path'])}</code>, SHA-256 <code>{esc(source_receipt['sha256'])}</code>; retained in the exact <a href="{ARCHIVE_URL}">published source archive</a> (SHA-256 <code>da822774bcf48c3514324cbdd8aa68b8e5231a496f7f10169b827df4a4b4e8be</code>). Each displayed record links to its source repository. Selected parsed rows and the cited history observation objects are available as <a href="evidence/notification-records.json">walkthrough evidence JSON</a> (SHA-256 <code>{evidence_hash}</code>); that file labels extracted-row hashes separately from the original source-file digest.</p><p>No source API, SBOM endpoint, catalogued code, maintainer or AI model was accessed for this walkthrough.</p></section>
</body></html>
'''
    target = output / 'walkthrough/notification-software.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document, encoding='utf-8')
    return {'path': 'walkthrough/notification-software.html',
            'evidence_path': 'walkthrough/evidence/notification-records.json',
            'evidence_sha256': evidence_hash, 'record_ids': [record['id'] for _, record, _, _ in selected if 'id' in record],
            'source_snapshot_sha256': source_receipt['sha256'],
            'diagram_path': 'walkthrough/notification-software.svg',
            'mobile_diagram_path': 'walkthrough/notification-software-mobile.svg',
            'diagram_sha256': hashlib.sha256(svg.encode()).hexdigest(),
            'mobile_diagram_sha256': hashlib.sha256(mobile_svg.encode()).hexdigest(),
            'source_rows': [entry['source_row_index_zero_based'] for entry in extracted],
            'history_observations': len(observations)}
