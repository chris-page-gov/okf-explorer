import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ONS_FACET_BUNDLE_URL, installOnsFacetFixture, openOnsFacetFixture } from './fixtures/ons-facets.fixture';

const bundle = 'urn:fixture:ontology';
const rdfs = 'http://www.w3.org/2000/01/rdf-schema#';
const skos = 'http://www.w3.org/2004/02/skos/core#';
const identifiers = {
  service: 'urn:fixture:service', libraries: 'urn:fixture:libraries', transport: 'urn:fixture:transport', buses: 'urn:fixture:buses',
  resource: 'urn:fixture:resource', file: 'urn:fixture:file',
  scheme: 'urn:fixture:formats', csv: 'urn:fixture:csv'
};
const term = (id: string, kind: string, label: string) => ({ id, kinds: [kind], labels: [{ value: label, language: 'en-GB' }] });
const edge = (from: string, predicate: string, to: string) => ({ from, predicate, to });
const index = JSON.stringify({
  schema: 'okf-ontology-navigation-index.v1', source: bundle, graph_sha256: 'c'.repeat(64),
  terms: [
    term(identifiers.service, 'class', 'Public services'), term(identifiers.libraries, 'class', 'Libraries'),
    term(identifiers.transport, 'class', 'Transport'), term(identifiers.buses, 'class', 'Buses'),
    term(identifiers.resource, 'property', 'Source resource'), term(identifiers.file, 'property', 'Open file'),
    term(identifiers.scheme, 'scheme', 'Formats'), term(identifiers.csv, 'concept', 'CSV')
  ],
  relationships: [
    edge(identifiers.libraries, rdfs + 'subClassOf', identifiers.service),
    edge(identifiers.transport, rdfs + 'subClassOf', identifiers.service),
    edge(identifiers.buses, rdfs + 'subClassOf', identifiers.transport),
    edge(identifiers.file, rdfs + 'subPropertyOf', identifiers.resource),
    edge(identifiers.csv, skos + 'inScheme', identifiers.scheme)
  ],
  mappings: ['exact', 'close', 'broad', 'narrow', 'related'].map(strength => ({
    ...edge(identifiers.csv, skos + strength + 'Match', 'https://terms.fixture.test/' + strength), strength
  }))
});
const options = {
  governedPublication: {
    bundle, entrypoints: { ontology_navigation: {
      path: 'ontology/index.json', bytes: Buffer.byteLength(index), sha256: createHash('sha256').update(index).digest('hex')
    } },
    resources: { '/ontology/index.json': index }
  }
};

test('Ontology shares direct hierarchy filters and preserves the declared scope', async ({ page }) => {
  await openOnsFacetFixture(page, [], options);
  await page.getByRole('link', { name: 'Browse ontology' }).click();
  await expect(page.getByRole('heading', { name: 'Ontology', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Classes', exact: true }).click();
  const results = page.getByRole('region', { name: 'Matching ontology terms' });
  await expect(results).toContainText('4 matching terms');
  await results.getByRole('link', { name: 'Public services', exact: true }).click();
  await page.getByRole('link', { name: 'Filter results to all direct children' }).click();
  await expect(results).toContainText('2 matching terms');
  await expect(results.getByRole('link', { name: 'Buses', exact: true })).toHaveCount(0);
  await expect(results.getByRole('link', { name: 'Libraries', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Showing direct children of', { exact: false })).toBeVisible();
  await expect(results).toContainText('2 matching terms');
  await page.getByRole('link', { name: 'Clear hierarchy filter' }).click();
  await page.getByRole('link', { name: 'Properties', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search by term label or identifier' }).fill('open file');
  await page.getByRole('button', { name: 'Search terms' }).click();
  await expect(results).toContainText('1 matching term');
  await results.getByRole('link', { name: 'Open file' }).click();
  await expect(page.getByRole('article').getByText('Superproperty', { exact: false })).toBeVisible();
  await page.getByRole('article').getByRole('link', { name: 'Source resource' }).click();
  await expect(page.getByRole('heading', { name: 'Source resource' })).toBeVisible();
});

test('Ontology keeps each mapping strength and supports dark, narrow keyboard browsing', async ({ context, page, baseURL }) => {
  await installOnsFacetFixture(context, [], options);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 320, height: 800 });
  const start = new URL('../ontology/', baseURL);
  start.search = new URLSearchParams({ bundle: ONS_FACET_BUNDLE_URL, kind: 'scheme', term: identifiers.scheme }).toString();
  await page.goto(start.href);
  const heading = page.getByRole('heading', { name: 'Formats' });
  await expect(heading).toBeVisible();
  const scheme = page.getByRole('article', { name: 'Formats' });
  const member = scheme.getByRole('link', { name: 'CSV', exact: true });
  await member.focus();
  await page.keyboard.press('Enter');
  const concept = page.getByRole('article', { name: 'CSV' });
  await expect(concept.getByText('Concept scheme', { exact: false })).toBeVisible();
  for (const strength of ['exact', 'close', 'broad', 'narrow', 'related']) {
    await expect(concept.getByText(strength + ' mapping', { exact: true })).toBeVisible();
  }
  await concept.getByRole('navigation', { name: 'Mapping strength' }).getByRole('link', { name: 'related', exact: true }).click();
  await expect(page).toHaveURL(/mapping=related/);
  await expect(concept.getByText('exact mapping', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(concept.getByText(skos + 'relatedMatch', { exact: true })).toBeVisible();
  await expect(concept.getByText('exact mapping', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});
