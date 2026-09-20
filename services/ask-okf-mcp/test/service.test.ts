import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Client as LegacyClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport as LegacyTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { assembleContext, canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { createAskService, MAX_BODY_BYTES, PUBLIC_ORIGIN, type Diagnostic } from '../src/service.ts';
import { LEGACY_APPROVED_BUNDLE as APPROVED_BUNDLE, LEGACY_BUNDLE_VERSION as BUNDLE_VERSION, verifyBundledContext } from '../src/registry.ts';
import { INPUT_SCHEMA, OUTPUT_SCHEMA, validator } from '../src/contracts.ts';
import { CORPUS_EXPLORER_URL } from '../src/landing.ts';

const question = 'A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance.';
const indexText = await readFile(new URL('../vendor/okf-dwp-assembly-index.json', import.meta.url), 'utf8');
const descriptorText = await readFile(new URL('../vendor/okf-dwp-descriptor.json', import.meta.url), 'utf8');
const approved = await verifyBundledContext(indexText, descriptorText);
const expected = await assembleContext(approved.index, question, undefined, approved.binding);
const url = `${PUBLIC_ORIGIN}/mcp`;
const input = { bundle: 'okf-dwp', version: BUNDLE_VERSION, question };
const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
function service(log: Diagnostic[] = []) {
  return createAskService({ loadContext: async () => approved, diagnostics: entry => log.push(entry) });
}
function request(message: unknown, extraHeaders = {}) {
  return new Request(url, { method: 'POST', headers: { ...headers, ...extraHeaders }, body: JSON.stringify(message) });
}
async function rpc(s: ReturnType<typeof service>, method: string, params?: unknown) {
  const response = await s.fetch(request({ jsonrpc: '2.0', id: 1, method, ...(params === undefined ? {} : { params }) }));
  const body = await response.text();
  const message = body.startsWith('event:') ? JSON.parse(body.split('\n').find(l => l.startsWith('data: '))!.slice(6)) : JSON.parse(body);
  return { response, message };
}

test('approved index and descriptor bytes bind the unchanged engine package', async () => {
  assert.equal(expected.context_id, 'urn:sha256:283cddceca09958b96949527280ea14775de5f26d092c939cacfaa545500e80e');
  assert.equal(expected.evidence_status, 'sufficient');
  assert.equal(expected.selected.length, 52);
  assert.equal(expected.relationships.length, 127);
  assert.equal(expected.binding.index_url, APPROVED_BUNDLE.index_url);
  assert.equal(expected.ai_answer, null);
  const validate = validator.getValidator(OUTPUT_SCHEMA);
  assert.equal(validate(expected).valid, true);
});

test('digest mismatches fail closed before health or tool output', async () => {
  await assert.rejects(verifyBundledContext(indexText + ' ', descriptorText), /integrity/);
  await assert.rejects(verifyBundledContext(indexText, descriptorText + ' '), /integrity/);
  const s = createAskService({ loadContext: () => verifyBundledContext(indexText + ' ', descriptorText) });
  assert.equal((await s.fetch(new Request(`${PUBLIC_ORIGIN}/health`))).status, 503);
  const result = await rpc(s, 'tools/call', { name: 'ask_okf', arguments: input });
  assert.equal(result.message.result.isError, true);
  assert.equal(result.message.result.structuredContent, undefined);
  await s.close();
});

test('official v2 SDK calls current HTTP and receives exact complete core package', async () => {
  const log: Diagnostic[] = [];
  const s = service(log);
  const seen: string[] = [];
  const client = new Client({ name: 'okf-v2-acceptance', version: '1.0.0' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator(), versionNegotiation: { mode: { pin: '2026-07-28' } } });
  const transport = new StreamableHTTPClientTransport(new URL(url), { fetch: async (input, init) => {
    const req = new Request(input, init); seen.push(req.headers.get('MCP-Protocol-Version') ?? 'none'); return s.fetch(req);
  } });
  try {
    await client.connect(transport);
    const list = await client.listTools();
    assert.deepEqual(list.tools.map(t => t.name), ['ask_okf', 'ask_okf_manifest', 'read_okf_evidence']);
    assert.equal(list.tools[0].annotations?.readOnlyHint, true);
    assert.deepEqual(list.tools[0].outputSchema, OUTPUT_SCHEMA);
    const result = await client.callTool({ name: 'ask_okf', arguments: input });
    assert.equal(result.isError, undefined);
    assert.equal(canonicalJson(result.structuredContent), canonicalJson(expected));
    assert.equal(result.content[0].type, 'text');
    if (result.content[0].type === 'text') assert.deepEqual(JSON.parse(result.content[0].text), expected);
    assert.ok(seen.includes('2026-07-28'));
    const entry = log.find(e => e.event === 'ask_okf')!;
    assert.equal(entry.records_selected, 52); assert.equal(entry.relationships_selected, 127);
    assert.equal(entry.package_bytes, Buffer.byteLength(JSON.stringify(expected)));
    assert.ok(!JSON.stringify(log).includes('claimant'));
    assert.ok(!JSON.stringify(log).includes('question'));
  } finally { await client.close(); await s.close(); }
});

test('official v1 SDK uses stateless legacy HTTP with identical package', async () => {
  const s = service();
  const client = new LegacyClient({ name: 'okf-v1-acceptance', version: '1.0.0' });
  const transport = new LegacyTransport(new URL(url), { fetch: async (input, init) => s.fetch(new Request(input, init)) });
  try {
    await client.connect(transport);
    const list = await client.listTools(); assert.equal(list.tools.length, 3);
    const result = await client.callTool({ name: 'ask_okf', arguments: input });
    assert.equal(canonicalJson(result.structuredContent), canonicalJson(expected));
    assert.ok(Array.isArray(result.content));
    assert.equal(result.content[0].type, 'text');
    if (result.content[0].type === 'text') assert.deepEqual(JSON.parse(result.content[0].text), expected);
  } finally { await client.close(); await s.close(); }
});

test('tool contract accepts ordinary questions and rejects whitespace and overlong questions', () => {
  const valid = validator.getValidator(INPUT_SCHEMA);
  assert.equal(valid(input).valid, true);
  assert.equal(valid({ ...input, question: '   \t\n' }).valid, false);
  assert.equal(valid({ ...input, question: 'x'.repeat(2001) }).valid, false);
});

test('unknown bundles, versions, URLs, arbitrary fields and unsafe budgets never assemble', async () => {
  const log: Diagnostic[] = []; const s = service(log);
  for (const args of [
    { ...input, bundle: 'https://127.0.0.1/private' }, { ...input, version: 'main' },
    { ...input, url: 'http://169.254.169.254/' }, { ...input, question: ' ' },
    { ...input, budget: { max_nodes: 201 } }, { ...input, budget: { max_bytes: 8191 } },
    { ...input, budget: { max_depth: -1 } }, { ...input, budget: { max_nodes: 1.5 } },
    { ...input, budget: { max_relationships: 1001 } }, { ...input, budget: { unknown: 1 } }
  ]) {
    const result = await rpc(s, 'tools/call', { name: 'ask_okf', arguments: args });
    assert.ok(result.message.result?.isError || result.message.error, JSON.stringify(args));
    assert.equal(result.message.result?.structuredContent, undefined);
  }
  assert.equal(log.filter(e => e.error_code === 'invalid_arguments').length, 10);
  assert.equal(log.filter(e => e.records_selected !== undefined).length, 0);
  await s.close();
});

test('small core budget reports insufficient and truncation without transport clipping', async () => {
  const s = service();
  const { message } = await rpc(s, 'tools/call', { name: 'ask_okf', arguments: { ...input, budget: { max_nodes: 1 } } });
  const result = message.result.structuredContent;
  assert.equal(result.evidence_status, 'insufficient'); assert.equal(result.budget.truncated, true);
  assert.ok(result.missing_evidence.length > 0); assert.equal(result.ai_answer, null);
  assert.deepEqual(JSON.parse(message.result.content[0].text), result);
  await s.close();
});

test('missing hospital knowledge stays insufficient in remote package', async () => {
  const s = service();
  const hospital = 'A claimant is admitted to hospital. Explain the effect on JSA, Income Support, State Pension Credit and ESA, distinguishing entitlement, payment and changes in amount, and trace each conclusion to the applicable DWP guidance.';
  const { message } = await rpc(s, 'tools/call', { name: 'ask_okf', arguments: { ...input, question: hospital } });
  const result = message.result.structuredContent;
  assert.equal(result.evidence_status, 'insufficient'); assert.equal(result.ai_answer, null);
  const direct = await assembleContext(approved.index, hospital, undefined, approved.binding);
  assert.equal(canonicalJson(result), canonicalJson(direct));
  assert.equal(result.selected.length, 50); assert.equal(result.relationships.length, 115);
  assert.ok(result.unresolved_terms.includes('hospital'));
  assert.ok(result.missing_evidence.some((e: { code: string }) => e.code === 'no_evidence_requirements'));
  await s.close();
});

test('origin and host guards reject off-site, null and deceptive hosts', async () => {
  const s = service();
  for (const origin of ['null', 'http://chatgpt.com', 'https://chatgpt.com.evil.example', 'https://evil.example']) {
    assert.equal((await s.fetch(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { origin }))).status, 403);
  }
  assert.equal((await s.fetch(new Request('https://evil.example/mcp', { method: 'POST', headers, body: '{}' }))).status, 403);
  assert.equal((await s.fetch(request({}, { host: 'evil.example' }))).status, 403);
  const good = await s.fetch(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { origin: 'https://chatgpt.com' }));
  assert.equal(good.status, 200); assert.equal(good.headers.get('access-control-allow-origin'), 'https://chatgpt.com');
  assert.equal(good.headers.get('cache-control'), 'no-store');
  await s.close();
});

test('body, encoding, method and arbitrary query boundaries are enforced', async () => {
  const s = service();
  assert.equal((await s.fetch(new Request(url, { method: 'POST', headers, body: 'x'.repeat(MAX_BODY_BYTES + 1) }))).status, 413);
  assert.equal((await s.fetch(request({}, { 'content-length': String(MAX_BODY_BYTES + 1) }))).status, 413);
  assert.equal((await s.fetch(request({}, { 'content-encoding': 'gzip' }))).status, 415);
  assert.equal((await s.fetch(new Request(url, { method: 'GET' }))).status, 405);
  assert.equal((await s.fetch(new Request(url + '?question=secret', { method: 'POST', headers, body: '{}' }))).status, 400);
  assert.equal((await s.fetch(request([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]))).status, 400);
  assert.equal((await s.fetch(request({ jsonrpc: '2.0', id: 1, method: 'subscriptions/listen' }))).status, 400);
  assert.equal((await s.fetch(new Request(url, { method: 'POST', headers, body: '{' }))).status, 400);
  await s.close();
});

test('concurrency bound rejects while all four request bodies are waiting', async () => {
  const s = service(); const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
  const pending = Array.from({ length: 4 }, () => s.fetch(new Request(url, { method: 'POST', headers,
    body: new ReadableStream({ start(controller) { controllers.push(controller); } }), duplex: 'half'
  } as RequestInit)));
  assert.equal((await s.fetch(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))).status, 429);
  for (const c of controllers) { c.enqueue(new TextEncoder().encode('{}')); c.close(); }
  await Promise.all(pending); await s.close();
});

test('request rate is bounded per instance without retaining client identities', async () => {
  const s = service();
  for (let i = 0; i < 120; i++) await s.fetch(request({}));
  const response = await s.fetch(request({})); assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60'); await s.close();
});

test('host-compatible /okf/mcp alias returns the same complete package as /mcp', async () => {
  const s = service();
  try {
    const message = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ask_okf', arguments: input } };
    const primary = await s.fetch(request(message));
    const alias = await s.fetch(new Request(`${PUBLIC_ORIGIN}/okf/mcp`, {
      method: 'POST', headers, body: JSON.stringify(message)
    }));
    assert.equal(alias.status, 200);
    assert.equal(await alias.text(), await primary.text());
    const landing = await s.fetch(new Request(`${PUBLIC_ORIGIN}/`));
    const html = await landing.text();
    assert.match(html, /MCP endpoint: <code>\/okf\/mcp<\/code>/);
    assert.ok(html.includes(CORPUS_EXPLORER_URL));
    assert.ok(CORPUS_EXPLORER_URL.endsWith('%2Fcombined%2Fokf-explorer.json'));
    assert.match(html, /3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84%2Fcombined%2Fokf-explorer.json/);
    assert.match(html, /9de52acf1db84b27f8933d80480eaa850e74fa33%2Fcombined%2Fokf-explorer.json/);
    assert.match(html, /bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752%2Ffull-dmg%2Fokf-corpus-context.json/);
    assert.match(html, /efb05c66616a9cd4328a86cf412780fe7bc7cf0b%2Ffull-dmg%2Fokf-explorer.json/);
    assert.match(html, /19,090 measured pages/);
    assert.match(html, /Packages remain <strong>insufficient<\/strong>/);
    assert.match(html, /staff-task profiles now declare missing scope, legal and review obligations/);
    assert.match(html, /https:\/\/chris-page-gov.github.io\/okf-dwp\/docs\/learning-path.html/);
    assert.match(html, /20 selected statutory units/);
    assert.match(html, /Use the Source family facet/);
    assert.match(html, /not specialist-approved interpretations or a complete legal dependency set/);
    assert.match(html, /405 Method Not Allowed/);
    assert.equal(landing.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal((await s.fetch(new Request(`${PUBLIC_ORIGIN}/okf/mcp`, { method: 'GET' }))).status, 405);
    assert.equal((await s.fetch(new Request(`${PUBLIC_ORIGIN}/okf/mcp-other`, { method: 'GET' }))).status, 404);
  } finally { await s.close(); }
});

test('SDK compact catalogue and lossless reads preserve exact full-package identity', async () => {
  const s = service();
  const client = new Client({ name: 'okf-compact-acceptance', version: '1.0.0' }, {
    jsonSchemaValidator: new CfWorkerJsonSchemaValidator(), versionNegotiation: { mode: { pin: '2026-07-28' } }
  });
  const transport = new StreamableHTTPClientTransport(new URL(url), { fetch: async (input, init) => s.fetch(new Request(input, init)) });
  try {
    await client.connect(transport);
    const first = await client.callTool({ name: 'ask_okf_manifest', arguments: input });
    assert.equal(first.isError, undefined);
    const manifest = first.structuredContent as any;
    assert.equal(manifest.context_id, expected.context_id);
    assert.equal(manifest.evidence_status, expected.evidence_status);
    assert.equal(manifest.summary.full_package_bytes, Buffer.byteLength(JSON.stringify(expected)));
    assert.equal(manifest.response_bytes, Buffer.byteLength(JSON.stringify(manifest)));
    assert.ok(manifest.response_bytes <= 16384);
    assert.equal(first.content[1].type, 'resource_link');
    const review = new URL(manifest.review_url);
    assert.equal(review.pathname, '/review/'); assert.equal(review.search, '');
    const recipe = JSON.parse(Buffer.from(review.hash.slice(1), 'base64url').toString('utf8'));
    assert.equal(recipe.context_id, expected.context_id); assert.equal(recipe.question, question);
    const ids = manifest.records.map((item: any) => item.id);
    let offset = manifest.delivery.next_offset;
    while (offset !== null) {
      const result = await client.callTool({ name: 'ask_okf_manifest', arguments: { ...recipe, offset } });
      assert.equal(result.isError, undefined);
      const page = result.structuredContent as any;
      ids.push(...page.records.map((item: any) => item.id)); offset = page.delivery.next_offset;
      assert.ok(page.response_bytes <= 16384);
    }
    assert.deepEqual(ids, expected.selected.map(item => item.record.id));
    const parts: string[] = []; offset = 0;
    do {
      const result = await client.callTool({ name: 'read_okf_evidence', arguments: { ...recipe, section: 'package', offset, delivery_bytes: 65536 } });
      assert.equal(result.isError, undefined);
      const part = result.structuredContent as any;
      assert.ok(Buffer.byteLength(JSON.stringify(part)) <= 65536);
      assert.equal(part.delivery.used_bytes, Buffer.byteLength(JSON.stringify(part)));
      parts.push(part.data); offset = part.next_offset;
    } while (offset !== null);
    assert.equal(parts.join(''), canonicalJson(expected));
  } finally { await client.close(); await s.close(); }
});

test('compact delivery rejects changed contexts, unknown IDs, unsafe inputs and unbound continuation', async () => {
  const s = service();
  const context_id = expected.context_id;
  try {
    for (const [name, args] of [
      ['ask_okf_manifest', { ...input, offset: 1 }],
      ['ask_okf_manifest', { ...input, context_id: 'urn:sha256:' + '0'.repeat(64) }],
      ['ask_okf_manifest', { ...input, delivery_bytes: 100 }],
      ['ask_okf_manifest', { ...input, url: 'https://evil.test/' }],
      ['read_okf_evidence', { ...input, context_id, section: 'record_text', record_id: 'https://evil.test/' }],
      ['read_okf_evidence', { ...input, context_id, section: 'package', question: 'another question' }],
      ['read_okf_evidence', { ...input, context_id, section: 'package', budget: { max_nodes: 1 } }],
      ['read_okf_evidence', { ...input, context_id, section: 'package', offset: -1 }],
      ['read_okf_evidence', { ...input, context_id, section: 'package', file: '/etc/passwd' }]
    ]) {
      const result = await rpc(s, 'tools/call', { name, arguments: args });
      assert.ok(result.message.result?.isError || result.message.error, JSON.stringify(args));
      assert.equal(result.message.result?.structuredContent, undefined);
    }
  } finally { await s.close(); }
});

test('review page is a static inert shell with privacy and executable-content boundaries', async () => {
  let loads = 0;
  const s = createAskService({ loadContext: async () => { loads++; return approved; } });
  try {
    const page = await s.fetch(new Request(`${PUBLIC_ORIGIN}/review/`));
    const html = await page.text();
    assert.equal(page.status, 200);
    assert.match(html, /Recreate evidence/);
    assert.match(html, /does not reproduce an AI answer/);
    assert.match(page.headers.get('content-security-policy')!, /script-src 'self'/);
    assert.match(page.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
    assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(page.headers.get('cache-control'), 'no-store, no-transform');
    const script = await s.fetch(new Request(`${PUBLIC_ORIGIN}/review.js`));
    assert.equal(script.status, 200);
    assert.equal(loads, 0);
    assert.equal((await s.fetch(new Request(`${PUBLIC_ORIGIN}/review/?question=private`))).status, 400);
  } finally { await s.close(); }
});

test('only HTML responses request no transformation while retaining their CSP', async () => {
  const s = service();
  try {
    for (const path of ['/', '/review', '/review/']) {
      const page = await s.fetch(new Request(`${PUBLIC_ORIGIN}${path}`));
      assert.equal(page.headers.get('cache-control'), 'no-store, no-transform');
      assert.match(page.headers.get('content-security-policy')!, /default-src 'none'/);
      assert.match(page.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
      assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
    }
    for (const path of ['/health', '/review.js', '/unknown', '/okf/mcp']) {
      const response = await s.fetch(new Request(`${PUBLIC_ORIGIN}${path}`));
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    const protocol = await s.fetch(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    assert.equal(protocol.headers.get('cache-control'), 'no-store');
  } finally { await s.close(); }
});
