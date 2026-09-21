/** Actual local transport observation. No network/model calls or mutable source.
 * Run with --dwp-root /path/to/okf-dwp --out NEW_DIRECTORY. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Client as LegacyClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport as LegacyTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { approvedLoader, callTool } from './verify-approved-versions.ts';
// @ts-ignore -- Preserved portable acceptance questions, not runtime rules.
import { verificationCases } from './verification-cases.mjs';
import { createAskService, PUBLIC_ORIGIN } from '../src/service.ts';
import { CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID, ENGINES } from '../src/engines.ts';
import { BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, APPROVED_VERSIONS } from '../src/registry.ts';
import { canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { boundedFile, noSymlinks, freshDirectory, verifiedBuild } from './replay-observation-files.ts';

const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
const args = process.argv.slice(2);
assert.equal(args.length, 4); assert.equal(args[0], '--dwp-root'); assert.equal(args[2], '--out');
const dwpRoot = resolve(args[1]), output = resolve(args[3]);
await noSymlinks(dwpRoot);
await freshDirectory(output); // Exclusive: never overwrite any earlier pass or failure.
const started = new Date().toISOString();
const { raw: buildRaw, value: build } = await verifiedBuild(serviceRoot);
const originalRaw = await boundedFile(resolve(serviceRoot, 'validation/approved-versions-0.5.0.json'));
const original = JSON.parse(originalRaw.toString());
assert.equal(hash(originalRaw), '44f6018ace34f72ce0f6085e92c51f3d2d9b57ecd223f7c37a3ddc7141d2c56b');
assert.deepEqual(build.engines.map((row: any) => row.engine_id), [CURRENT_ENGINE_ID, PREVIOUS_ENGINE_ID]);
const loader = await approvedLoader();
const files: Record<string, { bytes: number; sha256: string }> = {};
const retained: Record<string, { bytes: number; sha256: string }> = {};
const cases: any[] = [];
async function retain(path: string, raw: Uint8Array | string) {
  await writeFile(resolve(output, path), raw, { flag: 'wx' });
  retained[path] = { bytes: Buffer.byteLength(raw), sha256: hash(raw) };
}
const gitBytes = (version: string, path: string, expectedBytes: number, expectedHash: string) => {
  assert.match(version, /^[a-f0-9]{40}$/);
  assert.match(path, /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/);
  assert.ok(!path.split('/').some(part => part === '.' || part === '..'));
  assert.ok(expectedBytes > 0 && expectedBytes <= 8 * 1024 * 1024);
  const spec = version + ':' + path;
  const size = execFileSync('git', ['cat-file', '-s', spec], { cwd: dwpRoot, maxBuffer: 100 }).toString().trim();
  assert.equal(size, String(expectedBytes));
  const raw = execFileSync('git', ['show', spec], { cwd: dwpRoot, maxBuffer: expectedBytes + 1 });
  assert.equal(raw.length, expectedBytes); assert.equal(hash(raw), expectedHash);
  files[spec] = { bytes: raw.length, sha256: hash(raw) }; return raw;
};
try {
  await retain('build-receipt.json', buildRaw);
  await retain('executed-runner.ts', await readFile(fileURLToPath(import.meta.url)));
  await retain('observation-files.ts', await boundedFile(resolve(serviceRoot, 'scripts/replay-observation-files.ts')));
  await retain('approved-loader.ts', await boundedFile(resolve(serviceRoot, 'scripts/verify-approved-versions.ts')));
  await retain('verification-cases.mjs', await boundedFile(resolve(serviceRoot, 'scripts/verification-cases.mjs')));
  const selectedCases = verificationCases(BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, STAFF_BUNDLE_VERSION).compact;
  assert.deepEqual(selectedCases.map((row: any) => row.version), [...APPROVED_VERSIONS]);
  for (let caseIndex = 0; caseIndex < selectedCases.length; caseIndex++) {
    const testCase = selectedCases[caseIndex];
    const source = await loader.loadApprovedSource(testCase.version);
    const prefix = `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${testCase.version}/`;
    const allowed = new Map<string, any>();
    if ('manifest' in source) {
      // Actual manifest byte length comes from the verified vendored file, not reserialisation.
      const vendor = caseIndex === 0 ? 'okf-dwp-corpus-manifest.json' : caseIndex === 1 ? 'okf-dwp-staff-corpus-manifest.json' : 'okf-dwp-previous-corpus-manifest.json';
      const manifestBytes = await readFile(resolve(serviceRoot, 'vendor/' + vendor));
      assert.ok(source.binding.index_url.startsWith(prefix));
      gitBytes(testCase.version, source.binding.index_url.slice(prefix.length), manifestBytes.length, source.binding.index_sha256);
      for (const ref of [source.manifest.base_index, ...source.manifest.records.shards, ...Object.values(source.manifest.search.shards)]) {
        const url = new URL(ref.path, source.binding.index_url).href; assert.ok(url.startsWith(prefix)); allowed.set(url, ref);
      }
    }
    const cache = new Map<string, Buffer>();
    const fetchCorpus: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
      const ref = allowed.get(url); assert.ok(ref);
      if (!cache.has(url)) cache.set(url, gitBytes(testCase.version, url.slice(prefix.length), ref.bytes, ref.sha256));
      return new Response(cache.get(url)! as BodyInit);
    };
    let oldContext: any;
    for (const engine of ENGINES) {
      const direct = await engine.assemble(source, testCase.question, testCase.budget, fetchCorpus);
      const canonical = canonicalJson(direct);
      if (engine.engine_id === PREVIOUS_ENGINE_ID) {
        oldContext = direct;
        assert.equal(hash(canonical), original.compact_delivery_versions[caseIndex].package_canonical_sha256,
          'Historical complete package must match the original 0.5.0 observation, not only its ID');
      }
      const budget = Object.fromEntries(['max_nodes', 'max_relationships', 'max_depth', 'max_bytes'].map(key => [key, direct.budget[key as keyof typeof direct.budget]]));
      const recipe = { bundle: 'okf-dwp', version: testCase.version, question: testCase.question, budget,
        context_id: direct.context_id, engine_id: engine.engine_id };
      const service = createAskService({ loadContext: loader.loadApprovedSource, fetchCorpus });
      let count = 0;
      try {
        const full = await callTool(service, 'ask_okf', recipe); count++;
        assert.equal(full.isError, undefined); assert.equal(canonicalJson(full.structuredContent), canonical);
        assert.equal(full._meta['okf/replay'].engine_id, engine.engine_id);
        const records: string[] = []; let offset: number | null = 0;
        do {
          const response = await callTool(service, 'ask_okf_manifest', { ...recipe, offset }); count++;
          assert.equal(response.isError, undefined);
          const value = response.structuredContent;
          assert.equal(value.replay.engine_id, engine.engine_id); assert.equal(value.replay_identity.package_sha256, hash(canonical));
          assert.ok(Buffer.byteLength(JSON.stringify(value)) <= 16384);
          assert.deepEqual(JSON.parse(Buffer.from(new URL(value.review_url).hash.slice(1), 'base64url').toString()), recipe);
          records.push(...value.records.map((record: any) => record.id)); offset = value.delivery.next_offset;
          assert.ok(count <= 40);
        } while (offset !== null);
        assert.deepEqual(records, direct.selected.map(item => item.record.id));
        const parts: string[] = []; offset = 0;
        do {
          const response = await callTool(service, 'read_okf_evidence', { ...recipe, section: 'package', offset, delivery_bytes: 65536 }); count++;
          assert.equal(response.isError, undefined);
          const value = response.structuredContent;
          assert.equal(value.context_id, direct.context_id); assert.equal(value.replay_identity.engine_id, engine.engine_id);
          assert.equal(value.offset, offset); assert.equal(value.content_sha256, hash(canonical));
          assert.ok(Buffer.byteLength(JSON.stringify(value)) <= 65536);
          parts.push(value.data); offset = value.next_offset; assert.ok(count <= 80);
        } while (offset !== null);
        assert.equal(parts.join(''), canonical);
        // Both SDK generations validate the new envelope against actual source evidence.
        for (const current of [true, false]) {
          const fetcher: typeof fetch = async (input, init) => service.fetch(new Request(input, init));
          const client = current ? new Client({ name: 'versioned-replay-test', version: '1' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator(), versionNegotiation: { mode: { pin: '2026-07-28' } } })
            : new LegacyClient({ name: 'versioned-replay-test', version: '1' });
          const transport = current ? new StreamableHTTPClientTransport(new URL(PUBLIC_ORIGIN + '/okf/mcp'), { fetch: fetcher })
            : new LegacyTransport(new URL(PUBLIC_ORIGIN + '/okf/mcp'), { fetch: fetcher });
          try { await client.connect(transport as never);
            const result = await client.callTool({ name: 'ask_okf_manifest', arguments: recipe });
            assert.equal(result.isError, undefined); assert.equal((result.structuredContent as any).replay.engine_id, engine.engine_id);
          } finally { await client.close(); }
        }
        const path = `context-${caseIndex}-${engine.engine_id === CURRENT_ENGINE_ID ? 'current' : 'previous'}.json.gz`;
        await retain(path, gzipSync(canonical, { level: 9 }));
        cases.push({ id: testCase.id, source_version: testCase.version, engine_id: engine.engine_id,
          context_id: direct.context_id, package_sha256: hash(canonical), package_bytes: Buffer.byteLength(canonical),
          records: direct.selected.length, relationships: direct.relationships.length, evidence_status: direct.evidence_status,
          retained_package: path, exact_package_reconstruction: true, ordered_catalogue: true, sdk_current: true, sdk_legacy: true, calls: count });
      } finally { await service.close(); }
    }
    const compatibility = createAskService({ loadContext: loader.loadApprovedSource, fetchCorpus });
    try {
      const result = await callTool(compatibility, 'ask_okf_manifest', { bundle: 'okf-dwp', version: testCase.version,
        question: testCase.question, budget: testCase.budget, context_id: oldContext.context_id });
      assert.equal(result.isError, undefined); assert.equal(result.structuredContent.replay_identity.mode, 'historical-compatible');
      assert.equal(result.structuredContent.replay_identity.original_engine_id, null);
      assert.equal(result.structuredContent.replay_identity.package_sha256, hash(canonicalJson(oldContext)));
      cases[cases.length - 1].historical_compatibility = result.structuredContent.replay_identity;
    } finally { await compatibility.close(); }
  }
  assert.notEqual(cases[0].context_id, cases[1].context_id);
  const receipt = { schema: 'okf-versioned-replay-observation.v1', classification: 'undeployed-local-engine-pinned-replay',
    started_at: started, completed_at: new Date().toISOString(), service_version: build.service_version,
    network_calls: 0, model_calls: 0, source_mode: 'exact-immutable-DWP-Git-blobs', build_receipt_sha256: hash(buildRaw),
    original_receipt_sha256: hash(originalRaw), runner_sha256: hash(await readFile(fileURLToPath(import.meta.url))),
    worker_sha256: build.outputs['dist/server/index.js'], files, cases, retained,
    limitations: ['Local actual adapter/SDK observation, not public hosting or latency acceptance.', 'Historical replay preserves evidence, not an AI answer or a completeness judgement.'] };
  await writeFile(resolve(output, 'observation.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: cases.length, historical_replays: selectedCases.length, files: Object.keys(files).length, worker: receipt.worker_sha256 }));
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ schema: 'okf-versioned-replay-failure.v1', started_at: started,
    failed_at: new Date().toISOString(), completed_cases: cases.length, category: error instanceof assert.AssertionError ? 'assertion' : 'execution',
    runner_sha256: hash(await readFile(fileURLToPath(import.meta.url))), retained }, null, 2) + '\n', { flag: 'wx' });
  throw error;
} finally { await loader.close(); }
