#!/usr/bin/env python3
"""Check task-based Foundry facets against actual local producer artefacts.

This is a Foundry gate, not a change to permissive OKF core loading.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

GENERIC_KEYS = {'type', 'trust', 'trust_tier', 'lifecycle', 'status', 'section', 'id', 'record_id'}
KINDS = {'single-value', 'or-within-facet', 'and-across-facets', 'no-match'}

def contract_errors(profile: dict[str, Any]) -> list[str]:
    presentation = profile.get('presentation_contract', {})
    contract = presentation.get('domain_facets') if isinstance(presentation, dict) else None
    if not isinstance(contract, dict):
        return ['presentation_contract.domain_facets is required for new Foundry builds']
    definitions = contract.get('definitions', [])
    if not isinstance(definitions, list) or len(definitions) < 2:
        return ['domain facets require at least two task-based definitions']
    errors: list[str] = []
    by_key = {}
    tasks = {t.get('id') for t in profile.get('tasks', []) if isinstance(t, dict)}
    consumer_contract = profile.get('consumer_contract')
    consumers = consumer_contract.get('inventory', []) if isinstance(consumer_contract, dict) else []
    if consumer_contract is not None and contract.get('consumer_ref') not in {c.get('id') for c in consumers if isinstance(c, dict)}:
        errors.append('facet contract must bind a declared consumer')
    validations = {v.get('id'): v for v in profile.get('validation', []) if isinstance(v, dict)}
    if not any(validations.get(ref, {}).get('release_gate') is True
               and validations.get(ref, {}).get('severity') == 'error'
               for ref in contract.get('validation_refs', [])):
        errors.append('domain facets require an error-severity build/release gate')
    for definition in definitions:
        if not isinstance(definition, dict):
            errors.append('domain facet definition must be an object')
            continue
        key = definition.get('key')
        if not isinstance(key, str):
            errors.append('domain facet key must be text')
            continue
        if key in by_key:
            errors.append(f'duplicate domain facet key {key!r}')
        by_key[key] = definition
        if key in GENERIC_KEYS:
            errors.append(f'{key!r} is a generic fallback, not a domain facet')
        if not definition.get('task_refs') or set(definition['task_refs']) - tasks:
            errors.append(f'{key}: link the facet to a declared user task')
        allowed = definition.get('allowed_values', [])
        if definition.get('vocabulary') == 'closed':
            required = definition.get('examples', []) + [definition.get('missing_value')]
            if any(value not in allowed for value in required):
                errors.append(f'{key}: closed vocabulary must include examples and the explicit missing value')
    cases = contract.get('acceptance_cases', [])
    case_keys = [c.get('key') for c in cases if isinstance(c, dict)]
    if len(case_keys) != len(set(case_keys)):
        errors.append('facet acceptance case keys must be unique')
    if not KINDS <= {c.get('kind') for c in cases if isinstance(c, dict)}:
        errors.append('facet acceptance cases must cover single-value, OR, AND and no-match')
    for case in cases:
        if not isinstance(case, dict):
            continue
        selection = case.get('selection', {})
        if not isinstance(selection, dict):
            continue
        for key, values in selection.items():
            definition = by_key.get(key)
            if definition is None:
                errors.append(f'{case.get("key")}: selection references unknown facet {key!r}')
            elif definition.get('vocabulary') == 'closed' and any(v not in definition['allowed_values'] for v in values):
                errors.append(f'{case.get("key")}: selection contains an unknown {key} label')
        sizes = [len(v) for v in selection.values() if isinstance(v, list)]
        kind = case.get('kind')
        if kind == 'single-value' and (len(selection) != 1 or sizes != [1]):
            errors.append(f'{case.get("key")}: single-value case must select one value')
        if kind == 'or-within-facet' and not any(n >= 2 for n in sizes):
            errors.append(f'{case.get("key")}: OR case must select two values in one facet')
        if kind == 'and-across-facets' and len(selection) < 2:
            errors.append(f'{case.get("key")}: AND case must select two distinct facets')
        if kind == 'no-match' and case.get('expected_record_ids'):
            errors.append(f'{case.get("key")}: no-match case must expect no records')
        if kind != 'no-match' and not case.get('expected_record_ids'):
            errors.append(f'{case.get("key")}: positive case must name expected records')
    exercised = {key for case in cases if isinstance(case, dict)
                 for key in case.get('selection', {})}
    if set(by_key) - exercised:
        errors.append('facet acceptance cases must exercise every declared domain facet')
    return errors

def at(value: Any, path: list[str]) -> Any:
    for part in path:
        if not isinstance(value, dict) or part not in value:
            raise ValueError(f'missing declared path {" / ".join(path)}')
        value = value[part]
    return value

def check(profile: dict[str, Any], bundle: dict[str, Any], *, records=None, presentation=None, counts=None):
    errors = contract_errors(profile)
    if errors:
        return errors, {}
    contract = profile['presentation_contract']['domain_facets']
    if not isinstance(profile.get('consumer_contract'), dict):
        return ['new Foundry builds require a declared consumer contract'], {}
    definitions = contract['definitions']
    try:
        raw_records = at(bundle if records is None else records, contract['record_path'])
        declarations = at(bundle if presentation is None else presentation, contract['declaration_path'])
    except ValueError as error:
        return [str(error)], {}
    if isinstance(raw_records, list):
        rows = {}
        for node in raw_records:
            if not isinstance(node, dict) or not isinstance(node.get('id'), str) or not node['id'] or node['id'] in rows:
                errors.append('record list needs unique, non-empty string IDs')
                continue
            rows[node['id']] = node
    elif isinstance(raw_records, dict):
        rows = raw_records
    else:
        return ['record path must resolve to a mapping or list'], {}
    if not rows:
        errors.append('facet gate requires the complete non-empty record population')
    if contract.get('consumer_adapter') == 'explorer-small-learning-v1':
        if contract['declaration_path'] != ['meta', 'learning_presentation', 'facets']:
            errors.append('Explorer small bundles require meta.learning_presentation.facets')
        for definition in definitions:
            if definition['value_path'] != ['learning_facets', definition['key']]:
                errors.append(f"{definition['key']}: Explorer reads values from learning_facets")
        raw = (bundle if presentation is None else presentation).get('meta', {}).get('learning_presentation', {})
        if raw.get('schema') != 'okf-learning-presentation.v1' or raw.get('start_route') not in rows:
            errors.append('Explorer small presentation needs the supported schema and a valid start route')
        groups = raw.get('groups')
        if not isinstance(groups, list) or not groups:
            errors.append('Explorer small presentation requires non-empty groups')
        else:
            for group in groups:
                if (not isinstance(group, dict) or not isinstance(group.get('title'), str)
                        or not group['title'].strip() or not group.get('routes')
                        or any(route not in rows for route in group['routes'])):
                    errors.append('Explorer presentation group is empty or has dangling routes')
    if not isinstance(declarations, list) or not all(isinstance(d, dict) for d in declarations):
        return errors + ['consumer facet declaration must be a list of objects'], {}
    if contract.get('consumer_adapter') == 'explorer-small-learning-v1':
        if len(declarations) > 12:
            errors.append('Explorer small presentation displays at most 12 facets')
        if any(not isinstance(d.get('label'), str) or d['label'] != d['label'].strip()
               or not 1 <= len(d['label']) <= 80 for d in declarations):
            errors.append('Explorer small facet labels must be trimmed and fit 80 characters')
    keys = [d.get('key') for d in declarations]
    if len(keys) != len(set(keys)):
        errors.append('consumer facet declaration contains duplicate keys')
    declared = {d.get('key'): d.get('label') for d in declarations}
    for definition in definitions:
        if declared.get(definition['key']) != definition['label']:
            errors.append(f"consumer does not declare {definition['key']!r} with its authored label")
    classified: dict[str, dict[str, list[str]]] = {}
    distributions = {d['key']: Counter() for d in definitions}
    for identifier, node in rows.items():
        if not isinstance(identifier, str) or not identifier or not isinstance(node, dict):
            errors.append('record mapping needs non-empty string IDs and object values')
            continue
        classified[identifier] = {}
        for definition in definitions:
            key = definition['key']
            try:
                raw = at(node, definition['value_path'])
            except ValueError:
                errors.append(f'{identifier}: missing facet {key}; use an authored explicit unknown value')
                continue
            values = raw if isinstance(raw, list) else [raw]
            if not values or any(not isinstance(v, str) or not v.strip() or v != v.strip() for v in values):
                errors.append(f'{identifier}: {key} needs non-empty, trimmed string labels')
                continue
            if len(values) != len(set(values)):
                errors.append(f'{identifier}: duplicate {key} labels')
            if contract.get('consumer_adapter') == 'explorer-small-learning-v1' and (
                    len(values) > 40 or any(len(v) > 160 for v in values)):
                errors.append(f'{identifier}: {key} exceeds Explorer small value limits')
            if definition['cardinality'] == 'single' and len(values) != 1:
                errors.append(f'{identifier}: {key} is single-valued')
            if definition['vocabulary'] == 'closed' and set(values) - set(definition['allowed_values']):
                errors.append(f'{identifier}: unknown {key} label')
            classified[identifier][key] = values
            distributions[key].update(set(values))
    for definition in definitions:
        key = definition['key']
        signatures = {tuple(sorted(n.get(key, []))) for n in classified.values()}
        useful = set(distributions[key]) - {definition['missing_value']}
        if len(signatures) < 2 or len(useful) < 2:
            errors.append(f'{key}: domain facet is constant or has fewer than two meaningful populated values')
    for case in contract['acceptance_cases']:
        if any(value not in distributions[key] for key, values in case['selection'].items()
               for value in values):
            errors.append(f"{case['key']}: select populated values, including for the no-match combination")
        actual = sorted(identifier for identifier, values in classified.items() if all(
            set(selected) & set(values.get(key, [])) for key, selected in case['selection'].items()))
        if actual != sorted(case['expected_record_ids']):
            errors.append(f"{case['key']}: selection membership differs: expected {case['expected_record_ids']}, got {actual}")
    try:
        at(bundle, contract['counts_path'])
        counts_present = True
    except ValueError:
        counts_present = False
    if contract['emitted_counts_required'] or counts is not None or counts_present:
        try:
            emitted = at(bundle if counts is None else counts, contract['counts_path'])
            if not isinstance(emitted, dict):
                raise ValueError('emitted facet counts must be a mapping')
            for definition in definitions:
                key = definition['key']
                items = emitted.get(key)
                if not isinstance(items, list) or any(not isinstance(row, dict) for row in items):
                    raise ValueError(f'{key}: count rows must be a list of objects')
                values = [row.get('value') for row in items]
                if any(not isinstance(v, str) for v in values) or len(values) != len(set(values)):
                    raise ValueError(f'{key}: duplicate or invalid count labels')
                for row in items:
                    if type(row.get('count')) is not int or row['count'] < 0:
                        raise ValueError(f'{key}: counts must be non-negative integers')
                reported = {row['value']: row['count'] for row in items if row['count']}
                if reported != dict(distributions[key]):
                    errors.append(f'{key}: emitted counts differ from complete record classifications')
        except ValueError as error:
            errors.append(str(error))
    return errors, {key: dict(sorted(counter.items())) for key, counter in distributions.items()}

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('profile', type=Path)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--records', type=Path, help='Complete emitted compact record plane, if separate')
    parser.add_argument('--presentation', type=Path, help='Actual consumer declaration, if separate')
    parser.add_argument('--counts', type=Path, help='Actual emitted aggregate counts, if separate')
    parser.add_argument('--output', type=Path, help='Digest-bound receipt; records failures as failures')
    args = parser.parse_args()
    receipt = {'schema': 'okf-foundry-facet-receipt.v1', 'inputs': {}}
    try:
        import check_domain_profile
        profile = check_domain_profile.load_document(args.profile)
        errors = check_domain_profile.validate(profile)
        documents = {}
        for name in ('profile', 'bundle', 'records', 'presentation', 'counts'):
            path = getattr(args, name)
            if path is None:
                continue
            data = path.read_bytes()
            receipt['inputs'][name] = {'path': str(path), 'sha256': hashlib.sha256(data).hexdigest()}
            if name != 'profile':
                documents[name] = json.loads(data)
        if not errors:
            errors, distributions = check(profile, **documents)
            receipt['counts'] = distributions
    except (OSError, ValueError, KeyError, TypeError) as error:
        errors = [str(error)]
    receipt.update(status='failed' if errors else 'passed', errors=errors,
                   limits='Validates supplied producer bytes; does not prove domain relevance, full-source coverage or actual browser behaviour.')
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(receipt, ensure_ascii=False, sort_keys=True, indent=2)+'\n', encoding='utf-8')
    for error in errors:
        print(error)
    print('Foundry facet gate ' + receipt['status'])
    return 1 if errors else 0

if __name__ == '__main__':
    raise SystemExit(main())
