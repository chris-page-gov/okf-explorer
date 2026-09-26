# Delivery audit — replacement, not recovered original

**The old “Produced / validated / rescanned” table is not accepted as verified delivery.**
The original supplementary files and run receipts were not recovered. Nothing in this
replacement proves those earlier operations took place, nor proves the originals never existed.

This table records what is now present and the scope of the new evidence. The new archive
has a distinct name and hash. Three supplied inputs are byte-identical copies; the report
analysis is recovered and edited; all other files are reconstructed or freshly generated.

| Promised artefact | Current files | Current, qualified status |
|---|---|---|
| Completed cited analytical report | `REPORT.md`, `REPORT.html` | Recovered analytical text, edited delivery claims; source associations restored; not a fresh full source audit |
| File-integrity verification | `verification.json` | New test receipt; final archive independently checked in external FINAL_VERIFICATION.json |
| Root-cause analysis with confidence/limitations | `RECOVERY_DIAGNOSIS.md` | Reconstructed diagnosis; exact cause remains unknown |
| Clean input copies | `inputs/00_START_HERE.md`, `inputs/A_BEP_SEMANTICS_AND_EVALUATION(1).md`, `inputs/sources.json` | Three actual source files copied byte-identically; hashes recorded |
| Machine-readable provenance original to clean | `provenance-map.json` | Actual input-copy and report-transformation mapping; not the missing original mapping |
| Expanded stable source register | `sources-expanded.json` | Recovered seed plus saved report references and new checks; verification status explicit |
| Prior-art/novelty matrix | `prior_art_matrix.csv` | Reconstructed from saved analysis; not a newly executed systematic review |
| Proposed versioned BEP profile | `BEP_PROFILE.md` | Newly reconstructed proposal with unique version |
| Draft 2020-12 JSON Schema | `bep-core-v0.1-reconstructed.schema.json` | New schema checked and exercised locally |
| Valid prose example | `examples/valid-minimal.json` | New synthetic fixture; validated locally |
| Valid numeric observation example | `examples/valid-numeric-observation.json` | New synthetic fixture; validated locally |
| Invalid missing-provenance example | `examples/invalid-missing-provenance.json` | New fixture; rejected for provenance minItems as intended |
| Canonicalisation test vectors | `canonicalisation-vectors.json` | 16 new bounded vectors exercised; not full RFC certification |
| Independent evaluation specification | `evaluation_spec.json` | New experimental specification; no independent domain review or system benchmark executed |
| Synthetic sample evaluation corpus | `sample_corpus.jsonl` | 12 synthetic starter cases; separate assessor expectations; not complete real-engine runs |
| Threat model | `threat_model.csv` | Reconstructed controls, test ideas and explicit residual limitations |
| Compatibility/migration note | `compatibility_migration.md` | New compatibility guidance; no adapter or migration implemented |
| Ranked hypothesis ledger | `hypothesis_ledger.csv` | Six proposed priorities and falsification criteria; hypotheses unmeasured |
| Reproducible search log | `search_log.csv`, `historical_search_log_status.json` | New reconstruction search log only; original historical log not recovered |
| Reproducible Docker/offline execution specification | `EXECUTION.md`, `Dockerfile.example` | Recipe supplied; Docker unavailable and unexecuted; image/wheelhouse still require acquisition and pinning |
| Runtime citation-marker scanner | `scripts/check_no_ui_tokens.py` | New utility executed on files and uncompressed ZIP members; does not extract PDF text |
| Mapping-driven legacy remediation script | `scripts/rewrite_citations.py` | New fail-closed utility; mapped and unmapped cases tested |
| CI workflow | `.github/workflows/research-artifact-integrity.yml` | Unexecuted public-repository example; not deployed |
| Git filter example | `git-filter-example.md`, `scripts/git_clean_check.py` | Pass-through rejecting filter supplied; no Git configuration changed |
| File manifest and checksums | `manifest.json`, `checksums.sha256` | New hashes of actual delivered bytes; self-reference rules explicit |
| Final ZIP | `../bep_research_A_RECONSTRUCTED_2026-09-19.zip` | New reconstruction archive; original ZIP not recovered; CRC/member hashes and marker scan executed |

## Acceptance boundary

Read `verification.json` for the exact local tests, outputs, versions and file hashes.
The external final verification receipt binds the final ZIP, avoiding a self-hash cycle.
A fresh fixture pass does not establish real Ask OKF correctness, full literature coverage,
permission safety, production readiness, useful model responses or voice support.
