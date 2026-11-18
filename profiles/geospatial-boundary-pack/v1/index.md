# Geospatial boundary pack v1 candidate

This proposed profile defines a manifest for two display representations of
one geography family and vintage. An optional bundle descriptor extension
would bind the manifest by same-origin relative path, byte count and SHA-256.
The candidate uses `okf-geospatial-boundary-pack.v1` as its schema identifier.
See the [manifest schema](manifest.schema.json).

The manifest identifies the geography family, code scheme, boundary vintage
and territorial coverage. Each GeoJSON representation records its source
product, version, exact digest, retrieval date, source coordinate reference
system, licence and required attribution. Its output records exact byte
count and digest. Both display files use longitude then latitude in
`OGC:CRS84`.

## Build and read the pack

Check a local candidate with
`uv run --locked python scripts/check_boundary_pack.py path/to/manifest.json`.
The checker verifies bounds, exact bytes, unique logical IDs, basic ring and
coordinate structure and matching feature codes across the two levels. The
source licence, topology, boundary vintage and coverage still need source
review.

1. Pin the published source release and metadata. Verify each layer's licence,
   required attribution and declared coverage against the delivered archive.
2. Reproject and derive both files with pinned tools. Reconcile their logical
   feature IDs with the source IDs. Check geometry validity, matching codes,
   retained islands and shared-boundary topology where needed.
3. At read time, resolve only package-relative paths within the manifest
   directory. Reject redirects, oversized downloads, digest mismatches and
   unrecognised media. Check feature count, unique code and geometry before
   drawing.
4. Fetch the overview below `detail_min_zoom` and the detail at or above it.
   Keep the same ID lookup across scales. Record any different coastal
   variant and expose the representation, its provenance and its limits in
   the map and its text alternative.

Use the dated ONS digital-boundary layer for the exact geography and variant
provided by the publisher. The first UK pack needs a recorded check of all
four nations and islands. OS Boundary-Line supplies Great Britain coverage.
Northern Ireland requires an appropriate separate authority when using OS
Boundary-Line. Retain the source licence and attribution per layer. [ONS digital boundaries](https://www.ons.gov.uk/methodology/geography/geographicalproducts/digitalboundaries), [OS Boundary-Line](https://www.ordnancesurvey.co.uk/products/boundary-line)

The schema is the first review increment for
[issue #84](https://github.com/chris-page-gov/okf-explorer/issues/84). An
adopted pack still needs reviewed source bytes, a reproducible builder,
runtime validation and map and offline acceptance. The current Explorer
retains its labelled schematic locator outline. OpenStreetMap tiles are
outside this pack contract.
