#!/usr/bin/env node
/** Offline engine-only comparison. Git reads immutable public input bytes; no model or network calls. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, lstat, realpath, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const DWP = '3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84';
const BASELINE = 'b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55';
const ENGINE = 'apps/okf-explorer/src/lib/context/';
const files = ['index.ts', 'corpus.ts', 'types.ts'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const flags = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  assert(['--dwp-root', '--output', '--check'].includes(key) && !(key in flags), 'Unknown or duplicate flag');
  flags[key] = process.argv[++i]; assert(flags[key], 'Missing flag value');
}
assert(flags['--dwp-root'] && Boolean(flags['--output']) !== Boolean(flags['--check']), 'Supply DWP checkout and one fresh output or retained check directory');
const checking = Boolean(flags['--check']);
async function safeDirectory(directory) {
  const absolute = path.resolve(directory), parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part); const info = await lstat(current);
    assert(info.isDirectory() && !info.isSymbolicLink(), 'Directory or parent is a symlink or not a directory');
  }
  return absolute;
}
const output = path.resolve(flags['--check'] || flags['--output']);
await safeDirectory(path.dirname(output));
if (!checking) await mkdir(output); // Existing file, directory or symlink is refused before execution.
await safeDirectory(output);
const dwp = await realpath(flags['--dwp-root']);
const safe = name => { assert(typeof name === 'string' && name && !path.isAbsolute(name) && !name.includes('\\') && name.split('/').every(p => p && p !== '.' && p !== '..') && !name.includes('\0')); return name; };
const fromGit = (checkout, commit, name, limit = 32 * 1024 * 1024) => {
  const ref = `${commit}:${safe(name)}`;
  const size = Number(execFileSync('git', ['cat-file', '-s', ref], { cwd: checkout, maxBuffer: 1024 }).toString().trim());
  assert(Number.isSafeInteger(size) && size >= 0 && size <= limit, 'Git source blob exceeds byte limit');
  const raw = execFileSync('git', ['show', ref], { cwd: checkout, maxBuffer: Math.max(1, size + 1) });
  assert.equal(raw.length, size); return raw;
};
async function boundedAt(directory, name, limit = 8 * 1024 * 1024) {
  await safeDirectory(directory);
  const full = path.join(directory, safe(name)); await safeDirectory(path.dirname(full)); const info = await lstat(full);
  assert(info.isFile() && !info.isSymbolicLink() && info.size <= limit, 'Invalid retained file');
  assert((await realpath(full)).startsWith((await realpath(directory)) + path.sep), 'Receipt escaped directory');
  const raw = await readFile(full); assert(raw.length <= limit); return raw;
}
const bounded = (name, limit) => boundedAt(output, name, limit);
const prior = checking ? JSON.parse(await bounded('comparison.json')) : null;
const exactFields = (value, keys) => assert(value && typeof value === 'object' && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), 'Unrecognised receipt manifest fields');
if (checking) {
  exactFields(prior, ['schema', 'started_at', 'completed_at', 'runtime', 'inputs', 'summary', 'observations', 'limitations']);
  assert.equal(prior.schema, 'okf-required-evidence-allocation-comparison.v1');
  exactFields(prior.inputs, ['dwp_commit', 'baseline_commit', 'runner_sha256', 'candidate_engine', 'baseline_engine', 'files', 'corpus_files', 'binding']);
  assert.equal(prior.inputs.dwp_commit, DWP); assert.equal(prior.inputs.baseline_commit, BASELINE);
  for (const hashes of [prior.inputs.candidate_engine, prior.inputs.baseline_engine]) {
    exactFields(hashes, files); assert(Object.values(hashes).every(h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h)), 'Invalid engine digests');
  }
  assert(Array.isArray(prior.observations) && prior.observations.length === 80 && Array.isArray(prior.summary) && prior.summary.length === 2, 'Invalid observation census');
  const approved = ['candidate/corpus.ts', 'candidate/index.ts', 'candidate/types.ts', 'comparison.json', 'runner.mjs'];
  const discovered = [];
  for (const entry of await readdir(output)) {
    const info = await lstat(path.join(output, entry)); assert(!info.isSymbolicLink(), 'Symlink in receipt');
    if (entry === 'candidate') {
      await safeDirectory(path.join(output, entry));
      for (const child of await readdir(path.join(output, entry))) discovered.push(entry + '/' + child);
    } else { assert(info.isFile(), 'Unexpected receipt directory'); discovered.push(entry); }
  }
  assert.deepEqual(discovered.sort(), approved, 'Unapproved archive file');
  // Admission precedes all imports of archived code, not only final replay comparison.
  for (const name of files) assert.equal(sha(await bounded('candidate/' + name, 2 * 1024 * 1024)), prior.inputs.candidate_engine[name], 'Candidate module digest mismatch before import');
}
const candidateHashes = {}, baselineHashes = {};
for (const name of files) {
  const original = fromGit(root, BASELINE, ENGINE + name, 2 * 1024 * 1024);
  assert.deepEqual(await boundedAt(here, 'baseline/' + name, 2 * 1024 * 1024), original, 'Baseline archive differs from commit');
  const candidate = checking ? await bounded('candidate/' + name, 2 * 1024 * 1024) : await boundedAt(root, ENGINE + name, 2 * 1024 * 1024);
  if (!checking) { await mkdir(path.join(output, 'candidate'), { recursive: true }); await writeFile(path.join(output, 'candidate', name), candidate, { flag: 'wx' }); }
  candidateHashes[name] = sha(candidate); baselineHashes[name] = sha(original);
}
const runner = await boundedAt(here, path.basename(fileURLToPath(import.meta.url)), 1024 * 1024);
if (!checking) await writeFile(path.join(output, 'runner.mjs'), runner, { flag: 'wx' });
else { assert.equal(sha(runner), prior.inputs.runner_sha256); assert.equal(sha(await bounded('runner.mjs')), sha(runner)); }
const baseline = await import(pathToFileURL(path.join(here, 'baseline/corpus.ts')));
const candidate = await import(pathToFileURL(path.join(output, 'candidate/corpus.ts')));
const { canonicalJson } = await import(pathToFileURL(path.join(here, 'baseline/index.ts')));
const inputBindings = [];
function input(name) { const raw = fromGit(dwp, DWP, name); inputBindings.push({ path: name, bytes: raw.length, sha256: sha(raw) }); return raw; }
const indexRaw = input('evaluation/semantic-expansion/assembly-index.json');
const originalRaw = input('context/corpus/manifest.json');
const casesRaw = input('evaluation/staff-questions/cases.json');
const index = JSON.parse(indexRaw), original = JSON.parse(originalRaw), registry = JSON.parse(casesRaw);
assert.equal(registry.cases.length, 40);
const manifest = { ...original, base_index: { path: 'staff-index.json', bytes: indexRaw.length, sha256: sha(indexRaw) }, semantic_source_snapshot: index.bundle.snapshot, bundle: index.bundle, scope: index.scope, limitations: index.limitations };
const binding = { index_url: 'https://example.test/allocation-corpus/manifest.json', index_sha256: sha(canonicalJson(manifest)) };
const fetched = new Map();
const corpusFiles = new Map();
const fetcher = async url => {
  const parsed = new URL(String(url));
  assert.equal(parsed.origin, 'https://example.test'); assert(!parsed.username && !parsed.password && !parsed.search && !parsed.hash);
  assert(parsed.pathname.startsWith('/allocation-corpus/')); const name = safe(decodeURIComponent(parsed.pathname.slice('/allocation-corpus/'.length)));
  if (name === 'staff-index.json') return new Response(indexRaw);
  if (!fetched.has(name)) { const raw = fromGit(dwp, DWP, 'context/corpus/' + name); fetched.set(name, raw); corpusFiles.set(name, { path: 'context/corpus/' + name, bytes: raw.length, sha256: sha(raw) }); }
  return new Response(fetched.get(name));
};
function describe(p, expected) {
  const records = new Set(p.selected.map(s => s.record.id)), edges = new Map(p.relationships.map(a => [a.id, a]));
  const paths = p.requirements.flatMap(r => (r.required_paths || []).map(route => ({ requirement: r.id, ...route })));
  const missingPaths = paths.filter(route => route.records.some(id => !records.has(id)) || route.assertions.some((id, i) => edges.get(id)?.source !== route.records[i] || edges.get(id)?.target !== route.records[i + 1]));
  return { context_id: p.context_id, package_sha256: sha(canonicalJson(p)), bytes: p.budget.used_bytes, records: p.selected.length, relationships: p.relationships.length,
    selected_routes: p.selected.map(s => s.record.route), selected_ids: [...records], declared_paths: paths.length, retained_paths: paths.length - missingPaths.length, missing_paths: missingPaths,
    candidate_hits: expected.filter(c => records.has(c.record_id)).map(c => c.id), evidence_status: p.evidence_status, truncated: p.budget.truncated,
    allocation_used: p.limitations.some(s => s.startsWith('One additional allocation pass')),
    omissions: p.budget.omissions, dependency_diagnostics: p.missing_evidence.filter(i => i.code === 'missing_dependency') };
}
const started = new Date().toISOString();
const observations = [];
for (const max_bytes of [262144, 524288]) for (const row of registry.cases) {
  const expected = registry.source_candidates.filter(c => row.candidate_ids.includes(c.id));
  const packages = [], elapsed = [];
  for (const engine of [baseline, candidate]) {
    const start = performance.now(); const p = await engine.assembleCorpusContext(manifest, binding, row.question, { max_bytes }, fetcher); elapsed.push(performance.now() - start);
    assert.equal(p.ai_answer, null); assert.equal(p.evidence_status, 'insufficient'); assert(p.budget.used_bytes <= max_bytes);
    for (const { record } of p.selected.filter(s => s.record.kind === 'evidence')) for (const provenance of record.provenance) if (provenance.literal_sha256) assert.equal(sha(record.text), provenance.literal_sha256);
    packages.push(p);
  }
  observations.push({ case_id: row.id, question: row.question, max_bytes, before: describe(packages[0], expected), after: describe(packages[1], expected), exact_package_preserved: canonicalJson(packages[0]) === canonicalJson(packages[1]), elapsed_ms: elapsed });
}
const summary = [262144, 524288].map(max_bytes => {
  const rows = observations.filter(r => r.max_bytes === max_bytes);
  const count = (stage, field) => rows.reduce((n, r) => n + (Array.isArray(r[stage][field]) ? r[stage][field].length : r[stage][field]), 0);
  return { max_bytes, cases: rows.length, before_candidate_hits: count('before', 'candidate_hits'), after_candidate_hits: count('after', 'candidate_hits'), before_retained_paths: count('before', 'retained_paths'), after_retained_paths: count('after', 'retained_paths'), declared_paths: count('before', 'declared_paths'), allocations: rows.filter(r => r.after.allocation_used).length, exact_packages: rows.filter(r => r.exact_package_preserved).length, dependency_changes: rows.filter(r => canonicalJson(r.before.dependency_diagnostics) !== canonicalJson(r.after.dependency_diagnostics)).map(r => r.case_id), sufficient: 0 };
});
const result = { schema: 'okf-required-evidence-allocation-comparison.v1', started_at: started, completed_at: new Date().toISOString(), runtime: { node: process.version, platform: process.platform, arch: process.arch }, inputs: { dwp_commit: DWP, baseline_commit: BASELINE, runner_sha256: sha(runner), candidate_engine: candidateHashes, baseline_engine: baselineHashes, files: inputBindings, corpus_files: [...corpusFiles.values()].sort((a, b) => a.path.localeCompare(b.path)), binding }, summary, observations, limitations: [
  'Offline known development cases, using immutable DWP inputs and hash-checked local Git bytes. No public host or model call.',
  'Only the engine changes. These are new observations, never replacements for historic packages, trials or receipts.',
  'Required-path retention and source-candidate overlap are not independent answer accuracy or legal completeness measures.',
  'All substantive contexts remain insufficient. More evidence does not establish applicability or specialist acceptance.',
  'Dependency diagnostics may change without allocation where the old engine hid a declared requirement after edge omission.',
  'Single in-process timings are diagnostic only, include cached file reads, and do not establish deployed performance or a causal latency improvement.'
] };
if (checking) {
  const stable = value => { const copy = structuredClone(value); delete copy.started_at; delete copy.completed_at; delete copy.runtime; for (const row of copy.observations) delete row.elapsed_ms; return copy; };
  assert.deepEqual(stable(result), stable(prior));
} else await writeFile(path.join(output, 'comparison.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: checking ? 'verified' : 'retained', summary }));
