import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GeospatialResource } from './geospatial';
import {
  arcGisLayerQueryUrl,
  arcGisMetadataUrl,
  buildPreviewDrawing,
  geoJsonFeatures,
  loadGeospatialPreview,
  MAX_PREVIEW_FEATURES,
  previewPath
} from './preview';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
}

describe('geospatial preview helpers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds bounded ArcGIS metadata and layer query URLs', () => {
    expect(arcGisMetadataUrl('https://example.test/arcgis/rest/services/Parks/FeatureServer?token=secret')).toBe(
      'https://example.test/arcgis/rest/services/Parks/FeatureServer?f=pjson'
    );
    const query = new URL(arcGisLayerQueryUrl('https://example.test/arcgis/rest/services/Parks/FeatureServer', 3));
    expect(query.pathname).toBe('/arcgis/rest/services/Parks/FeatureServer/3/query');
    expect(query.searchParams.get('where')).toBe('1=1');
    expect(query.searchParams.get('outSR')).toBe('4326');
    expect(query.searchParams.get('resultRecordCount')).toBe(String(MAX_PREVIEW_FEATURES));
    expect(query.searchParams.get('f')).toBe('geojson');
  });

  it('caps feature collections and rejects non-spatial JSON', () => {
    const features = Array.from({ length: MAX_PREVIEW_FEATURES + 5 }, (_, id) => ({
      type: 'Feature',
      id,
      geometry: { type: 'Point', coordinates: [-1 + id / 1000, 52] },
      properties: { id }
    }));
    const parsed = geoJsonFeatures({ type: 'FeatureCollection', features });
    expect(parsed.features).toHaveLength(MAX_PREVIEW_FEATURES);
    expect(parsed.total).toBe(MAX_PREVIEW_FEATURES + 5);
    expect(() => geoJsonFeatures({ ok: true })).toThrow('does not contain GeoJSON');
  });

  it('projects point, line and polygon geometry into a bounded drawing', () => {
    const preview = {
      sourceUrl: 'https://example.test/data.geojson',
      responseUrl: 'https://example.test/data.geojson',
      retrievedAt: '2026-07-15T00:00:00Z',
      bytes: 100,
      totalFeatures: 3,
      truncated: false,
      features: [
        { type: 'Feature' as const, geometry: { type: 'Point', coordinates: [-1, 52] } },
        { type: 'Feature' as const, geometry: { type: 'LineString', coordinates: [[-2, 51], [-1, 52]] } },
        { type: 'Feature' as const, geometry: { type: 'Polygon', coordinates: [[[-2, 51], [0, 51], [0, 53], [-2, 51]]] } }
      ]
    };
    const drawing = buildPreviewDrawing(preview);
    expect(drawing.bounds).toEqual([-2, 51, 0, 53]);
    expect(drawing.shapes.map((shape) => shape.kind)).toEqual(['point', 'line', 'polygon']);
    expect(previewPath(drawing.shapes[2])).toMatch(/^M.*Z$/);
  });

  it('loads direct GeoJSON only after the caller requests a preview', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [-0.1, 51.5] }, properties: {} }]
    }));
    vi.stubGlobal('fetch', fetchMock);
    const resource: GeospatialResource = {
      label: 'Points',
      url: 'https://example.test/points.geojson',
      kind: 'geojson',
      previewable: true
    };
    const preview = await loadGeospatialPreview(resource);
    expect(preview.features).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('discovers the first ArcGIS layer before requesting capped GeoJSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ layers: [{ id: 2, name: 'Conservation areas' }] }))
      .mockResolvedValueOnce(jsonResponse({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-1, 52], [0, 52], [-1, 53], [-1, 52]]] }, properties: {} }]
      }));
    vi.stubGlobal('fetch', fetchMock);
    const resource: GeospatialResource = {
      label: 'ArcGIS service',
      url: 'https://example.test/arcgis/rest/services/Areas/FeatureServer',
      kind: 'arcgis',
      previewable: true
    };
    const preview = await loadGeospatialPreview(resource);
    expect(preview.layer).toBe('Conservation areas');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/FeatureServer/2/query');
  });

  it('keeps linked-only formats out of the in-browser preview path', async () => {
    const resource: GeospatialResource = {
      label: 'WMS',
      url: 'https://example.test/wms?service=WMS',
      kind: 'wms',
      previewable: false
    };
    await expect(loadGeospatialPreview(resource)).rejects.toThrow('linked but not rendered');
  });
});
