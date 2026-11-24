# Profile fixture walkthroughs

Each retained profile fixture has its own question, complete small graph,
diagram, source hashes, AI context and record journeys:

- [PROV-O hierarchies](../profiles/bounded-inference/v1/ontology/walkthrough.html)
  covers six records and four hierarchy assertions.
- [Vocabulary schemes](../profiles/governed-vocabulary/v1/examples/vocabulary/walkthrough.html)
  covers six terms and three memberships.
- [Missing CSV label](../profiles/governed-vocabulary/v1/examples/missing-csv-label/walkthrough.html)
  preserves the intentional preferred-label violation and its review evidence.
- [UK country boundaries](../profiles/geospatial-boundary-pack/v1/examples/uk-countries-december-2025/walkthrough.html)
  covers four country records, two cartographic representations and the
  recorded coverage, vintage and source conditions. It asserts no graph edges.

The authored questions are the four Markdown files under
`profiles/walkthroughs/`. Run
`uv run --locked python scripts/build_profile_walkthroughs.py` to regenerate
their projections, or append `--check` to reject drift. The generator rejects
changed labels, predicates, graph populations, boundary qualifications and
validation dispositions that would invalidate the worked answers.

After building the canonical Reader, run
`node apps/okf-explorer/scripts/verify_profile_walkthroughs.mjs .tmp/profile-guides.json`.
It checks actual guide clicks, exact record selection, reloads, desktop and
mobile accessibility, and every local fixture asset response. CI runs this
inside the existing protected reference-access job and retains screenshots.

These are RDF or geospatial metadata extensions. Their acceptance does not
certify a Markdown concept tree against core 0.3. Source triples, geometry,
identifiers, dates and the deliberate negative control remain unchanged.

The native journey contract allows an explicitly absent `id`, `version` or
`snapshot` only when `expected_descriptor_sha256` pins the complete descriptor
bytes. `schema` remains mandatory. The runner checks both the digest and every
declared identity value before launching the journey. A hash cannot override
an identity mismatch. Missing fields remain unknown; no version is invented.
Source conformance remains a separate required check for a Markdown producer.

Local generation, browser checks, public verification and formal release are
separate acceptance stages. These pages do not declare the estate programme
complete.
