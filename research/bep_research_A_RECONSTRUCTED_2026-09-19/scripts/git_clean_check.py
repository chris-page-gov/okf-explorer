#!/usr/bin/env python3
"""Pass-through, fail-closed Git clean filter. It does not rewrite source evidence."""
import sys
from check_no_ui_tokens import bad_text
raw=sys.stdin.buffer.read()
if bad_text(raw):
    print('Unresolved citation; clean filter refused input',file=sys.stderr)
    raise SystemExit(1)
sys.stdout.buffer.write(raw)
