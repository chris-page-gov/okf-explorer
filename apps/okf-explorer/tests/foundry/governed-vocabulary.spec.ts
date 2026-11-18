import { expect, test } from '@playwright/test';

const examples = 'profile/governed-vocabulary/v1/examples/';
const csv = 'https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#csv';

test('a published vocabulary record and ontology term link directly to each other', async ({ page, baseURL }) => {
  const root = new URL('.', baseURL);
  const descriptor = new URL(examples + 'vocabulary/okf-explorer.json', root);
  const explorer = new URL('explore/', root);
  explorer.searchParams.set('bundle', descriptor.href);
  explorer.hash = 'dataset/csv';
  await page.goto(explorer.href);
  const termLink = page.getByRole('link', { name: 'Inspect ontology term', exact: true });
  await expect(termLink).toBeVisible();
  await termLink.press('Enter');
  await expect(page).toHaveURL(url => url.searchParams.get('term') === csv);
  const term = page.getByRole('article', { name: 'Comma-separated values' });
  await expect(term.getByText('close mapping', { exact: true })).toBeVisible();
  await expect(term.getByRole('link', { name: 'Explorer data formats' })).toBeVisible();
  await term.getByRole('link', { name: 'Open term record in Explorer' }).click();
  await expect(page).toHaveURL(url => decodeURIComponent(url.hash) === '#dataset/csv');
  await expect(termLink).toBeVisible();
});

test('the two published SHACL examples report the exact conforming and corrective states', async ({ page, baseURL }) => {
  const root = new URL('.', baseURL);
  const validation = new URL('validation/', root);
  validation.searchParams.set('bundle', new URL(examples + 'vocabulary/okf-explorer.json', root).href);
  await page.goto(validation.href);
  await expect(page.getByText('Conforms', { exact: false })).toBeVisible();
  validation.searchParams.set('bundle', new URL(examples + 'missing-csv-label/okf-explorer.json', root).href);
  await page.goto(validation.href);
  await expect(page.getByText('Does not conform', { exact: false })).toBeVisible();
  const finding = page.getByRole('link', { name: /Violation.*#csv/ }).first();
  await finding.click();
  const details = page.getByRole('article', { name: 'Violation finding' });
  await expect(details.getByText('Restore the English preferred label', { exact: false })).toBeVisible();
  await expect(details.getByRole('link', { name: 'Inspect dataset/csv in Explorer' })).toHaveCount(2);
  await expect(details.getByRole('link', { name: 'Open source evidence' })).toHaveCount(2);
  await page.reload();
  await expect(details.getByText('Stable finding ID')).toBeVisible();
});
