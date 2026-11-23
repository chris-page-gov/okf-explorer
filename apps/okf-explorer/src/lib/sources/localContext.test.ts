import { afterEach, describe, expect, it, vi } from 'vitest';
import { studyClubContextFixture } from '../../test/contextFixture';
import { assembleContext, canonicalJson, contextSha256 } from '../context/index';
import { assembleLoopbackContext, localContextLoader } from './localContext';

const ORIGIN = 'http://127.0.0.1:9010';
const SOURCE = `${ORIGIN}/local/bundle.json`;

async function fixture() {
  const index = await studyClubContextFixture();
  const text = JSON.stringify(index);
  return {
    text, index,
    bundle: { snapshot: index.bundle.snapshot, entrypoints: { context_assembly: {
      path: 'context.json', bytes: new TextEncoder().encode(text).length,
      sha256: await contextSha256(text), compression: 'identity'
    } } }
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('local context admission', () => {
  it('requires a same-origin loopback HTTP bundle', async () => {
    const { bundle } = await fixture();
    expect(localContextLoader(bundle, 'https://example.test/bundle.json', 'https://example.test')).toBeUndefined();
    expect(localContextLoader(bundle, SOURCE, 'http://127.0.0.1:9011')).toBeUndefined();
    expect(localContextLoader(bundle, 'file:///bundle.json', ORIGIN)).toBeUndefined();
  });

  it('verifies and caches authorised loopback index bytes', async () => {
    const { bundle, index, text } = await fixture();
    const fetcher = vi.fn(async () => new Response(text, { headers: { 'X-OKF-Context-Audience': 'loopback' } }));
    vi.stubGlobal('fetch', fetcher);
    const load = localContextLoader(bundle, SOURCE, ORIGIN)!;
    await expect(load()).resolves.toMatchObject({ index });
    await load();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(`${ORIGIN}/local/context.json`,
      expect.objectContaining({ mode: 'same-origin', redirect: 'error' }));
  });

  it('rejects missing authorisation and changed bytes', async () => {
    const { bundle, text } = await fixture();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(text)));
    const load = localContextLoader(bundle, SOURCE, ORIGIN)!;
    await expect(load()).rejects.toThrow('not authorised');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(text.replace('Reading circle', 'Writing circle'),
      { headers: { 'X-OKF-Context-Audience': 'loopback' } })));
    await expect(load()).rejects.toThrow(/SHA-256|response too large/);
  });
});


it('restores original access labels and binds the final loopback package identity', async () => {
  const { index, bundle } = await fixture();
  for (const item of index.records) item.access = 'restricted';
  const publicResult = await assembleContext(index, 'Reading circle');
  expect(publicResult.selected).toEqual([]);
  const local = await assembleLoopbackContext({
    index, binding: { index_url: SOURCE, index_sha256: bundle.entrypoints.context_assembly.sha256 }
  }, 'Reading circle');
  expect(local.evidence_status).toEqual('sufficient');
  expect(local.selected).toHaveLength(3);
  expect(local.selected.every(({ record }) => record.access === 'restricted')).toBe(true);
  expect(index.records.every(record => record.access === 'restricted')).toBe(true);
  expect(local.budget.used_bytes).toBe(new TextEncoder().encode(JSON.stringify(local)).byteLength);
  expect(local.context_id).toBe('urn:sha256:' + await contextSha256(canonicalJson({
    ...local, context_id: undefined, budget: { ...local.budget, used_bytes: undefined }
  })));
});
