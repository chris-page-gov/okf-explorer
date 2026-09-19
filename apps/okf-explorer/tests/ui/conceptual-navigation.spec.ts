import { expect, test } from '@playwright/test';
import { facetSection, facetValue, openOnsFacetFixture } from './fixtures/ons-facets.fixture';

test('conceptual facets expose classification provenance and preserve selection across Graph and Timeline', async ({ page }) => {
  await openOnsFacetFixture(page, [], { conceptualClassification: true });
  await expect(page.getByRole('link', { name: 'Explorer changes', exact: true }))
    .toHaveAttribute('href', 'https://github.com/chris-page-gov/okf-explorer/blob/main/CHANGELOG.md');
  const topic = facetSection(page, 'topic');
  await topic.locator('.facet-toggle').click();
  await expect(topic).toContainText('topic is fixture metadata supplied by the ONS-shaped datapack.');
  const evidence = page.getByRole('note', { name: 'topic classification evidence' });
  await expect(evidence).toContainText('unreviewed');
  await expect(evidence).toContainText('Explicit text mentions');
  await expect(evidence).toContainText('420 of 420 records classified in the whole snapshot');
  await expect(evidence).toContainText('does not establish applicability');
  await facetValue(page, 'topic', 'Housing').click();
  await page.getByRole('button', { name: 'Keep highlighted', exact: true }).click();
  const scope = await page.getByText(/0 highlighted \/ \d+ in scope/, { exact: true }).first().textContent();
  await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Large corpus graph' })).toBeVisible();
  await expect(page.getByText(scope!, { exact: true }).first()).toBeVisible();
  await page.getByLabel('Views').getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page.getByLabel('Primary date role')).toBeVisible();
  await expect(page.locator('.timeline-counts')).toContainText('dated record groups');
  await expect(page.getByRole('region', { name: 'Dataset release series' })).toContainText('Catalogue metadata updated');
  await page.getByLabel('Primary date role').selectOption('source');
  await expect(page.getByText('No dates match this role in the current record selection.')).toBeVisible();
  await page.getByLabel('Primary date role').selectOption('audit');
  await expect(page.getByRole('region', { name: 'Dataset release series' })).toContainText('Catalogue metadata updated');
});
