import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LargeSearchManifest } from '$lib/types';

type WorkerHarness = {
  onmessage?: (event: MessageEvent) => Promise<void>;
  postMessage: ReturnType<typeof vi.fn>;
};

const baseManifest = (): LargeSearchManifest => ({
  schema: 'okf-static-search.v2',
  token_min_length: 2,
  prefix_min_length: 3,
  lexicon_shard_length: 2,
  result_limit: 1,
  result_doc_chunk_size: 1000,
  weights: { title: 16 },
  field_masks: { title: 1, description: 8 },
  counts: { documents: 4, tokens: 1, max_postings_per_token: 100 },
  entrypoints: {
    lexicon: { fl: 'lexicon.json' },
    prefixes: {},
    postings: ['postings.json'],
    result_docs: ['docs.json'],
    facets: 'facets.json',
    doc_map: 'doc-map.json',
    filter_postings: { type: 'type.json', country: 'country.json' },
    sort_values: 'sort-values.json'
  }
});

async function harness(manifest = baseManifest()) {
  const workerSelf: WorkerHarness = { postMessage: vi.fn() };
  vi.stubGlobal('self', workerSelf);
  const payloads = new Map<string, unknown>([
    ['https://example.test/manifest.json', manifest],
    ['https://example.test/lexicon.json', [{ token: 'flood', df: 4, postings: 'postings.json' }]],
    ['https://example.test/postings.json', { tokens: { flood: [[0, 20, 1], [1, 16, 1], [2, 12, 8], [3, 8, 8]] } }],
    ['https://example.test/docs.json', [
      { ordinal: 0, name: 'flood-api', title: 'Flood API', publisher: 'ea', publisher_title: 'EA', resource_count: 1, formats: [], tags: [], open: 'dataset/flood-api' },
      { ordinal: 1, name: 'welsh-flood-api', title: 'Welsh Flood API', publisher: 'wales', publisher_title: 'Wales', resource_count: 1, formats: [], tags: [], open: 'dataset/welsh-flood-api' },
      { ordinal: 2, name: 'flood-data', title: 'Flood Dataset', publisher: 'ea', publisher_title: 'EA', resource_count: 1, formats: [], tags: [], open: 'dataset/flood-data' },
      { ordinal: 3, name: 'flood-guide', title: 'Flood Guide', publisher: 'ea', publisher_title: 'EA', resource_count: 0, formats: [], tags: [], open: 'dataset/flood-guide' }
    ]],
    ['https://example.test/type.json', { schema: 'okf-static-filter-postings.v1', key: 'type', values: { API: [0, 1], Dataset: [2], Guide: [3] } }],
    ['https://example.test/country.json', { schema: 'okf-static-filter-postings.v1', key: 'country', values: { England: [0, 2, 3], Wales: [1] } }],
    ['https://example.test/facets.json', {
      publisher: {
        'home-office': [0, 2],
        'department-for-science-innovation-and-technology': [1, 2]
      }
    }],
    ['https://example.test/sort-values.json', [
      ['2025-01-01', 'Flood API', 0.9],
      ['2026-01-01', 'Welsh Flood API', 0.8],
      ['2024-01-01', 'Flood Dataset', 0.7],
      ['2023-01-01', 'Flood Guide', 0.6]
    ]]
  ]);
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (!payloads.has(url)) return new Response('', { status: 404 });
    return new Response(JSON.stringify(payloads.get(url)), { status: 200 });
  }));
  vi.resetModules();
  await import('./largeSearch.worker');
  await workerSelf.onmessage?.({ data: { type: 'init', id: 1, baseUrl: 'https://example.test/', manifestUrl: 'https://example.test/manifest.json' } } as MessageEvent);
  workerSelf.postMessage.mockClear();
  return workerSelf;
}

describe('large static search worker', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('applies OR-within and AND-across filters before the result limit and returns dynamic facets', async () => {
    const worker = await harness();
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: {
        query: 'flood',
        filters: { type: ['API', 'Dataset'], country: ['England'] },
        sort: 'relevance',
        ranking: 'idf',
        facet_keys: ['type']
      }
    } } as MessageEvent);

    const message = worker.postMessage.mock.calls[0][0];
    expect(message.type).toBe('results');
    expect(message.response.total).toBe(2);
    expect(message.response.results).toHaveLength(1);
    expect(message.response.results[0].name).toBe('flood-api');
    expect(message.response.results[0].match.matched_fields).toContain('title');
    expect(message.response.facets.type).toEqual([
      { value: 'API', count: 1 },
      { value: 'Dataset', count: 1 },
      { value: 'Guide', count: 1 }
    ]);
    expect(message.response.filters_applied).toBe(true);
    expect(message.response.truncated).toBe(true);
  });

  it('reports that v1 manifests need the full-index filter fallback', async () => {
    const manifest = baseManifest();
    manifest.schema = 'okf-static-search.v1';
    delete manifest.entrypoints.filter_postings;
    delete manifest.entrypoints.sort_values;
    const worker = await harness(manifest);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'flood', filters: { type: ['API'] }, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.filters_applied).toBe(false);
    expect(response.total).toBe(4);
    expect(response.results[0].name).toBe('flood-api');
  });

  it('recognises a multi-word organisation from legacy delta-encoded publisher facets', async () => {
    const manifest = baseManifest();
    manifest.schema = 'gov-ckan-static-search.v1';
    delete manifest.entrypoints.filter_postings;
    delete manifest.entrypoints.sort_values;
    const worker = await harness(manifest);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'Home Office', filters: {}, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.interpreted_entity).toMatchObject({
      label: 'Home Office',
      kind: 'organisation',
      filter_value: 'home-office'
    });
    expect(response.total).toBe(2);
    expect(response.results[0].match.matched_fields).toContain('publisher');
    expect(response.results[0].match.score_components.entity).toBeGreaterThan(0);
  });

  it('resolves an unambiguous organisation initialism without a lexical token', async () => {
    const manifest = baseManifest();
    manifest.schema = 'gov-ckan-static-search.v1';
    delete manifest.entrypoints.filter_postings;
    delete manifest.entrypoints.sort_values;
    const worker = await harness(manifest);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'DSIT', filters: {}, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.interpreted_entity).toMatchObject({
      label: 'Department for Science Innovation and Technology',
      matched_alias: 'DSIT'
    });
    expect(response.total).toBe(2);

    worker.postMessage.mockClear();
    await worker.onmessage?.({ data: { type: 'suggest', id: 3, prefix: 'DSIT' } } as MessageEvent);
    expect(worker.postMessage.mock.calls[0][0].suggestions[0]).toMatchObject({
      kind: 'entity',
      label: 'Department for Science Innovation and Technology'
    });
  });
});
