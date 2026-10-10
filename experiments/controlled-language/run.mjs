#!/usr/bin/env node
/** Reproduce the offline presentation experiment; no credentials, network or retrieval. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { canonical, sha256 } from '../../scripts/evaluate_context_package.mjs';
import { buildRenderingRequest, MAX_ITERATIONS } from './explorer-adapter.mjs';
import { evaluateRendering } from './evaluate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const read = async (name) => JSON.parse(await readFile(path.join(HERE, name), 'utf8'));

export async function verifyEvidenceLock(directory = HERE) {
  const lock = JSON.parse(await readFile(path.join(directory, 'evidence-lock.json'), 'utf8'));
  for (const [name, expected] of Object.entries(lock.files)) {
    const actual = sha256(await readFile(path.join(directory, name)));
    if (actual !== expected) throw new Error(`Frozen evidence/checker integrity failed: ${name}`);
  }
  const evidence = JSON.parse(await readFile(path.join(directory, 'fixtures/evidence.json'), 'utf8'));
  for (const page of evidence.pages) {
    if (sha256(page.text) !== page.text_sha256) throw new Error('Passage digest mismatch');
  }
  return evidence;
}

export function runChecker(text) {
  const result = spawnSync('uv', ['run', '--locked', 'python', 'experiments/controlled-language/checker.py'], {
    cwd: ROOT, input: text, encoding: 'utf8', timeout: 15000, maxBuffer: 262144,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', UV_OFFLINE: '1' },
  });
  if (result.error || result.status !== 0) throw new Error(`Checker failed: ${result.error || result.stderr}`);
  return { raw: result.stdout, result: JSON.parse(result.stdout) };
}

export function runFixtureLoop(evidence, profiles, assessor, renderings, measurements, iterations = 2) {
  if (!Number.isInteger(iterations) || iterations < 0 || iterations > MAX_ITERATIONS) throw new Error('Revision limit exceeded');
  const byId = new Map(renderings.map((row) => [row.id, row]));
  const steps = [];
  let previous = null;
  let candidate = null;
  const fixtureIds = ['baseline', 'ste-inspired', 'controlled'];
  for (let iteration = 0; iteration <= iterations; iteration += 1) {
    const row = byId.get(fixtureIds[iteration]);
    const request = buildRenderingRequest(evidence, profiles, 'controlled', iteration, previous);
    const checker = measurements.get(row.id);
    const semantics = evaluateRendering(row.text, assessor);
    const lowerCount = !previous || checker.violations_total < previous.checker.violations_total;
    const status = semantics.bounded_checks !== 'passed' ? 'rejected-development-checks'
      : !lowerCount ? 'stopped-no-improvement' : 'review-candidate-only';
    steps.push({
      iteration, fixture: row.id, request_sha256: request.request_sha256,
      evidence_sha256: request.evidence_sha256,
      text_sha256: sha256(row.text), violations: checker.violations_total,
      semantic_preservation: semantics.semantic_preservation, status,
      feedback: request.feedback,
      not_measured: ['LLM revision behaviour', 'human readability'],
    });
    if (status !== 'review-candidate-only') break;
    candidate = row.id;
    previous = { text: row.text, checker, evidence_sha256: request.evidence_sha256 };
  }
  return {
    mode: 'illustrative fixture feedback replay; no live model optimisation',
    maximum_revisions: iterations, steps, review_candidate: candidate,
    accepted_rendering: null, acceptance_reason: 'Complete semantic fidelity and human comprehension remain unverified.',
  };
}

export async function run(output = path.join(HERE, 'results'), iterations = 2) {
  if (!Number.isInteger(iterations) || iterations < 0 || iterations > MAX_ITERATIONS) throw new Error('Revision limit exceeded');
  const evidence = await verifyEvidenceLock();
  const profiles = await read('profiles.json');
  const assessor = await read('assessor.json');
  const fixtures = await read('fixtures/renderings.json');
  await mkdir(output, { recursive: true });
  const measurements = new Map();
  const rows = [];
  for (const row of fixtures.renderings) {
    const request = buildRenderingRequest(evidence, profiles, row.profile);
    const observed = runChecker(row.text);
    measurements.set(row.id, observed.result);
    const semantics = evaluateRendering(row.text, assessor);
    const receipt = {
      id: row.id, profile: row.profile, origin: row.origin,
      generation_status: fixtures.generation_status, model_calls: 0,
      evidence_sha256: request.evidence_sha256, request_sha256: request.request_sha256,
      profile_sha256: request.profile_sha256, text_sha256: sha256(row.text),
      checker: observed.result, semantic_evaluation: semantics,
    };
    await writeFile(path.join(output, row.id + '.txt'), row.text);
    await writeFile(path.join(output, row.id + '.request.json'), JSON.stringify(request, null, 2) + '\n');
    await writeFile(path.join(output, row.id + '.checker.raw.json'), observed.raw);
    await writeFile(path.join(output, row.id + '.evaluation.json'), JSON.stringify(receipt, null, 2) + '\n');
    rows.push({
      id: row.id, violations: observed.result.violations_total,
      words: observed.result.words, mean_sentence_words: observed.result.mean_sentence_words,
      semantic_preservation: semantics.semantic_preservation,
      bounded_checks: semantics.bounded_checks, citation_presence: semantics.citation_presence,
      result: semantics.bounded_checks === 'passed' ? 'requires-independent-review' : 'reject',
    });
  }
  const loop = runFixtureLoop(evidence, profiles, assessor, fixtures.renderings, measurements, iterations);
  await writeFile(path.join(output, 'loop.json'), JSON.stringify(loop, null, 2) + '\n');
  const bindings = {};
  for (const name of ['profiles.json', 'assessor.json', 'fixtures/renderings.json', 'evidence-lock.json',
    'explorer-adapter.mjs', 'evaluate.mjs', 'run.mjs', 'checker.py', 'assess.mjs', 'prepare.mjs',
    'freeze_dwp.py', '../../scripts/evaluate_context_package.mjs']) {
    bindings[name] = sha256(await readFile(path.join(HERE, name)));
  }
  const summary = {
    schema: 'okf-controlled-language-result.v1',
    locale: 'en-GB', time_zone: 'Europe/London',
    mode: fixtures.generation_status, model_calls: 0, network_calls: 0,
    checker: 'pinned SimpleEnglish descriptive regex heuristics; no official dictionary',
    evidence_sha256: sha256(canonical(evidence)), bindings, rows,
    human_comprehension: 'not measured', semantic_acceptance: 'not established',
    recommendation: 'Keep an isolated optional experiment; no OKF core change or production adoption.',
  };
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  const results = {};
  for (const name of [...rows.flatMap((row) => [
    row.id + '.txt', row.id + '.request.json', row.id + '.checker.raw.json', row.id + '.evaluation.json',
  ]), 'loop.json', 'summary.json']) {
    results[name] = sha256(await readFile(path.join(output, name)));
  }
  await writeFile(path.join(output, 'checksums.json'), JSON.stringify(results, null, 2) + '\n');
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let output = path.join(HERE, 'results');
  let iterations = 2;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--output' && args[i + 1]) output = path.resolve(args[++i]);
    else if (args[i] === '--iterations' && args[i + 1]) iterations = Number(args[++i]);
    else throw new Error('Usage: node experiments/controlled-language/run.mjs [--output DIR] [--iterations 0|1|2]');
  }
  console.log(JSON.stringify(await run(output, iterations), null, 2));
}
