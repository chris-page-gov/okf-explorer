# Land Registry search rank replay

The **exact boundary** query returned the expected GOV.UK record at rank 1
in three fresh Chrome 158 contexts on 18 November 2026. All 16 canonical
result positions agreed at settlement and two rendered frames later. Each
context returned the same 56 response identities and SHA-256 digests.

The local test used Land Registry descriptor SHA-256
`36d21eee6b3fcf85ea1a9f9a6501e39d73acba3aef9904c4120075878d4b4b5d`.
The Explorer app manifest SHA-256 was
`8d0d55d4e448b0158ac54ade8ec0ad2741784eaf938a7f466f8537a8d94a215c`.
The [historical v0.6.3 receipt](../postmortems/land-registry-v0.3.0/public-verification/receipt.json)
binds an earlier Explorer build. The release contract checks that the expected
record is present. The observed order is evidence for these inputs and runs.

Serve the assembled Explorer and retained Land Registry bundle from one local
HTTP server. Run `scripts/check_search_rank_stability.mjs` with the app and
bundle URLs, the query, the expected canonical URL and an unused receipt path.
The script records the ordered URLs and compares the response digests. It
returns a non-zero status for a changed input or an observed change in order.
