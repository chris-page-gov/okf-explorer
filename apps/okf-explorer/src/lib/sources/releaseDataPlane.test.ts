import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJsonResource } from './fetch';
import {
  MAX_RELEASE_PACK_BYTES,
  prepareReleaseDataPlane,
  releaseDataRequest,
  safeRelativeResourcePath
} from './releaseDataPlane';
import { makeRangePackFixture, rangeResponse } from '../../test/rangePackFixture';

describe('release range-pack data plane', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('recovers identity and original-gzip JSON through exact same-origin byte ranges', async () => {
    const fixture = await makeRangePackFixture([
      { path: 'data/search/postings/ca.json', value: { tokens: { catalogue: [[1, 16, 1]] } } },
      { path: 'data/records-0.json.gz', value: [{ name: 'record-one', title: 'Record one' }], compression: 'gzip' }
    ]);
    const prepared = await prepareReleaseDataPlane(fixture.document, 'https://example.test/bundle/', 'snapshot-1');
    const ranges: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe(fixture.packUrl);
      const range = new Headers(init?.headers).get('Range') || '';
      ranges.push(range);
      return rangeResponse(fixture, range);
    }));

    await expect(
      fetchJsonResource<{ tokens: Record<string, unknown> }>(
        { path: fixture.document.entries[0].path, sha256: fixture.document.entries[0].sha256 },
        'https://example.test/bundle/',
        { releaseDataPlane: prepared }
      )
    ).resolves.toEqual({ tokens: { catalogue: [[1, 16, 1]] } });
    await expect(
      fetchJsonResource<Array<{ name: string }>>(
        fixture.document.entries[1].path,
        'https://example.test/bundle/',
        { releaseDataPlane: prepared }
      )
    ).resolves.toEqual([{ name: 'record-one', title: 'Record one' }]);
    expect(ranges).toEqual(
      fixture.document.entries.map((entry) => `bytes=${entry.offset}-${entry.offset + entry.packed_bytes - 1}`)
    );
  });

  it('fails closed on tampered bytes, incorrect Content-Range and conflicting logical integrity', async () => {
    const fixture = await makeRangePackFixture([{ path: 'data/records-0.json', value: [{ id: 1 }] }]);
    const prepared = await prepareReleaseDataPlane(fixture.document, 'https://example.test/bundle/', 'snapshot-1');
    const reference = fixture.document.entries[0].path;
    const range = `bytes=0-${fixture.document.entries[0].packed_bytes - 1}`;
    const tampered = fixture.packBytes.slice();
    tampered[tampered.length - 1] ^= 1;
    vi.stubGlobal('fetch', vi.fn(async () => rangeResponse(fixture, range, { bytes: tampered })));
    await expect(
      fetchJsonResource(reference, 'https://example.test/bundle/', { releaseDataPlane: prepared, attempts: 1 })
    ).rejects.toThrow('integrity check failed');

    vi.stubGlobal('fetch', vi.fn(async () => rangeResponse(fixture, range, { contentRange: 'bytes 0-1/2' })));
    await expect(
      fetchJsonResource(reference, 'https://example.test/bundle/', { releaseDataPlane: prepared, attempts: 1 })
    ).rejects.toThrow('Content-Range differs');

    expect(() => releaseDataRequest({ path: reference, sha256: '0'.repeat(64) }, prepared)).toThrow(
      'integrity differs'
    );
  });

  it('requires an unencoded HTTP 206 response with the exact advertised length', async () => {
    const fixture = await makeRangePackFixture([{ path: 'data/records-0.json', value: [{ id: 1 }] }]);
    const prepared = await prepareReleaseDataPlane(fixture.document, 'https://example.test/bundle/', 'snapshot-1');
    const reference = fixture.document.entries[0].path;
    const range = `bytes=0-${fixture.document.entries[0].packed_bytes - 1}`;

    vi.stubGlobal('fetch', vi.fn(async () => rangeResponse(fixture, range, { status: 200 })));
    await expect(
      fetchJsonResource(reference, 'https://example.test/bundle/', { releaseDataPlane: prepared, attempts: 1 })
    ).rejects.toThrow('did not honour');

    vi.stubGlobal('fetch', vi.fn(async () => {
      const response = rangeResponse(fixture, range);
      response.headers.set('content-encoding', 'gzip');
      return response;
    }));
    await expect(
      fetchJsonResource(reference, 'https://example.test/bundle/', { releaseDataPlane: prepared, attempts: 1 })
    ).rejects.toThrow('without Content-Encoding');

    vi.stubGlobal('fetch', vi.fn(async () => {
      const response = rangeResponse(fixture, range);
      response.headers.set('content-length', String(fixture.document.entries[0].packed_bytes + 1));
      return response;
    }));
    await expect(
      fetchJsonResource(reference, 'https://example.test/bundle/', { releaseDataPlane: prepared, attempts: 1 })
    ).rejects.toThrow('Content-Length differs');

    await expect(
      fetchJsonResource('data/not-packed.json', 'https://example.test/bundle/', {
        releaseDataPlane: prepared,
        requireReleaseEntry: true,
        attempts: 1
      })
    ).rejects.toThrow('has no entry');
  });

  it('rejects unsafe paths, weakened bounds and index-root tampering before any pack read', async () => {
    expect(() => safeRelativeResourcePath('../secret.json')).toThrow('unsafe');
    expect(() => safeRelativeResourcePath('data/%2e%2e/secret.json')).toThrow('unsafe');
    expect(() => safeRelativeResourcePath('https://attacker.invalid/data.json')).toThrow('unsafe');

    const fixture = await makeRangePackFixture([{ path: 'data/records-0.json', value: [] }]);
    const oversized = structuredClone(fixture.document);
    oversized.max_pack_bytes = MAX_RELEASE_PACK_BYTES + 1;
    await expect(prepareReleaseDataPlane(oversized, 'https://example.test/bundle/')).rejects.toThrow('pack ceiling');

    const tamperedRoot = structuredClone(fixture.document);
    tamperedRoot.index_root_sha256 = '0'.repeat(64);
    await expect(prepareReleaseDataPlane(tamperedRoot, 'https://example.test/bundle/')).rejects.toThrow('index root differs');

    const unsafeEntry = structuredClone(fixture.document);
    unsafeEntry.entries[0].path = 'data/%2e%2e/secret.json';
    await expect(prepareReleaseDataPlane(unsafeEntry, 'https://example.test/bundle/')).rejects.toThrow('path is unsafe');

    await expect(
      prepareReleaseDataPlane(fixture.document, 'https://example.test/bundle/', 'different-snapshot')
    ).rejects.toThrow('snapshot differs');
  });
});
