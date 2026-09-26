#!/usr/bin/env python3
"""Run local reconstructed-fixture tests and persist actual output, environment and hashes."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,importlib.metadata,json,os,platform,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--output-dir',type=Path);args=ap.parse_args()
OUT=args.output_dir.resolve() if args.output_dir else ROOT
(OUT/'results').mkdir(parents=True,exist_ok=True)
os.environ['PYTHONDONTWRITEBYTECODE']='1'
START=datetime.now(timezone.utc).isoformat()
cmd=[sys.executable,'-B','-m','unittest','discover','-s','tests','-p','test_*.py','-v']
p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=120,env=os.environ)
(OUT/'results/unittest.stdout.txt').write_text(p.stdout)
(OUT/'results/unittest.stderr.txt').write_text(p.stderr)
from check_no_ui_tokens import scan
findings=scan(ROOT)
import re
m=re.search(r'Ran (\d+) tests?',p.stderr)
inputs=[q for folder in ['scripts','tests','examples','synthetic_sources'] for q in (ROOT/folder).rglob('*') if q.is_file() and '__pycache__' not in q.parts]
inputs += [ROOT/'bep-core-v0.1-reconstructed.schema.json',ROOT/'canonicalisation-vectors.json']
result={'kind':'fresh_reconstruction_execution_receipt','started_at_utc':START,'finished_at_utc':datetime.now(timezone.utc).isoformat(),
 'command':cmd,'exit_code':p.returncode,'tests_run':int(m[1]) if m else None,'tests_passed':p.returncode==0,
 'citation_scan_scope':'UTF-8 text and bounded ZIP members; no PDF conversion performed','citation_scan_findings':findings,
 'python':platform.python_version(),'node':subprocess.check_output(['node','--version'],text=True).strip(),
 'dependencies':{k:importlib.metadata.version(k) for k in ['jsonschema','referencing','attrs','jsonschema-specifications','rpds-py']},
 'files_under_test':[{'path':str(q.relative_to(ROOT)),'sha256':hashlib.sha256(q.read_bytes()).hexdigest()} for q in sorted(inputs)],
 'not_executed':['Original missing historical tests','Real Ask OKF engine tests','Production deployment','MCP or voice invocation','Human/LLM consumption benchmark','Performance benchmark','Docker execution','GitHub Actions execution','Full RFC 8785 conformance certification'],
 'scope_warning':'These tests validate newly reconstructed fixtures and selected invariants; not the missing original artefacts or full BEP semantics.'}
(OUT/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['exit_code','tests_run','tests_passed','citation_scan_findings']},indent=2))
sys.exit(bool(p.returncode or findings))
