import { expect, test, type Page } from '@playwright/test';

import {
  ONS_RECORD_COUNT,
  ONS_REGION_COUNT,
  displayedFacetOrder,
  facetSection,
  facetSegment,
  facetValue,
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
});
