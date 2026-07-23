import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  baseUrlFor,
  fetchJson,
  fetchSourceJson,
  MAX_JSON_BYTES,
  MAX_SOURCE_JSON_BYTES,
  movedBundleTarget,
  readResponseText,
  resolveUrl,
  sourceJsonCandidates
} from './fetch';
import { CHUNK_FETCH_BATCH_SIZE, loadLargeCorpus, MAX_RELATIONSHIP_ROWS, relationshipBucket } from './largeCorpus';
import { sha256Hex } from './releaseDataPlane';
import { loadHistory, loadRegistry, rememberHistory } from './registry';
import { normalizeSmallBundle } from './smallBundle';
import { makeRangePackFixture, rangeResponse } from '../../test/rangePackFixture';
import type { OkfBundle } from '$lib/types';

function mockLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    clear: vi.fn(() => {
      values.clear();
    })
  };
}

function jsonResponse(value: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(value), {
    status: init.status || 200,
    statusText: init.statusText || 'OK',
    headers: { 'content-type': 'application/json' }
  });
}

function providerDatapackFixture(snapshot = 'snapshot-one') {
  return {
    schema: 'okf-explorer-provider-datapack.v1',
    snapshot,
    id: 'provider-one',
    provider: {
      id: 'provider-one',
      title: 'Provider One',
      liveServiceUrl: 'https://provider.example/live/',
      repositoryUrl: 'https://provider.example/source/'
    },
    selector: { field: 'source_surface', operator: 'equals', value: 'provider-one' },
    governedSnapshot: {
      status: 'governed-pinned-snapshot',
      label: 'Governed snapshot',
      snapshotId: snapshot,
      recordCount: 1,
      sourceCommit: 'a'.repeat(40),
      sourceCommitShort: 'aaaaaaa',
      sourceAsOf: '2026-07-17T00:00:00Z',
      sourceAsOfBasis: 'verified source revision',
      metadataOnly: true,
      observationsIncluded: false,
      records: [
        {
          recordId: 'provider-one:record-one',
          title: 'Provider record one',
          metadataModified: '2026-07-17'
        }
      ]
    },
    reviewedLiveReference: {
      status: 'reviewed-reference-not-live-validated',
      label: 'Reviewed reference',
      lastChecked: '2026-07-23',
      network: 'external',
      liveServiceUrl: 'https://provider.example/live/',
      repositoryUrl: 'https://provider.example/source/',
      sourceCommit: 'b'.repeat(40),
      sourceCommitShort: 'bbbbbbb',
      sourceCommitAsOf: '2026-07-22T00:00:00Z',
      metadataInputSha256: 'c'.repeat(64),
      records: [
        {
          recordId: 'provider-one:record-one',
          title: 'Provider record one',
          metadataModified: '2026-07-22'
        }
      ]
    },
    comparison: {
      status: 'known-drift',
      comparisonAsOf: '2026-07-23',
      summary: 'A reviewed difference is known.',
      evidenceScope: 'reviewed-record-examples',
      exhaustive: false,
      executionRequiresLiveValidation: true,
      differences: [
        {
          recordId: 'provider-one:record-one',
          title: 'Provider record one',
          fields: [
            {
              field: 'metadataModified',
              snapshot: '2026-07-17',
              reviewedLiveReference: '2026-07-22'
            }
          ]
        }
      ]
    },
    presentation: {
      snapshotLabel: 'Snapshot',
      liveLabel: 'Reviewed reference',
      lastCheckedWording: 'Last checked 23 July 2026.',
      notice: 'The external service may have changed.',
      actions: [
        {
          id: 'open-provider',
          label: 'Open provider',
          kind: 'external-link',
          urlTemplate: 'https://provider.example/live/',
          network: 'external'
        }
      ]
    }
  };
}

describe('fetch helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves bundle-relative URLs and reports HTTP failures', async () => {
    expect(resolveUrl('data/manifest.json', 'https://example.test/repo/okf-explorer.json')).toBe('https://example.test/repo/data/manifest.json');
    expect(baseUrlFor('https://example.test/repo/okf-explorer.json')).toBe('https://example.test/repo/');

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true })));
    await expect(fetchJson<{ ok: boolean }>('https://example.test/data.json')).resolves.toEqual({ ok: true });

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: true }, { status: 404, statusText: 'Not Found' })));
    await expect(fetchJson('https://example.test/missing.json')).rejects.toThrow('404 Not Found');
  });

  it('resolves machine-readable moved bundle descriptors', () => {
    expect(
      movedBundleTarget(
        { kind: 'okf-moved', moved_to: 'https://canonical.example/okf-explorer.json' },
        'https://legacy.example/okf-explorer.json'
      )
    ).toBe('https://canonical.example/okf-explorer.json');
    expect(movedBundleTarget({ kind: 'okf-large-corpus' }, 'https://legacy.example/okf-explorer.json')).toBeNull();
    expect(() => movedBundleTarget({ kind: 'okf-moved' }, 'https://legacy.example/okf-explorer.json')).toThrow('missing moved_to');
    expect(() =>
      movedBundleTarget(
        { kind: 'okf-moved', moved_to: 'https://legacy.example/okf-explorer.json' },
        'https://legacy.example/okf-explorer.json'
      )
    ).toThrow('points to itself');
  });

  it('retries transient HTTP failures before surfacing an error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: true }, { status: 503, statusText: 'Service Unavailable' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson<{ ok: boolean }>('https://example.test/flaky.json', 30000, 2, 0)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects responses that report a content-length above the cap', async () => {
    const oversized = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(MAX_JSON_BYTES + 1) : null) },
      json: async () => ({ ok: true })
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => oversized));
    await expect(fetchJson('https://example.test/huge.json')).rejects.toThrow('response too large');
  });

  it('allows responses at or under the content-length cap', async () => {
    const atCap = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(MAX_JSON_BYTES) : null) },
      text: async () => '{"ok":true}'
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => atCap));
    await expect(fetchJson<{ ok: boolean }>('https://example.test/atcap.json')).resolves.toEqual({ ok: true });
  });

  it('rejects streamed responses that exceed the byte cap without content-length', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"ok":'));
          controller.enqueue(new TextEncoder().encode('"too large"}'));
          controller.close();
        }
      })
    );

    await expect(readResponseText(response, 'https://example.test/chunked.json', 8)).rejects.toThrow('response too large');
  });

  it('reads streamed responses within the byte cap', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"ok":true}'));
          controller.close();
        }
      })
    );

    await expect(readResponseText(response, 'https://example.test/chunked.json', 64)).resolves.toBe('{"ok":true}');
  });

  it('loads bounded external source JSON with response provenance', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('{"success":true}', {
        headers: { 'content-type': 'application/json; charset=utf-8' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchSourceJson('https://example.test/api/record');
    expect(response.json).toEqual({ success: true });
    expect(response.bytes).toBe(16);
    expect(response.contentType).toBe('application/json; charset=utf-8');
    expect(response.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(response.responseUrl).toBe('https://example.test/api/record');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/record',
      expect.objectContaining({ headers: { Accept: 'application/json, application/*+json;q=0.9' } })
    );
  });

  it('uses a smaller display cap for external source responses', async () => {
    const oversized = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(MAX_SOURCE_JSON_BYTES + 1) : null) }
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => oversized));

    await expect(fetchSourceJson('https://example.test/api/huge', 15000, 1, 0)).rejects.toThrow('response too large');
  });

  it('resolves legacy data.gov.uk action URLs through the browser-readable CKAN host', async () => {
    const legacy = 'https://data.gov.uk/api/action/package_show?id=example';
    const canonical = 'https://ckan.publishing.service.gov.uk/api/3/action/package_show?id=example';
    expect(sourceJsonCandidates(legacy)).toEqual([canonical, legacy]);
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchSourceJson(legacy, 15000, 1, 0);
    expect(response.json).toEqual({ success: true });
    expect(response.responseUrl).toBe(canonical);
    expect(fetchMock).toHaveBeenCalledWith(canonical, expect.any(Object));
  });

  it('decompresses explicit gzip corpus chunks before parsing', async () => {
    const source = new Response('{"ok":true}').body!;
    const compressed = await new Response(source.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    await expect(readResponseText(new Response(compressed), 'https://example.test/works-0.json.gz', 64)).resolves.toBe('{"ok":true}');
  });
});

describe('small bundle normalization', () => {
  it('normalizes top-level bundle nodes and relationships', () => {
    const corpus = normalizeSmallBundle({
      meta: { title: 'Bundle title', description: 'Bundle description' },
      nodes: {
        a: { id: 'raw-a', title: 'Alpha', aliases: 'A; Alpha service', tags: 'one; two' },
        b: { id: 'custom-b', name: 'Beta' },
        c: { id: 'custom-c', label: 'Gamma' },
        d: { id: 'custom-d' }
      },
      relationships: [
        { source: 'a', target: 'custom-b', kind: 'related' },
        { source: 'b', target: 'c', type: 'typed' },
        { source: 'c', target: 'd', label: 'labelled' },
        { source: '', target: 'd', kind: 'missing source' }
      ]
    } as unknown as OkfBundle);

    expect(corpus.title).toBe('Bundle title');
    expect(corpus.description).toBe('Bundle description');
    expect(corpus.nodes.a.id).toBe('a');
    expect(corpus.nodes.a.aliases).toEqual(['A', 'Alpha service']);
    expect(corpus.nodes.a.tags).toEqual(['one', 'two']);
    expect(corpus.nodes.b.id).toBe('b');
    expect(corpus.nodes.b.title).toBe('Beta');
    expect(corpus.nodes.c.title).toBe('Gamma');
    expect(corpus.nodes.d.title).toBe('d');
    expect(corpus.nodes.d.type).toBe('Node');
    expect(corpus.nodes.d.section).toBe('root');
    expect(corpus.relationships).toEqual([
      { source: 'a', target: 'custom-b', kind: 'related' },
      { source: 'b', target: 'c', type: 'typed', kind: 'typed' },
      { source: 'c', target: 'd', label: 'labelled', kind: 'labelled' }
    ]);
  });

  it('uses the first corpus when corpora are present', () => {
    const corpus = normalizeSmallBundle({
      corpora: {
        first: {
          id: 'first',
          title: 'First corpus',
          nodes: { a: { id: 'a', title: 'Alpha' } },
          relationships: []
        },
        second: {
          id: 'second',
          title: 'Second corpus',
          nodes: { b: { id: 'b', title: 'Beta' } },
          relationships: []
        }
      }
    });

    expect(corpus.id).toBe('first');
    expect(Object.keys(corpus.nodes)).toEqual(['a']);
  });

  it('accepts generator-style edges at bundle and corpus scope', () => {
    const bundleEdges = normalizeSmallBundle({
      nodes: {
        a: { id: 'a', title: 'Alpha' },
        b: { id: 'b', title: 'Beta' }
      },
      edges: [{ source: 'a', target: 'b', type: 'generated edge' }]
    });
    expect(bundleEdges.relationships).toEqual([
      { source: 'a', target: 'b', type: 'generated edge', kind: 'generated edge' }
    ]);

    const corpusEdges = normalizeSmallBundle({
      corpora: {
        selected: {
          nodes: {
            a: { id: 'a', title: 'Alpha' },
            b: { id: 'b', title: 'Beta' }
          },
          edges: [{ source: 'b', target: 'a', label: 'corpus edge' }]
        }
      }
    }, 'selected');
    expect(corpusEdges.relationships).toEqual([
      { source: 'b', target: 'a', label: 'corpus edge', kind: 'corpus edge' }
    ]);
  });

  it('normalizes an empty small bundle to safe defaults', () => {
    const corpus = normalizeSmallBundle({} as OkfBundle);

    expect(corpus.id).toBe('default');
    expect(corpus.title).toBe('OKF bundle');
    expect(corpus.description).toBe('');
    expect(corpus.nodes).toEqual({});
    expect(corpus.relationships).toEqual([]);
  });

  it('honours preferred corpora and falls back to bundle-level nodes and metadata', () => {
    const bundle = {
      title: 'Bundle fallback title',
      nodes: { fallback: { id: 'fallback', title: 'Fallback node' } },
      relationships: [{ source: 'fallback', target: 'fallback' }],
      corpora: {
        empty: {
          id: 'empty',
          description: 'Empty corpus'
        },
        selected: {
          id: 'selected',
          title: 'Selected corpus',
          nodes: { selected: { id: 'selected', title: 'Selected node' } },
          relationships: []
        }
      }
    } as unknown as OkfBundle;

    const fallbackCorpus = normalizeSmallBundle(bundle);
    expect(fallbackCorpus.id).toBe('empty');
    expect(fallbackCorpus.title).toBe('Bundle fallback title');
    expect(Object.keys(fallbackCorpus.nodes)).toEqual(['fallback']);
    expect(fallbackCorpus.relationships).toEqual([{ source: 'fallback', target: 'fallback', kind: 'related' }]);

    const selectedCorpus = normalizeSmallBundle(bundle, 'selected');
    expect(selectedCorpus.id).toBe('selected');
    expect(selectedCorpus.title).toBe('Selected corpus');
    expect(Object.keys(selectedCorpus.nodes)).toEqual(['selected']);
  });
});

describe('registry and history', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores bundle history as newest unique entries', () => {
    rememberHistory({ title: 'First', url: 'https://example.test/one.json' });
    rememberHistory({ title: 'Second', url: 'https://example.test/two.json' });
    rememberHistory({ title: 'First again', url: 'https://example.test/one.json' });

    expect(loadHistory()).toEqual([
      expect.objectContaining({ title: 'First again', url: 'https://example.test/one.json', kind: 'history' }),
      expect.objectContaining({ title: 'Second', url: 'https://example.test/two.json', kind: 'history' })
    ]);
  });

  it('ignores corrupted history storage', () => {
    localStorage.setItem('okfExplorerBundleHistory:v2', '{not json');
    expect(loadHistory()).toEqual([]);
  });

  it('ignores non-array history storage and caps the stored list', () => {
    localStorage.setItem('okfExplorerBundleHistory:v2', JSON.stringify({ url: 'https://example.test/not-array.json' }));
    expect(loadHistory()).toEqual([]);

    for (let index = 0; index < 25; index += 1) {
      rememberHistory({ title: `Bundle ${index}`, url: `https://example.test/${index}.json` });
    }
    expect(loadHistory()).toHaveLength(20);
    expect(loadHistory()[0].url).toBe('https://example.test/24.json');
  });

  it('loads registry entries and degrades to an empty registry on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          bundles: [{ title: 'Bundle', url: 'https://example.test/bundle.json' }],
          entries: [{ title: 'Large', url: 'https://example.test/large.json' }, { title: 'Broken' }]
        })
      )
    );
    await expect(loadRegistry('https://example.test/registry.json')).resolves.toHaveLength(2);

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, { status: 500, statusText: 'Server Error' })));
    await expect(loadRegistry('https://example.test/registry.json')).resolves.toEqual([]);
  });

  it('ignores registry entries without URLs when bundles or entries are absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          entries: [{ title: 'Missing URL' }, { title: 'Valid', url: 'https://example.test/valid.json' }]
        })
      )
    );

    await expect(loadRegistry('https://example.test/registry.json')).resolves.toEqual([
      { title: 'Valid', url: 'https://example.test/valid.json' }
    ]);
  });

  it('handles empty registry payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({})));
    await expect(loadRegistry('https://example.test/registry.json')).resolves.toEqual([]);
  });
});

describe('large corpus source', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads descriptors, overview analysis, chunks and lazy relationship indexes', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            overview_index: 'data/overview.json',
            analysis_overview: 'data/analysis/overview.json',
            presentation: 'data/presentation.json',
            operational_metadata: 'data/operational-metadata.json'
          },
          counts: { datasets: 1, resources: 2, relationships: 1 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 1, resources: 2, relationships: 1 },
          indexes: {
            overview: 'data/overview.json',
            facets: 'data/facets.json',
            graph: 'data/graph.json',
            govuk_content: 'data/govuk.json',
            relationship_adjacency: 'data/adjacency/manifest.json'
          },
          chunks: {
            datasets: ['data/datasets-0.json'],
            resources: ['data/resources-0.json'],
            publishers: ['data/publishers-0.json'],
            relationships: ['data/relationships-0.json']
          }
        }
      ],
      [
        'https://example.test/ckan/data/overview.json',
        {
          title: 'Overview',
          counts: { datasets: 1, resources: 2, relationships: 1 }
        }
      ],
      [
        'https://example.test/ckan/data/analysis/overview.json',
        {
          schema: 'okf-explorer-analysis.v1',
          generated_at: '2026-07-06T00:00:00Z',
          summary: { title: 'Analysis' }
        }
      ],
      [
        'https://example.test/ckan/data/presentation.json',
        {
          schema: 'okf-explorer-presentation.v1',
          status: 'experimental',
          facets: [{ key: 'publisher', label: 'Provider', default_state: 'pinned' }]
        }
      ],
      [
        'https://example.test/ckan/data/datasets-0.json',
        [
          {
            id: 'd1',
            name: 'dataset-one',
            title: 'Dataset One',
            publisher: 'publisher-one',
            resource_count: 2
          }
        ]
      ],
      [
        'https://example.test/ckan/data/resources-0.json',
        [
          { id: 'r2', dataset: 'dataset-one', name: 'Second', position: 2 },
          { id: 'r3', dataset: 'dataset-one', name: 'Another second', position: 2 },
          { id: 'r00', dataset: 'dataset-one', name: 'Another' },
          { id: 'r1', dataset: 'dataset-one', name: 'First', position: 1 },
          { id: 'r0', dataset: 'dataset-one' }
        ]
      ],
      ['https://example.test/ckan/data/publishers-0.json', [{ id: 'p1', name: 'publisher-one', title: 'Publisher One' }]],
      [
        'https://example.test/ckan/data/facets.json',
        {
          schema: 'okf-facets.v1',
          generated_at: '2026-07-06T00:00:00Z',
          publisher: [{ value: 'publisher-one', count: 1 }]
        }
      ],
      ['https://example.test/ckan/data/graph.json', { nodes: [], edges: [] }],
      ['https://example.test/ckan/data/govuk.json', { paths: [] }],
      [
        'https://example.test/ckan/data/operational-metadata.json',
        {
          schema: 'okf-operational-metadata.v1',
          generated_at: '2026-07-13T00:00:00Z',
          records: {
            'dataset/dataset-one': {
              authoritative_source: { name: 'Publisher One' },
              update_frequency: 'Monthly'
            }
          }
        }
      ],
      [
        'https://example.test/ckan/data/adjacency/manifest.json',
        {
          schema: 'okf-relationship-adjacency.v1',
          algorithm: 'fnv1a32-prefix-2',
          routes: 2,
          relationships: 1,
          buckets: { '83': 'data/adjacency/83.json' }
        }
      ],
      [
        'https://example.test/ckan/data/adjacency/83.json',
        { 'dataset/dataset-one': [{ source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }] }
      ],
      ['https://example.test/ckan/data/relationships-0.json', [{ source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }]]
    ]);

    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
      return jsonResponse(payloads.get(key));
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    expect(source.analysis?.summary?.title).toBe('Analysis');
    expect(source.presentation?.facets?.[0]).toEqual(
      expect.objectContaining({ key: 'publisher', label: 'Provider', default_state: 'pinned' })
    );
    expect(fetchMock).not.toHaveBeenCalledWith('https://example.test/ckan/data/datasets-0.json', expect.anything());

    const facetIndex = await source.loadFacetIndex();
    expect(facetIndex).toEqual({ publisher: [{ value: 'publisher-one', count: 1 }] });
    expect(await source.loadFacetIndex()).toBe(facetIndex);
    expect(fetchMock).not.toHaveBeenCalledWith('https://example.test/ckan/data/datasets-0.json', expect.anything());

    const fullIndex = await source.loadFullIndex();
    expect(fullIndex.datasetByName.get('dataset-one')?.title).toBe('Dataset One');
    expect(fullIndex.datasetByName.get('dataset-one')?.operational_metadata?.update_frequency).toBe('Monthly');
    expect(fullIndex.operationalMetadata.schema).toBe('okf-operational-metadata.v1');
    expect(fullIndex.facets).toEqual({ publisher: [{ value: 'publisher-one', count: 1 }] });
    expect(fullIndex.resourcesByDataset.get('dataset-one')?.map((resource) => resource.id)).toEqual(['r0', 'r00', 'r1', 'r3', 'r2']);
    expect(await source.loadFullIndex()).toBe(fullIndex);

    const relationshipsResult = await source.loadRelationships();
    expect(relationshipsResult).toEqual({
      relationships: [{ source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }],
      truncated: false
    });
    expect(await source.loadRelationships()).toBe(relationshipsResult);

    await expect(source.loadRelationshipsForRoute('dataset/dataset-one')).resolves.toEqual([
      { source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }
    ]);
    await expect(source.loadRelationshipsForRoute('missing/route')).resolves.toEqual([]);
  });

  it('loads same-origin provider datapacks at startup and binds every layer to the bundle snapshot', async () => {
    const providerPack = providerDatapackFixture();
    const providerManifest = {
      schema: 'okf-explorer-provider-datapack-manifest.v1',
      snapshot: 'snapshot-one',
      packCount: 1,
      packs: [
        {
          id: 'provider-one',
          selector: { field: 'source_surface', operator: 'equals', value: 'provider-one' },
          path: 'data/providers/provider-one.json',
          sha256: await sha256Hex(JSON.stringify(providerPack)),
          status: 'known-drift',
          lastChecked: '2026-07-23'
        }
      ]
    };
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/providers/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Provider fixture',
          snapshot: 'snapshot-one',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            provider_datapacks: 'data/providers/manifest.json'
          },
          entrypoint_integrity: {
            provider_datapacks: {
              path: 'data/providers/manifest.json',
              sha256: await sha256Hex(JSON.stringify(providerManifest))
            }
          },
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      [
        'https://example.test/providers/data/manifest.json',
        {
          title: 'Provider fixture',
          generated_at: '2026-07-23T00:00:00Z',
          snapshot: 'snapshot-one',
          counts: { datasets: 0, resources: 0, relationships: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: { datasets: [], resources: [], publishers: [], relationships: [] }
        }
      ],
      [
        'https://example.test/providers/data/overview.json',
        {
          title: 'Provider fixture',
          generated_at: '2026-07-23T00:00:00Z',
          snapshot: 'snapshot-one',
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      ['https://example.test/providers/data/providers/manifest.json', providerManifest],
      [
        'https://example.test/providers/data/providers/provider-one.json',
        providerPack
      ]
    ]);
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
      return jsonResponse(payloads.get(key));
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus('https://example.test/providers/okf-explorer.json');
    expect(source.snapshot).toBe('snapshot-one');
    expect(source.providerDatapacks?.manifest.schema).toBe(
      'okf-explorer-provider-datapack-manifest.v1'
    );
    expect(source.providerDatapacks?.packs[0]).toEqual(
      expect.objectContaining({
        id: 'provider-one',
        snapshot: 'snapshot-one',
        comparison: expect.objectContaining({ status: 'known-drift', exhaustive: false })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/providers/data/providers/provider-one.json',
      expect.anything()
    );

    payloads.set('https://example.test/providers/data/providers/provider-one.json', {
      ...providerPack,
      snapshot: 'tampered-after-manifest'
    });
    await expect(
      loadLargeCorpus('https://example.test/providers/okf-explorer.json')
    ).rejects.toThrow('Resource integrity check failed');

    payloads.set(
      'https://example.test/providers/data/providers/provider-one.json',
      providerPack
    );
    payloads.set('https://example.test/providers/data/providers/manifest.json', {
      ...providerManifest,
      packCount: 0
    });
    await expect(
      loadLargeCorpus('https://example.test/providers/okf-explorer.json')
    ).rejects.toThrow('Resource integrity check failed');
  });

  it('fails closed when an advertised provider datapack belongs to another snapshot', async () => {
    const mismatchedProviderPack = providerDatapackFixture('snapshot-two');
    const mismatchedProviderManifest = {
      schema: 'okf-explorer-provider-datapack-manifest.v1',
      snapshot: 'snapshot-one',
      packCount: 1,
      packs: [
        {
          id: 'provider-one',
          selector: { field: 'source_surface', operator: 'equals', value: 'provider-one' },
          path: 'data/providers/provider-one.json',
          sha256: await sha256Hex(JSON.stringify(mismatchedProviderPack)),
          status: 'known-drift',
          lastChecked: '2026-07-23'
        }
      ]
    };
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/provider-mismatch/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Mismatch fixture',
          snapshot: 'snapshot-one',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            provider_datapacks: 'data/providers/manifest.json'
          },
          entrypoint_integrity: {
            provider_datapacks: {
              path: 'data/providers/manifest.json',
              sha256: await sha256Hex(JSON.stringify(mismatchedProviderManifest))
            }
          },
          counts: { datasets: 0 }
        }
      ],
      [
        'https://example.test/provider-mismatch/data/manifest.json',
        {
          title: 'Mismatch fixture',
          generated_at: '2026-07-23T00:00:00Z',
          snapshot: 'snapshot-one',
          counts: { datasets: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      [
        'https://example.test/provider-mismatch/data/overview.json',
        {
          title: 'Mismatch fixture',
          snapshot: 'snapshot-one',
          counts: { datasets: 0 }
        }
      ],
      [
        'https://example.test/provider-mismatch/data/providers/manifest.json',
        mismatchedProviderManifest
      ],
      [
        'https://example.test/provider-mismatch/data/providers/provider-one.json',
        mismatchedProviderPack
      ]
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({}, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    await expect(
      loadLargeCorpus('https://example.test/provider-mismatch/okf-explorer.json')
    ).rejects.toThrow('advertise different snapshot identifiers');
  });

  it('requires an integrity-bound provider manifest on a matching bundle path', async () => {
    async function expectReferenceFailure({
      suffix,
      descriptorPath,
      descriptorIntegrity,
      manifestReference,
      message
    }: {
      suffix: string;
      descriptorPath?: string | { path: string; sha256: string };
      descriptorIntegrity?: { path: string; sha256: string };
      manifestReference?: string | { path: string; sha256: string };
      message: string;
    }) {
      const prefix = `https://example.test/provider-reference-${suffix}/`;
      const payloads = new Map<string, unknown>([
        [
          `${prefix}okf-explorer.json`,
          {
            schema: 'okf-explorer-large-corpus.v1',
            kind: 'okf-large-corpus',
            title: 'Provider reference fixture',
            snapshot: 'snapshot-one',
            entrypoints: {
              data_manifest: 'data/manifest.json',
              ...(descriptorPath ? { provider_datapacks: descriptorPath } : {})
            },
            ...(descriptorIntegrity
              ? { entrypoint_integrity: { provider_datapacks: descriptorIntegrity } }
              : {}),
            counts: { datasets: 0 }
          }
        ],
        [
          `${prefix}data/manifest.json`,
          {
            title: 'Provider reference fixture',
            generated_at: '2026-07-23T00:00:00Z',
            snapshot: 'snapshot-one',
            counts: { datasets: 0 },
            indexes: {
              overview: 'data/overview.json',
              ...(manifestReference ? { provider_datapacks: manifestReference } : {})
            },
            chunks: {}
          }
        ],
        [
          `${prefix}data/overview.json`,
          {
            title: 'Provider reference fixture',
            snapshot: 'snapshot-one',
            counts: { datasets: 0 }
          }
        ]
      ]);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string | URL | Request) => {
          const key = String(url);
          if (!payloads.has(key)) {
            return jsonResponse({}, { status: 404, statusText: 'Not Found' });
          }
          return jsonResponse(payloads.get(key));
        })
      );
      await expect(loadLargeCorpus(`${prefix}okf-explorer.json`)).rejects.toThrow(message);
    }

    await expectReferenceFailure({
      suffix: 'unbound',
      descriptorPath: 'data/providers/manifest.json',
      manifestReference: 'data/providers/manifest.json',
      message: 'require a descriptor entrypoint with entrypoint_integrity SHA-256'
    });
    await expectReferenceFailure({
      suffix: 'direct-hash-without-integrity-row',
      descriptorPath: {
        path: 'data/providers/manifest.json',
        sha256: 'd'.repeat(64)
      },
      manifestReference: 'data/providers/manifest.json',
      message: 'require a descriptor entrypoint with entrypoint_integrity SHA-256'
    });
    await expectReferenceFailure({
      suffix: 'manifest-only-hash',
      manifestReference: {
        path: 'data/providers/manifest.json',
        sha256: 'd'.repeat(64)
      },
      message: 'require a descriptor entrypoint with entrypoint_integrity SHA-256'
    });
    await expectReferenceFailure({
      suffix: 'path-mismatch',
      descriptorPath: 'data/providers/manifest.json',
      descriptorIntegrity: {
        path: 'data/providers/manifest.json',
        sha256: 'd'.repeat(64)
      },
      manifestReference: 'data/different-provider-manifest.json',
      message: 'provider-datapack manifest paths differ'
    });
    await expectReferenceFailure({
      suffix: 'outside-base',
      descriptorPath: '../outside/provider-manifest.json',
      descriptorIntegrity: {
        path: '../outside/provider-manifest.json',
        sha256: 'd'.repeat(64)
      },
      message: 'must stay inside the bundle base path'
    });
  });

  it('requires descriptor and data-manifest snapshot bindings when provider datapacks are advertised', async () => {
    for (const missingSnapshot of ['descriptor', 'manifest'] as const) {
      const prefix = `https://example.test/provider-${missingSnapshot}-snapshot/`;
      const descriptor = {
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus',
        title: 'Provider snapshot requirement fixture',
        ...(missingSnapshot === 'descriptor' ? {} : { snapshot: 'snapshot-one' }),
        entrypoints: {
          data_manifest: 'data/manifest.json',
          provider_datapacks: 'data/providers/manifest.json'
        },
        entrypoint_integrity: {
          provider_datapacks: {
            path: 'data/providers/manifest.json',
            sha256: 'd'.repeat(64)
          }
        },
        counts: { datasets: 0 }
      };
      const manifest = {
        title: 'Provider snapshot requirement fixture',
        generated_at: '2026-07-23T00:00:00Z',
        ...(missingSnapshot === 'manifest' ? {} : { snapshot: 'snapshot-one' }),
        counts: { datasets: 0 },
        indexes: { overview: 'data/overview.json' },
        chunks: {}
      };
      const payloads = new Map<string, unknown>([
        [`${prefix}okf-explorer.json`, descriptor],
        [`${prefix}data/manifest.json`, manifest],
        [
          `${prefix}data/overview.json`,
          {
            title: 'Provider snapshot requirement fixture',
            snapshot: 'snapshot-one',
            counts: { datasets: 0 }
          }
        ]
      ]);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string | URL | Request) => {
          const key = String(url);
          if (!payloads.has(key)) {
            return jsonResponse({}, { status: 404, statusText: 'Not Found' });
          }
          return jsonResponse(payloads.get(key));
        })
      );

      await expect(loadLargeCorpus(`${prefix}okf-explorer.json`)).rejects.toThrow(
        'require snapshot identifiers on both the descriptor and data manifest'
      );
    }
  });

  it('retries full hydration after a transient lightweight facet failure', async () => {
    const payloads = new Map<string, unknown>([
      ['https://example.test/retry/okf-explorer.json', {
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus',
        title: 'Retry fixture',
        entrypoints: { data_manifest: 'data/manifest.json' }
      }],
      ['https://example.test/retry/data/manifest.json', {
        title: 'Retry manifest',
        generated_at: '2026-07-21T00:00:00Z',
        counts: { datasets: 0, resources: 0, relationships: 0 },
        indexes: { overview: 'data/overview.json', facets: 'data/facets.json' },
        chunks: { datasets: [], resources: [], publishers: [], relationships: [] }
      }],
      ['https://example.test/retry/data/overview.json', {
        title: 'Retry overview',
        counts: { datasets: 0, resources: 0, relationships: 0 }
      }],
      ['https://example.test/retry/data/facets.json', {
        topic: [{ value: 'population', count: 1 }]
      }]
    ]);
    let facetAttempts = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (key.endsWith('/data/facets.json') && facetAttempts++ === 0) {
        return jsonResponse({}, { status: 404, statusText: 'Not Found' });
      }
      return payloads.has(key)
        ? jsonResponse(payloads.get(key))
        : jsonResponse({}, { status: 404, statusText: 'Not Found' });
    }));

    const source = await loadLargeCorpus('https://example.test/retry/okf-explorer.json');
    await expect(source.loadFullIndex()).rejects.toThrow('404 Not Found');
    await expect(source.loadFullIndex()).resolves.toEqual(expect.objectContaining({
      facets: { topic: [{ value: 'population', count: 1 }] }
    }));
    expect(facetAttempts).toBe(2);
  });

  it('uses the portable UTF-8 FNV-1a adjacency bucket algorithm', () => {
    expect(relationshipBucket('dataset/dataset-one')).toBe('83');
    expect(relationshipBucket('publisher/publisher-one')).toBe('7f');
    expect(relationshipBucket('é')).toBe('1e');
  });

  it('rejects non-large-corpus descriptors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ kind: 'okf-bundle' })));
    await expect(loadLargeCorpus('https://example.test/bundle.json')).rejects.toThrow('not an OKF large-corpus descriptor');
  });

  it('caps relationship rows at an explicit maxRows and reports truncation', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 5 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 5 },
          indexes: { overview: 'data/overview.json' },
          chunks: {
            relationships: ['data/relationships-0.json', 'data/relationships-1.json']
          }
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }],
      [
        'https://example.test/ckan/data/relationships-0.json',
        [
          { source: 'a', target: 'b', kind: 'one' },
          { source: 'b', target: 'c', kind: 'two' }
        ]
      ],
      [
        'https://example.test/ckan/data/relationships-1.json',
        [
          { source: 'c', target: 'd', kind: 'three' },
          { source: 'd', target: 'e', kind: 'four' },
          { source: 'e', target: 'f', kind: 'five' }
        ]
      ]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    const result = await source.loadRelationships(3);
    expect(result.truncated).toBe(true);
    expect(result.relationships).toEqual([
      { source: 'a', target: 'b', kind: 'one' },
      { source: 'b', target: 'c', kind: 'two' },
      { source: 'c', target: 'd', kind: 'three' }
    ]);
    // Cached after the first call, regardless of a differing maxRows on a later call.
    expect(await source.loadRelationships(1)).toBe(result);
  });

  it('does not report truncation when every relationship row fits under maxRows', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 2 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 2 },
          indexes: { overview: 'data/overview.json' },
          chunks: {
            relationships: ['data/relationships-0.json']
          }
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }],
      [
        'https://example.test/ckan/data/relationships-0.json',
        [
          { source: 'a', target: 'b', kind: 'one' },
          { source: 'b', target: 'c', kind: 'two' }
        ]
      ]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    const result = await source.loadRelationships(2);
    expect(result.truncated).toBe(false);
    expect(result.relationships).toHaveLength(2);
  });

  it('continues when the optional analysis overview is missing', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            analysis_overview: 'data/analysis/overview.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    expect(source.analysis).toBeUndefined();
    expect(source.overview.title).toBe('Overview');

    const fullIndex = await source.loadFullIndex();
    expect(fullIndex.datasets).toEqual([]);
    expect(fullIndex.resources).toEqual([]);
    expect(fullIndex.facets).toEqual({});
    expect(fullIndex.graph).toEqual({});
    expect(fullIndex.govukContent).toEqual({});
    await expect(source.loadRelationships()).resolves.toEqual({ relationships: [], truncated: false });
  });

  it('loads without analysis when no analysis entrypoint is advertised', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    expect(source.analysis).toBeUndefined();
  });

  it('defaults to the exported relationship row cap', () => {
    expect(MAX_RELATIONSHIP_ROWS).toBe(300_000);
  });

  it('keeps large chunk fetch batches small enough for static hosting', () => {
    expect(CHUNK_FETCH_BATCH_SIZE).toBeLessThanOrEqual(4);
  });

  it.each([
    ['a string entrypoint without entrypoint_integrity', 'release-data-plane.json'],
    ['a path-only object entrypoint', { path: 'release-data-plane.json' }]
  ])('rejects an unbound release index advertised through %s', async (_label, releaseDataPlane) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Unbound release fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            release_data_plane: releaseDataPlane
          },
          counts: {}
        })
      )
    );

    await expect(loadLargeCorpus('https://example.test/bundle/okf-explorer.json')).rejects.toThrow(
      'no descriptor SHA-256 binding'
    );
  });

  it('loads ranged records, relationship chunks and route adjacency without fetching virtual shard URLs', async () => {
    const packed = await makeRangePackFixture([
      {
        path: 'data/records-0.json',
        value: [{ id: 'd1', name: 'record-one', title: 'Record one', publisher: 'publisher-one', resource_count: 0 }]
      },
      {
        path: 'data/relationships-0.json',
        value: [{ source: 'dataset/record-one', target: 'publisher/publisher-one', kind: 'published by' }]
      },
      {
        path: 'data/adjacency/83.json.gz',
        value: {
          'dataset/dataset-one': [
            { source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }
          ]
        },
        compression: 'gzip'
      }
    ]);
    const [recordEntry, relationshipEntry, adjacencyEntry] = packed.document.entries;
    const manifest = {
      title: 'Ranged manifest',
      generated_at: '2026-07-14T00:00:00Z',
      snapshot: 'snapshot-1',
      counts: { datasets: 1, resources: 0, relationships: 1 },
      integrity: { manifest_root_sha256: 'a'.repeat(64) },
      indexes: {
        overview: 'data/overview.json',
        relationship_adjacency: 'data/adjacency/manifest.json'
      },
      chunks: {
        datasets: [recordEntry.path],
        relationships: [relationshipEntry.path]
      },
      shards: {
        datasets: [{ path: recordEntry.path, sha256: recordEntry.sha256 }],
        relationships: [{ path: relationshipEntry.path, sha256: relationshipEntry.sha256 }]
      }
    };
    const overview = { schema: 'okf-overview.v1', title: 'Ranged overview', counts: manifest.counts };
    const adjacency = {
      schema: 'okf-relationship-adjacency.v1',
      snapshot: 'snapshot-1',
      algorithm: 'fnv1a32-prefix-2',
      routes: 1,
      relationships: 1,
      buckets: { '83': adjacencyEntry.path },
      shards: [{ path: adjacencyEntry.path, sha256: adjacencyEntry.sha256 }]
    };
    const manifestText = JSON.stringify(manifest);
    const adjacencyText = JSON.stringify(adjacency);
    const descriptor = {
      schema: 'okf-explorer-large-corpus.v1',
      kind: 'okf-large-corpus',
      title: 'Ranged fixture',
      snapshot: 'snapshot-1',
      data_plane_manifest_root_sha256: 'a'.repeat(64),
      entrypoints: {
        data_manifest: 'data/manifest.json',
        overview_index: 'data/overview.json',
        relationship_adjacency: 'data/adjacency/manifest.json',
        release_data_plane: 'release-data-plane.json'
      },
      entrypoint_integrity: {
        data_manifest: { path: 'data/manifest.json', sha256: await sha256Hex(manifestText) },
        relationship_adjacency: { path: 'data/adjacency/manifest.json', sha256: await sha256Hex(adjacencyText) },
        release_data_plane: { path: 'release-data-plane.json', sha256: packed.indexHash }
      },
      counts: manifest.counts,
      distribution: { data_plane: 'github-pages-same-origin-range-packs' }
    };
    const controls = new Map<string, string>([
      ['https://example.test/bundle/okf-explorer.json', JSON.stringify(descriptor)],
      ['https://example.test/bundle/release-data-plane.json', packed.indexText],
      ['https://example.test/bundle/data/manifest.json', manifestText],
      ['https://example.test/bundle/data/overview.json', JSON.stringify(overview)],
      ['https://example.test/bundle/data/adjacency/manifest.json', adjacencyText]
    ]);
    const fetchedUrls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      fetchedUrls.push(url);
      if (url === packed.packUrl) {
        return rangeResponse(packed, new Headers(init?.headers).get('Range') || '');
      }
      const text = controls.get(url);
      return text === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : new Response(text, { headers: { 'content-type': 'application/json' } });
    }));

    const source = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    expect(source.snapshot).toBe('snapshot-1');
    expect(source.releaseDataPlane?.schema).toBe('govuk-okf-github-release-pack-index.v1');
    expect((await source.loadFullIndex()).datasets[0].title).toBe('Record one');
    await expect(source.loadRelationships()).resolves.toEqual({
      relationships: [{ source: 'dataset/record-one', target: 'publisher/publisher-one', kind: 'published by' }],
      truncated: false
    });
    await expect(source.loadRelationshipsForRoute('dataset/dataset-one')).resolves.toEqual([
      { source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }
    ]);
    expect(fetchedUrls).not.toContain('https://example.test/bundle/data/records-0.json');
    expect(fetchedUrls).not.toContain('https://example.test/bundle/data/relationships-0.json');
    expect(fetchedUrls).not.toContain('https://example.test/bundle/data/adjacency/83.json.gz');
    expect(fetchedUrls.filter((url) => url === packed.packUrl)).toHaveLength(3);
  });

  it('rejects conflicting explicit snapshot identifiers before lazy shard loading', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/bundle/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Mixed snapshot fixture',
          snapshot: 'snapshot-descriptor',
          entrypoints: { data_manifest: 'data/manifest.json' },
          counts: {}
        }
      ],
      [
        'https://example.test/bundle/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-14T00:00:00Z',
          snapshot: 'snapshot-manifest',
          counts: {},
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      ['https://example.test/bundle/data/overview.json', { title: 'Overview', counts: {} }]
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const value = payloads.get(String(input));
        return value === undefined
          ? new Response('', { status: 404, statusText: 'Not Found' })
          : jsonResponse(value);
      })
    );

    await expect(loadLargeCorpus('https://example.test/bundle/okf-explorer.json')).rejects.toThrow(
      'different snapshot identifiers'
    );
  });

  it('accepts a legacy snapshotless adjacency manifest but rejects an advertised mismatch', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/bundle/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Adjacency snapshot fixture',
          snapshot: 'snapshot-1',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json'
          },
          counts: {}
        }
      ],
      [
        'https://example.test/bundle/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-14T00:00:00Z',
          snapshot: 'snapshot-1',
          counts: {},
          indexes: {
            overview: 'data/overview.json',
            relationship_adjacency: 'data/adjacency/manifest.json'
          },
          chunks: {}
        }
      ],
      [
        'https://example.test/bundle/data/overview.json',
        { title: 'Overview', snapshot: 'snapshot-1', counts: {} }
      ],
      [
        'https://example.test/bundle/data/adjacency/manifest.json',
        {
          schema: 'okf-relationship-adjacency.v1',
          algorithm: 'fnv1a32-prefix-2',
          routes: 0,
          relationships: 0,
          buckets: {}
        }
      ]
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const value = payloads.get(String(input));
        return value === undefined
          ? new Response('', { status: 404, statusText: 'Not Found' })
          : jsonResponse(value);
      })
    );

    const source = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    await expect(source.loadRelationshipsForRoute('dataset/example')).resolves.toEqual([]);

    payloads.set('https://example.test/bundle/data/adjacency/manifest.json', {
      schema: 'okf-relationship-adjacency.v1',
      snapshot: 'snapshot-2',
      algorithm: 'fnv1a32-prefix-2',
      routes: 0,
      relationships: 0,
      buckets: {}
    });
    const mixedSource = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    await expect(mixedSource.loadRelationshipsForRoute('dataset/example')).rejects.toThrow(
      'adjacency manifest snapshot differs'
    );
  });
});
