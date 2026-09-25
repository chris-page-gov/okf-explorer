/** Offline integration of the actual vendored loader and immutable corpus bytes. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Client as LegacyClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport as LegacyTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { contextManifest, readContextEvidence } from '../../../apps/okf-explorer/src/lib/context/delivery.ts';
import { ENGINES, CURRENT_ENGINE_ID, PRIOR_ENGINE_ID } from '../src/engines.ts';
import { corpusAssetReferences } from '../src/corpusAssets.ts';
import { resolveReplay } from '../src/replay.ts';
import { bindEvidenceRead } from '../src/replayDelivery.ts';
import { reviewLink } from '../src/deliveryContracts.ts';
import { createAskService, PUBLIC_ORIGIN } from '../src/service.ts';
import { APPROVED_VERSIONS, BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, type ApprovedSource } from '../src/registry.ts';
// @ts-ignore -- Fixed acceptance cases shared with the live verifier.
import { verificationCases } from './verification-cases.mjs';

const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
export const custodyQuestion = 'A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance.';

/** Bundle the production loader with its real raw-file imports, without a test stub. */
export async function approvedLoader() {
  const directory = await mkdtemp(resolve(tmpdir(), 'okf-approved-versions-'));
  try {
    const outfile = resolve(directory, 'loader.mjs');
    await build({ entryPoints: [resolve(serviceRoot, 'src/bundles.ts')], outfile,
      bundle: true, format: 'esm', platform: 'node', target: 'es2022', logLevel: 'silent',
      plugins: [{ name: 'verified-loader-raw', setup(builder) {
        builder.onResolve({ filter: /\?raw$/ }, args => ({ path: resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw' }));
        builder.onLoad({ filter: /.*/, namespace: 'raw' }, async args => ({ contents: await readFile(args.path, 'utf8'), loader: 'text' }));
      } }] });
    const module = await import(pathToFileURL(outfile).href) as { loadApprovedSource: (version?: string) => Promise<ApprovedSource> };
    return { loadApprovedSource: module.loadApprovedSource, close: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
}

export async function callTool(service: ReturnType<typeof createAskService>, name: string, args: unknown) {
  const response = await service.fetch(new Request(`${PUBLIC_ORIGIN}/okf/mcp`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
  }));
  assert.equal(response.status, 200);
  const raw = await response.text();
  const message = JSON.parse(raw.startsWith('event:') ? raw.split('\n').find(line => line.startsWith('data: '))!.slice(6) : raw);
  assert.equal(message.error, undefined);
  return message.result;
}

async function main() {
  // This legacy integration CLI uses the current compact comparator only when
  // invoked directly. Keeping this import here avoids an evaluation cycle when
  // the public verifier imports approvedLoader from this module.
  const { prepareDelivery, verifyDelivery } = await import('./verify-versioned-remote.ts');
  const args = process.argv.slice(2);
  assert.equal(args.length, 4, 'Use --dwp-root /path/to/okf-dwp --out receipt.json');
  assert.equal(args[0], '--dwp-root'); assert.equal(args[2], '--out');
  const dwpRoot = resolve(args[1]);
  const loader = await approvedLoader();
  const sources = new Map(await Promise.all(APPROVED_VERSIONS.map(async version => [version, await loader.loadApprovedSource(version)] as const)));
  const allowed = new Map<string, { version: string; path: string; sha256: string; bytes: number }>();
  const gitBytes = (version: string, path: string) => {
    assert.match(version, /^[a-f0-9]{40}$/);
    assert.ok(path && !path.startsWith('/') && path.split('/').every(part => part && part !== '..' && part !== '.'));
    return execFileSync('git', ['show', version + ':' + path], { cwd: dwpRoot, maxBuffer: 32 * 1024 * 1024 });
  };
  for (const [version, source] of sources) {
    if (!('manifest' in source)) continue;
    const prefix = `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${version}/`;
    assert.ok(source.binding.index_url.startsWith(prefix));
    assert.equal(sha(gitBytes(version, source.binding.index_url.slice(prefix.length))), source.binding.index_sha256,
      'Vendored manifest must equal its exact immutable DWP Git blob');
    for (const file of corpusAssetReferences(source.manifest)) {
      const url = new URL(file.path, source.binding.index_url).href;
      assert.ok(url.startsWith(prefix));
      allowed.set(url, { version, path: url.slice(prefix.length), sha256: file.sha256, bytes: file.bytes });
    }
  }
  const fetched = new Map<string, { sha256: string; bytes: number }>();
  const cache = new Map<string, Uint8Array>();
  const fetchCorpus: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    const file = allowed.get(url); assert.ok(file, 'Only manifest-listed immutable Git blobs are available');
    let raw = cache.get(url);
    if (!raw) {
      raw = new Uint8Array(gitBytes(file.version, file.path));
      assert.equal(raw.length, file.bytes); assert.equal(sha(raw), file.sha256);
      cache.set(url, raw); fetched.set(url, { sha256: file.sha256, bytes: raw.length });
    }
    return new Response(raw as BodyInit);
  };
  // Independent local cases have separate admission windows. Production limits
  // are unchanged; this is not a hosted quota or concurrency observation.
  async function sdkService() {
    const service = createAskService({ loadContext: loader.loadApprovedSource, fetchCorpus });
    const endpoint = new URL(PUBLIC_ORIGIN + '/okf/mcp');
    const fetcher: typeof fetch = (input, init) => service.fetch(new Request(input, init));
    const client = new Client({ name: 'okf-four-version-sdk-acceptance', version: '1' }, {
      versionNegotiation: { mode: { pin: '2026-07-28' } }, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() });
    await client.connect(new StreamableHTTPClientTransport(endpoint, { fetch: fetcher }));
    const legacy = new LegacyClient({ name: 'okf-four-version-legacy-sdk-acceptance', version: '1' });
    await legacy.connect(new LegacyTransport(endpoint, { fetch: fetcher }));
    return { client, legacy, close: async () => { await client.close(); await legacy.close(); await service.close(); } };
  }
  const cases = [];
  try {
    for (const version of APPROVED_VERSIONS) {
      const source = sources.get(version)!;
      const engine = ENGINES.find(row => row.engine_id === (version === BUNDLE_VERSION ? CURRENT_ENGINE_ID : PRIOR_ENGINE_ID))!;
      const expected = await engine.assemble(source, custodyQuestion, undefined, fetchCorpus);
      const sdk = await sdkService();
      try {
        for (const client of [sdk.client, sdk.legacy]) {
          const full = await client.callTool({ name: 'ask_okf', arguments: { bundle: 'okf-dwp', version, question: custodyQuestion } });
          assert.equal(full.isError, undefined);
          assert.equal(canonicalJson(full.structuredContent), canonicalJson(expected));
        }
        const catalogue = await sdk.client.callTool({ name: 'ask_okf_manifest', arguments: { bundle: 'okf-dwp', version, question: custodyQuestion } });
        assert.equal(catalogue.isError, undefined);
        const manifest = catalogue.structuredContent as any;
        assert.equal(manifest.context_id, expected.context_id);
        const recipe = JSON.parse(Buffer.from(new URL(manifest.review_url).hash.slice(1), 'base64url').toString());
        assert.equal(recipe.version, version); assert.equal(recipe.context_id, expected.context_id);
        const parts: string[] = []; let offset: number | null = 0;
        do {
          const result = await sdk.client.callTool({ name: 'read_okf_evidence', arguments: { ...recipe, section: 'package', offset, delivery_bytes: 65536 } });
          assert.equal(result.isError, undefined);
          const slice = result.structuredContent as any;
          parts.push(slice.data); offset = slice.next_offset;
        } while (offset !== null);
        assert.equal(parts.join(''), canonicalJson(expected));
        if (version !== BUNDLE_VERSION) {
          const changed = await sdk.client.callTool({ name: 'read_okf_evidence', arguments: { ...recipe, version: BUNDLE_VERSION, section: 'package' } });
          assert.equal(changed.isError, true, 'A historical replay must not silently switch to the current source');
        }
        if (version === LEGACY_BUNDLE_VERSION) assert.equal(expected.context_id, 'urn:sha256:283cddceca09958b96949527280ea14775de5f26d092c939cacfaa545500e80e');
        cases.push({ version, source_kind: 'manifest' in source ? 'corpus' : 'context', binding: source.binding,
          context_id: expected.context_id, package_sha256: sha(canonicalJson(expected)), evidence_status: expected.evidence_status,
          selected_records: expected.selected.length, relationships: expected.relationships.length, slices: parts.length, exact_replay: true,
          current_sdk_full_parity: true, legacy_sdk_full_parity: true });
      } finally { await sdk.close(); }
    }
    const compact = [];
    for (const item of verificationCases(BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, STAFF_BUNDLE_VERSION).compact) {
      const source = sources.get(item.version)!;
      const request = { bundle: 'okf-dwp', version: item.version, question: item.question,
        ...(item.budget ? { budget: item.budget } : {}) };
      const assembled = await resolveReplay(source, request, fetchCorpus);
      const sdk = await sdkService();
      try {
        const expected = await prepareDelivery({ id: item.id, case_kind: 'offline-source-pair', request,
          ...assembled, inspectRecord: true }, PUBLIC_ORIGIN, { delivery: { contextManifest, readContextEvidence }, bindEvidenceRead, reviewLink });
        compact.push((await verifyDelivery(sdk.client, expected, PUBLIC_ORIGIN)).receipt);
      } finally { await sdk.close(); }
    }
    const receipt = { schema: 'okf-approved-version-integration.v1', observed_at: new Date().toISOString(),
      mode: 'offline-local-corpus', source_mode: 'exact-immutable-DWP-Git-blobs',
      sdk: { current: '@modelcontextprotocol/client 2.0.0', current_protocol: '2026-07-28', legacy: '@modelcontextprotocol/sdk 1.30.0' },
      limitation: 'Actual vendored loader and hash-verified immutable Git blobs; fresh local admission window per case. Not remote reachability, hosting, quota or AI acceptance.',
      runner_sha256: sha(await readFile(fileURLToPath(import.meta.url))),
      supporting_files: Object.fromEntries(await Promise.all(['scripts/verify-delivery.mjs', 'scripts/verification-cases.mjs'].map(async path => [path, sha(await readFile(resolve(serviceRoot, path)))]))),
      build_receipt_sha256: sha(await readFile(resolve(serviceRoot, 'dist/build-receipt.json'))),
      cases, compact_delivery: compact[0], compact_delivery_versions: compact,
      files: Object.fromEntries([...fetched].sort(([a], [b]) => a.localeCompare(b))) };
    await writeFile(resolve(args[3]), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ versions: cases.length, exact_replays: cases.length, compact_cases: compact.length, verified_local_files: fetched.size }));
  } finally { await loader.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
