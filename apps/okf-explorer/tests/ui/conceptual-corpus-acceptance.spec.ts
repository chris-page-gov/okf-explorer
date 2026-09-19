import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { createHash } from 'node:crypto';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import path from 'node:path';

// Optional producer acceptance. Ordinary CI uses the portable synthetic fixture
// in conceptual-navigation.spec.ts and never depends on a sibling checkout.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const corpusRoot = env.OKF_CONCEPT_CORPUS_ROOT;
const descriptorPath = env.OKF_CONCEPT_DESCRIPTOR || 'okf-review-context.json';
const origin = 'https://concept-corpus.fixture.test';
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('producer conceptual facets preserve actual corpus selection across Reader, Graph and Timeline', async ({ page }, testInfo) => {
  test.skip(!corpusRoot, 'Set OKF_CONCEPT_CORPUS_ROOT to an external public corpus directory.');
  test.setTimeout(180_000);
  const root = path.resolve(corpusRoot!);
  const localPath = (reference: string) => {
    const target = path.resolve(root, reference);
    if (!target.startsWith(root + path.sep)) throw new Error('Corpus reference escapes the supplied directory');
    return target;
  };
  const json = async (reference: string) => JSON.parse(await readFile(localPath(reference), 'utf8'));
  const descriptorBytes = await readFile(localPath(descriptorPath));
  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
  const manifest = await json(descriptor.entrypoints.data_manifest);
  const analysis = await json(manifest.indexes.analysis);
  const facets = await json(manifest.indexes.facets);
  const declaredCases = env.OKF_CONCEPT_CASES ? JSON.parse(env.OKF_CONCEPT_CASES) : [];
  const cases = analysis.facet_analysis.filter((row: any) => row.classification).map((row: any) => {
    const requested = declaredCases.find((item: any) => item.key === row.key)?.value;
    const values = facets[row.key].filter((value: any) => value.count > 0 && !/not classified|__missing__/i.test(value.value));
    const choice = requested ? values.find((value: any) => value.value === requested)
      : values.sort((left: any, right: any) => left.count - right.count || left.value.localeCompare(right.value))[0];
    if (!choice) throw new Error(`No populated classification value for ${row.key}`);
    return { key: row.key, label: row.label, value: choice.value, expected_records: choice.count };
  });
  expect(cases.length).toBeGreaterThan(0);
  const output = env.OKF_CONCEPT_OUTPUT ? path.resolve(env.OKF_CONCEPT_OUTPUT) : testInfo.outputPath('concept-navigation');
  await mkdir(output, { recursive: true });
  let appBuild: Record<string, unknown> | null = null;
  if (env.OKF_CONCEPT_APP_MANIFEST_URL) {
    const response = await page.request.get(env.OKF_CONCEPT_APP_MANIFEST_URL);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    if (env.OKF_CONCEPT_APP_MANIFEST_SHA256) expect(hash(bytes)).toBe(env.OKF_CONCEPT_APP_MANIFEST_SHA256);
    const build = JSON.parse(bytes.toString('utf8'));
    for (const material of build.materials) {
      const response = await page.request.get(new URL(material.path, env.OKF_CONCEPT_APP_MANIFEST_URL).href);
      expect(response.ok(), material.path).toBe(true);
      const actual = await response.body();
      expect(actual.length, material.path).toBe(material.bytes);
      expect(hash(actual), material.path).toBe(material.sha256);
    }
    appBuild = { manifest_sha256: hash(bytes), tree_sha256: build.tree_sha256, verified_materials: build.materials.length };
  }
  const served = new Map<string, { path: string; bytes: number; sha256: string }>();
  const consoleErrors: string[] = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.context().route(`${origin}/**`, async route => {
    const reference = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
    const bytes = await readFile(localPath(reference));
    served.set(reference, { path: reference, bytes: bytes.length, sha256: hash(bytes) });
    await route.fulfill({ status: 200, body: bytes, headers: {
      'content-type': reference.endsWith('.gz') ? 'application/gzip' : reference.endsWith('.md') ? 'text/markdown' : 'application/json',
      'access-control-allow-origin': '*'
    } });
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  const observations = [];
  for (const row of cases) {
    await page.goto(`?bundle=${encodeURIComponent(`${origin}/${descriptorPath}`)}#overview`);
    await expect(page.locator('.title-block')).toContainText(descriptor.title);
    const facet = page.locator(`[data-facet-key="${row.key}"]`);
    const toggle = facet.locator('.facet-toggle');
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    await expect(facet.getByRole('note')).toContainText('Producer-declared classification');
    await expect(facet.getByRole('note')).toContainText('whole snapshot');
    const value = facet.locator('[data-facet-value]').filter({ hasText: row.value });
    const search = facet.getByRole('textbox');
    if (await search.count()) await search.fill(row.value);
    await value.getByText(row.value, { exact: true }).click();
    await page.getByRole('button', { name: 'Keep highlighted', exact: true }).click();
    const expectedScope = `0 highlighted / ${row.expected_records.toLocaleString('en-GB')} in scope`;
    await expect(page.locator('.exploration-toolbar')).toContainText(expectedScope, { timeout: 30_000 });
    const reader = { view: 'reader', scope: expectedScope };
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `${row.key}-reader.png`), fullPage: false });
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Large corpus graph', exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.exploration-toolbar')).toContainText(expectedScope);
    await page.screenshot({ path: path.join(output, `${row.key}-graph.png`), fullPage: false });
    await page.getByLabel('Views').getByRole('button', { name: 'Timeline', exact: true }).click();
    await expect(page.getByLabel('Primary date role')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.exploration-toolbar')).toContainText(expectedScope);
    // The toolbar is supplied by postings; the view heading uses hydrated
    // records. Checking both catches producer projection disagreements.
    await expect(page.locator('.view-heading').filter({ hasText: 'Timeline' }))
      .toContainText(`${row.expected_records.toLocaleString('en-GB')} ${descriptor.vocabulary?.record_plural || 'datasets'} in current reduction`);
    await expect(page.locator('.timeline-counts')).toContainText('dated record groups');
    const dateGroupCounts = await page.locator('.timeline-counts').innerText();
    await page.getByLabel('Primary date role').selectOption('audit');
    const auditRecords = await page.locator('.release-series').count();
    await page.getByLabel('Primary date role').selectOption('source');
    const sourceRecords = await page.locator('.release-series').count();
    expect((await page.locator('.timeline-evidence-date > small').allTextContents()).some(label => label === 'Captured')).toBe(false);
    await page.getByLabel('Primary date role').selectOption('all');
    await page.screenshot({ path: path.join(output, `${row.key}-timeline.png`), fullPage: false });
    const accessibility = await new AxeBuilder({ page }).include('.facet-sections').include('.timeline-toolbar').include('.timeline-role-filter').analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await page.getByRole('alert').allTextContents()).toEqual([]);
    observations.push({ ...row, views: [reader, { view: 'graph', scope: expectedScope }, { view: 'timeline', scope: expectedScope }],
      date_group_counts: dateGroupCounts, rendered_audit_series: auditRecords, rendered_source_series: sourceRecords, targeted_accessibility_violations: accessibility.violations });
  }
  expect(consoleErrors).toEqual([]);
  await writeFile(path.join(output, 'observation.json'), JSON.stringify({
    schema: 'okf-concept-navigation-browser-observation.v1', observed_at: new Date().toISOString(),
    status: 'passed', environment: 'local-browser-candidate', browser: testInfo.project.name,
    app_build: appBuild,
    descriptor: { path: descriptorPath, sha256: hash(descriptorBytes), snapshot: descriptor.snapshot },
    observations, console_errors: consoleErrors, served_files: [...served.values()].sort((a, b) => a.path.localeCompare(b.path)),
    limitations: ['Local candidate only; this is not a public deployment receipt.',
      'Corpus bytes are served unchanged by a bounded local test fixture; gzip file bytes retain their declared hashes.',
      'Accessibility checks cover facet and Timeline controls only, not the whole application.',
      'Classification discovery is not specialist-reviewed legal applicability.']
  }, null, 2) + '\n');
});
