#!/usr/bin/env node
/** Execute declared synthetic mutations of an actual index without changing it. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { canonical, sha256, evaluateContextPackage } from './evaluate_context_package.mjs';
import { createControlArchive, controlOutputBinding, readControlArchive, verifyControlArchive } from './context_control_archive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const flag = process.argv[i];
  if (flag === '--check') options.check = true;
  else if (['--index', '--case', '--controls', '--output'].includes(flag)) {
    const value = process.argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing ${flag}`);
    options[flag.slice(2)] = value;
  } else throw new Error(`Unknown option ${flag}`);
}
for (const key of ['index', 'case', 'controls', 'output']) if (!options[key]) throw new Error(`Required --${key}`);
const startedAt = new Date().toISOString();
const [indexBytes, caseBytes, controlBytes] = await Promise.all(
  ['index', 'case', 'controls'].map((key) => readFile(path.resolve(options[key])))
);
const original = JSON.parse(indexBytes), testCase = JSON.parse(caseBytes), manifest = JSON.parse(controlBytes);
function shape(documents) {
  const checked = spawnSync('uv', ['run', '--locked', 'python', 'scripts/check_context_assembly.py', '--stdin'], {
    cwd: ROOT, input: JSON.stringify(documents), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, UV_OFFLINE: '1', PYTHONDONTWRITEBYTECODE: '1' }
  });
  if (checked.error || checked.status !== 0) throw new Error(`Schema check: ${checked.error || checked.stderr}`);
}
shape({ index: original, case: testCase, controls: manifest });
if (new Set(manifest.controls.map((row) => row.id)).size !== manifest.controls.length) throw new Error('Control IDs must be unique');
const directory = path.join(ROOT, 'apps/okf-explorer/src/lib/context');
const files = [
  ...((await readdir(directory)).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts')).map((name) => path.join(directory, name))),
  ...['run_context_controls.mjs', 'context_control_archive.mjs', 'evaluate_context_package.mjs', 'check_context_assembly.py'].map((name) => path.join(ROOT, 'scripts', name)),
  ...((await readdir(path.join(ROOT, 'profiles/context-assembly/v1'))).filter((name) => name.endsWith('.schema.json')).map((name) => path.join(ROOT, 'profiles/context-assembly/v1', name)))
];
const implementation = [];
for (const file of files.sort()) implementation.push({ path: path.relative(ROOT, file), sha256: sha256(await readFile(file)) });
const { assembleContext } = await import('../apps/okf-explorer/src/lib/context/index.ts');
const output = path.resolve(options.output), results = [];
const retained = options.check ? JSON.parse(await readFile(output, 'utf8')) : null;
const retainedControls = new Map((retained?.execution?.controls || []).map((control) => [control.id, control]));
if (options.check && retainedControls.size !== retained.execution.controls.length) throw new Error('Retained context control IDs must be unique');
for (const control of manifest.controls) {
  const mutant = structuredClone(original);
  // A mutant is a new synthetic input, never the original published snapshot.
  mutant.bundle.snapshot += `--synthetic-control-${control.id}`;
  for (const mutation of control.mutations) {
    const record = mutant.records.find((row) => row.id === mutation.record_id);
    if (mutation.record_id && !record) throw new Error(`Unknown mutation record: ${mutation.record_id}`);
    if (mutation.op === 'drop_record') mutant.records = mutant.records.filter((row) => row.id !== record.id);
    else if (mutation.op === 'reverse_incoming') {
      const edges = mutant.assertions.filter((row) => row.target === record.id);
      if (!edges.length) throw new Error('Reversal control requires an incoming assertion');
      for (const edge of edges) [edge.source, edge.target] = [edge.target, edge.source];
    } else if (mutation.op === 'remove_assertion') {
      const ordinal = mutant.assertions.findIndex((row) => row.id === mutation.assertion_id);
      if (ordinal < 0) throw new Error(`Unknown mutation assertion: ${mutation.assertion_id}`);
      mutant.assertions.splice(ordinal, 1);
    } else if (mutation.op === 'corrupt_text') record.text += '\nSYNTHETIC EVIDENCE CORRUPTION CONTROL';
    else if (mutation.op === 'restrict_record') record.access = 'restricted';
    else if (mutation.op === 'clear_provenance') record.provenance = [];
    else if (mutation.op === 'add_alias') record.aliases = [...(record.aliases || []), mutation.alias];
    else if (mutation.op === 'declare_conflict') record.conflicts_with = [mutation.other_id];
    else throw new Error(`Unsupported mutation ${mutation.op}`);
  }
  const mutantBytes = Buffer.from(JSON.stringify(mutant), 'utf8');
  const mutantHash = sha256(mutantBytes);
  const question = control.question || testCase.question;
  const assembled = await assembleContext(mutant, question, control.budget || {}, {
    index_url: original.bundle.source_url, index_sha256: mutantHash
  });
  shape({ index: mutant, package: assembled });
  const assessed = evaluateContextPackage(assembled, testCase, mutant, { index_sha256: mutantHash });
  const checks = [];
  const check = (id, passed, expected, actual) => checks.push({ id, status: passed ? 'passed' : 'failed', expected, actual });
  check('evidence-status', control.expected.evidence_status.includes(assembled.evidence_status), control.expected.evidence_status, assembled.evidence_status);
  check('no-model-answer', assembled.ai_answer === null, null, assembled.ai_answer);
  check('positive-acceptance-rejected', assessed.status === 'failed', 'failed', assessed.status);
  for (const stage of control.expected.failed_stages) check(`failed-stage:${stage}`,
    assessed.stages.some((row) => row.id === stage && row.status === 'failed'), 'failed', assessed.stages.find((row) => row.id === stage)?.status);
  for (const issue of control.expected.issues) {
    const rows = issue.area === 'omissions' ? assembled.budget.omissions : assembled[issue.area];
    check(`diagnostic:${issue.code}`, rows.some((row) => row.code === issue.code && issue.ids.every((id) => row.ids.includes(id))), issue, rows);
  }
  for (const id of control.expected.absent_records) check(`absent-record:${id}`, !assembled.selected.some((row) => row.record.id === id), 'absent', assembled.selected.some((row) => row.record.id === id));
  if (control.expected.truncated !== undefined) check('truncation', assembled.budget.truncated === control.expected.truncated, control.expected.truncated, assembled.budget.truncated);
  if (control.expected.max_selected !== undefined) check('selected-bound', assembled.selected.length <= control.expected.max_selected, control.expected.max_selected, assembled.selected.length);
  check('package-byte-bound', Buffer.byteLength(JSON.stringify(assembled), 'utf8') === assembled.budget.used_bytes && assembled.budget.used_bytes <= assembled.budget.max_bytes,
    assembled.budget.max_bytes, assembled.budget.used_bytes);
  const payload = { schema: 'okf-context-control-output.v1', control_id: control.id, fixture_kind: 'synthetic-mutation',
    mutation: control, original_index_sha256: sha256(indexBytes), mutant_index_sha256: mutantHash,
    package: assembled, positive_case_assessment: assessed, checks };
  const content = Buffer.from(JSON.stringify(payload) + '\n');
  const relative = `control-outputs/${control.id}.json.gz`;
  const destination = path.join(path.dirname(output), relative);
  let outputBinding;
  if (options.check) {
    const previous = retainedControls.get(control.id)?.output;
    if (!previous || previous.path !== relative) throw new Error(`Missing or mismatched retained context control: ${control.id}`);
    outputBinding = verifyControlArchive(await readControlArchive(destination), previous, content);
  } else {
    const bytes = createControlArchive(content);
    outputBinding = controlOutputBinding(relative, bytes, content);
    await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, bytes);
  }
  results.push({ id: control.id, description: control.description, status: checks.every((row) => row.status === 'passed') ? 'passed' : 'failed',
    mutant_index_sha256: mutantHash, context_id: assembled.context_id, evidence_status: assembled.evidence_status,
    output: outputBinding, checks });
}
for (const input of implementation) {
  if (sha256(await readFile(path.join(ROOT, input.path))) !== input.sha256) throw new Error(`Implementation changed during execution: ${input.path}`);
}
const execution = { schema: 'okf-context-controls-execution.v1',
  method: 'Actual engine runs on explicitly mutated copies of frozen index bytes; no mutation of the original index, no model calls, no network acquisition. Expected diagnostics and failing A–H stages were declared before each run.',
  inputs: { index_sha256: sha256(indexBytes), case_sha256: sha256(caseBytes), controls_sha256: sha256(controlBytes), implementation },
  status: results.every((row) => row.status === 'passed') ? 'passed' : 'failed', controls: results,
  limitations: ['Synthetic controls establish the stated failure handling only; they are not real source defects or proof of legal correctness.'] };
if (options.check) {
  if (canonical(retained.execution) !== canonical(execution)) throw new Error('Stale context control receipt');
} else {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ schema: 'okf-context-controls-receipt.v1', started_at: startedAt,
    observed_at: new Date().toISOString(), execution }, null, 2) + '\n');
}
console.log(JSON.stringify({ status: execution.status, controls: results.map(({ id, status, evidence_status }) => ({ id, status, evidence_status })), replay: Boolean(options.check) }));
if (execution.status !== 'passed') process.exitCode = 1;
