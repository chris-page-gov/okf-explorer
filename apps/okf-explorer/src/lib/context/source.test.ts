import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLargeCorpus } from '../sources/largeCorpus';
import { contextSha256 } from './index';
import { studyClubContextFixture } from '../../test/contextFixture';
import type { LargeCorpusDescriptor } from '../types';

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
describe('optional context source adapter', () => {
  it('does not fetch the index until requested and reuses verified bytes', async () => {
    const { descriptor, index, fetcher } = await fixture();
    const source = await loadLargeCorpus('https://example.test/bundle.json', descriptor);
    expect(fetcher.mock.calls.some((args) => String(args[0]).endsWith('context.json'))).toBe(false);
    const bound = await source.loadContextAssembly!();
    expect(bound.index).toEqual(index);
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
});
