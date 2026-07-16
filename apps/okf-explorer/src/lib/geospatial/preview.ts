import type { GeospatialResource } from './geospatial';
import { fetchSourceJson, type SourceJsonResponse } from '$lib/sources/fetch';

export const MAX_PREVIEW_FEATURES = 100;
export const MAX_PREVIEW_COORDINATES = 12_000;

export type GeoJsonGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
};

export type GeoJsonFeature = {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJsonGeometry | null;
  properties?: Record<string, unknown> | null;
};

export type GeospatialPreview = {
  sourceUrl: string;
  responseUrl: string;
  retrievedAt: string;
  bytes: number;
  features: GeoJsonFeature[];
  totalFeatures: number;
  truncated: boolean;
  layer?: string;
};

export type PreviewShape = {
  kind: 'point' | 'line' | 'polygon';
  points: Array<{ x: number; y: number }>;
};

export type PreviewDrawing = {
  shapes: PreviewShape[];
  bounds: [number, number, number, number];
  coordinateCount: number;
  truncated: boolean;
};

type Position = [number, number];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]));
}

function asFeature(value: unknown): GeoJsonFeature | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.type === 'Feature') {
    return {
      type: 'Feature',
      id: typeof record.id === 'string' || typeof record.id === 'number' ? record.id : undefined,
      geometry: asRecord(record.geometry) as GeoJsonGeometry | null,
      properties: asRecord(record.properties)
    };
  }
  if (typeof record.type === 'string' && (record.coordinates !== undefined || record.geometries !== undefined)) {
    return { type: 'Feature', geometry: record as GeoJsonGeometry, properties: null };
  }
  return null;
}

export function geoJsonFeatures(document: unknown): { features: GeoJsonFeature[]; total: number } {
  const record = asRecord(document);
  if (!record) throw new Error('The source response is not a JSON object.');
  if (record.error) {
    const error = asRecord(record.error);
    throw new Error(String(error?.message || record.error || 'The spatial service returned an error.'));
  }
  if (record.type === 'FeatureCollection' && Array.isArray(record.features)) {
    const features = record.features.map(asFeature).filter((feature): feature is GeoJsonFeature => Boolean(feature));
    return { features: features.slice(0, MAX_PREVIEW_FEATURES), total: features.length };
  }
  const feature = asFeature(record);
  if (feature) return { features: [feature], total: 1 };
  throw new Error('The source JSON does not contain GeoJSON features or geometry.');
}

function arcGisBaseUrl(value: string): URL {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}

export function arcGisLayerQueryUrl(value: string, layerId?: string | number): string {
  const url = arcGisBaseUrl(value);
  if (layerId !== undefined && !/\/(?:FeatureServer|MapServer)\/\d+$/i.test(url.pathname)) {
    url.pathname += `/${layerId}`;
  }
  if (!/\/(?:FeatureServer|MapServer)\/\d+$/i.test(url.pathname)) {
    throw new Error('ArcGIS preview needs a feature-layer identifier.');
  }
  url.pathname += '/query';
  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('resultRecordCount', String(MAX_PREVIEW_FEATURES));
  url.searchParams.set('f', 'geojson');
  return url.toString();
}

export function arcGisMetadataUrl(value: string): string {
  const url = arcGisBaseUrl(value);
  url.searchParams.set('f', 'pjson');
  return url.toString();
}

function firstArcGisLayer(document: unknown): { id: string | number; name?: string } | null {
  const record = asRecord(document);
  if (!record || !Array.isArray(record.layers)) return null;
  for (const value of record.layers) {
    const layer = asRecord(value);
    if (!layer || (typeof layer.id !== 'string' && typeof layer.id !== 'number')) continue;
    return { id: layer.id, name: typeof layer.name === 'string' ? layer.name : undefined };
  }
  return null;
}

async function sourcePreview(response: SourceJsonResponse, sourceUrl: string, layer?: string): Promise<GeospatialPreview> {
  const parsed = geoJsonFeatures(response.json);
  return {
    sourceUrl,
    responseUrl: response.responseUrl,
    retrievedAt: response.retrievedAt,
    bytes: response.bytes,
    features: parsed.features,
    totalFeatures: parsed.total,
    truncated: parsed.total > parsed.features.length,
    layer
  };
}

export async function loadGeospatialPreview(resource: GeospatialResource): Promise<GeospatialPreview> {
  if (!resource.previewable) throw new Error(`${resource.kind.toUpperCase()} resources are linked but not rendered by this prototype.`);
  if (resource.kind !== 'arcgis') {
    const response = await fetchSourceJson(resource.url);
    return sourcePreview(response, resource.url);
  }

  if (/\/(?:FeatureServer|MapServer)\/\d+\/?(?:[?#].*)?$/i.test(resource.url)) {
    const response = await fetchSourceJson(arcGisLayerQueryUrl(resource.url));
    return sourcePreview(response, resource.url);
  }
  if (!/\/(?:FeatureServer|MapServer)\/?(?:[?#].*)?$/i.test(resource.url)) {
    throw new Error('This ArcGIS link is a catalogue or service-directory route. Open the source to choose a feature service.');
  }

  const metadata = await fetchSourceJson(arcGisMetadataUrl(resource.url));
  const layer = firstArcGisLayer(metadata.json);
  if (!layer) throw new Error('The ArcGIS service metadata does not declare a previewable feature layer.');
  const response = await fetchSourceJson(arcGisLayerQueryUrl(resource.url, layer.id));
  return sourcePreview(response, resource.url, layer.name || `Layer ${layer.id}`);
}

function collectGeometryPaths(geometry: GeoJsonGeometry | null, paths: Array<{ kind: PreviewShape['kind']; coordinates: Position[] }>) {
  if (!geometry) return;
  const coordinates = geometry.coordinates;
  if (geometry.type === 'Point' && isPosition(coordinates)) {
    paths.push({ kind: 'point', coordinates: [coordinates] });
  } else if (geometry.type === 'MultiPoint' && Array.isArray(coordinates)) {
    for (const point of coordinates) if (isPosition(point)) paths.push({ kind: 'point', coordinates: [point] });
  } else if (geometry.type === 'LineString' && Array.isArray(coordinates)) {
    paths.push({ kind: 'line', coordinates: coordinates.filter(isPosition) });
  } else if (geometry.type === 'MultiLineString' && Array.isArray(coordinates)) {
    for (const line of coordinates) if (Array.isArray(line)) paths.push({ kind: 'line', coordinates: line.filter(isPosition) });
  } else if (geometry.type === 'Polygon' && Array.isArray(coordinates)) {
    for (const ring of coordinates) if (Array.isArray(ring)) paths.push({ kind: 'polygon', coordinates: ring.filter(isPosition) });
  } else if (geometry.type === 'MultiPolygon' && Array.isArray(coordinates)) {
    for (const polygon of coordinates) {
      if (!Array.isArray(polygon)) continue;
      for (const ring of polygon) if (Array.isArray(ring)) paths.push({ kind: 'polygon', coordinates: ring.filter(isPosition) });
    }
  } else if (geometry.type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
    for (const child of geometry.geometries) collectGeometryPaths(child, paths);
  }
}

export function buildPreviewDrawing(preview: GeospatialPreview, width = 640, height = 420): PreviewDrawing {
  const rawPaths: Array<{ kind: PreviewShape['kind']; coordinates: Position[] }> = [];
  for (const feature of preview.features) collectGeometryPaths(feature.geometry, rawPaths);
  const all = rawPaths.flatMap((path) => path.coordinates).slice(0, MAX_PREVIEW_COORDINATES);
  if (!all.length) throw new Error('The preview contains no supported WGS84 coordinate geometry.');
  const longitudes = all.map((position) => Number(position[0]));
  const latitudes = all.map((position) => Number(position[1]));
  const bounds: [number, number, number, number] = [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes)
  ];
  const spanX = Math.max(0.000001, bounds[2] - bounds[0]);
  const spanY = Math.max(0.000001, bounds[3] - bounds[1]);
  const padding = 22;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const drawnWidth = spanX * scale;
  const drawnHeight = spanY * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  let coordinateCount = 0;
  const shapes: PreviewShape[] = [];
  for (const path of rawPaths) {
    if (coordinateCount >= MAX_PREVIEW_COORDINATES) break;
    const remaining = MAX_PREVIEW_COORDINATES - coordinateCount;
    const coordinates = path.coordinates.slice(0, remaining);
    coordinateCount += coordinates.length;
    if (!coordinates.length) continue;
    shapes.push({
      kind: path.kind,
      points: coordinates.map(([longitude, latitude]) => ({
        x: offsetX + (Number(longitude) - bounds[0]) * scale,
        y: offsetY + (bounds[3] - Number(latitude)) * scale
      }))
    });
  }
  return {
    shapes,
    bounds,
    coordinateCount,
    truncated: preview.truncated || rawPaths.flatMap((path) => path.coordinates).length > coordinateCount
  };
}

export function previewPath(shape: PreviewShape): string {
  if (!shape.points.length) return '';
  const commands = shape.points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`);
  if (shape.kind === 'polygon') commands.push('Z');
  return commands.join(' ');
}
