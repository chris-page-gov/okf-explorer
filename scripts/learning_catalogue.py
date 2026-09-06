"""Resolve the editorial learning catalogue without changing bundle admission."""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlencode, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'registry/learning-catalogue.json'
KINDS = {'bundle', 'application', 'starter', 'collection', 'conditional'}


def resolve_catalogue(entries: list[dict], bundles: list[dict]) -> list[dict]:
    by_id = {bundle['id'].rsplit('/', 1)[-1]: bundle for bundle in bundles}
    if len(by_id) != len(bundles):
        raise ValueError('bundle identifier suffixes must be unique')
    seen: set[str] = set()
    referenced: set[str] = set()
    resolved = []
    for item in entries:
        identifier = item['id']
        if identifier in seen:
            raise ValueError(f'duplicate learning example: {identifier}')
        seen.add(identifier)
        kind = item['kind']
        if kind not in KINDS:
            raise ValueError(f'unknown learning example kind: {kind}')
        reference = item.get('bundle_id')
        if kind == 'bundle':
            if reference not in by_id:
                raise ValueError(f'unknown bundle reference: {reference}')
            if reference in referenced:
                raise ValueError(f'duplicate bundle reference: {reference}')
            referenced.add(reference)
        elif reference:
            raise ValueError('only bundle entries may reference an admitted bundle')
        bundle = by_id.get(reference, {})
        entry = {**item, 'title': item.get('title') or bundle.get('title'),
                 'source': item.get('source') or bundle.get('repository_url') or bundle.get('home_url')}
        for key in ('id', 'title', 'group', 'audience', 'question', 'access', 'limit', 'guide', 'readiness'):
            if not isinstance(entry.get(key), str) or not entry[key].strip():
                raise ValueError(f'{identifier}: missing {key}')
            if '\n' in entry[key]:
                raise ValueError(f'{identifier}: {key} must be one line')
        guide = Path(entry['guide'])
        if guide.is_absolute() or '..' in guide.parts or not (ROOT / guide).is_file():
            raise ValueError(f'{identifier}: guide must name an existing repository page')
        if entry.get('source'):
            parsed = urlsplit(entry['source'])
            if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
                raise ValueError(f'{identifier}: source must be a credential-free HTTPS URL')
        launch = entry.get('explorer')
        if launch:
            if kind != 'bundle' or not isinstance(launch, dict):
                raise ValueError('only registered bundle entries have Explorer launch routes')
            if set(launch) - {'variant', 'query', 'route', 'use_default'}:
                raise ValueError(f'{identifier}: unsupported Explorer launch option')
            descriptor = bundle['url']
            if launch.get('variant'):
                if reference != 'heritage-coventry-warwickshire' or launch['variant'] != 'tiny':
                    raise ValueError('only the reviewed tiny heritage variant is declared')
                descriptor = bundle['home_url'].rstrip('/') + '/tiny/okf-explorer.json'
            if launch.get('use_default') and reference != 'ai-infrastructure':
                raise ValueError('only AI Infrastructure is the Explorer default')
            params = {} if launch.get('use_default') else {'bundle': descriptor}
            if launch.get('query'):
                params['q'] = launch['query']
            route = launch.get('route', 'overview')
            if not isinstance(route, str) or not route or any(char in route for char in '\n\r#?'):
                raise ValueError(f'{identifier}: invalid record route')
            entry['explorer_url'] = 'https://chris-page-gov.github.io/okf-explorer/explore/' + (
                '?' + urlencode(params) if params else '') + '#' + route
        resolved.append(entry)
    if referenced != set(by_id):
        raise ValueError(f'learning catalogue omits admitted bundles: {sorted(set(by_id) - referenced)}')
    return resolved


def render_markdown(entries: list[dict]) -> str:
    lines = ['# Choose an OKF example', '',
             'Start with a short experience, then choose a collection relevant to your work.',
             'This is the shared editorial catalogue for the documentation and learner home.',
             'Bundle identities remain governed by the separate bundle registry. An external',
             'application is not a bundle descriptor, and an entry is not a conformance claim.', '',
             '[Start here](index.md) · [AI access routes](../ai-okf-usage.md) · [Your journey](audience-journeys.md)', '']
    group = None
    for entry in entries:
        if entry['group'] != group:
            group = entry['group']
            lines.extend([f'## {group}', ''])
        guide = '../../' + entry['guide']
        lines.extend([f"### {entry['title']}", '',
                      f"**For:** {entry['audience']}. **Kind:** {entry['kind']}. **Readiness:** {entry['readiness']}", '',
                      f"**Try:** {entry['question']}", '',
                      f"**Use with AI:** {entry['access']}", '',
                      f"**Limit:** {entry['limit']}", '',
                      (f"[Open in Explorer]({entry['explorer_url']}) · " if entry.get('explorer_url') else '') +
                      f"[Follow the exercise or guide]({guide})" +
                      (f" · [Producer and source material]({entry['source']})" if entry.get('source') else ''), ''])
    lines.extend(['## Other products and historical lineages', '',
                  'The [estate registry](../../registry/estate/index.html) distinguishes producers,',
                  'embedded applications such as Modern Domesday and CASA, compatibility repositories,',
                  'format references and local fixtures. These are not all public bundles.',
                  'Use the [dated evolution review](../okf-evolution-review-2026-08-17.md) for',
                  'API-MCP-Wiki and LLM-Wiki history; use the entries above for current learning tasks.', '',
                  'The dated readiness note on each entry records the scope of its browser check.',
                  'No new AI-host evaluation is claimed. Other source links are discovery routes;',
                  'check the producer release and a real record journey before describing a deployment',
                  'as verified. This page is generated from the shared catalogue; follow the',
                  '[documentation maintenance guide](maintenance.md) when updating it.', ''])
    return '\n'.join(lines)


def build_learning_outputs(bundles: list[dict]) -> dict[str, str]:
    entries = resolve_catalogue(json.loads(SOURCE.read_text()), bundles)
    fields = ('id', 'title', 'description', 'kind', 'status', 'version', 'url', 'home_url')
    projection = [{key: bundle[key] for key in fields if key in bundle} for bundle in bundles]
    return {
        'learning-catalogue': json.dumps(entries, ensure_ascii=False, indent=2) + '\n',
        'learning-docs': render_markdown(entries),
        'learning-registry': "// Generated by scripts/build_okf_registry.py; edit the registry source.\n"
        "import type { BundleRegistryEntry } from './types';\n\n"
        'export const learningRegistry: BundleRegistryEntry[] = ' +
        json.dumps(projection, ensure_ascii=False, indent=2) + ';\n',
    }
