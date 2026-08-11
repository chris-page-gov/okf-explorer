# Archived release-assurance evidence

This directory preserves superseded evidence bytes for audit history. Files
here are not current release authority and must not be copied to the canonical
release-evidence destination without running the current gate.

`explorer-runtime-acceptance-v1-2026-07-26.json` is the byte-identical legacy
receipt formerly stored at
`release-assurance/explorer-runtime-acceptance.json`. Its SHA-256 is
`a7e1da78e852677f0ce94f1108f057536b5c5ecfb43ff8cf40d221594780f365`.
It predates the release-bound v2 contract, so its overall `passed` value records
the behaviour of that historical runner and does not approve Explorer v0.6.1
or any later candidate.

The canonical v0.6.2 receipt must be generated afresh at
`release-assurance/explorer-runtime-acceptance.json` by the clean-commit,
annotated-tag and exact-candidate v2 release gate. An unbound v1 run is
diagnostic and deliberately has overall status `failed`, even when its
individual browser checks pass.
