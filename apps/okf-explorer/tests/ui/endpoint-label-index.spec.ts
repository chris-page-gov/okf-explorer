import { type BrowserContext, type Route } from '@playwright/test';

import { expect, test } from '../browserDiagnostics';

const ORIGIN = 'https://endpoint-labels.fixture.test';
const BUNDLE_URL = `${ORIGIN}/okf-explorer.json`;
const SNAPSHOT = 'endpoint-labels-actual-consumer-v1';
const ACTIVITY_ROUTE = 'activity/activity-24242a2da2dca5a6e0dbbbf7';
const DATASET_ROUTE = 'work/probate-guidance';
const RESOURCE_ROUTE = 'resource/probate-guidance-html';
const LICENCE_ID = 'license-opaque-internal-id';
const LICENCE_ROUTE = `license/${LICENCE_ID}`;
const MISSING_ROUTE = 'publisher/publisher-aaaaaaaaaaaaaaaaaaaaaaaa';

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function relationshipBucket(route: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(route)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
}

async function json(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body)
  });
}

async function installClipboard(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => { copied = String(value); },
        readText: async () => copied
      }
    });
  });
}

async function installFixture(context: BrowserContext, requests: string[]) {
  const entries = [
    [ACTIVITY_ROUTE, 'Applying for probate', 'Citizen activity'],
    [DATASET_ROUTE, 'Applying for probate guidance', 'Guidance record'],
    [RESOURCE_ROUTE, 'Applying for probate online', 'Web resource'],
    ['publisher/publisher-5f7670365c7dc347f281bbef', 'HM Land Registry', 'Organisation'],
    ['facet/publisher/publisher-5f7670365c7dc347f281bbef', 'HM Land Registry', 'Organisation'],
    ['source/source-3b1fbf315fecd0fdd686c62a', 'GOV.UK probate guidance', 'Official source'],
    ['rights/rights-76093b40870d2f36982d4ca5', 'Open Government Licence v3.0', 'Rights statement'],
    [LICENCE_ROUTE, 'Open Government Licence v3.0', 'Licence'],
    ['concept/probate', 'Probate', 'Concept'],
    ['format/HTML', 'Web page', 'Format'],
    ['facet/format/HTML', 'Web page', 'Format'],
    ['host/www.gov.uk', 'GOV.UK website', 'Host'],
    ['topic/probate', 'Probate services', 'Controlled topic'],
    ['process/probate-application', 'Probate application process', 'Citizen process'],
    ['episode/prepare-application', 'Prepare the application', 'Process step'],
    ['episode/submit-application', 'Submit the application', 'Process step']
  ].map(([route, label, type]) => ({
    route,
    iri: `https://endpoint-labels.fixture.test/id/${route}`,
    label,
    language: 'en-GB',
    type,
    label_authority: {
      class: 'domain-profile',
      source: `${ORIGIN}/research/label-review`
    }
  }));
  const labels = {
    schema: 'okf-explorer-endpoint-label-index.v1',
    snapshot: SNAPSHOT,
    generated_at: '2026-08-12T12:00:00Z',
    default_language: 'en-GB',
    opaque_identifier_patterns: [
      'publisher-*',
      'source-*',
      'rights-*',
      'license-*',
      'activity-*',
      'catalogue-record-*'
    ],
    entries,
    counts: { entries: entries.length }
  };
  const labelText = JSON.stringify(labels);
  const labelReference = {
    path: 'data/labels/index.json',
    sha256: await sha256(labelText),
    bytes: new TextEncoder().encode(labelText).byteLength
  };
  const relationships = [
    ['publisher/publisher-5f7670365c7dc347f281bbef', 'published by'],
    ['source/source-3b1fbf315fecd0fdd686c62a', 'has official source'],
    ['rights/rights-76093b40870d2f36982d4ca5', 'licensed under'],
    ['concept/probate', 'classified as'],
    [MISSING_ROUTE, 'related to']
  ].map(([target, kind], index) => ({
    id: `relationship-${index + 1}`,
    source: ACTIVITY_ROUTE,
    target,
    kind,
    label: kind
  }));
  const bucket = relationshipBucket(ACTIVITY_ROUTE);
  const dataset = {
    id: 'https://www.gov.uk/applying-for-probate',
    name: 'probate-guidance',
    route: DATASET_ROUTE,
    title: 'dataset-opaque-internal-title',
    notes: 'Official guidance for people applying for probate in Coventry.',
    publisher: 'publisher-5f7670365c7dc347f281bbef',
    publisher_title: 'publisher-5f7670365c7dc347f281bbef',
    resource_count: 1,
    resource_ids: ['probate-guidance-html'],
    formats: ['HTML'],
    access: 'public',
    topics: ['probate'],
    tags: [],
    license_id: LICENCE_ID,
    license_title: 'Incorrect legacy licence title',
    license_basis: 'source-declared',
    spatial_coverage: ['Coventry'],
    timestamp: '2026-08-12T12:00:00Z',
    narrative: {
      title: 'Applying for probate journey',
      body: 'A citizen-facing route through the probate application.',
      process: { route: 'process/probate-application', label: 'process-internal-1' },
      previous: [{ route: 'episode/prepare-application', label: 'episode-internal-1' }],
      next: [{ route: 'episode/submit-application', label: 'episode-internal-2' }]
    }
  };
  const resource = {
    id: 'probate-guidance-html',
    route: RESOURCE_ROUTE,
    name: 'resource-opaque-internal-name',
    dataset: dataset.name,
    format: 'HTML',
    host: 'www.gov.uk',
    position: 0,
    url: 'https://www.gov.uk/applying-for-probate'
  };
  const publisher = {
    name: 'publisher-5f7670365c7dc347f281bbef',
    title: 'publisher-5f7670365c7dc347f281bbef',
    dataset_count: 1,
    resource_count: 1
  };
  const descriptor = {
    schema: 'okf-explorer-large-corpus.v1',
    kind: 'okf-large-corpus',
    title: 'Endpoint labels actual-consumer fixture',
    snapshot: SNAPSHOT,
    entrypoints: {
      data_manifest: 'data/manifest.json',
      endpoint_labels: labelReference,
      relationship_adjacency: 'data/adjacency/manifest.json'
    },
    counts: { datasets: 1, records: 1, resources: 1, relationships: relationships.length }
  };
  const manifest = {
    title: descriptor.title,
    generated_at: '2026-08-12T12:00:00Z',
    snapshot: SNAPSHOT,
    counts: descriptor.counts,
    indexes: {
      overview: 'data/overview.json',
      analysis: 'data/analysis.json',
      facets: 'data/facets.json',
      endpoint_labels: labelReference,
      relationship_adjacency: 'data/adjacency/manifest.json'
    },
    chunks: {
      datasets: ['data/datasets.json'],
      resources: ['data/resources.json'],
      publishers: ['data/publishers.json'],
      relationships: []
    }
  };
  const adjacency = {
    schema: 'okf-relationship-adjacency.v1',
    algorithm: 'fnv1a32-prefix-2',
    snapshot: SNAPSHOT,
    routes: 6,
    relationships: relationships.length,
    buckets: { [bucket]: `data/adjacency/${bucket}.json` }
  };

  await context.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path === '/okf-explorer.json') return json(route, descriptor);
    if (path === '/data/manifest.json') return json(route, manifest);
    if (path === '/data/overview.json') {
      return json(route, {
        schema: 'okf-overview.v1',
        title: descriptor.title,
        snapshot: SNAPSHOT,
        generated_at: '2026-08-12T12:00:00Z',
        counts: descriptor.counts,
        facet_previews: {
          publisher: [
            { value: 'publisher-5f7670365c7dc347f281bbef', count: 1 },
            { value: 'publisher-aaaaaaaaaaaaaaaaaaaaaaaa', count: 1 }
          ],
          access: [
            { value: 'public', count: 1 },
            { value: 'restricted', count: 1 }
          ]
        },
        recent_datasets: [dataset]
      });
    }
    if (path === '/data/analysis.json') {
      return json(route, {
        schema: 'okf-explorer-analysis.v1',
        generated_at: '2026-08-12T12:00:00Z',
        summary: { title: descriptor.title, record_count: 1, relationship_count: relationships.length },
        graph_overview: {
          nodes: [
            { id: `facet/publisher/${publisher.name}`, label: publisher.name, type: 'publisher', count: 1 },
            { id: 'facet/format/HTML', label: 'HTML', type: 'format', count: 1 }
          ],
          edges: []
        },
        timeline_overview: {
          buckets: [
            { id: '2026', label: '2026', count: 1, samples: [dataset] }
          ]
        },
        resource_overview: {
          total_resources: 1,
          high_resource_datasets: [
            {
              route: DATASET_ROUTE,
              label: dataset.title,
              count: 1,
              publisher: publisher.name
            }
          ],
          distributions: { format: [{ value: 'HTML', count: 1 }] }
        },
        hierarchies: [
          {
            id: 'publisher-hierarchy',
            label: 'Publisher hierarchy',
            facet: 'publisher',
            levels: ['publisher'],
            values: [
              {
                id: `facet/publisher/${publisher.name}`,
                route: `publisher/${publisher.name}`,
                label: publisher.name,
                count: 1
              }
            ]
          }
        ],
        facet_analysis: [
          {
            key: 'publisher',
            label: 'Publisher',
            recommendation: 'primary',
            recommended_control: 'list',
            coverage: 1,
            cardinality: 2,
            expected_reduction: 1,
            values: [{ value: publisher.name, count: 1 }]
          },
          {
            key: 'access',
            label: 'Access',
            recommendation: 'primary',
            recommended_control: 'list',
            coverage: 1,
            cardinality: 2,
            expected_reduction: 1,
            values: [
              { value: 'public', count: 1 },
              { value: 'restricted', count: 1 }
            ]
          }
        ]
      });
    }
    if (path === '/data/facets.json') {
      return json(route, {
        publisher: [
          { value: 'publisher-5f7670365c7dc347f281bbef', count: 1 },
          { value: 'publisher-aaaaaaaaaaaaaaaaaaaaaaaa', count: 1 }
        ],
        access: [
          { value: 'public', count: 1 },
          { value: 'restricted', count: 1 }
        ]
      });
    }
    if (path === '/data/labels/index.json') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: labelText
      });
    }
    if (path === '/data/datasets.json') return json(route, [dataset]);
    if (path === '/data/resources.json') return json(route, [resource]);
    if (path === '/data/publishers.json') return json(route, [publisher]);
    if (path === '/data/adjacency/manifest.json') return json(route, adjacency);
    if (path === `/data/adjacency/${bucket}.json`) {
      return json(route, { [ACTIVITY_ROUTE]: relationships });
    }
    return route.fulfill({ status: 404, body: 'Fixture route not found' });
  });
}

test.describe('governed endpoint labels', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('ordinary overview graph uses exact governed analysis-node labels', async ({ page }) => {
    const requests: string[] = [];
    await installFixture(page.context(), requests);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=graph`);

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    await expect(graph).toBeVisible();
    await expect(graph.getByRole('button', { name: 'HM Land Registry', exact: true })).toBeVisible();
    await expect(graph.getByRole('button', { name: 'Web page', exact: true })).toBeVisible();
    await expect(graph).not.toContainText('publisher-5f7670365c7dc347f281bbef');
    await expect(graph.getByRole('button', { name: 'HTML', exact: true })).toHaveCount(0);
  });

  for (const viewport of [
    { name: 'ordinary', width: 1280, height: 900 },
    { name: 'narrow', width: 390, height: 844 }
  ]) {
    test(`${viewport.name} Graph and Links use governed labels and expose missing labels`, async ({ page }) => {
      const requests: string[] = [];
      await installFixture(page.context(), requests);
      await page.setViewportSize(viewport);
      await page.goto(
        `?bundle=${encodeURIComponent(BUNDLE_URL)}&view=graph#${ACTIVITY_ROUTE}`
      );

      const graph = page.getByRole('group', { name: 'Large corpus graph' });
      await expect(graph).toBeVisible();
      for (const label of [
        'Applying for probate',
        'HM Land Registry',
        'GOV.UK probate guidance',
        'Open Government Licence v3.0',
        'Probate',
        'Missing label'
      ]) {
        await expect(graph.getByRole('button', { name: label, exact: true })).toBeVisible();
      }
      await expect(graph).not.toContainText('publisher-5f7670365c7dc347f281bbef');
      await expect(graph).not.toContainText('publisher-aaaaaaaaaaaaaaaaaaaaaaaa');
      if (viewport.name === 'narrow') {
        await page.getByRole('navigation', { name: 'Workspace panels' })
          .getByRole('button', { name: 'Search & facets' }).click();
      }
      const publisherFacet = page.locator('[data-facet-key="publisher"]');
      await publisherFacet.locator('.facet-toggle').click();
      await expect(publisherFacet.locator('.facet-values').getByRole('button', { name: /HM Land Registry/ })).toBeVisible();
      await expect(publisherFacet.locator('.facet-values').getByRole('button', { name: /Missing label/ })).toBeVisible();
      const accessFacet = page.locator('[data-facet-key="access"]');
      await accessFacet.locator('.facet-toggle').click();
      await expect(accessFacet.locator('.facet-values').getByRole('button', { name: /public/i })).toBeVisible();
      await expect(accessFacet).not.toContainText('Missing label');
      expect(requests).toContain('/data/labels/index.json');
      expect(requests).toContain(`/data/adjacency/${relationshipBucket(ACTIVITY_ROUTE)}.json`);

      await page.getByLabel('Views').getByRole('button', { name: 'Links', exact: true }).click();
      await expect(page.getByRole('button', {
        name: /Applying for probate published by .* HM Land Registry/
      })).toBeVisible();
      await expect(page.getByRole('button', {
        name: /Applying for probate related to .* Missing label/
      })).toBeVisible();

      await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
      await graph.locator(`[data-route="${MISSING_ROUTE}"]`).click();
      const details = page.locator('.right-panel');
      await expect(details.getByRole('heading', { name: 'Missing label' })).toBeVisible();
      await expect(details).toContainText(MISSING_ROUTE);
    });
  }

  for (const viewport of [
    { name: 'ordinary', width: 1280, height: 900 },
    { name: 'narrow', width: 390, height: 844 }
  ]) {
    test(`${viewport.name} every-view and restored deep-link labels are governed`, async ({ context, page }) => {
      await installClipboard(context);
      const requests: string[] = [];
      await installFixture(context, requests);
      await page.setViewportSize(viewport);
      await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#${DATASET_ROUTE}`);

    if (viewport.name === 'narrow') {
      await page.getByRole('navigation', { name: 'Workspace panels' })
        .getByRole('button', { name: 'Details', exact: true }).click();
    }
    const initialDetails = page.locator('.right-panel');
    await expect(initialDetails.getByRole('heading', { name: 'Applying for probate guidance' }).first()).toBeVisible();
    await expect(initialDetails.getByRole('button', { name: /Web page/ }).first()).toBeVisible();
    await expect(initialDetails.getByRole('button', { name: 'Probate services', exact: true })).toBeVisible();
    await expect(initialDetails).toContainText('Open Government Licence v3.0');
    await expect(page.locator('.stage')).not.toContainText('dataset-opaque-internal-title');
    await expect(page.locator('.stage')).not.toContainText(LICENCE_ID);
    await expect(page.locator('.stage')).not.toContainText('Incorrect legacy licence title');

    await page.getByLabel('Views').getByRole('button', { name: 'Timeline', exact: true }).click();
    await expect(page.locator('main')).toContainText('Applying for probate guidance');

    await page.getByLabel('Views').getByRole('button', { name: 'Type', exact: true }).click();
    await expect(page.locator('main')).toContainText('HM Land Registry');
    await expect(page.locator('.stage')).not.toContainText('publisher-5f7670365c7dc347f281bbef');

    await page.getByLabel('Views').getByRole('button', { name: 'Resources', exact: true }).click();
    await expect(page.locator('main')).toContainText('Applying for probate guidance');
    await expect(page.locator('main')).toContainText('HM Land Registry');
    await expect(page.locator('main')).toContainText('GOV.UK website');
    await expect(page.locator('.stage')).not.toContainText('dataset-opaque-internal-title');

    await page.getByLabel('Views').getByRole('button', { name: 'Map', exact: true }).click();
    await expect(page.locator('main')).toContainText('Applying for probate guidance');

    await page.getByLabel('Views').getByRole('button', { name: 'Narrative', exact: true }).click();
    await expect(page.locator('main')).toContainText('Probate application process');
    await expect(page.locator('main')).toContainText('Prepare the application');
    await expect(page.locator('.stage')).not.toContainText('process-internal-1');

    await page.locator('.stage-bar').getByRole('button', { name: 'Copy route', exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    await page.goto(copied);
    await expect(page.locator('main')).toContainText('Applying for probate guidance');
    await expect(page.locator('.stage')).not.toContainText('dataset-opaque-internal-title');

    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
    await page.getByRole('group', { name: 'Large corpus graph' })
      .getByRole('button', { name: 'HM Land Registry', exact: true })
      .click();
    const details = page.locator('.right-panel');
    await expect(details.getByRole('heading', { name: 'HM Land Registry' })).toBeVisible();
    await details.locator('details').filter({ hasText: 'Datasets (1)' }).locator('summary').click();
    await expect(details.getByRole('button', { name: 'Applying for probate guidance' })).toBeVisible();
    await expect(details.locator('.json-panel')).toContainText(
      'publisher-5f7670365c7dc347f281bbef'
    );
    });
  }
});
