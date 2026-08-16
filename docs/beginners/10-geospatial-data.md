# Geospatial Data

Geospatial data describes location, shape or spatial coverage. The Map view
supports discovery and bounded inspection; it is not a full Geographic
Information System.

## Place Is More Than A Name

“London” can mean:

- a named concept;
- a legal or statistical geography;
- a bounding rectangle;
- a point used to locate the area on a small map;
- an exact boundary polygon;
- a field value occurring in prose.

These representations are not interchangeable. The Explorer records what kind
of evidence it has.

## Coordinates

A coordinate locates a position within a Coordinate Reference System, or
**CRS**.

Web data commonly uses WGS 84 longitude and latitude:

```json
{
  "type": "Point",
  "coordinates": [-0.1276, 51.5072]
}
```

In GeoJSON the order is longitude, then latitude. This is easy to reverse.

The identifier `EPSG:4326` commonly names WGS 84. UK analytical data may use
British National Grid, `EPSG:27700`, measured in metres. Plotting one as the
other produces incorrect locations.

## Geometry

Common geometry types include:

- Point;
- MultiPoint;
- LineString;
- MultiLineString;
- Polygon;
- MultiPolygon;
- GeometryCollection.

A polygon has rings of positions. A boundary can contain many thousands of
coordinates, so a preview must limit complexity.

## Feature And Feature Collection

GeoJSON wraps geometry with properties:

```json
{
  "type": "Feature",
  "properties": {
    "name": "Example Area"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-0.1276, 51.5072]
  }
}
```

A `FeatureCollection` contains several features. The preview loader accepts a
bounded number and reports when more existed.

## Bounding Box

A bounding box records minimum and maximum coordinates:

```text
[west, south, east, north]
```

It is a cheap way to show extent, but it is not the real boundary. An irregular
coastal area can occupy only a small part of its box.

## Geography Codes And Vintages

Stable codes are better than labels for joining data. UK statistical
geographies commonly use GSS codes.

A code still needs context:

- geography level;
- source organisation;
- release or vintage;
- exact or best-fit derivation;
- boundary variant;
- CRS.

Boundaries and administrative structures change over time. A code without a
vintage can be ambiguous for historical comparison.

## Exact, Best-Fit And Representative

- **Exact** means the source geometry follows the declared geography.
- **Best-fit** means smaller units were assigned to a larger area under a
  documented rule.
- **Representative point** is a locator chosen for display.

A representative point must never be drawn or described as the authoritative
boundary.

## Evidence Levels In The Explorer

The Map classifies records from strongest to weakest evidence:

1. explicit coordinates, geometry or bounding box;
2. declared coverage or jurisdiction fields;
3. recognisable geospatial service or file;
4. bounded place or spatial-language match in text.

A record can have several signals. The interface preserves the matched field,
value and rule so a user can inspect why it was classified.

Text classification helps discovery. It does not prove that the dataset's
geography is complete or current.

## Geospatial Files And Services

### GeoJSON

JSON encoding of features and geometries. It is the primary direct preview
format supported by the Explorer.

### KML, GML, Shapefile And GeoPackage

These are common exchange or storage formats. The current prototype can
recognise and link them but does not parse their bodies in the browser.

### OGC Web Services

Open Geospatial Consortium standards include:

- WMS for rendered map images;
- WFS for vector features;
- WMTS for tiled map images;
- WCS for gridded coverages;
- OGC API Features for web-native feature access.

Recognition is not the same as successful preview. Service versions, query
parameters, CRS support, authentication and Cross-Origin Resource Sharing
(CORS) all matter.

### ArcGIS REST

ArcGIS `FeatureServer` and `MapServer` URLs expose service and layer metadata.
The Explorer can:

1. inspect a service;
2. choose a declared feature layer;
3. request a capped GeoJSON result;
4. render supported geometry;
5. retain the original source when anything fails.

It does not probe private layers or insert credentials.

## The current basemap dependency

The current locator requests four raster tiles from
`tile.openstreetmap.org` at zoom level 5 and draws the hand-authored UK outline
over them. It displays OpenStreetMap attribution, but it is not presently a
self-contained or offline map. Opening Map discloses the tile requests to that
service, and a network or policy failure can leave only the local outline,
markers and grid.

The [OpenStreetMap Foundation tile-usage policy](https://operations.osmfoundation.org/policies/tiles/)
requires normal clients to honour cache headers and explicitly prohibits bulk
download, prefetch and offline archives from its public tile service. A
boundary-pack builder must therefore never copy those public raster tiles into
an OKF cache.

The boundary proposal treats a **basemap** and **evidence geometry** as
different layers. A privacy-preserving default could use only a locally
published overview boundary and grid. Live OpenStreetMap or another configured
basemap could be an explicit enhancement with its own attribution, privacy,
availability and usage-policy statement. A publisher could instead ship or
self-host a basemap only where its source licence explicitly permits that
redistribution and caching.

## Proposed boundary packs (not yet implemented)

**Status: planned, not implemented.** The current UK locator is a very small
hand-authored outline drawn from a handful of hard-coded coordinates. That
explains why its coastline can look angular or visibly wrong at the scale
shown. It is a temporary presentation aid, not a supplied boundary and not
evidence about any record.

The proposed replacement is a **boundary pack**: an optional, cached
[sidecar](16-beginner-glossary.md#sidecar) whose geometry is connected to the
bundle's semantic entities by stable identifiers. YAML for Linked Data
(YAML-LD) would continue to say *which*
geography a record is about and *what relationship* it has to that geography.
The sidecar would say how that geography may be drawn at particular scales.
Keeping these concerns separate avoids putting millions of coordinates into
an ontology.

The proposal has two complementary tiers:

1. a small Explorer-owned overview pack can replace the temporary UK outline
   even when a bundle supplies no geometry; and
2. a bundle-specific sidecar can provide dated boundaries for the particular
   countries, authorities, statistical areas or other spatial entities used by
   that corpus.

The proposed contract name and fields remain candidates until
[Explorer issue #84](https://github.com/chris-page-gov/okf-explorer/issues/84)
is implemented and released. The
[completed contract review](https://github.com/chris-page-gov/okf-explorer/issues/84#issuecomment-5243013332)
records the acceptance detail. An illustrative descriptor reference is:

```json
{
  "geometry_packs": [
    {
      "id": "ons-countries-dec-2025-uk-buc",
      "manifest": "geometry/ons-countries-dec-2025-uk-buc/manifest.json",
      "manifest_schema": "okf-geometry-pack.v1",
      "media_type": "application/json",
      "bytes": 12345,
      "sha256": "<SHA-256 of the exact manifest bytes>",
      "required": false
    }
  ]
}
```

The root descriptor, rather than the manifest itself, binds the manifest's
schema version, media type, exact byte count and detached
[digest](16-beginner-glossary.md#digest). The Reader would reject an
over-budget, short or long response before parsing JSON, then verify the
digest. The manifest must not claim its own digest as the binding proof. The
names above are illustrative and are not an accepted schema.

The manifest would bind:

- the dated source URL, retrieval time and source-file digest;
- publisher, licence, required attribution and territorial coverage;
- geography type, identifier scheme, code,
  [boundary vintage](16-beginner-glossary.md#boundary-vintage) and
  [variant](16-beginner-glossary.md#boundary-variant);
- source and display Coordinate Reference Systems;
- every local file's path, media type, byte size and SHA-256 digest;
- the transformation tool, version and reproducible
  [boundary-generalisation](16-beginner-glossary.md#boundary-generalisation)
  settings;
- zoom or scale ranges for each
  [level of detail (LOD)](16-beginner-glossary.md#level-of-detail-lod); and
- known omissions and limits, including whether coverage is Great Britain or
  the whole United Kingdom.

Names alone are unsafe joins. A normal join key would combine identifier
scheme, stable identifier, geography type and vintage. For an Office for
National Statistics (ONS) statistical geography this might include a
[Government Statistical Service (GSS) code](16-beginner-glossary.md#gss-code).
A builder must reject duplicate or unresolved keys rather than attaching a
plausible-looking polygon by name.

The [semantic geography](16-beginner-glossary.md#semantic-geography) and its
[geometry representations](16-beginner-glossary.md#geometry-representation)
are also different identified resources. For example, “Coventry local
authority district, 2025” is the semantic geography; its `BGC` polygon in WGS
84 and its vector-tile representation in Web Mercator are representations of
that geography. They need their own identifiers, formats, CRS, LOD, derivation
and rights. Replacing one representation must not silently create a new
geography or change assertions about the original one.

Where ONS publishes a GSS code, the semantic entity can retain the canonical
`http://statistics.data.gov.uk/id/statistical-geography/{GSS_CODE}`
[Internationalized Resource Identifier (IRI)](23-foundational-definitions.md#iri).
It must not be changed to HTTPS merely for stylistic consistency. Where no GSS
identity exists, the pack can declare an OS identifier (OSID) or source-local
scheme, but must not invent one. An
[explicit join table](16-beginner-glossary.md#join-table) connects each
semantic identity to one logical source feature. Its uniqueness rule applies
before tiling: the same feature may legitimately occur in several vector
tiles.

Each representation identity also binds its source product or item, geography
type, [boundary vintage](16-beginner-glossary.md#boundary-vintage), source
publication or version, upstream modification, retrieval and build times,
boundary variant, derivation and digest. A dated ArcGIS item can still change,
so the builder retains the exact source metadata and bytes.

### Use the right detail for the scale

One shape is rarely suitable at every scale. At a UK-wide zoom, a carefully
generalised boundary usually looks better and transfers faster than an exact
polygon containing thousands of points. At a local zoom, the Explorer can
load a more detailed representation.

The [ONS digital-boundary guidance](https://www.ons.gov.uk/methodology/geography/geographicalproducts/digitalboundaries)
uses four [boundary-detail abbreviations](16-beginner-glossary.md#bfc-bfe-bgc-and-buc):
full-resolution clipped boundaries (`BFC`), full-resolution
extent-of-the-realm boundaries (`BFE`), generalised 20-metre clipped
boundaries (`BGC`) and ultra-generalised 500-metre clipped boundaries (`BUC`).
[Some newer ONS products](https://www.arcgis.com/home/item.html?id=4fffd34acb25451dbaac59f01ecbcbbe)
also publish super-generalised 200-metre clipped boundaries (`BSC`). `BSC` and
`BUC` are distinct representations and a builder must not treat one
abbreviation as an alias of the other. Availability varies by geography and
release. `BFE` is a different coastal extent, not simply a more detailed rung
in the display ladder.
A sensible initial policy is:

- use `BUC` for a national overview such as the locator shown above;
- use `BGC` for regional and local-authority browsing; and
- load `BFC` only where closer inspection justifies its cost.

For the screenshot's national locator, a suitable first candidate is the dated
[Countries (December 2025) UK BUC item](https://www.arcgis.com/home/item.html?id=818212ae5b2948bcb352842081c03762),
converted into a small, whole-file-verifiable TopoJSON overview. Its source
metadata, codes, polygon parts and islands would still be checked rather than
assuming that the word “UK” in a title proves complete coverage. The coverage
statement must say explicitly whether Crown Dependencies and Overseas
Territories are excluded. Validation must check expected codes, polygon parts,
rings and small islands after generalisation.

These are display choices, not interchangeable evidence. Exact or
source-supplied geometry must remain separately identified and must be used
for analysis when the task requires it. A display-generalised polygon must not
be presented as a cadastral, legal or measurement boundary.

For browser delivery, a small TopoJSON overview is a practical first step
because neighbouring polygons can share arcs and the complete file can be
verified before it is drawn. PMTiles or Mapbox Vector Tiles (MVT) are better
candidates for a large, multi-scale pack. GeoPackage (GPKG) is useful as an
auditable builder input. Large raw GeoJSON files are simple but can be slow to
download, parse and retain in browser memory.

The output format determines part of the
[CRS](16-beginner-glossary.md#crs) contract. RFC 7946 GeoJSON uses CRS84
longitude and latitude and must not carry an arbitrary alternate CRS; this
proposed TopoJSON overview would use the same coordinate convention. Web
vector tiles normally use a named Web Mercator tile matrix. Each
[LOD](16-beginner-glossary.md#level-of-detail-lod) must state its output CRS or
tile matrix, zoom range, geometric error or simplification tolerance and
units, quantisation and topology method, feature and coordinate counts, bounds
and topology checks. TopoJSON shares arcs only when the builder constructs a
coherent topology. The manifest must also retain the source CRS and exact
transformation, so display convenience does not erase provenance.

A range-loaded PMTiles archive needs an extra integrity decision. A byte-range
request fetches only part of the archive, and its ordinary header and
directories do not provide cryptographic hashes for every requested range.
The Explorer can either download and verify the complete archive before
rendering, or the builder can publish independently
[digest-bound](16-beginner-glossary.md#digest) chunks or a reviewed
Merkle-style manifest—a tree of digests—that lets each fetched range be
verified. A whole-file SHA-256 digest cannot be verified before partial range
rendering and must not be described as trust-before-render.

### Source and delivery options

| Option | Appropriate use | Important limitation |
| --- | --- | --- |
| Dated ONS digital-boundary release cached by the builder | Recommended default for supported UK statistical geographies; choose an available `BUC`, `BSC`, `BGC` or `BFC` representation for the intended scale. | Availability varies. Each layer still needs its exact geography, vintage, coverage and attribution recorded. A mutable “latest” URL is not a release identity. |
| [Ordnance Survey (OS) Boundary-Line](https://docs.os.uk/os-downloads/products/areas-and-zones-portfolio/boundary-line) cached by the builder | Detailed administrative and electoral boundaries for Great Britain; available as open vector data and in several formats. | Great Britain (GB) is not the whole United Kingdom (UK). Northern Ireland coverage needs its own authoritative source and provenance. |
| [OS Downloads API](https://docs.os.uk/os-apis/accessing-os-apis/os-downloads-api) used during a build | Automating discovery and download of OS OpenData, followed by local validation, conversion and caching. | It does not provide immutable history for OpenData, so the builder must retain the exact downloaded bytes, product metadata and digest. |
| OS National Geographic Database (NGD) Select+Build or Tiles | Conditional access to supported OS administrative and statistical boundary representations. | These boundaries are not supplied through OS NGD API Features. Access, coverage, licensing and caching must be reviewed before adoption. |
| A shared, content-addressed OKF boundary registry | Avoiding duplicate copies where many bundles use the same exact pack. The bundle pins a digest and may keep a local fallback. | Availability, ownership, retention, licence and cross-origin delivery become shared infrastructure concerns. |
| A live feature or vector-tile API | Optional, user-initiated enhancement where its access terms permit it. | Network failure, version drift, CORS, throttling, credentials and disclosure of user interests make it a poor default dependency. Public OpenStreetMap Foundation tiles must not be prefetched or repackaged for offline use. |
| Inline GeoJSON in the main bundle | A tiny fixture or one small source-supplied shape. | It scales badly and mixes semantic identity with a bulky presentation representation. |

The [OS Places API](https://docs.os.uk/os-apis/accessing-os-apis/os-places-api)
is useful for address, postcode and Unique Property Reference Number (UPRN)
lookup and geocoding. It is not a boundary-download API. Its polygon operation
finds addresses within a polygon that the caller supplies; it does not return
that polygon. Postcode areas are a separate use case. Code-Point with Polygons
and the OS NGD postcode-unit-area feature cover Great Britain, not the complete
United Kingdom, and may require licensed access. The current OS NGD Northern
Ireland feature-type inventory exposes a postcode-unit point but no
postcode-unit-area path, while its overview also discusses polygon use. A
builder must therefore inspect and pin the actual Select+Build schema and
package rather than assuming either description is complete.

A pinned [Office for National Statistics Postcode Directory or National Statistics Postcode Lookup](https://www.ons.gov.uk/methodology/geography/geographicalproducts/postcodeproducts)
can link UK postcodes to named statistical geographies, but it is a lookup,
not postcode-boundary geometry. Northern Ireland polygon coverage needs its
own authoritative source and rights review. None of these products should be
mistaken for administrative or national borders.

Unless an exact ONS layer is demonstrably UK-wide, Northern Ireland needs its
own source, rights, CRS and provenance. A Great Britain product must never be
presented as United Kingdom coverage.

### Safe caching and failure

The recommended default is build-time acquisition followed by same-origin,
[content-addressed](16-beginner-glossary.md#content-addressed) delivery. A
builder downloads or receives an official dated source, checks its type and
size, records rights and attribution, transforms it deterministically,
validates every digest and publishes only the derived pack. API keys and
access tokens never enter the bundle.

A dated-looking URL is not enough. Pack identity keeps the boundary's validity
or as-at date, source publication or version, upstream item or service
modification time, retrieval time and pack-build time as separate facts. The
builder retains and hashes the exact source bytes and metadata; a mutable
“latest” endpoint is only a discovery signal.

“Same origin” must be interpreted from the Reader's point of view. A pack
beside a bundle on the same host may still be cross-origin when that bundle is
opened in an Explorer hosted elsewhere. The descriptor must define whether a
URL is relative to the bundle or manifest, and the Reader must resolve it once
without silently proxying it. External producers must enable the required
[CORS](16-beginner-glossary.md#cors) and range responses or provide an
explicitly governed same-origin copy. Responses must be readable rather than
opaque, and redirects are revalidated against the URL policy.

The Explorer should select the smallest suitable LOD and cache immutable bytes
by digest. Small files can be verified completely before use. Range-addressed
large files need the full-download or chunk-verification design described
above. Cross-origin packs additionally need explicit HTTP `Range` and CORS
support, immutable cache semantics and an object-consistency rule ensuring
that every range comes from the same unchanged version. Same-origin delivery
is simpler and is the preferred default.

The current publication deliberately retires its old service worker, so this
proposal also requires new, bounded cache lifecycle and eviction behaviour if
offline use is promised. A missing, corrupt, unlicensed or
identifier-incompatible pack must fail closed: the map can retain markers and
explain that boundary geometry is unavailable, but it must not silently draw a
different or guessed boundary.

Browser storage can be evicted, so “cached” does not automatically mean
“available offline”. An offline claim must say whether the complete verified
pack is retained or only previously fetched, individually verified chunks are
retained. Durable offline assurance needs an explicit downloadable snapshot,
not an assumption about the browser cache.

A secure builder and Reader also need contract-level limits for each manifest,
pack, layer and LOD. Limits cover files and archive entries, properties and
strings, features, rings, coordinates, tiles and ranges, nesting, download,
decompressed and retained bytes, processing time and memory. They must reject
path traversal, links and device files, decompression bombs, invalid CRS
declarations, non-finite coordinates, broken polygon topology and unexpectedly
complex geometry. These limits belong in the pack profile and receipt, so a
successful small fixture is not mistaken for an unbounded parser claim.

Conversion should run with pinned tools, low privilege and no unnecessary
network access. Archive extraction rejects paths that escape its workspace;
GeoPackage and SQLite extension loading remains disabled. Integrity proves
agreement with the reviewed descriptor, not that an unreviewed publisher or
source assertion is true.

Attribution is part of the rendered result, not merely hidden manifest
metadata. ONS boundary reuse normally requires the source and Open Government
Licence statement together with the applicable OS Crown copyright and
database right year. Every pack must retain the exact source wording. The
Explorer must display the attribution and licence URI for every visible
geometry or basemap layer, including downloadable or offline artefacts.
[Rights](23-foundational-definitions.md#rights) are recorded per source, layer
and nation rather than only once for the pack; postcode sources may add Royal
Mail or Northern Ireland Land and Property Services conditions.

Geometry remains supplementary. Every visible feature must also have an
accessible text or table route exposing its identity, source, vintage,
variant, relationships and rights. The evidence must not depend on colour,
shape or pointer use. See [accessibility](16-beginner-glossary.md#accessibility).

## Bounded Preview

Remote preview happens only after an explicit user action and is limited by:

- allowed URL schemes and sanitised query parameters;
- JSON response type;
- response bytes;
- feature count;
- coordinate count;
- supported geometry;
- timeout and retry policy.

If a preview cannot load, local metadata remains useful and the source link
remains available. Failure should not erase the record.

## Sensitive URLs

Bundle and resource URLs must not contain passwords, tokens or API keys.
Sensitive query parameter names are removed from geospatial URLs before they
are displayed or requested.

A static bundle is public. Any credential placed in it should be assumed
disclosed.

## Shared Context

The Map starts from the same search and facet reduction as Reader or Graph.
Selecting a place or evidence class produces a URL-addressable reduction that
the other views can use.

This makes geography part of retrieval rather than an isolated picture.

## Common Reasoning Errors

Avoid these conclusions:

- a place-name match proves exact geographic coverage;
- a point proves a boundary;
- a current boundary is valid for every historical record;
- a service URL proves anonymous access;
- a successful preview proves the data licence permits reuse;
- missing spatial metadata proves a record is non-spatial.

## Continue

Use the [illustrated Geospatial Map manual](../geospatial-map-manual.md) for a
worked interface journey and [Geospatial Map exploration](../geospatial-map-exploration.md)
for the implementation contract.

## Next

[UK legislation data](11-uk-legislation-data.md) introduces a second specialist
domain where identity, versions and authority are critical.
