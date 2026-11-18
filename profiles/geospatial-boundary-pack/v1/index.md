# Geospatial boundary pack v1 candidate

This candidate profile defines a manifest for two display representations of
one geography family and vintage. A large bundle can declare an optional
`entrypoints.boundary_pack` object with a package-relative `path`, exact
`bytes` and `sha256`. The manifest uses `okf-geospatial-boundary-pack.v1` as
its schema identifier. A vintage can identify an exact month or date as
reported by the source.
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

## UK countries display example

The [example manifest](examples/uk-countries-december-2025/manifest.json)
binds the December 2025 ONS BUC and BGC country representations. Both levels
contain all four ONS country codes. The overview is approximately 0.8 MB and
the focused detail is approximately 2.5 MB. The pack excludes the Crown
dependencies and overseas territories. [BUC source](https://www.arcgis.com/home/item.html?id=818212ae5b2948bcb352842081c03762), [BGC source](https://www.arcgis.com/home/item.html?id=c8bea35f51054f0c95aa876f66fe027c)

Build it offline from retained ONS FeatureServer layer 0 GeoJSON queries with
`where=1=1`, `outFields=CTRY25CD,CTRY25NM`, `outSR=4326` and `f=geojson`.
The builder checks the two exact source digests before using GDAL 3.13.2 and
GEOS 3.14.1. The output directory must be new.

```sh
uv run --locked python scripts/build_ons_country_boundary_pack.py \
  --buc BUC.geojson --bgc BGC.geojson --output /tmp/uk-countries-december-2025
```

The [build receipt](examples/uk-countries-december-2025/receipt.json) records
no geometry or coverage findings in the retained inputs or the display
outputs. The detail simplifies the BGC coverage at 0.001 degrees and contains
one fewer polygon component for England. Use the original product for
analysis that depends on exact geometry or small islands.

The [companion Explorer descriptor](examples/uk-countries-december-2025/okf-explorer.json)
binds this exact manifest. It has one record per country so it can run the
overview, focused map and text alternatives without any other bundle.

When you open Map with a bundle that declares a pack, Explorer verifies and
loads only the overview. The focused map fetches detail and brings the
selected record into view. The text alternative lists the geography codes.
Each level shows the vintage and attribution, with the source, variant and
limitations under **Boundary source and scale**. If the bytes cannot be
verified, Explorer labels the schematic outline and keeps the record list.
The pack route uses static files on the bundle origin. Explorer reuses the
checked layers when changing scale.

An optional `offline_resources` list binds up to 12 JSON or gzip-compressed
JSON files by path, byte count and SHA-256. List the data needed to open and
use Map, including the record manifest and displayed records. Each file has a
1 MiB limit. A same-origin pack with this declaration offers **Save map for
offline use**. The saved snapshot includes the Explorer shell, exact
descriptor, both boundary levels and the declared map data, with an overall
16 MiB limit. Reopen the same Map address to use it after losing connectivity.
Saving another map replaces it on that browser. Browsers can evict local
storage. The map fetches ordinary routes from the network when available.
