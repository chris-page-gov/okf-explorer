import type { LargeDataset, LargeResource, LargeResourceReference } from '$lib/types';
import { safeRelativeResourcePath } from './releaseDataPlane';

export const MAX_RECORD_RESOURCE_CHUNKS = 16;
export const MAX_RECORD_RESOURCE_ROWS = 256;
export const MAX_SHARED_RESOURCE_ROWS = 1024;
export const MAX_RECORD_RESOURCE_BYTES = 2 * 1024 * 1024;
const MAX_INDEX_BYTES = 256 * 1024;
const MAX_BUCKET_BYTES = 1024 * 1024;
const MAX_CACHED_ROUTES = 32;
const MAX_CACHED_CHUNKS = 16;

type BoundReference = { path: string; sha256: string; bytes: number };
type Selection = BoundReference & { rows: number[] };
type FetchResource = <T>(reference: LargeResourceReference, requireReleaseEntry?: boolean) => Promise<T>;
type ObjectRow = Record<string, unknown>;

function object(value: unknown, label: string): ObjectRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as ObjectRow;
}

function reference(value: unknown, limit: number): BoundReference {
  const row = object(value, 'Record-resource reference');
  if (typeof row.path !== 'string' || !safeRelativeResourcePath(row.path)
      || typeof row.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(row.sha256)
      || !Number.isSafeInteger(row.bytes) || Number(row.bytes) < 1 || Number(row.bytes) > limit
      || row.compression !== undefined && row.compression !== 'identity'
      || row.path.toLowerCase().endsWith('.gz')) {
    throw new Error('Record-resource reference requires a bounded relative JSON path, exact bytes and SHA-256');
  }
  return { path: row.path, sha256: row.sha256, bytes: Number(row.bytes) };
}

function remember<T>(cache: Map<string, T>, key: string, value: T, limit: number): T {
  cache.set(key, value);
  while (cache.size > limit) cache.delete(cache.keys().next().value!);
  return value;
}

export function recordResourceBucket(route: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(route)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
}

/** Optional route-bound resources; this loader never requests a full record index. */
export function createRecordResourceLoader(
  declaredReference: LargeResourceReference,
  snapshot: string,
  fetchResource: FetchResource,
  resolveRecord: (route: string) => Promise<LargeDataset | null>
): (route: string) => Promise<LargeResource[]> {
  const manifestReference = reference(declaredReference, MAX_INDEX_BYTES);
  if (!snapshot) throw new Error('Record-resource index requires a bundle snapshot');
  let manifestPromise: Promise<ObjectRow> | undefined;
  const buckets = new Map<string, Promise<ObjectRow>>();
  const chunks = new Map<string, Promise<unknown[]>>();
  const routes = new Map<string, Promise<LargeResource[]>>();

  async function manifest(): Promise<ObjectRow> {
    if (!manifestPromise) {
      manifestPromise = fetchResource<unknown>(manifestReference, true).then((raw) => {
        const value = object(raw, 'Record-resource index');
        const declaredBuckets = object(value.buckets, 'Record-resource buckets');
        if (value.schema !== 'okf-record-resource-index.v1' || value.snapshot !== snapshot
            || value.algorithm !== 'fnv1a32-prefix-2' || Object.keys(declaredBuckets).length > 256
            || Object.keys(declaredBuckets).some((key) => !/^[0-9a-f]{2}$/.test(key))) {
          throw new Error('Record-resource index schema, snapshot or bucket algorithm differs from the loaded bundle');
        }
        return declaredBuckets;
      }).catch((error) => { manifestPromise = undefined; throw error; });
    }
    return manifestPromise;
  }

  async function missing(route: string): Promise<LargeResource[]> {
    const dataset = await resolveRecord(route);
    if (dataset && (dataset.route || `dataset/${dataset.name}`) !== route) {
      throw new Error('Record-resource lookup does not bind the selected dataset');
    }
    if (dataset?.resource_count !== undefined && dataset.resource_count !== 0) {
      throw new Error('Record-resource index omits advertised source references');
    }
    return [];
  }

  async function load(route: string): Promise<LargeResource[]> {
    // A locator route is an opaque key, not a fetch path. Native identities can
    // legitimately contain percent-encoded slashes inside one route segment.
    if (typeof route !== 'string' || route.length > 2048 || !/^[a-z][a-z0-9-]*\/[^\s?#\\]+$/.test(route)
        || /[\u0000-\u0020\u007f"'<>`{|}^]/.test(route) || /%(?![0-9a-fA-F]{2})/.test(route)) {
      throw new Error('Record-resource route must be a bounded local route');
    }
    const bucket = recordResourceBucket(route);
    const declaredBuckets = await manifest();
    if (!Object.hasOwn(declaredBuckets, bucket)) return missing(route);
    const bucketReference = reference(declaredBuckets[bucket], MAX_BUCKET_BYTES);
    let bucketPromise = buckets.get(bucket);
    if (!bucketPromise) {
      bucketPromise = remember(buckets, bucket,
        fetchResource<unknown>(bucketReference, true).then((raw) => object(raw, 'Record-resource bucket')),
        16);
    }
    const entries = await bucketPromise;
    if (!Object.hasOwn(entries, route)) return missing(route);
    const entry = object(entries[route], 'Record-resource route entry');
    const selected = entry.chunks;
    if (typeof entry.dataset !== 'string' || !Number.isSafeInteger(entry.count)
        || Number(entry.count) < 0 || Number(entry.count) > MAX_RECORD_RESOURCE_ROWS
        || !Array.isArray(selected) || selected.length > MAX_RECORD_RESOURCE_CHUNKS) {
      throw new Error('Record-resource route exceeds its chunk or selected-row budget');
    }
    const selections = selected.map((value) => {
      const row = object(value, 'Record-resource chunk selection');
      const bound = reference(row, MAX_RECORD_RESOURCE_BYTES);
      if (!Array.isArray(row.rows) || row.rows.some((index) => !Number.isSafeInteger(index) || index < 0)
          || new Set(row.rows).size !== row.rows.length) throw new Error('Invalid record-resource row selection');
      return { ...bound, rows: row.rows as number[] } as Selection;
    });
    if (new Set(selections.map((item) => item.path)).size !== selections.length
        || selections.reduce((sum, item) => sum + item.bytes, 0) > MAX_RECORD_RESOURCE_BYTES
        || selections.reduce((sum, item) => sum + item.rows.length, 0) !== entry.count) {
      throw new Error('Record-resource aggregate byte, row or duplicate-chunk binding differs');
    }
    const dataset = await resolveRecord(route);
    if (!dataset || (dataset.route || `dataset/${dataset.name}`) !== route || dataset.name !== entry.dataset) {
      throw new Error('Record-resource entry does not bind the selected dataset');
    }
    if (dataset.resource_count !== undefined && dataset.resource_count !== entry.count) {
      throw new Error('Record-resource count differs from the selected record metadata');
    }
    const results: LargeResource[] = [];
    const ids = new Set<string>();
    for (const selection of selections) {
      const key = `${selection.path}\u0000${selection.sha256}\u0000${selection.bytes}`;
      let promise = chunks.get(key);
      if (!promise) {
        promise = remember(chunks, key, fetchResource<unknown>(selection, true).then((raw) => {
          if (!Array.isArray(raw) || raw.length > MAX_SHARED_RESOURCE_ROWS) throw new Error('Shared resource chunk exceeds its row budget');
          return raw;
        }).catch((error) => { chunks.delete(key); throw error; }), MAX_CACHED_CHUNKS);
      }
      const values = await promise;
      for (const index of selection.rows) {
        const row = object(values[index], 'Selected resource row');
        if (typeof row.id !== 'string' || !/^[A-Za-z0-9._~-]+$/.test(row.id) || ids.has(row.id)
            || row.dataset !== dataset.name || row.route !== undefined && row.route !== `resource/${row.id}`) {
          throw new Error('Selected resource identity or dataset binding differs');
        }
        ids.add(row.id);
        results.push(row as LargeResource);
      }
    }
    return results;
  }

  return (route) => {
    const cached = routes.get(route);
    if (cached) return cached;
    const promise = load(route).catch((error) => {
      routes.delete(route);
      buckets.delete(recordResourceBucket(route));
      throw error;
    });
    return remember(routes, route, promise, MAX_CACHED_ROUTES);
  };
}
