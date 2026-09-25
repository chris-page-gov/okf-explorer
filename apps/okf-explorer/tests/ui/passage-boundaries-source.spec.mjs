import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('loads all source cases and verifies frozen PDF bytes when a producer fixture is supplied', async ({ page }) => {
  const directory = process.env.DWP_PASSAGE_REVIEW_DIR;
  test.skip(!directory, 'Set DWP_PASSAGE_REVIEW_DIR to run the source-bound producer integration.');
  const manifest = JSON.parse(await readFile(`${directory}/manifest.json`, 'utf8'));
  const firstCase = JSON.parse(await readFile(`${directory}/cases/case-001.json`, 'utf8'));
  const frozenPdf = await readFile(`${directory}/../../${firstCase.document.pdf.repository_path}`);
  await page.route('https://raw.githubusercontent.com/**', route => route.request().url() === firstCase.document.pdf.delivery_url
      ? route.fulfill({ status: 200, body: frozenPdf, contentType: 'application/pdf' })
      : route.abort());
  await page.route(url => new URL(url).pathname.startsWith('/dwp-fixture/'), async route => {
    const relative = new URL(route.request().url()).pathname.slice('/dwp-fixture/'.length);
    const file = `${directory}/${relative}`;
    const bytes = await readFile(file);
    await route.fulfill({ status: 200, body: bytes, contentType: file.endsWith('.json') ? 'application/json' : 'text/plain' });
  });
  await page.goto('/evidence/passages/?manifest=/dwp-fixture/manifest.json');
  await expect(page.getByText('28 cases')).toBeVisible();
  await expect(page.locator('main h2')).toContainText('50018');
  await expect(page.getByText('PDF SHA-256 verified against frozen source evidence.')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('link', { name: 'Open verified PDF copy at page 16' })).toHaveAttribute('href', /^blob:/);
  await expect(page.locator('canvas[data-rendered-page="16"]')).toBeVisible({ timeout: 30000 });
  await page.getByText('How this passage was built').click();
  await expect(page.getByText('Parser settings', { exact: true })).toBeVisible();
  await expect(page.getByText(firstCase.document.parser.settings_text, { exact: true })).toBeVisible();
  const ink = await page.locator('canvas[data-rendered-page="16"]').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let dark = 0;
    for (let i = 0; i < data.length; i += 64) if (data[i] < 180 || data[i + 1] < 180 || data[i + 2] < 180) dark++;
    return dark;
  });
  expect(ink).toBeGreaterThan(100);
  const pageSelector = page.getByLabel('Source page');
  const anotherPage = await pageSelector.locator('option').evaluateAll(options => options.map(option => Number(option.value)).find(value => value !== 16));
  expect(anotherPage).toBeTruthy();
  await pageSelector.selectOption(String(anotherPage));
  await expect(page.locator(`canvas[data-rendered-page="${anotherPage}"]`)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(`Page ${anotherPage}, UTF-8 bytes`)).toBeVisible();
  await pageSelector.selectOption('16');
  await expect(page.locator('canvas[data-rendered-page="16"]')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Preview correction' }).click();
  await expect(page.getByText('Preview passed')).toBeVisible();
  for (let n = 2; n <= manifest.cases.length; n++) {
    await page.getByRole('button', { name: manifest.cases[n - 1].label, exact: true }).click();
    await expect(page.locator('main h2')).toHaveText(manifest.cases[n - 1].label);
    await page.getByRole('button', { name: 'Preview correction' }).click();
    await expect(page.getByText('Preview passed')).toBeVisible();
    if (manifest.cases[n - 1].id === 'case-019') {
      await expect(page.getByRole('heading', { name: 'Narrowed successor units' })).toBeVisible();
      await expect(page.getByText('reference-table', { exact: false }).first()).toBeVisible();
    }
  }
});
