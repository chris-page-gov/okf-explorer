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
  const exports = page.getByRole('navigation', { name: 'Related material' });
  const quality = exports.getByRole('link', { name: 'Quality measurements and annotations' });
  const report = exports.getByRole('link', { name: 'Source SHACL report' });
  await expect(quality).toHaveAttribute('href', new RegExp(examples + 'vocabulary/quality\\.nt$'));
  await expect(report).toHaveAttribute('href', new RegExp(examples + 'vocabulary/validation-report\\.nt$'));
  const qualityResponse = await page.request.get(new URL(examples + 'vocabulary/quality.nt', root).href);
  expect(qualityResponse.ok()).toBeTruthy();
  expect(await qualityResponse.text()).toContain(
    '<http://www.w3.org/ns/prov#atLocation> <' + await report.getAttribute('href') + '>'
  );
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

test('the PROV-O example keeps source assertions and the inferred subclass distinct', async ({ page, baseURL }) => {
  const root = new URL('.', baseURL);
  const example = new URL('profile/bounded-inference/v1/', root);
  const explorer = new URL('explore/', root);
  explorer.searchParams.set('bundle', new URL('asserted.json', example).href);
  explorer.searchParams.set('view', 'links');
  await page.goto(explorer.href);
  const comparison = page.getByRole('region', { name: 'Assertion status comparison' });
  await expect(comparison).toContainText('Source-asserted2');
  await expect(comparison).toContainText('Inferred0');
  explorer.searchParams.set('bundle', new URL('comparison.json', example).href);
  await page.goto(explorer.href);
  await expect(comparison).toContainText('Source-asserted2');
  await expect(comparison).toContainText('Inferred1');
  const filter = comparison.getByRole('combobox', { name: 'Show links by assertion status' });
  await filter.selectOption('inferred');
  await page.locator('.links-view').getByRole('button').click();
  const details = page.getByRole('complementary', { name: 'Record details' });
  await expect(details.getByText('urn:okf:rule:subclass-transitive:v1', { exact: true })).toBeVisible();
  const output = await (await page.request.get(new URL('derivation.json', example).href)).json();
  await expect(details.getByText(output.activity, { exact: true })).toBeVisible();
  const support = output.assertions[0].supporting_assertions;
  expect(support).toEqual(['urn:okf:example:prov-o:Revision:Derivation', 'urn:okf:example:prov-o:Derivation:EntityInfluence']);
  await details.getByRole('button', { name: 'Inspect ' + support[0] }).click();
  await expect(details.locator('a[href="https://www.w3.org/TR/2013/REC-prov-o-20130430/#Revision"]')).toBeVisible();
});
