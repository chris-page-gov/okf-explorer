import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { baseUrlFor, fetchJson, resolveUrl } from './fetch';
import { loadLargeCorpus } from './largeCorpus';
import { loadHistory, loadRegistry, rememberHistory } from './registry';
import { normalizeSmallBundle } from './smallBundle';
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
});

describe('small bundle normalization', () => {
  it('normalizes top-level bundle nodes and relationships', () => {
    const corpus = normalizeSmallBundle({
      meta: { title: 'Bundle title', description: 'Bundle description' },
      nodes: {
        a: { id: 'raw-a', title: 'Alpha' },
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
            analysis_overview: 'data/analysis/overview.json'
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
            govuk_content: 'data/govuk.json'
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
      ['https://example.test/ckan/data/facets.json', { publisher: [{ value: 'publisher-one', count: 1 }] }],
      ['https://example.test/ckan/data/graph.json', { nodes: [], edges: [] }],
      ['https://example.test/ckan/data/govuk.json', { paths: [] }],
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
    expect(fetchMock).not.toHaveBeenCalledWith('https://example.test/ckan/data/datasets-0.json', expect.anything());

    const fullIndex = await source.loadFullIndex();
    expect(fullIndex.datasetByName.get('dataset-one')?.title).toBe('Dataset One');
    expect(fullIndex.resourcesByDataset.get('dataset-one')?.map((resource) => resource.id)).toEqual(['r0', 'r00', 'r1', 'r3', 'r2']);
    expect(await source.loadFullIndex()).toBe(fullIndex);

    const relationships = await source.loadRelationships();
    expect(relationships).toEqual([{ source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }]);
    expect(await source.loadRelationships()).toBe(relationships);
  });

  it('rejects non-large-corpus descriptors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ kind: 'okf-bundle' })));
    await expect(loadLargeCorpus('https://example.test/bundle.json')).rejects.toThrow('not an OKF large-corpus descriptor');
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
    await expect(source.loadRelationships()).resolves.toEqual([]);
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
});
