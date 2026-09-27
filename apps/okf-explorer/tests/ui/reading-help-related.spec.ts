import { expect, test } from '@playwright/test';
// @ts-ignore -- Node-only browser fixture; no application dependency on Node types.
import { createHash } from 'node:crypto';

const root = 'https://reading-help-related.fixture.test/';
const manifestUrl = `${root}manifest.json`;
const sourceUrl = `${root}source.pdf`;
const source = 'Body marker 6.\nReference row 6.\n';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const marker = source.indexOf('6');
const footer = source.lastIndexOf('6');
const span = (start: number, end: number) => ({ page: 1, page_start_utf8: start, page_end_utf8: end, literal_sha256: hash(source.slice(start, end)) });
const pages = JSON.stringify({ document_id: 'source', source_url: sourceUrl, source_sha256: hash('PDF bytes'), pages: [{ page: 1, url: `${sourceUrl}#page=1`, text: source }] });
const manifest = {
  schema: 'okf-reading-help.v1', scope: 'Explicit body and reference-row pair', status: 'unreviewed', review_overlay: [], proposal_inputs: {}, limitations: ['No legal applicability review'],
  sources: [{ id: 'source', pages_url: 'pages.json', pages_sha256: hash(pages), pdf_url: sourceUrl, pdf_sha256: hash('PDF bytes') }],
  passages: [
    { id: 'body', label: 'Body passage', source_id: 'source', spans: [{ ...span(0, footer), literal: source.slice(0, footer) }] },
    { id: 'reference', label: 'Reference row', source_id: 'source', spans: [{ ...span(footer, source.length), literal: source.slice(footer) }] }
  ],
  occurrences: [
    { id: 'body-marker', source_id: 'source', passage_id: 'body', role: 'source_marker', literal: '6', ...span(marker, marker + 1) },
    { id: 'footer-marker', source_id: 'source', passage_id: 'reference', role: 'source_marker', literal: '6', ...span(footer, footer + 1) }
  ],
  cards: [{
    id: 'reference-card', kind: 'citation_navigation', title: 'Reference 6', body: 'The body and row are linked by exact occurrence IDs.',
    authority: 'source-pointer-with-project-authored-explanation', review_status: 'unreviewed', proposal_ids: [], occurrence_ids: ['body-marker', 'footer-marker'],
    source_support: [{ source_id: 'source', ...span(marker, marker + 1), quote: '6' }, { source_id: 'source', ...span(footer, footer + 1), quote: '6' }],
    target: { status: 'unresolved', label: 'Legal effect not reviewed' }
  }]
};

test('linked body and reference-row occurrences navigate by exact ID', async ({ page }) => {
  await page.route(`${root}**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path === '/manifest.json' ? JSON.stringify(manifest) : path === '/pages.json' ? pages : '';
    return route.fulfill({ status: body ? 200 : 404, body, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto(`/reading-help/?manifest=${encodeURIComponent(manifestUrl)}`);
  await page.locator('[data-occurrence-id="body-marker"]').click();
  await expect(page.getByText('Other occurrences for this reference:')).toBeVisible();
  await page.getByRole('button', { name: 'Source reference on source PDF page 1: 6' }).click();
  await expect(page.getByRole('heading', { name: 'Reference row' })).toBeVisible();
  await expect(page.locator('[data-occurrence-id="footer-marker"]')).toBeFocused();
  await expect(page.locator('[data-occurrence-id="footer-marker"]')).toHaveAttribute('aria-expanded', 'true');
});
