/** Stage an explicit source/engine pair from immutable local Git blobs.
 * No network, source execution, registry mutation or public deployment. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContextCorpusManifest } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';
// @ts-ignore -- Pure archive validation is shared with the Node build.
import { validateEngineManifest, STRUCTURED_ENGINE_FILES } from './engine-admission.mjs';

const HASH = /^[a-f0-9]{64}$/, COMMIT = /^[a-f0-9]{40}$/;
const PROBE = 'evaluation/manual-structure/context-probe/';
const MANIFEST = 'structured-context/manifest.json';
const FILE_LIMIT = 8 * 1024 * 1024;
const sha = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
const canonical = (v: any): string => Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}` : JSON.stringify(v);
type ReadImmutable = (repository: 'source' | 'engine', commit: string, path: string) => Uint8Array;

/** Injected reads are an offline control seam, never an MCP input. */
export function prepareStructuredCandidate(sourceCommit: string, engineCommit: string, read: ReadImmutable) {
  assert.match(sourceCommit, COMMIT); assert.match(engineCommit, COMMIT);
  let total = 0;
  const get = (repository: 'source' | 'engine', commit: string, path: string) => {
    const raw = Buffer.from(read(repository, commit, path)); total += raw.length;
    assert.ok(raw.length > 0 && raw.length <= FILE_LIMIT && total <= 16 * 1024 * 1024, 'Candidate source inputs exceed bounds');
    return raw;
  };
  const source = (path: string) => get('source', sourceCommit, path);
  const pointerRaw = source(PROBE + 'current.json'), pointer = JSON.parse(pointerRaw.toString());
  assert.equal(pointer.schema, 'okf-dwp-context-probe-current.v1');
  assert.equal(pointer.status, 'accepted-with-recorded-limitations', 'A separately accepted trial is required');
  assert.match(pointer.attempt, /^[a-z0-9-]{1,60}$/);
  const engineRaw = source(PROBE + 'engine.json'), engine = JSON.parse(engineRaw.toString());
  assert.equal(engine.schema, 'okf-context-engine-admission.v1'); assert.equal(engine.commit, engineCommit);
  assert.deepEqual(Object.keys(engine.files).sort(), STRUCTURED_ENGINE_FILES, 'Exact accepted engine inventory required');
  const protocolRaw = source(PROBE + 'protocol.json'), protocol = JSON.parse(protocolRaw.toString());
  const reportPath = PROBE + 'runs/' + pointer.attempt + '/report.json';
  assert.ok(pointer.report && pointer.report.path === reportPath, 'Accepted pointer must bind its report');
  const reportRaw = source(reportPath);
  assert.equal(reportRaw.length, pointer.report.bytes); assert.equal(sha(reportRaw), pointer.report.sha256, 'Accepted report digest differs');
  const report = JSON.parse(reportRaw.toString());
  assert.equal(report.schema, 'okf-dwp-structured-context-evaluation.v1');
  assert.equal(canonical(report.engine), canonical(engine), 'Accepted report uses a different engine');
  assert.equal(canonical(report.protocol), canonical(protocol), 'Accepted report uses a different protocol');
  assert.equal(report.network_calls, 0); assert.equal(report.model_calls, 0);
  assert.ok(protocol.cases && typeof protocol.cases.path === 'string');
  assert.match(protocol.cases.path, /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/);
  assert.ok(!protocol.cases.path.split('/').some((part: string) => part === '.' || part === '..'));
  const casesRaw = source(protocol.cases.path);
  assert.equal(casesRaw.length, protocol.cases.bytes); assert.equal(sha(casesRaw), protocol.cases.sha256);
  const cases = JSON.parse(casesRaw.toString()).cases;
  assert.ok(Array.isArray(cases) && Number.isSafeInteger(protocol.denominator) && protocol.denominator > 0 && protocol.denominator <= 200);
  assert.equal(cases.length, protocol.denominator);
  const questions = new Map(cases.map((row: any) => [row.id, row.question]));
  assert.equal(questions.size, cases.length, 'Unique bound case identifiers required');
  assert.ok([...questions].every(([id, question]) => typeof id === 'string' && id !== 'unknown-control' && typeof question === 'string' && question.length > 0));
  for (const values of [protocol.stages, protocol.budgets]) assert.ok(Array.isArray(values) && values.length > 0 && values.length <= 8 && new Set(values).size === values.length);
  assert.ok(protocol.stages.every((stage: unknown) => typeof stage === 'string' && stage.length > 0));
  assert.ok(protocol.budgets.every((budget: unknown) => Number.isSafeInteger(budget) && Number(budget) > 0));
  assert.ok(Array.isArray(report.rows), 'Completed comparison rows required');
  assert.equal(report.rows.length, (cases.length + 1) * protocol.stages.length * protocol.budgets.length, 'Incomplete comparison census');
  const cells = new Set();
  for (const row of report.rows) {
    assert.ok((questions.has(row.case_id) || row.case_id === 'unknown-control') && protocol.stages.includes(row.stage) && protocol.budgets.includes(row.max_bytes), 'Unexpected comparison cell');
    const key = JSON.stringify([row.case_id, row.stage, row.max_bytes]); assert.ok(!cells.has(key), 'Duplicate comparison cell'); cells.add(key);
    if (row.case_id === 'unknown-control') { assert.equal(row.evidence_records, 0); assert.equal(row.evidence_status, 'insufficient'); }
    else assert.equal(row.question, questions.get(row.case_id), 'Bound question differs');
    assert.match(row.context_id, /^urn:sha256:[a-f0-9]{64}$/); assert.match(row.sha256, HASH);
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes <= row.max_bytes);
    assert.match(row.archive, /^[a-zA-Z0-9_.-]+\.json\.gz$/);
  }
  const manifestRaw = source(MANIFEST), manifest = validateContextCorpusManifest(JSON.parse(manifestRaw.toString()));
  assert.equal(manifest.schema, 'okf-context-corpus.v3', 'Structured source family required');
  const bindings = protocol.source_bindings.filter((ref: any) => ref.path === MANIFEST);
  assert.equal(bindings.length, 1, 'One exact accepted structured source binding required');
  assert.equal(bindings[0].bytes, manifestRaw.length); assert.equal(bindings[0].sha256, sha(manifestRaw));
  assert.ok(Array.isArray(report.inputs), 'Completed report input inventory required');
  for (const [path, raw] of [[MANIFEST, manifestRaw], [PROBE + 'engine.json', engineRaw], [PROBE + 'protocol.json', protocolRaw], [protocol.cases.path, casesRaw]] as Array<[string, Buffer]>) {
    const refs = report.inputs.filter((ref: any) => ref.path === path);
    assert.equal(refs.length, 1, 'One exact report input binding required');
    assert.equal(refs[0].bytes, raw.length); assert.equal(refs[0].sha256, sha(raw), 'Report input differs');
  }
  const files: Record<string, { bytes: number; sha256: string; source_path: string }> = {};
  const outputs = new Map<string, Uint8Array>();
  for (const name of STRUCTURED_ENGINE_FILES as string[]) {
    const path = 'apps/okf-explorer/src/lib/context/' + name;
    const raw = get('engine', engineCommit, path); assert.match(engine.files[name], HASH);
    assert.equal(sha(raw), engine.files[name], 'Accepted engine module differs');
    files[name] = { bytes: raw.length, sha256: sha(raw), source_path: path };
    outputs.set(`engines/${engineCommit}/${name}`, raw);
  }
  const body = { schema: 'okf-context-engine-manifest.v2', source_commit: engineCommit,
    family: 'okf-context-assembly.v1', corpus_schemas: ['okf-context-corpus.v3'], files };
  const engineManifest = { ...body, engine_id: 'urn:okf:context-engine:sha256:' + sha(canonical(body)) };
  validateEngineManifest(engineManifest, engineCommit);
  const ref = (path: string, raw: Uint8Array) => ({ path, bytes: raw.length, sha256: sha(raw) });
  const release = { schema: 'okf-remote-corpus-release.v2', publication_status: 'pinned',
    selection: 'explicit-only', version: sourceCommit, snapshot: manifest.bundle.snapshot,
    manifest_path: MANIFEST, manifest_sha256: sha(manifestRaw), manifest_bytes: manifestRaw.length,
    corpus_schema: manifest.schema, engine_id: engineManifest.engine_id, engine_commit: engineCommit,
    accepted_trial: { pointer: ref(PROBE + 'current.json', pointerRaw), protocol: ref(PROBE + 'protocol.json', protocolRaw),
      report: ref(reportPath, reportRaw), engine: ref(PROBE + 'engine.json', engineRaw) },
    limitation: 'Accepted local evidence-delivery trial with recorded limitations; no complete legal answerability, public service or client acceptance implied.' };
  const json = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
  outputs.set(`engines/${engineCommit}/manifest.json`, json(engineManifest));
  outputs.set('okf-dwp-structured-corpus-manifest.json', manifestRaw);
  outputs.set('okf-dwp-structured-corpus-release.json', json(release));
  return { outputs, release };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), flags = ['--dwp-root', '--dwp-commit', '--engine-commit', '--out'];
  assert.equal(args.length, 8); const values = new Map<string, string>();
  for (let n = 0; n < args.length; n += 2) { assert.ok(flags.includes(args[n]) && !values.has(args[n]) && args[n + 1]); values.set(args[n], args[n + 1]); }
  const sourceCommit = values.get('--dwp-commit')!, engineCommit = values.get('--engine-commit')!;
  assert.match(sourceCommit, COMMIT); assert.match(engineCommit, COMMIT);
  const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const repositories = { source: resolve(values.get('--dwp-root')!), engine: resolve(serviceRoot, '../..') };
  const candidate = prepareStructuredCandidate(sourceCommit, engineCommit, (repository, commit, path) => {
    assert.match(path, /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/);
    assert.ok(!path.split('/').some(part => part === '.' || part === '..'));
    const key = commit + ':' + path, options = { cwd: repositories[repository], timeout: 10000 };
    const size = Number(execFileSync('git', ['cat-file', '-s', key], { ...options, maxBuffer: 100 }).toString().trim());
    assert.ok(Number.isSafeInteger(size) && size > 0 && size <= FILE_LIMIT, 'Immutable input exceeds bound');
    const raw = execFileSync('git', ['show', key], { ...options, maxBuffer: size + 1 }); assert.equal(raw.length, size); return raw;
  });
  const destination = resolve(values.get('--out')!);
  // Refuse any existing directory. Staging never overwrites an archive/registry.
  await mkdir(destination);
  for (const [path, raw] of candidate.outputs) { const target = resolve(destination, path); await mkdir(dirname(target), { recursive: true }); await writeFile(target, raw, { flag: 'wx' }); }
  console.log(JSON.stringify({ status: 'staged-explicit-candidate', source_commit: sourceCommit, engine_id: candidate.release.engine_id,
    outputs: candidate.outputs.size, network_calls: 0, model_calls: 0, registry_changed: false, deployed: false }));
}
