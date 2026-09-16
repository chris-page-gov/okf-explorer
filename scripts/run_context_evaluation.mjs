#!/usr/bin/env node
/** Execute the real context library against local frozen inputs; no model calls. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { canonical, evaluateContextPackage, sha256 } from './evaluate_context_package.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = {};
for (let ordinal = 0; ordinal < args.length; ordinal += 1) {
  const flag = args[ordinal];
  if (flag === '--check') options.check = true;
  else if (['--index', '--index-url', '--case', '--output', '--max-nodes', '--max-relationships', '--max-depth', '--max-bytes'].includes(flag)) {
    if (!args[ordinal + 1] || args[ordinal + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`);
    options[flag.slice(2)] = args[++ordinal];
  } else throw new Error(`Unknown option: ${flag}`);
}
if (!options.index || !options.case || !options.output) {
  throw new Error('Usage: node --experimental-strip-types scripts/run_context_evaluation.mjs --index PATH --case PATH --output RECEIPT [--check] [--max-bytes N]');
}
const startedAt = new Date().toISOString();
const indexPath = path.resolve(options.index);
const casePath = path.resolve(options.case);
const outputPath = path.resolve(options.output);
const indexBytes = await readFile(indexPath);
const caseBytes = await readFile(casePath);
const index = JSON.parse(indexBytes);
const testCase = JSON.parse(caseBytes);
const budget = {};
for (const key of ['max-nodes', 'max-relationships', 'max-depth', 'max-bytes']) {
  if (options[key] !== undefined) {
    const value = Number(options[key]);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${key}`);
    budget[key.replaceAll('-', '_')] = value;
  }
}

const schemaCheck = (documents) => {
  const result = spawnSync('uv', ['run', '--locked', 'python', 'scripts/check_context_assembly.py', '--stdin'], {
    cwd: ROOT, encoding: 'utf8', input: JSON.stringify(documents),
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', UV_OFFLINE: '1' }, maxBuffer: 8 * 1024 * 1024
  });
  if (result.error || result.status !== 0) throw new Error(`Context schema validation failed: ${result.error || result.stderr}`);
  return JSON.parse(result.stdout);
};
schemaCheck({ index, case: testCase });
const engineDirectory = path.join(ROOT, 'apps/okf-explorer/src/lib/context');
const bindingFiles = [
  ...((await readdir(engineDirectory)).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => path.join(engineDirectory, name))),
  path.join(ROOT, 'scripts/evaluate_context_package.mjs'),
  path.join(ROOT, 'scripts/run_context_evaluation.mjs'),
  path.join(ROOT, 'scripts/check_context_assembly.py'),
  ...((await readdir(path.join(ROOT, 'profiles/context-assembly/v1'))).filter((name) => name.endsWith('.schema.json'))
    .map((name) => path.join(ROOT, 'profiles/context-assembly/v1', name)))
];
const implementation = [];
for (const file of bindingFiles.sort()) implementation.push({ path: path.relative(ROOT, file), sha256: sha256(await readFile(file)) });
const { assembleContext } = await import('../apps/okf-explorer/src/lib/context/index.ts');
// Assessor expectations are deliberately not passed into the engine.
const packageValue = await assembleContext(index, testCase.question, budget, {
  index_url: options['index-url'] || index.bundle.source_url, index_sha256: sha256(indexBytes)
});
const shape = schemaCheck({ package: packageValue });
const evaluation = evaluateContextPackage(packageValue, testCase, index, { index_sha256: sha256(indexBytes) });

for (const input of implementation) {
  if (sha256(await readFile(path.join(ROOT, input.path))) !== input.sha256) throw new Error(`Implementation changed during execution: ${input.path}`);
}
const deterministic = {
  schema: 'okf-context-execution.v1',
  method: 'Actual transport-independent engine execution over supplied local index bytes; the index URL is an identity locator, not a claim of fetching it; exact-identity A–H assessment; no model call.',
  inputs: { index_sha256: sha256(indexBytes), case_sha256: sha256(caseBytes), implementation },
  requested_budget: budget, schema_validation: shape, package: packageValue, evaluation
};
if (options.check) {
  const retained = JSON.parse(await readFile(outputPath, 'utf8'));
  if (!equalDeterministic(retained.execution, deterministic)) throw new Error('Context execution evidence is stale or differs from a fresh replay');
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const receipt = { schema: 'okf-context-execution-receipt.v1', started_at: startedAt,
    observed_at: new Date().toISOString(), execution: deterministic };
  await writeFile(outputPath, JSON.stringify(receipt, null, 2) + '\n');
}
console.log(JSON.stringify({ case_id: testCase.id, status: evaluation.status, context_id: packageValue.context_id,
  evidence_status: packageValue.evidence_status, selected_records: packageValue.selected.length,
  stages: evaluation.stages.map(({ id, status }) => ({ id, status })), receipt: outputPath, replay: Boolean(options.check) }));
if (evaluation.status !== 'passed') process.exitCode = 1;

function equalDeterministic(left, right) { return canonical(left) === canonical(right); }
