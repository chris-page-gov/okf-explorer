# Keep remote service publication records in step

The [shared DWP status page](https://github.com/chris-page-gov/okf-dwp/blob/main/docs/service-publication.md)
is the reference for the latest **recorded** deployment and public verification.
It describes retained observations, not continuous availability. Explorer's
guides contain a dated, receipt-backed observation and link to that shared page.
Do not maintain another unqualified “current deployment” paragraph in Explorer.

## Why the wording drifted

The 0.6.0 implementation and local checks were committed in Explorer. Later
hosting and public SDK observations were recorded in DWP. Explorer's guide,
service README and changelogs retained their earlier preparation wording. The
existing documentation gate required a documentation change, but did not check
that the factual release claim agreed with the receipts.

## Release and verification are different

- A software version identifies an implementation; it does not prove deployment.
- A hosting receipt records publication. A later deployment, including one with
  the same version number, needs its own matching observation.
- An SDK receipt records a particular client's requests and returned evidence.
  SDK means *software development kit*: here it supplies the MCP client.
- A complete reconstructed package can still contain insufficient evidence.
- ChatGPT, Data agent, browser and Voice acceptance each need observed tests.
  Transport success is not an answer-quality or legal-correctness result.

OKF+ makes domain knowledge and selected evidence inspectable. Ask OKF assembles
bounded evidence; MCP carries it to a compatible client. An AI interprets that
evidence under separate controls. Source preparation, assembly, delivery,
interpretation and any authorised action remain separate responsibilities.

## Record a subsequent publication

1. Retain the new hosting and public-client receipts in DWP. Preserve failed
   attempts. Use DWP's status generator and check to update the shared page;
   its receipt census rejects an overlooked later deployment or observation.
2. Keep an unmatched deployment labelled as awaiting verification. Preserve
   source, engine, deployed runtime and verifier identities separately.
3. Explorer's dated observation remains valid history. To add a new observation,
   copy only approved public receipts into a new dated directory and record
   their exact DWP commit, paths, byte counts and SHA-256 digests. Update the
   generator's declared receipt location and paths in the same reviewed change.
4. Refresh the marked blocks, then compare their inputs to the original Git
   objects. Neither command contacts the service or calls a model:

   ```sh
   uv run --locked python scripts/check_remote_release_docs.py --write --dwp-root /path/to/okf-dwp
   uv run --locked python scripts/check_remote_release_docs.py --dwp-root /path/to/okf-dwp
   uv run --locked python -m unittest tests.test_remote_release_docs -v
   ```

5. Update both changelogs. Run ordinary protected review and publication checks.
   Pull-request CI and Pages reject edited receipt-derived blocks, missing
   markers, inconsistent identities and the former unscoped deployment wording.

Frozen candidate files and failed receipts keep their original wording and
meaning. The documentation checker admits retained receipt bytes and checks
their coherence; it does not rerun the public requests or independently attest
the hosting platform. Changes made outside the declared receipt directories
still require review. No automated check can guarantee arbitrary prose remains
correct or that an unrecorded deployment has been documented.
