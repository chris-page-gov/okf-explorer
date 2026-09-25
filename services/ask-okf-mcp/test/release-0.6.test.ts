import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { boundedFile, canonical, sha, PUBLIC_QUESTION, PUBLIC_UNKNOWN_QUESTION, approvedPairs } from '../scripts/verify-versioned-remote.ts';
import { APPROVED_VERSIONS, PRIOR_BUNDLE_VERSION, HOUSEHOLD_BUNDLE_VERSION, PRIOR_APPROVED_BUNDLE, HOUSEHOLD_APPROVED_BUNDLE } from '../src/registry.ts';
import { PRIOR_ENGINE_ID, PREVIOUS_ENGINE_ID, ENGINES } from '../src/engines.ts';
import { approvedLoader, callTool } from '../scripts/verify-approved-versions.ts';
import { createAskService } from '../src/service.ts';
const root = new URL('../', import.meta.url);
const read = (path: string) => boundedFile(fileURLToPath(new URL(path, root)));
const json = async (path: string) => JSON.parse((await read(path)).toString());
const candidate = 'validation/candidates/release-0.6.0-2026-09-21/integration-02/';

test('0.6 pins final combined bytes, retains all four old sources and rejects the older engine for its new source', async () => {
  assert.equal(PRIOR_BUNDLE_VERSION, '723bcc5b015ab38a026625c2148edbd784edf7c7');
  assert.equal(HOUSEHOLD_BUNDLE_VERSION, '3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84');
  assert.equal(APPROVED_VERSIONS.length, 6); assert.equal(approvedPairs(APPROVED_VERSIONS, ENGINES).length, 10);
  assert.equal(PRIOR_APPROVED_BUNDLE.index_sha256, 'be9fb7be5d942a74a550812e3ca858b4fbbca81f8afaf8d14b5f731eca08212a');
  assert.equal(PRIOR_APPROVED_BUNDLE.snapshot, 'dwp-combined-context-574558533a74278179f3');
  assert.equal(sha(await read('vendor/okf-dwp-household-corpus-manifest.json')), HOUSEHOLD_APPROVED_BUNDLE.index_sha256);
  assert.equal(HOUSEHOLD_APPROVED_BUNDLE.index_sha256, '06362458d013322b565e13884066fd896b68986df8be93c09a02979eab8f199b');
  const loader = await approvedLoader(); let fetched = 0;
  const service = createAskService({ loadContext: loader.loadApprovedSource, fetchCorpus: async () => { fetched++; throw new Error('Excluded engine must not retrieve'); } });
  try {
    const result = await callTool(service, 'ask_okf_manifest', { bundle: 'okf-dwp', version: PRIOR_BUNDLE_VERSION, engine_id: PREVIOUS_ENGINE_ID, question: PUBLIC_QUESTION });
    assert.deepEqual(result, { isError: true, content: [{ type: 'text', text: 'The engine is unknown or is not approved for this source version.' }] });
    assert.equal(fetched, 0);
  } finally { await service.close(); await loader.close(); }
});

test('preserved 0.6.0 local release receipt binds its archived build, runner and ten whole packages', async () => {
  const receipt = await json(candidate + 'observation.json');
  const buildRaw = await read(candidate + 'build-receipt.json');
  assert.equal(JSON.parse(buildRaw.toString()).service_version, '0.6.0');
  assert.equal(receipt.classification, 'undeployed-local-release-0.6.0'); assert.equal(receipt.service_version, '0.6.0');
  assert.equal(receipt.network_calls, 0); assert.equal(receipt.model_calls, 0);
  assert.equal(receipt.build_receipt_sha256, sha(buildRaw));
  assert.equal(sha(buildRaw), 'fdeff2abf124ea685b9d0d4af2c5cd50c7b82c4c1c0e0aa6a95ea2c7eb1b46ad');
  assert.equal(receipt.worker_sha256, JSON.parse(buildRaw.toString()).outputs['dist/server/index.js']);
  assert.equal(receipt.runner_sha256, sha(await read(candidate + 'executed-runner.ts')));
  assert.equal(receipt.cases.length, 10);
  assert.equal(new Set(receipt.cases.map((row: any) => row.source_version + ':' + row.engine_id)).size, 9);
  assert.equal(Object.keys(receipt.files).length, 74); assert.equal(receipt.source_bytes, 23768700);
  assert.ok(receipt.source_bytes <= receipt.source_byte_limit);
  for (const [path, ref] of Object.entries(receipt.retained) as [string, any][]) {
    assert.match(path, /^[a-zA-Z0-9_.-]+$/); const raw = await read(candidate + path);
    assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
  }
  const original = await json('validation/approved-versions-0.5.0.json');
  assert.equal(receipt.original_receipt_sha256, sha(await read('validation/approved-versions-0.5.0.json')));
  for (const row of receipt.cases) {
    assert.match(row.retained_package, /^context-[0-5]-(current|previous)\.json\.gz$/);
    const raw = gunzipSync(await read(candidate + row.retained_package), { maxOutputLength: 524288 });
    assert.equal(raw.length, row.package_bytes); assert.equal(sha(raw), row.package_sha256);
    const context = JSON.parse(raw.toString()); assert.equal(canonical(context), raw.toString());
    assert.equal(sha(context.question), row.question_sha256); assert.equal(context.context_id, row.context_id);
    assert.equal(context.selected.length, row.records); assert.equal(context.relationships.length, row.relationships);
    assert.equal(row.exact_package_reconstruction, true); assert.equal(row.sdk_current, true); assert.equal(row.sdk_legacy, true);
    if (row.engine_id === PREVIOUS_ENGINE_ID) {
      const old = original.compact_delivery_versions.find((item: any) => item.bundle_version === row.source_version);
      assert.equal(row.package_sha256, old.package_canonical_sha256);
      assert.equal(row.historical_compatibility.original_engine_id, null);
    }
  }
  for (const [index, question] of [PUBLIC_QUESTION, PUBLIC_UNKNOWN_QUESTION].entries()) {
    const row = receipt.cases[index]; assert.equal(row.engine_id, PRIOR_ENGINE_ID); assert.equal(row.source_version, PRIOR_BUNDLE_VERSION);
    assert.equal(row.question_sha256, sha(question)); assert.equal(row.context_budget.max_bytes, 524288);
    assert.equal(row.evidence_status, 'insufficient');
  }
  assert.equal(receipt.cases[1].records, 0); assert.equal(receipt.cases[1].relationships, 0);
});

test('historical outer candidate inventory binds all 34 preserved artefacts with a bounded census', async () => {
  const base = 'validation/candidates/release-0.6.0-2026-09-21/';
  const manifest = await json(base + 'artifact-manifest.json');
  assert.equal(manifest.schema, 'okf-release-candidate-artifacts.v1');
  assert.equal(manifest.classification, 'undeployed-local-release-0.6.0');
  const entries = Object.entries(manifest.files) as [string, { bytes: number; sha256: string }][];
  assert.equal(entries.length, 34); let total = 0;
  const groups: Record<string, number> = { root: 0, integration: 0, 'integration-02': 0 };
  for (const [path, ref] of entries) {
    assert.match(path, /^(?:README\.md|build-sizes\.json|integration(?:-02)?\/[a-zA-Z0-9_.-]+)$/);
    assert.ok(Number.isSafeInteger(ref.bytes) && ref.bytes >= 0 && ref.bytes <= 8 * 1024 * 1024);
    total += ref.bytes; assert.ok(total <= 16 * 1024 * 1024, 'Candidate artefact bytes exceed their bound');
    assert.match(ref.sha256, /^[a-f0-9]{64}$/);
    const raw = await boundedFile(fileURLToPath(new URL(base + path, root)), ref.bytes);
    assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
    groups[path.includes('/') ? path.split('/')[0] : 'root']++;
  }
  assert.deepEqual(groups, { root: 2, integration: 16, 'integration-02': 16 });
  const first = await json(base + 'integration/observation.json');
  const current = await json(base + 'integration-02/observation.json');
  assert.deepEqual(first.cases, current.cases, 'The guardrail rerun preserves every complete package');
  const sizes = await json(base + 'build-sizes.json'), build = await json(candidate + 'build-receipt.json');
  for (const path of ['dist/server/index.js', 'dist/node.mjs']) assert.equal(sizes.outputs[path].candidate.sha256, build.outputs[path]);
});
