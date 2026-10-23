import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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

function fixture(longContent = false) {
  const footer = longContent ? `1 Reference row. ${'Synthetic unresolved reference. '.repeat(20)}` : '1 Reference row.';
  const passageText = longContent
    ? `78034: AA, DLA and PIP. ZZ has no attached card.\n${'Source context remains available.\n'.repeat(80)}${footer}`
    : text;
  const sourceSha = digest(bytes('PDF'));
  const rulesSha = digest(bytes('rules'));
  const unitId = 'https://reading-help-corpus.fixture.test/id/dmg/60025';
  const sourceText = new TextEncoder().encode(passageText);
  const extraction = bytes({ document_id: 'dmg-ch60', source_sha256: sourceSha, pages: [{ page: 1, text: passageText }] });
  const extractionRef = ref('source/dmg-ch60.pages.json', extraction);
  const start = sourceText.indexOf(67); // The exact C in CA.
  const occurrence = { id: 'occ-ca', passage_id: unitId, page: 1, start_utf8: start, end_utf8: start + 2, literal: 'CA', literal_sha256: digest(new TextEncoder().encode('CA')), role: 'abbreviation', status: 'source_verified' };
  const occurrences = longContent ? ['AA', 'DLA', 'PIP', 'ZZ'].map(literal => {
    const start = Buffer.from(sourceText).indexOf(literal);
    return { ...occurrence, id: `occ-${literal.toLowerCase()}`, start_utf8: start, end_utf8: start + literal.length, literal, literal_sha256: digest(new TextEncoder().encode(literal)) };
  }) : [occurrence];
  const footerStart = sourceText.byteLength - new TextEncoder().encode(footer).byteLength;
  const passage = {
    id: unitId, unit_sha256: digest(bytes('unit')), role: 'paragraph', status: 'processed', text_sha256: digest(sourceText), paragraph_labels: ['60025'],
    source_spans: [{ page: 1, start_utf8: 0, end_utf8: sourceText.byteLength, literal_sha256: digest(sourceText) }],
    segment: { ordinal: 0, start_utf8: 0, end_utf8: sourceText.byteLength, text: passageText, sha256: digest(sourceText) }, segment_count: 1, passage_complete: true,
    occurrences: [occurrence], cards: [{ id: 'card-ca', occurrence_id: 'occ-ca', kind: 'expansion', status: 'proposed', scope: { target_document_id: 'dmg-ch60', source_table_document_ids: ['dmg-abbreviations'] }, source_table_rows: [{ document_id: 'dmg-abbreviations', page: 2, literal: 'CA  Carer’s Allowance', expansion: 'Carer’s Allowance', status: 'source_verified', start_utf8: 0, end_utf8: 21, literal_sha256: digest(new TextEncoder().encode('CA  Carer’s Allowance')) }] }], reference_list_segments: [{ occurrence_id: 'footer-1', passage_id: unitId, marker: '1', page: 1, start_utf8: footerStart, end_utf8: sourceText.byteLength, literal: footer, literal_sha256: digest(new TextEncoder().encode(footer)), status: 'unresolved', body_occurrence_ids: [] }]
  };
  passage.occurrences = occurrences;
  if (longContent) passage.cards = occurrences.filter(row => row.literal !== 'ZZ').map(row => ({
    ...passage.cards[0], id: `card-${row.id}`, occurrence_id: row.id, status: 'ambiguous',
    source_table_rows: [{ ...passage.cards[0].source_table_rows[0], expansion: `Synthetic ${row.literal} help for layout testing. ${'Candidate meaning remains unreviewed. '.repeat(150)}` }]
  }));
  const leafDecoded = bytes({ schema: 'okf-reading-help.v2', family: 'dmg', document_id: 'dmg-ch60', source_sha256: sourceSha, extraction_sha256: digest(extraction), rules_sha256: rulesSha, passages: [passage] });
  const leaf = gzipSync(leafDecoded);
  const leafRef = { ...ref('reading-help-corpus/documents/dmg/dmg-ch60/leaves/0000.json.gz', leaf), decoded_bytes: leafDecoded.byteLength, decoded_sha256: digest(leafDecoded), encoding: 'gzip' };
  const index = bytes({
    schema: 'okf-reading-help-document.v1', family: 'dmg', document_id: 'dmg-ch60', rules_sha256: rulesSha,
    source: { url: 'https://reading-help-corpus.fixture.test/source.pdf', sha256: sourceSha }, extraction: extractionRef,
    review: { specialist_accepted: false, legal_answerability: 'not-established' }, extraction_blocked_pages: [2], leaves: [leafRef],
    passages: [{ unit_id: unitId, unit_sha256: passage.unit_sha256, role: 'paragraph', status: 'processed', label: '60025 — Carer’s Allowance', paragraph_labels: ['60025'], abbreviations: ['CA', ...Array.from({ length: 165 }, (_, index) => `AB${index}`)], pages: [1], segment_ordinal: 0, segment_count: 1, leaf_url: leafRef.url, leaf_sha256: leafRef.sha256, leaf_bytes: leafRef.bytes }]
  });
  const indexRef = ref('reading-help-corpus/documents/dmg/dmg-ch60/index.json', index);
  const catalogue = bytes({ schema: 'okf-reading-help-catalogue.v1', rules_sha256: rulesSha, status: 'machine-proposed-unreviewed', limitations: ['Specialist review outstanding'], counts: { extraction_blocked_pages: 0 }, documents: [{ ...indexRef, family: 'dmg', document_id: 'dmg-ch60', status: 'processed', counts: { passages: 1 } }] });
  const files = new Map([[catalogueUrl, catalogue], [`${origin}${indexRef.url}`, index], [`${origin}${leafRef.url}`, leaf], [`${origin}${extractionRef.url}`, extraction]]);
  return { files, unitId, catalogue };
}

async function openFixture(page: import('@playwright/test').Page, source = fixture(), occurrence = '') {
  await page.route(`${origin}**`, route => {
    const value = source.files.get(route.request().url());
    return route.fulfill({ status: value ? 200 : 404, body: value ? Buffer.from(value) : 'missing', contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } });
  });
  const params = new URLSearchParams({ catalogue: catalogueUrl, catalogue_sha256: digest(source.catalogue), catalogue_bytes: String(source.catalogue.byteLength), family: 'dmg', document: 'dmg-ch60', unit: source.unitId });
  if (occurrence) params.set('occurrence', occurrence);
  await page.goto(`/reading-help/corpus/?${params}`);
}

async function expectInsideViewport(locator: import('@playwright/test').Locator) {
  const bounds = await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: innerWidth, height: innerHeight };
  });
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height + 1);
}

for (const layout of [
  { name: 'wide', width: 1440, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
  { name: 'Codex panel', width: 590, height: 765 },
  // A 1440 × 900 window at 200% browser zoom has this CSS viewport.
  { name: '200% zoom equivalent', width: 720, height: 450 }
]) {
  test(`help stays visible without page scrolling in the ${layout.name} layout`, async ({ page }) => {
    await page.setViewportSize(layout);
    await openFixture(page, fixture(true));
    const panel = page.getByRole('dialog', { name: 'Occurrence-scoped reading help' });
    const close = panel.getByRole('button', { name: 'Close reading help' });
    for (const literal of ['aa', 'dla', 'pip']) {
      const marker = page.locator(`[data-occurrence-id="occ-${literal}"]`);
      await marker.scrollIntoViewIfNeeded();
      await marker.focus();
      const before = await page.evaluate(() => scrollY);
      await page.keyboard.press('Enter');
      await expect(close).toBeFocused();
      expect(await page.evaluate(() => scrollY)).toBe(before);
      await expectInsideViewport(panel);
      await expectInsideViewport(close);
      await expect(panel).toContainText(`Synthetic ${literal.toUpperCase()} help`);
      await expect(panel).toContainText(`Occurrence ID: occ-${literal}`);
      await expect(marker).toHaveAttribute('aria-expanded', 'true');
      await expect(page).toHaveURL(new RegExp(`occurrence=occ-${literal}`));
      const body = panel.getByRole('region', { name: 'Selected reference details' });
      await expect.poll(() => body.evaluate(element => element.scrollTop)).toBe(0);
      await page.keyboard.press('Tab');
      await expect(body).toBeFocused();
      expect(await body.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
      await page.keyboard.press('PageDown');
      await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      await expectInsideViewport(close);
      expect(await page.evaluate(() => scrollY)).toBe(before);
    }
    const selected = page.locator('[data-occurrence-id="occ-pip"]');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(selected).toBeFocused();
    await expect(page).not.toHaveURL(/occurrence=/);
    const empty = page.locator('[data-occurrence-id="occ-zz"]');
    await empty.press('Space');
    await expect(panel).toContainText('No candidate card is attached to this exact occurrence.');
    await expectInsideViewport(panel);
    await close.click();
    await expect(empty).toBeFocused();
    const footer = page.locator('[data-reference-id="footer-1"]');
    await footer.scrollIntoViewIfNeeded();
    const beforeReference = await page.evaluate(() => scrollY);
    await footer.click();
    await expect(panel).toContainText('Body pairing unresolved. No exact body occurrence ID is declared.');
    await expectInsideViewport(panel);
    await expect(panel.getByRole('button', { name: 'Close reference row' })).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(beforeReference);
    await page.keyboard.press('Escape');
    await expect(footer).toBeFocused();
  });

  test(`direct occurrence links open visible help in the ${layout.name} layout`, async ({ page }) => {
    await page.setViewportSize(layout);
    await openFixture(page, fixture(true), 'occ-aa');
    const panel = page.getByRole('dialog', { name: 'Occurrence-scoped reading help' });
    await expect(panel.getByRole('button', { name: 'Close reading help' })).toBeFocused();
    await expectInsideViewport(panel);
    await expect(panel).toContainText('Synthetic AA help');
    const markerBox = await page.locator('[data-occurrence-id="occ-aa"]').boundingBox();
    const panelBox = await panel.boundingBox();
    expect(markerBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    if (layout.width < 1100) expect(markerBox!.y + markerBox!.height).toBeLessThanOrEqual(panelBox!.y);
    else expect(markerBox!.x + markerBox!.width).toBeLessThan(panelBox!.x);
    await expect(page.locator('[data-occurrence-id="occ-aa"]')).toHaveAttribute('aria-expanded', 'true');
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations).toEqual([]);
  });
}

test('opens a bound paragraph and restores occurrence focus from the keyboard', async ({ page }) => {
  const source = fixture();
  await page.route(`${origin}**`, route => {
    const value = source.files.get(route.request().url());
    return route.fulfill({ status: value ? 200 : 404, body: value ? Buffer.from(value) : 'missing', contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } });
  });
  const params = new URLSearchParams({ catalogue: catalogueUrl, catalogue_sha256: digest(source.catalogue), catalogue_bytes: String(source.catalogue.byteLength), family: 'dmg', document: 'dmg-ch60', unit: source.unitId });
  await page.goto(`/reading-help/corpus/?${params}`);
  await page.getByText('Machine-extraction gaps (1)').click();
  const gapLink = page.getByRole('link', { name: 'Open source PDF at page 2' });
  await expect(gapLink).toHaveAttribute('href', 'https://reading-help-corpus.fixture.test/source.pdf#page=2');
  expect(await gapLink.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(24);
  const gapAxe = await new AxeBuilder({ page }).withTags(['wcag22aa']).analyze();
  expect(gapAxe.violations.filter(violation => violation.id === 'target-size')).toEqual([]);
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
