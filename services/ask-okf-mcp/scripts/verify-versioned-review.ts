/** Local Chrome regression against the actual service and preserved custody
 * profile. No routed responses, public-service calls or model calls. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createAskService } from '../src/service.ts';
import { CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID } from '../src/engines.ts';
import { LEGACY_BUNDLE_VERSION } from '../src/registry.ts';
import { approvedLoader } from './verify-approved-versions.ts';
import { freshDirectory, verifiedBuild, boundedFile } from './replay-observation-files.ts';

const args = process.argv.slice(2);
assert.equal(args.length, 4); assert.equal(args[0], '--playwright-module'); assert.equal(args[2], '--out');
const output = resolve(args[3]);
await freshDirectory(output);
const sha = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { raw: buildRaw, value: build } = await verifiedBuild(serviceRoot);
const executed = await readFile(fileURLToPath(import.meta.url));
await writeFile(resolve(output, 'executed-runner.ts'), executed, { flag: 'wx' });
await writeFile(resolve(output, 'build-receipt.json'), buildRaw, { flag: 'wx' });
for (const [path, name] of [['scripts/replay-observation-files.ts', 'observation-files.ts'], ['scripts/verify-approved-versions.ts', 'approved-loader.ts']])
  await writeFile(resolve(output, name), await boundedFile(resolve(serviceRoot, path)), { flag: 'wx' });
const { chromium } = await import(pathToFileURL(resolve(args[1])).href);
const loader = await approvedLoader();
let service: ReturnType<typeof createAskService>;
let handler: ReturnType<typeof toNodeHandler>;
const server = createServer((request, response) => { void handler(request, response); });
await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
const address = server.address(); assert.ok(address && typeof address === 'object');
const origin = `http://127.0.0.1:${address.port}`;
service = createAskService({ loadContext: loader.loadApprovedSource, allowedHosts: [`127.0.0.1:${address.port}`], allowedOrigins: [origin],
  fetchCorpus: async () => { throw new Error('This local custody profile must never fetch a corpus.'); } });
handler = toNodeHandler(service);
const started = new Date().toISOString();
const calls: any[] = []; const errors: string[] = []; const responses: any[] = [];
let browser: any;
const recipe = { bundle: 'okf-dwp', version: LEGACY_BUNDLE_VERSION, question: 'imprisonment',
  context_id: 'placeholder' };
try {
  const source = await loader.loadApprovedSource(LEGACY_BUNDLE_VERSION); assert.ok('index' in source);
  const { resolveReplay } = await import('../src/replay.ts');
  const direct = await resolveReplay(source, { version: recipe.version, question: recipe.question }, async () => { throw new Error('No fetch'); });
  recipe.context_id = direct.context.context_id;
  const url = (value: unknown) => origin + '/review/#' + Buffer.from(JSON.stringify(value)).toString('base64url');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error: Error) => errors.push(error.name));
  page.on('request', (request: any) => {
    assert.equal(new URL(request.url()).origin, origin, 'Browser must make only local requests');
    if (request.method() === 'POST') calls.push(JSON.parse(request.postData()));
  });
  page.on('response', async (response: any) => {
    if (response.request().method() !== 'POST') return;
    const raw = await response.body(); responses.push({ sha256: sha(raw), bytes: raw.length, status: response.status() });
  });
  await page.goto(url(recipe));
  await page.locator('#question').waitFor();
  assert.equal(calls.length, 0);
  assert.match(await page.locator('#engine-info').innerText(), /does not specify/);
  const submit = page.getByRole('button', { name: 'Recreate evidence', exact: true });
  await submit.focus(); await page.keyboard.press('Enter');
  await page.locator('#context:not([hidden])').waitFor();
  assert.equal(calls[0].params.arguments.engine_id, undefined);
  assert.match(await page.locator('#engine-info').innerText(), /originating engine remains unknown/);
  assert.match(await page.locator('#engine-info').innerText(), /Complete package SHA-256/);
  assert.equal(await page.locator('#status').getAttribute('aria-live'), 'polite');
  let pages = 0;
  while (await page.locator('#more-records').isVisible()) {
    const before = await page.locator('#records article').count();
    await page.locator('#more-records').click();
    await page.waitForFunction((count: number) => document.querySelectorAll('#records article').length > count, before);
    assert.ok(++pages < 10);
  }
  assert.equal(await page.locator('#records article').count(), direct.context.selected.length);
  assert.match(await page.locator('#engine-info').innerText(), /originating engine remains unknown/);
  for (const call of calls.slice(1)) assert.equal(call.params.arguments.engine_id, CURRENT_ENGINE_ID);
  await page.getByRole('button', { name: 'Read exact text', exact: true }).first().click();
  await page.waitForFunction(() => document.querySelector('#read-status')?.textContent?.includes('Full-content SHA-256'));
  assert.equal(await page.locator('#read-data').innerText(), direct.context.selected[0].record.text);
  assert.equal(calls.at(-1).params.arguments.engine_id, CURRENT_ENGINE_ID);
  await page.locator('#package').click();
  await page.waitForFunction(() => document.querySelector('#read-heading')?.textContent === 'Full machine package'
    && document.querySelector('#read-status')?.textContent?.includes('Full-content SHA-256'));
  await page.locator('#copy-link').click();
  const shared = new URL(await page.locator('#replay-link a').getAttribute('href'));
  const newRecipe = JSON.parse(Buffer.from(shared.hash.slice(1), 'base64url').toString());
  assert.equal(newRecipe.engine_id, CURRENT_ENGINE_ID); assert.equal(newRecipe.context_id, recipe.context_id);
  await page.screenshot({ path: resolve(output, 'historical-replay.png'), fullPage: false });
  await page.goto(url({ ...recipe, context_id: 'urn:sha256:' + '0'.repeat(64) }));
  await submit.click();
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Historical replay is unavailable'));
  assert.equal(await page.locator('#context').isVisible(), false);
  await page.screenshot({ path: resolve(output, 'historical-unavailable.png'), fullPage: false });
  await page.goto(url({ ...recipe, engine_id: PREVIOUS_ENGINE_ID, context_id: 'urn:sha256:' + '0'.repeat(64) }));
  await submit.click(); await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('pinned engine'));
  assert.equal(await page.locator('#context').isVisible(), false);
  // Editing is an explicit new task; the UI explains the identity reset.
  await page.locator('#question').fill('hospital');
  assert.match(await page.locator('#recipe-info').innerText(), /create a new context/);
  await submit.click(); await page.locator('#context:not([hidden])').waitFor();
  assert.equal(calls.at(-1).params.arguments.engine_id, CURRENT_ENGINE_ID);
  assert.equal(calls.at(-1).params.arguments.context_id, undefined);
  await page.goto(url({ ...recipe, engine_id: 'https://evil.test/engine.js' }));
  assert.match(await page.locator('#status').innerText(), /fragment is invalid/);
  assert.equal(await page.locator('#question').inputValue(), '');
  assert.deepEqual(errors, []);
  const artifacts: Record<string, any> = {};
  for (const path of ['historical-replay.png', 'historical-unavailable.png', 'executed-runner.ts', 'build-receipt.json', 'observation-files.ts', 'approved-loader.ts']) {
    const raw = await readFile(resolve(output, path)); artifacts[path] = { bytes: raw.length, sha256: sha(raw) };
  }
  await writeFile(resolve(output, 'observation.json'), JSON.stringify({ schema: 'okf-versioned-review-browser.v1',
    classification: 'local-chrome-actual-adapter', started_at: started, completed_at: new Date().toISOString(),
    browser: await browser.version(), build_receipt_sha256: sha(buildRaw), worker_sha256: build.outputs['dist/server/index.js'],
    runner_sha256: sha(executed), corpus_network_calls: 0, public_service_calls: 0, model_calls: 0,
    context_id: direct.context.context_id, source_version: LEGACY_BUNDLE_VERSION, engine_ids: [CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID],
    verified: ['inert opening', 'keyboard submit', 'historical origin unspecified', 'pinned catalogue continuation', 'exact record text',
      'bounded package view', 'explicit replay link', 'historical unavailable has no fallback', 'pinned mismatch', 'explicit new question', 'unknown engine fragment rejected'],
    tool_calls: calls.map(call => ({ name: call.params.name, engine_id: call.params.arguments.engine_id ?? null,
      expected_context: call.params.arguments.context_id ?? null, section: call.params.arguments.section ?? null })),
    responses, errors, artifacts,
    limitations: ['Local Chrome custody-profile journey; not public deployment, full-corpus browser coverage, screen-reader acceptance or ChatGPT/Voice acceptance.'] }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ pass: true, browser: await browser.version(), tool_calls: calls.length }));
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ started_at: started, failed_at: new Date().toISOString(),
    runner_sha256: sha(executed), category: error instanceof Error ? error.name : 'unknown', completed_tool_calls: calls.length }, null, 2) + '\n', { flag: 'wx' });
  throw error;
} finally { await browser?.close(); await service.close(); await loader.close(); await new Promise<void>(done => server.close(() => done())); }
