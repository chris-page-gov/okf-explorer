import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  ELS_ALIGNED_RECORD_NAME, ONS_FACET_BUNDLE_URL, installOnsFacetFixture, openOnsFacetFixture
} from './fixtures/ons-facets.fixture';

const bundle = 'urn:fixture:ons-validation';
const other = 'https://another-source.fixture.test/okf-explorer.json';
const focus = 'https://source.fixture.test/affected-indicator';
const sourceShape = 'https://source.fixture.test/shapes/indicator';
const constraint = 'http://www.w3.org/ns/shacl#MinCountConstraintComponent';
const predicate = 'https://schema.org/name';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function finding(severity: 'violation' | 'warning', node: string, path: string | null, occurrences: number) {
  const fields = { bundle, constraint, focus: node, path, severity, shape: sourceShape };
  return { id: digest(JSON.stringify(fields) + '\n'), ...fields, occurrences };
}

const violation = finding('violation', focus, predicate, 2);
const warning = finding('warning', 'urn:fixture:warning-focus', null, 1);
const findings = JSON.stringify({
  schema: 'okf-shacl-findings.v1',
  bundle,
  conforms: false,
  report_sha256: 'a'.repeat(64),
  execution: {
    profile: 'okf-bounded-shacl-core.v1',
    validator: 'pySHACL',
    validator_version: '0.40.2',
    graph_sha256: 'd'.repeat(64),
    shapes_sha256: 'b'.repeat(64)
  },
  findings: [violation, warning].sort((left, right) => left.id.localeCompare(right.id))
});
const bound = (path: string, value: string) => ({ path, bytes: Buffer.byteLength(value), sha256: digest(value) });
const reviews = JSON.stringify({
  schema: 'okf-shacl-review.v1',
  findings_sha256: digest(findings),
  findings: [{
    id: violation.id,
    remediation: 'Check the names recorded by both publishers before proposing a correction.',
    sources: [
      { bundle, descriptor: ONS_FACET_BUNDLE_URL, record_route: 'dataset/' + ELS_ALIGNED_RECORD_NAME, evidence: focus },
      { bundle: 'urn:fixture:other-source', descriptor: other, record_route: 'dataset/another-indicator', evidence: 'https://source.fixture.test/another-indicator' }
    ]
  }]
});
const validation = {
  bundle,
  entrypoints: {
    shacl_findings: bound('validation/findings.json', findings),
    shacl_review: bound('validation/review.json', reviews)
  },
  resources: { '/validation/findings.json': findings, '/validation/review.json': reviews }
};

test('Validation retains the selected finding across reload and return from the source record', async ({ page }) => {
  await openOnsFacetFixture(page, [], { governedPublication: validation });
  await page.getByRole('link', { name: 'Inspect validation findings' }).click();
  await expect(page.getByRole('heading', { name: 'Validation', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Filter by severity' }).getByRole('link', { name: 'Violation' }).click();
  await page.getByRole('link', { name: new RegExp('Violation.*affected-indicator') }).click();
  await expect(page).toHaveURL(new RegExp('finding=' + violation.id));
  await page.reload();
  const selected = page.getByRole('article', { name: 'Violation finding' });
  await expect(selected.getByText(focus, { exact: true })).toBeVisible();
  await expect(selected.getByRole('link', { name: predicate })).toBeVisible();
  await expect(selected.getByText('Check the names recorded by both publishers', { exact: false })).toBeVisible();
  await expect(selected.getByText('urn:fixture:other-source')).toBeVisible();
  await page.getByText('Report identity', { exact: true }).click();
  await expect(page.getByText('pySHACL 0.40.2', { exact: true })).toBeVisible();
  await expect(page.getByText('b'.repeat(64), { exact: true })).toBeVisible();
  await expect(selected.getByRole('link', { name: 'Inspect dataset/another-indicator in Explorer' }))
    .toHaveAttribute('href', /another-source\.fixture\.test.*#dataset\/another-indicator/);
  await selected.getByRole('link', { name: 'Inspect dataset/' + ELS_ALIGNED_RECORD_NAME + ' in Explorer' }).click();
  await expect(page.locator('.right-panel').getByText('Aligned in reviewed fields')).toBeVisible();
  await page.goBack();
  await expect(selected).toBeVisible();
  await expect(page.getByRole('link', { name: 'Violation', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('Validation at 320px distinguishes unsupported report bytes from SHACL outcomes', async ({ context, page, baseURL }) => {
  const requestLog: string[] = [];
  await installOnsFacetFixture(context, requestLog, { governedPublication: validation });
  await page.setViewportSize({ width: 320, height: 800 });
  const start = new URL('../validation/', baseURL);
  await page.goto(start.href);
  await expect(page.getByRole('heading', { name: 'Validation', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Bundle descriptor URL' }).fill(ONS_FACET_BUNDLE_URL);
  await page.getByRole('button', { name: 'Load report' }).click();
  await expect(page.getByText('Does not conform', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Warning', exact: true }).click();
  await page.getByRole('link', { name: /warning-focus/ }).click();
  await expect(page.getByText('Applies to the focus node as a whole')).toBeVisible();
  expect(requestLog.filter(path => path === '/validation/findings.json')).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);

  await context.route('https://ons-facets.fixture.test/validation/findings.json', route => route.fulfill({
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: findings.replace('affected-indicator', 'altered--indicator')
  }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Resource integrity check failed');
  await expect(page.getByText('Does not conform', { exact: false })).toHaveCount(0);
});
