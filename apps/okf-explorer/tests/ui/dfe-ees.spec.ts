import { expect, test } from '../browserDiagnostics';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const sample = path.resolve('static/examples/dfe-ees');

test('reads the actual DfE pair, filters, preserves raw values and exports evidence', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/data/');
  await page.getByLabel('Data CSV', { exact: true }).setInputFiles(path.join(sample, 'ees_demo_datafile.csv'));
  await page.getByLabel('Metadata CSV (.meta.csv)', { exact: true }).setInputFiles(path.join(sample, 'ees_demo_datafile.meta.csv'));
  await page.getByRole('button', { name: 'Inspect selected files' }).click();
  await expect(page.getByText('15 observations and 4 exact metadata joins.')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Percentageofchildren/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: '100.0%', exact: true })).toHaveCount(5);
  await page.getByLabel('Apply sidecar display formatting').uncheck();
  await expect(page.getByRole('cell', { name: '100.000', exact: true })).toHaveCount(5);
  await page.getByLabel('Filter column').selectOption('sex');
  await page.getByLabel('Exact filter value').selectOption('Male');
  await expect(page.getByText('5 matching observations. Showing the first 5.')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download inspection report' }).click();
  const report = await download;
  expect(report.suggestedFilename()).toBe('ees-inspection.json');
  const value = JSON.parse(await readFile((await report.path())!, 'utf8'));
  expect(value).toMatchObject({ schema: 'okf-dfe-ees-inspection.v1', rows: 15, geography_header: 'geographical_level',
    files: { data_sha256: '01ef02f49d504fd48dd6e8c7f89d1ae23bb1001c367cfa430f84248063e5f3a3', metadata_sha256: '36f5265ad9810750022cb635b2ce91a34a74e928a3331a616af8d6a6e9951390' } });
  await page.screenshot({ path: testInfo.outputPath('dfe-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Clear inspection' }).click();
  await expect(page.getByRole('table')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('opens the bundled example on a narrow screen and clears stale output on invalid input', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/data/');
  await page.getByRole('button', { name: 'Try the DfE example' }).click();
  await expect(page.getByText('15 observations and 4 exact metadata joins.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dfe-mobile.png'), fullPage: true });
  await page.getByLabel('Metadata CSV (.meta.csv)', { exact: true }).setInputFiles({ name: 'ees_demo_datafile.meta.csv', mimeType: 'text/csv', buffer: Buffer.from('col_name,col_type\nnot-present,Indicator\n') });
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect selected files' }).click();
  await expect(page.getByRole('alert')).toContainText('all eight EES metadata headings');
  await page.getByLabel('Metadata CSV (.meta.csv)', { exact: true }).setInputFiles({ name: 'unrelated.meta.csv', mimeType: 'text/csv', buffer: Buffer.from('not-an-EES-file') });
  await page.getByRole('button', { name: 'Inspect selected files' }).click();
  await expect(page.getByRole('alert')).toContainText('matching filenames');
});
