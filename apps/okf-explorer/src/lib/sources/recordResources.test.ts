import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LargeDataset, LargeResourceReference } from '$lib/types';
import { fetchJsonResource } from './fetch';
import { sha256Hex } from './releaseDataPlane';
import { createRecordResourceLoader, MAX_RECORD_RESOURCE_BYTES, recordResourceBucket } from './recordResources';

const BASE = 'https://example.test/resources/';
const ROUTE = 'records/example/one.md';
const SNAPSHOT = 'resource-snapshot';

async function fixture(options: {
  snapshot?: string; dataset?: string; selectedDataset?: string; rows?: number[];
  count?: number; recordCount?: number; chunkRows?: number; chunkBytes?: number; route?: string;
  omitEntry?: boolean; omitBucket?: boolean;
} = {}) {
  const route = options.route || ROUTE;
  const files = new Map<string, string>();
  const requests: string[] = [];
  async function bind(path: string, value: unknown) {
    const text = JSON.stringify(value);
    files.set(path, text);
    return { path, bytes: new TextEncoder().encode(text).byteLength, sha256: await sha256Hex(text) };
  }
  const selected = { id: 'selected-reference', dataset: options.selectedDataset || 'example/one.md',
    route: 'resource/selected-reference', name: 'Retained source reference', url: 'https://source.test/one',
    source_access: { url: 'https://source.test/one', label: 'Source reference', media_type: 'not-established', display_mode: 'link' } };
  const other = { id: 'unrelated-reference', dataset: 'example/other.md', name: 'Other record source' };
  const chunk = await bind('references/shared.json', options.chunkRows ? Array(options.chunkRows).fill(other) : [selected, other]);
  const selector = { ...chunk, bytes: options.chunkBytes ?? chunk.bytes, rows: options.rows ?? [0] };
  const bucket = await bind('references/bucket.json', options.omitEntry ? {} : {
    [route]: { dataset: options.dataset || 'example/one.md', count: options.count ?? 1, chunks: [selector] }
  });
  const index = await bind('references/index.json', { schema: 'okf-record-resource-index.v1',
    snapshot: options.snapshot || SNAPSHOT, algorithm: 'fnv1a32-prefix-2',
    buckets: options.omitBucket ? {} : { [recordResourceBucket(route)]: bucket } });
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
    const path = String(url).replace(BASE, '');
    requests.push(path);
    const text = files.get(path);
    return new Response(text ?? 'Missing', { status: text === undefined ? 404 : 200,
      headers: { 'content-type': 'application/json' } });
  }));
  const fetchResource = <T>(reference: LargeResourceReference) => fetchJsonResource<T>(reference, BASE, { attempts: 1 });
  const dataset: LargeDataset = { name: 'example/one.md', route, title: 'One record',
    ...(options.recordCount === undefined ? {} : { resource_count: options.recordCount }) };
  const resolveRecord = vi.fn(async (selectedRoute: string) => selectedRoute === route ? dataset : null);
  const load = createRecordResourceLoader(index, SNAPSHOT, fetchResource, resolveRecord);
  return { load, files, requests, resolveRecord, index, fetchResource, selected };
}

afterEach(() => vi.unstubAllGlobals());

describe('bounded per-record source references', () => {
  it('loads only its index, bucket and selected shared chunk, preserving exact selected rows', async () => {
    const value = await fixture();
    expect(value.requests).toEqual([]);
    expect(await value.load(ROUTE)).toEqual([value.selected]);
    expect(value.requests).toEqual(['references/index.json', 'references/bucket.json', 'references/shared.json']);
    expect(await value.load(ROUTE)).toEqual([value.selected]);
    expect(value.requests).toHaveLength(3);
    expect(value.resolveRecord).toHaveBeenCalledTimes(1);
  });

  it('returns no invented references for a route absent from the index', async () => {
    const value = await fixture();
    expect(await value.load('records/example/absent.md')).toEqual([]);
    expect(value.resolveRecord).toHaveBeenCalledWith('records/example/absent.md');
    expect(value.requests).not.toContain('references/shared.json');
  });

  it('does not turn an omitted known-record index entry into a false zero', async () => {
    for (const omission of [{ omitEntry: true }, { omitBucket: true }]) {
      const value = await fixture({ ...omission, recordCount: 1 });
      await expect(value.load(ROUTE)).rejects.toThrow(/omits advertised source references/);
      expect(value.requests).not.toContain('references/shared.json');
    }
    const empty = await fixture({ omitEntry: true, recordCount: 0 });
    expect(await empty.load(ROUTE)).toEqual([]);
  });

  it('treats encoded native identity segments as locator keys rather than fetch paths', async () => {
    const route = 'dataset/https%3A%2F%2Fcatalogue.example%2Fnative';
    const value = await fixture({ route });
    expect(await value.load(route)).toEqual([value.selected]);
    expect(value.requests).not.toContain(route);
  });

  it('rejects a different source snapshot before requesting a bucket or record', async () => {
    const value = await fixture({ snapshot: 'different' });
    await expect(value.load(ROUTE)).rejects.toThrow(/snapshot/);
    expect(value.requests).toEqual(['references/index.json']);
    expect(value.resolveRecord).not.toHaveBeenCalled();
  });

  it('checks both locator dataset identity and selected row parent binding', async () => {
    let value = await fixture({ dataset: 'example/other.md' });
    await expect(value.load(ROUTE)).rejects.toThrow(/bind the selected dataset/);
    expect(value.requests).not.toContain('references/shared.json');
    value = await fixture({ selectedDataset: 'example/other.md' });
    await expect(value.load(ROUTE)).rejects.toThrow(/dataset binding/);
  });

  it('rejects duplicate, out-of-range and inconsistent selected-row commitments', async () => {
    for (const options of [{ rows: [0, 0], count: 2 }, { rows: [3] }, { rows: [0], count: 2 }]) {
      const value = await fixture(options);
      await expect(value.load(ROUTE)).rejects.toThrow();
    }
  });

  it('reconciles the indexed count with the independently loaded record count', async () => {
    const value = await fixture({ recordCount: 2 });
    await expect(value.load(ROUTE)).rejects.toThrow(/count differs from the selected record/);
    expect(value.requests).not.toContain('references/shared.json');
  });

  it('refuses excessive declared bytes before requesting the shared chunk', async () => {
    const value = await fixture({ chunkBytes: MAX_RECORD_RESOURCE_BYTES + 1 });
    await expect(value.load(ROUTE)).rejects.toThrow(/bounded relative JSON/);
    expect(value.requests).not.toContain('references/shared.json');
  });

  it('bounds shared chunks independently of their selected row count', async () => {
    const value = await fixture({ chunkRows: 1025 });
    await expect(value.load(ROUTE)).rejects.toThrow(/Shared resource chunk exceeds/);
  });

  it('checks real response hashes and permits a clean retry after a failed chunk', async () => {
    const value = await fixture();
    const original = value.files.get('references/shared.json')!;
    value.files.set('references/shared.json', original.replace('Retained', 'Tampered'));
    await expect(value.load(ROUTE)).rejects.toThrow(/integrity check failed/);
    value.files.set('references/shared.json', original);
    expect(await value.load(ROUTE)).toEqual([value.selected]);
    expect(value.requests.filter((path) => path === 'references/shared.json')).toHaveLength(2);
  });

  it('requires digest-bound local JSON entrypoints', async () => {
    const value = await fixture();
    for (const reference of ['references/index.json', { ...value.index, path: 'https://other.test/index.json' },
      { ...value.index, sha256: undefined }, { ...value.index, compression: 'gzip' },
      { ...value.index, path: 'references/index.json.GZ' }, { ...value.index, path: 'references/index.json.Gz' }]) {
      expect(() => createRecordResourceLoader(reference, SNAPSHOT, value.fetchResource, value.resolveRecord)).toThrow();
    }
  });
});
