import { expect, test } from '@playwright/test';
// @ts-ignore -- Node-only browser fixture; no application dependency on Node types.
import { createHash } from 'node:crypto';
// @ts-ignore -- Node-only browser fixture.
import { gzipSync } from 'node:zlib';
// @ts-ignore -- Node-only browser fixture.
import { Buffer } from 'node:buffer';

const origin = 'https://reading-help-corpus.fixture.test/';
const catalogueUrl = `${origin}reading-help-corpus/manifest.json`;
const text = 'DMG 60025: CA means Carer’s Allowance.\n1 Reference row.';
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const digest = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const ref = (url: string, value: Uint8Array) => ({ url, bytes: value.byteLength, sha256: digest(value) });

function fixture() {
  const sourceSha = digest(bytes('PDF'));
  const rulesSha = digest(bytes('rules'));
  const unitId = 'https://reading-help-corpus.fixture.test/id/dmg/60025';
  const sourceText = new TextEncoder().encode(text);
  const extraction = bytes({ document_id: 'dmg-ch60', source_sha256: sourceSha, pages: [{ page: 1, text }] });
  const extractionRef = ref('source/dmg-ch60.pages.json', extraction);
  const start = sourceText.indexOf(67); // The exact C in CA.
  const occurrence = { id: 'occ-ca', passage_id: unitId, page: 1, start_utf8: start, end_utf8: start + 2, literal: 'CA', literal_sha256: digest(new TextEncoder().encode('CA')), role: 'abbreviation', status: 'source_verified' };
  const footer = '1 Reference row.';
  const footerStart = sourceText.byteLength - new TextEncoder().encode(footer).byteLength;
  const passage = {
    id: unitId, unit_sha256: digest(bytes('unit')), role: 'paragraph', status: 'processed', text_sha256: digest(sourceText), paragraph_labels: ['60025'],
    source_spans: [{ page: 1, start_utf8: 0, end_utf8: sourceText.byteLength, literal_sha256: digest(sourceText) }],
    segment: { ordinal: 0, start_utf8: 0, end_utf8: sourceText.byteLength, text, sha256: digest(sourceText) }, segment_count: 1, passage_complete: true,
    occurrences: [occurrence], cards: [{ id: 'card-ca', occurrence_id: 'occ-ca', kind: 'expansion', status: 'proposed', scope: { target_document_id: 'dmg-ch60', source_table_document_ids: ['dmg-abbreviations'] }, source_table_rows: [{ document_id: 'dmg-abbreviations', page: 2, literal: 'CA  Carer’s Allowance', expansion: 'Carer’s Allowance', status: 'source_verified', start_utf8: 0, end_utf8: 21, literal_sha256: digest(new TextEncoder().encode('CA  Carer’s Allowance')) }] }], reference_list_segments: [{ occurrence_id: 'footer-1', passage_id: unitId, marker: '1', page: 1, start_utf8: footerStart, end_utf8: sourceText.byteLength, literal: footer, literal_sha256: digest(new TextEncoder().encode(footer)), status: 'unresolved', body_occurrence_ids: [] }]
  };
  const leafDecoded = bytes({ schema: 'okf-reading-help.v2', family: 'dmg', document_id: 'dmg-ch60', source_sha256: sourceSha, extraction_sha256: digest(extraction), rules_sha256: rulesSha, passages: [passage] });
  const leaf = gzipSync(leafDecoded);
  const leafRef = { ...ref('reading-help-corpus/documents/dmg/dmg-ch60/leaves/0000.json.gz', leaf), decoded_bytes: leafDecoded.byteLength, decoded_sha256: digest(leafDecoded), encoding: 'gzip' };
  const index = bytes({
    schema: 'okf-reading-help-document.v1', family: 'dmg', document_id: 'dmg-ch60', rules_sha256: rulesSha,
    source: { url: 'https://reading-help-corpus.fixture.test/source.pdf', sha256: sourceSha }, extraction: extractionRef,
    review: { specialist_accepted: false, legal_answerability: 'not-established' }, extraction_blocked_pages: [], leaves: [leafRef],
    passages: [{ unit_id: unitId, unit_sha256: passage.unit_sha256, role: 'paragraph', status: 'processed', label: '60025 — Carer’s Allowance', paragraph_labels: ['60025'], abbreviations: ['CA'], pages: [1], segment_ordinal: 0, segment_count: 1, leaf_url: leafRef.url, leaf_sha256: leafRef.sha256, leaf_bytes: leafRef.bytes }]
  });
  const indexRef = ref('reading-help-corpus/documents/dmg/dmg-ch60/index.json', index);
  const catalogue = bytes({ schema: 'okf-reading-help-catalogue.v1', rules_sha256: rulesSha, status: 'machine-proposed-unreviewed', limitations: ['Specialist review outstanding'], counts: { extraction_blocked_pages: 0 }, documents: [{ ...indexRef, family: 'dmg', document_id: 'dmg-ch60', status: 'processed', counts: { passages: 1 } }] });
  const files = new Map([[catalogueUrl, catalogue], [`${origin}${indexRef.url}`, index], [`${origin}${leafRef.url}`, leaf], [`${origin}${extractionRef.url}`, extraction]]);
  return { files, unitId, catalogue };
}

test('opens a bound paragraph and restores occurrence focus from the keyboard', async ({ page }) => {
  const source = fixture();
  await page.route(`${origin}**`, route => {
    const value = source.files.get(route.request().url());
    return route.fulfill({ status: value ? 200 : 404, body: value ? Buffer.from(value) : 'missing', contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } });
  });
  const params = new URLSearchParams({ catalogue: catalogueUrl, catalogue_sha256: digest(source.catalogue), catalogue_bytes: String(source.catalogue.byteLength), family: 'dmg', document: 'dmg-ch60', unit: source.unitId });
  await page.goto(`/reading-help/corpus/?${params}`);
  await page.getByLabel('Exact abbreviation occurrence in this document').fill('CA');
  await expect(page.getByRole('button', { name: /60025 — Carer’s Allowance/ })).toBeVisible();
  const marker = page.locator('[data-occurrence-id="occ-ca"]');
  await expect(marker).toBeVisible();
  await expect(page.getByText('DMG 60025:', { exact: false })).toBeVisible();
  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Candidate status:')).toBeVisible();
  await expect(page.getByText('Proposed expansion from the named printed table: Carer’s Allowance.')).toBeVisible();
  await page.getByRole('button', { name: 'Close reading help' }).click();
  await expect(marker).toBeFocused();
  await expect(marker).toHaveAttribute('aria-expanded', 'false');
  const footerRow = page.getByRole('button', { name: '1 Reference row. · page 1' });
  await footerRow.click();
  await expect(page.getByText('Body pairing unresolved.')).toBeVisible();
  await page.getByRole('button', { name: 'Close reference row' }).click();
  await expect(footerRow).toBeFocused();
});

test('rejects a workbench catalogue hash mismatch before opening a document', async ({ page }) => {
  const source = fixture();
  await page.route(`${origin}**`, route => {
    const value = source.files.get(route.request().url());
    return route.fulfill({ status: value ? 200 : 404, body: value ? Buffer.from(value) : 'missing', headers: { 'access-control-allow-origin': '*' } });
  });
  const params = new URLSearchParams({ catalogue: catalogueUrl, catalogue_sha256: '0'.repeat(64), family: 'dmg', document: 'dmg-ch60', unit: source.unitId });
  await page.goto(`/reading-help/corpus/?${params}`);
  await expect(page.getByRole('alert')).toContainText('Catalogue bytes differ');
  await expect(page.locator('[data-occurrence-id]')).toHaveCount(0);
});
