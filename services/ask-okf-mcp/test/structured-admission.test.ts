import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
// @ts-ignore -- Shared pure Node build-admission helper.
import { validateEngineManifest, verifyEngineModule, STRUCTURED_ENGINE_FILES } from '../scripts/engine-admission.mjs';
import { corpusAssetReferences } from '../src/corpusAssets.ts';
import { createCorpusFetcher } from '../src/corpusFetch.ts';
import { createReplayFetcher, resolveReplay, ReplayError } from '../src/replay.ts';
import { CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID, type EngineAdapter } from '../src/engines.ts';
import { verifyBundledContext, LEGACY_BUNDLE_VERSION, type ApprovedCorpus } from '../src/registry.ts';
import { approvedPairs, canonical } from '../scripts/verify-versioned-remote.ts';
const sha = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
const commit = '1'.repeat(40);
function sign(manifest: any) { delete manifest.engine_id; return { ...manifest, engine_id: 'urn:okf:context-engine:sha256:' + sha(canonical(manifest)) }; }
function fixtureManifest() {
  return sign({ schema: 'okf-context-engine-manifest.v2', source_commit: commit,
    family: 'okf-context-assembly.v1', corpus_schemas: ['okf-context-corpus.v3'],
    files: Object.fromEntries(STRUCTURED_ENGINE_FILES.map((name: string) => [name,
      { bytes: 1, sha256: sha('x'), source_path: `apps/okf-explorer/src/lib/context/${name}` }])) });
}

test('versioned engine admission preserves old manifests and requires all five exact structured modules', async () => {
  for (const old of ['c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e', 'b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55']) {
    const base = new URL(`../vendor/engines/${old}/`, import.meta.url);
    const manifest = JSON.parse(await readFile(new URL('manifest.json', base), 'utf8'));
    const admitted = validateEngineManifest(manifest, old); assert.equal(admitted.files.length, 3);
    for (const name of admitted.files) verifyEngineModule(await readFile(new URL(name, base)), manifest.files[name]);
  }
  const manifest = fixtureManifest();
  assert.deepEqual(validateEngineManifest(manifest, commit).files, STRUCTURED_ENGINE_FILES);
  verifyEngineModule(Buffer.from('x'), manifest.files['unit.ts']);
  assert.throws(() => verifyEngineModule(Buffer.from('y'), manifest.files['unit.ts']), /digest/);
  assert.throws(() => verifyEngineModule(Buffer.from('xx'), manifest.files['unit.ts']), /byte count/);
  for (const mutate of [
    (m: any) => delete m.files['unit.ts'], (m: any) => m.files['payload.ts'] = m.files['index.ts'],
    (m: any) => m.files['unit.ts'].source_path = '../../source.ts',
    (m: any) => m.files['unit.ts'].bytes = 1024 * 1024 + 1,
    (m: any) => m.files['unit.ts'].fetch_url = 'https://example.invalid/module',
    (m: any) => m.corpus_schemas.push('okf-context-corpus.v1'), (m: any) => m.source_commit = 'main',
    (m: any) => m.schema = 'okf-context-engine-manifest.v1', (m: any) => m.execute = 'untrusted instructions'
  ]) { const changed = structuredClone(manifest); mutate(changed); assert.throws(() => validateEngineManifest(sign(changed), commit)); }
  const changed = structuredClone(manifest); changed.files['index.ts'].sha256 = '0'.repeat(64);
  assert.throws(() => validateEngineManifest(changed, commit), /identity mismatch/);
});

async function assetFixture() {
  const bytes = Buffer.from('{"synthetic":true}'); const ref = (path: string) => ({ path, bytes: bytes.length, sha256: sha(bytes) });
  return { bytes, source: { binding: { index_url: 'https://example.invalid/frozen/manifest.json', index_sha256: '0'.repeat(64) },
    manifest: { schema: 'okf-context-corpus.v3', base_index: ref('base.json'), records: { shards: [ref('record.json')] },
      search: { shards: { '00': ref('search.json') } }, discovery: { shards: [ref('card.json')] },
      relationships: { shards: { '00': ref('adjacency.json') } }, extensions: { arbitrary: ref('instructions.json') } } } as unknown as ApprovedCorpus };
}
test('both bounded fetchers admit hash-bound v3 navigation assets but ignore inert extensions', async () => {
  const { source, bytes } = await assetFixture();
  assert.deepEqual(corpusAssetReferences(source.manifest).map(ref => ref.path), ['base.json', 'record.json', 'search.json', 'card.json', 'adjacency.json']);
  for (const replay of [false, true]) {
    let calls = 0;
    const upstream: typeof fetch = async (_url, init) => { calls++; assert.equal(init?.credentials, 'omit');
      assert.equal(new Headers(init?.headers).has('Authorization'), false); return new Response(bytes); };
    const request = replay ? createReplayFetcher(source, upstream) : null;
    const fetcher = request?.fetcher ?? createCorpusFetcher(source, upstream);
    try {
      for (const path of ['card.json', 'adjacency.json']) assert.equal(await (await fetcher('https://example.invalid/frozen/' + path)).text(), bytes.toString());
      for (const path of ['instructions.json', '../private', 'card.json?other=1']) await assert.rejects(fetcher('https://example.invalid/frozen/' + path), /not approved/);
      await assert.rejects(fetcher('https://elsewhere.invalid/frozen/card.json'), /not approved/); assert.equal(calls, 2);
    } finally { request?.close(); }
    const corrupt = replay ? createReplayFetcher(source, async () => new Response('changed')) : null;
    try { await assert.rejects((corrupt?.fetcher ?? createCorpusFetcher(source, async () => new Response('changed')))('https://example.invalid/frozen/card.json'), /integrity/); }
    finally { corrupt?.close(); }
  }
});

test('three catalogue entries do not widen the two compatible historical replay attempts', async () => {
  const source = await verifyBundledContext(await readFile(new URL('../vendor/okf-dwp-assembly-index.json', import.meta.url), 'utf8'),
    await readFile(new URL('../vendor/okf-dwp-descriptor.json', import.meta.url), 'utf8'));
  const noFetch: typeof fetch = async () => { throw new Error('No network'); };
  const input = { version: LEGACY_BUNDLE_VERSION, question: 'imprisonment' };
  const initial = await resolveReplay(source, input, noFetch); let calls = 0;
  const adapter = (id: string, versions: string[]): EngineAdapter => ({ engine_id: id, source_commit: commit,
    source_versions: versions, assemble: async () => { calls++; return initial.context; } });
  const catalogue = [adapter(CURRENT_ENGINE_ID, [input.version]), adapter(PREVIOUS_ENGINE_ID, [input.version]), adapter('new-structured', ['2'.repeat(40)])];
  const result = await resolveReplay(source, { ...input, context_id: initial.context.context_id }, noFetch, catalogue);
  assert.equal(calls, 2); assert.deepEqual(result.identity.matching_engine_ids, [CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID]);
  assert.equal(approvedPairs([input.version, '2'.repeat(40)], catalogue).length, 3); calls = 0;
  const tooMany = catalogue.map(row => ({ ...row, source_versions: [input.version] }));
  await assert.rejects(resolveReplay(source, { ...input, context_id: initial.context.context_id }, noFetch, tooMany), error => error instanceof ReplayError && error.code === 'replay_budget');
  assert.equal(calls, 0); assert.throws(() => approvedPairs([input.version], tooMany), /attempt cap/);
  await assert.rejects(resolveReplay(source, input, noFetch, [...catalogue, adapter('fourth', ['3'.repeat(40)])]), /engine_unavailable/); assert.equal(calls, 0);
});

import { prepareStructuredCandidate } from '../scripts/prepare-structured-release.ts';
function stagingFixture() {
  const sourceCommit = '2'.repeat(40), engineCommit = '3'.repeat(40), probe = 'evaluation/manual-structure/context-probe/';
  const entries = new Map<string, Buffer>();
  const put = (repository: string, path: string, value: unknown) => { const raw = Buffer.from(JSON.stringify(value)); entries.set(repository + ':' + path, raw); return raw; };
  const ref = (path: string) => ({ path, bytes: 1, sha256: sha('x') });
  const buckets = (prefix: string) => Object.fromEntries(Array.from({ length: 256 }, (_, i) => {
    const key = i.toString(16).padStart(2, '0'); return [key, ref(prefix + '/' + key + '.json')];
  }));
  const manifest = { schema: 'okf-context-corpus.v3',
    bundle: { id: 'urn:synthetic:staging', snapshot: 'synthetic-source', source_url: 'https://example.invalid/' },
    scope: 'Synthetic manifest admission only', limitations: ['No legal content'], semantic_source_snapshot: 'synthetic-semantic',
    base_index: ref('base.json'), counts: { documents: 1, pages: 1, nonempty_pages: 1, empty_pages: 0, tokenless_pages: 0 },
    records: { count: 1, shards: [{ ...ref('record.json'), first_ordinal: 0, count: 1, first_id: 'urn:synthetic:unit', last_id: 'urn:synthetic:unit' }] },
    search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1', shards: buckets('search'),
      ranking: { schema: 'okf-bm25.v1', k1: 1.2, b: 0.75, score_scale: 1000000, fields: ['source', 'discovery'] }, total_tokens: { source: 1, discovery: 1 } },
    discovery: { count: 1, shards: [{ ...ref('card.json'), first_ordinal: 0, count: 1 }] },
    relationships: { schema: 'okf-context-adjacency.v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1', shards: buckets('relationships') } };
  const raw = put('source', 'structured-context/manifest.json', manifest);
  const casesRaw = put('source', 'evaluation/cases.json', { cases: [{ id: 'case-a', question: 'Synthetic question' }] });
  const protocol = { denominator: 1, stages: ['stage'], budgets: [32768], cases: { path: 'evaluation/cases.json', bytes: casesRaw.length, sha256: sha(casesRaw) }, source_bindings: [{ path: 'structured-context/manifest.json', bytes: raw.length, sha256: sha(raw) }] };
  const engine = { schema: 'okf-context-engine-admission.v1', commit: engineCommit,
    files: Object.fromEntries(STRUCTURED_ENGINE_FILES.map((name: string) => [name, sha('synthetic inert module ' + name)])) };
  const engineRaw = put('source', probe + 'engine.json', engine), protocolRaw = put('source', probe + 'protocol.json', protocol);
  const reportPath = probe + 'runs/synthetic-trial/report.json';
  const report = { schema: 'okf-dwp-structured-context-evaluation.v1', engine, protocol, network_calls: 0, model_calls: 0,
    inputs: [['structured-context/manifest.json', raw], [probe + 'engine.json', engineRaw], [probe + 'protocol.json', protocolRaw], ['evaluation/cases.json', casesRaw]].map(([path, bytes]: any) => ({ path, bytes: bytes.length, sha256: sha(bytes) })),
    rows: ['case-a', 'unknown-control'].map(case_id => ({ case_id, question: case_id === 'case-a' ? 'Synthetic question' : 'Unknown fixture', stage: 'stage', max_bytes: 32768,
      evidence_records: 0, evidence_status: 'insufficient', context_id: 'urn:sha256:' + '0'.repeat(64), sha256: sha('synthetic'), bytes: 100, archive: case_id + '.json.gz' })) };
  const reportRaw = put('source', reportPath, report);
  put('source', probe + 'current.json', { schema: 'okf-dwp-context-probe-current.v1', status: 'accepted-with-recorded-limitations', attempt: 'synthetic-trial', report: { path: reportPath, bytes: reportRaw.length, sha256: sha(reportRaw) } });
  for (const name of STRUCTURED_ENGINE_FILES) entries.set('engine:apps/okf-explorer/src/lib/context/' + name, Buffer.from('synthetic inert module ' + name));
  return { sourceCommit, engineCommit, entries, put, read: (repository: string, requestedCommit: string, path: string) => {
    assert.equal(requestedCommit, repository === 'source' ? sourceCommit : engineCommit); const bytes = entries.get(repository + ':' + path); assert.ok(bytes, path); return bytes;
  } };
}
test('immutable staging requires an accepted source-bound trial and never updates the active registry', () => {
  const fixture = stagingFixture(); const candidate = prepareStructuredCandidate(fixture.sourceCommit, fixture.engineCommit, fixture.read);
  assert.equal(candidate.outputs.size, 8); assert.equal(candidate.release.selection, 'explicit-only');
  assert.equal(candidate.release.version, fixture.sourceCommit); assert.equal(candidate.release.engine_commit, fixture.engineCommit);
  assert.ok([...candidate.outputs.keys()].every(path => path.startsWith('engines/') || path.startsWith('okf-dwp-structured-')));
  assert.deepEqual(candidate.outputs.get('okf-dwp-structured-corpus-manifest.json'), fixture.entries.get('source:structured-context/manifest.json'));
  const probe = 'evaluation/manual-structure/context-probe/';
  for (const [path, mutate] of [
    [probe + 'current.json', (value: any) => value.status = 'pending'],
    [probe + 'current.json', (value: any) => value.attempt = '../other'],
    [probe + 'engine.json', (value: any) => value.commit = '4'.repeat(40)],
    [probe + 'engine.json', (value: any) => delete value.files['unit.ts']],
    [probe + 'protocol.json', (value: any) => value.source_bindings[0].sha256 = '0'.repeat(64)],
    [probe + 'runs/synthetic-trial/report.json', (value: any) => value.engine.commit = '4'.repeat(40)],
    ['structured-context/manifest.json', (value: any) => value.bundle.snapshot = 'changed']
  ] as const) {
    const changed = stagingFixture(); const value = JSON.parse(changed.entries.get('source:' + path)!.toString()); mutate(value); changed.put('source', path, value);
    assert.throws(() => prepareStructuredCandidate(changed.sourceCommit, changed.engineCommit, changed.read));
  }
  // Rebind the pointer deliberately: census guards must reject independently of a stale digest.
  for (const mutate of [(r: any) => delete r.rows, (r: any) => r.rows.pop(), (r: any) => r.rows[1] = r.rows[0],
    (r: any) => r.rows[0].question = 'Different', (r: any) => r.model_calls = 1,
    (r: any) => r.inputs = r.inputs.filter((ref: any) => ref.path !== 'structured-context/manifest.json')]) {
    const f = stagingFixture(), reportPath = probe + 'runs/synthetic-trial/report.json';
    const report = JSON.parse(f.entries.get('source:' + reportPath)!.toString()); mutate(report);
    const raw = f.put('source', reportPath, report), pointer = JSON.parse(f.entries.get('source:' + probe + 'current.json')!.toString());
    pointer.report = { path: reportPath, bytes: raw.length, sha256: sha(raw) }; f.put('source', probe + 'current.json', pointer);
    assert.throws(() => prepareStructuredCandidate(f.sourceCommit, f.engineCommit, f.read));
  }
  const changed = stagingFixture(); changed.entries.set('engine:apps/okf-explorer/src/lib/context/unit.ts', Buffer.from('altered'));
  assert.throws(() => prepareStructuredCandidate(changed.sourceCommit, changed.engineCommit, changed.read), /module differs/);
  assert.throws(() => prepareStructuredCandidate('main', fixture.engineCommit, fixture.read));
});
