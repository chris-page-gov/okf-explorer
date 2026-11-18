import type { LargeResourceReference } from '$lib/types';
import { fetchJsonResource } from '$lib/sources/fetch';
import { safeRelativeResourcePath } from '$lib/sources/releaseDataPlane';

type ObjectRow = Record<string, unknown>;
type Binding = { path: string; sha256: string; bytes: number };
type Level = 'overview' | 'detail';
export type Point = [longitude: number, latitude: number];
type Feature = { id: string; name: string; polygons: Point[][][] };
type Representation = Binding & {
  featureKey: string;
  featureCount: number;
  generalisation: string;
  coastalVariant: string;
  source: { product: string; url: string; licence: string; attribution: string };
};
export type BoundaryLayer = { level: Level; representation: Representation; features: Feature[] };
export type BoundaryPack = {
  family: string;
  vintage: string;
  limitations: string;
  detailMinZoom: number;
  load: (zoom: number) => Promise<BoundaryLayer>;
};

const MAX_MANIFEST_BYTES = 65_536;
const MAX_LAYER_BYTES = 5 * 1024 * 1024;
const MAX_COORDINATES = 250_000;
const fetchOptions = { rejectRedirects: true, timeoutMs: 8000, attempts: 1 };

function object(value: unknown): ObjectRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a boundary-pack object');
  return value as ObjectRow;
}

function text(value: unknown, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error('Invalid boundary-pack text');
  return value;
}

function integer(value: unknown, limit: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > limit) {
    throw new Error('Boundary-pack limit exceeded');
  }
  return value;
}

function https(value: unknown): string {
  const url = new URL(text(value, 1000));
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid boundary-pack source URL');
  return url.href;
}

function binding(value: unknown, limit: number): Binding {
  const row = object(value);
  const path = safeRelativeResourcePath(text(row.path, 200), 'Boundary-pack path');
  const sha256 = text(row.sha256, 64);
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error('Boundary-pack resource requires a SHA-256 digest');
  return { path, sha256, bytes: integer(row.bytes, limit) };
}

function representation(value: unknown): Representation {
  const row = object(value);
  const ref = binding(row, MAX_LAYER_BYTES);
  const source = object(row.source);
  const featureKey = text(row.feature_id_property, 64);
  if (
    !/^data\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.geojson$/.test(ref.path)
    || row.media_type !== 'application/geo+json' || row.output_crs !== 'OGC:CRS84'
    || !/^[A-Za-z][A-Za-z0-9_]*$/.test(featureKey)
  ) throw new Error('Unsupported boundary representation');
  return {
    ...ref, featureKey, featureCount: integer(row.feature_count, 10_000),
    generalisation: text(row.generalisation, 500),
    coastalVariant: text(row.coastal_variant, 100),
    source: {
      product: text(source.product, 200), url: https(source.url), licence: https(source.licence),
      attribution: text(source.attribution, 500)
    }
  };
}

function featureRows(document: unknown, declared: Representation): Feature[] {
  const row = object(document);
  if (row.type !== 'FeatureCollection' || 'crs' in row || !Array.isArray(row.features) || row.features.length !== declared.featureCount) {
    throw new Error('Boundary pack must contain the declared number of CRS84 features');
  }
  const ids = new Set<string>();
  let coordinateCount = 0;
  return row.features.map((value) => {
    const feature = object(value);
    const properties = object(feature.properties);
    const geometry = object(feature.geometry);
    const id = text(properties[declared.featureKey], 100);
    if (feature.type !== 'Feature' || ids.has(id) || !['Polygon', 'MultiPolygon'].includes(String(geometry.type))) {
      throw new Error('Invalid or duplicate boundary feature');
    }
    ids.add(id);
    const groups = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    if (!Array.isArray(groups) || !groups.length) throw new Error('Boundary polygon is missing');
    const polygons = groups.map((polygon) => {
      if (!Array.isArray(polygon) || !polygon.length) throw new Error('Boundary rings are missing');
      return polygon.map((ring) => {
        if (!Array.isArray(ring) || ring.length < 4) throw new Error('Invalid boundary ring');
        coordinateCount += ring.length;
        if (coordinateCount > MAX_COORDINATES) throw new Error('Boundary drawing exceeds its coordinate budget');
        const positions = ring.map((point): Point => {
          if (!Array.isArray(point) || point.length !== 2 || point.some((axis) => typeof axis !== 'number' || !Number.isFinite(axis))
              || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw new Error('Invalid boundary coordinate');
          return [point[0], point[1]];
        });
        const [lon, lat] = positions[0];
        const end = positions.at(-1)!;
        if (lon !== end[0] || lat !== end[1]) throw new Error('Boundary ring is open');
        return positions;
      });
    });
    const name = typeof properties.name === 'string' ? text(properties.name, 100) : id;
    return { id, name, polygons };
  });
}

export async function loadBoundaryPack(base: string, declared: LargeResourceReference): Promise<BoundaryPack> {
  const ref = binding(declared, MAX_MANIFEST_BYTES);
  if (!ref.path.endsWith('.json')) throw new Error('Boundary pack requires a relative JSON manifest');
  const manifestUrl = new URL(ref.path, base);
  const document = await fetchJsonResource<unknown>(ref, base, {
    ...fetchOptions, acceptedMediaTypes: ['application/json']
  });
  const row = object(document);
  const vintage = text(row.vintage, 10);
  if (row.schema !== 'okf-geospatial-boundary-pack.v1' || !/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(vintage)) {
    throw new Error('Unsupported boundary-pack schema or vintage');
  }
  const representations = object(row.representations);
  const overview = representation(representations.overview);
  const detail = representation(representations.detail);
  const detailMinZoom = integer(row.detail_min_zoom, 18);
  if (overview.featureCount !== detail.featureCount || overview.path === detail.path) throw new Error('Boundary levels disagree');
  const cache = new Map<Level, Promise<BoundaryLayer>>();
  let featureIds: Set<string> | undefined;
  return {
    family: text(row.geography_family, 100), vintage, detailMinZoom,
    limitations: text(object(row.coverage).limitations, 1000),
    load(zoom: number) {
      const level = zoom >= detailMinZoom ? 'detail' : 'overview';
      const cached = cache.get(level);
      if (cached) return cached;
      const selected = level === 'detail' ? detail : overview;
      const pending = fetchJsonResource<unknown>(selected, new URL('.', manifestUrl).href, {
        ...fetchOptions, acceptedMediaTypes: ['application/geo+json', 'application/json', 'application/octet-stream']
      }).then<BoundaryLayer>((raw) => {
        const features = featureRows(raw, selected);
        if (featureIds && features.some(({ id }) => !featureIds!.has(id))) {
          throw new Error('Boundary levels contain different geography codes');
        }
        featureIds ??= new Set(features.map(({ id }) => id));
        return { level, representation: selected, features };
      });
      cache.set(level, pending);
      void pending.catch(() => { cache.delete(level); });
      return pending;
    }
  };
}
