# Land Registry search rank replay

The **exact boundary** query returned the expected GOV.UK record at rank 1
in three fresh Chrome 158 contexts on 18 November 2026. All 16 canonical
result positions agreed at settlement, two rendered frames later and after
a further 500 milliseconds. Each context returned the same 57 response
identities and SHA-256 digests.

The local test used Land Registry descriptor SHA-256
`36d21eee6b3fcf85ea1a9f9a6501e39d73acba3aef9904c4120075878d4b4b5d`.
The Explorer app manifest SHA-256 was
`f15a8d155629ad6b0a265174562405251bda7df2c6630985a9f0b7f05f86ccd1`.
The [historical v0.6.3 receipt](../postmortems/land-registry-v0.3.0/public-verification/receipt.json)
binds an earlier Explorer build. The release contract checks that the expected
record is present. The observed order is evidence for these inputs and runs.

Serve the assembled Explorer and retained Land Registry bundle from one local
HTTP server. Run `scripts/check_search_rank_stability.mjs` with the app and
bundle URLs, the query, the expected canonical URL and an unused receipt path.
The script records the ordered URLs at settlement, after two rendered frames
and 500 milliseconds later. It compares response digests across all runs and
returns a non-zero status for a changed input or an observed change in order.
