#!/usr/bin/env python3
"""Validate the reconstructed proposal. Never calls Ask OKF or fetches remote sources."""
from __future__ import annotations
import argparse,copy,hashlib,json,subprocess,sys
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
ROOT=Path(__file__).resolve().parents[1]
DOMAIN=b'BEP\x00reconstructed-core\x00v0.1-r1\x00'

def strict_loads(text:str):
    def pairs(items):
        out={}
        for k,v in items:
            if k in out: raise ValueError('duplicate JSON key')
            out[k]=v
        return out
    def reject(_): raise ValueError('non-finite JSON value')
    return json.loads(text,object_pairs_hook=pairs,parse_constant=reject)

def canonical_bytes(value)->bytes:
    raw=json.dumps(value,ensure_ascii=True,allow_nan=False,separators=(',',':')).encode()
    p=subprocess.run(['node',str(ROOT/'scripts/canonical_json.mjs')],input=raw,capture_output=True,timeout=10)
    if p.returncode: raise ValueError(p.stderr.decode().strip())
    return p.stdout

def identity(core)->str:
    return 'sha256:'+hashlib.sha256(DOMAIN+canonical_bytes(core)).hexdigest()

def seal(core): return {'core':copy.deepcopy(core),'package_id':identity(core)}

def check(pkg)->list[str]:
    schema=strict_loads((ROOT/'bep-core-v0.1-reconstructed.schema.json').read_text())
    Draft202012Validator.check_schema(schema)
    errors=['schema:'+('/'.join(map(str,e.absolute_path)) or '$')+':'+e.validator
            for e in Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(pkg)]
    if errors:return errors
    core=pkg['core'];ev=core['evidence'];sources=core['sources'];requirements=core['requirements']
    ids=[e['id'] for e in ev]; sids=[s['id'] for s in sources];rids=[r['id'] for r in requirements]
    if len(ids)!=len(set(ids)): errors.append('duplicate_evidence_id')
    if len(sids)!=len(set(sids)): errors.append('duplicate_source_id')
    if len(rids)!=len(set(rids)): errors.append('duplicate_requirement_id')
    em={e['id']:e for e in ev};sm={s['id']:s for s in sources}
    for e in ev:
        if e['literal_sha256']!=hashlib.sha256(e['text'].encode('utf-8')).hexdigest():errors.append('literal_hash:'+e['id'])
        for ref in e['provenance']:
            if ref['source_id'] not in sm:errors.append('unknown_source:'+e['id'])
        if e['assertion_status']=='official' and any(sm.get(ref['source_id'],{}).get('authority',{}).get('class')=='synthetic' for ref in e['provenance']):errors.append('synthetic_official_authority:'+e['id'])
    missing=[]
    for r in requirements:
        if not any(set(alt['all_of']).issubset(em) for alt in r['alternatives']):missing.append(r['id'])
    expected='incomplete' if missing else 'complete'
    if core['coverage']['declared_requirements']!=expected:errors.append('declared_coverage_mismatch')
    status=core['coverage']['evidential_status']
    blockers=bool(missing or core['omissions'] or core['request']['ambiguities'] or core['request']['unresolved'])
    if status=='sufficient-within-declared-scope' and (blockers or core['conflicts'] or not requirements):errors.append('unsupported_sufficiency')
    if core['conflicts'] and status!='conflicting':errors.append('conflict_status_mismatch')
    for edge in core['relationships']:
        if edge['source'] not in em or edge['target'] not in em:errors.append('relationship_endpoint_missing')
    for conflict in core['conflicts']:
        if not set(conflict['evidence_ids']).issubset(em):errors.append('conflict_endpoint_missing')
    if len(ev)>core['budget']['max_records']:errors.append('record_budget')
    if len(core['relationships'])>core['budget']['max_relationships']:errors.append('relationship_budget')
    if len(canonical_bytes(pkg))>core['budget']['max_bytes']:errors.append('wire_byte_budget')
    if identity(core)!=pkg['package_id']:errors.append('package_hash')
    return errors

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('file',type=Path);a=ap.parse_args()
    try: errors=check(strict_loads(a.file.read_text()))
    except Exception as e:errors=[type(e).__name__+': '+str(e)]
    print(json.dumps({'file':str(a.file),'valid':not errors,'errors':errors},indent=2));sys.exit(bool(errors))
