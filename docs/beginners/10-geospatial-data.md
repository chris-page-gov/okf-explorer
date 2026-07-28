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
3. recognizable geospatial service or file;
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
recognize and link them but does not parse their bodies in the browser.

### OGC Web Services

Open Geospatial Consortium standards include:

- WMS for rendered map images;
- WFS for vector features;
- WMTS for tiled map images;
- WCS for gridded coverages;
- OGC API Features for web-native feature access.

Recognition is not the same as successful preview. Service versions, query
parameters, CRS support, authentication and CORS all matter.

### ArcGIS REST

ArcGIS `FeatureServer` and `MapServer` URLs expose service and layer metadata.
The Explorer can:

1. inspect a service;
2. choose a declared feature layer;
3. request a capped GeoJSON result;
4. render supported geometry;
5. retain the original source when anything fails.

It does not probe private layers or insert credentials.

## A Map Without A Tile Service

Initial display does not depend on an external base map, geocoder or mapping
library. This avoids:

- sending place interests to another provider by default;
- API keys and usage terms;
- a fragile external runtime dependency;
- tiles overwhelming the evidence layer.

The locator is intentionally simple. The product is an evidence explorer, not
a cartographic analysis workbench.

## Bounded Preview

Remote preview happens only after an explicit user action and is limited by:

- allowed URL schemes and sanitized query parameters;
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
