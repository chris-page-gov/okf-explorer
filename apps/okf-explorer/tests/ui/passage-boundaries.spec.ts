import { expect, test } from '@playwright/test';

const source = 'Alpha\nBeta';
const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');

test('navigates 28 source-bound cases, previews a split and exports review evidence', async ({ page }) => {
  const sourceHash = await hash(source), pdfHash = await hash('pdf'), baselineHash = await hash('baseline'), settingsHash = await hash('settings');
  const alpha = await hash('Alpha'), beta = await hash('Beta');
  const unit = (id: string, spans: Array<{ page: number; start_utf8: number; end_utf8: number }>, text: string) => ({ id, role: 'paragraph', paragraph_labels: [], spans: spans.map(span => ({ ...span, literal_sha256: span.page === 1 ? alpha : beta })), joiner: '\n', text, text_bytes: new TextEncoder().encode(text).length, text_sha256: text === source ? sourceHash : text === 'Alpha' ? alpha : beta });
  const makeCase = (n: number) => ({ schema: 'okf-passage-boundary-review.v1', id: `case-${String(n).padStart(3, '0')}`, label: n === 1 ? '<img src=x onerror=alert(1)> case 1' : `Case ${n}`, document: { id: `document-${n}`, version: 'v1', pdf: { url: 'https://example.test/source.pdf', sha256: pdfHash }, extraction: { url: 'extractions/source.txt', sha256: sourceHash }, baseline_sha256: baselineHash, parser: { version: 'v1', ruleset_version: 'r1', settings_sha256: settingsHash, applied_rules: ['split-rule'] } }, pages: [{ number: 1, start_utf8: 0, end_utf8: 5 }, { number: 2, start_utf8: 6, end_utf8: 10 }], before: [unit('old', [{ page: 1, start_utf8: 0, end_utf8: 5 }, { page: 2, start_utf8: 6, end_utf8: 10 }], source)], after: [unit('new-a', [{ page: 1, start_utf8: 0, end_utf8: 5 }], 'Alpha'), unit('new-b', [{ page: 2, start_utf8: 6, end_utf8: 10 }], 'Beta')], observation: { method: 'Source review', classification: 'split', rationale: 'Separate two roles.', uncertainty: 'Requires independent review', source_links: [] }, review: { status: 'pending-independent-review' }, coverage: { candidate_bytes_outside_old_passage: 0, covered_once_bytes: 9, old_passage_bytes: 9, scope: 'Affected passage only' } });
  const cases = await Promise.all(Array.from({ length: 28 }, async (_, index) => {
    const n = index + 1, value = makeCase(n), body = JSON.stringify(value);
    return { reference: { id: value.id, label: value.label, url: `cases/${value.id}.json`, sha256: await hash(body), bytes: new TextEncoder().encode(body).length, document_id: value.document.id, classification: value.observation.classification, review_status: value.review.status }, body };
  }));
  const manifest = { schema: 'okf-passage-boundary-review-manifest.v1', title: 'Passage review fixture', status: 'candidate', baseline_commit: 'fixed', source: {}, impact: {}, limits: [], cases: cases.map(row => row.reference) };
  await page.route(url => new URL(url).pathname === '/fixture/manifest.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) }));
  await page.route(url => /^\/fixture\/cases\/case-\d{3}\.json$/.test(new URL(url).pathname), route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1)?.replace('.json', '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: cases.find(row => row.reference.id === id)?.body ?? '' });
  });
  await page.route(url => new URL(url).pathname === '/fixture/extractions/source.txt', route => route.fulfill({ status: 200, contentType: 'text/plain', body: source }));
  await page.route('https://example.test/source.pdf', route => route.fulfill({ status: 200, contentType: 'application/pdf', body: '' }));
  await page.goto('/evidence/passages/?manifest=/fixture/manifest.json');
  await expect(page.getByText('28 cases')).toBeVisible();
  await expect(page.getByRole('heading', { name: '<img src=x onerror=alert(1)> case 1' })).toBeVisible();
  expect(await page.locator('img').count()).toBe(0);
  await page.getByLabel('Source page').selectOption('2');
  await expect(page.getByText('Page 2, UTF-8 bytes 6–10')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open source-declared PDF at page 2' })).toHaveAttribute('href', 'https://example.test/source.pdf#page=2');
  for (let n = 2; n <= 28; n++) {
    await page.getByRole('button', { name: `Case ${n}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: `Case ${n}`, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Preview correction' }).click();
  await expect(page.getByText('Preview passed')).toBeVisible();
  await page.getByLabel('Reviewer').fill('A reviewer');
  await page.getByLabel('Review date').fill('2026-09-25');
  await page.getByLabel('Reason').fill('Check against source.');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review JSON' }).click();
  expect((await download).suggestedFilename()).toBe('passage-review-case-028.json');
  const correction = page.getByLabel('Correction JSON');
  const original = correction.inputValue();
  const stale = JSON.parse(await original);
  stale.source_sha256 = '0'.repeat(64);
  await correction.fill(JSON.stringify(stale));
  await page.getByRole('button', { name: 'Preview correction' }).click();
  await expect(page.getByText('Preview rejected')).toBeVisible();
  await expect(page.getByText(/Stale source or baseline/)).toBeVisible();
  await correction.fill(await original);
  await expect(page.getByText('Preview rejected')).toBeVisible();
  await expect(page.getByText(/result is retained for comparison/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download review JSON' })).toBeDisabled();
});
