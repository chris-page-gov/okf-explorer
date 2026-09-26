# Research A — recovered analysis and reconstructed artefacts

**This is a new replacement package, not the missing original.** The original report's
claims of delivery and prior execution remain unverified. Do not use the old ZIP checksum
for this archive. No repository was modified and no service was deployed.

Start with [Delivery audit](DELIVERY_AUDIT.md), then [Research report](REPORT.md)
or [Formatted research report](REPORT.html). The [fresh test receipt](verification.json)
records only work actually performed on this replacement.

## Contents

The package contains the recovered analytical report, a source register with explicit
verification status, proposed schema and profile, synthetic prose/numeric/API/insufficiency
examples, bounded canonicalisation vectors, an evaluation specification and starter corpus,
prior-art matrix, threat model, hypotheses, compatibility note, scripts, execution recipes,
three byte-identical input copies, provenance mappings, an audit and integrity indexes.

The proposed schema is `bep-core.v0.1-reconstructed.1`: not a recovered original schema,
not an OKF standard and not a change to `okf-governed-context.v1`.

## Validate and rerun

```sh
python -B scripts/verify_package.py .
python -B scripts/run_checks.py --output-dir ../bep-rerun-results
```

Read [Execution instructions](EXECUTION.md) before provisioning. The manifest covers actual
files; checksums additionally cover the manifest. Neither index claims a self-referential hash.
Docker and CI are explicitly unexecuted recipes. Dependencies and an immutable container
image must be acquired and recorded before an isolated Docker run is reproducible.

## Limits

This reconstruction is not a fresh full Deep Research run. Most literature source identities
are restored from saved metadata, not re-audited claim by claim. The included experiments
are synthetic local tests, not an empirical comparison of BEP designs or storage systems.
The 12 starter evaluation cases are not specialist-reviewed, complete real-engine fixtures.
No original historical search log, schema bytes, verification receipt or ZIP has been recovered.
