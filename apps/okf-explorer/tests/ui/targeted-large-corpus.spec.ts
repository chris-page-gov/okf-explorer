import { expect, test, type BrowserContext, type Route } from '@playwright/test';

const ORIGIN = 'https://targeted-legislation.fixture.test';
const BUNDLE_URL = `${ORIGIN}/okf-explorer.json`;
const SNAPSHOT = 'targeted-legislation-fixture-v1';
const RECORD_ROUTE = 'dataset/ukpga-1998-42';

function relationshipBucket(route: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(route)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body)
  });
}

async function installTargetedFixture(context: BrowserContext, requests: string[]) {
  const bucket = relationshipBucket(RECORD_ROUTE);
  const record = {
    ordinal: 0,
    id: 'https://www.legislation.gov.uk/id/ukpga/1998/42',
    name: 'ukpga-1998-42',
    route: RECORD_ROUTE,
    title: 'Target Act 1998',
    notes: 'A deterministic legal work used to prove bounded record and relationship hydration.',
    publisher: 'legislation-gov-uk',
    publisher_title: 'legislation.gov.uk',
    resource_count: 0,
    formats: ['clml', 'website'],
    tags: ['ukpga', 'year-1998'],
    topics: [],
    record_type: 'Legislation Work',
    timestamp: '1998-11-19T00:00:00Z',
    legislation_id_uri: 'https://www.legislation.gov.uk/id/ukpga/1998/42',
    document_uri: 'https://www.legislation.gov.uk/ukpga/1998/42',
    url: 'https://www.legislation.gov.uk/ukpga/1998/42',
    open: RECORD_ROUTE
  };
  const relationships = [
    {
      source: RECORD_ROUTE,
      target: 'topic/consumer-credit',
      kind: 'classified as',
      authority: 'model-assisted',
      confidence: 0.97,
      evidence: ['https://www.legislation.gov.uk/ukpga/1998/42']
    },
    {
      source: RECORD_ROUTE,
      target: 'document-type/uk-public-general-act',
      kind: 'has document type',
      authority: 'official',
      confidence: 1,
      evidence: ['https://www.legislation.gov.uk/id/ukpga/1998/42']
    }
  ];
  const descriptor = {
    schema: 'okf-explorer-large-corpus.v1',
    kind: 'okf-large-corpus',
    title: 'Targeted legislation hydration fixture',
    description: 'A huge logical corpus with bounded record and relationship indexes.',
    snapshot: SNAPSHOT,
    counts: { datasets: 365_786, records: 365_786, resources: 0, relationships: 853_883 },
    vocabulary: {
      record_singular: 'legal work',
      record_plural: 'legal works',
      resource_singular: 'manifestation',
      resource_plural: 'manifestations',
      search_placeholder: 'Search targeted legislation'
    },
    entrypoints: {
      data_manifest: 'data/manifest.json',
      overview_index: 'data/overview.json',
      analysis_overview: 'data/analysis.json',
      search_manifest: 'search/manifest.json',
      record_locator: 'data/records/manifest.json',
      relationship_adjacency: 'data/adjacency/manifest.json'
    },
    extensions: {
      'okf-legislation-corpus.v1': {
        remote_full_text_search: `${ORIGIN}/official-search?query={query}`
      }
    }
  };
  const manifest = {
    title: descriptor.title,
    generated_at: '2026-07-25T00:00:00Z',
    snapshot: SNAPSHOT,
    counts: descriptor.counts,
    indexes: {
      overview: 'data/overview.json',
      analysis: 'data/analysis.json',
      facets: 'data/facets.json',
      search: 'search/manifest.json',
      record_locator: 'data/records/manifest.json',
      relationship_adjacency: 'data/adjacency/manifest.json'
    },
    chunks: {
      datasets: [
        'data/works-0.json',
        'data/works-1.json',
        'data/works-2.json',
        'data/works-3.json'
      ],
      resources: [],
      publishers: [],
      relationships: ['data/relationships-full.json']
    }
  };
  const locator = {
    schema: 'okf-record-locator-sharded.v1',
    algorithm: 'fnv1a32-prefix-2',
    snapshot: SNAPSHOT,
    records: 365_786,
    chunk_size: 100_000,
    record_chunks: manifest.chunks.datasets,
    buckets: { [bucket]: `data/records/${bucket}.json` },
    bucket_count: 1
  };
  const adjacency = {
    schema: 'okf-relationship-adjacency.v1',
    algorithm: 'fnv1a32-prefix-2',
    snapshot: SNAPSHOT,
    routes: 365_786,
    relationships: 853_883,
    buckets: { [bucket]: `data/adjacency/${bucket}.json` }
  };
  const searchManifest = {
    schema: 'okf-static-search.v1',
    snapshot: SNAPSHOT,
    token_min_length: 2,
    prefix_min_length: 3,
    lexicon_shard_length: 2,
    result_limit: 200,
    result_doc_chunk_size: 1000,
    weights: {},
    field_masks: {},
    counts: {
      documents: 365_786,
      tokens: 0,
      postings_shards: 0,
      doc_map_shards: 1,
      max_postings_per_token: 10_000
    },
    entrypoints: {
      lexicon: {},
      prefixes: {},
      postings: [],
      result_docs: [],
      facets: 'data/facets.json',
      doc_map: 'search/doc-map.json'
    }
  };
  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Official legislation search</title>
  <entry>
    <id>https://www.legislation.gov.uk/id/ukpga/1998/42</id>
    <title>Target Act 1998</title>
    <updated>1998-11-19T00:00:00Z</updated>
    <summary>Deterministic official search match.</summary>
    <link href="https://www.legislation.gov.uk/ukpga/1998/42" />
    <link rel="alternate" type="application/xml" href="https://www.legislation.gov.uk/ukpga/1998/42/data.xml" />
    <link rel="alternate" type="text/html" href="https://www.legislation.gov.uk/ukpga/1998/42" />
  </entry>
</feed>`;

  await context.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname);
    if (url.pathname === '/official-search') {
      return route.fulfill({
        status: 200,
        contentType: 'application/atom+xml',
        headers: { 'access-control-allow-origin': '*' },
        body: atom
      });
    }
    if (url.pathname === '/okf-explorer.json') return json(route, descriptor);
    if (url.pathname === '/data/manifest.json') return json(route, manifest);
    if (url.pathname === '/data/overview.json') {
      return json(route, {
        schema: 'okf-overview.v1',
        title: descriptor.title,
        snapshot: SNAPSHOT,
        generated_at: '2026-07-25T00:00:00Z',
        counts: descriptor.counts
      });
    }
    if (url.pathname === '/data/analysis.json') {
      return json(route, {
        schema: 'okf-explorer-analysis.v1',
        generated_at: '2026-07-25T00:00:00Z',
        summary: {
          title: descriptor.title,
          record_count: descriptor.counts.records,
          relationship_count: descriptor.counts.relationships
        }
      });
    }
    if (url.pathname === '/data/facets.json') return json(route, {});
    if (url.pathname === '/search/manifest.json') return json(route, searchManifest);
    if (url.pathname === '/search/doc-map.json') return json(route, {});
    if (url.pathname === '/data/records/manifest.json') return json(route, locator);
    if (url.pathname === `/data/records/${bucket}.json`) {
      return json(route, { [RECORD_ROUTE]: [0, 0] });
    }
    if (url.pathname === '/data/works-0.json') return json(route, [record]);
    if (url.pathname === '/data/adjacency/manifest.json') return json(route, adjacency);
    if (url.pathname === `/data/adjacency/${bucket}.json`) {
      return json(route, { [RECORD_ROUTE]: relationships });
    }
    if (/^\/data\/works-[1-3]\.json$/.test(url.pathname)) return json(route, []);
    if (url.pathname === '/data/relationships-full.json') return json(route, relationships);
    return json(route, { error: `No fixture route for ${url.pathname}` }, 404);
  });
}

function expectNoFullHydration(requests: string[]) {
  expect(requests.filter((path) => /^\/data\/works-[1-3]\.json$/.test(path))).toEqual([]);
  expect(requests).not.toContain('/data/relationships-full.json');
}

test.describe('targeted large-corpus relationship hydration', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('deep-linked Graph loads bounded adjacency without hydrating the full corpus', async ({ page }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests);
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=graph#${RECORD_ROUTE}`);

    await expect(page.getByRole('img', { name: 'Large corpus graph' })).toBeVisible();
    await expect(page.locator('.graph-summary')).toContainText('3 nodes · 2 relationships');
    expect(requests).toContain('/data/adjacency/manifest.json');
    expect(requests).toContain(`/data/adjacency/${relationshipBucket(RECORD_ROUTE)}.json`);
    expectNoFullHydration(requests);
    await expect(page.getByText(/browser memory safety limit/i)).toHaveCount(0);
  });

  test('official search selection hydrates the selected route when Graph opens', async ({ page }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests);
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#overview`);

    const search = page.getByPlaceholder('Search targeted legislation');
    await search.fill('Target Act');
    const result = page.locator('.result-list button').filter({ hasText: 'Target Act 1998' }).first();
    await expect(result).toBeVisible();
    await result.click();
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('img', { name: 'Large corpus graph' });
    await expect(graph).toBeVisible();
    await expect(
      graph.getByRole('button', { name: 'Target Act 1998 → classified as → consumer-credit' })
    ).toBeVisible();
    await expect(
      graph.getByRole('button', { name: 'Target Act 1998 → has document type → uk-public-general-act' })
    ).toBeVisible();
    const relationshipStyles = await graph.locator('.graph-edge').evaluateAll((edges) => edges.map((edge) => ({
      authority: edge.getAttribute('data-relationship-authority'),
      stroke: getComputedStyle(edge).stroke,
      dasharray: getComputedStyle(edge).strokeDasharray
    })));
    const officialStyle = relationshipStyles.find((edge) => edge.authority === 'official');
    const modelStyle = relationshipStyles.find((edge) => edge.authority === 'model-assisted');
    expect(officialStyle?.stroke).toBeTruthy();
    expect(modelStyle?.stroke).toBeTruthy();
    expect(modelStyle?.stroke).not.toBe(officialStyle?.stroke);
    expect(modelStyle?.dasharray).not.toBe('none');
    expect(requests.filter((path) => path === '/data/adjacency/manifest.json')).toHaveLength(1);
    expectNoFullHydration(requests);
    await expect(page.getByText(/browser memory safety limit/i)).toHaveCount(0);
  });
});
