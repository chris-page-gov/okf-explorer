/** Fixed-source compact-delivery observation. Local hash-bound reads, no models/network. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, realpathSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { assembleCorpusContext } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';
import { canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { contextManifest, readContextEvidence } from '../../../apps/okf-explorer/src/lib/context/delivery.ts';

assert.equal(process.argv.length, 4, 'Supply DWP checkout and a new output file');
const dwp = realpathSync(process.argv[2]), output = resolve(process.argv[3]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const size = value => Buffer.byteLength(canonicalJson(value));
const inputs = new Map();
function read(relative) {
  const path = resolve(dwp, relative);
  assert(path.startsWith(dwp + '/') && realpathSync(path) === path, 'Unconfined source');
  assert(lstatSync(path).isFile() && lstatSync(path).size <= 8 * 1024 * 1024, 'Unbounded input');
  const raw = readFileSync(path); inputs.set(relative, { path: relative, sha256: sha(raw), bytes: raw.length }); return raw;
}
const raw = read('logical-context/manifest.json'), manifest = JSON.parse(raw);
const binding = { index_url: `https://example.test/frozen-${sha(raw)}/logical-context/manifest.json`, index_sha256: sha(raw) };
const allowed = new Map([manifest.base_index, ...manifest.records.shards, ...Object.values(manifest.search.shards)].map(r => [r.path, r]));
const urlRoot = new URL('.', binding.index_url);
const fetcher = async url => {
  const u = new URL(url); assert(u.href.startsWith(urlRoot.href));
  const relative = u.href.slice(urlRoot.href.length), ref = allowed.get(relative); assert(ref, 'Unbound corpus input');
  const raw = read('logical-context/' + relative); assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256); return new Response(raw);
};
const cases = [
  ['logical-pc-abroad', 'What happens to Pension Credit if I go abroad?'],
  ['logical-uc-temporary-absence', 'Explain Universal Credit during temporary absence abroad.'],
  ['logical-pc-household-abroad', 'What happens to Pension Credit when a partner goes abroad?'],
  ['logical-pc-temporary-care', 'What happens to Pension Credit during temporary care home residence?'],
  ['logical-pc-care-home-alternatives', 'What happens to Pension Credit during permanent care home residence?']
];
const rows = [];
const summary = p => ({ context_id: p.context_id, bytes: size(p), evidence_status: p.evidence_status,
  records: p.selected.length, evidence_records: p.selected.filter(r => r.record.kind === 'evidence').length,
  source_text_bytes: p.selected.filter(r => r.record.kind === 'evidence').reduce((n, r) => n + Buffer.byteLength(r.record.text), 0),
  missing_codes: [...new Set(p.missing_evidence.map(r => r.code))].sort(),
  affected_missing_ids: [...new Set(p.missing_evidence.flatMap(r => r.ids))].length,
  requirements: p.requirements.length, missing_requirements: p.requirements.reduce((n, r) => n + r.missing.length, 0),
  section_bytes: Object.fromEntries(Object.entries(p).map(([key, value]) => [key, size(value)])) });
for (const [id, question] of cases) {
  const before = JSON.parse(gunzipSync(read(`evaluation/logical-units/run/units-${id}-32768.json.gz`), { maxOutputLength: 524288 }));
  assert.equal(before.binding.index_sha256, binding.index_sha256, 'Baseline uses another source snapshot');
  const inline = await assembleCorpusContext(manifest, binding, question, { max_bytes: 32768 }, fetcher);
  const context = await assembleCorpusContext(manifest, binding, question, { max_bytes: 524288 }, fetcher);
  const original = canonicalJson(context); assert.equal(size(context), context.budget.used_bytes);
  assert.equal(context.evidence_status, 'insufficient');
  const deliveries = [], ids = []; let offset = 0;
  do {
    const part = await contextManifest(context, { offset, max_bytes: 32768 });
    assert(size(part) <= 32768); assert.equal(size(part), part.delivery.used_bytes);
    deliveries.push(size(part)); ids.push(...part.records.map(r => r.id)); offset = part.delivery.next_offset;
  } while (offset !== null);
  assert.deepEqual(ids, context.selected.map(r => r.record.id));
  async function reconstruct(section, record_id) {
    const parts = []; let offset = 0, digest;
    do {
      const part = await readContextEvidence(context, { context_id: context.context_id, section,
        ...(record_id ? { record_id } : {}), offset, max_bytes: 32768 });
      assert(size(part) <= 32768); assert.equal(size(part), part.delivery.used_bytes);
      deliveries.push(size(part)); parts.push(part.data); offset = part.next_offset; digest = part.content_sha256;
    } while (offset !== null);
    const whole = parts.join(''); assert.equal(sha(whole), digest); return whole;
  }
  assert.equal(await reconstruct('package'), original);
  assert.deepEqual(JSON.parse(await reconstruct('relationships')), context.relationships);
  const diagnostics = JSON.parse(await reconstruct('diagnostics'));
  assert.deepEqual(diagnostics.requirements, context.requirements);
  assert.deepEqual(diagnostics.missing_evidence, context.missing_evidence);
  for (const selected of context.selected.filter(r => r.record.kind === 'evidence')) {
    assert.equal(await reconstruct('record_text', selected.record.id), selected.record.text);
    const metadata = JSON.parse(await reconstruct('record_metadata', selected.record.id));
    const { text, ...record } = selected.record;
    assert.deepEqual(metadata, { ...selected, record: { ...record, text_reference: {
      section: 'record_text', characters: text.length, sha256: sha(text)
    } } });
  }
  assert.equal(canonicalJson(context), original);
  rows.push({ id, question, baseline_inline_32k: summary(before), grouped_inline_32k: summary(inline),
    assembled_512k: summary(context), delivery: { max_bytes: 32768, requests: deliveries.length,
      maximum_result_bytes: Math.max(...deliveries), total_result_bytes: deliveries.reduce((a, b) => a + b, 0),
      verified: ['selected-catalogue-identity', 'whole-package', 'relationships', 'diagnostics', 'every-evidence-text', 'every-evidence-metadata-and-span', 'unchanged-context-identity'] } });
}
for (const row of inputs.values()) assert.equal(sha(readFileSync(resolve(dwp, row.path))), row.sha256, 'Source changed during observation');
const engine = ['index.ts', 'types.ts', 'corpus.ts', 'unit.ts', 'delivery.ts', 'webmcp.ts'].map(name => ({ path: `apps/okf-explorer/src/lib/context/${name}`, sha256: sha(readFileSync(resolve(root, `apps/okf-explorer/src/lib/context/${name}`))) }));
const receipt = { schema: 'okf-logical-compact-observation.v1', observed_at: new Date().toISOString(),
  dwp_commit: execFileSync('git', ['-C', dwp, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  dwp_snapshot: manifest.bundle.snapshot, manifest_sha256: binding.index_sha256,
  boundary: 'Local fixed-source observation, no network or model calls. Exact per-result JSON bound excludes any host envelope. All evidence remains insufficient; no service admission, legal completeness, latency, token or answer-quality claim.',
  engine, runner_sha256: sha(readFileSync(fileURLToPath(import.meta.url))), inputs: [...inputs.values()].sort((a,b) => a.path.localeCompare(b.path)), rows };
writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(rows.map(r => ({ case: r.id, before_evidence: r.baseline_inline_32k.evidence_records,
  after_inline_evidence: r.grouped_inline_32k.evidence_records, delivered_evidence: r.assembled_512k.evidence_records,
  reads: r.delivery.requests, max_result_bytes: r.delivery.maximum_result_bytes }))));
