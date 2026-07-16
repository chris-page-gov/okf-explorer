import { describe, expect, it } from 'vitest';
import type { LargeDataset, LargeResource, OkfNode } from '$lib/types';
import {
  classifyGeospatialRecord,
  classifyLargeDataset,
  classifySmallNode,
  geospatialFilterLabel,
  geospatialFilterMatches,
  geospatialResourceKind,
  isGeospatialFilter,
  matchUkPlaces,
  sanitizeGeospatialUrl
} from './geospatial';

describe('geospatial classification', () => {
  it('classifies explicit coverage and ArcGIS resources without remote calls', () => {
    const dataset = {
      name: 'os-maps',
      title: 'OS Maps API',
      publisher_title: 'Ordnance Survey',
      area_served: 'England, Scotland, Wales',
      topics: ['Geospatial'],
      route: 'dataset/os-maps'
    } as LargeDataset;
    const resources = [
      {
        id: 'maps',
        dataset: 'os-maps',
        name: 'Feature service',
        format: 'ArcGIS GeoServices REST API',
        url: 'https://services.example.test/arcgis/rest/services/Boundaries/FeatureServer/0'
      }
    ] as LargeResource[];

    const result = classifyLargeDataset(dataset, resources);
    expect(result).not.toBeNull();
    expect(result?.places.map((place) => place.id)).toEqual(expect.arrayContaining(['england', 'scotland', 'wales']));
    expect(result?.signals.map((signal) => signal.kind)).toEqual(expect.arrayContaining(['coverage', 'service', 'text']));
    expect(result?.point).toEqual(expect.objectContaining({ precision: 'representative', source: '3 matched areas representative centroid' }));
    expect(result?.resources[0]).toEqual(expect.objectContaining({ kind: 'arcgis', previewable: true }));
  });

  it('prefers explicit coordinates and sanitizes credential-like URL parameters', () => {
    const result = classifyGeospatialRecord(
      {
        id: 'parks',
        title: 'Parks points',
        latitude: '51.501',
        longitude: -0.142,
        tags: ['mapping']
      },
      [
        {
          name: 'GeoJSON',
          format: 'GeoJSON',
          url: 'https://example.test/parks.geojson?token=secret&view=public&api_key=hidden'
        }
      ],
      'dataset/parks'
    );

    expect(result?.point).toEqual({ latitude: 51.501, longitude: -0.142, source: 'latitude/longitude', precision: 'explicit' });
    expect(result?.signals.map((signal) => signal.kind)).toEqual(expect.arrayContaining(['geometry', 'file', 'text']));
    expect(result?.resources[0].url).toBe('https://example.test/parks.geojson?view=public');
  });

  it('uses a declared bounding box centroid without claiming an inferred boundary', () => {
    const result = classifyGeospatialRecord({ id: 'bbox', title: 'Survey area', bbox: [-2, 51, 0, 53] });
    expect(result?.point).toEqual({ latitude: 52, longitude: -1, source: 'bbox centroid', precision: 'explicit' });
    expect(result?.signals[0]).toEqual(expect.objectContaining({ kind: 'geometry' }));
  });

  it('keeps service and file formats distinct', () => {
    expect(geospatialResourceKind('https://example.test/wfs?service=WFS', '')).toBe('wfs');
    expect(geospatialResourceKind('https://example.test/tiles', 'WMTS')).toBe('wmts');
    expect(geospatialResourceKind('https://example.test/data.gpkg', '')).toBe('geopackage');
    expect(geospatialResourceKind('https://example.test/data.zip', 'ESRI Shapefile')).toBe('shapefile');
    expect(geospatialResourceKind('https://example.test/report.pdf', 'PDF')).toBeNull();
  });

  it('does not classify ordinary non-spatial prose', () => {
    expect(classifyGeospatialRecord({ id: 'ordinary', title: 'Annual service report', notes: 'Performance and finance.' })).toBeNull();
  });

  it('classifies small OKF nodes and embedded resources', () => {
    const node = {
      id: 'london-boundaries',
      title: 'London boundaries',
      type: 'Dataset',
      spatialCoverage: 'Greater London',
      resources: [{ title: 'Boundary file', url: 'https://example.test/london.geojson', format: 'GeoJSON' }]
    } as OkfNode;
    const result = classifySmallNode(node);
    expect(result?.route).toBe('london-boundaries');
    expect(result?.places[0]).toEqual(expect.objectContaining({ id: 'london', source: 'declared' }));
    expect(result?.resources[0].kind).toBe('geojson');
  });
});

describe('geospatial reductions', () => {
  const record = classifyGeospatialRecord({
    id: 'london-map',
    title: 'London spatial plan',
    spatial_coverage: 'Greater London',
    url: 'https://example.test/service?service=WMS'
  })!;

  it('matches signal, recognised-area and declared-coverage reductions', () => {
    expect(geospatialFilterMatches(record, '')).toBe(true);
    expect(geospatialFilterMatches(record, 'signal:coverage')).toBe(true);
    expect(geospatialFilterMatches(record, 'signal:service')).toBe(true);
    expect(geospatialFilterMatches(record, 'area:london')).toBe(true);
    expect(geospatialFilterMatches(record, `coverage:${encodeURIComponent('Greater London')}`)).toBe(true);
    expect(geospatialFilterMatches(record, 'area:scotland')).toBe(false);
  });

  it('validates and labels public URL state', () => {
    expect(isGeospatialFilter('signal:service')).toBe(true);
    expect(isGeospatialFilter('area:east-of-england')).toBe(true);
    expect(isGeospatialFilter(`coverage:${encodeURIComponent('Bristol City')}`)).toBe(true);
    expect(isGeospatialFilter('signal:unknown')).toBe(false);
    expect(isGeospatialFilter('coverage:')).toBe(false);
    expect(geospatialFilterLabel('area:london')).toBe('London');
    expect(geospatialFilterLabel('signal:service')).toBe('Map or feature service');
  });

  it('recognises bounded UK place aliases and does not match substrings', () => {
    expect(matchUkPlaces(['London'], 'declared').map((place) => place.id)).toContain('london');
    expect(matchUkPlaces(['North East'], 'declared').map((place) => place.id)).toContain('north-east');
    expect(matchUkPlaces(['Coverage: Yorkshire and the Humber'], 'declared').map((place) => place.id)).toContain('yorkshire-and-the-humber');
    expect(matchUkPlaces(['A new scotlands dataset'], 'text').map((place) => place.id)).not.toContain('scotland');
  });

  it('removes sensitive parameters while retaining ordinary query state', () => {
    expect(sanitizeGeospatialUrl('https://example.test/data?TOKEN=one&layer=4&password=two')).toBe('https://example.test/data?layer=4');
  });
});
