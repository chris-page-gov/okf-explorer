import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Client as LegacyClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport as LegacyTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { assembleContext, canonicalJson, contextSha256 } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { assembleCorpusContext, corpusBucket, validateContextCorpusManifest } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';
import { createAskService, PUBLIC_ORIGIN, type Diagnostic } from '../src/service.ts';
import { createCorpusFetcher } from '../src/corpusFetch.ts';
import { BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, APPROVED_BUNDLE, STAFF_APPROVED_BUNDLE,
  PREVIOUS_APPROVED_BUNDLE, APPROVED_VERSIONS, verifyBundledCorpus, verifyBundledContext } from '../src/registry.ts';
import type { ContextRecord } from '../../../apps/okf-explorer/src/lib/context/types.ts';

const indexText = await readFile(new URL('../vendor/okf-dwp-assembly-index.json', import.meta.url), 'utf8');
const descriptorText = await readFile(new URL('../vendor/okf-dwp-descriptor.json', import.meta.url), 'utf8');
const manifestText = await readFile(new URL('../vendor/okf-dwp-corpus-manifest.json', import.meta.url), 'utf8');
const staffManifestText = await readFile(new URL('../vendor/okf-dwp-staff-corpus-manifest.json', import.meta.url), 'utf8');
const previousManifestText = await readFile(new URL('../vendor/okf-dwp-previous-corpus-manifest.json', import.meta.url), 'utf8');
const legacy = await verifyBundledContext(indexText, descriptorText);
const question = 'hospital';
const encoder = new TextEncoder();

async function fixture(transportRedirect: 'error' | 'manual' = 'error') {
  const files = new Map<string, Uint8Array>();
  const reference = async (path: string, value: unknown, compressed = false) => {
    const decoded = encoder.encode(JSON.stringify(value));
    const raw = compressed ? new Uint8Array(gzipSync(decoded)) : decoded;
    files.set(path, raw);
    return { path, bytes: raw.length, sha256: createHash('sha256').update(raw).digest('hex'),
      ...(compressed ? { encoding: 'gzip' as const, decoded_bytes: decoded.length, decoded_sha256: createHash('sha256').update(decoded).digest('hex') } : {}) };
  };
  const text = 'Synthetic hospital source passage used only to test transport parity. This is not legal guidance.';
  const record: ContextRecord = { id: 'https://example.test/id/page/hospital/1', route: 'page/hospital/1',
    label: 'Synthetic hospital page', kind: 'evidence', text, assertion_status: 'normalized',
    authority: { class: 'synthetic', label: 'Synthetic transport fixture', source: 'https://example.test/source.pdf#page=1' },
    scope: 'Synthetic transport fixture only', provenance: [{ url: 'https://example.test/source.pdf#page=1',
      source_sha256: await contextSha256('synthetic pdf'), locator: 'PDF page 1', captured_at: '2026-09-19T00:00:00Z',
      literal_sha256: await contextSha256(text) }], rights: 'https://example.test/licence', access: 'public' };
  const base = { ...legacy.index, scope: 'Synthetic discovery transport fixture', requirements: [] };
  const baseRef = await reference('base-index.json', base);
  const recordRef = await reference('records/0000.json.gz', { schema: 'okf-context-records.v1', first_ordinal: 0, records: [record] }, true);
  const shards: Record<string, Awaited<ReturnType<typeof reference>>> = {};
  for (let i = 0; i < 256; i++) {
    const bucket = i.toString(16).padStart(2, '0');
    shards[bucket] = await reference(`search/${bucket}.json.gz`, { schema: 'okf-context-postings.v1',
      postings: bucket === corpusBucket(question) ? { hospital: [0] } : {} }, true);
  }
  const manifest = validateContextCorpusManifest({ schema: 'okf-context-corpus.v1',
    bundle: { id: 'https://example.test/id/corpus', snapshot: 'synthetic-corpus-v1', source_url: 'https://example.test/' },
    scope: 'Synthetic discovery fixture only', limitations: ['No legal content or completeness requirements.'],
    semantic_source_snapshot: legacy.index.bundle.snapshot, base_index: baseRef,
    records: { count: 1, shards: [{ ...recordRef, first_ordinal: 0, count: 1 }] },
    search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1', shards },
    counts: { documents: 1, pages: 1, nonempty_pages: 1, empty_pages: 0, tokenless_pages: 0 } });
  const binding = { index_url: 'https://example.test/corpus/manifest.json', index_sha256: await contextSha256(JSON.stringify(manifest)) };
  const requested: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.origin, 'https://example.test');
    assert.ok(url.pathname.startsWith('/corpus/'));
    assert.equal(init?.redirect, transportRedirect); assert.equal(init?.credentials, 'omit');
    const path = url.pathname.slice('/corpus/'.length); requested.push(path);
    const raw = files.get(path); assert.ok(raw, `Unknown corpus fetch ${path}`);
    return new Response(raw as BodyInit);
  };
  return { source: { manifest, binding }, fetcher, files, requested };
}

test('vendored corpus identity verifies, and modified manifest bytes fail closed', async () => {
  const approved = await verifyBundledCorpus(manifestText);
  assert.equal(approved.manifest.records.count, 18197);
  assert.equal(approved.manifest.counts.pages, 19090);
  assert.equal(approved.binding.index_sha256, APPROVED_BUNDLE.index_sha256);
  await assert.rejects(verifyBundledCorpus(manifestText + ' '), /integrity/);
});

test('current and earlier corpus versions retain separate immutable identities', async () => {
  const current = await verifyBundledCorpus(manifestText);
  const staff = await verifyBundledCorpus(staffManifestText, STAFF_BUNDLE_VERSION);
  const previous = await verifyBundledCorpus(previousManifestText, PREVIOUS_BUNDLE_VERSION);
  assert.equal(PREVIOUS_BUNDLE_VERSION, 'bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752');
  assert.equal(PREVIOUS_APPROVED_BUNDLE.index_sha256, 'aa9726ba72b7495323b031f149fa13cffeae0aa8fc868af63b7af3cac0e6be95');
  assert.equal(previous.binding.index_url, `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${PREVIOUS_BUNDLE_VERSION}/full-dmg/context/corpus/manifest.json`);
  assert.equal(current.binding.index_url, `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${BUNDLE_VERSION}/combined/context/corpus/manifest.json`);
  assert.deepEqual(APPROVED_VERSIONS, [BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION]);
  assert.equal(STAFF_BUNDLE_VERSION, '9de52acf1db84b27f8933d80480eaa850e74fa33');
  assert.equal(staff.binding.index_sha256, STAFF_APPROVED_BUNDLE.index_sha256);
  assert.notEqual(current.manifest.base_index.sha256, staff.manifest.base_index.sha256);
  assert.deepEqual(staff.manifest.records, current.manifest.records);
  assert.deepEqual(staff.manifest.search, current.manifest.search);
  await assert.rejects(verifyBundledCorpus(staffManifestText), /integrity/);
  await assert.rejects(verifyBundledCorpus(manifestText, STAFF_BUNDLE_VERSION), /integrity/);
  await assert.rejects(verifyBundledCorpus(staffManifestText + ' ', STAFF_BUNDLE_VERSION), /integrity/);
  assert.notEqual(current.manifest.bundle.snapshot, previous.manifest.bundle.snapshot);
  assert.notEqual(current.manifest.base_index.sha256, previous.manifest.base_index.sha256);
  // A semantic revision does not re-acquire or rewrite the immutable source pages.
  assert.deepEqual(current.manifest.records, previous.manifest.records);
  assert.deepEqual(current.manifest.search, previous.manifest.search);
  await assert.rejects(verifyBundledCorpus(manifestText, PREVIOUS_BUNDLE_VERSION), /integrity/);
  await assert.rejects(verifyBundledCorpus(previousManifestText), /integrity/);
  await assert.rejects(verifyBundledCorpus(previousManifestText + ' ', PREVIOUS_BUNDLE_VERSION), /integrity/);
  for (const version of ['main', 'https://example.test/corpus.json', LEGACY_BUNDLE_VERSION]) {
    await assert.rejects(verifyBundledCorpus(manifestText, version), /not approved/);
  }
});

for (const protocol of ['current', 'legacy'] as const) test(`official ${protocol} SDK returns the same shared corpus package`, async () => {
  const f = await fixture(); const log: Diagnostic[] = []; const versions: Array<string | undefined> = [];
  const service = createAskService({ loadContext: async version => { versions.push(version); return version === LEGACY_BUNDLE_VERSION ? legacy : f.source; },
    fetchCorpus: f.fetcher, diagnostics: row => log.push(row) });
  const expected = await assembleCorpusContext(f.source.manifest, f.source.binding, question, {}, f.fetcher);
  const endpoint = new URL(`${PUBLIC_ORIGIN}/okf/mcp`);
  const fetcher: typeof fetch = async (input, init) => service.fetch(new Request(input, init));
  const client = protocol === 'current'
    ? new Client({ name: 'okf-corpus-transport-fixture', version: '1' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator(), versionNegotiation: { mode: { pin: '2026-07-28' } } })
    : new LegacyClient({ name: 'okf-corpus-legacy-fixture', version: '1' });
  const transport = protocol === 'current'
    ? new StreamableHTTPClientTransport(endpoint, { fetch: fetcher })
    : new LegacyTransport(endpoint, { fetch: fetcher });
  try {
    await client.connect(transport as never);
    const result = await client.callTool({ name: 'ask_okf', arguments: { bundle: 'okf-dwp', question } });
    assert.equal(result.isError, undefined);
    assert.equal(canonicalJson(result.structuredContent), canonicalJson(expected));
    const blocks = result.content as Array<{ type: string; text?: string }>;
    assert.equal(blocks.length, 1); assert.equal(blocks[0].type, 'text');
    assert.equal(canonicalJson(JSON.parse(blocks[0].text!)), canonicalJson(expected));
    assert.equal(expected.evidence_status, 'insufficient');
    assert.equal(expected.selected[0].record.text, 'Synthetic hospital source passage used only to test transport parity. This is not legal guidance.');
    assert.equal(versions.at(-1), BUNDLE_VERSION);
    assert.ok(log.some(row => row.corpus_records_available === 1 && row.bundle_version === BUNDLE_VERSION));
    assert.ok(!JSON.stringify(log).includes(question));
    const before = f.requested.length;
    const historical = await client.callTool({ name: 'ask_okf', arguments: { bundle: 'okf-dwp', version: LEGACY_BUNDLE_VERSION, question } });
    assert.equal(canonicalJson(historical.structuredContent), canonicalJson(await assembleContext(legacy.index, question, {}, legacy.binding)));
    assert.equal(f.requested.length, before, 'Historical request must not fetch corpus assets');
    const staffResult = await client.callTool({ name: 'ask_okf', arguments: { bundle: 'okf-dwp', version: STAFF_BUNDLE_VERSION, question } });
    assert.equal(staffResult.isError, undefined); assert.equal(versions.at(-1), STAFF_BUNDLE_VERSION);
    const earlier = await client.callTool({ name: 'ask_okf', arguments: { bundle: 'okf-dwp', version: PREVIOUS_BUNDLE_VERSION, question } });
    assert.equal(earlier.isError, undefined);
    assert.equal(versions.at(-1), PREVIOUS_BUNDLE_VERSION, 'An explicit historical corpus revision must reach the loader unchanged');
  } finally { await client.close(); await service.close(); }
});

test('unverified corpus asset never falls back to historical evidence or model knowledge', async () => {
  const f = await fixture(); f.files.set('base-index.json', encoder.encode('{}'));
  const log: Diagnostic[] = [];
  const service = createAskService({ loadContext: async () => f.source, fetchCorpus: f.fetcher, diagnostics: row => log.push(row) });
  try {
    const response = await service.fetch(new Request(`${PUBLIC_ORIGIN}/okf/mcp`, { method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ask_okf', arguments: { bundle: 'okf-dwp', question } } }) }));
    const raw = await response.text();
    const result = JSON.parse(raw.startsWith('event:') ? raw.split('\n').find(line => line.startsWith('data: '))!.slice(6) : raw).result;
    assert.equal(result.isError, true); assert.equal(result.structuredContent, undefined);
    assert.equal(f.requested.length, 1);
    assert.equal(log.find(row => row.error_code === 'context_unavailable')?.error_stage, 'source_integrity');
  } finally { await service.close(); }
});

for (const stage of ['source_load', 'source_transport', 'source_decode', 'context_assembly'] as const) {
  test(`safe ${stage} diagnostic excludes arbitrary exception text and input`, async () => {
    const f = await fixture(); const log: Diagnostic[] = [];
    const secret = 'SYNTHETIC_PRIVATE_MARKER https://example.test/private?token=fixture';
    if (stage === 'source_decode') {
      const bytes = encoder.encode(`{"invalid": ${secret}}`);
      f.files.set('base-index.json', bytes);
      f.source.manifest.base_index.bytes = bytes.length;
      f.source.manifest.base_index.sha256 = createHash('sha256').update(bytes).digest('hex');
    }
    const service = createAskService({
      loadContext: async () => {
        if (stage === 'source_load') throw new Error(secret);
        if (stage === 'context_assembly') return { ...f.source, binding: { ...f.source.binding, index_url: secret } };
        return f.source;
      },
      fetchCorpus: async (input, init) => {
        if (stage === 'source_transport') throw new TypeError(secret);
        return f.fetcher(input, init);
      }, diagnostics: row => log.push(row)
    });
    try {
      const response = await service.fetch(new Request(`${PUBLIC_ORIGIN}/okf/mcp`, { method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
          name: 'ask_okf', arguments: { bundle: 'okf-dwp', question: 'SYNTHETIC_QUERY_MARKER' }
        } }) }));
      const raw = await response.text();
      const result = JSON.parse(raw.startsWith('event:') ? raw.split('\n').find(line => line.startsWith('data: '))!.slice(6) : raw).result;
      assert.equal(result.isError, true); assert.equal(result.structuredContent, undefined);
      const diagnostic = log.find(row => row.error_code === 'context_unavailable');
      assert.equal(diagnostic?.error_stage, stage);
      assert.ok(!JSON.stringify(log).includes('SYNTHETIC_'));
      assert.ok(!JSON.stringify(log).includes('example.test'));
      assert.ok(!raw.includes(secret));
      assert.ok(!raw.includes('SYNTHETIC_QUERY_MARKER'));
    } finally { await service.close(); }
  });
}

test('public asset cache accepts only pinned file identities and reuses verified bytes', async () => {
  const f = await fixture('manual');
  const fetcher = createCorpusFetcher(f.source, f.fetcher);
  const url = new URL('base-index.json', f.source.binding.index_url).href;
  const first = new Uint8Array(await (await fetcher(url)).arrayBuffer());
  const second = new Uint8Array(await (await fetcher(url)).arrayBuffer());
  assert.deepEqual(first, second); assert.equal(f.requested.length, 1);
  await assert.rejects(fetcher('https://example.test/corpus/unlisted.json'), /not approved/);
  await assert.rejects(fetcher('http://169.254.169.254/latest/meta-data'), /not approved/);
  await assert.rejects(fetcher(url, { method: 'POST', body: '{}' }), /not approved/);
  assert.equal(f.requested.length, 1);
});

test('asset cache rejects bad hashes without caching corrupted bytes', async () => {
  const f = await fixture('manual');
  const fetcher = createCorpusFetcher(f.source, f.fetcher);
  const url = new URL('base-index.json', f.source.binding.index_url).href;
  const original = f.files.get('base-index.json')!;
  f.files.set('base-index.json', encoder.encode('{}'));
  await assert.rejects(fetcher(url), /integrity/);
  f.files.set('base-index.json', original);
  assert.deepEqual(new Uint8Array(await (await fetcher(url)).arrayBuffer()), original);
  assert.equal(f.requested.length, 2);
});

test('Worker transport rejects every redirect status without following an unsafe Location', async () => {
  const f = await fixture();
  const url = new URL('base-index.json', f.source.binding.index_url).href;
  const unsafe = 'http://169.254.169.254/latest/meta-data';
  const requests: string[] = [];
  let status = 300;
  const upstream: typeof fetch = async (input, init) => {
    requests.push(String(input));
    assert.equal(input, url, 'Only the exact manifest-listed URL may reach upstream');
    assert.equal(init?.redirect, 'manual', 'Redirects must be returned without following Location');
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.headers, undefined, 'Caller authentication and cookies must not be forwarded');
    assert.equal(init?.body, undefined);
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response(null, { status, headers: { Location: unsafe } });
  };
  const fetcher = createCorpusFetcher(f.source, upstream);
  for (status = 300; status <= 399; status++) {
    await assert.rejects(fetcher(url, {
      headers: { Authorization: 'SYNTHETIC_TEST_ONLY', Cookie: 'synthetic=test' }
    }), /unavailable/);
  }
  assert.equal(requests.length, 100, 'A rejected redirect must never be cached');
  assert.ok(requests.every(request => request === url));
});
