import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
const question = 'What evidence is needed?';
const recordId = 'https://example.test/evidence/one';
const documentUrl = 'https://assets.publishing.service.gov.uk/manual.pdf';
const packageValue = {
  schema: 'okf-governed-context.v1', context_id: 'urn:sha256:' + 'a'.repeat(64), engine: 'okf-context-assembly.v1', question,
  bundle: { id: 'example', snapshot: 'fixed-snapshot', source_url: 'https://example.test/bundle.json' },
  binding: { index_url: 'https://example.test/index.json', index_sha256: 'b'.repeat(64) }, scope: 'Training review', evidence_status: 'insufficient',
  resolved_concepts: [{ id: 'concept:one', label: 'Capital', matched: ['capital'], method: 'declared-phrase', confidence: 'exact-alias' }],
  ambiguities: [], unresolved_terms: [], selected: [{ record: {
    id: recordId, route: 'page/manual/0012', label: '<img src=x onerror=alert(1)>', kind: 'evidence', text: 'Original extracted words about capital.',
    assertion_status: 'normalized', authority: { class: 'project', label: 'Machine extraction', source: 'source' }, scope: 'Training review', rights: 'Open', access: 'public',
    provenance: [{ url: documentUrl, locator: 'page 12', source_sha256: 'c'.repeat(64), captured_at: '2026-09-24', source_date: '2024-01-01' }],
    evidence_unit: { schema: 'okf-evidence-unit.v1', kind: 'paragraph', boundary_status: 'machine-detected', completeness: 'unresolved', offset_unit: 'utf-8-bytes', joiner: '', spans: [{ source_url: documentUrl, source_sha256: 'c'.repeat(64), extraction_url: 'https://example.test/extraction.txt', extraction_sha256: 'd'.repeat(64), locator: 'page 12', source_text_sha256: 'e'.repeat(64), source_text_bytes: 40, source_start: 0, source_end: 40, unit_start: 0, unit_end: 40, literal_sha256: 'f'.repeat(64) }] }
  }, reasons: ['Matched question words'], paths: [] }], relationships: [], requirements: [], missing_evidence: [{ code: 'missing_dependency', message: 'Qualification not found', ids: [] }], conflicts: [], limitations: ['Review still needed'],
  budget: { max_nodes: 10, max_relationships: 10, max_depth: 2, max_bytes: 524288, used_nodes: 1, used_relationships: 0, used_bytes: 2000, reached_depth: 0, truncated: false, omissions: [] }, ai_answer: null
};

test('loads one hash-bound case lazily, inspects source and exports a local review', async ({ page }) => {
  const packageJson = JSON.stringify(packageValue);
  const manifest = { schema: 'okf-evidence-workbench.v1', title: 'Staff evidence review', publication: { label: 'Experimental', source_date: '2024-01-01', captured_at: '2026-09-24' }, questions: [
    { id: 'q-01', label: 'Question 1', question, package: { url: 'packages/q-01.json', sha256: await hash(packageJson) } },
    { id: 'q-02', label: 'Question 2', question: 'Another question?', package: { url: 'packages/q-02.json', sha256: '0'.repeat(64) } }
  ] };
  let packagesRequested = 0;
  await page.route(requestUrl => new URL(requestUrl).pathname === '/evaluation/evidence-workbench/manifest.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) }));
  await page.route(requestUrl => new URL(requestUrl).pathname.startsWith('/evaluation/evidence-workbench/packages/'), route => { packagesRequested += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: packageJson }); });
  await page.goto('/evidence/?manifest=/evaluation/evidence-workbench/manifest.json&case=q-01');
  await expect(page.getByRole('heading', { name: question })).toBeVisible();
  await expect(page.getByRole('link', { name: /open original document/i })).toHaveAttribute('href', `${documentUrl}#page=12`);
  expect(packagesRequested).toBe(1);
  await page.getByRole('link', { name: 'Extracted text and structure' }).click();
  await expect(page.getByText('source text bytes 0–40')).toBeVisible();
  await page.getByRole('link', { name: 'Complete passage' }).click();
  await expect(page.locator('pre').getByText('Original extracted words about capital.')).toBeVisible();
  await page.getByRole('link', { name: 'Retrieval trace' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Qualification not found')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retrieval trace' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Review proposal' }).click();
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Retrieval trace' })).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page.getByRole('link', { name: 'Review proposal' })).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Evidence and suggested change').fill('Check the page 12 qualification.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review proposal' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('evidence-review-q-01.json');
  await expect(page.getByText('Proposal downloaded locally.')).toBeVisible();
  expect(await page.locator('img').count()).toBe(0);
  expect(packagesRequested).toBe(1);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('reports a package hash mismatch without displaying content', async ({ page }) => {
  const manifest = { schema: 'okf-evidence-workbench.v1', title: 'Staff evidence review', publication: { label: 'Experimental' }, questions: [{ id: 'q-01', label: 'Question 1', question, package: { url: 'q.json', sha256: '0'.repeat(64) } }] };
  await page.route(requestUrl => new URL(requestUrl).pathname === '/evaluation/evidence-workbench/manifest.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) }));
  await page.route(requestUrl => new URL(requestUrl).pathname === '/evaluation/evidence-workbench/q.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(packageValue) }));
  await page.goto('/evidence/?manifest=/evaluation/evidence-workbench/manifest.json');
  await expect(page.getByRole('alert')).toContainText('SHA-256 does not match');
  await expect(page.getByRole('heading', { name: question })).toHaveCount(0);
});
