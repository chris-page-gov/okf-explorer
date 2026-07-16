# Geospatial Map Exploration

## Status

Working prototype contract for the `geospatial` branch. The implementation is
browser-only, deterministic and additive to existing OKF bundle formats.

Use the [Map personas and user stories](geospatial-map-personas-and-user-stories.md)
for role-based needs and acceptance traceability, and the
[illustrated Map manual](geospatial-map-manual.md) for a practical walkthrough.

## Aim

The Map canvas turns spatial metadata into another way to reduce and inspect an
OKF context. It must be useful for both explicit geospatial services such as
ArcGIS REST, WMS, WFS and GeoJSON and ordinary statistics or reports that name
the areas they describe.

The Map does not make Explorer an online GIS. It keeps the existing operating
model:

- static bundle metadata loads first;
- local classification, search and filtering require no AI or server;
- remote resource bodies are fetched only after an explicit user action;
- failed or unsupported previews retain a route back to the source;
- generated packs may add richer spatial metadata without making it mandatory.

## User Flow

1. Open **Map** from the canvas tabs. Large corpora hydrate their existing
   dataset and resource indexes; small bundles reuse their in-memory nodes.
2. Explorer classifies the current search/facet reduction and reports how many
   records have spatial evidence.
3. Select a place or evidence class to reduce the Map. The reduction is stored
   in the public URL so it can be copied and restored with Back/Forward.
4. Select a marker or list row to inspect the ordinary Explorer record card.
5. Open an external source directly, or request a bounded preview where the
   resource is recognisably GeoJSON or an ArcGIS feature service.
6. If preview discovery, CORS, response size or geometry support fails, retain
   the local metadata and offer the original source as the recovery path.

## Evidence Levels

Classification is deliberately explainable. A record can carry more than one
signal, ordered from strongest to weakest:

1. **Geometry**: explicit WGS84 coordinates, a GeoJSON geometry or a declared
   bounding box supplied by the pack.
2. **Coverage**: explicit fields such as `area_served`, `areaServed`,
   `spatial`, `spatial_coverage`, `coverage` or `jurisdiction`.
3. **Service or file**: a resource URL, format or protocol identifies ArcGIS
   REST, OGC API Features, WMS, WFS, WMTS, WCS, GeoJSON, KML, GML,
   Shapefile or GeoPackage.
4. **Text**: title, description, topics or tags contain a bounded spatial term
   or a recognised UK nation/region.

Evidence is a discovery aid, not an assertion that a dataset is current,
authoritative or geometrically complete. Place matches without geometry appear
at labelled representative centroids and never as inferred boundaries.

## Deterministic Geography Vocabulary

The prototype recognises the UK, Great Britain, the four UK nations, the nine
English regions and a small set of common aliases. Matching uses token
boundaries and pack-supplied fields before prose. The implementation keeps the
matched source value and rule so the UI can explain every classification.

Pack builders should prefer stable identifiers and explicit metadata over
place-name guessing:

```json
{
  "spatial": {
    "geographies": [
      {
        "code": "E12000007",
        "name": "London",
        "level": "region",
        "source": "ONS",
        "vintage": "2025"
      }
    ],
    "bbox": [-0.5103, 51.2868, 0.334, 51.6919],
    "crs": "EPSG:4326",
    "derivation": "source-declared"
  }
}
```

When builders publish boundaries or postcode/UPRN lookups they should preserve
the source, release or epoch, geography-code family, exact/best-fit derivation,
boundary variant and CRS. For UK web-map output, WGS84 (`EPSG:4326`) is the
display CRS; a pack may retain British National Grid (`EPSG:27700`) as its
analysis CRS.

## Progressive Recovery

The preview ladder is intentionally narrow:

1. render geometry already present in the pack;
2. fetch a direct JSON/GeoJSON resource with a response-size limit;
3. for an ArcGIS `FeatureServer` or `MapServer`, inspect service metadata, pick
   the first declared feature layer and request a capped GeoJSON query;
4. if a browser cannot fetch or understand the response, explain the reason and
   keep an **Open source** link;
5. never insert credentials, probe private services or silently retry through
   an unrelated proxy.

WMS, WFS, WMTS, WCS, KML, GML, Shapefile and GeoPackage remain discoverable
and filterable in this prototype. Their external source is linked on demand,
but their bodies are not parsed in-browser yet.

## Performance And Safety Boundaries

- No map library, tile service or geocoder is needed for initial display.
- Classification is linear in the records already hydrated for the current
  view and is cached by Svelte's derived state.
- The locator map groups coincident representative points and caps visible
  labels/rows.
- Remote previews are user-triggered, JSON-only, bounded to 10 MiB by the
  existing source fetcher and capped to 100 ArcGIS features.
- External links open in a new tab and never replace Explorer state.
- No API keys, access tokens or secret values belong in the bundle or URL.

## Prototype Acceptance Criteria

- Map is a first-class view for both small and large bundles.
- Large-corpus Map starts from the same search and facet reduction as every
  other view.
- Selecting a geography or evidence class reduces the mapped set and survives
  copied URLs and browser navigation.
- ArcGIS/OGC/file signals are detected from both records and resources.
- Every marker/list row selects the corresponding ordinary Explorer record.
- Direct GeoJSON and ArcGIS feature services have a bounded, explicit preview
  path with visible provenance and failure recovery.
- Unit tests cover signal classification, place matching, coordinate handling,
  URL reduction state and preview URL generation.

## Later Pack-Builder Work

This branch keeps the Explorer backward-compatible. A follow-on builder change
can add a small `okf-geospatial-index.v1` sidecar with record routes, GSS codes,
coverage labels, coordinate/bbox summaries, evidence class, CRS, vintage and
resource references. That would let very large packs show a useful Map overview
without hydrating every dataset/resource chunk, while retaining the same UI and
evidence rules prototyped here.
