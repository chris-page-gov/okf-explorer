import { expect, test } from '@playwright/test';

const FEDERATION_URL = 'https://federation.fixture.test/whole-law/okf-explorer.json';
const CHILD_PRIMARY = 'https://child.fixture.test/okf-explorer.json';
const CHILD_FALLBACK = 'https://raw.fixture.test/bundle/okf-explorer.json';

const discovery = {
  repository: 'https://github.com/example/whole-law',
  documentation: 'https://federation.fixture.test/docs/',
  raw_subpath: 'bundle/whole-law',
  release_archive: 'https://github.com/example/whole-law/releases',
  routes: [
    {
      kind: 'published',
      purpose: 'descriptor',
      priority: 10,
      url: FEDERATION_URL
    }
  ]
};

const federation = {
  schema: 'okf-explorer-federation.v1',
  kind: 'okf-federation',
  okf_version: '0.2',
  title: 'Whole-Law federation fixture',
  description: 'Overview-first legal source discovery.',
  version: '0.3.0',
  status: 'candidate',
  generated_at: '2026-07-25T12:00:00Z',
  snapshot: 'whole-law-2026-07-25',
  profile: 'https://federation.fixture.test/profile/federation/v1/',
  publisher: 'https://federation.fixture.test/publisher',
  license: 'https://federation.fixture.test/licence',
  discovery,
  counts: { children: 2, available: 1, planned: 1 },
  source_families: [
    {
      id: 'SC01',
      title: 'Primary legislation',
      definition: 'Acts and Measures.',
      authority_class: 'binding-authority',
      coverage_status: 'available',
      source_count: 3,
      implemented_bundle: CHILD_PRIMARY
    },
    {
      id: 'SC09',
      title: 'Court judgments',
      definition: 'Published judgments from courts.',
      authority_class: 'binding-authority',
      coverage_status: 'partial',
      source_count: 9,
      implemented_bundle: null
    },
    ...Array.from({ length: 34 }, (_, index) => ({
      id: `SCX${String(index + 1).padStart(2, '0')}`,
      title: `Researched legal source class ${index + 1}`,
      definition: 'A researched source class that is not yet an independently published child bundle.',
      authority_class: index % 2 ? 'official-source' : 'binding-authority',
      coverage_status: index % 3 ? 'partial' : 'planned',
      source_count: index + 1,
      implemented_bundle: null
    }))
  ],
  children: [
    {
      id: 'legislation',
      title: 'Legislation child',
      description: 'Available authoritative legislation bundle.',
      role: 'legislation',
      status: 'available',
      descriptor: CHILD_PRIMARY,
      authority: {
        class: 'official',
        source: 'https://www.legislation.gov.uk/'
      },
      coverage: {
        status: 'available',
        applicable: 10,
        represented: 10,
        percent: 100,
        as_of: '2026-07-25'
      },
      freshness: {
        state: 'current',
        observed_at: '2026-07-25T11:00:00Z',
        snapshot: 'legislation-2026-07-25',
        stale_after: '2026-08-01T00:00:00Z'
      },
      discovery: {
        repository: 'https://github.com/example/legislation',
        documentation: 'https://child.fixture.test/docs/',
        raw_subpath: 'bundle',
        release_archive: 'https://github.com/example/legislation/releases',
        routes: [
          {
            kind: 'published',
            purpose: 'descriptor',
            priority: 10,
            url: CHILD_PRIMARY
          },
          {
            kind: 'raw',
            purpose: 'descriptor',
            priority: 20,
            url: CHILD_FALLBACK
          }
        ]
      }
    },
    {
      id: 'case-law',
      title: 'Case law child',
      description: 'Planned case-law bundle.',
      role: 'case-law',
      status: 'planned',
      authority: {
        class: 'official',
        source: 'https://caselaw.nationalarchives.gov.uk/'
      },
      coverage: {
        status: 'planned',
        applicable: 0,
        represented: 0
      },
      freshness: { state: 'unknown' },
      discovery: {
        repository: 'https://github.com/example/whole-law',
        documentation: 'https://federation.fixture.test/docs/case-law/',
        raw_subpath: 'whole-law/case-law',
        release_archive: 'https://github.com/example/whole-law/releases',
        routes: [
          {
            kind: 'documentation',
            purpose: 'documentation',
            url: 'https://federation.fixture.test/docs/case-law/'
          }
        ]
      }
    }
  ],
  relationships: [
    {
      schema: 'okf-relationship-assertion.v2',
      source: 'legislation',
      target: 'case-law',
      predicate: 'informs',
      authority: {
        class: 'model-assisted',
        label: 'Model-assisted candidate',
        source: 'https://federation.fixture.test/methodology'
      },
      derivation: 'model-assisted',
      confidence: 0.95,
      observed_at: '2026-07-25T12:00:00Z',
      freshness: 'current',
      evidence: ['https://federation.fixture.test/evidence/candidate.json']
    }
  ],
  relationship_summary: {
    scope: 'federated-data-plane',
    total: 5,
    by_predicate: { amends: 4, informs: 1 },
    by_authority: { official: 4, derived: 0, 'model-assisted': 1 },
    by_freshness: { current: 5, stale: 0, unknown: 0 },
    snapshot: 'whole-law-2026-07-25'
  },
  notices: ['Child data loads only after explicit selection.']
};

const childBundle = {
  okf_version: '0.2',
  meta: { title: 'Recovered legislation child' },
  nodes: {
    work: {
      id: 'work',
      title: 'Recovered legal work',
      type: 'LegalWork',
      generated: {
        by: 'process:fixture',
        at: '2026-07-25T12:00:00Z'
      }
    }
  },
  relationships: []
};

test('FEDERATION-E2E-01 loads only the overview and labels relationship authority', async ({ context, page }) => {
  let childRequests = 0;
  await context.route(FEDERATION_URL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(federation)
    });
  });
  await context.route(CHILD_PRIMARY, async (route) => {
    childRequests += 1;
    await route.fulfill({ status: 404, body: 'missing' });
  });
  await context.route(CHILD_FALLBACK, async (route) => {
    childRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(childBundle)
    });
  });

  const params = new URLSearchParams({ bundle: FEDERATION_URL });
  await page.goto(`?${params.toString()}`);
  const overview = page.locator('[data-federation-overview="okf-explorer-federation.v1"]');
  await expect(overview).toContainText('Whole-Law federation fixture');
  await expect(overview).toContainText('5');
  const authoritySummary = overview.locator('.federation-authority-summary');
  await expect(authoritySummary.locator('[data-relationship-authority="official"]')).toContainText('4');
  await expect(authoritySummary.locator('[data-relationship-authority="model-assisted"]')).toContainText('1');
  await expect(overview.getByRole('region', { name: 'Federated child bundles' })).toContainText('Legislation child');
  const sourceClassCoverage = overview.getByRole('region', { name: 'Legal source-class coverage' });
  await expect(sourceClassCoverage).toContainText('36 legal source classes');
  await expect(sourceClassCoverage.locator('.federation-source-family-grid article')).toHaveCount(36);
  await expect(sourceClassCoverage.locator('.federation-source-family-grid article').last()).toBeVisible();
  const childBox = await overview.getByRole('region', { name: 'Federated child bundles' }).boundingBox();
  const discoveryBox = await overview.getByRole('region', { name: 'Canonical and alternate publication routes' }).boundingBox();
  expect(childBox!.y).toBeLessThan(discoveryBox!.y);
  expect(childRequests).toBe(0);

  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.locator('.graph-edge[data-relationship-authority="model-assisted"]')).toHaveCount(1);
  await page.locator('.edge-hit').click({ force: true });
  await expect(page.locator('.right-panel [data-relationship-authority="model-assisted"]')).toContainText('Model-assisted candidate');
  await expect(page.locator('.right-panel')).toContainText('0.95');
});

test('FEDERATION-E2E-02 uses declared child fallback instead of guessing a path', async ({ context, page }) => {
  const attempted: string[] = [];
  await context.route(FEDERATION_URL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(federation)
    });
  });
  await context.route(CHILD_PRIMARY, async (route) => {
    attempted.push(CHILD_PRIMARY);
    await route.fulfill({ status: 404, body: 'missing' });
  });
  await context.route(CHILD_FALLBACK, async (route) => {
    attempted.push(CHILD_FALLBACK);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(childBundle)
    });
  });

  const params = new URLSearchParams({ bundle: FEDERATION_URL });
  await page.goto(`?${params.toString()}`);
  await page.getByRole('region', { name: 'Federated child bundles' }).getByRole('button', { name: 'Open Legislation child' }).click();
  await expect(page.locator('.title-block')).toContainText('Recovered legislation child');
  expect(new URL(page.url()).hash).toBe('#work');
  expect(page.url()).not.toContain('#legislation');
  expect(attempted).toEqual([CHILD_PRIMARY, CHILD_FALLBACK]);
});

test('FEDERATION-E2E-03 keeps a single implemented child prominent above research and recovery detail', async ({ context, page }) => {
  const singleChildFederation = {
    ...federation,
    counts: { children: 1, available: 1 },
    children: [federation.children[0]],
    relationships: []
  };
  await context.route(FEDERATION_URL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(singleChildFederation)
    });
  });

  await page.goto(`?bundle=${encodeURIComponent(FEDERATION_URL)}#overview`);
  const overview = page.locator('[data-federation-overview="okf-explorer-federation.v1"]');
  await expect(overview).toContainText(/1\s*published child bundle/);
  const child = overview.getByRole('region', { name: 'Federated child bundles' });
  const sourceClasses = overview.getByRole('region', { name: 'Legal source-class coverage' });
  const discoveryRoutes = overview.getByRole('region', { name: 'Canonical and alternate publication routes' });
  await expect(child.getByRole('button', { name: 'Open Legislation child' })).toBeVisible();
  const [childBox, sourceClassBox, discoveryBox] = await Promise.all([
    child.boundingBox(),
    sourceClasses.boundingBox(),
    discoveryRoutes.boundingBox()
  ]);
  expect(childBox!.y).toBeLessThan(sourceClassBox!.y);
  expect(sourceClassBox!.y).toBeLessThan(discoveryBox!.y);
});
