import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LargeCorpusDescriptor } from '$lib/types';
import { makeRangePackFixture, rangeResponse } from '../../test/rangePackFixture';
import { loadLargeCorpus } from './largeCorpus';
import { canonicalJson, sha256Hex } from './releaseDataPlane';

const BASE = 'https://example.test/bundle/';
const SNAPSHOT = 'snapshot-1';

async function sourceFixture(options: {
  descriptorCompression?: string; manifestCompression?: string; integrityMask?: boolean;
  logicalCompression?: 'identity' | 'gzip'; omitDeclaration?: boolean;
  releaseBytesMismatch?: boolean; oversizedTransport?: boolean; omitLocator?: boolean;
} = {}) {
  const files = new Map<string, string>();
  const requests: string[] = [];
  async function bind(path: string, value: unknown) {
    const text = JSON.stringify(value);
    files.set(path, text);
    return { path, bytes: new TextEncoder().encode(text).byteLength, sha256: await sha256Hex(text) };
  }
  const index = { schema: 'okf-record-resource-index.v1', snapshot: SNAPSHOT,
    algorithm: 'fnv1a32-prefix-2', buckets: {} };
  let indexReference = await bind('references/index.json', index);
  const pack = options.logicalCompression
    ? await makeRangePackFixture([{ path: indexReference.path, value: index, compression: options.logicalCompression }])
    : undefined;
  if (pack) indexReference = { path: indexReference.path,
    bytes: pack.document.entries[0].bytes, sha256: pack.document.entries[0].sha256 };
  if (pack && (options.releaseBytesMismatch || options.oversizedTransport)) {
    const entry = pack.document.entries[0];
    if (options.releaseBytesMismatch) entry.bytes += 1024 * 1024;
    if (options.oversizedTransport) {
      entry.packed_bytes = entry.bytes + 128 * 1024;
      pack.document.packs[0].bytes = entry.packed_bytes;
    }
    pack.document.counts.source_bytes = entry.bytes;
    pack.document.counts.packed_bytes = entry.packed_bytes;
    pack.document.index_root_sha256 = await sha256Hex(`${canonicalJson({
      algorithm: pack.document.algorithm, packs: pack.document.packs, entries: pack.document.entries
    })}\n`);
  }
  const plane = pack ? await bind('data-plane.json', pack.document) : undefined;
  const locator = await bind('record-locator.json', { schema: 'okf-record-locator-sharded.v1',
    snapshot: SNAPSHOT, algorithm: 'fnv1a32-prefix-2', records: 0, chunk_size: 1,
    record_chunks: [], buckets: {} });
  await bind('overview.json', { snapshot: SNAPSHOT, counts: {} });
  await bind('manifest.json', { title: 'Resource declarations', generated_at: '2026-10-27T00:00:00Z',
    snapshot: SNAPSHOT, counts: {}, indexes: { overview: 'overview.json',
      ...(options.omitLocator ? {} : { record_locator: locator }),
      ...(options.omitDeclaration ? {} : { record_resources: { ...indexReference,
        ...(options.manifestCompression ? { compression: options.manifestCompression } : {}) } }) },
    chunks: { datasets: [], resources: [], publishers: [], relationships: [] } });
  const descriptor: LargeCorpusDescriptor = { schema: 'okf-explorer-large-corpus.v1', kind: 'okf-large-corpus',
    title: 'Resource declarations', snapshot: SNAPSHOT, counts: {}, entrypoints: {
      data_manifest: 'manifest.json', overview_index: 'overview.json',
      ...(options.omitLocator ? {} : { record_locator: locator }),
      ...(options.omitDeclaration ? {} : { record_resources: { ...indexReference,
        ...(options.descriptorCompression ? { compression: options.descriptorCompression } : {}) } }),
      ...(plane ? { release_data_plane: plane } : {}) },
    ...(options.integrityMask ? { entrypoint_integrity: { record_resources: indexReference } } : {}) };
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    requests.push(String(url));
    if (pack && String(url) === pack.packUrl) {
      return rangeResponse(pack, new Headers(init?.headers).get('Range') || '');
    }
    const text = files.get(String(url).replace(BASE, ''));
    return new Response(text ?? 'Missing', { status: text === undefined ? 404 : 200,
      headers: { 'content-type': 'application/json' } });
  }));
  return { descriptor, requests, pack };
}

afterEach(() => vi.unstubAllGlobals());

describe('record-resource declaration integrity', () => {
  it('keeps legacy bundles unchanged and makes declared record resources lazy', async () => {
    let value = await sourceFixture({ omitDeclaration: true });
    expect((await loadLargeCorpus(BASE + 'bundle.json', value.descriptor)).loadResourcesForRecord).toBeUndefined();
    value = await sourceFixture();
    expect((await loadLargeCorpus(BASE + 'bundle.json', value.descriptor)).loadResourcesForRecord).toBeTypeOf('function');
    expect(value.requests).not.toContain(BASE + 'references/index.json');
  });

  it('does not discard a forbidden compression declaration behind an integrity binding', async () => {
    for (const options of [{ descriptorCompression: 'gzip', integrityMask: true }, { manifestCompression: 'gzip' }]) {
      const value = await sourceFixture(options);
      await expect(loadLargeCorpus(BASE + 'bundle.json', value.descriptor)).rejects.toThrow(/identity JSON compression/);
    }
  });

  it('requires a record locator only when targeted source references are declared', async () => {
    const declared = await sourceFixture({ omitLocator: true });
    await expect(loadLargeCorpus(BASE + 'bundle.json', declared.descriptor)).rejects.toThrow(/require a record locator/);
    const legacy = await sourceFixture({ omitLocator: true, omitDeclaration: true });
    expect((await loadLargeCorpus(BASE + 'bundle.json', legacy.descriptor)).loadResourcesForRecord).toBeUndefined();
  });

  it('rejects logical gzip in the release plane before requesting the pack', async () => {
    const value = await sourceFixture({ logicalCompression: 'gzip' });
    const source = await loadLargeCorpus(BASE + 'bundle.json', value.descriptor);
    await expect(source.loadResourcesForRecord!('records/example/one.md')).rejects.toThrow(/identity JSON compression/);
    expect(value.requests).not.toContain(value.pack!.packUrl);
  });

  it('permits bounded transport gzip for an identity JSON member', async () => {
    const value = await sourceFixture({ logicalCompression: 'identity' });
    const source = await loadLargeCorpus(BASE + 'bundle.json', value.descriptor);
    expect(await source.loadResourcesForRecord!('records/example/absent.md')).toEqual([]);
    expect(value.requests).toContain(value.pack!.packUrl);
  });

  it('rejects inconsistent release lengths and excessive packed transport before fetching', async () => {
    for (const options of [{ releaseBytesMismatch: true }, { oversizedTransport: true }]) {
      const value = await sourceFixture({ logicalCompression: 'identity', ...options });
      const source = await loadLargeCorpus(BASE + 'bundle.json', value.descriptor);
      await expect(source.loadResourcesForRecord!('records/example/one.md')).rejects.toThrow(/declared byte budget/);
      expect(value.requests).not.toContain(value.pack!.packUrl);
    }
  });
});
