// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { Buffer } from 'node:buffer';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { readFile } from 'node:fs/promises';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { resolve, sep } from 'node:path';
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
import { expect, test } from '@playwright/test';
import { openOnsFacetFixture } from './fixtures/ons-facets.fixture';
const learningPresentation = {
  schema: 'okf-large-learning-presentation.v1', title: 'Learn to assess statistics', introduction: 'Practise with source records.',
  paths: [{ id: 'assess', title: 'Check the source', steps: [
    { route: 'dataset/ons-record-0001', title: 'Read housing evidence', outcome: 'Explain the measure', practice: 'Write down two limitations.', minutes: 10 },
    { route: 'dataset/ons-record-0002', title: 'Compare another measure', outcome: 'Explain the difference' }
  ] }]
};
test('large learning steps navigate records, preserve history and track reversible progress', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openOnsFacetFixture(page, [], { learningPresentation });
  const panel = page.getByRole('region', { name: 'Learning paths', exact: true });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Read housing evidence', exact: true }).click();
  await expect(page).toHaveURL(/#dataset\/ons-record-0001$/);
  await expect(panel.getByRole('status')).toContainText('Selected: Read housing evidence');
  await panel.getByRole('checkbox', { name: 'I have completed Read housing evidence' }).check();
  await expect(panel.locator('summary')).toContainText('1/2 complete');
  await panel.getByRole('button', { name: 'Compare another measure', exact: true }).click();
  await expect(page).toHaveURL(/#dataset\/ons-record-0002$/);
  await page.goBack();
  await expect(panel.getByRole('status')).toContainText('Selected: Read housing evidence');
  await panel.getByRole('button', { name: 'Reset learning progress' }).click();
  await expect(panel.locator('summary')).toContainText('0/2 complete');
  expect(errors).toEqual([]);
});
test('legacy large bundles retain the existing Reader without a learning panel', async ({ page }) => {
  await openOnsFacetFixture(page);
  await expect(page.getByRole('region', { name: 'Learning paths', exact: true })).toHaveCount(0);
});

const smallLearning = {
  title: 'Practice bundle', nodes: {
    'start.md': { id: 'start.md', title: 'Learning start', type: 'Goal' },
    'activity.md': { id: 'activity.md', title: 'Try a source check', type: 'Activity', learning_facets: { topic: ['Evidence'] } }
  }, relationships: [], meta: { learning_presentation: {
    schema: 'okf-learning-presentation.v1', start_route: 'start.md', title: 'Practise source checking',
    facets: [{ key: 'topic', label: 'Topic' }], groups: [{ title: 'Start practising', routes: ['activity.md'] }]
  } }
};
test('switches learning to legacy to learning through File without stale panels', async ({ page }) => {
  await openOnsFacetFixture(page);
  const input = page.locator('input[type=file]');
  const upload = (name: string, data: unknown) => input.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await upload('learning.json', smallLearning);
  await expect(page.getByRole('region', { name: 'Learning path', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Try a source check/ }).first().click();
  await expect(page).toHaveURL(/#activity.md$/);
  await upload('legacy.json', { title: 'Legacy bundle', nodes: { 'legacy.md': { id: 'legacy.md', title: 'Legacy record' } }, relationships: [] });
  await expect(page.getByRole('region', { name: 'Learning path', exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/#legacy.md$/);
  await upload('learning.json', smallLearning);
  await expect(page.getByRole('heading', { name: 'Practise source checking' })).toBeVisible();
  await expect(page).toHaveURL(/#start.md$/);
});

test('local DWP pilot loads by URL and File and survives learning switches', async ({ page }) => {
  test.skip(!env.OKF_DWP_PILOT, 'Set OKF_DWP_PILOT to the locally reviewed public pilot JSON.');
  const bytes = await readFile(env.OKF_DWP_PILOT!);
  const bundle = JSON.parse(bytes.toString());
  const firstRoute = Object.keys(bundle.nodes)[0];
  const url = 'https://dwp-pilot.fixture.test/okf-bundle.json';
  await page.route(url, route => route.fulfill({ contentType: 'application/json', body: bytes, headers: { 'access-control-allow-origin': '*' } }));
  await page.goto(`?bundle=${encodeURIComponent(url)}#${firstRoute}`);
  await expect(page.getByRole('region', { name: 'Learning path', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Search nodes' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search nodes' }).fill('Pension Credit');
  await expect(page).toHaveURL(/q=Pension/);
  await page.getByRole('textbox', { name: 'Search nodes' }).fill('');
  await page.getByRole('button', { name: 'Graph', exact: true }).first().click();
  await expect(page).toHaveURL(/view=graph/);
  const input = page.locator('input[type=file]');
  await input.setInputFiles({ name: 'learning.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(smallLearning)) });
  await expect(page.getByRole('heading', { name: 'Practise source checking' })).toBeVisible();
  await input.setInputFiles({ name: 'dwp-pilot.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByRole('region', { name: 'Learning path', exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`#${firstRoute}$`));
  await expect(page.getByRole('textbox', { name: 'Search nodes' })).toHaveValue('');
  await input.setInputFiles({ name: 'learning.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(smallLearning)) });
  await expect(page.getByRole('heading', { name: 'Practise source checking' })).toBeVisible();
});

test('local combined DWP records support a learning overlay without eager record loading', async ({ page }) => {
  test.skip(!env.OKF_DWP_COMBINED, 'Set OKF_DWP_COMBINED to the locally reviewed combined corpus directory.');
  const root = resolve(env.OKF_DWP_COMBINED!);
  const requests: string[] = [];
  await page.route('https://dwp-combined.fixture.test/**', async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root + sep)) return route.abort();
    requests.push(pathname);
    try {
      let body = await readFile(file);
      if (pathname === '/okf-explorer.json') {
        const descriptor = JSON.parse(body.toString());
        descriptor.learning_presentation = {
          ...learningPresentation, title: 'Review guidance evidence',
          paths: [{ id: 'review', title: 'Review the source', steps: [{ route: 'chapter/77', title: 'Read the captured chapter', outcome: 'Explain the source limitations', practice: 'Identify the source date and review status.' }] }]
        };
        body = Buffer.from(JSON.stringify(descriptor));
      }
      await route.fulfill({ body, contentType: pathname.endsWith('.gz') ? 'application/gzip' : 'application/json', headers: { 'access-control-allow-origin': '*' } });
    } catch { await route.fulfill({ status: 404, body: 'Missing local fixture file' }); }
  });
  await page.goto(`?bundle=${encodeURIComponent('https://dwp-combined.fixture.test/okf-explorer.json')}#overview`);
  const panel = page.getByRole('region', { name: 'Learning paths', exact: true });
  await expect(panel).toBeVisible();
  expect(requests.filter(path => /records-\d+/.test(path))).toHaveLength(0);
  await panel.getByRole('button', { name: 'Read the captured chapter', exact: true }).click();
  await expect(page).toHaveURL(/#chapter\/77$/);
  await expect(page.getByRole('heading', { name: /DMG Vol 13 Ch 77/ }).first()).toBeVisible();
  await expect.poll(() => requests.filter(path => /records-\d+/.test(path)).length).toBeGreaterThan(0);
  expect(new Set(requests.filter(path => /records-\d+/.test(path))).size).toBeLessThan(5);
});

test('an unavailable learning record leaves the current selection intact and explains the gap', async ({ page }) => {
  await openOnsFacetFixture(page, [], { learningPresentation: {
    ...learningPresentation, paths: [{ id: 'missing', title: 'Unavailable source', steps: [{ route: 'dataset/not-published', title: 'Missing step', outcome: 'Check publication' }] }]
  } });
  await page.getByRole('region', { name: 'Learning paths', exact: true }).getByRole('button', { name: 'Missing step' }).click();
  await expect(page.getByText('This learning step has no available record in the published corpus. Choose another step or contact the bundle producer.')).toBeVisible();
  await expect(page).toHaveURL(/#overview$/);
});
