/** Offline integration of the actual vendored loader and immutable corpus bytes. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assembleContext, canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { assembleCorpusContext } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';
import { createAskService, PUBLIC_ORIGIN } from '../src/service.ts';
import { APPROVED_VERSIONS, BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, type ApprovedSource } from '../src/registry.ts';
// @ts-ignore -- The live and offline verifiers share portable JavaScript helpers.
import { verifyCompactDelivery } from './verify-delivery.mjs';
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
  const args = process.argv.slice(2);
  assert.equal(args.length, 4, 'Use --dwp-root /path/to/okf-dwp --out receipt.json');
  assert.equal(args[0], '--dwp-root'); assert.equal(args[2], '--out');
  const dwpRoot = resolve(args[1]);
  const loader = await approvedLoader();
  const sources = new Map(await Promise.all(APPROVED_VERSIONS.map(async version => [version, await loader.loadApprovedSource(version)] as const)));
  const allowed = new Map<string, { path: string; sha256: string; bytes: number }>();
  for (const [version, source] of sources) {
    if (!('manifest' in source)) continue;
    const prefix = `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${version}/`;
    for (const file of [source.manifest.base_index, ...source.manifest.records.shards, ...Object.values(source.manifest.search.shards)]) {
      const url = new URL(file.path, source.binding.index_url).href;
      assert.ok(url.startsWith(prefix));
      const path = resolve(dwpRoot, url.slice(prefix.length));
      assert.ok(path.startsWith(dwpRoot + '/'));
      allowed.set(url, { path, sha256: file.sha256, bytes: file.bytes });
    }
  }
  const fetched = new Map<string, { sha256: string; bytes: number }>();
  const fetchCorpus: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    const file = allowed.get(url); assert.ok(file, 'Only manifest-listed local corpus files are available');
    const raw = await readFile(file.path);
    assert.equal(raw.length, file.bytes); assert.equal(sha(raw), file.sha256);
    fetched.set(url, { sha256: file.sha256, bytes: raw.length });
    return new Response(new Uint8Array(raw));
  };
  const service = createAskService({ loadContext: loader.loadApprovedSource, fetchCorpus });
  const cases = [];
  try {
    for (const version of APPROVED_VERSIONS) {
      const source = sources.get(version)!;
      const expected = 'manifest' in source
        ? await assembleCorpusContext(source.manifest, source.binding, custodyQuestion, {}, fetchCorpus)
        : await assembleContext(source.index, custodyQuestion, undefined, source.binding);
      const catalogue = await callTool(service, 'ask_okf_manifest', { bundle: 'okf-dwp', version, question: custodyQuestion });
      assert.equal(catalogue.isError, undefined);
      const manifest = catalogue.structuredContent;
      assert.equal(manifest.context_id, expected.context_id);
      const recipe = JSON.parse(Buffer.from(new URL(manifest.review_url).hash.slice(1), 'base64url').toString());
      assert.equal(recipe.version, version); assert.equal(recipe.context_id, expected.context_id);
      const parts: string[] = []; let offset: number | null = 0;
      do {
        const result = await callTool(service, 'read_okf_evidence', { ...recipe, section: 'package', offset, delivery_bytes: 65536 });
        assert.equal(result.isError, undefined);
        parts.push(result.structuredContent.data); offset = result.structuredContent.next_offset;
      } while (offset !== null);
      assert.equal(parts.join(''), canonicalJson(expected));
      if (version !== BUNDLE_VERSION) {
        const changed = await callTool(service, 'read_okf_evidence', { ...recipe, version: BUNDLE_VERSION, section: 'package' });
        assert.equal(changed.isError, true, 'A historical replay must not silently switch to the current source');
      }
      if (version === LEGACY_BUNDLE_VERSION) assert.equal(expected.context_id, 'urn:sha256:283cddceca09958b96949527280ea14775de5f26d092c939cacfaa545500e80e');
      cases.push({ version, source_kind: 'manifest' in source ? 'corpus' : 'context', binding: source.binding,
        context_id: expected.context_id, package_sha256: sha(canonicalJson(expected)), evidence_status: expected.evidence_status,
        selected_records: expected.selected.length, relationships: expected.relationships.length, slices: parts.length, exact_replay: true });
    }
    const compact = [];
    for (const item of verificationCases(BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION).compact) {
      const source = sources.get(item.version)!;
      const context = 'manifest' in source
        ? await assembleCorpusContext(source.manifest, source.binding, item.question, item.budget ?? {}, fetchCorpus)
        : await assembleContext(source.index, item.question, item.budget, source.binding);
      const client = { callTool: ({ name, arguments: args }: { name: string; arguments: unknown }) => callTool(service, name, args) };
      compact.push({ ...await verifyCompactDelivery(client, context, { bundle: 'okf-dwp', version: item.version,
        question: item.question, ...(item.budget ? { budget: item.budget } : {}) }, PUBLIC_ORIGIN, { read_bytes: 32768 }), id: item.id });
    }
    const receipt = { schema: 'okf-approved-version-integration.v1', observed_at: new Date().toISOString(),
      mode: 'offline-local-corpus', limitation: 'Actual vendored loader and hash-verified source files; not a remote reachability, hosting or AI acceptance observation.',
      runner_sha256: sha(await readFile(fileURLToPath(import.meta.url))),
      supporting_files: Object.fromEntries(await Promise.all(['scripts/verify-delivery.mjs', 'scripts/verification-cases.mjs'].map(async path => [path, sha(await readFile(resolve(serviceRoot, path)))]))),
      build_receipt_sha256: sha(await readFile(resolve(serviceRoot, 'dist/build-receipt.json'))),
      cases, compact_delivery: compact[0], compact_delivery_versions: compact,
      files: Object.fromEntries([...fetched].sort(([a], [b]) => a.localeCompare(b))) };
    await writeFile(resolve(args[3]), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ versions: cases.length, exact_replays: cases.length, compact_cases: compact.length, verified_local_files: fetched.size }));
  } finally { await service.close(); await loader.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
