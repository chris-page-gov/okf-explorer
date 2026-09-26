#!/usr/bin/env python3
"""Verify actual packaged bytes without rewriting them. No historic claims are inferred."""
from __future__ import annotations
import argparse,hashlib,json,re,sys
from pathlib import Path,PurePosixPath
from check_no_ui_tokens import scan

def verify(root:Path)->dict:
    manifest=json.loads((root/'manifest.json').read_text());errors=[]
    expected={r['path']:r for r in manifest['files']}
    for name,row in expected.items():
        rel=PurePosixPath(name)
        if rel.is_absolute() or '..' in rel.parts or '\\' in name:errors.append('unsafe path: '+name);continue
        p=root/name
        if not p.is_file() or p.is_symlink():errors.append('missing or symlink: '+name);continue
        raw=p.read_bytes()
        if len(raw)!=row['bytes'] or hashlib.sha256(raw).hexdigest()!=row['sha256']:errors.append('hash/size mismatch: '+name)
    actual={str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    if actual != set(expected)|{'manifest.json','checksums.sha256'}:errors.append('manifest membership mismatch')
    sums={}
    for line in (root/'checksums.sha256').read_text().splitlines():
        digest,name=line.split('  ',1)
        if name in sums:errors.append('duplicate checksum: '+name)
        sums[name]=digest
        if name not in actual:errors.append('checksum path not in inventory: '+name);continue
        if hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:errors.append('checksum mismatch: '+name)
    if set(sums)!=set(expected)|{'manifest.json'}:errors.append('checksum membership mismatch')
    for p in root.rglob('*.json'):
        try:json.loads(p.read_text())
        except Exception as e:errors.append('JSON parse error: '+str(p)+': '+str(e))
    for p in root.rglob('*.jsonl'):
        for i,line in enumerate(p.read_text().splitlines(),1):
            if line.strip():
                try:json.loads(line)
                except Exception as e:errors.append(f'JSONL parse error: {p}:{i}: {e}')
    findings=scan(root);errors += ['citation scan: '+str(f) for f in findings]
    # These are generated, portable documents, not archived input briefs.
    for name in ['REPORT.md','README.md','DELIVERY_AUDIT.md']:
        for target in re.findall(r'\]\(([^)]+)\)',(root/name).read_text()):
            if re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:',target) or target.startswith('#'):continue
            if not (root/target.split('#',1)[0]).is_file():errors.append('broken local link: '+name+' -> '+target)
    return {'verified':not errors,'payload_files':len(expected),'errors':errors,'scope':'Current replacement bytes and references only; not original missing files or factual correctness.'}
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('root',type=Path,nargs='?',default=Path(__file__).resolve().parents[1]);a=ap.parse_args()
    try:r=verify(a.root.resolve())
    except Exception as e:r={'verified':False,'errors':[str(e)]}
    print(json.dumps(r,indent=2));sys.exit(not r['verified'])
