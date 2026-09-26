#!/usr/bin/env python3
"""Fail on unresolved session citation wrappers; inspect ZIP members, not compressed bytes.
Scope: UTF-8 text and ZIP text members. PDF binary text extraction is NOT performed.
Archives are bounded, never extracted, and cannot use unsafe member paths.
"""
from __future__ import annotations
import argparse, json, re, zipfile
from pathlib import Path, PurePosixPath
OPEN, CLOSE = chr(0xE200), chr(0xE201)
TOKEN = re.compile(re.escape(OPEN)+r'.*?'+re.escape(CLOSE), re.S)
FLATTENED = re.compile(r'\bfilecite(?:turn\d+file\d+)+\b')
MAX_TOTAL=32*1024*1024

def bad_text(raw: bytes) -> list[str]:
    try: text=raw.decode('utf-8')
    except UnicodeDecodeError: return []
    findings=[]
    if TOKEN.search(text) or OPEN in text or CLOSE in text: findings.append('runtime_wrapper')
    if FLATTENED.search(text): findings.append('flattened_session_citation')
    if re.search(r'\\u[eE]200',text) or re.search(r'\\u[eE]201',text): findings.append('escaped_runtime_wrapper')
    return findings

def scan(path: Path) -> list[dict]:
    findings=[]
    files=sorted(path.rglob('*')) if path.is_dir() else [path]
    total=0
    for p in files:
        if not p.is_file() or '__pycache__' in p.parts: continue
        if p.is_symlink(): findings.append({'path':str(p),'error':'symlink'});continue
        if p.stat().st_size>MAX_TOTAL: findings.append({'path':str(p),'error':'file_size_limit'});continue
        if p.suffix in ('.zip','.docx'):
            try:
                with zipfile.ZipFile(p) as z:
                    for entry in z.infolist():
                        if entry.is_dir(): continue
                        name=PurePosixPath(entry.filename)
                        if name.is_absolute() or '..' in name.parts or '\\' in entry.filename: raise ValueError('unsafe_path')
                        total+=entry.file_size
                        if total>MAX_TOTAL: raise ValueError('archive_size_limit')
                        for issue in bad_text(z.read(entry)):
                            findings.append({'path':str(p)+'!'+entry.filename,'error':issue})
            except (ValueError,zipfile.BadZipFile,RuntimeError) as e: findings.append({'path':str(p),'error':str(e)})
        else:
            total+=p.stat().st_size
            if total>MAX_TOTAL: findings.append({'path':str(p),'error':'scan_size_limit'});break
            for issue in bad_text(p.read_bytes()): findings.append({'path':str(p),'error':issue})
    return findings

def main():
    ap=argparse.ArgumentParser();ap.add_argument('paths',nargs='+',type=Path);a=ap.parse_args()
    result=[r for p in a.paths for r in scan(p)]
    print(json.dumps({'scope':'UTF-8 text and bounded ZIP members','findings':result},indent=2))
    raise SystemExit(bool(result))
if __name__=='__main__': main()
