import type { LargeDataset, LargeResource, OkfNode } from '$lib/types';

export type GeospatialSignalKind = 'geometry' | 'coverage' | 'service' | 'file' | 'text';
export type GeospatialResourceKind =
  | 'arcgis'
  | 'ogc-api'
  | 'wms'
  | 'wfs'
  | 'wmts'
  | 'wcs'
  | 'geojson'
  | 'kml'
  | 'gml'
  | 'shapefile'
  | 'geopackage';

export type GeospatialSignal = {
  kind: GeospatialSignalKind;
  label: string;
  detail: string;
  source: string;
};

export type GeospatialPlace = {
  id: string;
  label: string;
  level: 'uk' | 'country' | 'region';
  latitude: number;
  longitude: number;
  matched: string;
  source: 'declared' | 'text';
};

export type GeospatialPoint = {
  latitude: number;
  longitude: number;
  source: string;
  precision: 'explicit' | 'representative';
};

export type GeospatialResource = {
  label: string;
  url: string;
  kind: GeospatialResourceKind;
  format?: string;
  previewable: boolean;
};

export type GeospatialRecord = {
  route: string;
  title: string;
  publisher?: string;
  signals: GeospatialSignal[];
  places: GeospatialPlace[];
  coverage: string[];
  point?: GeospatialPoint;
  resources: GeospatialResource[];
};

export const GEOSPATIAL_SIGNAL_LABELS: Record<GeospatialSignalKind, string> = {
  geometry: 'Explicit geometry',
  coverage: 'Declared coverage',
  service: 'Map or feature service',
  file: 'Spatial file',
  text: 'Spatial text signal'
};

type PlaceDefinition = Omit<GeospatialPlace, 'matched' | 'source'> & { aliases: string[] };

export const UK_PLACES: PlaceDefinition[] = [
  { id: 'united-kingdom', label: 'United Kingdom', level: 'uk', latitude: 54.5, longitude: -3.2, aliases: ['united kingdom', 'uk-wide', 'uk wide', 'whole uk'] },
  { id: 'great-britain', label: 'Great Britain', level: 'uk', latitude: 54.3, longitude: -2.6, aliases: ['great britain', 'gb-wide', 'gb wide'] },
  { id: 'england', label: 'England', level: 'country', latitude: 52.9, longitude: -1.5, aliases: ['england', 'england-wide', 'england wide'] },
  { id: 'scotland', label: 'Scotland', level: 'country', latitude: 56.8, longitude: -4.2, aliases: ['scotland', 'scotland-wide', 'scotland wide'] },
  { id: 'wales', label: 'Wales', level: 'country', latitude: 52.3, longitude: -3.7, aliases: ['wales', 'cymru', 'wales-wide', 'wales wide'] },
  { id: 'northern-ireland', label: 'Northern Ireland', level: 'country', latitude: 54.65, longitude: -6.7, aliases: ['northern ireland', 'northern-ireland'] },
  { id: 'north-east', label: 'North East', level: 'region', latitude: 55.0, longitude: -1.9, aliases: ['north east england', 'north-east england', 'north east region'] },
  { id: 'north-west', label: 'North West', level: 'region', latitude: 54.25, longitude: -2.7, aliases: ['north west england', 'north-west england', 'north west region'] },
  { id: 'yorkshire-and-the-humber', label: 'Yorkshire and the Humber', level: 'region', latitude: 53.9, longitude: -1.25, aliases: ['yorkshire and the humber', 'yorkshire & the humber'] },
  { id: 'east-midlands', label: 'East Midlands', level: 'region', latitude: 52.9, longitude: -0.8, aliases: ['east midlands'] },
  { id: 'west-midlands', label: 'West Midlands', level: 'region', latitude: 52.5, longitude: -2.0, aliases: ['west midlands'] },
  { id: 'east-of-england', label: 'East of England', level: 'region', latitude: 52.2, longitude: 0.5, aliases: ['east of england', 'eastern england'] },
  { id: 'london', label: 'London', level: 'region', latitude: 51.5074, longitude: -0.1278, aliases: ['greater london', 'london region', 'london-wide', 'london wide'] },
  { id: 'south-east', label: 'South East', level: 'region', latitude: 51.3, longitude: -0.5, aliases: ['south east england', 'south-east england', 'south east region'] },
  { id: 'south-west', label: 'South West', level: 'region', latitude: 50.8, longitude: -3.2, aliases: ['south west england', 'south-west england', 'south west region'] }
];

const COVERAGE_KEYS = [
  'area_served',
  'areaServed',
  'spatial',
  'spatial_coverage',
  'spatialCoverage',
  'geography',
  'geographies',
  'location',
  'locations',
  'jurisdiction'
];

const TEXT_KEYS = [
  'title',
  'name',
  'description',
  'notes',
  'summary',
  'body',
  'publisher_title',
  'publisher',
  'topics',
  'topic',
  'tags',
  'groups',
  'formats',
  'protocol'
];

const NON_VALUES = new Set(['', 'none', 'null', 'not specified', 'not-specified', 'unknown', 'n/a']);
const SPATIAL_TEXT_PATTERN = /\b(geospatial|geo-spatial|geographic|spatial data|spatial dataset|mapping|map service|feature service|boundary|boundaries|postcode|postcodes|uprn|coordinate|coordinates|location-based|gis)\b/i;
const SENSITIVE_QUERY_KEYS = /^(?:api[-_]?key|key|token|access[-_]?token|password|passwd|secret|login|username|user)$/i;

function stringsFrom(value: unknown, depth = 0): string[] {
  if (depth > 3 || value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text && !NON_VALUES.has(text.toLowerCase()) ? [text] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => stringsFrom(item, depth + 1));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => /^(?:name|title|label|value|code|description)$/i.test(key))
      .flatMap(([, item]) => stringsFrom(item, depth + 1));
  }
  return [];
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordText(record: Record<string, unknown>): string {
  return uniqueStrings(TEXT_KEYS.flatMap((key) => stringsFrom(record[key]))).join(' · ');
}

function coverageValues(record: Record<string, unknown>): string[] {
  const values = COVERAGE_KEYS.flatMap((key) => stringsFrom(record[key]));
  const extras = record.extras && typeof record.extras === 'object' && !Array.isArray(record.extras)
    ? (record.extras as Record<string, unknown>)
    : {};
  for (const [key, value] of Object.entries(extras)) {
    if (/spatial|geograph|location|area.?served|bounding|bbox/i.test(key)) values.push(...stringsFrom(value));
  }
  return uniqueStrings(values);
}

function escapedPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s_-]+/g, '[\\s_-]+');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i');
}

export function matchUkPlaces(values: string[], source: GeospatialPlace['source']): GeospatialPlace[] {
  const out = new Map<string, GeospatialPlace>();
  const candidates = UK_PLACES.flatMap((place) => place.aliases.map((alias) => ({ place, alias })))
    .sort((left, right) => right.alias.length - left.alias.length);
  for (const value of values) {
    for (const { place, alias } of candidates) {
      if (out.has(place.id) || !escapedPattern(alias).test(value)) continue;
      out.set(place.id, {
        id: place.id,
        label: place.label,
        level: place.level,
        latitude: place.latitude,
        longitude: place.longitude,
        matched: value,
        source
      });
    }
  }
  const order = new Map(UK_PLACES.map((place, index) => [place.id, index]));
  return [...out.values()].sort((left, right) => (order.get(left.id) || 0) - (order.get(right.id) || 0));
}

function finiteCoordinate(value: unknown): number | null {
  if (typeof value === 'string' && !value.trim()) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function coordinatePair(record: Record<string, unknown>): GeospatialPoint | undefined {
  const candidates: Array<[unknown, unknown, string]> = [
    [record.latitude, record.longitude, 'latitude/longitude'],
    [record.lat, record.lon, 'lat/lon'],
    [record.lat, record.lng, 'lat/lng']
  ];
  const spatial = record.spatial && typeof record.spatial === 'object' && !Array.isArray(record.spatial)
    ? (record.spatial as Record<string, unknown>)
    : {};
  candidates.push([spatial.latitude, spatial.longitude, 'spatial.latitude/longitude']);
  for (const [rawLatitude, rawLongitude, source] of candidates) {
    const latitude = finiteCoordinate(rawLatitude);
    const longitude = finiteCoordinate(rawLongitude);
    if (latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return { latitude, longitude, source, precision: 'explicit' };
    }
  }

  const geometry = record.geometry && typeof record.geometry === 'object' && !Array.isArray(record.geometry)
    ? (record.geometry as Record<string, unknown>)
    : {};
  const arrays: Array<[unknown, string]> = [
    [record.coordinates, 'coordinates'],
    [geometry.type === 'Point' ? geometry.coordinates : undefined, 'geometry.coordinates'],
    [spatial.coordinates, 'spatial.coordinates']
  ];
  for (const [value, source] of arrays) {
    if (!Array.isArray(value) || value.length < 2) continue;
    const longitude = finiteCoordinate(value[0]);
    const latitude = finiteCoordinate(value[1]);
    if (latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return { latitude, longitude, source, precision: 'explicit' };
    }
  }

  const boxes: Array<[unknown, string]> = [
    [record.bbox, 'bbox'],
    [record.bounding_box, 'bounding_box'],
    [spatial.bbox, 'spatial.bbox']
  ];
  for (const [value, source] of boxes) {
    if (!Array.isArray(value) || value.length < 4) continue;
    const west = finiteCoordinate(value[0]);
    const south = finiteCoordinate(value[1]);
    const east = finiteCoordinate(value[2]);
    const north = finiteCoordinate(value[3]);
    if (west === null || south === null || east === null || north === null) continue;
    const longitude = (west + east) / 2;
    const latitude = (south + north) / 2;
    if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return { latitude, longitude, source: `${source} centroid`, precision: 'explicit' };
    }
  }
  return undefined;
}

export function sanitizeGeospatialUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function geospatialResourceKind(url = '', format = ''): GeospatialResourceKind | null {
  const text = `${url} ${format}`.toLowerCase();
  if (/arcgis|featureserver|mapserver|esri[\s_-]+(?:rest|geo)/.test(text)) return 'arcgis';
  if (/ogc[\s_-]*api(?:[\s_-]*features)?/.test(text)) return 'ogc-api';
  if (/(?:^|[^a-z])wmts(?:[^a-z]|$)|service=wmts/.test(text)) return 'wmts';
  if (/(?:^|[^a-z])wms(?:[^a-z]|$)|service=wms/.test(text)) return 'wms';
  if (/(?:^|[^a-z])wfs(?:[^a-z]|$)|service=wfs/.test(text)) return 'wfs';
  if (/(?:^|[^a-z])wcs(?:[^a-z]|$)|service=wcs/.test(text)) return 'wcs';
  if (/geo[\s_-]*json|\.geojson(?:$|[\s?#])|application\/geo\+json/.test(text)) return 'geojson';
  if (/(?:^|[^a-z])geopackage(?:[^a-z]|$)|\.gpkg(?:$|[\s?#])/.test(text)) return 'geopackage';
  if (/(?:^|[^a-z])shapefile(?:[^a-z]|$)|\.shp(?:\.zip)?(?:$|[\s?#])/.test(text)) return 'shapefile';
  if (/(?:^|[^a-z])kml(?:[^a-z]|$)|\.kmz?(?:$|[\s?#])/.test(text)) return 'kml';
  if (/(?:^|[^a-z])gml(?:[^a-z]|$)|\.gml(?:$|[\s?#])/.test(text)) return 'gml';
  return null;
}

function geospatialResources(record: Record<string, unknown>, resources: Array<Record<string, unknown>>): GeospatialResource[] {
  const candidates = [
    ...resources.map((resource) => ({
      label: String(resource.name || resource.title || resource.id || 'Spatial resource'),
      url: String(resource.url || resource.download_url || ''),
      format: String(resource.format || resource.source_format || resource.protocol || '')
    })),
    {
      label: String(record.title || record.name || 'Record source'),
      url: String(record.url || record.source_url || record.endpoint_url || ''),
      format: stringsFrom(record.formats || record.protocol).join(' ')
    }
  ];
  const seen = new Set<string>();
  const out: GeospatialResource[] = [];
  for (const candidate of candidates) {
    const kind = geospatialResourceKind(candidate.url, candidate.format);
    if (!kind || !/^https?:\/\//i.test(candidate.url)) continue;
    const url = sanitizeGeospatialUrl(candidate.url);
    const key = `${kind}:${url}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: candidate.label,
      url,
      kind,
      format: candidate.format || undefined,
      previewable: kind === 'geojson' || kind === 'arcgis' || kind === 'ogc-api'
    });
  }
  return out;
}

function pushSignal(signals: GeospatialSignal[], signal: GeospatialSignal) {
  if (signals.some((item) => item.kind === signal.kind && item.detail === signal.detail)) return;
  signals.push(signal);
}

export function classifyGeospatialRecord(
  record: Record<string, unknown>,
  resources: Array<Record<string, unknown>> = [],
  route = String(record.route || record.id || record.name || '')
): GeospatialRecord | null {
  const coverage = coverageValues(record);
  const declaredPlaces = matchUkPlaces(coverage, 'declared');
  const text = recordText(record);
  const textPlaces = matchUkPlaces([text], 'text').filter((place) => !declaredPlaces.some((item) => item.id === place.id));
  const places = [...declaredPlaces, ...textPlaces];
  const point = coordinatePair(record);
  const linkedResources = geospatialResources(record, resources);
  const signals: GeospatialSignal[] = [];

  if (point) {
    pushSignal(signals, {
      kind: 'geometry',
      label: GEOSPATIAL_SIGNAL_LABELS.geometry,
      detail: `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`,
      source: point.source
    });
  }
  if (coverage.length) {
    pushSignal(signals, {
      kind: 'coverage',
      label: GEOSPATIAL_SIGNAL_LABELS.coverage,
      detail: coverage.slice(0, 4).join(' · '),
      source: 'record metadata'
    });
  }
  for (const resource of linkedResources) {
    pushSignal(signals, {
      kind: ['geojson', 'kml', 'gml', 'shapefile', 'geopackage'].includes(resource.kind) ? 'file' : 'service',
      label: ['geojson', 'kml', 'gml', 'shapefile', 'geopackage'].includes(resource.kind)
        ? GEOSPATIAL_SIGNAL_LABELS.file
        : GEOSPATIAL_SIGNAL_LABELS.service,
      detail: `${resource.kind.toUpperCase()} · ${resource.label}`,
      source: resource.url
    });
  }
  if (SPATIAL_TEXT_PATTERN.test(text) || (places.length && !coverage.length)) {
    const matched = text.match(SPATIAL_TEXT_PATTERN)?.[0] || places.map((place) => place.label).join(', ');
    pushSignal(signals, {
      kind: 'text',
      label: GEOSPATIAL_SIGNAL_LABELS.text,
      detail: matched,
      source: 'title, description, topics or tags'
    });
  }
  if (!signals.length) return null;

  const representative = !point && places.length
    ? {
        latitude: places.reduce((total, place) => total + place.latitude, 0) / places.length,
        longitude: places.reduce((total, place) => total + place.longitude, 0) / places.length,
        source: places.length === 1 ? `${places[0].label} representative centroid` : `${places.length} matched areas representative centroid`,
        precision: 'representative' as const
      }
    : undefined;
  return {
    route: route || String(record.id || record.name || record.title || ''),
    title: String(record.title || record.name || route || 'Untitled record'),
    publisher: stringsFrom(record.publisher_title || record.publisher)[0],
    signals,
    places,
    coverage,
    point: point || representative,
    resources: linkedResources
  };
}

export function classifyLargeDataset(dataset: LargeDataset, resources: LargeResource[]): GeospatialRecord | null {
  return classifyGeospatialRecord(dataset, resources, dataset.route || `dataset/${dataset.name}`);
}

export function classifySmallNode(node: OkfNode): GeospatialRecord | null {
  const embeddedResources = Array.isArray(node.resources)
    ? node.resources.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : [];
  return classifyGeospatialRecord(node, embeddedResources, node.id);
}

export function geospatialFilterMatches(record: GeospatialRecord, filter: string): boolean {
  if (!filter) return true;
  const [kind, value] = filter.split(':', 2);
  if (!value) return false;
  if (kind === 'signal') return record.signals.some((signal) => signal.kind === value);
  if (kind === 'area') return record.places.some((place) => place.id === value);
  if (kind === 'coverage') return record.coverage.some((item) => item.toLowerCase() === decodeURIComponent(value).toLowerCase());
  return false;
}

export function isGeospatialFilter(value: string): boolean {
  if (/^signal:(geometry|coverage|service|file|text)$/.test(value)) return true;
  if (/^area:[a-z0-9-]+$/.test(value)) return true;
  if (!value.startsWith('coverage:')) return false;
  try {
    const decoded = decodeURIComponent(value.slice('coverage:'.length));
    return Boolean(decoded.trim() && decoded.length <= 160);
  } catch {
    return false;
  }
}

export function geospatialFilterLabel(filter: string): string {
  if (!filter) return 'All spatial evidence';
  const [kind, value] = filter.split(':', 2);
  if (kind === 'signal' && value in GEOSPATIAL_SIGNAL_LABELS) return GEOSPATIAL_SIGNAL_LABELS[value as GeospatialSignalKind];
  if (kind === 'area') return UK_PLACES.find((place) => place.id === value)?.label || value.replaceAll('-', ' ');
  if (kind === 'coverage') {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return filter;
}
