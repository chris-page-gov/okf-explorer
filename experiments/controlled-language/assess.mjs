#!/usr/bin/env node
/** Check a separately obtained DWP rendering; generation and semantic review remain unobserved. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from '../../scripts/evaluate_context_package.mjs';
import { evaluateRendering } from './evaluate.mjs';
import { verifyEvidenceLock, runChecker } from './run.mjs';
import { buildRenderingRequest, MAX_ITERATIONS } from './explorer-adapter.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));

export function verifyRequest(request, evidence, profiles) {
  const { request_sha256, ...body } = request;
  if (request_sha256 !== sha256(canonical(body))
    || request.evidence_sha256 !== sha256(canonical(request.evidence))
    || request.evidence_sha256 !== sha256(canonical(evidence))
    || request.profile_sha256 !== sha256(canonical(profiles))) {
    throw new Error('Request does not bind the frozen DWP experiment');
  }
  const expected = buildRenderingRequest(evidence, profiles, request.profile, request.iteration,
    request.feedback ? { ...request.feedback, evidence_sha256: request.evidence_sha256 } : null);
  if (canonical(request) !== canonical(expected)) throw new Error('Unexpected rendering instructions');
}

export async function assess(requestFile, textFile, output) {
  const evidence = await verifyEvidenceLock();
  const profiles = JSON.parse(await readFile(path.join(HERE, 'profiles.json'), 'utf8'));
  const assessor = JSON.parse(await readFile(path.join(HERE, 'assessor.json'), 'utf8'));
  const requestBytes = await readFile(requestFile);
  if (requestBytes.length > 1000000) throw new Error('Request too large');
  const request = JSON.parse(requestBytes);
  verifyRequest(request, evidence, profiles);
  const bytes = await readFile(textFile);
  if (bytes.length > 32768) throw new Error('Rendering too large');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const checker = runChecker(text);
  const report = {
    schema: 'okf-controlled-language-imported-result.v1',
    mode: 'imported unreviewed rendering; generation not observed',
    model_calls: null, request_sha256: request.request_sha256,
    evidence_sha256: request.evidence_sha256, profile_sha256: request.profile_sha256,
    text_sha256: sha256(bytes), text, checker: checker.result,
    semantic_evaluation: evaluateRendering(text, assessor),
  };
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'checker.raw.json'), checker.raw);
  await writeFile(path.join(output, 'evaluation.json'), JSON.stringify(report, null, 2) + '\n');
  const next = request.iteration < MAX_ITERATIONS && report.semantic_evaluation.bounded_checks === 'passed'
    ? buildRenderingRequest(evidence, profiles, request.profile, request.iteration + 1,
      { text, checker: checker.result, evidence_sha256: request.evidence_sha256 }) : null;
  return { report, next };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 6 || args[0] !== '--request' || args[2] !== '--text' || args[4] !== '--output') {
    throw new Error('Usage: node experiments/controlled-language/assess.mjs --request REQUEST.json --text ANSWER.txt --output DIR');
  }
  const { report, next } = await assess(args[1], args[3], args[5]);
  // A next request is feedback for research, never automatic acceptance.
  // Overwrite a prior request with null when stopped, so a reused output directory cannot expose stale feedback.
  await writeFile(path.join(args[5], 'revision.request.json'), JSON.stringify(next, null, 2) + '\n');
  console.log(report.semantic_evaluation.semantic_preservation);
}
