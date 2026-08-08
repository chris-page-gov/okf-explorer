import { expect, test, type Page } from '@playwright/test';

import {
  ELS_ALIGNED_RECORD_NAME,
  ELS_RECORD_NAME,
  ELS_RESOURCE_ID,
  ELS_UNREVIEWED_RECORD_NAME,
  ONS_FACET_BUNDLE_URL,
  ONS_RECORD_COUNT,
  ONS_REGION_COUNT,
  displayedFacetOrder,
  facetSection,
  facetSegment,
  facetValue,
  installOnsFacetFixture,
  openOnsFacetFixture,
  suggestedFacetKeys
} from './fixtures/ons-facets.fixture';

function facetToggle(page: Page, key: string) {
  return facetSection(page, key).locator('.facet-toggle');
}

function facetActions(page: Page, key: string) {
  return facetSection(page, key).getByRole('button', { name: `Actions for ${key.replaceAll('_', ' ')}` });
}

function filterValues(page: Page, key: string): Promise<string[]> {
  return page.evaluate((facetKey) => new URL(location.href).searchParams.getAll(`filter.${facetKey}`), key);
}

async function waitForFilter(page: Page, key: string, values: string[]) {
  await expect.poll(() => filterValues(page, key)).toEqual(values);
}

async function waitForFixtureReady(page: Page) {
  await page.getByPlaceholder('Search ONS products, concepts and geographies').waitFor();
  await facetSection(page, 'derivation_mode').waitFor();
  await page.getByText('Preparing static search index...').waitFor({ state: 'hidden' });
}

async function dragFacetOnto(page: Page, sourceKey: string, targetKey: string) {
  const source = facetSection(page, sourceKey).getByRole('button', { name: `Reorder ${sourceKey.replaceAll('_', ' ')}` });
  const target = facetSection(page, targetKey);
  await expect(source).toHaveAttribute('draggable', 'true');
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });
  await dataTransfer.dispose();
}

const HUGE_FACET_ORIGIN = 'https://huge-facets.fixture.test';
const HUGE_FACET_URL = `${HUGE_FACET_ORIGIN}/okf-explorer.json`;
const hugeFacetRows = {
  category: [
    { value: 'eu-origin', count: 159_773 },
    { value: 'secondary', count: 155_712 },
    { value: 'primary', count: 43_170 },
    { value: 'draft', count: 7_131 }
  ]
};

async function installHugeNoPostingsFixture(page: Page, requestLog: string[]) {
  await page.context().route(`${HUGE_FACET_ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    requestLog.push(path);
    const respond = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body)
    });
    if (path === '/okf-explorer.json') return respond({
      schema: 'okf-explorer-large-corpus.v1',
      kind: 'okf-large-corpus',
      title: 'Huge legislation facet fixture',
      description: 'A large corpus whose legacy search index has no filter postings.',
      counts: { datasets: 365_786, records: 365_786, relationships: 853_883 },
      vocabulary: { record_plural: 'legal works', search_placeholder: 'Search legislation' },
      entrypoints: {
        data_manifest: 'data/manifest.json',
        overview_index: 'data/overview.json',
        analysis_overview: 'data/analysis.json',
        search_manifest: 'search/manifest.json'
      }
    });
    if (path === '/data/manifest.json') return respond({
      title: 'Huge legislation facet fixture',
      generated_at: '2026-07-25T00:00:00Z',
      counts: { datasets: 365_786, records: 365_786, relationships: 853_883 },
      indexes: {
        overview: 'data/overview.json',
        analysis: 'data/analysis.json',
        facets: 'data/facets.json',
        search: 'search/manifest.json'
      },
      chunks: {
        datasets: ['data/works-0.json.gz', 'data/works-1.json.gz'],
        resources: [],
        publishers: [],
        relationships: ['data/relationships-0.json.gz']
      }
    });
    if (path === '/data/overview.json') return respond({
      schema: 'okf-overview.v1',
      title: 'Huge legislation facet fixture',
      generated_at: '2026-07-25T00:00:00Z',
      counts: { datasets: 365_786, records: 365_786, relationships: 853_883 },
      facet_previews: hugeFacetRows
    });
    if (path === '/data/analysis.json') return respond({
      schema: 'okf-explorer-analysis.v1',
      generated_at: '2026-07-25T00:00:00Z',
      summary: { title: 'Legislation overview', record_count: 365_786, relationship_count: 853_883 },
      facet_analysis: [{
        key: 'category',
        label: 'Category',
        coverage: 1,
        cardinality: 4,
        top_share: 0.44,
        entropy: 0.8,
        expected_reduction: 0.56,
        recommended_control: 'searchable multi-select',
        recommendation: 'primary',
        value_type: 'nominal',
        values: hugeFacetRows.category
      }]
    });
    if (path === '/data/facets.json') return respond(hugeFacetRows);
    if (path === '/search/manifest.json') {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      return respond({
        schema: 'okf-static-search.v1',
        token_min_length: 2,
        prefix_min_length: 3,
        lexicon_shard_length: 2,
        result_limit: 200,
        result_doc_chunk_size: 1000,
        weights: {},
        field_masks: {},
        counts: {
          documents: 365_786,
          max_postings_per_token: 10_000,
          postings_shards: 0,
          doc_map_shards: 1
        },
        entrypoints: {
          lexicon: {},
          prefixes: {},
          postings: [],
          result_docs: [],
          facets: 'data/facets.json',
          doc_map: 'search/doc-map.json'
        }
      });
    }
    if (path === '/search/doc-map.json') return respond({});
    if (path.startsWith('/data/works-')) return respond([{ name: 'must-not-load', title: 'Must not load' }]);
    if (path.startsWith('/data/relationships-')) {
      return respond([{ source: 'dataset/must-not-load', target: 'dataset/must-not-load', kind: 'must-not-load' }]);
    }
    return respond({ error: `No fixture for ${path}` }, 404);
  });
}

test.describe('large-corpus facet interaction contract', () => {
  test('FACET-E2E-01 documents the initial semantic inventory, navigation, tabs and compact controls', async ({ page }) => {
    const requests: string[] = [];
    await openOnsFacetFixture(page, requests);

    await expect(page.getByRole('heading', { name: 'OKF Explorer' })).toBeVisible();
    await expect(page.getByText('ONS facet interaction fixture', { exact: true }).first()).toBeVisible();
    for (const view of ['Reader', 'Graph', 'Links', 'Timeline', 'Type', 'Resources', 'Map', 'Narrative']) {
      await expect(page.getByRole('button', { name: view, exact: true })).toBeVisible();
    }

    const leftTabs = page.getByRole('tablist', { name: 'Left panel' });
    await expect(leftTabs.getByRole('tab')).toHaveText(['Facets', 'Browse', 'Results']);
    await expect(leftTabs.getByRole('tab', { name: 'Facets' })).toHaveAttribute('aria-selected', 'true');
    await leftTabs.getByRole('tab', { name: 'Browse' }).click();
    await expect(page.getByRole('heading', { name: 'Browse hierarchies' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ONS geography' })).toBeVisible();
    await leftTabs.getByRole('tab', { name: 'Results' }).click();
    await expect(page.getByText('Search or open a facet to load matching ONS metadata records.')).toBeVisible();
    await leftTabs.getByRole('tab', { name: 'Facets' }).click();

    await expect(page.getByLabel('Facet visibility').getByRole('button')).toHaveText(['Suggested', 'All']);
    await expect(page.getByRole('button', { name: 'Suggested', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Guidance', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Reset facet layout', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters', exact: true })).toBeDisabled();
    await expect(page.locator('.facet-toolbar-actions').getByRole('button')).toHaveText([
      'Guidance',
      'Clear filters',
      'Reset facet layout'
    ]);
    await expect(page.locator('.facet-inventory')).toHaveText('6 of 7 facets shown');

    expect(await displayedFacetOrder(page)).toEqual([...suggestedFacetKeys]);
    await expect(facetSection(page, 'source_surface')).toHaveCount(0);
    for (const phantom of ['category', 'type_code', 'document_type']) {
      await expect(facetSection(page, phantom)).toHaveCount(0);
    }

    // Low-cardinality distributions are useful while closed, so every one is
    // rendered from the compact facet index before a value list is opened.
    // The expensive filter postings stay deferred until a facet is opened or
    // selected. Segments still expose the categorical palette.
    for (const key of ['derivation_mode', 'frequency', 'geography_level', 'state', 'topic']) {
      await expect(facetToggle(page, key)).toHaveAttribute('aria-expanded', 'false');
      await expect(facetSection(page, key).locator('.facet-distribution-bar')).toBeVisible();
      await expect(facetSection(page, key).locator('.facet-distribution-segment').first()).toBeVisible();
      expect(requests).not.toContain(`/search/filter-${key}.json`);
    }
    const leftPanelBox = await page.locator('.left-panel').boundingBox();
    const firstFacetBox = await facetSection(page, 'derivation_mode').boundingBox();
    expect(firstFacetBox!.width).toBeLessThanOrEqual(leftPanelBox!.width);
    await expect(facetSection(page, 'derivation_mode').getByRole('button', { name: 'Pin derivation mode' })).toBeVisible();
    await expect(facetActions(page, 'derivation_mode')).toBeVisible();
    const segmentBox = await facetSection(page, 'derivation_mode').locator('.facet-distribution-segment').first().boundingBox();
    expect(segmentBox!.height).toBeGreaterThanOrEqual(24);
    expect(segmentBox!.width).toBeGreaterThanOrEqual(12);
    const palette = await facetSection(page, 'derivation_mode').locator('.facet-distribution-segment').evaluateAll((segments) => ({
      tones: segments.map((segment) => segment.getAttribute('data-tone')),
      colours: segments.map((segment) => (segment as HTMLElement).style.getPropertyValue('--facet-colour'))
    }));
    expect(palette.tones).toEqual(['strong', 'contrast', 'strong', 'contrast', 'strong']);
    expect(new Set(palette.colours).size).toBeGreaterThan(3);

    // High-cardinality dimensions intentionally substitute example ghost text
    // for a misleading, unreadable distribution.
    await expect(facetSection(page, 'population_type').locator('.facet-distribution-bar')).toHaveCount(0);
    await expect(facetSection(page, 'population_type').locator('.facet-search-ghost')).toContainText(
      'Search values · e.g. All households · Children · Older people'
    );
  });

  test('FACET-E2E-01A keeps overview-first bundle responses below one MiB', async ({ page }) => {
    const requests: string[] = [];
    const responseBytes: number[] = [];
    await openOnsFacetFixture(page, requests, {
      responseBytes,
      // Make an accidental eager filter-posting fetch unambiguously breach the
      // budget while leaving the compact overview/control plane unchanged.
      filterPaddingBytes: 1_100_000
    });
    await page.waitForLoadState('networkidle');

    expect(requests.filter((path) => path.startsWith('/search/filter-'))).toEqual([]);
    expect(responseBytes.reduce((total, bytes) => total + bytes, 0)).toBeLessThan(1_048_576);
    await expect(facetSection(page, 'derivation_mode').locator('.facet-distribution-bar')).toBeVisible();
  });

  test('FACET-E2E-12 opens complete facet indexes without hydrating a huge record plane', async ({ page }) => {
    const requests: string[] = [];
    await installHugeNoPostingsFixture(page, requests);
    await page.goto(`?bundle=${encodeURIComponent(HUGE_FACET_URL)}#overview`);

    const category = facetSection(page, 'category');
    await expect(category).toBeVisible();
    await expect(category.locator('.facet-toggle small')).toHaveText('4 values');
    await expect(category.locator('.facet-distribution-bar')).toBeVisible();
    await expect(category.locator('.facet-distribution-segment')).toHaveCount(4);

    await facetToggle(page, 'category').click();
    await expect(category.locator('.facet-values [data-facet-value]')).toHaveCount(4);
    await expect(page.getByText('Loading record index...')).toHaveCount(0);
    expect(requests.filter((path) => path.startsWith('/data/works-'))).toEqual([]);

    await page.getByRole('button', { name: 'Links', exact: true }).click();
    await page.getByRole('button', { name: /Load full relationship index/ }).click();
    await expect(page.locator('.error')).toContainText(
      'Full relationship hydration is disabled for this 853,883-relationship bundle'
    );
    expect(requests.filter((path) => path.startsWith('/data/relationships-'))).toEqual([]);

    await page.setViewportSize({ width: 640, height: 900 });
    const left = await page.locator('.left-panel').boundingBox();
    const stage = await page.locator('.stage').boundingBox();
    expect(left!.x).toBeLessThan(stage!.x);
    expect(left!.y).toBe(stage!.y);
    expect(left!.width + stage!.width).toBeLessThanOrEqual(641);
  });

  test('FACET-E2E-02 previews from bars and lists, commits explicitly, and never assigns right-click to Adjust', async ({ page }) => {
    await openOnsFacetFixture(page);
    const originalUrl = page.url();
    const region = facetSegment(page, 'geography_level', 'region');

    await region.click();
    await expect(region).toHaveClass(/highlighted/);
    expect(page.url()).toBe(originalUrl);
    await expect(page.locator('.right-panel').getByRole('heading', { name: 'region' })).toBeVisible();
    await expect(page.locator('[data-detail-field="matched-records"]')).toHaveText(`${ONS_REGION_COUNT} in whole corpus`);

    // A context click on a value is inert. The explicit ••• header button is
    // the discoverable action surface, and its vocabulary contains no Adjust.
    await facetSegment(page, 'geography_level', 'country').click({ button: 'right' });
    await expect(region).toHaveClass(/highlighted/);
    await expect(facetSegment(page, 'geography_level', 'country')).not.toHaveClass(/highlighted/);
    expect(page.url()).toBe(originalUrl);
    await facetActions(page, 'geography_level').click();
    const menu = page.getByRole('menu', { name: 'geography level actions' });
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Pin facet',
      'Move earlier',
      'Move later',
      'Hide from Suggested',
      'Clear this facet',
      'About this facet'
    ]);
    await expect(page.getByText('Adjust', { exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await region.dblclick();
    await waitForFilter(page, 'geography_level', ['region']);
    await expect(page.locator('.active-filter-chips')).toContainText(/geography level: region/i);
    await expect(facetSection(page, 'geography_level').locator('.facet-toggle small')).toHaveText('1 selected');
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await waitForFilter(page, 'geography_level', []);

    await facetToggle(page, 'state').click();
    await expect(facetValue(page, 'state', 'published')).toBeVisible();
    await facetValue(page, 'state', 'published').click({ modifiers: ['Shift'] });
    await facetValue(page, 'state', 'draft').click({ modifiers: ['Shift'] });
    await expect(facetSection(page, 'state').locator('.facet-highlight-actions')).toContainText('2 highlighted');
    expect(await filterValues(page, 'state')).toEqual([]);

    await facetValue(page, 'state', 'published').press('Enter');
    await waitForFilter(page, 'state', ['draft', 'published']);
    await expect(page.locator('.active-filter-chips')).toContainText('state: draft');
    await expect(page.locator('.active-filter-chips')).toContainText('state: published');
  });

  test('FACET-E2E-02A renders bounded related records for a facet card without full hydration', async ({ page }) => {
    const requests: string[] = [];
    await openOnsFacetFixture(page, requests);

    const region = facetSegment(page, 'geography_level', 'region');
    await region.click();
    await region.dblclick();
    await waitForFilter(page, 'geography_level', ['region']);
    await expect(page.getByText('Preparing static search index...')).toHaveCount(0);

    const details = page.locator('.right-panel');
    await expect(details.getByRole('heading', { name: /region/i, exact: true })).toBeVisible();
    await expect(details.getByRole('button', { name: /Load full relationships/ })).toHaveCount(0);
    await expect(details.getByRole('button', { name: 'Graph related records' })).toBeVisible();
    await expect(details.getByRole('heading', { name: 'Related ONS metadata records' })).toBeVisible();
    await expect(details.locator('[data-detail-field="record-preview"]')).toContainText(
      `loaded of ${ONS_REGION_COUNT}`
    );
    await expect(details).toContainText(/derived from the snapshot-bound static facet index/i);
    expect(requests).not.toContain('/data/datasets.json');

    await details.getByRole('button', { name: 'Graph related records' }).click();
    await expect(page).toHaveURL(/(?:\?|&)view=graph(?:&|#)/);
    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    await expect(graph).toBeVisible();
    await expect(page.locator('.graph-caption')).toContainText(
      `loaded of ${ONS_REGION_COUNT} exact index matches`
    );
    await expect(graph.locator('.graph-edge[data-relationship-authority="derived"]')).toBeVisible();
    await expect(page.getByText(/browser memory safety limit/i)).toHaveCount(0);
    expect(requests).not.toContain('/data/datasets.json');

    await page.getByRole('button', { name: 'Links', exact: true }).click();
    await expect(page.locator('.view-heading')).toContainText('bounded current-facet links');
    await expect(page.locator('.links-view')).toContainText('Derived from the static facet index');
    await expect(page.getByRole('button', { name: /Load full relationship index/ })).toHaveCount(0);
    expect(requests).not.toContain('/data/datasets.json');
  });

  test('FACET-E2E-02B keeps direct metadata-route counts aligned with card previews', async ({
    page
  }) => {
    const requests: string[] = [];
    await installOnsFacetFixture(page.context(), requests);
    await page.goto(
      `?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#topic/Economy`
    );
    await waitForFixtureReady(page);

    const details = page.locator('.right-panel');
    await expect(details.getByRole('heading', { name: 'Economy', exact: true })).toBeVisible();
    await expect(details.locator('[data-detail-field="matched-records"]')).toContainText(
      '47 in whole corpus'
    );
    await expect(details.locator('[data-detail-field="record-preview"]')).toContainText(
      'loaded of 47'
    );
    await expect(details.locator('[data-detail-field="record-preview"]')).not.toContainText(
      'loaded of 0'
    );
    expect(requests).not.toContain('/data/datasets.json');
  });

  test('FACET-E2E-03 opens aggregate bars and replaces high cardinality with searchable examples', async ({ page }) => {
    const requests: string[] = [];
    await openOnsFacetFixture(page, requests);

    const aggregate = facetSegment(page, 'derivation_mode', '__other__');
    await expect(aggregate).toHaveAttribute('aria-label', /Open derivation mode to find 4 other values/);
    await aggregate.click();
    await expect(facetToggle(page, 'derivation_mode')).toHaveAttribute('aria-expanded', 'true');
    await expect(facetSection(page, 'derivation_mode').locator('.facet-values [data-facet-value]')).toHaveCount(8);
    expect(await filterValues(page, 'derivation_mode')).toEqual([]);

    await facetToggle(page, 'population_type').click();
    const search = facetSection(page, 'population_type').getByRole('textbox', { name: 'Search population type' });
    await expect(search).toHaveAttribute('placeholder', 'e.g. All households · Children · Older people');
    await search.fill('group 20');
    await expect(facetSection(page, 'population_type').locator('.facet-values [data-facet-value]')).toHaveCount(1);
    await expect(facetValue(page, 'population_type', 'Population group 20')).toBeVisible();
    await facetValue(page, 'population_type', 'Population group 20').click();
    expect(await filterValues(page, 'population_type')).toEqual([]);
    await facetValue(page, 'population_type', 'Population group 20').press('Enter');
    await waitForFilter(page, 'population_type', ['Population group 20']);

    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await page.getByPlaceholder('Search ONS products, concepts and geographies').fill('no matching fixture term');
    await expect.poll(() => requests.includes('/search/filter-population_type.json')).toBe(true);
    expect(requests).not.toContain('/search/filter-derivation_mode.json');
    await expect(facetSection(page, 'population_type').locator('.facet-toggle small')).toHaveText('0 values');
    await expect(facetSection(page, 'derivation_mode').locator('.facet-toggle small')).toHaveText('8 values');
  });

  test('FACET-E2E-04 pins several open facets directly and persists the open workspace', async ({ page }) => {
    await openOnsFacetFixture(page);

    for (const key of ['derivation_mode', 'geography_level']) {
      const pin = facetSection(page, key).getByRole('button', { name: `Pin ${key.replaceAll('_', ' ')}` });
      await pin.click();
      await expect(facetToggle(page, key)).toHaveAttribute('aria-expanded', 'true');
      await expect(facetSection(page, key)).toHaveClass(/pinned/);
    }
    await expect(facetToggle(page, 'derivation_mode')).toHaveAttribute('aria-expanded', 'true');
    await expect(facetToggle(page, 'geography_level')).toHaveAttribute('aria-expanded', 'true');

    await page.reload();
    await waitForFixtureReady(page);
    for (const key of ['derivation_mode', 'geography_level']) {
      await expect(facetToggle(page, key)).toHaveAttribute('aria-expanded', 'true');
      await expect(facetSection(page, key)).toHaveClass(/pinned/);
      await expect(facetSection(page, key).getByRole('button', { name: `Unpin ${key.replaceAll('_', ' ')}` })).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('FACET-E2E-05 reorders by drag or menu and resets visibility, guidance and provider defaults', async ({ page }) => {
    await openOnsFacetFixture(page);

    await dragFacetOnto(page, 'topic', 'derivation_mode');
    await expect.poll(() => displayedFacetOrder(page)).toEqual([
      'topic',
      'derivation_mode',
      'frequency',
      'geography_level',
      'state',
      'population_type'
    ]);
    await page.reload();
    await waitForFixtureReady(page);
    expect((await displayedFacetOrder(page)).slice(0, 2)).toEqual(['topic', 'derivation_mode']);

    await facetActions(page, 'topic').click();
    await page.getByRole('menu', { name: 'topic actions' }).getByRole('menuitem', { name: 'Move later' }).click();
    await expect.poll(() => displayedFacetOrder(page)).toEqual([
      'derivation_mode',
      'topic',
      'frequency',
      'geography_level',
      'state',
      'population_type'
    ]);
    await page.reload();
    await waitForFixtureReady(page);
    expect((await displayedFacetOrder(page)).slice(0, 2)).toEqual(['derivation_mode', 'topic']);

    await dragFacetOnto(page, 'derivation_mode', 'population_type');
    await expect.poll(() => displayedFacetOrder(page)).toEqual([
      'topic',
      'frequency',
      'geography_level',
      'state',
      'population_type',
      'derivation_mode'
    ]);
    await page.reload();
    await waitForFixtureReady(page);
    expect((await displayedFacetOrder(page)).at(-1)).toBe('derivation_mode');

    await page.getByRole('button', { name: 'Guidance', exact: true }).click();
    await expect(page.getByText('What makes a useful facet?')).toBeVisible();
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(facetSection(page, 'source_surface')).toBeVisible();
    await facetActions(page, 'state').click();
    await page.getByRole('menu', { name: 'state actions' }).getByRole('menuitem', { name: 'Hide from Suggested' }).click();
    await page.getByRole('button', { name: 'Suggested', exact: true }).click();
    await expect(facetSection(page, 'source_surface')).toHaveCount(0);
    await expect(facetSection(page, 'state')).toHaveCount(0);

    await page.getByRole('button', { name: 'Reset facet layout', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Suggested', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Guidance', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('What makes a useful facet?')).toHaveCount(0);
    expect(await displayedFacetOrder(page)).toEqual([...suggestedFacetKeys]);
    await expect(facetSection(page, 'state')).toBeVisible();
    await expect(facetSection(page, 'source_surface')).toHaveCount(0);
  });

  test('FACET-E2E-06 preserves the exact nested geography count across bounded Graph navigation', async ({ page }) => {
    const requests: string[] = [];
    await openOnsFacetFixture(page, requests);
    expect(requests).not.toContain('/data/datasets.json');

    await facetSegment(page, 'geography_level', 'region').dblclick();
    await waitForFilter(page, 'geography_level', ['region']);
    await expect(page.locator('[data-metric="ons-metadata-records-matching"] strong')).toHaveText(String(ONS_REGION_COUNT));
    await expect(page.getByText(`200 shown of ${ONS_REGION_COUNT} matching records (the result display limit was reached)`)).toBeVisible();
    await expect(page.locator('[data-detail-field="matched-records"]')).toHaveText(`${ONS_REGION_COUNT} in current reduction`);
    expect(requests).not.toContain('/data/datasets.json');

    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Large corpus graph' })).toBeVisible();
    expect(requests).not.toContain('/data/datasets.json');
    await expect(page.locator('[data-detail-field="matched-records"]')).toHaveText(`${ONS_REGION_COUNT} in current reduction`);

    await page.getByLabel('Views').getByRole('button', { name: 'Reader', exact: true }).click();
    await expect(page.locator('[data-metric="ons-metadata-records-matching"] strong')).toHaveText(String(ONS_REGION_COUNT));
    await expect(page.locator('[data-detail-field="matched-records"]')).toHaveText(`${ONS_REGION_COUNT} in current reduction`);

    await page.getByRole('tab', { name: 'Results' }).click();
    await expect(page.getByRole('heading', { name: 'Search matches' })).toBeVisible();
    await expect(page.getByText('200 retrieved records.')).toBeVisible();
    expect(requests).not.toContain('/data/datasets.json');
    await page.getByRole('tab', { name: 'Facets' }).click();

    const firstResult = page.locator('.result-list').getByRole('button').first();
    const firstResultTitle = await firstResult.locator('strong').innerText();
    await facetSegment(page, 'state', 'published').click();
    await expect(page.locator('.right-panel').getByRole('heading', { name: 'published' })).toBeVisible();
    await firstResult.click();
    const rightPanel = page.locator('.right-panel');
    await expect(rightPanel.getByRole('heading', { name: firstResultTitle })).toBeVisible();
    await expect(rightPanel.getByRole('button', { name: 'Load full record' })).toBeVisible();
    expect(requests).not.toContain('/data/datasets.json');

    await expect(page.locator('[data-metric="active-filters"] strong')).toHaveText('1');
    expect(ONS_RECORD_COUNT).toBeGreaterThan(ONS_REGION_COUNT);
  });

  test('FACET-E2E-07 distinguishes the governed snapshot from a bounded reviewed live reference', async ({ page }) => {
    const requests: string[] = [];
    await installOnsFacetFixture(page.context(), requests);
    await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#overview`);
    await waitForFixtureReady(page);

    const bundleProviderStatus = page.locator(
      '.stage [data-provider-datapack="ons-explore-local-statistics"][data-provider-scope="bundle"]'
    );
    await expect(bundleProviderStatus).toHaveCount(1);
    await expect(
      page.locator(
        '[data-provider-datapack="ons-explore-local-statistics"][data-provider-scope="bundle"]'
      )
    ).toHaveCount(1);
    await expect(bundleProviderStatus).toHaveAttribute('data-comparison-status', 'known-drift');
    await expect(bundleProviderStatus.getByText('Known snapshot/live difference')).toBeVisible();
    await expect(bundleProviderStatus.getByText('Governed snapshot', { exact: true })).toHaveCount(1);
    await expect(bundleProviderStatus).toContainText('revision as of 22 Jul 2026');
    await expect(bundleProviderStatus).toContainText('Review checked 23 Jul 2026');
    const bundleLiveAction = bundleProviderStatus.getByRole('link', {
      name: 'Open live service on ONS Explore Local Statistics (external)'
    });
    await expect(bundleLiveAction).toHaveAttribute(
      'href',
      'https://www.ons.gov.uk/explore-local-statistics/'
    );
    await expect(bundleLiveAction).toHaveClass(/primary-provider-action/);
    await expect(
      bundleProviderStatus.getByRole('link', {
        name: 'Open live indicator on ONS Explore Local Statistics (external)'
      })
    ).toHaveCount(0);

    await page.goto(
      `?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_ALIGNED_RECORD_NAME}`
    );
    await page.getByText('Preparing static search index...').waitFor({ state: 'hidden' });
    const rightPanel = page.locator('.right-panel');
    const alignedProviderStatus = rightPanel.locator(
      '[data-provider-datapack="ons-explore-local-statistics"][data-provider-scope="record"]'
    );
    await expect(alignedProviderStatus).toHaveAttribute(
      'data-comparison-status',
      'aligned-reviewed-fields'
    );
    await expect(alignedProviderStatus.getByText('Aligned in reviewed fields')).toBeVisible();
    await expect(alignedProviderStatus).toContainText(
      'No difference was recorded in the reviewed fields for this record. This is not an exhaustive live comparison.'
    );
    await expect(alignedProviderStatus).not.toContainText(
      'Average house price extends to May 2026'
    );

    await page.goto(
      `?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_UNREVIEWED_RECORD_NAME}`
    );
    await page.getByText('Preparing static search index...').waitFor({ state: 'hidden' });
    const unreviewedProviderStatus = rightPanel.locator(
      '[data-provider-datapack="ons-explore-local-statistics"][data-provider-scope="record"]'
    );
    await expect(unreviewedProviderStatus).toHaveAttribute(
      'data-comparison-status',
      'not-reviewed'
    );
    await expect(
      unreviewedProviderStatus.getByText('Record alignment not reviewed')
    ).toBeVisible();
    await expect(unreviewedProviderStatus).toContainText(
      'This record matches the provider datapack, but it was not one of the reviewed comparison examples.'
    );
    await expect(unreviewedProviderStatus).not.toContainText(
      'Average house price extends to May 2026'
    );
    await expect(unreviewedProviderStatus.locator('[data-provider-snapshot-coverage]')).toHaveCount(
      0
    );
    await expect(
      unreviewedProviderStatus.getByRole('link', {
        name: 'Open live indicator on ONS Explore Local Statistics (external)'
      })
    ).toHaveAttribute(
      'href',
      'https://www.ons.gov.uk/explore-local-statistics/indicators/record-3'
    );

    await page.goto(
      `?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_RECORD_NAME}`
    );
    await page.getByPlaceholder('Search ONS products, concepts and geographies').waitFor();
    await page.getByText('Preparing static search index...').waitFor({ state: 'hidden' });

    await expect(rightPanel.getByRole('heading', { name: 'Average house price' })).toBeVisible();
    const providerStatus = rightPanel.locator(
      '[data-provider-datapack="ons-explore-local-statistics"][data-provider-scope="record"]'
    );
    await expect(providerStatus).toHaveAttribute('data-comparison-status', 'known-drift');
    await expect(providerStatus.getByText('Known snapshot/live difference')).toBeVisible();
    await expect(providerStatus).toContainText(
      'The reviewed upstream reference is newer than the governed metadata snapshot.'
    );
    await expect(providerStatus.locator('[data-provider-snapshot-coverage]')).toContainText(
      'April 2026'
    );
    await expect(providerStatus.locator('[data-provider-reviewed-coverage]')).toContainText(
      'May 2026'
    );
    await expect(providerStatus).toContainText('External, not live-validated here.');

    const liveAction = providerStatus.getByRole('link', {
      name: 'Open live indicator on ONS Explore Local Statistics (external)'
    });
    await expect(liveAction).toHaveAttribute(
      'href',
      'https://www.ons.gov.uk/explore-local-statistics/indicators/average-house-price'
    );
    await expect(liveAction).toHaveAttribute('target', '_blank');
    await expect(liveAction).toHaveAttribute('rel', 'noopener noreferrer');

    await providerStatus.getByText('Snapshot and review evidence').click();
    await expect(providerStatus).toContainText(
      'Reviewed record examples only; not an exhaustive comparison of all 108 provider records.'
    );
    await expect(providerStatus).toContainText(
      'Must be validated by the external provider at the time of use.'
    );

    // The provider datapack is loaded with the control plane; the full record
    // and its resources remain lazy until explicitly requested.
    expect(requests).not.toContain('/data/datasets.json');
    await rightPanel.getByRole('button', { name: 'Load full record' }).click();
    await expect.poll(() => requests.includes('/data/datasets.json')).toBe(true);
    await expect.poll(() => requests.includes('/data/resources.json')).toBe(true);
    const detailTabs = rightPanel.getByRole('tablist', { name: 'Data card sections' });
    await detailTabs.getByRole('tab', { name: 'Evidence' }).click();
    const resourceDisclosure = rightPanel
      .locator('details')
      .filter({ hasText: 'Source/access resources (1)' });
    await resourceDisclosure.locator('summary').click();
    await resourceDisclosure
      .getByRole('button', { name: /Explore Local Statistics indicator page/ })
      .click();

    await expect(
      rightPanel.getByRole('heading', { name: 'Explore Local Statistics indicator page' })
    ).toBeVisible();
    const resourceStatus = rightPanel.locator(
      `[data-provider-datapack="ons-explore-local-statistics"][data-provider-scope="resource"]`
    );
    await expect(resourceStatus.locator('[data-provider-snapshot-coverage]')).toContainText(
      'April 2026'
    );
    await expect(resourceStatus.getByRole('link', {
      name: 'Open live indicator on ONS Explore Local Statistics (external)'
    })).toHaveAttribute(
      'href',
      'https://www.ons.gov.uk/explore-local-statistics/indicators/average-house-price'
    );
    expect(ELS_RESOURCE_ID).toBe('els-average-house-price-source');
  });

  test('FACET-E2E-08 keeps every node label visible and cycles only conflicting edge labels', async ({ page }) => {
    await openOnsFacetFixture(page);
    await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_RECORD_NAME}`);
    await waitForFixtureReady(page);
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    await expect(graph).toBeVisible();
    await expect(page.locator('.graph-summary')).toContainText('21 nodes · 20 relationships');

    const edgeLabels = graph.locator('.edge-label');
    expect(await edgeLabels.count()).toBeGreaterThan(0);
    await expect(graph.locator('.graph-node-label > text')).toHaveCount(21);
    const nodeLabelRoutes = () => graph.locator('.graph-node-label').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-label-route'))
    );
    const firstNodeLabels = await nodeLabelRoutes();
    await page.waitForTimeout(2100);
    expect(await nodeLabelRoutes()).toEqual(firstNodeLabels);

    const labels = graph.locator('.graph-node-label > text, .edge-label');
    const paintedLabelHitBorders = await graph.locator('.label-hit').evaluateAll((elements) =>
      elements.filter((element) => {
        const style = getComputedStyle(element);
        return Number.parseFloat(style.strokeWidth) > 0 && style.stroke !== 'none';
      }).length
    );
    expect(paintedLabelHitBorders).toBe(0);

    const overlappingPairs = await labels.evaluateAll((elements) => {
      const boxes = elements.map((element) => element.getBoundingClientRect());
      const overlaps: Array<Array<{ text: string; classes: string; x: string | null; y: string | null }>> = [];
      for (let left = 0; left < boxes.length; left += 1) {
        for (let right = left + 1; right < boxes.length; right += 1) {
          const a = boxes[left];
          const b = boxes[right];
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
            overlaps.push([
              {
                text: elements[left]?.textContent?.trim() || '',
                classes: elements[left]?.getAttribute('class') || '',
                x: elements[left]?.getAttribute('x'),
                y: elements[left]?.getAttribute('y')
              },
              {
                text: elements[right]?.textContent?.trim() || '',
                classes: elements[right]?.getAttribute('class') || '',
                x: elements[right]?.getAttribute('x'),
                y: elements[right]?.getAttribute('y')
              }
            ]);
          }
        }
      }
      return overlaps;
    });
    expect(overlappingPairs).toEqual([]);
  });

  test('FACET-E2E-09 filters the key and uses ordered relationship regions', async ({ page }) => {
    await openOnsFacetFixture(page);
    await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_RECORD_NAME}`);
    await waitForFixtureReady(page);
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    const summary = page.locator('.graph-summary');
    const legend = page.getByLabel('Node type key');
    await expect(graph).toBeVisible();
    await expect(summary).toContainText('21 nodes · 20 relationships');
    await expect(legend.getByRole('button')).toHaveCount(7);
    for (const type of ['ONS metadata record', 'publisher', 'source/access resource', 'formats', 'topic', 'licence', 'tag']) {
      await expect(legend).toContainText(type);
    }
    await expect(legend).not.toContainText('link stack');
    await expect(legend).not.toContainText('record type stack');
    await expect(legend).not.toContainText('opened stack group');
    await expect(legend).not.toContainText('host/other');

    const leftLabelPlacements = await graph.locator('.graph-node[data-relationship-side="left"]').evaluateAll((groups) =>
      groups.flatMap((group) => {
        const route = group.getAttribute('data-route');
        const label = (group as SVGGElement).ownerSVGElement?.querySelector(`.graph-node-label[data-label-route="${CSS.escape(route || '')}"] > text`) as SVGGraphicsElement | null;
        const symbol = group.querySelector(':scope > .node-symbol, :scope > .resource-card, :scope > .dataset-card, :scope > .stack-card') as SVGGraphicsElement | null;
        if (!route || !label || !symbol) return [];
        const labelBox = label.getBBox();
        const symbolBox = symbol.getBBox();
        return [{
          route,
          labelLeft: labelBox.x,
          labelRight: labelBox.x + labelBox.width,
          labelCenterY: labelBox.y + labelBox.height / 2,
          nodeLeft: symbolBox.x,
          nodeCenterY: symbolBox.y + symbolBox.height / 2
        }];
      })
    );
    expect(leftLabelPlacements).toHaveLength(8);
    const preferredLeftPlacements = leftLabelPlacements.filter((placement) => (
      placement.labelLeft < placement.nodeLeft
      && placement.labelRight <= placement.nodeLeft + 1
      && Math.abs(placement.labelCenterY - placement.nodeCenterY) <= 7
    ));
    expect(preferredLeftPlacements).toHaveLength(leftLabelPlacements.length);

    const relationshipGeometry = await graph.evaluate((svg) => {
      const measurements = (side: string) => [...svg.querySelectorAll(`.graph-node[data-relationship-side="${side}"]`)]
        .flatMap((group) => {
          const route = group.getAttribute('data-route');
          const symbol = group.querySelector(':scope > .node-symbol, :scope > .resource-card, :scope > .dataset-card, :scope > .stack-card') as SVGGraphicsElement | null;
          const label = svg.querySelector(`.graph-node-label[data-label-route="${CSS.escape(route || '')}"] > text`) as SVGGraphicsElement | null;
          if (!route || !symbol || !label) return [];
          const symbolBox = symbol.getBBox();
          const labelBox = label.getBBox();
          return [{
            route,
            symbolLeft: symbolBox.x,
            symbolRight: symbolBox.x + symbolBox.width,
            symbolX: symbolBox.x + symbolBox.width / 2,
            symbolY: symbolBox.y + symbolBox.height / 2,
            symbolTop: symbolBox.y,
            symbolBottom: symbolBox.y + symbolBox.height,
            labelLeft: labelBox.x,
            labelRight: labelBox.x + labelBox.width,
            labelCenterY: labelBox.y + labelBox.height / 2
          }];
        });
      return {
        viewBoxWidth: (svg as SVGSVGElement).viewBox.baseVal.width,
        viewBoxHeight: (svg as SVGSVGElement).viewBox.baseVal.height,
        left: measurements('left'),
        top: measurements('top'),
        right: measurements('right'),
        documentAnchors: ['dataset', 'publisher', 'license'].map((type) => {
          const group = svg.querySelector(`.graph-node[data-type="${type}"]`) as SVGGElement;
          const symbol = group.querySelector(':scope > .node-symbol, :scope > .dataset-card') as SVGGraphicsElement;
          const box = symbol.getBBox();
          return { type, x: box.x + box.width / 2, y: box.y + box.height / 2 };
        })
      };
    });
    const leftRows = relationshipGeometry.left.map((item) => item.symbolY).sort((a, b) => a - b);
    expect(Math.max(...leftRows.slice(1).map((value, index) => value - leftRows[index]))).toBeLessThanOrEqual(50);
    expect(relationshipGeometry.top).toHaveLength(8);
    expect(relationshipGeometry.top.filter((item) => !(
      Math.abs(item.labelCenterY - item.symbolY) <= 7
      && (item.labelRight <= item.symbolLeft + 1 || item.labelLeft >= item.symbolRight - 1)
    ))).toEqual([]);
    expect(Math.max(...relationshipGeometry.top.map((item) => item.symbolX))
      - Math.min(...relationshipGeometry.top.map((item) => item.symbolX))).toBeGreaterThan(relationshipGeometry.viewBoxWidth * 0.42);
    const centre = relationshipGeometry.documentAnchors.find((item) => item.type === 'dataset')!;
    const publisher = relationshipGeometry.documentAnchors.find((item) => item.type === 'publisher')!;
    const licence = relationshipGeometry.documentAnchors.find((item) => item.type === 'license')!;
    expect(publisher.x).toBeLessThan(centre.x);
    expect(licence.x).toBeGreaterThan(centre.x);
    expect(publisher.y).toBeGreaterThan(centre.y);
    expect(licence.y).toBeGreaterThan(centre.y);
    expect(Math.abs(publisher.y - licence.y)).toBeLessThanOrEqual(1);
    await expect(graph.locator('.graph-focus-title')).toContainText('Average house price');

    // The fixture supplies no quantitative relationship strength. Uniform
    // lines therefore remain neutral rather than implying unsupported weights.
    await expect(summary).not.toContainText('line weight');
    expect(await graph.locator('.graph-edge').evaluateAll((edges) =>
      [...new Set(edges.map((edge) => edge.getAttribute('data-edge-width')))]
    )).toHaveLength(1);
  });

  test('FACET-E2E-10A compacts graph controls and links node and relationship keys to the graph', async ({ page }) => {
    await openOnsFacetFixture(page);
    await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_RECORD_NAME}`);
    await waitForFixtureReady(page);
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    const labelsButton = page.getByRole('button', { name: /^Pause cycling graph labels/ });
    await expect(labelsButton).toContainText(/^Labels \(\d+\/\d+\)$/);
    await labelsButton.click();
    const pausedLabelsButton = page.getByRole('button', { name: /^Resume cycling graph labels/ });
    await expect(pausedLabelsButton).toContainText(/^Labels \(\d+\/\d+\)$/);
    await expect(graph.locator('.graph-node-label').first()).toBeVisible();
    const pausedSet = await pausedLabelsButton.textContent();
    await page.waitForTimeout(2200);
    await expect(pausedLabelsButton).toHaveText(pausedSet || '');
    await expect.poll(() => new URL(page.url()).searchParams.get('graph.labels')).toBe('off');
    await pausedLabelsButton.click();

    const nodeKey = page.getByLabel('Node type key');
    await expect(nodeKey.getByRole('button', { name: /focus$/ })).toHaveAttribute('aria-disabled', 'true');
    const retainedTopicPosition = await graph.locator('.graph-node[data-type="topic"]').first().evaluate((node) => {
      const symbol = node.querySelector('.node-symbol') as SVGGraphicsElement;
      const box = symbol.getBBox();
      return { x: box.x, y: box.y };
    });
    await nodeKey.getByRole('button', { name: /^tag 8$/ }).click();
    await expect(page.locator('.graph-summary')).toContainText('13 nodes · 12 relationships');
    await expect(nodeKey.getByRole('button', { name: /^tag 8$/ })).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => new URL(page.url()).searchParams.getAll('graph.hideType')).toEqual(['tag']);
    expect(await graph.locator('.graph-node[data-type="topic"]').first().evaluate((node) => {
      const symbol = node.querySelector('.node-symbol') as SVGGraphicsElement;
      const box = symbol.getBBox();
      return { x: box.x, y: box.y };
    })).toEqual(retainedTopicPosition);
    await nodeKey.getByRole('button', { name: /^tag 8$/ }).click();

    const layoutButton = page.getByRole('button', { name: 'Layout', exact: true });
    await layoutButton.click();
    const layoutControls = page.getByRole('region', { name: 'Relationship layout' });
    await expect(layoutControls).toBeVisible();
    await layoutControls.getByRole('button', { name: 'By relationship', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('graph.layout')).toBe('relationships');
    await layoutControls.getByRole('button', { name: 'Auto', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('graph.layout')).toBeNull();

    await page.getByRole('button', { name: 'Relationships (20)', exact: true }).click();
    const relationshipKey = page.getByLabel('Relationship type key');
    const classifiedAs = relationshipKey.getByRole('button', { name: /^classified as from focus · 8$/ });
    await classifiedAs.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('graph.relationship')).toBe('outgoing:classified as');
    await expect(graph.locator('.graph-edge.highlight')).toHaveCount(8);
    await expect(graph.locator('.graph-node.relationship-source')).toHaveCount(1);
    await expect(graph.locator('.graph-node.relationship-target')).toHaveCount(8);
    await expect(page.getByRole('tablist', { name: 'Relationship data card' }).getByRole('tab'))
      .toHaveText(['Source', 'Relationship', 'Target']);
    await page.getByRole('tab', { name: 'Source', exact: true }).click();
    await expect(page.getByRole('tabpanel').last()).toContainText('Source of the selected relationship');

    await classifiedAs.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('graph.relationship')).toBeNull();
    await expect(graph.locator('.graph-edge.highlight')).toHaveCount(0);
    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('graph.relationship')).toBe('outgoing:classified as');
    await expect(graph.locator('.graph-edge.highlight')).toHaveCount(8);
    await expect(page.getByRole('tablist', { name: 'Relationship data card' })).toBeVisible();

    await graph.locator('.edge-hit').first().click();
    await expect(graph.locator('.graph-edge.selected')).toHaveCount(1);
    await expect(graph.locator('.graph-node.relationship-source')).toHaveCount(1);
    await expect(graph.locator('.graph-node.relationship-target')).toHaveCount(1);
    await expect(page.getByRole('tablist', { name: 'Relationship data card' })).toBeVisible();
    expect(await graph.locator('.edge-hit').first().evaluate((edge) => getComputedStyle(edge).outlineStyle)).toBe('none');
  });

  test('FACET-E2E-11 keeps controls available, scrolls normally, and sizes both collapsed rails', async ({ page }) => {
    await openOnsFacetFixture(page);
    await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_RECORD_NAME}`);
    await waitForFixtureReady(page);
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const stage = page.locator('.stage');
    const toolbar = page.locator('.graph-toolbar');
    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    await expect(graph).toBeVisible();
    expect(await toolbar.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');

    const initialViewBox = await graph.getAttribute('viewBox');
    const graphBox = await graph.boundingBox();
    expect(graphBox).not.toBeNull();
    await page.mouse.move(graphBox!.x + graphBox!.width / 2, graphBox!.y + Math.min(160, graphBox!.height / 2));
    await page.mouse.wheel(0, 420);
    await expect.poll(() => stage.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await graph.getAttribute('viewBox')).toBe(initialViewBox);

    const stickyTop = (await toolbar.boundingBox())!.y;
    await stage.evaluate((element) => { element.scrollTop += 260; });
    await expect.poll(async () => Math.round((await toolbar.boundingBox())!.y)).toBe(Math.round(stickyTop));

    await graph.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
    await expect(graph).not.toHaveAttribute('viewBox', initialViewBox || '');

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page.getByRole('button', { name: 'Toggle details' }).click();
    const railWidths = await page.evaluate(() => ({
      left: document.querySelector('.left-panel')!.getBoundingClientRect().width,
      right: document.querySelector('.right-panel')!.getBoundingClientRect().width
    }));
    expect(railWidths.left).toBeCloseTo(44, 0);
    expect(railWidths.right).toBeCloseTo(44, 0);
  });

  test('FACET-E2E-13 recentres inspected graph records and restores the prior graph with Back', async ({ page }) => {
    await openOnsFacetFixture(page);
    const originalCenterRoute = `dataset/${ELS_RECORD_NAME}`;
    await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#${originalCenterRoute}`);
    await waitForFixtureReady(page);
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    const publisherNode = graph.locator('.graph-node[data-type="publisher"]').first();
    await expect(publisherNode).toBeVisible();
    const inspectedRoute = await publisherNode.getAttribute('data-route');
    expect(inspectedRoute).toBeTruthy();
    await graph.locator(`.graph-node-label[data-label-route="${inspectedRoute}"]`).click();

    await expect.poll(() => new URL(page.url()).searchParams.get('graph.center')).toBe(originalCenterRoute);
    await expect.poll(() => decodeURIComponent(new URL(page.url()).hash.slice(1))).toBe(inspectedRoute);
    await page.locator('.right-panel').getByRole('button', { name: 'Graph', exact: true }).click();

    await expect.poll(() => new URL(page.url()).searchParams.get('graph.center')).toBeNull();
    await expect.poll(() => decodeURIComponent(new URL(page.url()).hash.slice(1))).toBe(inspectedRoute);
    const graphBox = await graph.boundingBox();
    const focusBox = await graph
      .locator(`.graph-node[data-route="${inspectedRoute}"] .node-symbol`)
      .boundingBox();
    expect(graphBox).not.toBeNull();
    expect(focusBox).not.toBeNull();
    expect(focusBox!.x + focusBox!.width / 2).toBeCloseTo(graphBox!.x + graphBox!.width / 2, 0);
    expect(focusBox!.y + focusBox!.height / 2).toBeCloseTo(graphBox!.y + graphBox!.height * 0.53, -1);

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('graph.center')).toBe(originalCenterRoute);
    await expect.poll(() => decodeURIComponent(new URL(page.url()).hash.slice(1))).toBe(inspectedRoute);
    await expect(page.locator('.right-panel').getByRole('button', { name: 'Graph', exact: true })).toBeVisible();
  });

  test('FACET-E2E-14 keeps the compact bundle loader beside the title and groups facet actions', async ({ page }) => {
    await page.setViewportSize({ width: 907, height: 705 });
    await openOnsFacetFixture(page);

    const title = await page.locator('.title-block').boundingBox();
    const loader = await page.locator('.bundle-form').boundingBox();
    expect(title).not.toBeNull();
    expect(loader).not.toBeNull();
    expect(Math.abs((title!.y + title!.height / 2) - (loader!.y + loader!.height / 2))).toBeLessThan(12);
    expect(loader!.width).toBeLessThanOrEqual(420);

    const actions = page.locator('.facet-toolbar-actions');
    await expect(actions.getByRole('button')).toHaveText(['Guidance', 'Clear filters', 'Reset facet layout']);
    const clear = await actions.getByRole('button', { name: 'Clear filters', exact: true }).boundingBox();
    const reset = await actions.getByRole('button', { name: 'Reset facet layout', exact: true }).boundingBox();
    expect(clear).not.toBeNull();
    expect(reset).not.toBeNull();
    expect(Math.abs(clear!.y - reset!.y)).toBeLessThan(4);
    expect(reset!.x - (clear!.x + clear!.width)).toBeLessThanOrEqual(6);
  });

  test('FACET-E2E-15 keeps graph targets tight and subgroups a full-match stack', async ({ page }) => {
    await openOnsFacetFixture(page);
    await facetSegment(page, 'geography_level', 'region').dblclick();
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    const stack = graph.locator('.graph-node[data-type="record-type-stack"]');
    await expect(stack).toHaveCount(1);
    const stackRoute = await stack.getAttribute('data-route');
    expect(stackRoute).toBeTruthy();
    await expect(stack).toHaveAttribute(
      'aria-label',
      `All loaded matches (200 of ${ONS_REGION_COUNT} ONS metadata records)`
    );
    await expect(graph.locator(`.graph-node-label[data-label-route="${stackRoute}"]`))
      .toContainText(`All loaded matches (200 of ${ONS_REGION_COUNT}`);

    await page.goto(`?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#dataset/${ELS_RECORD_NAME}`);
    await waitForFixtureReady(page);
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
    const tagNode = graph.locator('.graph-node[data-type="tag"]').first();
    const tagRoute = await tagNode.getAttribute('data-route');
    expect(tagRoute).toBeTruthy();
    const hitBox = await tagNode.locator('.node-hit').boundingBox();
    expect(hitBox).not.toBeNull();
    expect(hitBox!.width).toBeLessThanOrEqual(56);
    expect(hitBox!.height).toBeLessThanOrEqual(56);
    await expect(graph.locator('.cluster-hit')).toHaveCount(0);
    expect(await graph.locator(`.graph-node-label[data-label-route="${tagRoute}"]`).evaluate((label) => (
      getComputedStyle(label).pointerEvents
    ))).toBe('all');

    await facetSegment(page, 'geography_level', 'region').dblclick();
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
    const aggregate = graph.locator('.graph-node[data-type="record-type-stack"]');
    const aggregateRoute = await aggregate.getAttribute('data-route');
    expect(aggregateRoute).toBeTruthy();
    await graph.locator(`.graph-node-label[data-label-route="${aggregateRoute}"]`).click();
    await expect(graph.locator('.graph-node[data-type="dataset"]')).toHaveCount(0);
    await expect(graph.locator('.graph-node[data-type="facet-stack"]')).toHaveCount(8);
    await expect(page.locator('.graph-caption')).toContainText('Grouped by derivation mode');
    const hierarchy = page.getByRole('navigation', { name: 'Open graph hierarchy' });
    await expect(hierarchy).toBeVisible();
    await expect(hierarchy).toContainText(`All matching ONS metadata records (${ONS_REGION_COUNT})`);
    await expect(hierarchy.locator('[data-hierarchy-dimension="derivation_mode"]')).toContainText('Shown in the graph below');
    await expect(hierarchy.locator('[aria-current="step"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => new URL(location.href).searchParams.getAll('graph.stack')))
      .toEqual([aggregateRoute]);

    const subgroup = graph.locator('.graph-node[data-type="facet-stack"]').first();
    const subgroupRoute = await subgroup.getAttribute('data-route');
    const siblingRoute = await graph.locator('.graph-node[data-type="facet-stack"]').nth(1).getAttribute('data-route');
    expect(subgroupRoute).toBeTruthy();
    expect(siblingRoute).toBeTruthy();
    await subgroup.click();
    await expect(page.locator('.graph-caption')).toContainText('Grouped by frequency');
    await expect(graph.locator('.graph-node[data-type="dataset"]')).toHaveCount(0);
    await expect(hierarchy.locator(`[data-stack-route="${subgroupRoute}"]`)).toHaveAttribute('aria-current', 'step');
    await expect(hierarchy.locator(`[data-stack-route="${subgroupRoute}"]`)).toContainText('Open below');
    await expect(hierarchy.locator('[data-hierarchy-dimension="frequency"]')).toContainText('Shown in the graph below');
    await expect(graph.locator(`.graph-node[data-route="${siblingRoute}"]`)).toHaveCount(0);
    await expect(hierarchy.locator(`[data-stack-route="${siblingRoute}"]`)).toBeVisible();
    await expect(page.locator('.relationship-rows')).not.toContainText('facet-stack%2F');
    await expect.poll(() => page.evaluate(() => new URL(location.href).searchParams.getAll('graph.stack')))
      .toEqual([aggregateRoute, subgroupRoute]);

    await page.goBack();
    await expect(page.locator('.graph-caption')).toContainText('Grouped by derivation mode');
    await expect(graph.locator('.graph-node[data-type="facet-stack"]')).toHaveCount(8);
    await expect(hierarchy.locator('[data-hierarchy-dimension="derivation_mode"]')).toContainText('Shown in the graph below');
    await expect(hierarchy.locator('[aria-current="step"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => new URL(location.href).searchParams.getAll('graph.stack')))
      .toEqual([aggregateRoute]);

    await page.goBack();
    await expect(graph.locator('.graph-node[data-type="record-type-stack"]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => new URL(location.href).searchParams.getAll('graph.stack')))
      .toEqual([]);
  });

  test('FACET-E2E-16 pairs one dense relationship list across the focus', async ({ page }) => {
    await openOnsFacetFixture(page);
    await facetSegment(page, 'geography_level', 'local authority').dblclick();
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    await expect(graph.locator('.graph-node[data-type="dataset"]')).toHaveCount(12);
    const geometry = await graph.evaluate((svg) => {
      const rows = [...svg.querySelectorAll('.graph-node[data-type="dataset"]')].flatMap((group) => {
        const route = group.getAttribute('data-route');
        const side = group.getAttribute('data-relationship-side');
        const symbol = group.querySelector(':scope > .dataset-card') as SVGGraphicsElement | null;
        const label = svg.querySelector(`.graph-node-label[data-label-route="${CSS.escape(route || '')}"] > text`) as SVGGraphicsElement | null;
        if (!route || !side || !symbol || !label) return [];
        const symbolBox = symbol.getBBox();
        const labelBox = label.getBBox();
        return [{
          side,
          x: symbolBox.x + symbolBox.width / 2,
          y: symbolBox.y + symbolBox.height / 2,
          symbolLeft: symbolBox.x,
          symbolRight: symbolBox.x + symbolBox.width,
          labelLeft: labelBox.x,
          labelRight: labelBox.x + labelBox.width
        }];
      });
      return { width: (svg as SVGSVGElement).viewBox.baseVal.width, rows };
    });
    const left = geometry.rows.filter((row) => row.side === 'left').sort((a, b) => a.y - b.y);
    const right = geometry.rows.filter((row) => row.side === 'right').sort((a, b) => a.y - b.y);
    expect(left).toHaveLength(6);
    expect(right).toHaveLength(6);
    expect(
      left.every((row) => row.x < geometry.width / 2 && row.labelRight <= row.symbolLeft + 1),
      JSON.stringify(left)
    ).toBe(true);
    expect(
      right.every((row) => row.x > geometry.width / 2 && row.labelLeft >= row.symbolRight - 1),
      JSON.stringify(right)
    ).toBe(true);
    expect(left.map((row) => Math.round(row.y))).toEqual(right.map((row) => Math.round(row.y)));
  });
});
