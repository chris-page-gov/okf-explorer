#!/usr/bin/env node
/** Read-only historic scoped-case regression, separate from full-corpus trials. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const dwp = process.argv[2]; assert(dwp, 'Supply local DWP checkout');
const checking = process.argv[3] === '--check'; assert(process.argv.length <= 4 && (!process.argv[3] || checking));
const commit = '3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84';
const baselineCommit = 'b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55';
const sha = x => createHash('sha256').update(x).digest('hex');
const git = (repo, ref, name) => execFileSync('git', ['show', `${ref}:${name}`], { cwd: repo, maxBuffer: 8 * 1024 * 1024 });
const enginePath = 'apps/okf-explorer/src/lib/context/';
const engine = {};
for (const name of ['index.ts', 'types.ts']) {
  assert.deepEqual(await readFile(path.join(dir, 'baseline', name)), git(root, baselineCommit, enginePath + name));
  engine[name] = sha(await readFile(path.join(root, enginePath, name)));
}
const baseline = await import(pathToFileURL(path.join(dir, 'baseline/index.ts')));
const candidate = await import(pathToFileURL(path.join(root, enginePath, 'index.ts')));
const indexRaw = git(dwp, commit, 'full-dmg/context/assembly-index.json');
const caseRaw = git(dwp, commit, 'evaluation/context-assembly/imprisonment-case.json');
const index = JSON.parse(indexRaw), test = JSON.parse(caseRaw);
const binding = { index_url: index.bundle.source_url, index_sha256: sha(indexRaw) };
const before = await baseline.assembleContext(index, test.question, {}, binding);
const after = await candidate.assembleContext(index, test.question, {}, binding);
assert.equal(baseline.canonicalJson(before), candidate.canonicalJson(after), 'Scoped custody package changed');
assert.equal(after.ai_answer, null); assert.equal(after.evidence_status, 'sufficient');
const receipt = { schema: 'okf-scoped-custody-allocation-regression.v1', dwp_commit: commit, baseline_commit: baselineCommit,
  index_sha256: sha(indexRaw), case_sha256: sha(caseRaw), candidate_engine: engine, runner_sha256: sha(await readFile(fileURLToPath(import.meta.url))),
  exact_package_preserved: true, before_context_id: before.context_id, after_context_id: after.context_id, package_sha256: sha(candidate.canonicalJson(after)),
  records: after.selected.length, relationships: after.relationships.length, evidence_status: after.evidence_status,
  limitation: 'Sufficient only within the original captured custody scope; not a full-corpus, current-law, model-answer or public-host observation.' };
const raw = JSON.stringify(receipt, null, 2) + '\n';
if (checking) assert.equal(await readFile(path.join(dir, 'custody-regression.json'), 'utf8'), raw);
else await writeFile(path.join(dir, 'custody-regression.json'), raw, { flag: 'wx' });
console.log(JSON.stringify({ status: checking ? 'verified' : 'retained', context_id: after.context_id, records: after.selected.length, relationships: after.relationships.length }));
