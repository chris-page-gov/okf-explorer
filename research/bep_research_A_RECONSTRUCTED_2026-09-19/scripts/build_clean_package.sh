#!/bin/sh
set -eu
# Rebuild packaging from this exact reviewed directory. Does not recreate the missing original.
cd "$(dirname "$0")/.."
python -B scripts/run_checks.py
python -B scripts/package_release.py
