#!/usr/bin/env python3
"""Mapping-driven, fail-closed replacement. Does not guess or delete unmapped citations."""
from __future__ import annotations
import argparse,json,re,sys
from pathlib import Path
OPEN,CLOSE=chr(0xE200),chr(0xE201)
PAT=re.compile(re.escape(OPEN)+r'.*?'+re.escape(CLOSE),re.S)
def rewrite(text:str,mapping:dict[str,str])->str:
    def replace(m):
        if m.group() not in mapping: raise ValueError('Unmapped citation; output not written')
        return mapping[m.group()]
    result=PAT.sub(replace,text)
    if OPEN in result or CLOSE in result: raise ValueError('Malformed unresolved citation')
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('input',type=Path);p.add_argument('--mapping',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
    try:
        if a.input.resolve()==a.output.resolve(): raise ValueError('Refusing to overwrite original')
        mapped=json.loads(a.mapping.read_text(encoding='utf-8'))
        out=rewrite(a.input.read_text(encoding='utf-8'),mapped)
        a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(out,encoding='utf-8')
    except (ValueError,OSError) as e: print(str(e),file=sys.stderr);raise SystemExit(2)
