import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL('../../../../profiles/analytical-data/v2/examples/library-observations/', import.meta.url);
const manifestPath = fileURLToPath(new URL('okf-analytical-data.json', root));
const csvPath = fileURLToPath(new URL('observations.csv', root));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const body = readFileSync(csvPath);

async function load(page: import('@playwright/test').Page, declaration = manifest) {
  await page.goto('/inspect-data/');
  await expect(page.getByLabel('Package manifest (okf-analytical-data.json)', { exact: true })).toBeEnabled();
  await page.getByLabel('Package manifest (okf-analytical-data.json)', { exact: true }).setInputFiles({ name: 'okf-analytical-data.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(declaration)) });
  await expect(page.getByLabel('CSV for the selected table')).toBeVisible();
}

test('local table preview preserves literals and explicit gaps without transmitting content', async ({ page }) => {
  const outgoing: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET' || new URL(request.url()).hostname !== '127.0.0.1') outgoing.push(request.url()); });
  await load(page);
  await page.getByLabel('CSV for the selected table').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Inspect selected table', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Preview checks passed' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Checked table preview' })).toContainText('2026-11-14T10:00:00.000000001Z');
  await expect(page.getByRole('region', { name: 'Checked table preview' })).toContainText('[suppressed] · suppressed');
  await expect(page.getByText('Gap: Vertical datum is not recorded.')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('1 true numeric measure zeroes');
  expect(outgoing).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(await page.evaluate(() => Boolean((window as unknown as { __okfPageTools?: unknown }).__okfPageTools))).toBe(false);
  await page.getByRole('button', { name: 'Clear files and preview' }).click();
  await expect(page.getByRole('heading', { name: 'Preview checks passed' })).toHaveCount(0);
  await expect(page.getByLabel('Package manifest (okf-analytical-data.json)', { exact: true })).toHaveValue('');
});

test('fails closed on a mismatched file and clears stale successful results', async ({ page }) => {
  await load(page);
  await page.getByLabel('CSV for the selected table').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Inspect selected table', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Preview checks passed' })).toBeVisible();
  await page.getByLabel('CSV for the selected table').setInputFiles({ name: 'observations.csv', mimeType: 'text/csv', buffer: Buffer.from('changed') });
  await expect(page.getByRole('heading', { name: 'Preview checks passed' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect selected table', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('checksum differs');
});

test('source text remains inert and a second profile is explicitly unassessed', async ({ page }) => {
  const declaration = structuredClone(manifest);
  declaration.dataset.title = '<script>window.__tableCanary=1</script>';
  declaration.conformsTo.push('https://example.invalid/unevaluated-profile');
  await load(page, declaration);
  await expect(page.getByText(declaration.dataset.title, { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __tableCanary?: number }).__tableCanary)).toBeUndefined();
  await expect(page.getByText('Other tables and additional profiles are not validated here.', { exact: false })).toBeVisible();
});

test('offset-equivalent observation keys fail despite a matching checksum', async ({ page }) => {
  const declaration = structuredClone(manifest);
  const changed = Buffer.from(body.toString().replace('North,2026-11-14T10:00:00.000000001Z','North,2026-11-14T10:00:00Z').replace('South,','North,'));
  declaration.tables[0].sha256 = createHash('sha256').update(changed).digest('hex');
  await load(page, declaration);
  await page.getByLabel('CSV for the selected table').setInputFiles({ name: 'observations.csv', mimeType: 'text/csv', buffer: changed });
  await page.getByRole('button', { name: 'Inspect selected table', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Duplicate observation key');
});

test('keyboard, narrow layout and automated accessibility remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page);
  await page.getByLabel('CSV for the selected table').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Inspect selected table', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Preview checks passed' })).toBeVisible();
  const preview = page.getByRole('region', { name: 'Checked table preview' });
  await preview.focus(); await expect(preview).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('clearing during an unfinished manifest read prevents stale data returning', async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function () {
      const body = await original.call(this);
      await new Promise<void>(resolve => { (window as unknown as { releaseManifest?: () => void }).releaseManifest = resolve; });
      (window as unknown as { manifestReadFinished?: boolean }).manifestReadFinished = true;
      return body;
    };
  });
  await page.goto('/inspect-data/');
  const input = page.getByLabel('Package manifest (okf-analytical-data.json)', { exact: true });
  await expect(input).toBeEnabled();
  await input.setInputFiles(manifestPath);
  await page.waitForFunction(() => Boolean((window as unknown as { releaseManifest?: () => void }).releaseManifest));
  await page.getByRole('button', { name: 'Clear files and preview' }).click();
  await page.evaluate(() => (window as unknown as { releaseManifest?: () => void }).releaseManifest?.());
  await page.waitForFunction(() => (window as unknown as { manifestReadFinished?: boolean }).manifestReadFinished);
  await expect(page.getByLabel('CSV for the selected table')).toHaveCount(0);
  await expect(input).toHaveValue('');
});
