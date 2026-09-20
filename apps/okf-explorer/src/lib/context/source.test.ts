import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLargeCorpus } from '../sources/largeCorpus';
import { contextSha256, MAX_CONTEXT_INDEX_BYTES } from './index';
import { sizedStudyClubContextFixture, studyClubContextFixture } from '../../test/contextFixture';
import type { LargeCorpusDescriptor } from '../types';
import type { ContextCorpusManifest } from './corpus';

async function fixture() {
  const index = await studyClubContextFixture();
  const text = JSON.stringify(index);
  const descriptor: LargeCorpusDescriptor = { schema: 'okf-explorer-large-corpus.v1', kind: 'okf-large-corpus',
    title: 'Synthetic fixture', snapshot: index.bundle.snapshot, counts: {}, entrypoints: {
      data_manifest: 'manifest.json', overview_index: 'overview.json',
      context_assembly: { path: 'context.json', bytes: new TextEncoder().encode(text).length,
        sha256: await contextSha256(text), compression: 'identity' }
    } };
  const payloads = new Map([
    ['https://example.test/manifest.json', JSON.stringify({ title: 'Fixture', counts: {}, indexes: { overview: 'overview.json' }, chunks: {} })],
    ['https://example.test/overview.json', JSON.stringify({ title: 'Fixture', counts: {} })],
    ['https://example.test/context.json', text]
  ]);
  const fetcher = vi.fn(async (url: string | Request | URL) => new Response(payloads.get(String(url)) || '', { status: payloads.has(String(url)) ? 200 : 404 }));
  vi.stubGlobal('fetch', fetcher);
  return { descriptor, index, payloads, fetcher };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function corpusFixture() {
  const fixtureData = await fixture();
  const { descriptor, index, payloads } = fixtureData;
  const empty = JSON.stringify({ schema: 'okf-context-postings.v1', postings: {} });
  const manifest: ContextCorpusManifest = {
    schema: 'okf-context-corpus.v1', bundle: { ...index.bundle, snapshot: 'corpus-fixture-v1' },
    semantic_source_snapshot: index.bundle.snapshot, scope: index.scope, limitations: index.limitations,
    base_index: descriptor.entrypoints.context_assembly as { path: string; bytes: number; sha256: string },
    counts: { documents: 0, pages: 0, nonempty_pages: 0, empty_pages: 0, tokenless_pages: 0 },
    records: { count: 0, shards: [] },
    search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1', shards: {} }
  };
  for (let number = 0; number < 256; number++) manifest.search.shards[number.toString(16).padStart(2, '0')] = {
    path: `postings/${number}.json`, bytes: new TextEncoder().encode(empty).byteLength, sha256: await contextSha256(empty)
  };
  const raw = JSON.stringify(manifest);
  payloads.set('https://example.test/corpus.json', raw);
  descriptor.entrypoints.context_corpus = { path: 'corpus.json', bytes: new TextEncoder().encode(raw).byteLength, sha256: await contextSha256(raw) };
  return { ...fixtureData, manifest };
}

describe('optional context source adapter', () => {
  it('loads a hash-bound direct semantic index above 4 MiB', async () => {
    const { descriptor, payloads } = await fixture();
    const index = await sizedStudyClubContextFixture(4 * 1024 * 1024 + 1);
    const text = JSON.stringify(index);
    payloads.set('https://example.test/context.json', text);
    descriptor.entrypoints.context_assembly = { path: 'context.json', bytes: new TextEncoder().encode(text).length,
      sha256: await contextSha256(text), compression: 'identity' };
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    const bound = await source.loadContextAssembly!();
    expect('index' in bound && bound.index.records.length).toBe(index.records.length);
  });
  it.each([false, true])('rejects an oversized optional context reference before fetching (corpus=%s)', async corpus => {
    const { descriptor, fetcher } = corpus ? await corpusFixture() : await fixture();
    const name = corpus ? 'context_corpus' : 'context_assembly';
    (descriptor.entrypoints[name] as { bytes: number }).bytes = (corpus ? 4 * 1024 * 1024 : MAX_CONTEXT_INDEX_BYTES) + 1;
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    await expect(source.loadContextAssembly!()).rejects.toThrow(`at most ${corpus ? 4 : 8} MiB`);
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith(corpus ? 'corpus.json' : 'context.json'))).toBe(false);
  });
  it('does not fetch the index until requested and reuses verified bytes', async () => {
    const { descriptor, index, fetcher } = await fixture();
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    expect(fetcher.mock.calls.some((args) => String(args[0]).endsWith('context.json'))).toBe(false);
    const bound = await source.loadContextAssembly!();
    expect('index' in bound && bound.index).toEqual(index);
    expect(bound.binding.index_sha256).toEqual((descriptor.entrypoints.context_assembly as { sha256: string }).sha256);
    expect(await source.loadContextAssembly!()).toBe(bound);
  });
  it('rejects a changed index before parsing it', async () => {
    const { descriptor, payloads } = await fixture();
    payloads.set('https://example.test/context.json', payloads.get('https://example.test/context.json')!.replace('Reading circle', 'Forged! circle'));
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    await expect(source.loadContextAssembly!()).rejects.toThrow(/integrity|byte length/);
  });
  it('rejects cross-snapshot substitution even when bytes have a matching digest', async () => {
    const { descriptor } = await fixture(); descriptor.snapshot = 'different-snapshot';
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    await expect(source.loadContextAssembly!()).rejects.toThrow('snapshot mismatch');
  });
  it('does not break Search loading when an optional context binding is invalid', async () => {
    const { descriptor } = await fixture(); descriptor.entrypoints.context_assembly = 'context.json';
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    expect(source.overview.title).toBe('Fixture');
    await expect(source.loadContextAssembly!()).rejects.toThrow('SHA-256');
  });
  it('does not invent an index for bundles without a declaration', async () => {
    const { descriptor } = await fixture(); delete descriptor.entrypoints.context_assembly;
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    expect(source.loadContextAssembly).toBeUndefined();
  });
  it('lazily prefers an explicitly bound corpus while preserving its independent snapshot', async () => {
    const { descriptor, manifest, fetcher } = await corpusFixture();
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('corpus.json'))).toBe(false);
    const bound = await source.loadContextAssembly!();
    expect('corpus' in bound && bound.corpus).toEqual(manifest);
    expect(bound.binding.index_url).toBe('https://example.test/corpus.json');
    expect(await source.loadContextAssembly!()).toBe(bound);
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('context.json'))).toBe(false);
  });
  it('rejects cross-snapshot corpus substitution without falling back to the older index', async () => {
    const { descriptor, fetcher } = await corpusFixture();
    descriptor.snapshot = 'wrong-semantic-source';
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    await expect(source.loadContextAssembly!()).rejects.toThrow('semantic source snapshot mismatch');
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('context.json'))).toBe(false);
  });
  it('rejects a malformed corpus declaration without breaking ordinary source loading or downgrading', async () => {
    const { descriptor } = await corpusFixture();
    descriptor.entrypoints.context_corpus = '';
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    expect(source.overview.title).toBe('Fixture');
    await expect(source.loadContextAssembly!()).rejects.toThrow('SHA-256');
  });
  it('confines corpus manifest references to the descriptor base', async () => {
    const { descriptor, fetcher } = await corpusFixture();
    (descriptor.entrypoints.context_corpus as { path: string }).path = '../corpus.json';
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    await expect(source.loadContextAssembly!()).rejects.toThrow('unsafe');
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('corpus.json'))).toBe(false);
  });
  it('checks corpus file integrity before parsing any returned instructions or records', async () => {
    const { descriptor, payloads } = await corpusFixture();
    payloads.set('https://example.test/corpus.json', '{}');
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    await expect(source.loadContextAssembly!()).rejects.toThrow(/integrity|byte length/);
  });
});
