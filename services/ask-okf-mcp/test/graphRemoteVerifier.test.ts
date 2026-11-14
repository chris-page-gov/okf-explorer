import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createAskService } from '../src/service.ts';
import { GRAPH_MANIFEST_INPUT_SCHEMA, GRAPH_MANIFEST_OUTPUT_SCHEMA, GRAPH_READ_INPUT_SCHEMA,
  GRAPH_READ_OUTPUT_SCHEMA } from '../src/graphContracts.ts';
// @ts-ignore Standalone Node CLI is JavaScript and has no declaration file.
import { checkTools, createGuardedFetch, executeGraphVerification, loadPinnedGraphSuite, parseGraphVerifierArgs, sha256, verifyGraphPackage, verifyTargetSourceProofs } from '../scripts/verify-graph-remote.mjs';

const DWP_ROOT = process.env.OKF_DWP_ROOT ?? null;
const PRODUCER_COMMIT = '2e12f20cfd20e62a67197e7aade4ea612b873684';
const LOCAL_ORIGIN = 'http://127.0.0.1:41321';
if (process.env.CI === 'true' && !DWP_ROOT) throw new Error('CI requires OKF_DWP_ROOT to point to the pinned DWP checkout.');

test('verifier defaults to immutable, no-network preflight and constrains execution origins', () => {
  const args = parseGraphVerifierArgs(['--dwp-root', '/fixture/pinned-dwp', '--producer-commit', PRODUCER_COMMIT]);
  assert.equal(args.mode, 'preflight');
  assert.equal(args.origin, null);
  assert.throws(() => parseGraphVerifierArgs(['--dwp-root', '/fixture/pinned-dwp', '--execute-public', '--origin', 'https://example.org', '--output-dir', '/tmp/out']), /exact approved HTTPS origin/);
  assert.throws(() => parseGraphVerifierArgs(['--dwp-root', '/fixture/pinned-dwp', '--execute-local', '--origin', 'https://127.0.0.1', '--output-dir', '/tmp/out']), /loopback HTTP origin/);
  assert.throws(() => parseGraphVerifierArgs(['--dwp-root', '/fixture/pinned-dwp', '--execute-local', '--origin', 'http://example.org', '--output-dir', '/tmp/out']), /loopback HTTP origin/);
});

test('validates every duplicate provenance binding instead of allowing a later row to mask a bad pin', () => {
  const id = 'https://example.test/record/1';
  const text = 'Captured source passage';
  const sourceHash = 'a'.repeat(64);
  const graphRecords = new Map([[id, { id, kind: 'evidence', text, provenance: [{ source_sha256: sourceHash }] }]]);
  const good = { id, literal_sha256: sha256(Buffer.from(text)), source_sha256: sourceHash };
  assert.doesNotThrow(() => verifyTargetSourceProofs([id], [good, { ...good }], graphRecords));
  assert.throws(() => verifyTargetSourceProofs([id], [good, { ...good, literal_sha256: '0'.repeat(64) }], graphRecords), /Target literal hash differs/);
  assert.throws(() => verifyTargetSourceProofs([id], [good, { ...good, source_sha256: 'b'.repeat(64) }], graphRecords), /source file hash is not in graph provenance/);
});

test('requires discovered tool schemas to match the checked-in graph contracts exactly', () => {
  const names = ['plan_okf_evidence', 'read_okf_planned_evidence'];
  const inputs = [GRAPH_MANIFEST_INPUT_SCHEMA, GRAPH_READ_INPUT_SCHEMA];
  const outputs = [GRAPH_MANIFEST_OUTPUT_SCHEMA, GRAPH_READ_OUTPUT_SCHEMA];
  const tools: any[] = names.map((name, index) => ({ name, inputSchema: structuredClone(inputs[index]), outputSchema: structuredClone(outputs[index]),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { securitySchemes: [{ type: 'noauth' }], 'okf/untrustedContent': true } }));
  assert.doesNotThrow(() => checkTools(tools));
  const changed = structuredClone(tools);
  changed[0].inputSchema.properties.question.maxLength++;
  assert.throws(() => checkTools(changed), /input schema differs from the pinned local contract/);
});

test('stops reading overlong evidence streams at the cap plus one detection byte and blocks future calls', async () => {
  let pulls = 0, cancellations = 0, upstreamCalls = 0;
  const upstream: typeof fetch = async () => {
    upstreamCalls++;
    return new Response(new ReadableStream<Uint8Array>({
      pull(controller) { pulls++; controller.enqueue(Uint8Array.of(65)); },
      cancel() { cancellations++; },
    }), { headers: { 'content-type': 'application/json' } });
  };
  const guarded = createGuardedFetch({ origin: LOCAL_ORIGIN, upstream, pace: false });
  const request = () => new Request(LOCAL_ORIGIN + '/graph/mcp', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'plan_okf_evidence',
      arguments: { bundle: 'okf-dwp', question: 'General research question' } } }) });
  await assert.rejects(guarded.fetch(request()), /Graph HTTP verification request failed/);
  // WHATWG streams may prefetch one queued byte before the consumer cancels;
  // the verifier itself reads exactly the limit plus one detection byte.
  assert(pulls <= 8194);
  assert.equal(guarded.receipt.events[0].response_bytes, 8193);
  assert.equal(cancellations, 1);
  await assert.rejects(guarded.fetch(request()), /Verifier stopped after prior failure/);
  assert.equal(upstreamCalls, 1);
});

test('rejects declared oversized metadata before reading and rejects redirects without retry', async () => {
  let bodyReads = 0, cancellations = 0, redirectCalls = 0;
  const metadata = createGuardedFetch({ origin: LOCAL_ORIGIN, pace: false, upstream: async () => new Response(new ReadableStream<Uint8Array>({
    pull(controller) { bodyReads++; controller.enqueue(Uint8Array.of(65)); },
    cancel() { cancellations++; },
  }), { headers: { 'content-length': '65537' } }) });
  await assert.rejects(metadata.fetch(new Request(LOCAL_ORIGIN + '/health')),
    /Graph HTTP verification request failed/);
  assert.equal(bodyReads, 1); // One stream queue-fill may happen when the stub Response is created.
  assert.equal(cancellations, 1);

  const redirect = createGuardedFetch({ origin: LOCAL_ORIGIN, pace: false, upstream: async () => {
    redirectCalls++;
    return new Response('redirect', { status: 302, headers: { location: 'https://example.invalid/' } });
  } });
  await assert.rejects(redirect.fetch(new Request(LOCAL_ORIGIN + '/health')), /Graph HTTP verification request failed/);
  assert.equal(redirectCalls, 1);
  await assert.rejects(redirect.fetch(new Request(LOCAL_ORIGIN + '/health')), /Verifier stopped after prior failure/);
  assert.equal(redirectCalls, 1);
});

test('aborts a stalled response body and permanently closes the guarded transport', async () => {
  let began = () => {}, cancellations = 0, upstreamCalls = 0, sent = false, observedSignal: AbortSignal | undefined;
  const reading = new Promise<void>(resolveStarted => { began = resolveStarted; });
  const guarded = createGuardedFetch({ origin: LOCAL_ORIGIN, pace: false, upstream: async (request: Request) => {
    upstreamCalls++;
    observedSignal = request.signal;
    return new Response(new ReadableStream<Uint8Array>({
      pull(controller) { began(); if (!sent) { controller.enqueue(Uint8Array.of(65)); sent = true; } },
      cancel() { cancellations++; },
    }));
  } });
  const controller = new AbortController();
  const pending = guarded.fetch(new Request(LOCAL_ORIGIN + '/health', { signal: controller.signal }));
  await reading;
  controller.abort();
  assert.equal(observedSignal?.aborted, true);
  await assert.rejects(pending, /Graph HTTP verification request failed/);
  assert.equal(cancellations, 1);
  await assert.rejects(guarded.fetch(new Request(LOCAL_ORIGIN + '/health')), /Verifier stopped after prior failure/);
  assert.equal(upstreamCalls, 1);
});

test('loads only source-commit blobs and builds the target-bound 108-case suite', { skip: !DWP_ROOT && 'Set OKF_DWP_ROOT for pinned-source integration checks' }, async () => {
  const suite: any = await loadPinnedGraphSuite({ dwpRoot: DWP_ROOT!, producerCommit: PRODUCER_COMMIT });
  assert.equal(suite.suite.reduce((sum: number, row: any) => sum + row.case_ids.length, 0), 108);
  assert.equal(suite.suite.length, 106); // Two exact-question controls share a transport collection.
  assert.equal(suite.obligations.size, 203);
  assert.equal(suite.release.publication_status, 'pinned');
  assert.equal(suite.verifierProvenance.worker_matches_build_receipt, true);
  assert.equal(suite.verifierProvenance.worker_hash_scope, 'local dist/server/index.js only; not a remote deployment attestation');
  const provenance = suite.verifierProvenance;
  assert(['tracked-source-and-local-worker-match', 'local-uncommitted-or-incomplete-build; no pin claim']
    .includes(provenance.source_identity_status));
  if (provenance.source_identity_status === 'tracked-source-and-local-worker-match') {
    assert.equal(provenance.verifier_matches_git_head, true);
    assert.equal(provenance.package_lock_matches_git_head, true);
    assert.equal(provenance.worker_matches_build_receipt, true);
    assert.equal(provenance.package_lock_matches_build_receipt, true);
    assert.equal(provenance.verifier_matches_build_receipt, true);
    assert.equal(provenance.build_receipt_inputs_match_worktree, true);
  }
  assert(suite.suite.every((row: any) => row.package_sha256 && row.plan_id));
  assert(suite.suite.every((row: any) => !Object.keys(row).some((key: string) => /target_ids|expected_records/.test(key))));
  const boundary = suite.suite.flatMap((row: any) => row.expectations).filter((row: any) => row.negative_boundary);
  assert(boundary.length > 0);
  assert(boundary.every((row: any) => row.expected_record_ids.length === 0));
  assert(suite.suite.some((row: any) => row.groups.includes('fixed-uc')));
});

test('rejects a mismatched target text and preserves the original obligation denominator', { skip: !DWP_ROOT && 'Set OKF_DWP_ROOT for pinned-source integration checks' }, async () => {
  const suite: any = await loadPinnedGraphSuite({ dwpRoot: DWP_ROOT!, producerCommit: PRODUCER_COMMIT });
  const uc = suite.suite.find((row: any) => row.groups.includes('fixed-uc'))!;
  assert(uc);
  const targets = [...new Set(uc.expectations.flatMap((row: any) => row.expected_record_ids))];
  const target = targets[0];
  const selected = targets.map(id => {
    const record = suite.graphRecords.get(id);
    assert(record);
    return { record, paths: [{ assertions: ['x'], records: [id] }], reasons: [] };
  });
  const packageValue: any = { question: uc.question, graph_sha256: suite.release.graph_sha256,
    engine_id: suite.release.engine_id, plan_id: uc.plan_id, evidence_status: 'insufficient', ai_answer: null,
    assembly_truncated: false, retrieval_complete: uc.retrieval_complete, retrieval_status: uc.retrieval_status, selected,
    requirements: [], };
  const collection: any = { package: packageValue, summary: { package_sha256: uc.package_sha256,
    delivery_complete: true, package_complete: true, delivery: { max_response_bytes: 8192 } } };
  // Only test that a changed source cannot pass; the runtime package is exercised below.
  const sourceRecord = suite.graphRecords.get(target)!;
  assert.throws(() => verifyGraphPackage({ packageValue: { ...packageValue, selected: [{ ...packageValue.selected[0], record: { ...sourceRecord, text: sourceRecord.text + ' altered' } }, ...packageValue.selected.slice(1)] },
    collection, questionEntry: { ...uc, graph_sha256: suite.release.graph_sha256, engine_id: suite.release.engine_id },
    graphRecords: suite.graphRecords, obligationIds: suite.obligations }), /Source text hash differs/);
  const obligation = [...suite.obligations][0];
  assert.throws(() => verifyGraphPackage({ packageValue: { ...packageValue, requirements: [{ required: [obligation],
    open_obligation_ids: [], missing_record_ids: [], status: 'insufficient' }] }, collection,
    questionEntry: { ...uc, requirement_count: null, graph_sha256: suite.release.graph_sha256, engine_id: suite.release.engine_id },
    graphRecords: suite.graphRecords, obligationIds: suite.obligations }), /was not left open/);
  assert.equal(suite.obligations.size, 203);
});

test('official SDK v2 and v1 collect and verify the pinned UC package over a local service', { skip: !DWP_ROOT && 'Set OKF_DWP_ROOT for pinned-source integration checks' }, async () => {
  const suite: any = await loadPinnedGraphSuite({ dwpRoot: DWP_ROOT!, producerCommit: PRODUCER_COMMIT });
  const uc = suite.suite.find((row: any) => row.groups.includes('fixed-uc'))!;
  const temporary = await mkdtemp(resolve(tmpdir(), 'okf-graph-verifier-test-'));
  const outputDir = resolve(temporary, 'attempt');
  const service = createAskService({ loadContext: async () => { throw new Error('Legacy context is not used by graph tests'); },
    allowedHosts: ['127.0.0.1:41321'] });
  const localFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).pathname === '/health') return Response.json({ ready: true, version: '0.8.0',
      graph_sha256: suite.release.graph_sha256, graph_engine_id: suite.release.engine_id,
      graph_publication_status: 'pinned' });
    return service.fetch(request);
  };
  try {
    const result = await executeGraphVerification({ suite: { ...suite, suite: [uc] }, origin: LOCAL_ORIGIN,
      mode: 'local', outputDir, upstreamFetch: localFetch, pace: false });
    assert.equal(result.summary.status, 'passed');
    assert.equal(result.summary.run.model_calls, 0);
    assert.equal(result.summary.run.paid_api_calls, 0);
    assert(result.summary.run.http_requests > 0);
    assert.equal(result.summary.run.public_network_calls, 0);
    assert.equal(result.summary.counts.completed_unique_questions, 1);
    assert(result.summary.counts.max_evidence_http_response_bytes <= 8192);
    assert.equal(result.summary.gates.sdk_v1_v2_tool_parity, 'passed');
    assert.equal(result.summary.gates.legal_or_entitlement_sufficiency, 'not-assessed');
    const saved = JSON.parse(await readFile(resolve(outputDir, 'summary.json'), 'utf8'));
    assert.deepEqual(saved, result.summary);
    const files = await readFile(resolve(outputDir, 'wire.json'), 'utf8');
    assert(!files.includes(uc.question));
    assert(!files.includes('authorization'));
  } finally {
    await service.close();
    await rm(temporary, { recursive: true, force: true });
  }
});

