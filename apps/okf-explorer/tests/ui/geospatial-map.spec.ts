import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const FIXTURE_ORIGIN = 'https://geo.fixture.test';
const LARGE_ORIGIN = 'https://large-geo.fixture.test';

type JsonRecord = Record<string, unknown>;

function resource(title: string, format: string, url: string): JsonRecord {
  return { title, format, url };
}

function mapBundle(nodes?: Record<string, JsonRecord>) {
  const fixtureNodes: Record<string, JsonRecord> = nodes || {
    'london-parks': {
      id: 'london-parks',
      title: 'London parks sample points',
      type: 'Dataset',
      description: 'Direct GeoJSON with explicit source coordinates.',
      publisher: 'Example Local Data Office',
      area_served: 'London',
      latitude: 51.5074,
      longitude: -0.1278,
      tags: ['parks', 'geospatial'],
      resources: [resource(
        'Park locations GeoJSON',
        'GeoJSON',
        `${FIXTURE_ORIGIN}/data/parks.geojson?token=private&view=public`
      )]
    },
    'london-libraries': {
      id: 'london-libraries',
      title: 'London libraries sample points',
      type: 'Dataset',
      description: 'A second record at the same coordinate for marker clustering.',
      publisher: 'Example Local Data Office',
      spatial_coverage: 'Greater London',
      latitude: 51.5074,
      longitude: -0.1278,
      tags: ['libraries', 'mapping']
    },
    'scotland-statistics': {
      id: 'scotland-statistics',
      title: 'Regional wellbeing statistics for Scotland',
      type: 'Report',
      description: 'Area-based statistics without source geometry.',
      publisher: 'Example Statistics Office',
      spatial_coverage: 'Scotland',
      tags: ['statistics', 'areas']
    },
    'england-arcgis': {
      id: 'england-arcgis',
      title: 'Planning boundaries feature service',
      type: 'Dataset',
      description: 'ArcGIS service-root discovery example.',
      publisher: 'Example Planning Agency',
      areaServed: 'England',
      resources: [resource(
        'Planning boundary FeatureServer',
        'ArcGIS GeoServices REST API',
        `${FIXTURE_ORIGIN}/arcgis/rest/services/Planning/FeatureServer`
      )]
    },
    'wales-wms': {
      id: 'wales-wms',
      title: 'Wales environmental WMS',
      type: 'Dataset',
      description: 'A linked-only WMS resource.',
      publisher: 'Example Environment Agency',
      jurisdiction: 'Wales',
      resources: [resource(
        'Environmental map',
        'WMS',
        `${FIXTURE_ORIGIN}/wms?service=WMS&request=GetCapabilities`
      )]
    },
    'offshore-preview-failure': {
      id: 'offshore-preview-failure',
      title: 'UK offshore zones unavailable preview',
      type: 'Dataset',
      description: 'Unavailable GeoJSON used to exercise progressive recovery.',
      publisher: 'Example Marine Office',
      spatial: 'UK EEZ',
      resources: [resource('Offshore zones GeoJSON', 'GeoJSON', `${FIXTURE_ORIGIN}/data/unavailable.geojson`)]
    },
    'southampton-register': {
      id: 'southampton-register',
      title: 'Southampton local register',
      type: 'Register',
      description: 'Other declared coverage without a locator point.',
      publisher: 'Example City Council',
      spatial_coverage: 'Southampton'
    },
    'dense-geometry': {
      id: 'dense-geometry',
      title: 'Dense East Midlands linework',
      type: 'Dataset',
      description: 'A large coordinate sequence for the drawing cap.',
      publisher: 'Example Mapping Office',
      area_served: 'East Midlands',
      resources: [resource('Dense line GeoJSON', 'GeoJSON', `${FIXTURE_ORIGIN}/data/dense.geojson`)]
    },
    'ogc-features': {
      id: 'ogc-features',
      title: 'Northern Ireland OGC API Features',
      type: 'Dataset',
      description: 'Direct OGC API JSON preview example.',
      publisher: 'Example Open Data Office',
      area_served: 'Northern Ireland',
      resources: [resource(
        'Places collection',
        'OGC API Features',
        `${FIXTURE_ORIGIN}/ogc/collections/places/items?limit=100`
      )]
    },
    'ordinary-report': {
      id: 'ordinary-report',
      title: 'Annual finance report',
      type: 'Report',
      description: 'Non-spatial control record.',
      publisher: 'Example Finance Office'
    }
  };

  return {
    okf_version: '0.1',
    meta: {
      title: 'Geospatial UI test bundle',
      description: 'Deterministic browser fixture.',
      default_corpus: 'geospatial-ui',
      corpus_order: ['geospatial-ui']
    },
    corpora: {
      'geospatial-ui': {
        id: 'geospatial-ui',
        title: 'Geospatial UI test bundle',
        subtitle: 'Deterministic browser fixture',
        root: Object.keys(fixtureNodes)[0] || '',
        nodes: fixtureNodes,
        edges: []
      }
    }
  };
}

function featureCollection() {
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { id: 1 }, geometry: { type: 'Point', coordinates: [-0.14, 51.5] } },
      { type: 'Feature', properties: { id: 2 }, geometry: { type: 'LineString', coordinates: [[-0.2, 51.48], [-0.1, 51.52]] } },
      {
        type: 'Feature',
        properties: { id: 3 },
        geometry: { type: 'Polygon', coordinates: [[[-0.2, 51.48], [-0.05, 51.48], [-0.05, 51.55], [-0.2, 51.48]]] }
      }
    ]
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body)
  });
}

async function installSmallFixture(
  context: BrowserContext,
  bundle = mapBundle(),
  requestLog: string[] = [],
  previewDelayMs = 0
) {
  await context.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    requestLog.push(url.toString());
    if (url.pathname === '/bundle.json') return json(route, bundle);
    if (url.pathname === '/data/parks.geojson') {
      if (previewDelayMs) await new Promise((resolve) => setTimeout(resolve, previewDelayMs));
      return json(route, featureCollection());
    }
    if (url.pathname === '/data/dense.geojson') {
      const coordinates = Array.from({ length: 12_050 }, (_, index) => [-1 + index / 100_000, 52 + index / 200_000]);
      return json(route, {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }]
      });
    }
    if (url.pathname === '/ogc/collections/places/items') return json(route, featureCollection());
    if (url.pathname === '/arcgis/rest/services/Planning/FeatureServer') {
      return json(route, { layers: [{ id: 2, name: 'Planning boundaries' }] });
    }
    if (url.pathname === '/arcgis/rest/services/Planning/FeatureServer/2/query') {
      const features = Array.from({ length: 105 }, (_, index) => ({
        type: 'Feature',
        properties: { id: index },
        geometry: { type: 'Point', coordinates: [-1 + index / 1000, 52] }
      }));
      return json(route, { type: 'FeatureCollection', features });
    }
    if (url.pathname === '/data/unavailable.geojson') return json(route, { error: 'temporarily unavailable' }, 503);
    if (url.pathname === '/wms') return json(route, { linked: true });
    return json(route, { error: 'not found' }, 404);
  });
}

async function openSmallMap(page: Page, options: { bundle?: ReturnType<typeof mapBundle>; geo?: string; previewDelayMs?: number } = {}) {
  const requests: string[] = [];
  await installSmallFixture(page.context(), options.bundle || mapBundle(), requests, options.previewDelayMs || 0);
  const params = new URLSearchParams({ bundle: `${FIXTURE_ORIGIN}/bundle.json`, view: 'map' });
  if (options.geo) params.set('geo', options.geo);
  await page.goto(`?${params.toString()}#overview`);
  await expect(page.getByRole('heading', { name: 'Map & geography' })).toBeVisible();
  return requests;
}

function spatialRecords(page: Page) {
  return page.getByRole('region', { name: 'Spatial records' });
}

function selectedEvidence(page: Page) {
  return page.getByRole('region', { name: 'Selected spatial evidence' });
}

function mapChip(page: Page, label: string) {
  return page.getByLabel('Map reductions').getByRole('button', { name: new RegExp(`^${label}\\b`) });
}

function mapRecord(page: Page, title: string) {
  return spatialRecords(page).getByRole('button', { name: new RegExp(`^${title}\\b`) });
}

test.describe('geospatial Map discovery and reduction', () => {
  test('GEO-E2E-01 opens as a first-class deterministic view without fetching geometry', async ({ page }) => {
    const requests = await openSmallMap(page);

    await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveClass(/active/);
    await expect(page.getByText('9 records in the current search/facet context have spatial evidence.')).toBeVisible();
    await expect(page.getByLabel('Map reductions')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Schematic UK locator with spatial record markers' })).toBeVisible();
    expect(requests.filter((url) => !url.endsWith('/bundle.json'))).toEqual([]);
  });

  test('GEO-E2E-02 exposes every evidence class and both coverage vocabularies', async ({ page }) => {
    await openSmallMap(page);

    for (const label of ['Explicit geometry', 'Declared coverage', 'Map or feature service', 'Spatial file', 'Spatial text signal']) {
      await expect(mapChip(page, label)).toBeVisible();
    }
    for (const label of ['England', 'London', 'Scotland', 'Wales', 'Northern Ireland', 'East Midlands']) {
      await expect(mapChip(page, label)).toBeVisible();
    }
    await expect(mapChip(page, 'Southampton')).toBeVisible();
    await expect(mapChip(page, 'UK EEZ')).toBeVisible();
    await expect(selectedEvidence(page)).toContainText('Explicit geometry');
    await expect(selectedEvidence(page)).toContainText('latitude/longitude');
  });

  test('GEO-E2E-03 applies, toggles and explicitly clears an evidence reduction', async ({ page }) => {
    await openSmallMap(page);
    const service = mapChip(page, 'Map or feature service');

    await service.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('geo')).toBe('signal:service');
    await expect(service).toHaveClass(/active/);
    await expect(page.getByText(/match Map or feature service\./)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Map reduction' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Map or feature service ×' })).toBeVisible();

    await service.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('geo')).toBeNull();

    await mapChip(page, 'Spatial file').click();
    await page.getByRole('button', { name: 'Clear map reduction' }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('geo')).toBeNull();
  });

  test('GEO-E2E-04 reduces by recognised and other declared coverage', async ({ page }) => {
    await openSmallMap(page);

    await mapChip(page, 'London').click();
    await expect.poll(() => new URL(page.url()).searchParams.get('geo')).toBe('area:london');
    await expect(spatialRecords(page).getByRole('button')).toHaveCount(2);

    await page.getByRole('button', { name: 'Clear map reduction' }).click();
    await mapChip(page, 'Southampton').click();
    await expect.poll(() => new URL(page.url()).searchParams.get('geo')).toBe('coverage:Southampton');
    await expect(spatialRecords(page).getByRole('button')).toHaveCount(1);
    await expect(spatialRecords(page)).toContainText('Southampton local register');
  });

  test('GEO-E2E-05 distinguishes exact, representative, clustered and unlocated records', async ({ page }) => {
    await openSmallMap(page);

    await expect(page.locator('.locator-marker:not(.representative)')).toHaveCount(1);
    await expect(page.locator('.locator-marker.representative')).toHaveCount(5);
    await expect(page.getByRole('button', { name: /2 records near London/ })).toBeVisible();
    await expect(page.locator('.locator-summary')).toContainText('7 located records in 6 marker groups');
    await expect(page.locator('.locator-summary')).toContainText('2 spatial records have no locatable coordinate');
  });

  test('GEO-E2E-06 selects a representative marker from the keyboard and explains its precision', async ({ page }) => {
    await openSmallMap(page);
    const marker = page.getByRole('button', { name: 'Regional wellbeing statistics for Scotland', exact: true });

    await marker.focus();
    await marker.press('Enter');
    await expect.poll(() => new URL(page.url()).hash).toBe('#scotland-statistics');
    await expect(marker).toHaveClass(/selected/);
    await expect(selectedEvidence(page)).toContainText('representative centroid for navigation');
    await expect(page.locator('.right-panel')).toContainText('Regional wellbeing statistics for Scotland');
  });
});

test.describe('geospatial Map selection and progressive recovery', () => {
  test('GEO-E2E-07 list selection retains the ordinary route and detail card', async ({ page }) => {
    await openSmallMap(page);
    const record = mapRecord(page, 'Planning boundaries feature service');

    await record.click();
    await expect(record).toHaveClass(/active/);
    await expect.poll(() => new URL(page.url()).hash).toBe('#england-arcgis');
    await expect(selectedEvidence(page).getByRole('heading', { name: 'Planning boundaries feature service' })).toBeVisible();
    await expect(page.locator('.right-panel').getByRole('heading', { name: 'Planning boundaries feature service' })).toBeVisible();
    await selectedEvidence(page).getByRole('button', { name: 'Inspect full record' }).click();
    await expect(page.locator('.right-panel')).toContainText('Route');
  });

  test('GEO-E2E-08 retains area-only records and linked-only WMS resources', async ({ page }) => {
    await openSmallMap(page);

    await mapRecord(page, 'Southampton local register').click();
    await expect(selectedEvidence(page)).toContainText('No machine-readable spatial resource URL was supplied');
    await expect(selectedEvidence(page)).toContainText('Declared coverage');

    await mapRecord(page, 'Wales environmental WMS').click();
    await expect(selectedEvidence(page)).toContainText('WMS · WMS');
    await expect(selectedEvidence(page).getByRole('button', { name: 'Preview on demand' })).toHaveCount(0);
    const source = selectedEvidence(page).getByRole('link', { name: 'Open source ↗' });
    await expect(source).toHaveAttribute('target', '_blank');
    await expect(source).toHaveAttribute('rel', /noopener/);
  });

  test('GEO-E2E-09 shows loading and a bounded direct GeoJSON preview only after consent', async ({ page }) => {
    const requests = await openSmallMap(page, { previewDelayMs: 350 });
    const preview = selectedEvidence(page).getByRole('button', { name: 'Preview on demand' });
    expect(requests.some((url) => url.includes('/data/parks.geojson'))).toBe(false);

    await preview.click();
    await expect(page.getByRole('status')).toContainText('Discovering a bounded feature preview');
    const region = page.getByRole('region', { name: 'On-demand spatial preview' });
    await expect(region.getByRole('img', { name: /Preview of 3 external spatial features/ })).toBeVisible();
    await expect(region).toContainText('Features shown3');
    await expect(region).toContainText('Coordinates drawn7');
    await expect(region).toContainText('WGS84 bounds');
    const requestUrl = requests.find((url) => url.includes('/data/parks.geojson')) || '';
    expect(requestUrl).toContain('view=public');
    expect(requestUrl).not.toContain('token=');
  });

  test('GEO-E2E-10 discovers an ArcGIS layer and displays feature and cap metadata', async ({ page }) => {
    const requests = await openSmallMap(page);
    await mapRecord(page, 'Planning boundaries feature service').click();
    await selectedEvidence(page).getByRole('button', { name: 'Preview on demand' }).click();

    const region = page.getByRole('region', { name: 'On-demand spatial preview' });
    await expect(region).toContainText('Features shown100 (capped)');
    await expect(region).toContainText('LayerPlanning boundaries');
    expect(requests.some((url) => url.endsWith('/FeatureServer?f=pjson'))).toBe(true);
    const query = requests.find((url) => url.includes('/FeatureServer/2/query')) || '';
    expect(query).toContain('resultRecordCount=100');
    expect(query).toContain('outSR=4326');
    expect(query).toContain('f=geojson');
  });

  test('GEO-E2E-11 previews OGC API JSON and exposes the drawing cap', async ({ page }) => {
    await openSmallMap(page);

    await mapRecord(page, 'Northern Ireland OGC API Features').click();
    await selectedEvidence(page).getByRole('button', { name: 'Preview on demand' }).click();
    await expect(page.getByRole('region', { name: 'On-demand spatial preview' })).toContainText('Features shown3');

    await mapRecord(page, 'Dense East Midlands linework').click();
    await selectedEvidence(page).getByRole('button', { name: 'Preview on demand' }).click();
    await expect(page.getByRole('region', { name: 'On-demand spatial preview' })).toContainText('Coordinates drawn12,000 (capped)');
  });

  test('GEO-E2E-12 explains preview failure while preserving both source routes', async ({ page }) => {
    await openSmallMap(page);
    await mapRecord(page, 'UK offshore zones unavailable preview').click();
    await selectedEvidence(page).getByRole('button', { name: 'Preview on demand' }).click();

    const region = page.getByRole('region', { name: 'On-demand spatial preview' });
    await expect(region.getByRole('alert')).toContainText('Preview unavailable');
    await expect(region.getByRole('alert')).toContainText('503 Service Unavailable');
    await expect(region.getByRole('alert')).toContainText('The source link remains available');
    await expect(selectedEvidence(page).getByRole('link', { name: 'Open source ↗' })).toBeVisible();
    await expect(region.getByRole('link', { name: 'Open source ↗' })).toBeVisible();
  });
});

test.describe('geospatial Map state, accessibility and bounds', () => {
  test('GEO-E2E-13 retains geo state across views, reload and Back/Forward', async ({ page }) => {
    await openSmallMap(page);
    await mapChip(page, 'London').click();

    await page.getByRole('button', { name: 'Reader', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('geo')).toBe('area:london');
    await expect(page.getByRole('heading', { name: 'Map reduction' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'London ×' })).toBeVisible();
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.reload();
    await expect(mapChip(page, 'London')).toHaveClass(/active/);

    await mapChip(page, 'Scotland').click();
    await page.goBack();
    await expect.poll(() => {
      const url = new URL(page.url());
      return { geo: url.searchParams.get('geo'), view: url.searchParams.get('view'), hash: url.hash };
    }).toEqual({ geo: 'area:london', view: 'map', hash: '#london-parks' });
    await expect(mapChip(page, 'London')).toHaveClass(/active/);
    await page.goForward();
    await expect.poll(() => new URL(page.url()).searchParams.get('geo')).toBe('area:scotland');
  });

  test('GEO-E2E-14 remains keyboard-operable and becomes single-column below 1000px', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await openSmallMap(page);
    const locator = page.locator('.locator-card');
    const records = page.locator('.map-results');
    const locatorBox = await locator.boundingBox();
    const recordsBox = await records.boundingBox();
    expect(locatorBox).not.toBeNull();
    expect(recordsBox).not.toBeNull();
    expect(recordsBox!.y).toBeGreaterThan(locatorBox!.y + locatorBox!.height - 2);

    const marker = page.getByRole('button', { name: 'Regional wellbeing statistics for Scotland', exact: true });
    await marker.focus();
    await marker.press(' ');
    await expect.poll(() => new URL(page.url()).hash).toBe('#scotland-statistics');
  });

  test('GEO-E2E-15 exposes the large-corpus index-loading state and then renders Map', async ({ page }) => {
    await page.context().route(`${LARGE_ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/okf-explorer.json') return json(route, {
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus',
        title: 'Large geospatial fixture',
        entrypoints: { data_manifest: 'data/manifest.json', overview_index: 'data/overview.json' },
        counts: { datasets: 1, resources: 1, publishers: 1, relationships: 0 }
      });
      if (url.pathname === '/data/manifest.json') return json(route, {
        title: 'Large geospatial fixture',
        generated_at: '2026-07-15T00:00:00Z',
        counts: { datasets: 1, resources: 1, publishers: 1, relationships: 0 },
        indexes: { overview: 'data/overview.json', facets: 'data/facets.json' },
        chunks: {
          datasets: ['data/datasets-0.json'],
          resources: ['data/resources-0.json'],
          publishers: ['data/publishers-0.json'],
          relationships: []
        }
      });
      if (url.pathname === '/data/overview.json') return json(route, {
        title: 'Large geospatial fixture',
        counts: { datasets: 1, resources: 1, publishers: 1, relationships: 0 }
      });
      if (url.pathname === '/data/facets.json') return json(route, {
        schema: 'okf-facets.v1',
        generated_at: '2026-07-15T00:00:00Z',
        publisher: [{ value: 'large-publisher', count: 1 }]
      });
      if (url.pathname === '/data/datasets-0.json') {
        await new Promise((resolve) => setTimeout(resolve, 700));
        return json(route, [{
          id: 'large-map',
          name: 'large-map',
          route: 'dataset/large-map',
          title: 'Large England map service',
          publisher: 'large-publisher',
          publisher_title: 'Large Publisher',
          area_served: 'England',
          resource_count: 1
        }]);
      }
      if (url.pathname === '/data/resources-0.json') return json(route, [{
        id: 'large-wms',
        dataset: 'large-map',
        name: 'Large WMS',
        format: 'WMS',
        url: `${LARGE_ORIGIN}/service?service=WMS`
      }]);
      if (url.pathname === '/data/publishers-0.json') return json(route, [{ id: 'large-publisher', name: 'large-publisher', title: 'Large Publisher' }]);
      return json(route, { error: 'not found' }, 404);
    });
    const params = new URLSearchParams({ bundle: `${LARGE_ORIGIN}/okf-explorer.json`, view: 'map' });
    await page.goto(`?${params.toString()}#overview`);

    await expect(page.getByRole('status')).toContainText('Loading the record and resource index');
    await expect(page.getByRole('heading', { name: 'Map & geography' })).toBeVisible();
    await expect(page.getByText('1 records in the current search/facet context have spatial evidence.')).toBeVisible();
    await expect(mapRecord(page, 'Large England map service')).toBeVisible();

    await page.getByRole('button', { name: 'Graph', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Large corpus graph' })).toBeVisible();
    await expect(page.locator('.error')).toHaveCount(0);
  });

  test('GEO-E2E-16 explains an empty spatial context and recovers when search is cleared', async ({ page }) => {
    await openSmallMap(page);
    const search = page.getByRole('textbox', { name: 'Search nodes' });
    await search.fill('Annual finance');

    await expect(page.getByRole('heading', { name: 'No spatial evidence in this context' })).toBeVisible();
    await expect(page.getByText('Clear or widen the current search/facet reduction')).toBeVisible();
    await search.fill('');
    await expect(page.getByRole('heading', { name: 'Map & geography' })).toBeVisible();
    await expect(spatialRecords(page)).toBeVisible();
  });

  test('GEO-E2E-17 caps the visible record list at 160 and declares the bound', async ({ page }) => {
    const nodes = Object.fromEntries(Array.from({ length: 165 }, (_, index) => {
      const id = `point-${String(index).padStart(3, '0')}`;
      return [id, {
        id,
        title: `Mapped point ${String(index).padStart(3, '0')}`,
        type: 'Dataset',
        publisher: 'Scale Fixture',
        latitude: 50 + index / 100,
        longitude: -5 + index / 100,
        tags: ['mapping']
      }];
    }));
    await openSmallMap(page, { bundle: mapBundle(nodes) });

    await expect(spatialRecords(page).getByRole('button')).toHaveCount(160);
    await expect(spatialRecords(page)).toContainText('Showing the first 160 records; use another map reduction to narrow the set.');
  });

  test('GEO-E2E-18 starts from ordinary search context and ignores malformed geo state safely', async ({ page }) => {
    await openSmallMap(page, { geo: 'signal:unknown' });
    await expect(page.getByRole('button', { name: 'Clear map reduction' })).toHaveCount(0);
    await expect(spatialRecords(page).getByRole('button')).toHaveCount(9);

    const search = page.getByRole('textbox', { name: 'Search nodes' });
    await search.fill('Scotland');
    await expect(spatialRecords(page).getByRole('button')).toHaveCount(1);
    await expect(spatialRecords(page)).toContainText('Regional wellbeing statistics for Scotland');
  });
});
