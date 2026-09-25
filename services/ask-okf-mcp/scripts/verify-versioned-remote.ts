/** Successor live verifier. Importing this file never makes an HTTP request.
 * Public execution requires --execute-public and an admitted immutable plan. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile, mkdir, lstat, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, relative, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const LIMITS = Object.freeze({ pairs: 16, requests: 200, interval_ms: 750,
  request_bytes: 32768, response_bytes: 256 * 1024, received_bytes: 32 * 1024 * 1024,
  request_timeout_ms: 60000, run_timeout_ms: 600000, source_files: 512,
  source_bytes: 64 * 1024 * 1024, local_file_bytes: 8 * 1024 * 1024, pages_per_value: 128 });
export const PUBLIC_QUESTION = 'Does Pension Credit stop is a citizen moves into a care home permanently if they are self-funding?';
export const PUBLIC_UNKNOWN_QUESTION = 'xylophonicquasarteleportation';
export const PUBLIC_QUESTIONS = Object.freeze([PUBLIC_QUESTION, PUBLIC_UNKNOWN_QUESTION]);
export const ORIGINAL_CARE_SOURCE = '3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84';
const ORIGINAL_RECEIPT_SHA = '44f6018ace34f72ce0f6085e92c51f3d2d9b57ecd223f7c37a3ddc7141d2c56b';
const HASH = /^[a-f0-9]{64}$/, COMMIT = /^[a-f0-9]{40}$/;
const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(serviceRoot, '../..');
export const sha = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
export const canonical = (value: any): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
function equal(actual: unknown, expected: unknown, label: string) { if (canonical(actual) !== canonical(expected)) throw new Error(label); }

export type ToolContract = readonly [string, unknown, unknown];
/** Retain hashes/counts only: no discovery strings or arbitrary metadata in failure telemetry. */
export function discoveryDiagnostic(result: any) {
  const envelope = result && typeof result === 'object' && !Array.isArray(result)
    ? Object.fromEntries(Object.entries(result).filter(([key]) => key !== 'tools')) : null;
  return { result_sha256: sha(canonical(result)), envelope_sha256: sha(canonical(envelope)),
    tools_sha256: Array.isArray(result?.tools) ? sha(canonical(result.tools)) : null,
    tool_count: Array.isArray(result?.tools) ? result.tools.length : null };
}
/** SDK v2's protocol-era cache/server envelope is absent in SDK v1; tool rows are never projected or normalised. */
export function validateToolDiscovery(result: any, expected: readonly ToolContract[], sdk: 'v1' | 'v2', serviceVersion: string) {
  assert.ok(result && typeof result === 'object' && !Array.isArray(result) && Array.isArray(result.tools), 'Invalid tool discovery result');
  const envelope = Object.fromEntries(Object.entries(result).filter(([key]) => key !== 'tools'));
  equal(envelope, sdk === 'v2' ? { _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'ask-okf', version: serviceVersion } },
    ttlMs: 0, cacheScope: 'private' } : {}, 'SDK discovery envelope differs');
  assert.equal(result.tools.length, expected.length);
  assert.equal(new Set(result.tools.map((tool: any) => tool.name)).size, expected.length, 'Duplicate tool identity');
  for (const [name, input, output] of expected) {
    const tool = result.tools.find((row: any) => row.name === name); assert.ok(tool, 'Expected tool is absent');
    equal(tool.inputSchema, input, 'Input schema differs'); equal(tool.outputSchema, output, 'Output schema differs');
    equal(tool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }, 'Tool is not governed read-only');
    equal(tool._meta, { 'okf/untrustedContent': true, securitySchemes: [{ type: 'noauth' }] }, 'Tool trust or authentication metadata differs');
  }
  return discoveryDiagnostic(result);
}
export function compareToolDiscovery(v2: ReturnType<typeof discoveryDiagnostic>, v1: ReturnType<typeof discoveryDiagnostic>) {
  assert.ok(v2.tools_sha256 && v1.tools_sha256, 'Tool rows missing');
  assert.equal(v1.tools_sha256, v2.tools_sha256, 'Complete SDK tool rows differ');
  assert.equal(v1.tool_count, v2.tool_count, 'SDK tool census differs');
}

export type Arguments = { origin: string; sourceVersion: string; worker: string; serviceVersion: string;
  comparisonCommit: string; dwpRoot: string; output: string; executePublic: boolean };
export function parseArguments(args: string[]): Arguments {
  const flags = new Set(['--origin', '--source-version', '--expected-worker-sha256', '--service-version', '--comparison-commit', '--dwp-root', '--out']);
  const values = new Map<string, string>(); let executePublic = false;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--execute-public') { assert.equal(executePublic, false, 'Repeated execution flag'); executePublic = true; continue; }
    assert.ok(flags.has(flag) && !values.has(flag) && args[index + 1] && !args[index + 1].startsWith('--'), 'Explicit unique verification arguments required');
    values.set(flag, args[++index]);
  }
  assert.equal(values.size, flags.size, 'All identity, origin and output arguments are required');
  const origin = values.get('--origin')!; const url = new URL(origin);
  assert.ok(url.protocol === 'https:' && url.origin === origin && !url.username && !url.password && !url.port
    && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(url.hostname) && !/^\d+(?:\.\d+)+$/.test(url.hostname), 'A credential-free public HTTPS origin without a path is required');
  assert.match(values.get('--source-version')!, COMMIT); assert.match(values.get('--comparison-commit')!, COMMIT);
  assert.match(values.get('--expected-worker-sha256')!, HASH); assert.match(values.get('--service-version')!, /^\d+\.\d+\.\d+$/);
  return { origin, sourceVersion: values.get('--source-version')!, worker: values.get('--expected-worker-sha256')!,
    serviceVersion: values.get('--service-version')!, comparisonCommit: values.get('--comparison-commit')!,
    dwpRoot: resolve(values.get('--dwp-root')!), output: resolve(values.get('--out')!), executePublic };
}
export async function noLinks(path: string) {
  const full = resolve(path); let current = parse(full).root;
  for (const part of full.slice(current.length).split('/').filter(Boolean)) {
    current = resolve(current, part); assert.equal((await lstat(current)).isSymbolicLink(), false, 'Linked observation paths are not admitted');
  }
}
export async function boundedFile(path: string, limit = LIMITS.local_file_bytes): Promise<Buffer> {
  await noLinks(path); const before = await lstat(path);
  assert.ok(before.isFile() && before.size <= limit, 'Local input is not a bounded regular file');
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat(); assert.ok(stat.isFile() && stat.size <= limit && stat.dev === before.dev && stat.ino === before.ino && stat.size === before.size, 'Local input changed or exceeds its bound');
    const bytes = Buffer.alloc(stat.size + 1); let length = 0;
    while (length < bytes.length) { const part = await file.read(bytes, length, bytes.length - length, null); if (!part.bytesRead) break; length += part.bytesRead; }
    assert.equal(length, stat.size, 'Local input changed while reading'); return bytes.subarray(0, length);
  } finally { await file.close(); }
}
export function safeRepositoryPath(path: string) {
  assert.match(path, /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/);
  assert.ok(!path.split('/').some(part => part === '.' || part === '..'), 'Unsafe immutable path');
}
function gitFile(root: string, commit: string, path: string, expected?: { bytes: number; sha256: string }) {
  assert.match(commit, COMMIT); safeRepositoryPath(path);
  const key = `${commit}:${path}`;
  const length = Number(execFileSync('git', ['cat-file', '-s', key], { cwd: root, maxBuffer: 100, timeout: 10000 }).toString().trim());
  assert.ok(Number.isSafeInteger(length) && length >= 0 && length <= LIMITS.local_file_bytes, 'Immutable input exceeds its bound');
  if (expected) assert.equal(length, expected.bytes);
  const raw = execFileSync('git', ['show', key], { cwd: root, maxBuffer: length + 1, timeout: 10000 });
  assert.equal(raw.length, length); if (expected) assert.equal(sha(raw), expected.sha256);
  return raw;
}
export type Pair = { source_version: string; engine_id: string };
export function approvedPairs(versions: readonly string[], engines: readonly { engine_id: string; source_versions: readonly string[] }[]): Pair[] {
  assert.ok(versions.length > 0 && versions.length <= 16 && new Set(versions).size === versions.length);
  assert.ok(engines.length > 0 && engines.length <= 3 && new Set(engines.map(row => row.engine_id)).size === engines.length);
  const result: Pair[] = [];
  for (const version of versions) {
    const compatible = engines.filter(engine => engine.source_versions.includes(version));
    assert.ok(compatible.length > 0 && compatible.length <= 2, 'Per-source replay attempt cap exceeded');
    for (const engine of compatible) result.push({ source_version: version, engine_id: engine.engine_id });
  }
  assert.ok(result.length > 0 && result.length <= LIMITS.pairs, 'Source/engine pair cap exceeded');
  return result;
}

/** Actual HTTP wrapper in the CLI; injected fetch/clock are offline-test seams.
 * Every start is paced, every response is bounded, and any failure closes the
 * gate. No retries, redirects, arbitrary endpoints or raw response logging. */
export function boundedRemoteFetch(origin: string, expectedRequests: number, upstream: typeof fetch = fetch,
  timing = { now: () => performance.now(), sleep: (ms: number) => new Promise<void>(done => setTimeout(done, ms)) }) {
  assert.ok(Number.isSafeInteger(expectedRequests) && expectedRequests > 0 && expectedRequests <= LIMITS.requests, 'Predicted request cap exceeded');
  const started = timing.now(); let previous: number | null = null; let queue = Promise.resolve(); let closed = false;
  const receipt = { request_count: 0, received_bytes: 0, interval_ms: LIMITS.interval_ms,
    minimum_observed_interval_ms: null as number | null, automatic_retries: 0, events: [] as any[] };
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init); const url = new URL(request.url);
    assert.ok(url.origin === origin && !url.search && !url.hash && !url.username && !url.password, 'Unapproved HTTP origin or URL');
    assert.ok((url.pathname === '/health' && request.method === 'GET') || (url.pathname === '/okf/mcp' && request.method === 'POST'), 'Unapproved HTTP route or method');
    for (const field of ['authorization', 'cookie', 'proxy-authorization']) assert.equal(request.headers.has(field), false, 'Credentials are not admitted');
    let body = '';
    if (request.method === 'POST' && request.body) {
      const parts: Uint8Array[] = []; let length = 0;
      const reader = request.body.getReader();
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          length += part.value.length;
          if (length > LIMITS.request_bytes) { await reader.cancel(); throw new Error('Request body cap exceeded'); }
          parts.push(part.value);
        }
      } finally { reader.releaseLock(); }
      body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts, length));
    }
    assert.ok(request.method !== 'POST' || body.length > 0, 'An explicit RPC message is required');
    let method: string | null = null, tool: string | null = null;
    if (body) {
      const message = JSON.parse(body); assert.ok(message && !Array.isArray(message) && message.jsonrpc === '2.0');
      method = message.method; assert.ok(['initialize', 'server/discover', 'notifications/initialized', 'tools/list', 'tools/call', 'notifications/cancelled', 'ping'].includes(method!));
      if (method === 'tools/call') {
        tool = message.params?.name; assert.ok(['ask_okf_manifest', 'read_okf_evidence'].includes(tool!));
        assert.ok(PUBLIC_QUESTIONS.includes(message.params.arguments?.question), 'Only an explicit public acceptance question may be sent');
      }
    }
    const admission = queue.then(async () => {
      assert.equal(closed, false, 'Verification stopped after a failure');
      assert.ok(receipt.request_count < expectedRequests, 'Predicted request cap exceeded');
      if (previous !== null) while (timing.now() - previous < LIMITS.interval_ms) await timing.sleep(LIMITS.interval_ms - (timing.now() - previous));
      assert.equal(closed, false, 'Verification stopped after a failure');
      assert.ok(timing.now() - started < LIMITS.run_timeout_ms, 'Run deadline exceeded');
      const at = timing.now();
      if (previous !== null) receipt.minimum_observed_interval_ms = Math.min(receipt.minimum_observed_interval_ms ?? Infinity, at - previous);
      previous = at; receipt.request_count++;
    });
    queue = admission.catch(() => {}); await admission;
    const event: any = { sequence: receipt.request_count, method: request.method, path: url.pathname, rpc_method: method,
      tool, request_sha256: sha(body), started_at: new Date().toISOString(), status: null, response_bytes: 0, response_sha256: null };
    receipt.events.push(event);
    const controller = new AbortController();
    const timeout = Math.min(LIMITS.request_timeout_ms, LIMITS.run_timeout_ms - (timing.now() - started));
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await upstream(request.url, { method: request.method, headers: request.headers, body: body || undefined,
        credentials: 'omit', redirect: 'manual', signal: AbortSignal.any([controller.signal, request.signal]) });
      assert.ok(!response.url || response.url === request.url, 'Unexpected response URL');
      event.status = response.status;
      const declared = response.headers.get('content-length');
      if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > LIMITS.response_bytes)) { await response.body?.cancel(); throw new Error('Response body cap exceeded'); }
      const parts: Uint8Array[] = []; let length = 0;
      if (response.body) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const part = await reader.read(); if (part.done) break;
            length += part.value.length; receipt.received_bytes += part.value.length; event.response_bytes = length;
            if (length > LIMITS.response_bytes || receipt.received_bytes > LIMITS.received_bytes) { await reader.cancel(); throw new Error('Received byte cap exceeded'); }
            parts.push(part.value);
          }
        } finally { reader.releaseLock(); }
      }
      const bytes = Buffer.concat(parts, length); event.response_sha256 = sha(bytes);
      assert.ok(response.ok, 'Non-success HTTP response; no retry');
      assert.ok(!controller.signal.aborted && timing.now() - started < LIMITS.run_timeout_ms, 'Response exceeded deadline');
      return new Response(bytes.length ? bytes : null, { status: response.status, headers: response.headers });
    } catch (error) { closed = true; controller.abort(); event.failure = 'http-verification-failed'; throw error;
    } finally { clearTimeout(timer); }
  };
  return { fetch: fetcher, receipt };
}

export function enforceCensus(caseCalls: number[], extra = 16) {
  assert.ok(caseCalls.every(value => Number.isSafeInteger(value) && value > 0));
  const predicted = caseCalls.reduce((sum, value) => sum + value, extra);
  assert.ok(predicted <= LIMITS.requests, 'Predicted request count cannot fit the fixed cap');
  return predicted;
}

async function preparation(args: Arguments) {
  await noLinks(repositoryRoot); await noLinks(args.dwpRoot);
  const buildRaw = await boundedFile(resolve(serviceRoot, 'dist/build-receipt.json'), 65536);
  const build = JSON.parse(buildRaw.toString());
  assert.equal(build.schema, 'okf-remote-mcp-build.v1'); assert.equal(build.service_version, args.serviceVersion);
  assert.equal(build.outputs?.['dist/server/index.js'], args.worker);
  assert.ok(Object.keys(build.inputs).length <= 128 && Object.keys(build.outputs).length === 2);
  const inputs: Record<string, { bytes: number; sha256: string }> = {};
  const check = async (path: string, digest?: string) => {
    const absolute = resolve(serviceRoot, path); const local = relative(repositoryRoot, absolute).replaceAll('\\', '/');
    safeRepositoryPath(local);
    if (inputs[local]) { if (digest) assert.equal(inputs[local].sha256, digest); return; }
    assert.ok(/^(services\/ask-okf-mcp\/(src\/[^/]+\.ts|scripts\/(build\.mjs|engine-admission\.mjs|verify-approved-versions\.ts|verify-delivery\.mjs|verification-cases\.mjs|verify-versioned-remote\.ts)|vendor\/[^/]+\.json|vendor\/engines\/[a-f0-9]{40}\/(index\.ts|corpus\.ts|corpusV3\.ts|types\.ts|unit\.ts|manifest\.json)|package(?:-lock)?\.json)|apps\/okf-explorer\/src\/lib\/context\/(index|types|corpus|corpusV3|delivery|unit)\.ts|profiles\/context-assembly\/v1\/(common|package|evidence-unit)\.schema\.json)$/.test(local), 'Build input is outside the reviewed runtime families');
    const raw = await boundedFile(absolute); if (digest) assert.equal(sha(raw), digest);
    equal(sha(gitFile(repositoryRoot, args.comparisonCommit, local)), sha(raw), 'Comparator input differs from exact commit');
    inputs[local] = { bytes: raw.length, sha256: sha(raw) };
    // Bind every statically imported local helper before evaluation. The build
    // receipt alone must not be able to omit a transitive comparator input.
    if (/\.(?:ts|mjs)$/.test(local)) for (const match of raw.toString().matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)(['"])([^'"]+)\1/g)) {
      if (!match[2].startsWith('.')) continue;
      const imported = resolve(dirname(absolute), match[2].replace(/\?raw$/, ''));
      await check(relative(serviceRoot, imported).replaceAll('\\', '/'));
    }
  };
  for (const [path, digest] of Object.entries(build.inputs)) { assert.match(String(digest), HASH); await check(path, String(digest)); }
  for (const path of ['scripts/verify-versioned-remote.ts', 'scripts/verify-approved-versions.ts', 'scripts/verify-delivery.mjs', 'scripts/verification-cases.mjs', '../../apps/okf-explorer/src/lib/context/types.ts']) await check(path);
  for (const [path, digest] of Object.entries(build.outputs)) {
    assert.ok(['dist/server/index.js', 'dist/node.mjs'].includes(path)); assert.equal(sha(await boundedFile(resolve(serviceRoot, path))), digest);
  }
  // Imports happen only after all executable comparator inputs and erased types
  // match the operator's immutable comparison commit.
  const registry = await import('../src/registry.ts');
  const engines = await import('../src/engines.ts');
  const replay = await import('../src/replay.ts');
  const delivery = await import('../../../apps/okf-explorer/src/lib/context/delivery.ts');
  const { bindEvidenceRead } = await import('../src/replayDelivery.ts');
  const { reviewLink } = await import('../src/deliveryContracts.ts');
  const { approvedLoader } = await import('./verify-approved-versions.ts');
  const { corpusAssetReferences } = await import('../src/corpusAssets.ts');
  assert.equal(registry.SERVICE_VERSION, args.serviceVersion); assert.equal(registry.BUNDLE_VERSION, args.sourceVersion);
  const pairs = approvedPairs(registry.APPROVED_VERSIONS, engines.ENGINES);
  const loader = await approvedLoader();
  const files: Record<string, { bytes: number; sha256: string }> = {}; let acquiredBytes = 0;
  const cache = new Map<string, Uint8Array>();
  const sources = new Map<string, any>();
  const fetchers = new Map<string, typeof fetch>();
  const acquire = (version: string, path: string, ref?: { bytes: number; sha256: string }) => {
    const key = `${version}:${path}`;
    if (!cache.has(key)) {
      assert.ok(cache.size < LIMITS.source_files, 'Local source file cap exceeded');
      const bytes = gitFile(args.dwpRoot, version, path, ref); acquiredBytes += bytes.length;
      assert.ok(acquiredBytes <= LIMITS.source_bytes, 'Local source byte cap exceeded');
      cache.set(key, bytes); files[key] = { bytes: bytes.length, sha256: sha(bytes) };
    }
    return cache.get(key)!;
  };
  try {
    for (const version of registry.APPROVED_VERSIONS) {
      const source = await loader.loadApprovedSource(version); sources.set(version, source);
      const prefix = `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${version}/`;
      assert.ok(source.binding.index_url.startsWith(prefix));
      const raw = acquire(version, source.binding.index_url.slice(prefix.length)); assert.equal(sha(raw), source.binding.index_sha256);
      equal(JSON.parse(new TextDecoder().decode(raw)), 'manifest' in source ? source.manifest : source.index, 'Vendored source differs from immutable DWP bytes');
      const refs = new Map<string, any>();
      if ('manifest' in source) for (const ref of corpusAssetReferences(source.manifest)) {
        const url = new URL(ref.path, source.binding.index_url).href; assert.ok(url.startsWith(prefix)); refs.set(url, ref);
      }
      fetchers.set(version, async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const ref = refs.get(url); assert.ok(ref, 'Local comparator may read only manifest-listed Git blobs');
        assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
        return new Response(acquire(version, url.slice(prefix.length), ref) as BodyInit);
      });
    }
    const cases: any[] = [];
    for (const [index, pair] of pairs.entries()) {
      const request = { bundle: 'okf-dwp', version: pair.source_version,
        ...(pair.source_version === args.sourceVersion && pair.engine_id === engines.CURRENT_ENGINE_ID ? {} : { engine_id: pair.engine_id }),
        question: PUBLIC_QUESTION, budget: { max_bytes: 524288 } };
      const result = await replay.resolveReplay(sources.get(pair.source_version), request, fetchers.get(pair.source_version)!);
      cases.push({ id: `pair-${String(index).padStart(2, '0')}`, case_kind: 'approved-source-engine-pair', request, ...result,
        inspectRecord: pair.source_version === args.sourceVersion && pair.engine_id === engines.CURRENT_ENGINE_ID });
    }
    const emptyRequest = { bundle: 'okf-dwp', version: args.sourceVersion, engine_id: engines.CURRENT_ENGINE_ID,
      question: PUBLIC_UNKNOWN_QUESTION, budget: { max_bytes: 524288 } };
    const empty = await replay.resolveReplay(sources.get(args.sourceVersion), emptyRequest, fetchers.get(args.sourceVersion)!);
    assert.equal(empty.context.evidence_status, 'insufficient'); assert.equal(empty.context.selected.length, 0);
    cases.push({ id: 'current-unknown-empty-control', case_kind: 'current-empty-control', request: emptyRequest, ...empty, inspectRecord: false });
    const oldRaw = await boundedFile(resolve(serviceRoot, 'validation/approved-versions-0.5.0.json'));
    assert.equal(sha(oldRaw), ORIGINAL_RECEIPT_SHA);
    const original = JSON.parse(oldRaw.toString()).compact_delivery_versions.find((row: any) => row.id === 'staff-care-home-compact-delivery');
    assert.equal(original.bundle_version, ORIGINAL_CARE_SOURCE); assert.equal(original.question_sha256, sha(PUBLIC_QUESTION));
    const historicalRequest = { bundle: 'okf-dwp', version: ORIGINAL_CARE_SOURCE, question: PUBLIC_QUESTION,
      budget: original.context_budget, context_id: original.context_id };
    assert.ok(sources.has(ORIGINAL_CARE_SOURCE), 'The original care-home source must remain approved');
    const historical = await replay.resolveReplay(sources.get(ORIGINAL_CARE_SOURCE), historicalRequest, fetchers.get(ORIGINAL_CARE_SOURCE)!);
    assert.equal(historical.identity.package_sha256, original.package_canonical_sha256);
    cases.push({ id: 'original-0.5-care-home-unspecified-engine', case_kind: 'historical-original-package', request: historicalRequest, ...historical, inspectRecord: true });
    const enriched = [];
    for (const item of cases) enriched.push(await prepareDelivery(item, args.origin, { delivery, bindEvidenceRead, reviewLink }));
    const incompatible = registry.APPROVED_VERSIONS.flatMap(version => engines.ENGINES.filter(engine => !engine.source_versions.includes(version)).map(engine => ({ version, engine_id: engine.engine_id })))[0] ?? null;
    const negatives = negativeControls(enriched[0].pinned, incompatible);
    const { createAskService, PUBLIC_ORIGIN } = await import('../src/service.ts');
    const localService = createAskService({ loadContext: async (version = args.sourceVersion) => { const source = sources.get(version); assert.ok(source); return source; },
      fetchCorpus: async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const version = registry.APPROVED_VERSIONS.find(version => url.startsWith(`https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${version}/`));
        assert.ok(version, 'Local negative controls cannot fetch external sources'); return fetchers.get(version)!(input, init);
      } });
    try {
      for (const [index, control] of negatives.entries()) {
        const response = await localService.fetch(new Request(PUBLIC_ORIGIN + '/okf/mcp', negativeRequest(control.args, index + 1)));
        assert.equal(response.status, 200);
        control.expected = verifyNegativeEnvelope(await boundedErrorBody(response), index + 1);
      }
    } finally { await localService.close(); }
    const controls = negatives.length;
    // Health (1), SDK setup/discovery/close allowances (2 × 4), one v1
    // manifest comparison (1), and negative controls. No full ask_okf calls.
    const overhead = 10 + controls;
    const predicted = enforceCensus(enriched.map(row => row.calls), overhead);
    return { args, buildRaw, build, inputs, files, cases: enriched, pairs, incompatible, negatives, predicted, overhead, controls,
      registry, engines, loader, oldReceiptSha: sha(oldRaw), sourceBytes: acquiredBytes };
  } catch (error) { await loader.close(); throw error; }
}

export async function prepareDelivery(item: any, origin: string, helpers: { delivery: any; bindEvidenceRead: any; reviewLink: any }) {
  const { delivery, bindEvidenceRead, reviewLink } = helpers;
      const context = item.context, identity = item.identity;
      const budget = { max_nodes: context.budget.max_nodes, max_relationships: context.budget.max_relationships, max_depth: context.budget.max_depth, max_bytes: context.budget.max_bytes };
      const pinned = { bundle: 'okf-dwp' as const, version: item.request.version, question: item.request.question, budget, context_id: context.context_id, engine_id: identity.engine_id };
      const manifests: any[] = []; let offset: number | null = 0;
      do {
        const proof = offset === 0 ? identity : { ...identity, mode: 'explicit-engine', original_engine_id: identity.engine_id, matching_engine_ids: [identity.engine_id] };
        const extra = { replay: { bundle: 'okf-dwp', version: item.request.version, budget, engine_id: identity.engine_id },
          replay_identity: proof, review_url: reviewLink(origin, pinned), response_bytes: 0, response_limit: 16384 };
        const reserve = Buffer.byteLength(JSON.stringify(extra)) + 32;
        const result: any = { ...await delivery.contextManifest(context, { offset, max_bytes: 16384 - reserve }), ...extra };
        for (let i = 0; i < 4; i++) result.response_bytes = Buffer.byteLength(JSON.stringify(result));
        assert.ok(result.response_bytes <= 16384); manifests.push(result); offset = result.delivery.next_offset;
        assert.ok(manifests.length <= LIMITS.pages_per_value);
      } while (offset !== null);
      const reads: any[] = [];
      const selected = item.inspectRecord ? context.selected.find((row: any) => row.record.kind === 'evidence') : undefined;
      for (const [section, record_id] of [['package', undefined], ...(selected ? [['record_text', selected.record.id], ['record_metadata', selected.record.id], ['diagnostics', undefined]] : [])]) {
        const identity = { ...item.identity, mode: 'explicit-engine', original_engine_id: item.identity.engine_id, matching_engine_ids: [item.identity.engine_id] };
        const reserve = Buffer.byteLength(JSON.stringify({ replay_identity: identity })) + 32;
        const parts: any[] = []; let offset: number | null = 0;
        do {
          const part: any = await delivery.readContextEvidence(context, { context_id: context.context_id, section: section as any, record_id, offset, max_bytes: 65536 - reserve });
          const result: any = bindEvidenceRead(part, identity as any, 65536); parts.push(result); offset = result.next_offset;
          assert.ok(parts.length <= LIMITS.pages_per_value);
        } while (offset !== null);
        reads.push({ section, record_id, parts });
      }
      return { ...item, pinned, manifests, reads, calls: manifests.length + reads.reduce((sum, read) => sum + read.parts.length, 0) };
}

function toolValue(result: any) {
  assert.equal(result.isError, undefined); assert.ok(result.structuredContent);
  assert.ok(result.content?.[0]?.type === 'text'); equal(JSON.parse(result.content[0].text), result.structuredContent, 'Text and structured values differ');
  return result.structuredContent;
}
export async function verifyDelivery(client: { callTool(args: any): Promise<any> }, item: any, origin: string) {
  const records: string[] = []; const results: any[] = [];
  for (let index = 0; index < item.manifests.length; index++) {
    const expected = item.manifests[index];
    const args = index === 0 ? { ...item.request, ...(item.identity.mode === 'current-default' ? {} : { context_id: item.context.context_id }) } : item.pinned;
    const response = await client.callTool({ name: 'ask_okf_manifest', arguments: { ...args, offset: expected.delivery.offset, delivery_bytes: 16384 } });
    const value = toolValue(response); equal(value, expected, 'Remote catalogue differs from pinned local assembly');
    assert.equal(response.content.length, 2); assert.equal(response.content[1].type, 'resource_link');
    assert.equal(response.content[1].uri, expected.review_url); assert.equal(new URL(expected.review_url).origin, origin);
    records.push(...value.records.map((record: any) => record.id));
  }
  equal(records, item.context.selected.map((row: any) => row.record.id), 'Catalogue order differs');
  let complete = '';
  for (const read of item.reads) {
    const chunks: string[] = [];
    for (const expected of read.parts) {
      const response = await client.callTool({ name: 'read_okf_evidence', arguments: { ...item.pinned, section: read.section,
        ...(read.record_id ? { record_id: read.record_id } : {}), offset: expected.offset, delivery_bytes: 65536 } });
      const value = toolValue(response); equal(value, expected, 'Remote evidence slice differs from exact local reference');
      assert.equal(response.content.length, 1); chunks.push(value.data);
    }
    const value = chunks.join(''); assert.equal(sha(value), read.parts[0].content_sha256);
    if (read.section === 'package') { assert.equal(value, canonical(item.context)); complete = value; }
    results.push({ section: read.section, record_id: read.record_id ?? null, slices: chunks.length, content_sha256: sha(value), characters: value.length });
  }
  assert.ok(complete); assert.equal(sha(complete), item.identity.package_sha256);
  return { complete, receipt: { id: item.id, case_kind: item.case_kind, question_sha256: sha(item.request.question ?? PUBLIC_QUESTION), context_budget: item.pinned.budget, compact_text_structured_values_equal: true, source_version: item.request.version, engine_id: item.identity.engine_id,
    context_id: item.context.context_id, canonical_package_sha256: sha(complete), package_bytes: Buffer.byteLength(complete),
    evidence_status: item.context.evidence_status, selected_records: item.context.selected.length, relationships: item.context.relationships.length,
    catalogue_pages: item.manifests.length, ordered_catalogue: true, complete_package_matches_local_reference: true,
    provenance_sha256: sha(canonical(item.context.selected.map((row: any) => ({ id: row.record.id, provenance: row.record.provenance })))),
    historical_origin: item.identity.mode === 'historical-compatible' ? 'unspecified' : 'explicit-pinned-reconstruction', reads: results } };
}

export function negativeControls(sample: any, incompatible: { version: string; engine_id: string } | null): Array<{ id: string; args: any; expected?: any }> {
  return [
    { id: 'unknown-engine', args: { ...sample, engine_id: 'urn:okf:context-engine:sha256:' + '0'.repeat(64) } },
    { id: 'unknown-source', args: { ...sample, version: '0'.repeat(40) } },
    { id: 'pinned-context-mismatch', args: { ...sample, context_id: 'urn:sha256:' + '0'.repeat(64) } },
    { id: 'historical-unavailable', args: { ...sample, engine_id: undefined, context_id: 'urn:sha256:' + '0'.repeat(64) } },
    ...(incompatible ? [{ id: 'incompatible-engine-source', args: { ...sample, ...incompatible } }] : [])
  ];
}
function negativeRequest(args: any, id: number): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'ask_okf_manifest', arguments: args } }) };
}
async function boundedErrorBody(response: Response) {
  assert.ok(response.body, 'Negative-control response has no body');
  const reader = response.body.getReader(); const parts: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length;
      if (length > 8192) { await reader.cancel(); throw new Error('Negative-control response exceeds its bound'); } parts.push(part.value); }
  } finally { reader.releaseLock(); }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts, length));
}
/** Parse one complete bounded RPC envelope, never just the first SSE event. */
export function verifyNegativeEnvelope(raw: string, id: number, expected?: unknown) {
  assert.ok(Buffer.byteLength(raw) <= 8192, 'Negative-control response exceeds its bound');
  let payload = raw;
  if (!raw.trimStart().startsWith('{')) {
    const event = /^event: message\r?\ndata: ([^\r\n]+)\r?\n(?:\r?\n)*$/.exec(raw);
    assert.ok(event, 'Expected exactly one complete error-only SSE event'); payload = event[1];
  }
  const parsed = JSON.parse(payload);
  // The local service emits compact JSON. Requiring its lossless parse/write
  // representation rejects duplicate keys whose earlier values would vanish.
  assert.equal(payload, JSON.stringify(parsed), 'Error JSON is not its lossless compact representation');
  equal(Object.keys(parsed).sort(), ['id', 'jsonrpc', 'result'], 'Unexpected error-envelope fields');
  assert.equal(parsed.jsonrpc, '2.0'); assert.equal(parsed.id, id);
  equal(Object.keys(parsed.result).sort(), ['content', 'isError'], 'Unexpected error-result fields');
  assert.equal(parsed.result.isError, true); assert.equal(parsed.result.content.length, 1);
  const block = parsed.result.content[0]; equal(Object.keys(block).sort(), ['text', 'type'], 'Expected one error-only text block');
  assert.equal(block.type, 'text'); assert.ok(typeof block.text === 'string' && block.text.length > 0 && Buffer.byteLength(block.text) <= 4096);
  if (expected !== undefined) equal(parsed, expected, 'Remote error differs from the exact local error-only result');
  return parsed;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv); await noLinks(dirname(args.output)); await mkdir(args.output);
  const started = new Date().toISOString(); let prepared: Awaited<ReturnType<typeof preparation>> | undefined;
  let remote: ReturnType<typeof boundedRemoteFetch> | undefined; const completed: any[] = [];
  const runnerRaw = await boundedFile(fileURLToPath(import.meta.url));
  let stage = 'offline-preparation', activeCaseId: string | null = null;
  const discoveries: Partial<Record<'sdk_v1' | 'sdk_v2', ReturnType<typeof discoveryDiagnostic>>> = {};
  try {
    prepared = await preparation(args);
    const plan = { schema: 'okf-versioned-remote-plan.v1', classification: 'offline-local-reference-plan',
      origin: args.origin, expected_service_version: args.serviceVersion, expected_current_source: args.sourceVersion,
      expected_worker_sha256: args.worker, comparison_commit: args.comparisonCommit,
      build_receipt_sha256: sha(prepared.buildRaw), runner_sha256: sha(runnerRaw), limits: LIMITS,
      source_engine_pairs: prepared.pairs, predicted_request_upper_bound: prepared.predicted,
      census: { cases: prepared.cases.map(item => ({ id: item.id, case_kind: item.case_kind, question_sha256: sha(item.request.question), context_budget: item.pinned.budget, calls: item.calls, package_bytes: Buffer.byteLength(canonical(item.context)),
        context_id: item.context.context_id, package_sha256: item.identity.package_sha256 })), setup_and_control_allowance: prepared.overhead },
      negative_controls: prepared.negatives.map(row => ({ id: row.id, expected_error: row.expected })),
      incompatible_pair_control: prepared.incompatible ?? 'No incompatible pair among this release registry; not claimed as tested.',
      question_sha256: sha(PUBLIC_QUESTION), public_question_sha256: PUBLIC_QUESTIONS.map(sha), full_ask_okf_calls: 0, network_calls: 0,
      comparator_inputs: prepared.inputs, source_files: prepared.files, source_bytes: prepared.sourceBytes,
      worker_identity_boundary: 'Expected Worker digest verifies the exact local comparator. Health cannot attest hosted Worker bytes; separate hosting publication evidence is required.' };
    await writeFile(resolve(args.output, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
    await writeFile(resolve(args.output, 'executed-verifier.ts'), runnerRaw, { flag: 'wx' });
    await writeFile(resolve(args.output, 'build-receipt.json'), prepared.buildRaw, { flag: 'wx' });
    if (!args.executePublic) { console.log(JSON.stringify({ mode: 'offline-plan-only', predicted_requests: prepared.predicted, pairs: prepared.pairs.length })); return; }
    // Only this explicit CLI branch supplies actual global fetch to the gate.
    remote = boundedRemoteFetch(args.origin, prepared.predicted);
    stage = 'public-health';
    const healthResponse = await remote.fetch(new URL('/health', args.origin));
    const health = await healthResponse.json();
    const { registry, engines } = prepared;
    const expectedHealth = { service: 'ask-okf', version: args.serviceVersion, ready: true, bundle: registry.APPROVED_BUNDLE.id,
      bundle_version: args.sourceVersion, snapshot: registry.APPROVED_BUNDLE.snapshot, index_sha256: registry.APPROVED_BUNDLE.index_sha256,
      approved_versions: [...registry.APPROVED_VERSIONS], engine: 'okf-context-assembly.v1', engine_id: engines.CURRENT_ENGINE_ID,
      approved_engines: engines.ENGINE_CATALOGUE };
    equal(health, expectedHealth, 'Actual health/source/engine catalogue differs from the approved comparator');
    stage = 'sdk-imports';
    const [{ Client, StreamableHTTPClientTransport }, { CfWorkerJsonSchemaValidator }, oldClient, oldTransport, contracts, delivery] = await Promise.all([
      import('@modelcontextprotocol/client'), import('@modelcontextprotocol/client/validators/cf-worker'),
      import('@modelcontextprotocol/sdk/client/index.js'), import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
      import('../src/contracts.ts'), import('../src/deliveryContracts.ts')]);
    const endpoint = new URL('/okf/mcp', args.origin);
    const reconnect = { maxRetries: 0, maxReconnectionDelay: 1000, initialReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 };
    const expectedContracts: ToolContract[] = [
      ['ask_okf', contracts.INPUT_SCHEMA, contracts.OUTPUT_SCHEMA],
      ['ask_okf_manifest', delivery.MANIFEST_INPUT_SCHEMA, delivery.MANIFEST_OUTPUT_SCHEMA],
      ['read_okf_evidence', delivery.EVIDENCE_INPUT_SCHEMA, delivery.EVIDENCE_OUTPUT_SCHEMA]
    ];
    const client = new Client({ name: 'okf-versioned-live-verifier', version: '1.0.0' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator(), versionNegotiation: { mode: { pin: '2026-07-28' } } });
    try {
      stage = 'sdk-v2-connect';
      await client.connect(new StreamableHTTPClientTransport(endpoint, { fetch: remote.fetch, reconnectionOptions: reconnect }));
      stage = 'sdk-v2-tools-list'; const tools = await client.listTools();
      discoveries.sdk_v2 = discoveryDiagnostic(tools); stage = 'sdk-v2-tools-contract';
      validateToolDiscovery(tools, expectedContracts, 'v2', args.serviceVersion);
      for (const item of prepared.cases) {
        stage = 'sdk-v2-evidence-delivery'; activeCaseId = item.id;
        const result = await verifyDelivery(client as any, item, args.origin); completed.push(result.receipt);
        await writeFile(resolve(args.output, `${item.id}.received-package.json.gz`), gzipSync(result.complete, { level: 9 }), { flag: 'wx' });
      }
      activeCaseId = null;
    } finally { await client.close(); }
    const legacy = new oldClient.Client({ name: 'okf-versioned-legacy-live-verifier', version: '1.0.0' });
    try {
      stage = 'sdk-v1-connect';
      await legacy.connect(new oldTransport.StreamableHTTPClientTransport(endpoint, { fetch: remote.fetch, reconnectionOptions: reconnect }));
      stage = 'sdk-v1-tools-list'; const tools = await legacy.listTools();
      discoveries.sdk_v1 = discoveryDiagnostic(tools); stage = 'sdk-v1-tools-contract';
      validateToolDiscovery(tools, expectedContracts, 'v1', args.serviceVersion);
      stage = 'cross-sdk-tool-rows'; compareToolDiscovery(discoveries.sdk_v2!, discoveries.sdk_v1);
      const first = prepared.cases.find(item => item.inspectRecord && item.request.version === args.sourceVersion)!;
      stage = 'sdk-v1-evidence-catalogue';
      const result = toolValue(await legacy.callTool({ name: 'ask_okf_manifest', arguments: { ...first.request, delivery_bytes: 16384 } }));
      equal(result, first.manifests[0], 'Legacy SDK catalogue differs');
    } finally { await legacy.close(); }
    stage = 'negative-controls';
    const negatives = prepared.negatives;
    for (const [index, control] of negatives.entries()) {
      const response = await remote.fetch(endpoint, negativeRequest(control.args, index + 1));
      verifyNegativeEnvelope(await boundedErrorBody(response), index + 1, control.expected);
    }
    stage = 'post-run-immutable-inputs';
    // A local source or verifier edit during the live run invalidates acceptance.
    for (const [path, ref] of Object.entries(prepared.inputs)) assert.equal(sha(await boundedFile(resolve(repositoryRoot, path))), ref.sha256);
    assert.equal(sha(await boundedFile(fileURLToPath(import.meta.url))), sha(runnerRaw));
    const artifacts: Record<string, any> = {};
    for (const name of ['plan.json', 'executed-verifier.ts', 'build-receipt.json', ...prepared.cases.map(item => `${item.id}.received-package.json.gz`)]) {
      const raw = await boundedFile(resolve(args.output, name)); artifacts[name] = { bytes: raw.length, sha256: sha(raw) };
    }
    stage = 'retain-observation';
    await writeFile(resolve(args.output, 'observation.json'), JSON.stringify({ schema: 'okf-versioned-remote-verification.v1',
      classification: 'actual-public-http', passed: true, started_at: started, completed_at: new Date().toISOString(),
      origin: args.origin, expected_service_version: args.serviceVersion, expected_worker_sha256: args.worker,
      deployed_worker_bytes_independently_verified: false, comparison_commit: args.comparisonCommit,
      current_source_version: args.sourceVersion, engine_catalogue: health.approved_engines, observed_health: health,
      build_receipt_sha256: sha(prepared.buildRaw), runner_sha256: sha(runnerRaw), original_0_5_receipt_sha256: prepared.oldReceiptSha,
      tools_canonical_sha256: discoveries.sdk_v2!.result_sha256, tool_discovery: discoveries, complete_tool_rows_equal: true, sdk_v2: '2.0.0 / 2026-07-28', sdk_v1: '1.30.0',
      predicted_request_upper_bound: prepared.predicted, transport: remote.receipt, cases: completed,
      negative_controls: negatives.map(row => ({ id: row.id, no_evidence_returned: true, expected_error_canonical_sha256: sha(canonical(row.expected)) })),
      incompatible_pair_control: prepared.incompatible ? 'passed' : 'not-applicable-no-incompatible-approved-pair',
      artifacts, model_calls: 0, full_ask_okf_calls: 0,
      limitations: ['Hosting evidence is required to attest deployed Worker bytes; health alone establishes only reported source/engine/service identities.',
        'Exact package/provenance delivery is not legal correctness, complete evidence, specialist acceptance, ChatGPT or Voice acceptance.',
        'The retained packages contain only the two fixed public acceptance questions. Anonymous user questions are never sampled.'] }, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ passed: true, pairs: prepared.pairs.length, historical_cases: 1, requests: remote.receipt.request_count, receipt: resolve(args.output, 'observation.json') }));
  } catch (error) {
    await writeFile(resolve(args.output, 'failure.json'), JSON.stringify({ schema: 'okf-versioned-remote-failure.v1',
      classification: remote ? 'actual-public-http-failed' : 'offline-admission-failed', started_at: started, failed_at: new Date().toISOString(),
      runner_sha256: sha(runnerRaw), comparison_commit: args.comparisonCommit, expected_worker_sha256: args.worker,
      completed_cases: completed, transport: remote?.receipt ?? { request_count: 0 }, failure: 'verification-failed-no-retry',
      failure_stage: stage, active_case_id: activeCaseId, tool_discovery: discoveries, raw_errors_retained: false }, null, 2) + '\n', { flag: 'wx' });
    throw error;
  } finally { await prepared?.loader.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main().catch(() => {
  console.error('Versioned verification failed. No retry was made; inspect the fresh output directory for its bounded failure record.');
  process.exitCode = 1;
});
