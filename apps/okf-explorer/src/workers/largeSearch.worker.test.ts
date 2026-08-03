import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LargeSearchManifest } from '$lib/types';
import { canonicalJson, sha256Hex } from '$lib/sources/releaseDataPlane';
import { TYPO_TOLERANCE_CONTRACT } from '$lib/search/typoTolerance';
import { makeRangePackFixture, rangeResponse } from '../test/rangePackFixture';

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

const typoManifest = (): LargeSearchManifest => {
  const manifest = baseManifest();
  manifest.typo_tolerance = { ...TYPO_TOLERANCE_CONTRACT };
  manifest.entrypoints.typo_deletions = { _: 'typos.json' };
  manifest.counts.typo_deletion_shards = 1;
  return manifest;
};

async function harness(manifest = baseManifest(), payloadOverrides: Array<[string, unknown]> = []) {
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
  for (const [url, payload] of payloadOverrides) payloads.set(url, payload);
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (!payloads.has(url)) return new Response('', { status: 404 });
    return new Response(JSON.stringify(payloads.get(url)), { status: 200 });
  }));
  vi.resetModules();
  await import('./largeSearch.worker');
  await workerSelf.onmessage?.({ data: { type: 'init', id: 1, baseUrl: 'https://example.test/', manifestReference: 'https://example.test/manifest.json' } } as MessageEvent);
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
    expect(message.response.total_relation).toBe('eq');
    expect(message.response.truncations).toEqual([{ reason: 'result-limit' }]);
    expect(message.response.ignored_filters).toEqual({});
  });

  it('loads exact facet distributions without hydrating result documents', async () => {
    const worker = await harness();
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: {
        query: '',
        filters: {},
        sort: 'newest',
        facet_keys: ['type'],
        include_results: false
      }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(4);
    expect(response.results).toEqual([]);
    expect(response.facets.type).toEqual([
      { value: 'API', count: 2 },
      { value: 'Dataset', count: 1 },
      { value: 'Guide', count: 1 }
    ]);
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).not.toContain('https://example.test/docs.json');
  });

  it('ignores invalid indexed values while retaining valid selections', async () => {
    const worker = await harness();
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: {
        query: 'flood',
        filters: { type: ['API', 'retired-value'] },
        sort: 'relevance',
        facet_keys: ['type']
      }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(2);
    expect(response.filters_applied).toBe(true);
    expect(response.ignored_filters).toEqual({ type: ['retired-value'] });
  });

  it('suppresses dynamic facets when an active filter needs full-index fallback', async () => {
    const worker = await harness();
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: {
        query: 'flood',
        filters: { type: ['API'], unindexed: ['current'] },
        sort: 'relevance',
        facet_keys: ['type']
      }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(2);
    expect(response.filters_applied).toBe(false);
    expect(response.facets).toEqual({});
    expect(response.ignored_filters).toEqual({});
  });

  it('applies filters and returns empty dynamic facets for a lexical no-match', async () => {
    const worker = await harness();
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: {
        query: 'zzzz-no-such-term',
        filters: { type: ['API'] },
        sort: 'relevance',
        facet_keys: ['type']
      }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(0);
    expect(response.results).toEqual([]);
    expect(response.filters_applied).toBe(true);
    expect(response.facets).toEqual({ type: [] });
  });

  it('requires every meaningful query token instead of falling back to partial OR matches', async () => {
    const worker = await harness();
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'world flood', filters: {}, sort: 'relevance' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(0);
    expect(response.results).toEqual([]);
    expect(response.unresolved_tokens).toEqual(['world']);
  });

  it('recovers a manifest-declared one-edit misspelling and explains each contributing match', async () => {
    const manifest = typoManifest();
    manifest.counts.tokens = 2;
    manifest.entrypoints.lexicon.co = 'coventry-lexicon.json';
    manifest.entrypoints.prefixes.co = 'coventry-prefixes.json';
    manifest.entrypoints.postings.push('coventry-postings.json');
    const worker = await harness(manifest, [
      ['https://example.test/typos.json', {
        schema: 'okf-search-typo-deletions.v1',
        keys: { covetry: [{ token: 'coventry', df: 1 }] }
      }],
      ['https://example.test/coventry-lexicon.json', [
        { token: 'coventry', df: 1, postings: 'coventry-postings.json' }
      ]],
      // The legacy short-prefix fallback can already surface Coventry for
      // "covnetry". The declared typo index takes precedence so the match is
      // verified and explainable instead of looking like an opaque prefix hit.
      ['https://example.test/coventry-prefixes.json', {
        cov: [{ token: 'coventry', label: 'Coventry', query: 'coventry', df: 1 }]
      }],
      ['https://example.test/coventry-postings.json', { tokens: { coventry: [[0, 30, 1]] } }],
      ['https://example.test/docs.json', [
        { ordinal: 0, name: 'coventry-cathedral', title: 'Coventry Cathedral', publisher: 'he', publisher_title: 'Historic England', resource_count: 1, formats: [], tags: [], open: 'asset/coventry-cathedral' }
      ]]
    ]);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'Covnetry', filters: {}, sort: 'relevance', ranking: 'idf-exact' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    const correction = {
      query_token: 'covnetry',
      matched_token: 'coventry',
      edit_distance: 1,
      method: 'symmetric-delete-damerau-levenshtein-v1',
      candidate_rank: 1
    };
    expect(response.total).toBe(1);
    expect(response.results[0].name).toBe('coventry-cathedral');
    expect(response.query_corrections).toEqual([correction]);
    expect(response.results[0].match).toMatchObject({
      query_tokens: ['covnetry'],
      matched_fields: ['title'],
      corrected_tokens: [correction]
    });
    // Exact-document boosting remains tied to the actual query, not the
    // rewritten token, so correction cannot impersonate an exact phrase hit.
    expect(response.results[0].match.score_components.exact).toBe(0);
  });

  it('accepts a typo only when it co-occurs with resolved query terms', async () => {
    const manifest = typoManifest();
    manifest.counts = { documents: 3, tokens: 4, max_postings_per_token: 100, typo_deletion_shards: 1 };
    manifest.entrypoints.lexicon = {
      ba: 'name-lexicon.json', ca: 'name-lexicon.json', co: 'name-lexicon.json', sp: 'name-lexicon.json'
    };
    manifest.entrypoints.postings = ['name-postings.json'];
    manifest.entrypoints.result_docs = ['name-docs.json'];
    const worker = await harness(manifest, [
      ['https://example.test/name-lexicon.json', [
        { token: 'basin', df: 1, postings: 'name-postings.json' },
        { token: 'cathedral', df: 1, postings: 'name-postings.json' },
        { token: 'coventry', df: 1, postings: 'name-postings.json' },
        { token: 'spencer', df: 1, postings: 'name-postings.json' }
      ]],
      ['https://example.test/name-postings.json', { tokens: {
        basin: [[1, 16, 1]],
        cathedral: [[0, 16, 1]],
        coventry: [[0, 16, 1]],
        spencer: [[2, 16, 1]]
      } }],
      ['https://example.test/typos.json', {
        schema: 'okf-search-typo-deletions.v1',
        keys: {
          basi: [{ token: 'basin', df: 1 }],
          spence: [{ token: 'spencer', df: 1 }],
          coventry: [{ token: 'coventry', df: 1 }]
        }
      }],
      ['https://example.test/name-docs.json', [
        { ordinal: 0, name: 'coventry-cathedral', title: 'Coventry Cathedral', publisher: 'he', publisher_title: 'Historic England', resource_count: 1, formats: [], tags: [], open: 'asset/coventry-cathedral' },
        { ordinal: 1, name: 'canal-basin', title: 'Canal Basin', publisher: 'he', publisher_title: 'Historic England', resource_count: 1, formats: [], tags: [], open: 'asset/canal-basin' },
        { ordinal: 2, name: 'spencer-hall', title: 'Spencer Hall', publisher: 'he', publisher_title: 'Historic England', resource_count: 1, formats: [], tags: [], open: 'asset/spencer-hall' }
      ]]
    ]);

    await worker.onmessage?.({ data: {
      type: 'query', id: 2, request: { query: 'Basil Spence Cathedral', filters: {}, sort: 'relevance' }
    } } as MessageEvent);
    const rejected = worker.postMessage.mock.calls[0][0].response;
    expect(rejected.total).toBe(0);
    expect(rejected.query_corrections).toBeUndefined();
    expect(rejected.unresolved_tokens).toEqual(['basil', 'spence']);

    worker.postMessage.mockClear();
    await worker.onmessage?.({ data: {
      type: 'query', id: 3, request: { query: 'Coventtry Cathedral', filters: {}, sort: 'relevance' }
    } } as MessageEvent);
    const accepted = worker.postMessage.mock.calls[0][0].response;
    expect(accepted.total).toBe(1);
    expect(accepted.results[0].name).toBe('coventry-cathedral');
    expect(accepted.query_corrections).toEqual([
      expect.objectContaining({ query_token: 'coventtry', matched_token: 'coventry' })
    ]);
    expect(accepted.unresolved_tokens).toBeUndefined();
  });

  it('searches declared record aliases without replacing the canonical result title', async () => {
    const manifest = baseManifest();
    manifest.weights.search_aliases = 12;
    manifest.field_masks.search_aliases = 2048;
    manifest.entrypoints.lexicon.gr = 'greyfriars-lexicon.json';
    manifest.entrypoints.postings.push('greyfriars-postings.json');
    const worker = await harness(manifest, [
      ['https://example.test/greyfriars-lexicon.json', [
        { token: 'greyfriars', df: 1, postings: 'greyfriars-postings.json' }
      ]],
      ['https://example.test/greyfriars-postings.json', { tokens: { greyfriars: [[0, 12, 2048]] } }],
      ['https://example.test/docs.json', [
        {
          ordinal: 0,
          name: 'coventry-cathedral',
          title: 'Coventry Cathedral',
          search_aliases: ['Greyfriars'],
          publisher: 'he',
          publisher_title: 'Historic England',
          resource_count: 1,
          formats: [],
          tags: [],
          open: 'asset/coventry-cathedral'
        }
      ]]
    ]);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'Greyfriars', filters: {}, sort: 'relevance', ranking: 'idf-exact' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(1);
    expect(response.results[0]).toMatchObject({
      title: 'Coventry Cathedral',
      search_aliases: ['Greyfriars'],
      match: { matched_fields: ['search_aliases'] }
    });
    expect(response.results[0].match.score_components.exact).toBe(0);
  });

  it('keeps exact and prefix lookup ahead of typo correction', async () => {
    const manifest = typoManifest();
    manifest.entrypoints.prefixes.fl = 'prefixes.json';
    const worker = await harness(manifest, [
      ['https://example.test/prefixes.json', {
        floo: [{ token: 'flood', label: 'flood', query: 'flood', df: 4 }]
      }],
      ['https://example.test/typos.json', {
        schema: 'okf-search-typo-deletions.v1',
        keys: { floo: [{ token: 'floor', df: 1 }] }
      }]
    ]);

    await worker.onmessage?.({ data: {
      type: 'query', id: 2, request: { query: 'flood', filters: {}, sort: 'relevance' }
    } } as MessageEvent);
    expect(worker.postMessage.mock.calls[0][0].response.query_corrections).toBeUndefined();
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).not.toContain('https://example.test/typos.json');

    worker.postMessage.mockClear();
    await worker.onmessage?.({ data: {
      type: 'query', id: 3, request: { query: 'floo', filters: {}, sort: 'relevance' }
    } } as MessageEvent);
    expect(worker.postMessage.mock.calls[0][0].response.total).toBe(4);
    expect(worker.postMessage.mock.calls[0][0].response.query_corrections).toBeUndefined();
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).not.toContain('https://example.test/typos.json');
  });

  it('keeps a unique entity alias ahead of typo correction', async () => {
    const worker = await harness(typoManifest());
    await worker.onmessage?.({ data: {
      type: 'query', id: 2, request: { query: 'DSIT', filters: {}, sort: 'relevance' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.interpreted_entity).toMatchObject({
      label: 'Department for Science Innovation and Technology',
      matched_alias: 'DSIT'
    });
    expect(response.query_corrections).toBeUndefined();
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).not.toContain('https://example.test/typos.json');
  });

  it('bounds missing-token correction and reports when the query budget is reached', async () => {
    const worker = await harness(typoManifest(), [[
      'https://example.test/typos.json',
      { schema: 'okf-search-typo-deletions.v1', keys: {} }
    ]]);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'aaaa bbbb cccc dddd eeee', filters: {}, sort: 'relevance' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(0);
    expect(response.correction_truncated).toBe(true);
    expect(vi.mocked(fetch).mock.calls.filter(([input]) => String(input) === 'https://example.test/typos.json')).toHaveLength(1);
  });

  it('rejects a typo shard that advertises unbounded candidate expansion', async () => {
    const candidates = Array.from(
      { length: TYPO_TOLERANCE_CONTRACT.max_candidates_per_delete_key + 1 },
      (_value, index) => ({ token: `candidate${index}`, df: 1 })
    );
    const worker = await harness(typoManifest(), [[
      'https://example.test/typos.json',
      { schema: 'okf-search-typo-deletions.v1', keys: { zzzz: candidates } }
    ]]);
    await worker.onmessage?.({ data: {
      type: 'query', id: 2, request: { query: 'zzzz', filters: {}, sort: 'relevance' }
    } } as MessageEvent);

    expect(worker.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'error',
      error: expect.stringContaining('candidate expansion')
    });
  });

  it('does not interpret a non-empty stop-word-only query as match-all browsing', async () => {
    const worker = await harness();
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'the and of', filters: {}, sort: 'relevance' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(0);
    expect(response.results).toEqual([]);
    expect(response.total_relation).toBe('eq');
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

  it('rejects a query that exceeds the bounded token contract before shard fan-out', async () => {
    const worker = await harness();
    const query = Array.from({ length: 25 }, (_value, index) => `term${index}`).join(' ');
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query, filters: {}, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    expect(worker.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'error',
      error: expect.stringContaining('token limit')
    });
  });

  it('returns a ranked subset when scattered results reach the result-chunk budget', async () => {
    const manifest = baseManifest();
    const rankedOrdinals = [
      ...Array.from({ length: 16 }, (_value, index) => index * 2),
      32,
      1
    ];
    manifest.result_limit = rankedOrdinals.length;
    manifest.result_doc_chunk_size = 2;
    manifest.counts.documents = 34;
    manifest.counts.max_postings_per_token = 10;
    manifest.entrypoints.result_docs = Array.from({ length: 17 }, (_value, ordinal) => `docs-${ordinal}.json`);
    const payloads: Array<[string, unknown]> = [
      ['https://example.test/lexicon.json', [{ token: 'flood', df: rankedOrdinals.length, postings: 'postings.json' }]],
      ['https://example.test/postings.json', {
        tokens: {
          flood: rankedOrdinals.map((ordinal, index) => [ordinal, rankedOrdinals.length - index, 1])
        }
      }]
    ];
    for (let chunk = 0; chunk < 17; chunk += 1) {
      payloads.push([`https://example.test/docs-${chunk}.json`, [0, 1].map((offset) => {
        const ordinal = chunk * 2 + offset;
        return {
          ordinal,
          name: `flood-${ordinal}`,
          title: `Flood ${ordinal}`,
          publisher: 'ea',
          publisher_title: 'EA',
          resource_count: 1,
          formats: [],
          tags: [],
          open: `dataset/flood-${ordinal}`
        };
      })]);
    }
    const worker = await harness(manifest, payloads);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'flood', filters: {}, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    const message = worker.postMessage.mock.calls[0][0];
    expect(message.type).toBe('results');
    expect(message.response.total).toBe(rankedOrdinals.length);
    expect(message.response.results.map((result: { ordinal: number }) => result.ordinal)).toEqual([
      ...rankedOrdinals.slice(0, 16),
      1
    ]);
    expect(message.response.truncated).toBe(true);
    expect(message.response.truncation).toEqual({
      reason: 'result-chunk-budget',
      loaded_result_chunks: 16,
      result_chunk_budget: 16
    });
    expect(message.response.truncations).toEqual([
      {
        reason: 'result-chunk-budget',
        loaded_result_chunks: 16,
        result_chunk_budget: 16
      },
      { reason: 'capped-postings' }
    ]);
    expect(message.response.total_relation).toBe('gte');
  });

  it('marks a mixed capped and complete multi-token candidate count as approximate', async () => {
    const manifest = baseManifest();
    manifest.result_limit = 4;
    manifest.counts.max_postings_per_token = 2;
    manifest.entrypoints.lexicon = { fl: 'lexicon.json', ri: 'risk-lexicon.json' };
    manifest.entrypoints.postings = ['postings.json', 'risk-postings.json'];
    const worker = await harness(manifest, [
      ['https://example.test/lexicon.json', [{ token: 'flood', df: 4, postings: 'postings.json' }]],
      ['https://example.test/risk-lexicon.json', [{ token: 'risk', df: 2, postings: 'risk-postings.json' }]],
      ['https://example.test/postings.json', { tokens: { flood: [[0, 20, 1]] } }],
      ['https://example.test/risk-postings.json', { tokens: { risk: [[0, 12, 1], [1, 10, 1]] } }]
    ]);

    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'flood risk', filters: {}, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.total).toBe(2);
    expect(response.total_relation).toBe('unknown');
    expect(response.truncations).toContainEqual({ reason: 'capped-postings' });
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

  it('resolves an unambiguous two-letter organisation initialism', async () => {
    const manifest = baseManifest();
    manifest.schema = 'gov-ckan-static-search.v1';
    delete manifest.entrypoints.filter_postings;
    delete manifest.entrypoints.sort_values;
    const worker = await harness(manifest);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'HO', filters: {}, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.interpreted_entity).toMatchObject({
      label: 'Home Office',
      matched_alias: 'HO'
    });
    expect(response.total).toBe(2);
  });

  it('does not recognise a two-letter alias shared by multiple organisations', async () => {
    const manifest = baseManifest();
    manifest.schema = 'gov-ckan-static-search.v1';
    delete manifest.entrypoints.filter_postings;
    delete manifest.entrypoints.sort_values;
    const worker = await harness(manifest, [[
      'https://example.test/facets.json',
      { publisher: { 'home-office': [0, 2], 'health-office': [1] } }
    ]]);
    await worker.onmessage?.({ data: {
      type: 'query',
      id: 2,
      request: { query: 'HO', filters: {}, sort: 'relevance', ranking: 'weighted' }
    } } as MessageEvent);

    const response = worker.postMessage.mock.calls[0][0].response;
    expect(response.interpreted_entity).toBeUndefined();
    expect(response.total).toBe(0);
  });

  it('searches through integrity-checked range-packed lexicon, postings and record shards', async () => {
    const manifest = baseManifest();
    const fixture = await makeRangePackFixture([
      { path: 'lexicon.json', value: [{ token: 'flood', df: 1, postings: 'postings.json' }] },
      { path: 'postings.json', value: { tokens: { flood: [[0, 20, 1]] } } },
      {
        path: 'docs.json',
        value: [
          {
            ordinal: 0,
            name: 'flood-api',
            title: 'Flood API',
            publisher: 'ea',
            publisher_title: 'EA',
            resource_count: 1,
            formats: [],
            tags: [],
            open: 'dataset/flood-api'
          }
        ]
      }
    ]);
    const [lexiconEntry, postingsEntry, resultEntry] = fixture.document.entries;
    const shards = {
      lexicon: [{ path: lexiconEntry.path, sha256: lexiconEntry.sha256, snapshot: 'snapshot-1' }],
      postings: [{ path: postingsEntry.path, sha256: postingsEntry.sha256, snapshot: 'snapshot-1' }],
      result_docs: [{ path: resultEntry.path, sha256: resultEntry.sha256, snapshot: 'snapshot-1' }]
    };
    manifest.snapshot = 'snapshot-1';
    manifest.shard_metadata = 'search-shards.json';
    manifest.shard_manifest_sha256 = await sha256Hex(`${canonicalJson(shards)}\n`);
    const workerSelf: WorkerHarness = { postMessage: vi.fn() };
    vi.stubGlobal('self', workerSelf);
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://example.test/manifest.json') {
        return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } });
      }
      if (url === 'https://example.test/search-shards.json') {
        return new Response(JSON.stringify({ snapshot: 'snapshot-1', shards }), {
          headers: { 'content-type': 'application/json' }
        });
      }
      if (url === 'https://example.test/data-packs/fixture.pack.gz') {
        return rangeResponse(fixture, new Headers(init?.headers).get('Range') || '');
      }
      return new Response('', { status: 404, statusText: 'Not Found' });
    }));
    vi.resetModules();
    await import('./largeSearch.worker');
    await workerSelf.onmessage?.({
      data: {
        type: 'init',
        id: 1,
        baseUrl: 'https://example.test/',
        manifestReference: 'manifest.json',
        releaseDataPlane: fixture.document,
        snapshot: 'snapshot-1'
      }
    } as MessageEvent);
    expect(workerSelf.postMessage.mock.calls[0][0].type).toBe('ready');
    workerSelf.postMessage.mockClear();

    await workerSelf.onmessage?.({
      data: {
        type: 'query',
        id: 2,
        request: { query: 'flood', filters: {}, sort: 'relevance', ranking: 'weighted' }
      }
    } as MessageEvent);
    const response = workerSelf.postMessage.mock.calls[0][0];
    expect(response.type).toBe('results');
    expect(response.response.results[0]).toMatchObject({ name: 'flood-api', title: 'Flood API' });
  });

  it('rejects a search manifest from a different loaded snapshot', async () => {
    const manifest = baseManifest();
    manifest.snapshot = 'snapshot-old';
    const workerSelf: WorkerHarness = { postMessage: vi.fn() };
    vi.stubGlobal('self', workerSelf);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }))
    );
    vi.resetModules();
    await import('./largeSearch.worker');
    await workerSelf.onmessage?.({
      data: {
        type: 'init',
        id: 1,
        baseUrl: 'https://example.test/',
        manifestReference: 'manifest.json',
        snapshot: 'snapshot-new'
      }
    } as MessageEvent);

    expect(workerSelf.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'error',
      error: expect.stringContaining('snapshot differs')
    });
  });

  it('rejects search shard metadata whose canonical manifest hash differs', async () => {
    const manifest = baseManifest();
    manifest.snapshot = 'snapshot-1';
    manifest.shard_metadata = 'search-shards.json';
    manifest.shard_manifest_sha256 = '0'.repeat(64);
    const workerSelf: WorkerHarness = { postMessage: vi.fn() };
    vi.stubGlobal('self', workerSelf);
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const payload = url.endsWith('/manifest.json')
        ? manifest
        : { snapshot: 'snapshot-1', shards: {} };
      return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
    }));
    vi.resetModules();
    await import('./largeSearch.worker');
    await workerSelf.onmessage?.({
      data: {
        type: 'init',
        id: 1,
        baseUrl: 'https://example.test/',
        manifestReference: 'manifest.json',
        snapshot: 'snapshot-1'
      }
    } as MessageEvent);

    expect(workerSelf.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'error',
      error: expect.stringContaining('metadata integrity check failed')
    });
  });

  it('rejects an auxiliary search shard omitted from the release-pack index', async () => {
    const fixture = await makeRangePackFixture([{ path: 'unused.json', value: {} }]);
    const manifest = baseManifest();
    const shards = {
      filter_postings: [{ path: 'type.json', sha256: 'a'.repeat(64), snapshot: 'snapshot-1' }]
    };
    manifest.snapshot = 'snapshot-1';
    manifest.shard_metadata = 'search-shards.json';
    manifest.shard_manifest_sha256 = await sha256Hex(`${canonicalJson(shards)}\n`);
    const workerSelf: WorkerHarness = { postMessage: vi.fn() };
    vi.stubGlobal('self', workerSelf);
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/manifest.json')) return new Response(JSON.stringify(manifest));
      if (url.endsWith('/search-shards.json')) {
        return new Response(JSON.stringify({ snapshot: 'snapshot-1', shards }));
      }
      return new Response('', { status: 404, statusText: 'Not Found' });
    }));
    vi.resetModules();
    await import('./largeSearch.worker');
    await workerSelf.onmessage?.({
      data: {
        type: 'init',
        id: 1,
        baseUrl: 'https://example.test/',
        manifestReference: 'manifest.json',
        releaseDataPlane: fixture.document,
        snapshot: 'snapshot-1'
      }
    } as MessageEvent);

    expect(workerSelf.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'error',
      error: expect.stringContaining('no entry for search shard type.json')
    });
  });

  it('does not let a cached path mask a conflicting advertised hash', async () => {
    const postingsText = JSON.stringify({ tokens: { flood: [[0, 20, 1]], flow: [[0, 16, 1]] } });
    const correctHash = await sha256Hex(postingsText);
    const manifest = baseManifest();
    const lexicon = [
      { token: 'flood', df: 1, postings: { path: 'postings.json', sha256: correctHash } },
      { token: 'flow', df: 1, postings: { path: 'postings.json', sha256: '0'.repeat(64) } }
    ];
    const workerSelf: WorkerHarness = { postMessage: vi.fn() };
    const postingsFetches: string[] = [];
    vi.stubGlobal('self', workerSelf);
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/manifest.json')) return new Response(JSON.stringify(manifest));
      if (url.endsWith('/lexicon.json')) return new Response(JSON.stringify(lexicon));
      if (url.endsWith('/facets.json')) return new Response('{}');
      if (url.endsWith('/postings.json')) {
        postingsFetches.push(url);
        return new Response(postingsText);
      }
      return new Response('', { status: 404, statusText: 'Not Found' });
    }));
    vi.resetModules();
    await import('./largeSearch.worker');
    await workerSelf.onmessage?.({
      data: {
        type: 'init',
        id: 1,
        baseUrl: 'https://example.test/',
        manifestReference: 'manifest.json'
      }
    } as MessageEvent);
    expect(workerSelf.postMessage.mock.calls[0][0].type).toBe('ready');
    workerSelf.postMessage.mockClear();

    await workerSelf.onmessage?.({
      data: {
        type: 'query',
        id: 2,
        request: { query: 'flood flow', filters: {}, sort: 'relevance', ranking: 'weighted' }
      }
    } as MessageEvent);
    expect(workerSelf.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'error',
      error: expect.stringContaining('integrity check failed')
    });
    expect(postingsFetches).toHaveLength(2);
  });
});
