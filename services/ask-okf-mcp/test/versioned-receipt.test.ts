import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { boundedFile, verifiedBuild } from '../scripts/replay-observation-files.ts';
import { CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID } from '../src/engines.ts';
import { canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { APPROVED_VERSIONS } from '../src/registry.ts';

const base = new URL('../validation/candidates/versioned-replay-2026-09-21/', import.meta.url);
const sha = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
const read = async (path: string) => boundedFile(fileURLToPath(new URL(path, base)));
const json = async (path: string) => JSON.parse((await read(path)).toString());

test('current versioned candidate binds actual build, frozen engines, source pairs and original full-package hashes', async () => {
  const receipt = await json('integration/observation.json');
  const current = await verifiedBuild(fileURLToPath(new URL('../', import.meta.url)));
  assert.equal(receipt.classification, 'undeployed-local-engine-pinned-replay');
  assert.equal(receipt.network_calls, 0); assert.equal(receipt.model_calls, 0);
  assert.equal(receipt.build_receipt_sha256, sha(current.raw));
  assert.equal(receipt.build_receipt_sha256, sha(await read('integration/build-receipt.json')));
  assert.equal(receipt.worker_sha256, current.value.outputs['dist/server/index.js']);
  assert.equal(receipt.runner_sha256, sha(await boundedFile(fileURLToPath(new URL('../scripts/verify-versioned-replay.ts', import.meta.url)))));
  for (const [path, ref] of Object.entries(receipt.retained) as [string, any][]) {
    assert.match(path, /^[a-zA-Z0-9_.-]+$/); const raw = await read('integration/' + path);
    assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
  }
  assert.equal(receipt.cases.length, 8);
  assert.deepEqual(receipt.cases.map((row: any) => row.source_version), APPROVED_VERSIONS.flatMap(version => [version, version]));
  assert.deepEqual(receipt.cases.map((row: any) => row.engine_id), APPROVED_VERSIONS.flatMap(() => [CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID]));
  const oldRaw = await boundedFile(fileURLToPath(new URL('../validation/approved-versions-0.5.0.json', import.meta.url)));
  assert.equal(sha(oldRaw), receipt.original_receipt_sha256);
  const original = JSON.parse(oldRaw.toString());
  for (let index = 0; index < receipt.cases.length; index++) {
    const row = receipt.cases[index];
    assert.match(row.retained_package, /^context-[0-3]-(current|previous)\.json\.gz$/);
    const raw = gunzipSync(await read('integration/' + row.retained_package), { maxOutputLength: 524288 });
    assert.equal(raw.length, row.package_bytes); assert.equal(sha(raw), row.package_sha256);
    const context = JSON.parse(raw.toString()); assert.equal(canonicalJson(context), raw.toString());
    assert.equal(context.context_id, row.context_id); assert.equal(context.selected.length, row.records);
    assert.equal(context.relationships.length, row.relationships); assert.equal(context.evidence_status, row.evidence_status);
    assert.equal(row.exact_package_reconstruction, true); assert.equal(row.sdk_current, true); assert.equal(row.sdk_legacy, true);
    if (row.engine_id === PREVIOUS_ENGINE_ID) {
      assert.equal(row.package_sha256, original.compact_delivery_versions[Math.floor(index / 2)].package_canonical_sha256);
      assert.equal(row.historical_compatibility.mode, 'historical-compatible'); assert.equal(row.historical_compatibility.original_engine_id, null);
    }
  }
  assert.notEqual(receipt.cases[0].context_id, receipt.cases[1].context_id);
});

test('candidate inventory binds measured sizes, documentation and every retained observation', async () => {
  const manifest = await json('artifact-manifest.json');
  assert.equal(manifest.classification, 'undeployed-engine-pinned-replay');
  for (const [path, ref] of Object.entries(manifest.files) as [string, any][]) {
    assert.match(path, /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/);
    assert.ok(!path.split('/').some(part => part === '.' || part === '..'));
    const raw = await read(path); assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
  }
  const sizes = await json('build-sizes.json');
  const current = await verifiedBuild(fileURLToPath(new URL('../', import.meta.url)));
  const previous = JSON.parse((await boundedFile(fileURLToPath(new URL('../validation/candidates/required-evidence-2026-09-21/build-receipt.json', import.meta.url)))).toString());
  for (const path of ['dist/server/index.js', 'dist/node.mjs']) {
    assert.equal(sizes.outputs[path].candidate.sha256, current.value.outputs[path]);
    assert.equal(sizes.outputs[path].previous.sha256, previous.outputs[path]);
  }
});

test('current local Chrome observation and preserved development attempts retain exact artefacts', async () => {
  const observation = await json('browser/observation.json');
  const current = await verifiedBuild(fileURLToPath(new URL('../', import.meta.url)));
  assert.equal(observation.classification, 'local-chrome-actual-adapter');
  assert.equal(observation.build_receipt_sha256, sha(current.raw));
  assert.equal(observation.runner_sha256, sha(await boundedFile(fileURLToPath(new URL('../scripts/verify-versioned-review.ts', import.meta.url)))));
  assert.equal(observation.public_service_calls, 0); assert.equal(observation.corpus_network_calls, 0); assert.equal(observation.model_calls, 0);
  assert.deepEqual(observation.errors, []);
  for (const [path, ref] of Object.entries(observation.artifacts) as [string, any][]) {
    assert.match(path, /^[a-zA-Z0-9_.-]+$/); const raw = await read('browser/' + path);
    assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
  }
  for (const name of ['browser-attempt01', 'browser-attempt02', 'browser-attempt03', 'integration-attempt01']) {
    const classification = await json(`history/${name}/classification.json`);
    assert.equal(classification.retrospective, true);
    for (const [path, ref] of Object.entries(classification.files) as [string, any][]) {
      assert.match(path, /^[a-zA-Z0-9_.-]+$/); const raw = await read(`history/${name}/${path}`);
      assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
    }
  }
});
