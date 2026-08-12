import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const playwrightPackage = process.env.PLAYWRIGHT_PACKAGE;
if (!playwrightPackage) throw new Error('PLAYWRIGHT_PACKAGE is required');
const { chromium } = require(playwrightPackage);

const outputDirectory = '/private/tmp/okf-landregistry-v030-public-verification';
const explorerRoot = 'https://chris-page-gov.github.io/okf-explorer/';
const bundleUrl = 'https://chris-page-gov.github.io/okf-LandRegistry/okf-explorer.json';
const siteUrl = 'https://chris-page-gov.github.io/okf-LandRegistry/';
const expected = {
  explorer_manifest_sha256: '681498b253d1c1aba7749d8fc942bdc74a5fc412c897ab9bc13e0369ac558652',
  explorer_tree_sha256: '03b482117351213a1eecb405e8542365bd7693b55e58b46ace85921c5a975e53',
  descriptor_sha256: '36d21eee6b3fcf85ea1a9f9a6501e39d73acba3aef9904c4120075878d4b4b5d',
  checksums_sha256: 'f92d3bb61ce9509f038875b29b49c9fa6c84aa50ec5cd31daa0bc4bf06c5efef',
  overview_sha256: '19311056b22c89fde444072fd0b41706a915941a3274b6c5777349f3cf0466aa',
  records: 2203,
  dataset_groupings: 14,
  resources: 2203,
  relationships: 22267,
  search_result: 'Exact line of boundary: registration (DB)',
  translation_route: 'dataset/record-40df4468c132c56cf31cfbc5',
  relationship_predicate: 'translation of'
};

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertEqual(actual, wanted, label) {
  if (actual !== wanted) {
    throw new Error(`${label}: expected ${JSON.stringify(wanted)}, got ${JSON.stringify(actual)}`);
  }
}

async function fetchBytes(url) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}verification=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'cache-control': 'no-cache' }
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function metric(page, slug) {
  const card = page.locator(`[data-metric="${slug}"]`);
  await card.locator('strong').waitFor({ state: 'visible', timeout: 120_000 });
  return {
    value: (await card.locator('strong').innerText()).trim(),
    label: (await card.locator('span').innerText()).trim()
  };
}

await mkdir(outputDirectory, { recursive: true });
const observedAt = new Date().toISOString();
const scriptBytes = await readFile(fileURLToPath(import.meta.url));
const receipt = {
  schema: 'okf-hmlr-public-deployment-verification.v2',
  status: 'fail',
  observed_at: observedAt,
  verification_scope: 'public-byte-identity-and-representative-real-browser-journey',
  evaluator: {
    path: fileURLToPath(import.meta.url),
    sha256: sha256(scriptBytes)
  },
  public_routes: {
    site: siteUrl,
    descriptor: bundleUrl,
    explorer: ''
  },
  explorer: {
    merge_commit: process.env.EXPLORER_MERGE_COMMIT || null,
    pages_run: process.env.EXPLORER_PAGES_RUN || null,
    version: '0.6.3',
    build_manifest: null
  },
  release: {
    version: '0.3.0',
    candidate_commit_sha: '751b6c1e80fbbad3c07f19798c74aebd603eb62c',
    evidence_commit_sha: '1d708e39f2cde19610d43c5a7f5e36e4a2f947bc',
    approved_release_root_sha256: '6a29e38e7bb805aafb7f36ba8d1fa4ce976875f45997049cd4808d6ede7f75e1',
    final_g9_manifest_sha256: '3bb0d8ba015df82611db3f705b36bc7b927285468436e0aab81e9f32fc66a232',
    final_g9_record_sha256: '848833cd720b31101db1c6279b2416fc9678ba4d3e99ad1f7e32531f2ee89030',
    pages_run: 'https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31543515600'
  },
  compatibility_boundary: {
    governed_candidate_acceptance: 'OKF Explorer v0.6.2',
    post_g9_presentation_observation: 'OKF Explorer v0.6.3'
  },
  prior_failed_attempts: [
    {
      receipt: 'failed-attempt-1.json',
      failure: 'The verifier observed the pre-query settled list before the debounced exact-boundary query became active.',
      correction: 'Require both settled state and the exact data-okf-query value before reading rank one.',
      repository_or_bundle_changed: false
    },
    {
      receipt: 'failed-attempt-2.json',
      failure: 'The verifier required a right-panel Relationships (15) string before opening Graph.',
      correction: 'Treat the graph summary and predicate-aware graph edge as the relationship-delivery evidence; the right-panel wording is not a release invariant.',
      repository_or_bundle_changed: false
    },
    {
      receipt: 'failed-attempt-3.json',
      failure: 'The verifier imposed an ungoverned rank-one assertion; its definition also conflated the boundary-search and translation-graph journeys, although execution stopped at rank one.',
      correction: 'Follow the frozen product journeys exactly: require the boundary result to be present, then verify translation on its governed deep-link route.',
      repository_or_bundle_changed: false
    }
  ],
  deployed_identity: null,
  browser_verification: null,
  limitations: [
    'This public-browser observation is AI-agent-assisted, not an independent human accessibility, security, legal, licence, privacy or domain audit.',
    'The representative public journey does not repeat every locked local journey or fetch every published file; promotion also relies on the scoped public byte checks and the full digest-bound local G9 and consumer evidence.',
    'No representative-user study was performed.',
    'The bundle remains metadata-only and must not be used for legal, ownership, priority or exact-boundary conclusions.',
    'Explorer v0.6.3 is recorded as a post-G9 presentation observation; it does not widen the candidate’s governed v0.6.2 compatibility claim.'
  ]
};

let browser;
try {
  const [manifestBytes, descriptorBytes, checksumsBytes, overviewBytes] = await Promise.all([
    fetchBytes(`${explorerRoot}okf-explorer-build-manifest.json`),
    fetchBytes(bundleUrl),
    fetchBytes(`${siteUrl}CHECKSUMS.sha256`),
    fetchBytes(`${siteUrl}data/explorer/overview.json`)
  ]);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
  const identity = {
    explorer_manifest_sha256: sha256(manifestBytes),
    explorer_tree_sha256: manifest.tree_sha256,
    descriptor_sha256: sha256(descriptorBytes),
    checksums_sha256: sha256(checksumsBytes),
    overview_sha256: sha256(overviewBytes),
    descriptor_version: descriptor.version,
    descriptor_id: descriptor['@id'],
    counts: descriptor.counts,
    entrypoints: {}
  };
  assertEqual(identity.explorer_manifest_sha256, expected.explorer_manifest_sha256, 'Explorer manifest SHA-256');
  assertEqual(identity.explorer_tree_sha256, expected.explorer_tree_sha256, 'Explorer application tree');
  assertEqual(identity.descriptor_sha256, expected.descriptor_sha256, 'Land Registry descriptor SHA-256');
  assertEqual(identity.checksums_sha256, expected.checksums_sha256, 'Land Registry checksum-manifest SHA-256');
  assertEqual(identity.overview_sha256, expected.overview_sha256, 'Land Registry overview SHA-256');
  assertEqual(identity.descriptor_version, '0.3.0', 'descriptor version');
  assertEqual(descriptor.counts.records, expected.records, 'descriptor record count');
  assertEqual(descriptor.counts.datasets, expected.dataset_groupings, 'descriptor dataset-grouping count');
  assertEqual(descriptor.counts.resources, expected.resources, 'descriptor resource count');
  assertEqual(descriptor.counts.relationships, expected.relationships, 'descriptor relationship count');
  for (const [name, material] of Object.entries(descriptor.entrypoint_integrity || {})) {
    const bytes = await fetchBytes(new URL(material.path, bundleUrl).href);
    const result = { path: material.path, bytes: bytes.length, sha256: sha256(bytes), status: 'pass' };
    assertEqual(result.bytes, material.bytes, `${name} bytes`);
    assertEqual(result.sha256, material.sha256, `${name} SHA-256`);
    identity.entrypoints[name] = result;
  }
  receipt.deployed_identity = identity;
  receipt.explorer.build_manifest = manifest;

  const explorerUrl = new URL(explorerRoot);
  explorerUrl.searchParams.set('bundle', bundleUrl);
  explorerUrl.searchParams.set('view', 'reader');
  explorerUrl.searchParams.set('verification', String(Date.now()));
  explorerUrl.hash = 'overview';
  receipt.public_routes.explorer = explorerUrl.href;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 1728, height: 1117 }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const consoleWarnings = [];
  const requestFailures = [];
  const errorResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('requestfailed', (request) => requestFailures.push({
    url: request.url(),
    error: request.failure()?.errorText || 'unknown'
  }));
  page.on('response', (response) => {
    if (response.status() >= 400) errorResponses.push({ url: response.url(), status: response.status() });
  });

  await page.goto(explorerUrl.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const readerMetrics = {
    records: await metric(page, 'hmlr-discovery-records'),
    resources: await metric(page, 'official-sources'),
    relationships: await metric(page, 'relationships')
  };
  assertEqual(readerMetrics.records.value, '2,203', 'Reader record headline');
  assertEqual(readerMetrics.records.label, 'HMLR discovery records', 'Reader record label');
  assertEqual(readerMetrics.resources.value, '2,203', 'Reader source headline');
  assertEqual(readerMetrics.relationships.value, '22,267', 'Reader relationship headline');
  await page.screenshot({ path: `${outputDirectory}/reader.png`, fullPage: true });

  await page.getByLabel('Views').getByRole('button', { name: 'Timeline', exact: true }).click();
  const timelineHeading = page.locator('.view-heading').filter({ has: page.getByRole('heading', { name: 'Timeline', exact: true }) });
  await timelineHeading.waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForFunction(() => {
    const headings = [...document.querySelectorAll('.view-heading')];
    const text = headings.find((item) => item.querySelector('h2')?.textContent?.trim() === 'Timeline')?.textContent || '';
    return text.includes('2,203') && text.includes('HMLR discovery records') && !text.includes('14 HMLR discovery records');
  }, undefined, { timeout: 120_000 });
  const timelineText = (await timelineHeading.innerText()).replace(/\s+/g, ' ').trim();
  await page.screenshot({ path: `${outputDirectory}/timeline.png`, fullPage: true });

  await page.getByLabel('Views').getByRole('button', { name: 'Reader', exact: true }).click();
  const search = page.getByPlaceholder('Search guidance, datasets, services, APIs and repositories');
  await search.fill('exact boundary');
  const settledResults = page.locator('[data-okf-ranked-results="primary"][data-okf-search-state="settled"][data-okf-query="exact boundary"]');
  await settledResults.waitFor({ state: 'visible', timeout: 120_000 });
  const resultButtons = settledResults.locator('button');
  const resultTitles = await resultButtons.locator('strong').allInnerTexts();
  const searchResultRank = resultTitles.findIndex((title) => title.trim() === expected.search_result) + 1;
  if (searchResultRank < 1) throw new Error(`${expected.search_result} was absent from settled exact-boundary results`);
  const searchResult = resultButtons.filter({ hasText: expected.search_result }).first();
  await searchResult.waitFor({ state: 'visible', timeout: 120_000 });
  await searchResult.click();
  await page.locator('.right-panel').getByRole('heading', { name: expected.search_result, exact: true }).waitFor({ state: 'visible', timeout: 120_000 });
  await page.screenshot({ path: `${outputDirectory}/selected-record.png`, fullPage: true });

  const graphRequests = [];
  const recordGraphRequest = (request) => graphRequests.push(request.url());
  page.on('request', recordGraphRequest);
  const graphUrl = new URL(explorerRoot);
  graphUrl.searchParams.set('bundle', bundleUrl);
  graphUrl.searchParams.set('view', 'graph');
  graphUrl.searchParams.set('verification', String(Date.now()));
  graphUrl.hash = expected.translation_route;
  await page.goto(graphUrl.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const graph = page.getByRole('group', { name: 'Large corpus graph' });
  await graph.waitFor({ state: 'visible', timeout: 120_000 });
  await graph.locator('.edge-label').filter({ hasText: expected.relationship_predicate }).first().waitFor({ state: 'visible', timeout: 120_000 });
  const graphSummary = (await page.locator('.graph-summary').innerText()).replace(/\s+/g, ' ').trim();
  if (!graphSummary.includes('15 relationships')) throw new Error(`graph summary did not report 15 relationships: ${graphSummary}`);
  if (!graphRequests.some((url) => url.includes('/okf-LandRegistry/data/semantic/runtime-manifest.json'))) throw new Error('graph did not request the semantic runtime manifest');
  if (!graphRequests.some((url) => url.includes('/okf-LandRegistry/data/semantic/runtime/route-locator/bucket-c5.json.gz'))) throw new Error('graph did not request the governed route-locator bucket');
  if (!graphRequests.some((url) => url.includes('/okf-LandRegistry/data/semantic/runtime/core/relationships-'))) throw new Error('graph did not request a semantic relationship shard');
  if (graphRequests.some((url) => url.includes('/okf-LandRegistry/data/explorer/adjacency/'))) throw new Error('translation deep link unexpectedly fell back to Explorer adjacency');
  page.off('request', recordGraphRequest);
  await page.screenshot({ path: `${outputDirectory}/graph.png`, fullPage: true });

  assertEqual(consoleErrors.length, 0, 'console errors');
  assertEqual(consoleWarnings.length, 0, 'console warnings');
  assertEqual(requestFailures.length, 0, 'request failures');
  assertEqual(errorResponses.length, 0, 'HTTP error responses');
  receipt.browser_verification = {
    status: 'pass',
    browser_family: 'Chromium',
    browser_version: browser.version(),
    service_workers: 'blocked-for-cache-isolated-verification',
    reader_metrics: readerMetrics,
    timeline_heading: timelineText,
    journey: {
      search: {
        query: 'exact boundary',
        expected_result: expected.search_result,
        observed_rank: searchResultRank,
        status: 'pass'
      },
      graph: {
        route: expected.translation_route,
        relationship_count: 15,
        predicate_observed: expected.relationship_predicate,
        graph_summary: graphSummary,
        semantic_runtime_manifest_requested: true,
        governed_route_locator_requested: true,
        semantic_relationship_shard_requested: true,
        explorer_adjacency_requested: false,
        status: 'pass'
      },
      status: 'pass'
    },
    console: { errors: consoleErrors, warnings: consoleWarnings },
    network: { request_failures: requestFailures, error_responses: errorResponses }
  };
  receipt.evidence_files = {};
  for (const name of [
    'reader.png',
    'timeline.png',
    'selected-record.png',
    'graph.png',
    'failed-attempt-1.json',
    'failed-attempt-2.json',
    'failed-attempt-3.json'
  ]) {
    const bytes = await readFile(`${outputDirectory}/${name}`);
    receipt.evidence_files[name] = { bytes: bytes.length, sha256: sha256(bytes) };
  }
  receipt.promotion = {
    owner_requested_final_release: true,
    decision: 'ready_for_byte_identical_final_release',
    status: 'pass'
  };
  receipt.status = 'pass';
} catch (error) {
  receipt.error = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
  throw error;
} finally {
  if (browser) await browser.close();
  await writeFile(`${outputDirectory}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
}
