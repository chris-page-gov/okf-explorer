import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext } from '@playwright/test';

const ORIGIN = 'https://relationship-pagination.fixture.test';
const BUNDLE = `${ORIGIN}/okf-explorer.json`;
const FOCUS = 'chapter/focus';
const SNAPSHOT = 'arbitrary-routes-and-late-relationships-v1';

async function installFixture(context: BrowserContext) {
  const records = [FOCUS, ...Array.from({ length: 211 }, (_, index) => `page/source/${index + 1}`)].map((route, index) => ({
    id: `${ORIGIN}/id/${route}`, route, name: route,
    title: index === 0 ? 'Focus chapter' : index === 211 ? 'Late routing source' : `Page ${String(index).padStart(3, '0')}`,
    notes: 'Synthetic fixture; no benefit rules.', publisher: 'fixture', publisher_title: 'Fixture publisher',
    resource_count: 0, resource_ids: [], formats: [], tags: [], topics: [],
    record_type: index === 0 ? 'Chapter' : 'Source page'
  }));
  const relationships = records.slice(1).map((record, index) => ({
    id: `${ORIGIN}/assertion/${index}`, source: record.route, target: FOCUS,
    source_iri: record.id, target_iri: records[0].id,
    predicate: `https://example.test/vocab/${index === 210 ? 'routesTo' : 'references'}`,
    kind: index === 210 ? 'routes to' : 'references', label: index === 210 ? 'routes to' : 'references',
    assertion_status: 'normalized', assertion_scope: 'documentary',
    authority: { class: 'derived', label: 'Synthetic routing fixture', source: ORIGIN },
    evidence: [{ url: `${ORIGIN}/evidence/${index}`, locator: `Fixture row ${index + 1}` }]
  }));
  const labels = JSON.stringify({
    schema: 'okf-explorer-endpoint-label-index.v1', snapshot: SNAPSHOT, generated_at: '2026-09-19T00:00:00Z', default_language: 'en-GB', opaque_identifier_patterns: [],
    entries: records.map((record) => ({ route: record.route, iri: record.id, label: record.title, language: 'en-GB', type: record.record_type,
      label_authority: { class: 'editorial', source: ORIGIN } })), counts: { entries: records.length }
  });
  const labelBytes = new TextEncoder().encode(labels);
  const labelHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', labelBytes))]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const labelRef = { path: 'data/labels.json', sha256: labelHash, bytes: labelBytes.byteLength };
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(FOCUS)) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  const bucket = ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
  const counts = { datasets: records.length, records: records.length, resources: 0, relationships: relationships.length };
  const entries = new Map<string, unknown>([
    ['/okf-explorer.json', { schema: 'okf-explorer-large-corpus.v1', kind: 'okf-large-corpus', title: 'Relationship paging fixture', snapshot: SNAPSHOT, counts,
      entrypoints: { data_manifest: 'data/manifest.json', endpoint_labels: labelRef, relationship_adjacency: 'data/adjacency/manifest.json' } }],
    ['/data/manifest.json', { title: 'Relationship paging fixture', snapshot: SNAPSHOT, counts,
      indexes: { overview: 'data/overview.json', facets: 'data/facets.json', endpoint_labels: labelRef, relationship_adjacency: 'data/adjacency/manifest.json' },
      chunks: { datasets: ['data/records.json'], resources: [], publishers: ['data/publishers.json'], relationships: ['data/relationships.json'] } }],
    ['/data/overview.json', { title: 'Relationship paging fixture', snapshot: SNAPSHOT, counts, facet_previews: {}, recent_datasets: [records[0]] }],
    ['/data/facets.json', {}],
    ['/data/records.json', records],
    ['/data/publishers.json', [{ name: 'fixture', title: 'Fixture publisher', dataset_count: records.length, resource_count: 0 }]],
    ['/data/relationships.json', relationships],
    ['/data/adjacency/manifest.json', { schema: 'okf-relationship-adjacency.v1', algorithm: 'fnv1a32-prefix-2', snapshot: SNAPSHOT,
      routes: 1, relationships: relationships.length, buckets: { [bucket]: `data/adjacency/${bucket}.json` } }],
    [`/data/adjacency/${bucket}.json`, { [FOCUS]: relationships }]
  ]);
  await context.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path === '/data/labels.json' ? labels : entries.has(path) ? JSON.stringify(entries.get(path)) : null;
    await route.fulfill({ status: body === null ? 404 : 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: body ?? '{}' });
  });
}

test('focused graph opens relationship stacks and reaches incoming evidence after row 120', async ({ context, page }) => {
  await installFixture(context);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`?bundle=${encodeURIComponent(BUNDLE)}&view=graph#${FOCUS}`);
  const graph = page.getByRole('group', { name: 'Large corpus graph' });
  await expect(page.getByText('Relationships 1–72 of 211 before grouping and filters.', { exact: false })).toBeVisible();
  await graph.getByRole('button', { name: 'references (72 pages)', exact: true }).click();
  await expect(graph.getByRole('button', { name: 'Page 001', exact: true })).toBeVisible();
  await expect(graph.getByRole('button', { name: 'Page 072', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Collapse relationship stacks', exact: true }).click();
  await expect(graph.getByRole('button', { name: 'references (72 pages)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next relationships', exact: true }).click();
  await page.getByRole('button', { name: 'Next relationships', exact: true }).click();
  await expect(page.getByText('Relationships 145–211 of 211 before grouping and filters.', { exact: false })).toBeVisible();
  await expect(graph.getByRole('button', { name: 'Late routing source', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next relationships', exact: true })).toBeDisabled();
  const accessibility = await new AxeBuilder({ page }).include('.graph-shell').analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact || ''))).toEqual([]);
});

test('overview Links includes arbitrary routes and pages every loaded assertion', async ({ context, page }) => {
  await installFixture(context);
  await page.goto(`?bundle=${encodeURIComponent(BUNDLE)}&view=links`);
  await page.getByRole('button', { name: /Load full relationship index/ }).click();
  await expect(page.locator('.links-view > button')).toHaveCount(180);
  await expect(page.getByText('Links 1–180 of 211 in this scope.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next links', exact: true }).click();
  await expect(page.locator('.links-view > button')).toHaveCount(31);
  await expect(page.locator('.links-view')).toContainText('Late routing source');
  await expect(page.getByRole('button', { name: 'Next links', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous links', exact: true }).click();
  await expect(page.locator('.links-view > button')).toHaveCount(180);
});
