#!/usr/bin/env python3
"""Create a NEW reconstruction archive and verify it, never spoof an original ZIP hash."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,os,stat,sys,zipfile
from verify_package import verify
from check_no_ui_tokens import scan
ROOT=Path(__file__).resolve().parents[1]
H=lambda b:hashlib.sha256(b).hexdigest()
# Exclude only the two self-referential packaging indexes. __pycache__ is not artefact content.
files=[p for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and str(p.relative_to(ROOT)) not in ['manifest.json','checksums.sha256']]
manifest={'package_kind':'new_reconstruction_not_recovered_original','created_at_utc':datetime.now(timezone.utc).isoformat(),
          'original_zip_recovered':False,'schema_version':'bep-core.v0.1-reconstructed.1',
          'self_reference_rule':'manifest and checksums are excluded from the manifest; checksums include manifest but not themselves',
          'files':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':H(p.read_bytes())} for p in sorted(files)]}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'checksums.sha256').write_text(''.join(f'{H(p.read_bytes())}  {p.relative_to(ROOT)}\n' for p in sorted(files+[ROOT/'manifest.json'])))
r=verify(ROOT)
if not r['verified']: print(json.dumps(r,indent=2));raise SystemExit(1)
zip_path=ROOT.parent/(ROOT.name+'.zip')
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(files+[ROOT/'manifest.json',ROOT/'checksums.sha256']):
        zi=zipfile.ZipInfo(ROOT.name+'/'+str(p.relative_to(ROOT)),date_time=(2026,9,19,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED
        zi.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(zi,p.read_bytes())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    for row in manifest['files']:
        assert H(z.read(ROOT.name+'/'+row['path']))==row['sha256']
findings=scan(zip_path)
assert not findings,findings
receipt={'kind':'fresh_reconstruction_final_archive_verification','verified_at_utc':datetime.now(timezone.utc).isoformat(),
'archive':zip_path.name,'archive_sha256':H(zip_path.read_bytes()),'archive_bytes':zip_path.stat().st_size,
'archive_member_count':len(files)+2,'manifest_payload_files':len(files),'crc_test':'passed','all_manifest_member_hashes':'passed',
'citation_scan':'passed; uncompressed text members scanned','package_verification':r,
'original_archive_recovered':False,'old_archive_sha256_not_reused':True,
'limitations':'No signature, trusted timestamp, original-run verification, full RFC certification or real Ask OKF evaluation is asserted.'}
out=ROOT.parent/(ROOT.name+'_FINAL_VERIFICATION.json');out.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
