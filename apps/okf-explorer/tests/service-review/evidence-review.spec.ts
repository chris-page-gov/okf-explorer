import { test, expect, type Page } from '@playwright/test';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { createHash } from 'node:crypto';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import path from 'node:path';
// @ts-expect-error -- Node-only Playwright harness; browser application has no Node type dependency.
import { Buffer } from 'node:buffer';

const version = 'efb05c66616a9cd4328a86cf412780fe7bc7cf0b';
const question = 'A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance.';
const contextId = 'urn:sha256:283cddceca09958b96949527280ea14775de5f26d092c939cacfaa545500e80e';
const recipe = { bundle: 'okf-dwp', question, version, context_id: contextId };
const encoded = Buffer.from(JSON.stringify(recipe)).toString('base64url');
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

function decode(text: string) {
  const message = text.trimStart().startsWith('{') ? JSON.parse(text)
    : JSON.parse(text.split('\n').find(line => line.startsWith('data: '))!.slice(6));
  expect(message.error).toBeUndefined();
  expect(message.result.isError).not.toBe(true);
  return message.result.structuredContent;
}

async function invoke(page: Page, name: string, click: () => Promise<unknown>) {
  const response = page.waitForResponse(response => response.url().endsWith('/okf/mcp')
    && response.request().postDataJSON()?.params?.name === name);
  await click();
  const received = await response;
  expect(received.status()).toBe(200);
  return { response: received, result: decode(await received.text()) };
}

function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

test('built script loads inert replay, exact source evidence, metadata, diagnostics and bounded parts', async ({ page }, testInfo) => {
  const output = path.resolve(testInfo.config.metadata.observationOutput);
  const externalService = testInfo.config.metadata.externalService === true;
  const errors = consoleErrors(page);
  const calls: { name: string; section?: string; offset?: number }[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/okf/mcp')) {
      const params = request.postDataJSON().params;
      calls.push({ name: params.name, section: params.arguments.section, offset: params.arguments.offset });
    }
  });
  const shell = await page.goto('/review/#' + encoded);
  expect(shell!.headers()['content-security-policy']).toContain("script-src 'self'");
  await expect(page.getByLabel('Approved source version')).toHaveValue(version);
  await expect(page.getByLabel('General question')).toHaveValue(question);
  await expect(page.locator('#recipe-info')).toContainText('No evidence has been loaded yet');
  await expect(page.locator('#context')).toBeHidden();
  expect(calls).toEqual([]);

  const { result: manifest } = await invoke(page, 'ask_okf_manifest', () => page.getByRole('button', { name: 'Recreate evidence' }).click());
  expect(manifest.context_id).toBe(contextId);
  expect(manifest.summary.selected_records).toBe(52);
  expect(manifest.summary.ai_answer).toBeNull();
  expect(manifest.delivery.used_bytes).toBeLessThanOrEqual(manifest.delivery.max_bytes);
  await expect(page.locator('#identity')).toContainText(contextId);
  await expect(page.locator('#record-count')).toContainText(`${manifest.delivery.returned} of 52`);
  const firstPageCount = manifest.delivery.returned;
  expect(firstPageCount).toBeGreaterThan(0);
  expect(firstPageCount).toBeLessThan(52);
  const { result: secondManifest } = await invoke(page, 'ask_okf_manifest', () => page.getByRole('button', { name: 'Show more records' }).click());
  expect(secondManifest.context_id).toBe(contextId);
  expect(secondManifest.delivery.offset).toBe(manifest.delivery.next_offset);
  await expect(page.locator('#records article')).toHaveCount(firstPageCount + secondManifest.delivery.returned);

  const source = manifest.records.find((row: any) => row.kind === 'evidence');
  expect(source).toBeTruthy();
  // Use the canonical identifier, not a label decoded by a browser-driver SSE
  // response API. Chromium CDP can misdecode non-ASCII SSE response text even
  // while window.fetch and the actual rendered source correctly use UTF-8.
  const article = page.locator('#records article').filter({ has: page.getByText(source.id, { exact: true }) });
  const sourceTitle = await article.getByRole('heading').textContent();
  await expect(article.getByRole('link', { name: /^Original source/ })).toHaveAttribute('href', source.source_url);
  const { result: text } = await invoke(page, 'read_okf_evidence', () => article.getByRole('button', { name: 'Read exact text' }).click());
  expect(text.context_id).toBe(contextId);
  expect(text.record_id).toBe(source.id);
  expect(text.delivery.partial).toBe(false);
  expect(text.content_sha256).toBe(source.text_sha256);
  expect(text.ai_answer).toBeNull();
  await expect.poll(async () => sha256(await page.locator('#read-data').textContent() ?? '')).toBe(source.text_sha256);
  await expect(page.locator('#read-heading')).toHaveText(sourceTitle + ' — exact text');
  await expect(page.locator('#read-source')).toContainText(source.id);
  await expect(page.locator('#read-source a')).toHaveAttribute('href', source.source_url);
  await expect(page.locator('#read-status')).toContainText('This is source data, not an AI answer');
  await mkdir(output, { recursive: true });
  await page.locator('#read-heading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `${testInfo.project.name}-source-evidence.png`) });

  const { result: metadata } = await invoke(page, 'read_okf_evidence', () => article.getByRole('button', { name: 'Inspect provenance and inclusion reasons' }).click());
  expect(metadata.record_id).toBe(source.id);
  expect(metadata.section).toBe('record_metadata');
  await expect(page.locator('#read-heading')).toHaveText(sourceTitle + ' — provenance and inclusion');
  await expect(page.locator('#read-data')).toContainText('provenance');
  await expect(page.locator('#read-data')).toContainText(source.id);

  const { result: diagnostics } = await invoke(page, 'read_okf_evidence', () => page.getByRole('button', { name: 'Read gaps, scope and budgets' }).click());
  expect(diagnostics.section).toBe('diagnostics');
  await expect(page.locator('#read-heading')).toHaveText('Gaps, scope and budgets');
  expect(diagnostics.data).toContain('missing_evidence');
  await expect(page.locator('#read-data')).toContainText('missing_evidence');

  const { result: firstPart } = await invoke(page, 'read_okf_evidence', () => page.getByRole('button', { name: 'Read full machine package' }).click());
  expect(firstPart.offset).toBe(0);
  expect(firstPart.delivery.partial).toBe(true);
  await expect(page.getByRole('button', { name: 'Read next part' })).toBeVisible();
  await expect(page.locator('#read-status')).toContainText(`Characters 0–${firstPart.end_offset}`);
  const firstVisiblePart = await page.locator('#read-data').textContent();
  const { result: nextPart } = await invoke(page, 'read_okf_evidence', () => page.getByRole('button', { name: 'Read next part' }).click());
  expect(nextPart.offset).toBe(firstPart.next_offset);
  expect(nextPart.context_id).toBe(contextId);
  expect(nextPart.content_sha256).toBe(firstPart.content_sha256);
  await expect(page.locator('#read-status')).toContainText(`Characters ${nextPart.offset}–${nextPart.end_offset}`);
  await expect(page.locator('#read-heading')).toHaveText('Full machine package');
  expect(await page.locator('#read-data').textContent()).not.toBe(firstVisiblePart);
  await expect(page.locator('#read-status')).toContainText('Partial view');
  await page.getByRole('button', { name: 'Show replay link' }).click();
  const replayLink = page.getByRole('link', { name: 'Replay this exact evidence context' });
  const replay = new URL((await replayLink.getAttribute('href'))!);
  const replayRecipe = JSON.parse(Buffer.from(replay.hash.slice(1), 'base64url').toString());
  expect(replayRecipe.context_id).toBe(contextId);
  expect(replayRecipe.question).toBe(question);
  expect(replayRecipe.version).toBe(version);
  const callsBeforeEdit = calls.length;
  await page.getByLabel('General question').fill('Changed public research question');
  await expect(page.locator('#context')).toBeHidden();
  await expect(page.locator('#read-data')).toHaveText('');
  await expect(page.locator('#read-source')).toHaveText('');
  await expect(page.locator('#read-heading')).toHaveText('Evidence reader');
  await expect(page.locator('#replay-link a')).toHaveCount(0);
  await expect(page.locator('#status')).toContainText('Recreate evidence to make a new context');
  expect(calls).toHaveLength(callsBeforeEdit);
  const buildReceipt = await readFile(path.resolve('../../services/ask-okf-mcp/dist/build-receipt.json'));
  await writeFile(path.join(output, `${testInfo.project.name}-receipt.json`), JSON.stringify({
    schema: 'okf-service-review-browser-observation.v1', observed_at: new Date().toISOString(),
    browser: testInfo.project.name, base_url: testInfo.project.use.baseURL ?? 'http://127.0.0.1:8787',
    target: externalService ? 'external-service' : 'local-built-service',
    functional_assertions: 'passed', console_gate: errors.length === 0 ? 'passed' : 'failed',
    test_candidate_build_receipt_sha256: sha256(buildReceipt),
    deployment_identity: externalService ? 'Not established by this browser test; see the separately retained deployment and SDK receipts.' : 'Local candidate build receipt.',
    version, context_id: contextId,
    selected_records: 52, first_catalogue_count: firstPageCount, record_text_id: source.id,
    record_text_sha256: source.text_sha256, package_sha256: firstPart.content_sha256,
    assertions: ['inert-fragment', 'explicit-submit', 'catalogue-pagination', 'exact-source-text-hash',
      'selected-record-title-identity-and-source', 'provenance-and-inclusion-reasons', 'diagnostics',
      'bounded-next-part', 'replay-link', 'stale-question-invalidated'],
    calls, console_errors: errors,
    limitations: [externalService
      ? 'External service using the historical vendored profile; no full-corpus network or AI-answer verification. The local candidate build receipt identifies the test reference, not the remote deployment.'
      : 'Local built service with historical vendored source; no live deployment, full-corpus network or AI-answer verification.',
      'Sufficient is the preserved historical research profile status, not current legal or individual entitlement assurance.']
  }, null, 2) + '\n');
  expect(errors).toEqual([]);
});

test('replay links are removed when changing or recreating a context and regenerated for the new identity', async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto('/review/#' + encoded);
  const { result: original } = await invoke(page, 'ask_okf_manifest', () => page.getByRole('button', { name: 'Recreate evidence' }).click());
  expect(original.context_id).toBe(contextId);
  await page.getByRole('button', { name: 'Show replay link' }).click();
  await expect(page.locator('#replay-link a')).toHaveCount(1);

  const changedQuestion = 'Explain the effect of hospital admission on State Pension Credit.';
  await page.getByLabel('General question').fill(changedQuestion);
  await expect(page.locator('#replay-link a')).toHaveCount(0);
  const { result: changed } = await invoke(page, 'ask_okf_manifest', () => page.getByRole('button', { name: 'Recreate evidence' }).click());
  expect(changed.context_id).not.toBe(original.context_id);
  await expect(page.locator('#identity')).toContainText(changed.context_id);
  await expect(page.locator('#replay-link a')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show replay link' }).click();
  const link = new URL((await page.locator('#replay-link a').getAttribute('href'))!);
  const changedRecipe = JSON.parse(Buffer.from(link.hash.slice(1), 'base64url').toString());
  expect(changedRecipe.context_id).toBe(changed.context_id);
  expect(changedRecipe.question).toBe(changedQuestion);
  expect(changedRecipe.version).toBe(version);

  // Submitting again also clears an existing link, even without an input event.
  const { result: recreated } = await invoke(page, 'ask_okf_manifest', () => page.getByRole('button', { name: 'Recreate evidence' }).click());
  expect(recreated.context_id).toBe(changed.context_id);
  await expect(page.locator('#replay-link a')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show replay link' }).click();
  await expect(page.locator('#replay-link a')).toHaveCount(1);
  await page.getByLabel('Approved source version').selectOption({ index: 0 });
  await expect(page.locator('#replay-link a')).toHaveCount(0);
  await expect(page.locator('#context')).toBeHidden();
  expect(errors).toEqual([]);
});

test('question change discards a late replay response', async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto('/review/#' + encoded);
  await expect(page.getByLabel('General question')).toHaveValue(question);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requestReady!: () => void;
  const ready = new Promise<void>(resolve => { requestReady = resolve; });
  await page.route('**/okf/mcp', async route => {
    const response = await route.fetch();
    requestReady();
    await held;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Recreate evidence' }).click();
  await ready;
  await page.getByLabel('General question').fill('A different general question');
  const responseFinished = page.waitForResponse(response => response.url().endsWith('/okf/mcp'));
  release();
  await (await responseFinished).finished();
  await expect(page.locator('#context')).toBeHidden();
  await expect(page.locator('#status')).toContainText('Question or version changed');
  await expect(page.locator('#records article')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('invalid fragment is inert and synthetic returned markup renders as text', async ({ page }) => {
  const errors = consoleErrors(page);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('/okf/mcp')) requests.push(request.url()); });
  await page.goto('/review/#not-a-valid-json-recipe');
  await expect(page.locator('#status')).toContainText('replay fragment is invalid');
  expect(requests).toEqual([]);
  await page.getByLabel('General question').fill(question);
  await page.getByLabel('Approved source version').selectOption(version);
  const markup = '<img id="injected-image" src="bad" onerror="window.injected=true"><script>window.injected=true</script>';
  await page.route('**/okf/mcp', async route => {
    const response = await route.fetch();
    const result = decode(await response.text());
    const operation = route.request().postDataJSON().params.name;
    if (operation === 'ask_okf_manifest') {
      result.records[0].label = markup;
      result.records[0].source_url = 'javascript:window.injected=true';
    } else result.data = markup;
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: { structuredContent: result } }) });
  });
  await page.getByRole('button', { name: 'Recreate evidence' }).click();
  await expect(page.locator('#records article').first().getByRole('heading')).toHaveText(markup);
  await expect(page.locator('#records article').first().getByRole('link')).toHaveCount(0);
  await page.locator('#records article').first().getByRole('button', { name: 'Read exact text' }).click();
  await expect(page.locator('#read-data')).toHaveText(markup);
  await expect(page.locator('#injected-image')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
  expect(errors).toEqual([]);
});
