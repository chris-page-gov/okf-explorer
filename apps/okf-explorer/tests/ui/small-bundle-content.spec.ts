import { expect, test } from '@playwright/test';

const BUNDLE_URL = 'https://small.fixture.test/okf-bundle.json';

const bundle = {
  okf_version: '0.1',
  meta: { title: 'Small bundle compatibility fixture' },
  nodes: {
    alpha: {
      id: 'alpha',
      title: 'Alpha compatibility record',
      type: 'Dataset',
      description: 'Short catalogue description.',
      source: 'records/alpha.md',
      body: '# Alpha body\n\nThe body-only-term is searchable.\n\n[Usage guide](guides/use.html?token=secret&view=full)\n\n<script>window.fixtureAttack = true</script> [Unsafe](javascript:alert(1))',
      resources: [{ title: 'Boundary CSV', url: 'https://data.fixture.test/alpha.csv?api_key=secret&download=1' }],
      schema_org_type: 'Dataset',
      provenance: {
        source_url: 'https://catalogue.fixture.test/alpha',
        retrieved_at: '2026-07-16T00:00:00Z',
        method: 'browser fixture'
      }
    },
    beta: {
      id: 'beta',
      title: 'Beta related record',
      type: 'Report',
      body: 'A related record.'
    }
  },
  edges: [{ source: 'alpha', target: 'beta', kind: 'supports' }]
};

test.beforeEach(async ({ context, page }) => {
  await context.route(BUNDLE_URL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(bundle)
    });
  });
  const params = new URLSearchParams({ bundle: BUNDLE_URL });
  await page.goto(`?${params.toString()}#alpha`);
  await expect(page.locator('.right-panel').getByRole('heading', { name: 'Alpha compatibility record' })).toBeVisible();
});

test('SMALL-E2E-01 searches Markdown body and renders it without active content', async ({ page }) => {
  const search = page.getByRole('textbox', { name: 'Search nodes' });
  await search.fill('body-only-term');
  const results = page.locator('.left-panel .node-list');
  await expect(results.getByRole('button')).toHaveCount(1);
  await expect(results).toContainText('Alpha compatibility record');
  await results.getByRole('button').click();

  const markdown = page.getByRole('region', { name: 'Markdown body' });
  await expect(markdown.getByRole('heading', { name: 'Alpha body' })).toBeVisible();
  await expect(markdown).toContainText('body-only-term');
  await expect(markdown.locator('script')).toHaveCount(0);
  await expect(markdown.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(markdown.getByRole('link', { name: 'Usage guide' })).toHaveAttribute(
    'href',
    'https://small.fixture.test/guides/use.html?view=full'
  );
});

test('SMALL-E2E-02 exposes redacted links, selected metadata and complete node JSON', async ({ page }) => {
  const links = page.getByRole('region', { name: 'Source and resource links' });
  await expect(links.getByRole('link', { name: 'Source ↗', exact: true })).toHaveAttribute(
    'href',
    'https://small.fixture.test/records/alpha.md'
  );
  await expect(links.getByRole('link', { name: 'Boundary CSV ↗' })).toHaveAttribute(
    'href',
    'https://data.fixture.test/alpha.csv?download=1'
  );
  await expect(page.getByText('Schema.org type')).toBeVisible();
  await expect(page.getByText('Provenance source', { exact: true })).toBeVisible();

  const disclosure = page.locator('.json-panel').filter({ hasText: 'Node JSON and provenance' });
  await disclosure.locator('summary').click();
  await expect(disclosure).toContainText('catalogue.fixture.test/alpha');
  await expect(disclosure).toContainText('browser fixture');
});

test('SMALL-E2E-03 projects generated edges into Graph and Links views', async ({ page }) => {
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.locator('svg.graph .edge-hit')).toHaveCount(1);
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(page.locator('.links-view')).toContainText('supports');
  await expect(page.locator('.links-view')).toContainText('Alpha compatibility record');
  await expect(page.locator('.links-view')).toContainText('Beta related record');
});
