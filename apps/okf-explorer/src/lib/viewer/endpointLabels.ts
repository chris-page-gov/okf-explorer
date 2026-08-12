import type {
  LargeEndpointLabelEntry,
  LargeEndpointLabelIndex,
  LargeEndpointLabelRegistry
} from '$lib/types';

export const ENDPOINT_LABEL_INDEX_SCHEMA = 'okf-explorer-endpoint-label-index.v1';
export const MISSING_ENDPOINT_LABEL = 'Missing label';
export const MAX_ENDPOINT_LABEL_ENTRIES = 100_000;
export const MAX_ENDPOINT_LABEL_TEXT_UNITS = 48 * 1024 * 1024;

const LOCAL_ROUTE = /^[a-z][a-z0-9-]*(?:\/(?:[A-Za-z0-9._~-]|%[0-9A-F]{2})+)+$/;
const LANGUAGE_TAG = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const ABSOLUTE_IRI = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/;
const AUTHORITY_CLASSES = new Set(['source-native', 'domain-profile', 'editorial']);
const INTRINSIC_OPAQUE_IDENTIFIER =
  /^(?:publisher|source|activity|rights|catalogue-record)-[0-9a-f]{12,}$/i;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const UNSAFE_HTTP_URL_CHARACTER = /[^\x21-\x7e]|["'<>\\^`{|}]/;
const MALFORMED_PERCENT_ESCAPE = /%(?![0-9A-Fa-f]{2})/;

export function encodeEndpointRouteSegment(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function decodeEndpointRouteSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function metadataEndpointRoute(kind: string, value: string): string {
  return `${kind}/${encodeEndpointRouteSegment(value)}`;
}

export function largeRecordRoute(record: {
  open?: unknown;
  route?: unknown;
  name: string;
}): string {
  if (typeof record.open === 'string' && record.open) return record.open;
  if (typeof record.route === 'string' && record.route) return record.route;
  return `dataset/${record.name}`;
}

function canonicalLocalRoute(value: string): boolean {
  if (!LOCAL_ROUTE.test(value)) return false;
  const [kind, ...segments] = value.split('/');
  return Boolean(kind) && segments.every((segment) => {
    try {
      return encodeEndpointRouteSegment(decodeURIComponent(segment)) === segment;
    } catch {
      return false;
    }
  });
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
): void {
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !(key in value)) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error('Endpoint label index contains missing or unsupported fields');
  }
}

function boundedString(value: unknown, label: string, maximum: number): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.trim() !== value ||
    value.length > maximum ||
    CONTROL_CHARACTER.test(value)
  ) {
    throw new Error(`${label} is missing, unbounded or malformed`);
  }
  return value;
}

function httpUrl(value: unknown, label: string): string {
  const result = boundedString(value, label, 4_096);
  if (
    UNSAFE_HTTP_URL_CHARACTER.test(result) ||
    MALFORMED_PERCENT_ESCAPE.test(result)
  ) {
    throw new Error(`${label} must be a safe absolute HTTP(S) URL`);
  }
  let parsed: URL;
  try {
    parsed = new URL(result);
  } catch {
    throw new Error(`${label} must be an absolute HTTP(S) URL`);
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.port === '0'
  ) {
    throw new Error(`${label} must be a credential-free absolute HTTP(S) URL`);
  }
  return result;
}

function normaliseOpaquePattern(value: unknown, index: number): string {
  const pattern = boundedString(value, `Opaque identifier pattern ${index + 1}`, 128);
  if (
    !/^[A-Za-z0-9._~:/-]+\*?$/.test(pattern) ||
    pattern.slice(0, -1).includes('*') ||
    pattern === '*'
  ) {
    throw new Error(`Opaque identifier pattern ${index + 1} is unsafe`);
  }
  return pattern;
}

function normaliseEntry(
  value: unknown,
  index: number,
  opaqueIdentifierPatterns: readonly string[]
): LargeEndpointLabelEntry {
  const row = objectValue(value, `Endpoint label entry ${index + 1}`);
  exactKeys(
    row,
    ['route', 'iri', 'label', 'language', 'type', 'label_authority']
  );
  const route = boundedString(row.route, `Endpoint label entry ${index + 1} route`, 1_024);
  if (!canonicalLocalRoute(route)) {
    throw new Error(`Endpoint label entry ${index + 1} route is not a safe local route`);
  }
  const label = boundedString(row.label, `Endpoint label entry ${index + 1} label`, 512);
  if (label === MISSING_ENDPOINT_LABEL) {
    throw new Error(`Endpoint label entry ${index + 1} label uses the reserved missing-label sentinel`);
  }
  const language = boundedString(row.language, `Endpoint label entry ${index + 1} language`, 64);
  if (!LANGUAGE_TAG.test(language)) {
    throw new Error(`Endpoint label entry ${index + 1} language is malformed`);
  }
  const type = boundedString(row.type, `Endpoint label entry ${index + 1} type`, 256);
  if (
    type === MISSING_ENDPOINT_LABEL ||
    isOpaqueEndpointIdentifier(type, opaqueIdentifierPatterns)
  ) {
    throw new Error(`Endpoint label entry ${index + 1} type is not a governed readable label`);
  }
  if (isOpaqueEndpointIdentifier(label, opaqueIdentifierPatterns)) {
    throw new Error(`Endpoint label entry ${index + 1} label is not a governed readable label`);
  }
  const authority = objectValue(
    row.label_authority,
    `Endpoint label entry ${index + 1} label authority`
  );
  exactKeys(authority, ['class', 'source']);
  const authorityClass = boundedString(
    authority.class,
    `Endpoint label entry ${index + 1} label authority class`,
    32
  );
  if (!AUTHORITY_CLASSES.has(authorityClass)) {
    throw new Error(`Endpoint label entry ${index + 1} label authority class is unsupported`);
  }
  const iri = boundedString(row.iri, `Endpoint label entry ${index + 1} IRI`, 4_096);
  if (!ABSOLUTE_IRI.test(iri)) {
    throw new Error(`Endpoint label entry ${index + 1} IRI is not absolute`);
  }
  return {
    route,
    label,
    language,
    type,
    label_authority: {
      class: authorityClass,
      source: httpUrl(
        authority.source,
        `Endpoint label entry ${index + 1} label authority source`
      )
    },
    iri
  };
}

export function normaliseEndpointLabelIndex(
  value: unknown,
  expectedSnapshot = ''
): LargeEndpointLabelRegistry {
  const document = objectValue(value, 'Endpoint label index');
  exactKeys(
    document,
    [
      'schema',
      'snapshot',
      'default_language',
      'opaque_identifier_patterns',
      'entries',
      'counts'
    ],
    ['generated_at']
  );
  if (document.schema !== ENDPOINT_LABEL_INDEX_SCHEMA) {
    throw new Error('Endpoint label index schema is unsupported');
  }
  const snapshot = boundedString(document.snapshot, 'Endpoint label index snapshot', 256);
  if (expectedSnapshot && snapshot !== expectedSnapshot) {
    throw new Error('Endpoint label index snapshot differs from the loaded bundle snapshot');
  }
  const defaultLanguage = boundedString(
    document.default_language,
    'Endpoint label index default language',
    64
  );
  if (!LANGUAGE_TAG.test(defaultLanguage)) {
    throw new Error('Endpoint label index default language is malformed');
  }
  if (defaultLanguage !== 'en-GB') {
    throw new Error('Endpoint label index default language must be en-GB');
  }
  if (
    !Array.isArray(document.opaque_identifier_patterns) ||
    document.opaque_identifier_patterns.length > 64
  ) {
    throw new Error('Endpoint label index opaque identifier patterns are malformed or unbounded');
  }
  const opaqueIdentifierPatterns = document.opaque_identifier_patterns.map(normaliseOpaquePattern);
  if (new Set(opaqueIdentifierPatterns).size !== opaqueIdentifierPatterns.length) {
    throw new Error('Endpoint label index opaque identifier patterns are duplicated');
  }
  if (!Array.isArray(document.entries) || document.entries.length > MAX_ENDPOINT_LABEL_ENTRIES) {
    throw new Error('Endpoint label index entries are malformed or unbounded');
  }
  const entries = document.entries.map((entry, index) =>
    normaliseEntry(entry, index, opaqueIdentifierPatterns)
  );
  const counts = objectValue(document.counts, 'Endpoint label index counts');
  exactKeys(counts, ['entries']);
  if (counts.entries !== entries.length) {
    throw new Error('Endpoint label index entry count does not reconcile');
  }
  let retainedTextUnits = 0;
  const byRoute = new Map<string, LargeEndpointLabelEntry>();
  for (const entry of entries) {
    retainedTextUnits +=
      entry.route.length +
      entry.label.length +
      entry.language.length +
      entry.type.length +
      entry.label_authority.class.length +
      entry.label_authority.source.length +
      entry.iri.length;
    if (retainedTextUnits > MAX_ENDPOINT_LABEL_TEXT_UNITS) {
      throw new Error('Endpoint label index exceeds its retained-text ceiling');
    }
    const existing = byRoute.get(entry.route);
    if (existing) {
      const equivalent = JSON.stringify(existing) === JSON.stringify(entry);
      throw new Error(
        equivalent
          ? `Endpoint label route is duplicated: ${entry.route}`
          : `Endpoint label route has conflicting declarations: ${entry.route}`
      );
    }
    byRoute.set(entry.route, entry);
  }
  const generatedAt = document.generated_at === undefined
    ? undefined
    : boundedString(document.generated_at, 'Endpoint label index generation time', 64);
  if (
    generatedAt &&
    (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(generatedAt) ||
      Number.isNaN(Date.parse(generatedAt)))
  ) {
    throw new Error('Endpoint label index generation time is malformed');
  }
  return {
    document: {
      schema: ENDPOINT_LABEL_INDEX_SCHEMA,
      snapshot,
      ...(generatedAt ? { generated_at: generatedAt } : {}),
      default_language: defaultLanguage,
      opaque_identifier_patterns: opaqueIdentifierPatterns,
      entries,
      counts: { entries: entries.length }
    },
    byRoute,
    opaqueIdentifierPatterns
  };
}

function routeLeaf(value: string): string {
  const segments = value.split('/');
  return segments[segments.length - 1] || value;
}

function matchesConfiguredPattern(value: string, pattern: string): boolean {
  const candidates = [value, routeLeaf(value)];
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1).toLowerCase();
    return candidates.some((candidate) => candidate.toLowerCase().startsWith(prefix));
  }
  return candidates.some((candidate) => candidate.toLowerCase() === pattern.toLowerCase());
}

export function isOpaqueEndpointIdentifier(
  value: string,
  patterns: readonly string[] = []
): boolean {
  const candidate = value.trim();
  if (!candidate) return false;
  if (INTRINSIC_OPAQUE_IDENTIFIER.test(routeLeaf(candidate))) return true;
  return patterns.some((pattern) => matchesConfiguredPattern(candidate, pattern));
}

export function endpointLabelForRoute(
  registry: LargeEndpointLabelRegistry | undefined,
  route: string,
  fallback = ''
): string {
  const patterns = registry?.opaqueIdentifierPatterns || [];
  const governed = registry?.byRoute.get(route)?.label || '';
  if (governed && !isOpaqueEndpointIdentifier(governed, patterns)) return governed;
  // Once a producer advertises the governed index, absence is itself a
  // quality defect. Falling back to a plausible title would hide incomplete
  // denominator coverage and make different lazy-loading paths disagree.
  if (registry) return MISSING_ENDPOINT_LABEL;
  if (fallback && !isOpaqueEndpointIdentifier(fallback, patterns)) return fallback;
  return MISSING_ENDPOINT_LABEL;
}

export function endpointTypeForRoute(
  registry: LargeEndpointLabelRegistry | undefined,
  route: string,
  fallback = ''
): string {
  return registry?.byRoute.get(route)?.type || fallback;
}

export function endpointLabelEntryForInspection(
  registry: LargeEndpointLabelRegistry | undefined,
  route: string
): LargeEndpointLabelEntry | undefined {
  return registry?.byRoute.get(route);
}
