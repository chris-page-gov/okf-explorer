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
    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeVisible();

    expect(await displayedFacetOrder(page)).toEqual([...suggestedFacetKeys]);
    await expect(facetSection(page, 'source_surface')).toHaveCount(0);
    for (const phantom of ['category', 'type_code', 'document_type']) {
      await expect(facetSection(page, phantom)).toHaveCount(0);
    }

    // Low-cardinality distributions are useful while closed, so every one is
    // present before a value list is opened. Their segments also expose a
    // categorical palette with deliberately alternating tones.
    for (const key of ['derivation_mode', 'frequency', 'geography_level', 'state', 'topic']) {
      await expect(facetToggle(page, key)).toHaveAttribute('aria-expanded', 'false');
      await expect(facetSection(page, key).locator('.facet-distribution-bar')).toBeVisible();
      await expect(facetSection(page, key).locator('.facet-distribution-segment').first()).toBeVisible();
      expect(requests).toContain(`/search/filter-${key}.json`);
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
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
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

  test('FACET-E2E-03 opens aggregate bars and replaces high cardinality with searchable examples', async ({ page }) => {
    await openOnsFacetFixture(page);

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

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await page.getByPlaceholder('Search ONS products, concepts and geographies').fill('no matching fixture term');
    await expect(facetSection(page, 'derivation_mode').locator('.facet-toggle small')).toHaveText('0 values');
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

    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Suggested', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Guidance', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('What makes a useful facet?')).toHaveCount(0);
    expect(await displayedFacetOrder(page)).toEqual([...suggestedFacetKeys]);
    await expect(facetSection(page, 'state')).toBeVisible();
    await expect(facetSection(page, 'source_surface')).toHaveCount(0);
  });

  test('FACET-E2E-06 preserves the exact nested geography count across Graph full hydration', async ({ page }) => {
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
    await expect(page.getByRole('img', { name: 'Large corpus graph' })).toBeVisible();
    await expect.poll(() => requests.includes('/data/datasets.json')).toBe(true);
    await expect(page.locator('[data-detail-field="matched-records"]')).toHaveText(`${ONS_REGION_COUNT} in current reduction`);

    await page.getByLabel('Views').getByRole('button', { name: 'Reader', exact: true }).click();
    await expect(page.locator('[data-metric="ons-metadata-records"] strong')).toHaveText(String(ONS_REGION_COUNT));
    await expect(page.locator('[data-detail-field="matched-records"]')).toHaveText(`${ONS_REGION_COUNT} in current reduction`);

    await page.getByRole('tab', { name: 'Results' }).click();
    await expect(page.getByRole('heading', { name: 'ONS metadata records in current reduction' })).toBeVisible();
    await expect(page.getByText(`${ONS_REGION_COUNT} records match the active search and filters.`)).toBeVisible();
    await page.getByRole('tab', { name: 'Facets' }).click();

    const firstResult = page.locator('.result-list').getByRole('button').first();
    const firstResultTitle = await firstResult.locator('strong').innerText();
    await facetSegment(page, 'state', 'published').click();
    await expect(page.locator('.right-panel').getByRole('heading', { name: 'published' })).toBeVisible();
    await firstResult.click();
    await expect(page.locator('.right-panel').getByRole('heading', { name: firstResultTitle })).toBeVisible();
    const detailTabs = page.getByRole('tablist', { name: 'Data card sections' });
    await expect(detailTabs.getByRole('tab')).toHaveText(['Overview', 'Evidence', 'Data']);
    await expect(detailTabs.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await detailTabs.getByRole('tab', { name: 'Evidence' }).click();
    await expect(detailTabs.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true');
    await detailTabs.getByRole('tab', { name: 'Data' }).click();
    await expect(detailTabs.getByRole('tab', { name: 'Data' })).toHaveAttribute('aria-selected', 'true');

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

    const graph = page.getByRole('img', { name: 'Large corpus graph' });
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

    const graph = page.getByRole('img', { name: 'Large corpus graph' });
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
          labelBottom: labelBox.y + labelBox.height,
          nodeLeft: symbolBox.x,
          nodeTop: symbolBox.y
        }];
      })
    );
    expect(leftLabelPlacements).toHaveLength(8);
    const preferredLeftPlacements = leftLabelPlacements.filter((placement) => (
      placement.labelLeft < placement.nodeLeft
      && placement.labelBottom <= placement.nodeTop + 1
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
            labelBottom: labelBox.y + labelBox.height
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
    expect(relationshipGeometry.top.every((item) => item.labelBottom <= item.symbolTop + 1)).toBe(true);
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

    const graph = page.getByRole('img', { name: 'Large corpus graph' });
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
    const graph = page.getByRole('img', { name: 'Large corpus graph' });
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
});
