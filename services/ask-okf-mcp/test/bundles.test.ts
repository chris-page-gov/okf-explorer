import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { canonicalJson, assembleContext } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { createAskService } from '../src/service.ts';
import { APPROVED_BUNDLE, PREVIOUS_APPROVED_BUNDLE, LEGACY_APPROVED_BUNDLE, BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION } from '../src/registry.ts';
import { approvedLoader, callTool, custodyQuestion } from '../scripts/verify-approved-versions.ts';

test('retained offline integration receipt binds the executed runner, service build and three versions', async () => {
  const receipt = JSON.parse(await readFile(new URL('../validation/approved-versions-0.4.0.json', import.meta.url), 'utf8'));
  const digest = async (path: string) => createHash('sha256').update(await readFile(new URL(path, import.meta.url))).digest('hex');
  assert.equal(receipt.runner_sha256, await digest('../scripts/verify-approved-versions.ts'));
  for (const [path, expected] of Object.entries(receipt.supporting_files)) assert.equal(await digest('../' + path), expected);
  assert.equal(receipt.build_receipt_sha256, await digest('../dist/build-receipt.json'));
  assert.equal(receipt.mode, 'offline-local-corpus');
  assert.deepEqual(receipt.cases.map((row: { version: string }) => row.version), [BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION]);
  assert.ok(receipt.cases.every((row: { exact_replay: boolean; slices: number }) => row.exact_replay && row.slices > 0));
  assert.equal(receipt.cases[0].binding.index_sha256, APPROVED_BUNDLE.index_sha256);
  assert.equal(receipt.cases[1].binding.index_sha256, PREVIOUS_APPROVED_BUNDLE.index_sha256);
  assert.equal(receipt.cases[2].binding.index_sha256, LEGACY_APPROVED_BUNDLE.index_sha256);
  assert.ok(Object.keys(receipt.files).length > 0);
  assert.equal(receipt.compact_delivery.id, 'staff-child-dla-pip-compact-delivery');
  assert.equal(receipt.compact_delivery.context_budget.max_bytes, 262144);
  assert.ok(receipt.compact_delivery.selected_records > 0);
  assert.equal(receipt.compact_delivery.evidence_status, 'insufficient');
  assert.deepEqual(receipt.compact_delivery_versions.map((row: { bundle_version: string }) => row.bundle_version), [BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION]);
  assert.ok(receipt.compact_delivery_versions.every((row: { reconstructed_package_matches_direct_engine: boolean }) => row.reconstructed_package_matches_direct_engine));
});

test('actual vendored loader separates all three versions and preserves historical compact replay', async () => {
  const loader = await approvedLoader();
  const service = createAskService({ loadContext: loader.loadApprovedSource,
    fetchCorpus: async () => { throw new Error('The vendored custody replay must not fetch corpus files'); } });
  try {
    const current = await loader.loadApprovedSource();
    const previous = await loader.loadApprovedSource(PREVIOUS_BUNDLE_VERSION);
    const legacy = await loader.loadApprovedSource(LEGACY_BUNDLE_VERSION);
    assert.ok('manifest' in current && 'manifest' in previous && 'index' in legacy);
    assert.equal(current.binding.index_sha256, APPROVED_BUNDLE.index_sha256);
    assert.equal(previous.binding.index_sha256, PREVIOUS_APPROVED_BUNDLE.index_sha256);
    assert.equal(legacy.binding.index_sha256, LEGACY_APPROVED_BUNDLE.index_sha256);
    assert.notEqual(current.manifest.bundle.snapshot, previous.manifest.bundle.snapshot);
    assert.notEqual(current.manifest.base_index.sha256, previous.manifest.base_index.sha256);
    assert.equal(legacy.index.records.length, 52);
    assert.strictEqual(await loader.loadApprovedSource(BUNDLE_VERSION), current);
    assert.strictEqual(await loader.loadApprovedSource(PREVIOUS_BUNDLE_VERSION), previous);
    assert.strictEqual(await loader.loadApprovedSource(LEGACY_BUNDLE_VERSION), legacy);
    await assert.rejects(loader.loadApprovedSource('main'), /not approved/);
    const expected = await assembleContext(legacy.index, custodyQuestion, undefined, legacy.binding);
    const catalogue = await callTool(service, 'ask_okf_manifest', { bundle: 'okf-dwp', version: LEGACY_BUNDLE_VERSION, question: custodyQuestion });
    assert.equal(catalogue.isError, undefined);
    assert.equal(catalogue.structuredContent.context_id, expected.context_id);
    const recipe = JSON.parse(Buffer.from(new URL(catalogue.structuredContent.review_url).hash.slice(1), 'base64url').toString());
    assert.equal(recipe.version, LEGACY_BUNDLE_VERSION);
    const parts: string[] = []; let offset: number | null = 0;
    do {
      const result = await callTool(service, 'read_okf_evidence', { ...recipe, section: 'package', offset, delivery_bytes: 65536 });
      assert.equal(result.isError, undefined); parts.push(result.structuredContent.data); offset = result.structuredContent.next_offset;
    } while (offset !== null);
    assert.equal(parts.join(''), canonicalJson(expected));
    assert.equal(expected.context_id, 'urn:sha256:283cddceca09958b96949527280ea14775de5f26d092c939cacfaa545500e80e');
  } finally { await service.close(); await loader.close(); }
});
