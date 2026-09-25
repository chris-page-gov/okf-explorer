import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { canonicalJson, assembleContext } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { createAskService } from '../src/service.ts';
import { SERVICE_VERSION, PRIOR_BUNDLE_VERSION, HOUSEHOLD_BUNDLE_VERSION, HOUSEHOLD_APPROVED_BUNDLE, APPROVED_BUNDLE, STAFF_APPROVED_BUNDLE, PREVIOUS_APPROVED_BUNDLE, LEGACY_APPROVED_BUNDLE, BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION } from '../src/registry.ts';
import { approvedLoader, callTool, custodyQuestion } from '../scripts/verify-approved-versions.ts';

test('release package, lock, registry and build agree without changing locked dependencies', async () => {
  const json = async (path: string) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pkg = await json('../package.json'); const lock = await json('../package-lock.json');
  const build = await json('../dist/build-receipt.json');
  assert.equal(SERVICE_VERSION, '0.7.0');
  assert.equal(pkg.version, SERVICE_VERSION); assert.equal(lock.version, SERVICE_VERSION);
  assert.equal(lock.packages[''].version, SERVICE_VERSION); assert.equal(build.service_version, SERVICE_VERSION);
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  assert.deepEqual(build.historical_bundle_versions, [PRIOR_BUNDLE_VERSION, HOUSEHOLD_BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION]);
});

test('preserved required-evidence candidate binds its executed runner, retained build and four approved versions', async () => {
  const base = '../validation/candidates/required-evidence-2026-09-21/';
  const receipt = JSON.parse(await readFile(new URL(base + 'approved-versions.json', import.meta.url), 'utf8'));
  const classification = JSON.parse(await readFile(new URL(base + 'classification.json', import.meta.url), 'utf8'));
  const digest = async (path: string) => createHash('sha256').update(await readFile(new URL(path, import.meta.url))).digest('hex');
  assert.equal(classification.classification, 'undeployed-required-evidence-engine-candidate');
  assert.equal(classification.service_version, '0.5.0');
  assert.equal(classification.deployment_verified, false);
  assert.equal(classification.network_calls, 0);
  assert.equal(classification.model_calls, 0);
  assert.equal(classification.integration_receipt_sha256, await digest(base + 'approved-versions.json'));
  assert.equal(classification.build_receipt_sha256, await digest(base + 'build-receipt.json'));
  const retainedBuild = JSON.parse(await readFile(new URL(base + 'build-receipt.json', import.meta.url), 'utf8'));
  assert.equal(classification.worker_sha256, retainedBuild.outputs['dist/server/index.js']);
  assert.equal(classification.build_receipt_sha256, receipt.build_receipt_sha256);
  assert.match(receipt.runner_sha256, /^[a-f0-9]{64}$/);
  for (const [path, expected] of Object.entries(receipt.supporting_files)) assert.equal(await digest('../' + path), expected);
  assert.equal(receipt.build_receipt_sha256, 'c9820a92a4445e5119657d570fe8b5cfd7d61ebc83cbf18c9525dee758fb4724');
  assert.equal(receipt.mode, 'offline-local-corpus');
  assert.deepEqual(receipt.cases.map((row: { version: string }) => row.version), [HOUSEHOLD_BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION]);
  assert.ok(receipt.cases.every((row: { exact_replay: boolean; slices: number }) => row.exact_replay && row.slices > 0));
  assert.equal(receipt.cases[0].binding.index_sha256, HOUSEHOLD_APPROVED_BUNDLE.index_sha256);
  assert.equal(receipt.cases[1].binding.index_sha256, STAFF_APPROVED_BUNDLE.index_sha256);
  assert.equal(receipt.cases[2].binding.index_sha256, PREVIOUS_APPROVED_BUNDLE.index_sha256);
  assert.equal(receipt.cases[3].binding.index_sha256, LEGACY_APPROVED_BUNDLE.index_sha256);
  assert.ok(receipt.cases.every((row: {current_sdk_full_parity: boolean; legacy_sdk_full_parity: boolean}) => row.current_sdk_full_parity && row.legacy_sdk_full_parity));
  assert.equal(receipt.source_mode, 'exact-immutable-DWP-Git-blobs');
  assert.ok(Object.keys(receipt.files).length > 0);
  assert.equal(receipt.compact_delivery.id, 'staff-care-home-compact-delivery');
  assert.equal(receipt.compact_delivery.context_budget.max_bytes, 262144);
  assert.ok(receipt.compact_delivery.selected_records > 0);
  assert.equal(receipt.compact_delivery.evidence_status, 'insufficient');
  assert.deepEqual(receipt.compact_delivery_versions.map((row: { bundle_version: string }) => row.bundle_version), [HOUSEHOLD_BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION]);
  assert.ok(receipt.compact_delivery_versions.every((row: { reconstructed_package_matches_direct_engine: boolean }) => row.reconstructed_package_matches_direct_engine));
});

test('candidate comparison preserves previous observations and exposes changed context identities', async () => {
  const json = async (path: string) => JSON.parse(await readFile(new URL('../validation/' + path, import.meta.url), 'utf8'));
  const base = 'candidates/required-evidence-2026-09-21/';
  const candidate = await json(base + 'approved-versions.json');
  const classification = await json(base + 'classification.json');
  const previous = await json('approved-versions-0.5.0.json');
  const digest = async (path: string) => createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex');
  assert.equal(await digest('validation/approved-versions-0.5.0.json'), '44f6018ace34f72ce0f6085e92c51f3d2d9b57ecd223f7c37a3ddc7141d2c56b');
  assert.equal(await digest('validation/approved-versions-0.4.0.json'), 'e8b350ff52c9534f31bdf0ae1b9df70ab82b9ceb9224ffdd78be6ebd7c397f67');
  for (const [path, expected] of Object.entries(classification.preserved_observations)) assert.equal(await digest(path), expected);
  assert.equal(classification.source_versions_unchanged, true);
  assert.deepEqual(candidate.cases.map((row: any) => row.binding), previous.cases.map((row: any) => row.binding));
  const compare = (rows: any[], older: any[]) => rows.map((row, index) => ({
    case_id: row.id ?? 'custody', source_version: row.version ?? row.bundle_version,
    previous_context_id: older[index].context_id, candidate_context_id: row.context_id,
    context_id_changed: row.context_id !== older[index].context_id,
    selected_records: row.selected_records, selected_relationships: row.relationships ?? row.selected_relationships,
    evidence_status: row.evidence_status
  }));
  assert.deepEqual(classification.context_comparison, {
    full_custody: compare(candidate.cases, previous.cases),
    compact: compare(candidate.compact_delivery_versions, previous.compact_delivery_versions)
  });
  assert.deepEqual(classification.context_comparison.full_custody.map((row: any) => row.context_id_changed), [true, true, true, false]);
  assert.deepEqual(classification.context_comparison.compact.map((row: any) => row.context_id_changed), [true, false, false, false]);
});

test('the superseded local observation retains its original receipt and actual Worker identity', async () => {
  const base = new URL('../validation/history/0.4.0-symlink/', import.meta.url);
  const classification = JSON.parse(await readFile(new URL('classification.json', base), 'utf8'));
  const buildRaw = await readFile(new URL('build-receipt.json', base));
  const integrationRaw = await readFile(new URL('approved-versions.json', base));
  const digest = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
  assert.equal(digest(buildRaw), 'c8ecc03c995a3ab9dcf7ed82787db0f5efcde951ec221aed15a61bfd8f4af8e3');
  assert.equal(classification.build_receipt_sha256, digest(buildRaw));
  assert.equal(classification.integration_receipt_sha256, digest(integrationRaw));
  assert.equal(JSON.parse(integrationRaw.toString()).build_receipt_sha256, digest(buildRaw));
  assert.equal(classification.worker_sha256, 'a1622d7d20ab3feb0dea076ed8f9d44d31147f50159c8909ca7a2c09539695f6');
  assert.equal(JSON.parse(buildRaw.toString()).outputs['dist/server/index.js'], classification.worker_sha256);
  assert.equal(classification.classification, 'historical-local-symlink-build-not-portable');
});

test('the earlier 0.5.0 candidate observation is preserved and only its facet label changes', async () => {
  const base = new URL('../validation/history/0.5.0-source-family-label/', import.meta.url);
  const classification = JSON.parse(await readFile(new URL('classification.json', base), 'utf8'));
  const digest = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
  const previousBuild = await readFile(new URL('build-receipt.json', base));
  const previousReceipt = await readFile(new URL('approved-versions.json', base));
  const previousLanding = await readFile(new URL('landing-source.txt', base));
  assert.equal(digest(previousBuild), classification.build_receipt_sha256);
  assert.equal(digest(previousReceipt), classification.integration_receipt_sha256);
  assert.equal(digest(previousLanding), classification.changed_source.sha256);
  assert.equal(JSON.parse(previousBuild.toString()).outputs['dist/server/index.js'], classification.worker_sha256);
  assert.equal(JSON.parse(previousReceipt.toString()).build_receipt_sha256, classification.build_receipt_sha256);
  const retainedBuild = JSON.parse(await readFile(new URL('../validation/candidates/versioned-replay-2026-09-21/integration/build-receipt.json', import.meta.url), 'utf8'));
  assert.equal(digest(Buffer.from(previousLanding.toString().replace('Source manual facet', 'Source family facet'))), retainedBuild.inputs['src/landing.ts']);
  const current = JSON.parse(await readFile(new URL('../validation/approved-versions-0.5.0.json', import.meta.url), 'utf8'));
  const previous = JSON.parse(previousReceipt.toString());
  assert.deepEqual(current.cases, previous.cases);
  assert.deepEqual(current.compact_delivery_versions.map((row: { context_id: string }) => row.context_id),
    previous.compact_delivery_versions.map((row: { context_id: string }) => row.context_id));
});

test('actual vendored loader separates all five versions and preserves historical compact replay', async () => {
  const loader = await approvedLoader();
  const service = createAskService({ loadContext: loader.loadApprovedSource,
    fetchCorpus: async () => { throw new Error('The vendored custody replay must not fetch corpus files'); } });
  try {
    const current = await loader.loadApprovedSource();
    const household = await loader.loadApprovedSource(HOUSEHOLD_BUNDLE_VERSION);
    const staff = await loader.loadApprovedSource(STAFF_BUNDLE_VERSION);
    const previous = await loader.loadApprovedSource(PREVIOUS_BUNDLE_VERSION);
    const legacy = await loader.loadApprovedSource(LEGACY_BUNDLE_VERSION);
    assert.ok('manifest' in household && 'manifest' in current && 'manifest' in staff && 'manifest' in previous && 'index' in legacy);
    assert.equal(current.binding.index_sha256, APPROVED_BUNDLE.index_sha256);
    assert.equal(household.binding.index_sha256, HOUSEHOLD_APPROVED_BUNDLE.index_sha256);
    assert.strictEqual(await loader.loadApprovedSource(HOUSEHOLD_BUNDLE_VERSION), household);
    assert.equal(staff.binding.index_sha256, STAFF_APPROVED_BUNDLE.index_sha256);
    assert.notEqual(current.manifest.base_index.sha256, staff.manifest.base_index.sha256);
    assert.equal(previous.binding.index_sha256, PREVIOUS_APPROVED_BUNDLE.index_sha256);
    assert.equal(legacy.binding.index_sha256, LEGACY_APPROVED_BUNDLE.index_sha256);
    assert.notEqual(current.manifest.bundle.snapshot, previous.manifest.bundle.snapshot);
    assert.notEqual(current.manifest.base_index.sha256, previous.manifest.base_index.sha256);
    assert.equal(legacy.index.records.length, 52);
    assert.strictEqual(await loader.loadApprovedSource(BUNDLE_VERSION), current);
    assert.strictEqual(await loader.loadApprovedSource(STAFF_BUNDLE_VERSION), staff);
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
