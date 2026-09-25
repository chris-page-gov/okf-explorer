import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { approvedLoader } from '../scripts/verify-approved-versions.ts';
import { resolveReplay } from '../src/replay.ts';
import { BUNDLE_VERSION, APPROVED_BUNDLE, PRIOR_BUNDLE_VERSION } from '../src/registry.ts';
import { CURRENT_ENGINE_ID, ENGINES, PRIOR_ENGINE_ID } from '../src/engines.ts';
import { corpusAssetReferences } from '../src/corpusAssets.ts';

const dwpRoot = process.env.OKF_DWP_SOURCE_ROOT ? resolve(process.env.OKF_DWP_SOURCE_ROOT) : '';
const sha = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
const gitBlob = (version: string, path: string) => {
  assert.match(version, /^[a-f0-9]{40}$/);
  assert.match(path, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/);
  const key = `${version}:${path}`;
  const size = Number(execFileSync('git', ['cat-file', '-s', key], { cwd: dwpRoot, timeout: 10000, maxBuffer: 100 }).toString());
  assert.ok(Number.isSafeInteger(size) && size > 0 && size <= 4 * 1024 * 1024);
  return execFileSync('git', ['show', key], { cwd: dwpRoot, timeout: 10000, maxBuffer: size + 1 });
};

test('Evidence Connect source, descriptor and compatible engine are immutable and separately paired', async () => {
  assert.equal(BUNDLE_VERSION, '7eeded763042ddd0070f4fed834c6074149e8e2f');
  assert.equal(PRIOR_BUNDLE_VERSION, '723bcc5b015ab38a026625c2148edbd784edf7c7');
  const manifest = await readFile(new URL('../vendor/okf-dwp-evidence-connect-corpus-manifest.json', import.meta.url));
  const descriptor = await readFile(new URL('../vendor/okf-dwp-evidence-connect-descriptor.json', import.meta.url));
  const release = JSON.parse(await readFile(new URL('../vendor/okf-dwp-evidence-connect-corpus-release.json', import.meta.url), 'utf8'));
  assert.equal(manifest.length, release.manifest_bytes); assert.equal(sha(manifest), release.manifest_sha256);
  if (dwpRoot) assert.deepEqual(manifest, gitBlob(BUNDLE_VERSION, release.manifest_path));
  assert.equal(descriptor.length, release.descriptor_bytes); assert.equal(sha(descriptor), release.descriptor_sha256);
  if (dwpRoot) assert.deepEqual(descriptor, gitBlob(BUNDLE_VERSION, release.descriptor_path));
  const parsed = JSON.parse(manifest.toString());
  assert.equal(parsed.schema, 'okf-context-corpus.v3');
  assert.equal(parsed.search.ranking.schema, 'okf-bm25-weighted.v2');
  assert.equal(APPROVED_BUNDLE.index_sha256, sha(manifest));
  assert.deepEqual(ENGINES.find(row => row.engine_id === CURRENT_ENGINE_ID)?.source_versions, [BUNDLE_VERSION]);
  assert.ok(ENGINES.find(row => row.engine_id === PRIOR_ENGINE_ID)?.source_versions.includes(PRIOR_BUNDLE_VERSION));
});

test('actual pinned Evidence Connect source retrieves bounded source text and rejects a mismatched cursor', { skip: !dwpRoot }, async () => {
  const loader = await approvedLoader();
  try {
    const source = await loader.loadApprovedSource();
    assert.ok('manifest' in source && source.manifest.schema === 'okf-context-corpus.v3');
    const refs = new Map(corpusAssetReferences(source.manifest).map(ref => [new URL(ref.path, source.binding.index_url).href, ref]));
    let files = 0, bytes = 0;
    const fetcher: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const ref = refs.get(url); assert.ok(ref, 'Unlisted source asset');
      assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
      const prefix = `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${BUNDLE_VERSION}/`;
      assert.ok(url.startsWith(prefix));
      const raw = gitBlob(BUNDLE_VERSION, url.slice(prefix.length));
      assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
      files++; bytes += raw.length;
      assert.ok(files <= 64 && bytes <= 16 * 1024 * 1024);
      return new Response(new Uint8Array(raw));
    };
    const input = { version: BUNDLE_VERSION, question: 'What does DMG 84861 say about capital?', budget: { max_bytes: 65536 } };
    const result = await resolveReplay(source, input, fetcher);
    assert.equal(result.identity.engine_id, CURRENT_ENGINE_ID);
    assert.ok(result.context.selected.length > 0);
    assert.ok(result.context.selected.some(row => row.record.text.length > 0));
    files = 0; bytes = 0;
    await assert.rejects(resolveReplay(source, { ...input, context_id: 'urn:sha256:' + '0'.repeat(64) }, fetcher),
      (error: any) => error.code === 'historical_unavailable');
  } finally { await loader.close(); }
});
