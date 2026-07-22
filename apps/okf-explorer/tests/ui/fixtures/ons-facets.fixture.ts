import type { BrowserContext, Page, Route } from '@playwright/test';

export const ONS_FACET_ORIGIN = 'https://ons-facets.fixture.test';
export const ONS_FACET_BUNDLE_URL = `${ONS_FACET_ORIGIN}/okf-explorer.json`;
export const ONS_RECORD_COUNT = 420;
export const ONS_REGION_COUNT = 382;

export const suggestedFacetKeys = [
  'derivation_mode',
  'frequency',
  'geography_level',
  'state',
  'topic',
  'population_type'
] as const;

type FacetRows = Array<{ value: string; count: number }>;

const derivationModes = [
  'source-declared',
  'catalogue-derived',
  'schema-derived',
  'title-inferred',
  'description-inferred',
  'publisher-inferred',
  'endpoint-observed',
  'manual-review'
];
const frequencies = [
  'annual',
  'quarterly',
  'monthly',
  'weekly',
  'daily',
  'biennial',
  'ad hoc',
  'continuous',
  'decennial',
  'hourly',
  'irregular',
  'never',
  'not known',
  'other'
];
const topics = ['Population', 'Housing', 'Health', 'Economy', 'Education', 'Environment', 'Transport', 'Crime', 'Labour market'];
const populationTypes = Array.from({ length: 20 }, (_unused, index) => `Population group ${String(index + 1).padStart(2, '0')}`);

function geographyForOrdinal(ordinal: number): string {
  if (ordinal < ONS_REGION_COUNT) return 'region';
  if (ordinal < 400) return 'country';
  if (ordinal < 412) return 'local authority';
  return 'ward';
}

const records = Array.from({ length: ONS_RECORD_COUNT }, (_unused, ordinal) => {
  const geography = geographyForOrdinal(ordinal);
  const derivation = derivationModes[ordinal % derivationModes.length];
  const frequency = frequencies[ordinal % frequencies.length];
  const state = ordinal % 5 ? 'published' : 'draft';
  const topic = topics[ordinal % topics.length];
  const populationType = populationTypes[ordinal % populationTypes.length];
  const sourceSurface = ['Nomis', 'ONS website', 'Open Geography Portal'][ordinal % 3];
  return {
    ordinal,
    name: `ons-record-${String(ordinal + 1).padStart(4, '0')}`,
    title: `ONS deterministic metadata record ${String(ordinal + 1).padStart(4, '0')}`,
    notes: `Deterministic ${geography} record used to verify the facet interaction contract.`,
    publisher: 'office-for-national-statistics',
    publisher_title: 'Office for National Statistics',
    resource_count: 1,
    formats: ['CSV'],
    tags: ['deterministic-fixture'],
    topics: [topic],
    timestamp: `2026-07-${String((ordinal % 20) + 1).padStart(2, '0')}T12:00:00Z`,
    metadata_modified: `2026-07-${String((ordinal % 20) + 1).padStart(2, '0')}T12:00:00Z`,
    record_type: 'ONS metadata record',
    state,
    frequency,
    population_type: populationType,
    source_surface: sourceSurface,
    geography_metadata: { levels: [geography] },
    metadata_derivation: { modes: [derivation] },
    route: `dataset/ons-record-${String(ordinal + 1).padStart(4, '0')}`,
    url: `${ONS_FACET_ORIGIN}/catalogue/${ordinal + 1}`,
    open: `dataset/ons-record-${String(ordinal + 1).padStart(4, '0')}`,
    fixtureFacetValues: {
      derivation_mode: derivation,
      frequency,
      geography_level: geography,
      state,
      topic,
      population_type: populationType,
      source_surface: sourceSurface
    }
  };
});

function postingsFor(key: string): Record<string, number[]> {
  const values: Record<string, number[]> = {};
  for (const record of records) {
    const facetValues = record.fixtureFacetValues as Record<string, string>;
    (values[facetValues[key]] ||= []).push(record.ordinal as number);
  }
  return values;
}

const facetPostings = Object.fromEntries(
  [...suggestedFacetKeys, 'source_surface'].map((key) => [key, postingsFor(key)])
) as Record<string, Record<string, number[]>>;

const facetRows = Object.fromEntries(
  Object.entries(facetPostings).map(([key, values]) => [
    key,
    Object.entries(values)
      .map(([value, ordinals]) => ({ value, count: ordinals.length }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
  ])
) as Record<string, FacetRows>;

function analysisFacet(
  key: string,
  label: string,
  control: 'distribution' | 'search',
  recommendation: 'primary' | 'secondary' | 'advanced' | 'suppressed' = 'primary'
) {
  const rows = facetRows[key];
  return {
    key,
    label,
    description: `${label} is fixture metadata supplied by the ONS-shaped datapack.`,
    coverage: 1,
    cardinality: rows.length,
    top_share: rows[0].count / ONS_RECORD_COUNT,
    entropy: 0.72,
    expected_reduction: 0.5,
    recommended_control: control,
    recommendation,
    value_type: 'nominal',
    value_order: 'count-desc'
  };
}

const descriptor = {
  schema: 'okf-explorer-large-corpus.v1',
  kind: 'okf-large-corpus',
  title: 'ONS facet interaction fixture',
  description: 'Deterministic ONS-shaped datapack for complete facet UI coverage.',
  version: '1.0.0-test',
  status: 'test-fixture',
  publisher: 'Office for National Statistics',
  counts: { datasets: ONS_RECORD_COUNT, resources: ONS_RECORD_COUNT, publishers: 1, relationships: 0 },
  vocabulary: {
    record_singular: 'ONS metadata record',
    record_plural: 'ONS metadata records',
    resource_singular: 'source/access resource',
    resource_plural: 'source/access resources',
    publisher_singular: 'publisher',
    publisher_plural: 'publishers',
    search_placeholder: 'Search ONS products, concepts and geographies'
  },
  entrypoints: {
    data_manifest: 'data/manifest.json',
    overview_index: 'data/overview.json',
    analysis_overview: 'data/analysis.json',
    presentation: 'data/presentation.json',
    search_manifest: 'search/manifest.json'
  }
};

const manifest = {
  title: 'ONS facet interaction fixture',
  generated_at: '2026-07-21T00:00:00Z',
  counts: { datasets: ONS_RECORD_COUNT, resources: ONS_RECORD_COUNT, publishers: 1, relationships: 0 },
  indexes: {
    overview: 'data/overview.json',
    analysis: 'data/analysis.json',
    presentation: 'data/presentation.json',
    search: 'search/manifest.json',
    facets: 'data/facets.json',
    graph: 'data/graph.json'
  },
  chunks: {
    datasets: ['data/datasets.json'],
    resources: [],
    publishers: ['data/publishers.json'],
    relationships: []
  }
};

const overview = {
  schema: 'okf-overview.v1',
  title: 'ONS facet interaction fixture',
  generated_at: '2026-07-21T00:00:00Z',
  counts: { datasets: ONS_RECORD_COUNT, resources: ONS_RECORD_COUNT, publishers: 1 },
  recent_datasets: records.slice(0, 3).map(searchDocument)
};

const analysis = {
  schema: 'okf-explorer-analysis.v1',
  generated_at: '2026-07-21T00:00:00Z',
  display: {
    facets: {
      order: [...suggestedFacetKeys, 'source_surface'],
      hidden: ['source_surface'],
      default_mode: 'suggested',
      high_cardinality_threshold: 12,
      distribution_segments: 5
    },
    detail: { tabs: ['overview', 'evidence', 'data'], default_tab: 'overview' }
  },
  summary: {
    title: 'ONS discovery facet interaction contract',
    description: 'A deterministic overview that deliberately avoids full-record hydration.',
    record_count: ONS_RECORD_COUNT,
    resource_count: ONS_RECORD_COUNT,
    relationship_count: 0
  },
  facet_analysis: [
    analysisFacet('derivation_mode', 'derivation mode', 'distribution'),
    analysisFacet('frequency', 'frequency', 'distribution', 'secondary'),
    analysisFacet('geography_level', 'geography level', 'distribution'),
    analysisFacet('state', 'state', 'distribution'),
    analysisFacet('topic', 'topic', 'distribution'),
    analysisFacet('population_type', 'population type', 'search', 'advanced'),
    analysisFacet('source_surface', 'source surface', 'distribution', 'suppressed')
  ],
  hierarchies: [
    {
      id: 'ons-geography',
      label: 'ONS geography',
      facet: 'geography_level',
      levels: ['country', 'region', 'local authority', 'ward'],
      values: [
        {
          id: 'facet/geography_level/country',
          label: 'Country',
          count: ONS_RECORD_COUNT,
          route: 'facet/geography_level/country',
          children: [
            { id: 'facet/geography_level/region', label: 'Region', count: ONS_REGION_COUNT, route: 'facet/geography_level/region' },
            { id: 'facet/geography_level/local authority', label: 'Local authority', count: 12, route: 'facet/geography_level/local authority' },
            { id: 'facet/geography_level/ward', label: 'Ward', count: 8, route: 'facet/geography_level/ward' }
          ]
        }
      ]
    }
  ],
  narrative: { title: 'ONS discovery facet interaction contract', body: 'Fixture narrative.' }
};

const presentation = {
  schema: 'okf-explorer-presentation.v1',
  status: 'experimental',
  defaults: { facet_mode: 'suggested', search_threshold: 12, distribution_segment_limit: 5 },
  facets: [
    { key: 'derivation_mode', label: 'derivation mode', order: 10, open_control: 'distribution', value_type: 'nominal' },
    { key: 'frequency', label: 'frequency', order: 20, open_control: 'distribution', value_type: 'nominal' },
    { key: 'geography_level', label: 'geography level', order: 30, open_control: 'distribution', value_type: 'nominal' },
    { key: 'state', label: 'state', order: 40, open_control: 'distribution', value_type: 'nominal' },
    { key: 'topic', label: 'topic', order: 50, open_control: 'distribution', value_type: 'nominal' },
    {
      key: 'population_type',
      label: 'population type',
      order: 60,
      default_state: 'shown',
      open_control: 'search',
      value_type: 'nominal',
      examples: ['All households', 'Children', 'Older people']
    },
    { key: 'source_surface', label: 'source surface', order: 70, default_state: 'hidden', open_control: 'distribution', value_type: 'nominal' }
  ],
  panels: {
    left: { tabs: ['facets', 'browse', 'results'], default_tab: 'facets' },
    right: { tabs: ['overview', 'evidence', 'data'], default_tab: 'overview' }
  }
};

function searchDocument(record: (typeof records)[number]) {
  return {
    ordinal: record.ordinal,
    name: record.name,
    title: record.title,
    publisher: record.publisher,
    publisher_title: record.publisher_title,
    resource_count: record.resource_count,
    formats: record.formats,
    tags: record.tags,
    topics: record.topics,
    timestamp: record.timestamp,
    notes: record.notes,
    record_type: record.record_type,
    open: record.open,
    url: record.url
  };
}

const searchManifest = {
  schema: 'okf-static-search.v1',
  token_min_length: 2,
  prefix_min_length: 3,
  lexicon_shard_length: 2,
  result_limit: 200,
  result_doc_chunk_size: 1000,
  weights: {},
  field_masks: {},
  counts: {
    documents: ONS_RECORD_COUNT,
    tokens: 0,
    postings_shards: 0,
    doc_map_shards: 1,
    max_postings_per_token: 50_000
  },
  entrypoints: {
    lexicon: {},
    prefixes: {},
    postings: [],
    result_docs: ['search/result-docs.json'],
    facets: 'data/facets.json',
    doc_map: 'search/doc-map.json',
    filter_postings: Object.fromEntries(
      Object.keys(facetPostings).map((key) => [key, `search/filter-${key}.json`])
    )
  }
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body)
  });
}

export async function installOnsFacetFixture(context: BrowserContext, requestLog: string[] = []) {
  await context.route(`${ONS_FACET_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    requestLog.push(url.pathname);
    if (url.pathname === '/okf-explorer.json') return json(route, descriptor);
    if (url.pathname === '/data/manifest.json') return json(route, manifest);
    if (url.pathname === '/data/overview.json') return json(route, overview);
    if (url.pathname === '/data/analysis.json') return json(route, analysis);
    if (url.pathname === '/data/presentation.json') return json(route, presentation);
    if (url.pathname === '/data/facets.json') return json(route, facetRows);
    if (url.pathname === '/data/datasets.json') return json(route, records);
    if (url.pathname === '/data/publishers.json') {
      return json(route, [{
        name: 'office-for-national-statistics',
        title: 'Office for National Statistics',
        dataset_count: ONS_RECORD_COUNT,
        resource_count: ONS_RECORD_COUNT,
        state: 'active'
      }]);
    }
    if (url.pathname === '/data/graph.json') return json(route, {});
    if (url.pathname === '/search/manifest.json') return json(route, searchManifest);
    if (url.pathname === '/search/result-docs.json') return json(route, records.map(searchDocument));
    if (url.pathname === '/search/doc-map.json') return json(route, {});
    const filterKey = url.pathname.match(/^\/search\/filter-(.+)\.json$/)?.[1];
    if (filterKey && facetPostings[filterKey]) {
      return json(route, { schema: 'okf-static-filter-postings.v1', key: filterKey, values: facetPostings[filterKey] });
    }
    return json(route, { error: `No fixture route for ${url.pathname}` }, 404);
  });
}

export async function openOnsFacetFixture(page: Page, requestLog: string[] = []) {
  await page.context().addInitScript(() => {
    const marker = 'okf-ons-facet-e2e-storage-initialised';
    if (!sessionStorage.getItem(marker)) {
      localStorage.clear();
      sessionStorage.setItem(marker, 'yes');
    }
  });
  await installOnsFacetFixture(page.context(), requestLog);
  await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#overview`);
  await page.getByPlaceholder('Search ONS products, concepts and geographies').waitFor();
  await page.locator('[data-facet-key="derivation_mode"]').waitFor();
  await page.getByText('Preparing static search index...').waitFor({ state: 'hidden' });
  return requestLog;
}

export function facetSection(page: Page, key: string) {
  return page.locator(`[data-facet-key="${key}"]`);
}

export function facetValue(page: Page, key: string, value: string) {
  return facetSection(page, key).locator(`.facet-values [data-facet-value="${value}"]`);
}

export function facetSegment(page: Page, key: string, value: string) {
  return facetSection(page, key).locator(`.facet-distribution-segment[data-facet-value="${value}"]`);
}

export async function displayedFacetOrder(page: Page): Promise<string[]> {
  return page.locator('.facet-sections > .facet-section').evaluateAll((sections) =>
    sections.map((section) => section.getAttribute('data-facet-key') || '')
  );
}
