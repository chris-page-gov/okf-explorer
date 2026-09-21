import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArguments, approvedPairs, enforceCensus, boundedRemoteFetch, boundedFile, noLinks,
  verifyDelivery, validateToolDiscovery, compareToolDiscovery, discoveryDiagnostic, LIMITS, PUBLIC_QUESTION, canonical, sha } from '../scripts/verify-versioned-remote.ts';

const origin = 'https://ask-okf.example.test';
const cli = ['--origin', origin, '--source-version', '1'.repeat(40), '--expected-worker-sha256', '2'.repeat(64),
  '--service-version', '0.6.0', '--comparison-commit', '3'.repeat(40), '--dwp-root', '/public/source', '--out', '/public/new-observation'];
const message = () => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
  name: 'ask_okf_manifest', arguments: { question: PUBLIC_QUESTION } } });
const post = (body: unknown = message()) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function clock() { let now = 0; return { now: () => now, sleep: async (ms: number) => { now += ms; }, advance: (ms: number) => { now += ms; } }; }

test('public execution is explicit; identity arguments and origin cannot be omitted or smuggled', () => {
  assert.equal(parseArguments(cli).executePublic, false);
  assert.equal(parseArguments([...cli, '--execute-public']).executePublic, true);
  for (const extra of [['--execute-public', '--execute-public'], ['--unknown', 'yes'], ['--origin', origin]]) assert.throws(() => parseArguments([...cli, ...extra]));
  assert.throws(() => parseArguments(cli.slice(0, -2)));
  for (const bad of ['http://example.test', origin + '/', origin + '/okf/mcp', 'https://user:secret@example.test', 'https://127.0.0.1', origin + '?x=y', origin + '#x']) {
    assert.throws(() => parseArguments(['--origin', bad, ...cli.slice(2)]));
  }
});

test('pair census follows explicit compatibility, including a fifth current-only source', () => {
  const versions = ['one', 'two', 'three', 'four'];
  const current = { engine_id: 'current', source_versions: [...versions, 'five'] };
  const old = { engine_id: 'old', source_versions: versions };
  assert.equal(approvedPairs(versions, [current, old]).length, 8);
  const pairs = approvedPairs([...versions, 'five'], [current, old]);
  assert.equal(pairs.length, 9); assert.deepEqual(pairs.at(-1), { source_version: 'five', engine_id: 'current' });
  assert.ok(!pairs.some(pair => pair.source_version === 'five' && pair.engine_id === 'old'));
  assert.throws(() => approvedPairs(versions, [current, current]));
  assert.throws(() => approvedPairs(Array.from({ length: 16 }, (_, i) => String(i)), [
    { engine_id: 'one', source_versions: Array.from({ length: 16 }, (_, i) => String(i)) },
    { engine_id: 'two', source_versions: Array.from({ length: 16 }, (_, i) => String(i)) }
  ]), /cap/);
  assert.equal(enforceCensus([10, 20], 14), 44);
  assert.throws(() => enforceCensus([190], 14), /cannot fit/);
});

test('all HTTP starts are paced, bounded and recorded without question or response bodies', async () => {
  const time = clock(), starts: number[] = [];
  const remote = boundedRemoteFetch(origin, 3, async (_input, init) => {
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'manual'); starts.push(time.now());
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }, time);
  await remote.fetch(origin + '/health');
  await remote.fetch(origin + '/okf/mcp', post());
  await remote.fetch(origin + '/okf/mcp', post());
  assert.deepEqual(starts, [0, 750, 1500]);
  assert.equal(remote.receipt.request_count, 3); assert.equal(remote.receipt.received_bytes, 6);
  assert.equal(remote.receipt.minimum_observed_interval_ms, 750);
  assert.equal(remote.receipt.automatic_retries, 0);
  assert.ok(!JSON.stringify(remote.receipt).includes(PUBLIC_QUESTION));
  await assert.rejects(remote.fetch(origin + '/health'), /request cap/);
});

test('unknown routes, arbitrary questions, credentials, full tool calls and oversized requests never fetch', async () => {
  let calls = 0; const remote = boundedRemoteFetch(origin, 10, async () => { calls++; return new Response('{}'); }, clock());
  for (const url of [origin + '/private', origin + '/health?x=y', 'https://other.test/health', origin + '/okf/mcp']) await assert.rejects(remote.fetch(url));
  await assert.rejects(remote.fetch(origin + '/health', { headers: { Authorization: 'Bearer private' } }));
  const arbitrary = message(); arbitrary.params.arguments.question = 'private arbitrary question';
  await assert.rejects(remote.fetch(origin + '/okf/mcp', post(arbitrary)), /explicit public/);
  const full = message(); full.params.name = 'ask_okf';
  await assert.rejects(remote.fetch(origin + '/okf/mcp', post(full)));
  await assert.rejects(remote.fetch(origin + '/okf/mcp', post({ padding: 'x'.repeat(32769) })), /cap/);
  assert.equal(calls, 0);
});

test('429, redirect, malformed Content-Length and network errors fail without retry or raw-error retention', async () => {
  for (const upstream of [
    async () => new Response('private', { status: 429 }),
    async () => new Response(null, { status: 302, headers: { Location: 'https://elsewhere.test/' } }),
    async () => new Response('{}', { headers: { 'Content-Length': 'nonsense' } }),
    async () => { throw new Error('private credential detail'); }
  ]) {
    let calls = 0;
    const remote = boundedRemoteFetch(origin, 3, async () => { calls++; return upstream(); }, clock());
    await assert.rejects(remote.fetch(origin + '/health'));
    await assert.rejects(remote.fetch(origin + '/health'), /stopped/);
    assert.equal(calls, 1); assert.equal(remote.receipt.request_count, 1);
    assert.ok(!JSON.stringify(remote.receipt).includes('private'));
  }
});

test('response cap cancels a stream; aggregate bytes and run deadlines do not reset', async () => {
  let cancelled = false;
  const remote = boundedRemoteFetch(origin, 2, async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(LIMITS.response_bytes + 1)); },
    cancel() { cancelled = true; }
  })), clock());
  await assert.rejects(remote.fetch(origin + '/health'), /byte cap/); assert.equal(cancelled, true);
  const time = clock(); let calls = 0;
  const late = boundedRemoteFetch(origin, 2, async () => { calls++; time.advance(LIMITS.run_timeout_ms); return new Response('{}'); }, time);
  await assert.rejects(late.fetch(origin + '/health'), /deadline/); assert.equal(calls, 1);
  const aggregate = boundedRemoteFetch(origin, 2, async () => new Response('{}'), clock());
  aggregate.receipt.received_bytes = LIMITS.received_bytes - 1;
  await assert.rejects(aggregate.fetch(origin + '/health'), /byte cap/);
});

test('bounded local reads reject oversized and linked inputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'okf-live-verifier-test-'));
  try {
    await writeFile(join(root, 'source'), 'abc');
    assert.equal((await boundedFile(join(root, 'source'), 3)).toString(), 'abc');
    await assert.rejects(boundedFile(join(root, 'source'), 2), /bound/);
    await symlink(join(root, 'source'), join(root, 'linked'));
    await assert.rejects(boundedFile(join(root, 'linked')), /Linked/);
    await symlink(root, join(root, 'parent'));
    await assert.rejects(noLinks(join(root, 'parent', 'source')), /Linked/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('delivery comparison detects altered provenance, omitted catalogue records and changed engine identity', async () => {
  const context = { context_id: 'urn:test', selected: [{ record: { id: 'one', provenance: [{ source_url: 'https://example.test/' }] } }],
    evidence_status: 'insufficient', relationships: [] };
  const complete = canonical(context), digest = sha(complete);
  const manifest = { records: [{ id: 'one' }], delivery: { offset: 0 }, review_url: origin + '/review/#fixed',
    replay_identity: { engine_id: 'approved' } };
  const part = { data: complete, offset: 0, content_sha256: digest };
  const item = { id: 'synthetic-control', request: { version: 'test' }, context, identity: { engine_id: 'approved', package_sha256: digest },
    pinned: {}, manifests: [manifest], reads: [{ section: 'package', parts: [part] }] };
  const client = (change: (name: string, value: any) => void = () => {}) => ({ async callTool({ name }: any) {
    const value = structuredClone(name === 'ask_okf_manifest' ? manifest : part); change(name, value);
    return { structuredContent: value, content: [{ type: 'text', text: JSON.stringify(value) },
      ...(name === 'ask_okf_manifest' ? [{ type: 'resource_link', uri: manifest.review_url }] : [])] };
  } });
  const result = await verifyDelivery(client(), item, origin); assert.equal(result.complete, complete);
  for (const mutation of [
    (name: string, value: any) => { if (name === 'ask_okf_manifest') value.records = []; },
    (name: string, value: any) => { if (name === 'ask_okf_manifest') value.replay_identity.engine_id = 'other'; },
    (name: string, value: any) => { if (name !== 'ask_okf_manifest') value.data = complete.replace('example.test', 'altered.test'); }
  ]) await assert.rejects(verifyDelivery(client(mutation), item, origin), /differs/);
});

test('request streams stop at their bound before invoking upstream', async () => {
  let fetched = false, cancelled = false;
  const remote = boundedRemoteFetch(origin, 1, async () => { fetched = true; return new Response('{}'); }, clock());
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(LIMITS.request_bytes + 1)); }, cancel() { cancelled = true; } });
  const request = new Request(origin + '/okf/mcp', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  await assert.rejects(remote.fetch(request), /Request body cap/);
  assert.equal(fetched, false); assert.equal(cancelled, true);
});

test('official SDKs traverse actual in-process service with exact compact comparison; no HTTP observation is produced', async () => {
  const [{ Client, StreamableHTTPClientTransport }, { CfWorkerJsonSchemaValidator }, oldClient, oldTransport,
    { createAskService, PUBLIC_ORIGIN }, registry, { resolveReplay }, engines, delivery, replayDelivery, contracts, fs,
    { prepareDelivery }] = await Promise.all([
      import('@modelcontextprotocol/client'), import('@modelcontextprotocol/client/validators/cf-worker'),
      import('@modelcontextprotocol/sdk/client/index.js'), import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
      import('../src/service.ts'), import('../src/registry.ts'), import('../src/replay.ts'), import('../src/engines.ts'),
      import('../../../apps/okf-explorer/src/lib/context/delivery.ts'), import('../src/replayDelivery.ts'), import('../src/deliveryContracts.ts'),
      import('node:fs/promises'), import('../scripts/verify-versioned-remote.ts')
    ]);
  const source = await registry.verifyBundledContext(await fs.readFile(new URL('../vendor/okf-dwp-assembly-index.json', import.meta.url), 'utf8'),
    await fs.readFile(new URL('../vendor/okf-dwp-descriptor.json', import.meta.url), 'utf8'));
  const request = { bundle: 'okf-dwp', question: PUBLIC_QUESTION, version: registry.LEGACY_BUNDLE_VERSION, budget: { max_bytes: 524288 } };
  const noNetwork: typeof fetch = async () => { throw new Error('External requests forbidden in this offline SDK control'); };
  const assembled = await resolveReplay(source, request, noNetwork);
  const item = await prepareDelivery({ id: 'offline-sdk-control', request, ...assembled, inspectRecord: true }, PUBLIC_ORIGIN,
    { delivery, bindEvidenceRead: replayDelivery.bindEvidenceRead, reviewLink: contracts.reviewLink });
  assert.equal(item.identity.mode, 'current-default');
  assert.equal(item.manifests[0].replay.engine_id, engines.CURRENT_ENGINE_ID);
  const service = createAskService({ loadContext: async () => source, fetchCorpus: noNetwork });
  const remote = boundedRemoteFetch(PUBLIC_ORIGIN, enforceCensus([item.calls], 8), async (input, init) => service.fetch(new Request(input, init)), clock());
  const client = new Client({ name: 'offline-successor-control', version: '1' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator(), versionNegotiation: { mode: { pin: '2026-07-28' } } });
  const legacy = new oldClient.Client({ name: 'offline-successor-v1-control', version: '1' });
  const reconnect = { maxRetries: 0, maxReconnectionDelay: 1000, initialReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 };
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(PUBLIC_ORIGIN + '/okf/mcp'), { fetch: remote.fetch, reconnectionOptions: reconnect }));
    const askContracts = await import('../src/contracts.ts');
    const expected = [['ask_okf', askContracts.INPUT_SCHEMA, askContracts.OUTPUT_SCHEMA],
      ['ask_okf_manifest', contracts.MANIFEST_INPUT_SCHEMA, contracts.MANIFEST_OUTPUT_SCHEMA],
      ['read_okf_evidence', contracts.EVIDENCE_INPUT_SCHEMA, contracts.EVIDENCE_OUTPUT_SCHEMA]] as const;
    const v2 = validateToolDiscovery(await client.listTools(), expected, 'v2', registry.SERVICE_VERSION);
    const received = await verifyDelivery(client as any, item, PUBLIC_ORIGIN);
    assert.equal(received.complete, canonical(assembled.context));
    await legacy.connect(new oldTransport.StreamableHTTPClientTransport(new URL(PUBLIC_ORIGIN + '/okf/mcp'), { fetch: remote.fetch, reconnectionOptions: reconnect }));
    const v1 = validateToolDiscovery(await legacy.listTools(), expected, 'v1', registry.SERVICE_VERSION);
    compareToolDiscovery(v2, v1);
    assert.equal(v1.tools_sha256, v2.tools_sha256);
    assert.notEqual(v1.result_sha256, v2.result_sha256, 'Real protocol-era envelopes differ');
    assert.notEqual(v1.envelope_sha256, v2.envelope_sha256);
    const first = await legacy.callTool({ name: 'ask_okf_manifest', arguments: { ...item.request, delivery_bytes: 16384 } });
    assert.equal(canonical(first.structuredContent), canonical(item.manifests[0]));
    assert.ok(remote.receipt.request_count <= item.calls + 8);
    assert.ok(remote.receipt.events.every(row => row.response_bytes <= LIMITS.response_bytes));
  } finally { await client.close(); await legacy.close(); await service.close(); }
});

test('a synthetic value larger than 256 KiB paginates catalogue and complete Unicode evidence within wire bounds', async () => {
  const [{ prepareDelivery }, delivery, { bindEvidenceRead }, { reviewLink }, { CURRENT_ENGINE_ID }] = await Promise.all([
    import('../scripts/verify-versioned-remote.ts'), import('../../../apps/okf-explorer/src/lib/context/delivery.ts'),
    import('../src/replayDelivery.ts'), import('../src/deliveryContracts.ts'), import('../src/engines.ts')
  ]);
  // Deliberately synthetic delivery fixture, never an authoritative assembly or
  // a network observation. Large quoted/Unicode text exercises actual escaping.
  const context: any = { context_id: 'urn:sha256:' + '1'.repeat(64), question: PUBLIC_QUESTION,
    bundle: { id: 'synthetic-delivery', snapshot: 'synthetic', source_url: origin },
    binding: { index_url: origin, index_sha256: '2'.repeat(64) }, evidence_status: 'insufficient',
    selected: Array.from({ length: 70 }, (_, i) => ({ record: { id: `urn:synthetic:${i}`, label: `Synthetic ${i} ` + 'bounded '.repeat(30),
      kind: 'evidence', assertion_status: 'model-derived', text: 'Synthetic "quotation" 🧭\\\n'.repeat(150),
      provenance: [{ url: origin, locator: String(i) }], authority: { class: 'synthetic' } }, reasons: [], paths: [] })),
    relationships: [], resolved_concepts: [], ambiguities: [], unresolved_terms: [], missing_evidence: [{ code: 'synthetic-only' }],
    conflicts: [], requirements: [], budget: { max_nodes: 80, max_relationships: 160, max_depth: 2, max_bytes: 524288, truncated: false }, ai_answer: null };
  const complete = canonical(context); assert.ok(Buffer.byteLength(complete) > 262144 && Buffer.byteLength(complete) < 524288);
  const identity = { engine_id: CURRENT_ENGINE_ID, mode: 'current-default', original_engine_id: CURRENT_ENGINE_ID,
    matching_engine_ids: [CURRENT_ENGINE_ID], package_sha256: sha(complete) };
  const request = { bundle: 'okf-dwp', version: '1'.repeat(40), question: PUBLIC_QUESTION, budget: { max_bytes: 524288 } };
  const item = await prepareDelivery({ id: 'synthetic-large-delivery', request, context, identity, inspectRecord: true }, origin,
    { delivery, bindEvidenceRead, reviewLink });
  assert.ok(item.manifests.length > 1); assert.ok(item.reads[0].parts.length > 4);
  let calls = 0;
  const client = { async callTool({ name, arguments: args }: any) {
    if (calls++ > 0) assert.equal(args.engine_id, CURRENT_ENGINE_ID, 'Continuations preserve the explicit engine');
    const value = name === 'ask_okf_manifest' ? item.manifests.find((row: any) => row.delivery.offset === args.offset)
      : item.reads.find((read: any) => read.section === args.section)!.parts.find((row: any) => row.offset === args.offset);
    assert.ok(value);
    const response = { structuredContent: value, content: [{ type: 'text', text: JSON.stringify(value) },
      ...(name === 'ask_okf_manifest' ? [{ type: 'resource_link', uri: value.review_url }] : [])] };
    assert.ok(Buffer.byteLength(JSON.stringify({ jsonrpc: '2.0', id: calls, result: response })) < LIMITS.response_bytes);
    return response;
  } };
  const result = await verifyDelivery(client, item, origin);
  assert.equal(result.complete, complete); assert.equal(calls, item.calls);
});

test('negative controls require one exact local error-only envelope and reject evidence hidden behind isError', async () => {
  const { verifyNegativeEnvelope } = await import('../scripts/verify-versioned-remote.ts');
  const expected = { jsonrpc: '2.0', id: 7, result: { isError: true, content: [{ type: 'text', text: 'The engine is unknown or is not approved for this source version.' }] } };
  const json = JSON.stringify(expected), sse = `event: message\ndata: ${json}\n\n\n`;
  assert.deepEqual(verifyNegativeEnvelope(json, 7, expected), expected);
  assert.deepEqual(verifyNegativeEnvelope(sse, 7, expected), expected);
  for (const change of [
    (value: any) => { value.result.content[0].text = '{"selected":[{"text":"leaked source"}]}'; },
    (value: any) => { value.result.content.push({ type: 'resource_link', uri: origin + '/evidence' }); },
    (value: any) => { value.result.structuredContent = { selected: ['leaked'] }; },
    (value: any) => { value.id = 8; },
    (value: any) => { value.extra = 'leaked source'; }
  ]) { const changed = structuredClone(expected); change(changed); assert.throws(() => verifyNegativeEnvelope(JSON.stringify(changed), 7, expected)); }
  for (const duplicate of [json.replace('"result":', '"result":{"evidence":"leaked"},"result":'),
    json.replace('"content":', '"content":[{"text":"leaked"}],"content":')]) {
    assert.throws(() => verifyNegativeEnvelope(duplicate, 7, expected));
    assert.throws(() => verifyNegativeEnvelope(`event: message\ndata: ${duplicate}\n\n`, 7, expected));
  }
  for (const suffix of ['data: {"evidence":"leaked"}\n\n', 'event: message\ndata: {"evidence":"leaked"}\n\n', '{"extra":"leaked"}']) {
    assert.throws(() => verifyNegativeEnvelope(sse + suffix, 7, expected));
    assert.throws(() => verifyNegativeEnvelope(json + suffix, 7, expected));
  }
});

test('special-file inputs are rejected before blocking open and ordinary missing files fail', async () => {
  const { execFileSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'okf-nonregular-control-'));
  try {
    execFileSync('mkfifo', [join(root, 'fifo')], { timeout: 1000 });
    await assert.rejects(boundedFile(join(root, 'fifo')), /regular file/);
    await assert.rejects(boundedFile(root), /regular file/);
    await assert.rejects(boundedFile(join(root, 'missing')), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test('cross-SDK discovery admits only exact known envelopes and preserves complete tool semantics', () => {
  const input = { type: 'object', properties: { question: { type: 'string' } }, required: ['question'], additionalProperties: false };
  const output = { type: 'object', properties: { evidence_status: { const: 'insufficient' } } };
  const expected = [['fixture', input, output]] as const;
  const tool = { name: 'fixture', title: 'Synthetic fixture', description: 'Retain all qualifications.', inputSchema: input, outputSchema: output,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { 'okf/untrustedContent': true, securitySchemes: [{ type: 'noauth' }] } };
  const legacy = { tools: [tool] };
  const current = { tools: [tool], _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'ask-okf', version: '0.6.0' } }, ttlMs: 0, cacheScope: 'private' };
  const v2 = validateToolDiscovery(current, expected, 'v2', '0.6.0');
  compareToolDiscovery(v2, validateToolDiscovery(legacy, expected, 'v1', '0.6.0'));
  for (const mutate of [
    (x: any) => x.tools[0].inputSchema.additionalProperties = true,
    (x: any) => x.tools[0].outputSchema.properties.evidence_status.const = 'sufficient',
    (x: any) => x.tools[0].annotations.readOnlyHint = false,
    (x: any) => x.tools[0]._meta['okf/untrustedContent'] = false,
    (x: any) => x.tools[0]._meta.securitySchemes = [{ type: 'oauth2' }],
    (x: any) => x.tools[0]._meta.extra = 'unexpected',
    (x: any) => x.tools.push(x.tools[0])
  ]) { const changed = structuredClone(legacy); mutate(changed); assert.throws(() => validateToolDiscovery(changed, expected, 'v1', '0.6.0')); }
  for (const mutate of [(x: any) => x.ttlMs = 10, (x: any) => x.cacheScope = 'public',
    (x: any) => x._meta['io.modelcontextprotocol/serverInfo'].version = 'wrong', (x: any) => x.extra = true,
    (x: any) => delete x._meta]) {
    const changed = structuredClone(current); mutate(changed); assert.throws(() => validateToolDiscovery(changed, expected, 'v2', '0.6.0'), /envelope/);
  }
  assert.throws(() => validateToolDiscovery(current, expected, 'v1', '0.6.0'), /envelope/);
  // No projection of tool rows: even a description-only difference is rejected across SDKs.
  const changed = structuredClone(legacy); changed.tools[0].description = 'Different conditions.';
  assert.throws(() => compareToolDiscovery(v2, validateToolDiscovery(changed, expected, 'v1', '0.6.0')), /Complete SDK tool rows/);
});

test('discovery failure diagnostics retain only digests and counts, never server text or metadata values', () => {
  const diagnostic = discoveryDiagnostic({ tools: [{ name: 'untrusted-private-name', description: 'untrusted-private-body' }], _meta: { credential: 'untrusted-private-token' } });
  assert.deepEqual(Object.keys(diagnostic).sort(), ['envelope_sha256', 'result_sha256', 'tool_count', 'tools_sha256']);
  assert.equal(diagnostic.tool_count, 1);
  assert.ok(!JSON.stringify(diagnostic).includes('untrusted-private'));
  for (const key of ['envelope_sha256', 'result_sha256', 'tools_sha256'] as const) assert.match(diagnostic[key]!, /^[a-f0-9]{64}$/);
});
