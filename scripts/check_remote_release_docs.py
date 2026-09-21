#!/usr/bin/env python3
"""Check dated release prose against pinned receipts; never contact the service."""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess

ROOT = Path(__file__).resolve().parents[1]
RECEIPTS = Path('services/ask-okf-mcp/validation/publication-2026-09-21')
DOCS = ('docs/remote-mcp.md', 'services/ask-okf-mcp/README.md',
        'services/ask-okf-mcp/CHANGELOG.md')
GUIDES = ('services/ask-okf-mcp/ARCHITECTURE.md', 'docs/adr-versioned-evidence-replay.md')
START = '<!-- ask-okf-publication:start -->'
END = '<!-- ask-okf-publication:end -->'
CURRENT = 'https://github.com/chris-page-gov/okf-dwp/blob/main/docs/service-publication.md'
SOURCE_PATHS = {
    'deployment.json': 'validation/compact-delivery/v0.6.0/deployment.json',
    'observation.json': 'validation/compact-delivery/v0.6.0/sdk/attempt-02/observation.json',
}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def bounded_file(path, limit):
    require(all(not parent.is_symlink() for parent in (path, *path.parents)), 'Receipt path contains a symlink')
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_size <= limit, 'Receipt must be a bounded regular file')
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, 'rb') as stream:
        opened = os.fstat(stream.fileno())
        require(stat.S_ISREG(opened.st_mode) and (opened.st_dev, opened.st_ino) == (before.st_dev, before.st_ino),
                'Receipt changed during admission')
        raw = stream.read(limit + 1)
    require(len(raw) == before.st_size and len(raw) <= limit, 'Receipt size changed or exceeds bound')
    return raw


def validate(deployment, observation):
    d, o = deployment, observation
    require(d['schema'] == 'okf-compact-delivery-deployment.v1', 'Unknown deployment schema')
    require(d['deployment']['status'] == 'succeeded', 'Deployment did not succeed')
    require(o['classification'] == 'actual-public-http' and o['passed'] is True,
            'No successful public SDK observation')
    require(d['service_version'] == o['expected_service_version'] == o['observed_health']['version'],
            'Service versions differ')
    require(d['source_commit'] == o['current_source_version'] == o['observed_health']['bundle_version'],
            'Source identities differ')
    require(d['runtime_worker_sha256'] == o['expected_worker_sha256'], 'Worker identities differ')
    require(d['deployment']['url'].rstrip('/') == o['origin'].rstrip('/'), 'Service origins differ')
    require(d['deployment']['version_id'] == d['site_version_id'], 'Hosting version identities differ')
    require(datetime.fromisoformat(d['deployment']['updated_at']) <= datetime.fromisoformat(o['started_at'])
            <= datetime.fromisoformat(o['completed_at']), 'Observation chronology differs')
    events = o['transport']['events']
    require(o['transport']['request_count'] == len(events)
            and len(events) > 0 and [e['sequence'] for e in events] == list(range(1, len(events) + 1)),
            'Request census differs')
    require(o['transport']['received_bytes'] == sum(e['response_bytes'] for e in events)
            and all(e['status'] in (200, 202) for e in events), 'Response census differs')
    require(o['model_calls'] == o['full_ask_okf_calls'] == o['transport']['automatic_retries'] == 0,
            'Observed call boundaries differ')
    cases = o['cases']
    require(cases and len({c['id'] for c in cases}) == len(cases)
            and all(c['complete_package_matches_local_reference'] is True for c in cases),
            'Complete-package case checks differ')
    health = o['observed_health']
    engines = [e for e in health['approved_engines'] if e['engine_id'] == health['engine_id']]
    require(len(engines) == 1 and d['source_commit'] in engines[0]['source_versions'],
            'Current source/engine compatibility differs')
    for value in (d['source_commit'], d['runtime_commit'], o['comparison_commit'], engines[0]['source_commit']):
        require(re.fullmatch('[0-9a-f]{40}', value), 'Invalid commit identity')
    return engines[0]['source_commit']


def load(root=ROOT, dwp_root=None):
    directory = root / RECEIPTS
    binding = json.loads(bounded_file(directory / 'source.json', 16384))
    require(binding['repository'] == 'chris-page-gov/okf-dwp'
            and re.fullmatch('[0-9a-f]{40}', binding['commit']), 'Invalid receipt repository binding')
    require(set(binding['files']) == set(SOURCE_PATHS), 'Receipt census differs')
    loaded = {}
    for name, path in SOURCE_PATHS.items():
        raw = bounded_file(directory / name, 1024 * 1024)
        require(binding['files'][name] == {'path': path, 'bytes': len(raw),
                                         'sha256': hashlib.sha256(raw).hexdigest()}, 'Receipt bytes differ')
        if dwp_root:
            spec = f"{binding['commit']}:{path}"
            size = subprocess.check_output(['git', 'cat-file', '-s', spec], cwd=dwp_root, timeout=10)
            require(size.strip().isdigit() and int(size) == len(raw), 'Pinned Git receipt size differs')
            original = subprocess.check_output(['git', 'cat-file', 'blob', spec], cwd=dwp_root, timeout=10)
            require(original == raw, 'Pinned DWP Git receipt differs')
        loaded[name] = json.loads(raw)
    validate(loaded['deployment.json'], loaded['observation.json'])
    return binding, loaded['deployment.json'], loaded['observation.json']


def render(binding, d, o):
    engine = validate(d, o)
    base = f"https://github.com/chris-page-gov/okf-dwp/blob/{binding['commit']}/"
    date = datetime.fromisoformat(o['completed_at']).strftime('%-d %B %Y')
    return f'''{START}
## Recorded public deployment: {d['service_version']}

For the **latest recorded deployment and verification**, use the shared
[DWP service publication status]({CURRENT}). This dated observation is not a live health check.

On {date}, the [hosting record]({base}{SOURCE_PATHS['deployment.json']})
records service **{d['service_version']}** as deployed. The separate
[public SDK observation]({base}{SOURCE_PATHS['observation.json']})
passed **{len(o['cases'])} evidence cases and {o['transport']['request_count']} requests**,
reconstructing complete packages from bounded reads. It recorded
{o['transport']['received_bytes']:,} received bytes, no automatic retries and no model calls.

| Identity | Recorded value |
| --- | --- |
| DWP source | `{d['source_commit']}` |
| Context engine | `{engine}` |
| Deployed runtime | `{d['runtime_commit']}` |
| SDK verifier | `{o['comparison_commit']}` |
| Local Worker SHA-256 | `{d['runtime_worker_sha256']}` |

The hosting record and public health report have different scopes: health does not
independently attest hosted Worker bytes. Delivery checks do not establish complete
legal evidence, specialist acceptance, answer quality or compatibility with a
particular ChatGPT, Data agent or Voice client. This observation includes no new
public browser journey. Earlier failures and observations retain their own scope.
{END}'''


def check_document(text, expected):
    block_bounds(text)
    actual = text[text.index(START):text.index(END) + len(END)]
    require(actual == expected, 'Release documentation differs from pinned receipts; run --write')
    check_wording(text)


def check_wording(text):
    # Mutable guides describe preparation separately; deployment belongs to the
    # receipt-derived block. Frozen candidate records are deliberately outside this check.
    require(not re.search(r'undeployed|\bnot deployed\b|\bstill-live\b|public acceptance[^\n]*remains',
                          text, re.IGNORECASE), 'Unscoped deployment claim outside the shared status')
    require(CURRENT in text, 'Missing shared publication status link')


def block_bounds(text):
    require(text.count(START) == text.count(END) == 1, 'Missing or duplicate publication block')
    require(text.index(START) < text.index(END), 'Publication block markers are reversed')
    return text.index(START), text.index(END) + len(END)


def refreshed(text, expected):
    start, end = block_bounds(text)
    output = text[:start] + expected + text[end:]
    check_document(output, expected)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Refresh only the marked dated observation blocks')
    parser.add_argument('--dwp-root', type=Path, help='Also compare mirrored receipts to pinned DWP Git blobs')
    args = parser.parse_args()
    try:
        expected = render(*load(dwp_root=args.dwp_root))
        updates = []
        for name in DOCS:
            path = ROOT / name
            text = path.read_text()
            if args.write:
                text = refreshed(text, expected)
                updates.append((path, text))
            check_document(text, expected)
        for name in GUIDES:
            check_wording((ROOT / name).read_text())
        for path, text in updates:
            path.write_text(text)
        print('Remote release documentation matches pinned public receipts; no live service or model calls.')
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        parser.exit(1, f'Remote release documentation failed: {error}\n')


if __name__ == '__main__':
    main()
