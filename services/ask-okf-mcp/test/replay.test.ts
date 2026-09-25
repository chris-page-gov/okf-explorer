import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canonicalJson, contextSha256 } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { CURRENT_ENGINE_ID, PRIOR_ENGINE_ID, PREVIOUS_ENGINE_ID, ENGINES, type EngineAdapter } from '../src/engines.ts';
import { resolveReplay, ReplayError, createReplayFetcher, REPLAY_LIMITS } from '../src/replay.ts';
import { verifyBundledContext, APPROVED_VERSIONS, LEGACY_BUNDLE_VERSION, type ApprovedCorpus } from '../src/registry.ts';
import { reviewScriptResponse } from '../src/review.ts';
import { readContextEvidence } from '../../../apps/okf-explorer/src/lib/context/delivery.ts';
import { bindEvidenceRead } from '../src/replayDelivery.ts';
import { createAskService } from '../src/service.ts';
import { callTool } from '../scripts/verify-approved-versions.ts';

const source = await verifyBundledContext(await readFile(new URL('../vendor/okf-dwp-assembly-index.json', import.meta.url), 'utf8'),
  await readFile(new URL('../vendor/okf-dwp-descriptor.json', import.meta.url), 'utf8'));
const input = { version: LEGACY_BUNDLE_VERSION, question: 'imprisonment' };
const noFetch: typeof fetch = async () => { throw new Error('Direct profile must not fetch'); };
const initial = await resolveReplay(source, input, noFetch);
const expected = initial.context;
const code = (value: string) => (error: unknown) => error instanceof ReplayError && error.code === value;
const fake = (engine_id: string, assemble: EngineAdapter['assemble']): EngineAdapter => ({ engine_id,
  source_commit: '0'.repeat(40), source_versions: [LEGACY_BUNDLE_VERSION], assemble });

test('review page default engines match replay selection for every approved source', async () => {
  const script = await reviewScriptResponse().text();
  const config = script.match(/\)\((\{"versions":.+\})\);$/s);
  assert.ok(config, 'Review script embeds its approved engine configuration');
  const defaultEngines = JSON.parse(config[1]).defaultEngines as Record<string, string>;
  assert.deepEqual(Object.keys(defaultEngines), APPROVED_VERSIONS);
  const adapters = ENGINES.map(engine => ({ ...engine, assemble: async () => expected }));
  for (const version of APPROVED_VERSIONS) {
    const replay = await resolveReplay(source, { ...input, version }, noFetch, adapters);
    assert.equal(defaultEngines[version], replay.identity.engine_id, version);
  }
});

test('frozen adapters refuse the new corpus family before reading any files', () => {
  const value = { manifest: { schema: 'okf-context-corpus.v2' }, binding: source.binding } as ApprovedCorpus;
  for (const adapter of ENGINES) assert.throws(() => adapter.assemble(value, 'question', {}, noFetch), /Frozen engines|Evidence Connect requires/);
});

test('new and explicit assemblies disclose exact engines without altering package bytes or family', async () => {
  assert.equal(initial.identity.engine_id, PRIOR_ENGINE_ID);
  assert.equal(initial.identity.mode, 'current-default');
  assert.equal(initial.context.engine, 'okf-context-assembly.v1');
  assert.equal(initial.identity.package_sha256, await contextSha256(canonicalJson(expected)));
  const explicit = await resolveReplay(source, { ...input, context_id: expected.context_id, engine_id: PREVIOUS_ENGINE_ID }, noFetch);
  assert.equal(explicit.identity.mode, 'explicit-engine');
  assert.equal(explicit.identity.original_engine_id, PREVIOUS_ENGINE_ID);
  assert.equal(canonicalJson(explicit.context), canonicalJson(expected));
});

test('unknown and source-incompatible engines fail before invoking any assembler', async () => {
  let calls = 0;
  const adapters = [fake(CURRENT_ENGINE_ID, async () => { calls++; return expected; })];
  await assert.rejects(resolveReplay(source, { ...input, engine_id: 'https://evil.test/code.js' }, noFetch, adapters), code('engine_unavailable'));
  await assert.rejects(resolveReplay(source, { ...input, version: 'f'.repeat(40), engine_id: CURRENT_ENGINE_ID }, noFetch, adapters), code('engine_unavailable'));
  assert.equal(calls, 0);
});

test('unspecified historical origin remains unknown; both byte-identical matches are disclosed in sequential order', async () => {
  const order: string[] = []; let active = 0;
  const adapters = [CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID].map(id => fake(id, async () => {
    assert.equal(active++, 0); order.push(id); await Promise.resolve(); active--; return structuredClone(expected);
  }));
  const result = await resolveReplay(source, { ...input, context_id: expected.context_id }, noFetch, adapters);
  assert.deepEqual(order, [CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID]);
  assert.deepEqual(result.identity.matching_engine_ids, order);
  assert.equal(result.identity.original_engine_id, null); assert.equal(result.identity.mode, 'historical-compatible');
  assert.equal(canonicalJson(result.context), canonicalJson(expected));
});

test('same context ID with different complete bytes is ambiguous; no match is historical-unavailable', async () => {
  const differing = structuredClone(expected); differing.budget.used_bytes++;
  const adapters = [fake(CURRENT_ENGINE_ID, async () => expected), fake(PREVIOUS_ENGINE_ID, async () => differing)];
  await assert.rejects(resolveReplay(source, { ...input, context_id: expected.context_id }, noFetch, adapters), code('historical_ambiguous'));
  await assert.rejects(resolveReplay(source, { ...input, context_id: 'urn:sha256:' + '0'.repeat(64) }, noFetch, adapters), code('historical_unavailable'));
  await assert.rejects(resolveReplay(source, { ...input, engine_id: CURRENT_ENGINE_ID, context_id: 'urn:sha256:' + '0'.repeat(64) }, noFetch, adapters), code('context_mismatch'));
});

test('at most two unique static adapters; source errors never trigger fallback evidence', async () => {
  let calls = 0;
  const adapter = fake(CURRENT_ENGINE_ID, async () => { calls++; throw new Error('integrity'); });
  await assert.rejects(resolveReplay(source, { ...input, context_id: expected.context_id }, noFetch, [adapter, adapter]), code('engine_unavailable'));
  await assert.rejects(resolveReplay(source, input, noFetch, [...ENGINES, adapter]), code('engine_unavailable'));
  assert.equal(calls, 0);
  await assert.rejects(resolveReplay(source, { ...input, context_id: expected.context_id }, noFetch,
    [adapter, fake(PREVIOUS_ENGINE_ID, async () => { calls++; return expected; })]), /integrity/);
  assert.equal(calls, 1);
});

test('shared deadline rejects a completed direct or corpus assembly even without another fetch', async () => {
  for (const value of [source, await corpus(new TextEncoder().encode('{}'))]) {
    let now = 0; let calls = 0;
    const adapters = [CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID].map(id => fake(id, async () => {
      calls++; now = REPLAY_LIMITS.timeout_ms; return expected;
    }));
    await assert.rejects(resolveReplay(value, { ...input, context_id: expected.context_id }, noFetch, adapters, () => now), code('replay_budget'));
    assert.equal(calls, 1, 'No second assembler after the shared deadline');
  }
});

function corpus(bytes: Uint8Array, decoded = bytes.length): Promise<ApprovedCorpus> {
  return crypto.subtle.digest('SHA-256', bytes as BufferSource).then(hash => ({ binding: { index_url: 'https://example.test/manifest.json', index_sha256: '0'.repeat(64) },
    manifest: { base_index: { path: 'base.json', bytes: bytes.length, decoded_bytes: decoded,
      sha256: Buffer.from(hash).toString('hex') }, records: { shards: [] }, search: { shards: {} } } as any }));
}
test('shared request cache verifies once, counts each decode, and rejects altered bytes and unapproved URLs', async () => {
  const bytes = new TextEncoder().encode('{}'); let calls = 0;
  const source = await corpus(bytes, 12 * 1024 * 1024);
  const request = createReplayFetcher(source, async () => { calls++; return new Response(bytes); });
  try {
    for (let i = 0; i < 2; i++) assert.equal(await (await request.fetcher('https://example.test/base.json')).text(), '{}');
    assert.equal(calls, 1); assert.equal(request.usage.fetched_bytes, 2); assert.equal(request.usage.decoded_bytes, 24 * 1024 * 1024);
    await assert.rejects(request.fetcher('https://example.test/base.json'), code('replay_budget'));
    await assert.rejects(request.fetcher('https://example.test/private'), /not approved/);
  } finally { request.close(); }
  const bad = createReplayFetcher(await corpus(bytes), async () => new Response('[]'));
  try { await assert.rejects(bad.fetcher('https://example.test/base.json'), /integrity/); } finally { bad.close(); }
});
test('request file and transfer ceilings do not reset for the second engine; reservations precede I/O', async () => {
  const bytes = new TextEncoder().encode('{}'); let calls = 0;
  const source = await corpus(bytes);
  const request = createReplayFetcher(source, async () => { calls++; return new Response(bytes); });
  try {
    for (let i = 0; i < REPLAY_LIMITS.files; i++) await request.fetcher('https://example.test/base.json');
    await assert.rejects(request.fetcher('https://example.test/base.json'), code('replay_budget')); assert.equal(calls, 1);
  } finally { request.close(); }
  source.manifest.base_index.bytes = REPLAY_LIMITS.fetched_bytes + 1;
  const tooLarge = createReplayFetcher(source, async () => { calls++; throw new Error('must not fetch'); });
  try { await assert.rejects(tooLarge.fetcher('https://example.test/base.json'), code('replay_budget')); assert.equal(calls, 1); } finally { tooLarge.close(); }
});

test('minimum-sized reads account for replay envelope and concatenate exactly, with Unicode intact', async () => {
  const context = structuredClone(expected); context.selected[0].record.text = ('😀 quote " \\ line\n').repeat(2000);
  const parts: string[] = []; let offset = 0;
  do {
    const part = await readContextEvidence(context, { context_id: context.context_id, section: 'record_text', record_id: context.selected[0].record.id, offset, max_bytes: 8192 });
    const result = bindEvidenceRead(part, initial.identity, 8192);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 8192);
    assert.equal(result.delivery.used_bytes, Buffer.byteLength(JSON.stringify(result)));
    assert.equal(result.content_sha256, await contextSha256(context.selected[0].record.text));
    assert.ok(!/[\uD800-\uDBFF]$/.test(result.data)); parts.push(result.data); offset = result.next_offset ?? -1;
  } while (offset !== -1);
  assert.equal(parts.join(''), context.selected[0].record.text);
});

test('all three tools enforce explicit expected IDs; continuations and resource recipes retain engine identity', async () => {
  const service = createAskService({ loadContext: async () => source });
  const ask = { bundle: 'okf-dwp', ...input, engine_id: PREVIOUS_ENGINE_ID, context_id: expected.context_id };
  try {
    const first = (await callTool(service, 'ask_okf_manifest', ask)).structuredContent;
    assert.equal(first.replay.engine_id, PREVIOUS_ENGINE_ID);
    const recipe = JSON.parse(Buffer.from(new URL(first.review_url).hash.slice(1), 'base64url').toString());
    assert.equal(recipe.engine_id, PREVIOUS_ENGINE_ID);
    const part = await callTool(service, 'read_okf_evidence', { ...recipe, section: 'package', delivery_bytes: 8192 });
    assert.equal(part.isError, undefined); assert.equal(part.structuredContent.replay_identity.engine_id, PREVIOUS_ENGINE_ID);
    for (const name of ['ask_okf', 'ask_okf_manifest', 'read_okf_evidence']) {
      const result = await callTool(service, name, { ...ask, context_id: 'urn:sha256:' + '0'.repeat(64), ...(name === 'read_okf_evidence' ? { section: 'package' } : {}) });
      assert.equal(result.isError, true); assert.equal(result.structuredContent, undefined); assert.match(result.content[0].text, /pinned engine/);
    }
    const old = await callTool(service, 'ask_okf_manifest', { ...ask, engine_id: undefined, context_id: 'urn:sha256:' + '0'.repeat(64) });
    assert.equal(old.isError, true); assert.match(old.content[0].text, /Historical replay is unavailable/);
  } finally { await service.close(); }
});
