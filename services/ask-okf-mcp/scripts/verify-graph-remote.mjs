#!/usr/bin/env node
/** Governed SDK verification for the additive graph evidence endpoint.
 * Importing this module performs no network access. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { Client as LegacyClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport as LegacyTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { collectGraphEvidence } from '../vendor/graph-evidence/graph_evidence_client.mjs';
import { GRAPH_MANIFEST_INPUT_SCHEMA, GRAPH_MANIFEST_OUTPUT_SCHEMA,
  GRAPH_READ_INPUT_SCHEMA, GRAPH_READ_OUTPUT_SCHEMA } from '../src/graphContracts.ts';

export const PUBLIC_ORIGIN = 'https://ask-okf.crpage.chatgpt.site';
export const PUBLIC_PATH = '/graph/mcp';
export const MAX_LIMITS = Object.freeze({ requests: 12000, bytes: 256 * 1024 * 1024,
  run_ms: 4 * 60 * 60 * 1000, request_ms: 30000, interval_ms: 750,
  request_bytes: 32768, evidence_response_bytes: 8192, other_response_bytes: 65536,
  graph_files: 512, graph_file_bytes: 16 * 1024 * 1024, graph_total_bytes: 64 * 1024 * 1024 });
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = resolve(ROOT, '../..');
const HASH = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const PACKAGE_VERSION = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8')).version;

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().filter(key => value[key] !== undefined)
    .map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}' : JSON.stringify(value);
const equal = (a, b) => canonical(a) === canonical(b);
const safePath = path => {
  assert(typeof path === 'string' && path.length <= 400 && /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(path)
    && !path.split('/').some(part => part === '.' || part === '..'), 'Unsafe producer path');
  return path;
};

export async function inspectVerifierProvenance({ serviceRoot = ROOT, publicExecution = false } = {}) {
  const git = (...args) => execFileSync('git', ['-C', serviceRoot, ...args], { encoding: 'utf8', timeout: 15000,
    stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let gitRoot = null, gitHead = null, worktreeClean = null;
  try {
    gitRoot = git('rev-parse', '--show-toplevel');
    gitHead = git('rev-parse', 'HEAD');
    worktreeClean = git('status', '--porcelain', '--untracked-files=all').length === 0;
  } catch { /* Local preflight records unavailable source-control identity without claiming a pin. */ }
  const hashAtHead = path => {
    if (!gitHead || !gitRoot) return null;
    const gitPath = relative(gitRoot, resolve(serviceRoot, path)).replaceAll('\\', '/');
    try { return sha256(execFileSync('git', ['-C', gitRoot, 'show', `${gitHead}:${gitPath}`], {
      maxBuffer: 2 * 1024 * 1024, timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] })); }
    catch { return null; }
  };
  const verifierPath = 'scripts/verify-graph-remote.mjs';
  const lockPath = 'package-lock.json';
  const verifierSha = sha256(await readFile(resolve(serviceRoot, verifierPath)));
  const lockSha = sha256(await readFile(resolve(serviceRoot, lockPath)));
  const verifierHeadSha = hashAtHead(verifierPath);
  const lockHeadSha = hashAtHead(lockPath);
  let workerSha = null, buildReceiptSha = null, buildReceiptWorkerSha = null, receiptLockSha = null, receiptVerifierSha = null;
  let buildReceiptStatus = 'missing', buildReceiptInputCount = 0, buildReceiptInputsMatchWorktree = null;
  try {
    const workerBytes = await readFile(resolve(serviceRoot, 'dist/server/index.js'));
    workerSha = sha256(workerBytes);
  } catch { /* A local or preflight run can occur before a build. */ }
  try {
    const receiptBytes = await readFile(resolve(serviceRoot, 'dist/build-receipt.json'));
    assert(receiptBytes.length <= 2 * 1024 * 1024, 'Build receipt exceeds its byte bound');
    const receipt = jsonFile(receiptBytes, 'build receipt');
    assert.equal(receipt.schema, 'okf-remote-mcp-build.v1');
    buildReceiptSha = sha256(receiptBytes);
    buildReceiptWorkerSha = receipt.outputs?.['dist/server/index.js'] ?? null;
    receiptLockSha = receipt.inputs?.['package-lock.json'] ?? null;
    receiptVerifierSha = receipt.inputs?.['scripts/verify-graph-remote.mjs'] ?? null;
    buildReceiptStatus = 'valid';
    const inputs = Object.entries(receipt.inputs ?? {});
    assert(inputs.length <= MAX_LIMITS.graph_files, 'Build receipt input count exceeds its bound');
    let totalInputBytes = 0; let inputsMatch = true;
    for (const [path, digest] of inputs) {
      assert(typeof path === 'string' && typeof digest === 'string' && HASH.test(digest), 'Malformed build receipt input binding');
      const absolute = resolve(serviceRoot, path);
      if (gitRoot && (relative(gitRoot, absolute) === '..' || relative(gitRoot, absolute).startsWith('../') || isAbsolute(relative(gitRoot, absolute)))) {
        inputsMatch = false; continue;
      }
      try {
        const bytes = await readFile(absolute);
        totalInputBytes += bytes.length;
        assert(bytes.length <= MAX_LIMITS.graph_file_bytes && totalInputBytes <= MAX_LIMITS.graph_total_bytes,
          'Build receipt input set exceeds its byte bound');
        if (sha256(bytes) !== digest) inputsMatch = false;
      } catch { inputsMatch = false; }
    }
    buildReceiptInputCount = inputs.length;
    buildReceiptInputsMatchWorktree = inputsMatch;
  } catch (error) {
    buildReceiptStatus = error?.code === 'ENOENT' ? 'missing' : 'invalid-or-unreadable';
  }
  const verifierMatchesHead = verifierHeadSha !== null && verifierSha === verifierHeadSha;
  const lockMatchesHead = lockHeadSha !== null && lockSha === lockHeadSha;
  const workerMatchesReceipt = workerSha !== null && buildReceiptWorkerSha === workerSha;
  const lockMatchesReceipt = receiptLockSha === lockSha;
  const verifierMatchesReceipt = receiptVerifierSha === verifierSha;
  const receiptInputsMatch = buildReceiptInputsMatchWorktree === true;
  if (publicExecution) {
    assert.match(gitHead ?? '', COMMIT, 'Public verification requires a Git checkout with a full HEAD');
    assert(verifierMatchesHead, 'Public verification requires the verifier bytes to match Git HEAD');
    assert(lockMatchesHead, 'Public verification requires package-lock.json to match Git HEAD');
    assert(workerMatchesReceipt, 'Public verification requires the local Worker bytes to match the build receipt');
    assert(lockMatchesReceipt, 'Public build receipt does not bind the current package lock');
    assert(verifierMatchesReceipt, 'Public build receipt does not bind the current verifier module');
    assert.equal(worktreeClean, true, 'Public verification requires a clean Git worktree');
    assert.equal(buildReceiptStatus, 'valid', 'Public verification requires a valid build receipt');
    assert(receiptInputsMatch, 'Public build receipt inputs differ from the current checkout');
  }
  return { repository_git_head: gitHead, repository_worktree_clean: worktreeClean,
    verifier_module_sha256: verifierSha, verifier_git_head_sha256: verifierHeadSha,
    verifier_matches_git_head: verifierMatchesHead, package_lock_sha256: lockSha,
    package_lock_git_head_sha256: lockHeadSha, package_lock_matches_git_head: lockMatchesHead,
    local_worker_sha256: workerSha, build_receipt_sha256: buildReceiptSha,
    build_receipt_worker_sha256: buildReceiptWorkerSha, worker_matches_build_receipt: workerMatchesReceipt,
    build_receipt_package_lock_sha256: receiptLockSha, package_lock_matches_build_receipt: lockMatchesReceipt,
    build_receipt_verifier_sha256: receiptVerifierSha, verifier_matches_build_receipt: verifierMatchesReceipt,
    build_receipt_status: buildReceiptStatus, build_receipt_input_file_count: buildReceiptInputCount,
    build_receipt_inputs_match_worktree: buildReceiptInputsMatchWorktree,
    worker_hash_scope: 'local dist/server/index.js only; not a remote deployment attestation',
    source_identity_status: verifierMatchesHead && lockMatchesHead && workerMatchesReceipt && lockMatchesReceipt
      && verifierMatchesReceipt && receiptInputsMatch && worktreeClean
      ? 'tracked-source-and-local-worker-match' : 'local-uncommitted-or-incomplete-build; no pin claim' };
}

export function parseGraphVerifierArgs(args) {
  const valueFlags = new Set(['--dwp-root', '--producer-commit', '--origin', '--output-dir']);
  const flags = new Set(), values = new Map();
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (['--execute-public', '--execute-local'].includes(token)) {
      assert(!flags.has(token) && !flags.has(token === '--execute-public' ? '--execute-local' : '--execute-public'), 'Choose one execution mode');
      flags.add(token); continue;
    }
    assert(valueFlags.has(token) && !values.has(token) && args[i + 1] && !args[i + 1].startsWith('--'), 'Invalid or duplicate argument');
    values.set(token, args[++i]);
  }
  assert(values.has('--dwp-root'), 'Use --dwp-root PATH');
  const mode = flags.has('--execute-public') ? 'public' : flags.has('--execute-local') ? 'local' : 'preflight';
  const origin = values.get('--origin');
  if (mode === 'public') assert.equal(origin, PUBLIC_ORIGIN, 'Public mode requires the exact approved HTTPS origin');
  if (mode === 'local') {
    assert(origin, 'Local execution requires an explicit loopback origin');
    const url = new URL(origin);
    assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      && url.origin === origin, 'Local execution is restricted to a loopback HTTP origin');
  }
  if (mode === 'preflight') assert(!origin, 'An origin is accepted only with an explicit execution mode');
  if (mode !== 'preflight') assert(values.has('--output-dir'), 'Execution requires a fresh --output-dir');
  const producerCommit = values.get('--producer-commit');
  if (producerCommit) assert.match(producerCommit, COMMIT, 'Producer commit must be a full SHA-1');
  return { mode, origin: origin ?? null, dwpRoot: resolve(values.get('--dwp-root')),
    producerCommit: producerCommit ?? null, outputDir: values.has('--output-dir') ? resolve(values.get('--output-dir')) : null };
}

function readGitBlob(repo, commit, path, limits = { fileBytes: MAX_LIMITS.graph_file_bytes, totalBytes: Infinity }) {
  safePath(path); assert.match(commit, COMMIT);
  const object = `${commit}:${path}`;
  const size = Number(execFileSync('git', ['-C', repo, 'cat-file', '-s', object], { encoding: 'utf8', timeout: 15000 }).trim());
  assert(Number.isSafeInteger(size) && size >= 0 && size <= limits.fileBytes, 'Producer blob exceeds file bound');
  const raw = execFileSync('git', ['-C', repo, 'show', object], { maxBuffer: size + 1, timeout: 30000 });
  assert.equal(raw.length, size, 'Producer blob length differs');
  if (limits.sha256) assert.equal(sha256(raw), limits.sha256, `Producer blob digest differs: ${path}`);
  if (limits.bytes !== undefined) assert.equal(raw.length, limits.bytes, `Producer blob byte count differs: ${path}`);
  return raw;
}

const SOURCE_PATHS = Object.freeze([
  'retrieval-graph/graph.json', 'combined/context/assembly-index.json',
  'evaluation/retrieval-gate/graph-evaluation.json',
  'evaluation/retrieval-gate/persona-cases.json',
  'evaluation/truncation/recovery-cases.json',
  'evaluation/out-of-sample/uc-disabled-child-supersession-001.json',
  'evaluation/context-assembly/imprisonment-case.json',
  'evaluation/context-assembly/source-check.json',
  'evaluation/remote-mcp/hospital-case.json',
  'evaluation/manual-structure/original-acceptance/protocol.json',
  'evaluation/retrieval-gate/withheld/attempt-02/protocol.json',
  'evaluation/retrieval-gate/withheld/attempt-02/freeze.json',
  'evaluation/retrieval-gate/withheld/attempt-02/receipt.json',
  'evaluation/retrieval-gate/withheld/attempt-02/run.mjs',
]);

function jsonFile(bytes, name) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`Pinned producer JSON is invalid: ${name}`); }
}
function pathRowsEqual(actual, expected) { return expected.every(path => actual.some(row => equal(path, row))); }

export function verifyTargetSourceProofs(recordIds, rows, graphRecords) {
  const result = {}, paths = {}, proofs = {};
  for (const id of recordIds) {
    const graphRecord = graphRecords.get(id);
    assert(graphRecord?.kind === 'evidence', `Expected source target is absent from pinned graph: ${id}`);
    const matching = rows.filter(row => (row.id ?? row.record_id ?? row.expected_record_id) === id);
    assert(matching.length > 0, `Expected source target lacks independent provenance: ${id}`);
    const textHash = sha256(Buffer.from(graphRecord.text));
    for (const source of matching) {
      if (source.literal_sha256) assert.equal(source.literal_sha256, textHash, `Target literal hash differs: ${id}`);
      if (source.text_sha256) assert.equal(source.text_sha256, textHash, `Target text hash differs: ${id}`);
      if (source.source_sha256) assert(graphRecord.provenance.some(row => row.source_sha256 === source.source_sha256),
        `Target source file hash is not in graph provenance: ${id}`);
    }
    result[id] = textHash;
    const pathSource = matching.find(source => source.paths);
    if (pathSource) paths[id] = pathSource.paths;
    const reasonSource = matching.find(source => source.reasons);
    if (reasonSource) proofs[id] = reasonSource.reasons;
    proofs[id] = { ...(proofs[id] ?? {}), independent_bindings: matching.map(source => ({
      ...(source.literal_sha256 ? { literal_sha256: source.literal_sha256 } : {}),
      ...(source.text_sha256 ? { text_sha256: source.text_sha256 } : {}),
      ...(source.source_sha256 ? { source_sha256: source.source_sha256 } : {}),
    })) };
  }
  return { text_sha256_by_record: result, paths_by_record: paths, proof_by_record: proofs };
}

export function buildQuestionSuite(inputs) {
  const { report, personaCases, recoveryProtocol, ucSpec, custody, sourceCheck, hospital,
    legacyProtocol, holdoutProtocol, holdoutFreeze, holdoutReceipt, graph } = inputs;
  assert.equal(report.schema, 'okf-dwp-graph-retrieval-evaluation.v1');
  assert.equal(report.gate.retrieval_target_gate, 'passed');
  assert.equal(report.gate.all_deliveries_complete, true);
  assert.equal(report.gate.no_assembly_truncation, true);
  assert.equal(report.gate.original_obligations_dropped, false);
  assert.equal(report.original_obligation_audit.dropped_obligation_count, 0);
  assert.equal(report.counts.open_boundary_ui_integrity_validations, 3);
  assert.equal(holdoutProtocol.schema, 'okf-hidden-holdout-candidate.v1');
  assert.equal(holdoutProtocol.counts.cases, 24);
  assert.equal(holdoutReceipt.trial_status, 'retrieval-and-boundary-gates-passed');
  assert.equal(holdoutReceipt.counts.positive_target_hits, 45);
  assert.equal(holdoutReceipt.counts.negative_controls_passed, 12);
  const personaById = new Map(personaCases.cases.map(row => [row.id, row]));
  const graphRecords = new Map(graph.index.records.map(row => [row.id, row]));
  const entries = [];
  const add = (caseId, group, question, expectations, metadata = {}) => {
    assert(typeof question === 'string' && question.trim() && question.length <= 2000, `Invalid question in ${caseId}`);
    const questionSha = sha256(Buffer.from(question));
    if (metadata.question_sha256) assert.equal(questionSha, metadata.question_sha256, `Question hash differs in ${caseId}`);
    entries.push({ case_id: caseId, group, question, question_sha256: questionSha,
      plan_id: metadata.plan_id, package_sha256: metadata.package_sha256,
      evidence_status: metadata.evidence_status ?? 'insufficient', retrieval_complete: metadata.retrieval_complete,
      assembly_truncated: metadata.assembly_truncated ?? false,
      obligations_declared: metadata.original_obligation_audit?.declared_count ?? null,
      expected_record_ids: [...(expectations.expected_record_ids ?? [])],
      expected_paths_by_record: expectations.paths_by_record ?? {},
      expected_source_sha256_by_record: expectations.text_sha256_by_record ?? {},
      target_proof_by_record: expectations.proof_by_record ?? {},
      negative_boundary: expectations.negative_boundary ?? false,
      case_type: metadata.kind ?? metadata.type ?? group,
      delivery_calls: metadata.delivery?.calls ?? null,
      requirement_count: metadata.requirement_count ?? null,
      retrieval_status: metadata.retrieval_status ?? null,
    });
  };
  const runnable = report.persona_cases.filter(row => ['retrieval', 'boundary'].includes(row.kind));
  assert.equal(runnable.length, 72, 'Expected 72 runnable persona cases');
  assert.equal(report.counts.persona_retrieval_cases, 62);
  assert.equal(report.counts.persona_boundary_cases, 10);
  for (const row of runnable) {
    const authored = personaById.get(row.id);
    assert(authored, `Missing authored persona case ${row.id}`);
    assert.equal(authored.prompt.question, row.question);
    const expected = row.target_coverage.expected_record_ids;
    const sourceRows = row.selected_source_records.filter(record => expected.includes(record.id));
    const proof = verifyTargetSourceProofs(expected, [
      ...authored.evaluation.target_provenance,
      ...sourceRows,
    ], graphRecords);
    for (const id of expected) {
      const sourceRow = sourceRows.find(candidate => candidate.id === id);
      assert(sourceRow, `Persona target lacks its report row: ${row.id} ${id}`);
      assert(Array.isArray(sourceRow.paths) && sourceRow.paths.length > 0, `Persona target path is absent: ${row.id}`);
      proof.paths_by_record[id] = sourceRow.paths;
      proof.proof_by_record[id] = { reasons: sourceRow.reasons, provenance: sourceRow.provenance };
    }
    assert.deepEqual(authored.evaluation.expected_records, expected, `Assessor target drift in ${row.id}`);
    add(row.id, 'persona-' + row.kind, row.question, { ...proof, expected_record_ids: expected,
      negative_boundary: row.kind === 'boundary' && expected.length === 0 }, row);
  }

  assert.equal(report.recovery_protocol_cases.length, 8);
  assert.equal(recoveryProtocol.cases.length, 8);
  for (const row of report.recovery_protocol_cases) {
    const protocolCase = recoveryProtocol.cases.find(candidate => candidate.id === row.id);
    assert(protocolCase, `Missing recovery protocol row ${row.id}`);
    const question = row.question;
    const expected = row.expected_record_ids;
    const proofRows = expected.map(id => {
      const protocolTarget = ucSpec.source_targets.find(candidate => candidate.unit_id === id);
      assert(protocolTarget, `Recovery target absent from independent UC source registry: ${id}`);
      return { id, source_sha256: protocolTarget.source_sha256 };
    });
    const proof = verifyTargetSourceProofs(expected, proofRows, graphRecords);
    add('recovery-' + row.id, 'recovery', question, { ...proof, expected_record_ids: expected,
      negative_boundary: expected.length === 0 }, row);
  }

  const ucRow = report.fixed_uc_out_of_sample_case;
  const ucProof = verifyTargetSourceProofs(ucRow.expected_record_ids,
    ucSpec.source_targets.map(row => ({ id: row.unit_id, source_sha256: row.source_sha256 })), graphRecords);
  add(ucRow.id, 'fixed-uc', ucRow.question, { ...ucProof, expected_record_ids: ucRow.expected_record_ids }, ucRow);

  const custodyRow = report.legacy_original_controls.custody;
  const custodyProofRows = custody.expected.sources.map(row => ({ id: row.record_id,
    source_sha256: row.source_sha256, literal_sha256: row.literal_sha256 }));
  const custodyProof = verifyTargetSourceProofs(custodyRow.expected_record_ids, custodyProofRows, graphRecords);
  assert.equal(custodyRow.expected_target_mapping.exact_source_and_literal_hash_matches, custodyRow.expected_record_ids.length);
  add('legacy-custody', 'legacy-control', custodyRow.question,
    { ...custodyProof, expected_record_ids: custodyRow.expected_record_ids }, custodyRow);
  const hospitalRow = report.legacy_original_controls.hospital;
  assert.equal(hospitalRow.expected_record_ids.length, 0);
  add('legacy-hospital', 'legacy-boundary', hospitalRow.question,
    { expected_record_ids: [], text_sha256_by_record: {}, paths_by_record: {}, negative_boundary: true }, hospitalRow);
  const unknownRow = report.legacy_original_controls.unknown_vocabulary;
  assert.equal(legacyProtocol.unknown_control.question, unknownRow.question);
  add('legacy-unknown-vocabulary', 'legacy-boundary', unknownRow.question,
    { expected_record_ids: [], text_sha256_by_record: {}, paths_by_record: {}, negative_boundary: true }, unknownRow);

  assert.equal(holdoutProtocol.cases.length, 24);
  assert.equal(holdoutReceipt.cases.length, 24);
  const holdoutRows = new Map(holdoutReceipt.cases.map(row => [row.id, row]));
  for (const row of holdoutProtocol.cases) {
    const expected = holdoutRows.get(row.id);
    assert(expected, `Missing attempt-02 receipt case ${row.id}`);
    assert.equal(expected.question_sha256, sha256(Buffer.from(row.question)));
    assert.equal(expected.graph_sha256, report.identities.graph_sha256);
    assert.equal(expected.engine_id, report.identities.engine_id);
    assert.equal(expected.package_complete, true);
    assert.equal(expected.delivery_complete, true);
    const sourceProofRows = (row.assessor_binding.source_targets ?? []).map(target => ({ id: target.id,
      source_sha256: target.source_sha256, literal_sha256: target.literal_sha256 }));
    const proof = verifyTargetSourceProofs(expected.expected_record_ids ?? [], sourceProofRows, graphRecords);
    const expectedSources = expected.observed_source_records.filter(source => expected.expected_record_ids?.includes(source.id));
    for (const target of expected.expected_record_ids ?? []) {
      const source = expectedSources.find(candidate => candidate.id === target);
      if (source) { proof.paths_by_record[target] = source.paths; proof.proof_by_record[target] = { paths: source.paths, reasons: source.reasons, provenance: source.provenance }; }
    }
    add('withheld-' + row.id, 'withheld-regression', row.question,
      { ...proof, expected_record_ids: expected.expected_record_ids ?? [], negative_boundary: row.class === 'negative-boundary-control' },
      { ...expected, question_sha256: expected.question_sha256 });
  }

  const byQuestion = new Map();
  for (const entry of entries) {
    const prior = byQuestion.get(entry.question_sha256);
    if (!prior) { byQuestion.set(entry.question_sha256, { ...entry, case_ids: [entry.case_id], groups: [entry.group], expectations: [entry] }); continue; }
    assert.equal(prior.question, entry.question, 'Question hash collision');
    assert.equal(prior.plan_id, entry.plan_id, `Repeated question has different expected plan identity: ${entry.case_id}`);
    assert.equal(prior.package_sha256, entry.package_sha256, `Repeated question has different expected package identity: ${entry.case_id}`);
    // The same wording may be a separately frozen control with a narrower
    // target set. Keep each assessor denominator in expectations and use the
    // union only for package-level display and leakage checks.
    prior.expected_record_ids = [...new Set([...prior.expected_record_ids, ...entry.expected_record_ids])].sort();
    prior.case_ids.push(entry.case_id); prior.expectations.push(entry);
    if (!prior.groups.includes(entry.group)) prior.groups.push(entry.group);
  }
  assert.equal(entries.length, 108, 'Expected 72 persona, 8 recovery, UC, 3 legacy and 24 withheld cases');
  return [...byQuestion.values()].sort((a, b) => a.question_sha256.localeCompare(b.question_sha256));
}

export function verifyGraphPackage({ packageValue, collection, questionEntry, graphRecords, obligationIds }) {
  assert.equal(packageValue.question, questionEntry.question, `Question changed in ${questionEntry.case_ids[0]}`);
  assert.equal(sha256(Buffer.from(packageValue.question)), questionEntry.question_sha256);
  assert.equal(packageValue.graph_sha256, questionEntry.graph_sha256 ?? packageValue.graph_sha256);
  assert.equal(packageValue.engine_id, questionEntry.engine_id ?? packageValue.engine_id);
  assert.equal(packageValue.plan_id, questionEntry.plan_id, `Plan ID differs in ${questionEntry.case_ids[0]}`);
  assert.equal(collection.summary.package_sha256, questionEntry.package_sha256, `Package digest differs in ${questionEntry.case_ids[0]}`);
  assert.equal(packageValue.evidence_status, 'insufficient');
  assert.equal(packageValue.ai_answer, null);
  assert.equal(packageValue.assembly_truncated, false);
  if (questionEntry.retrieval_complete !== undefined) assert.equal(packageValue.retrieval_complete,
    questionEntry.retrieval_complete, 'Retrieval completeness differs from the producer report');
  if (questionEntry.retrieval_status !== null && questionEntry.retrieval_status !== undefined) {
    assert.equal(packageValue.retrieval_status, questionEntry.retrieval_status, 'Retrieval status differs from the producer report');
  }
  assert.equal(collection.summary.delivery_complete, true);
  assert.equal(collection.summary.package_complete, true);
  assert(collection.summary.delivery.max_response_bytes <= MAX_LIMITS.evidence_response_bytes);
  assert(Array.isArray(packageValue.requirements), 'Requirement ledger is missing');
  if (questionEntry.requirement_count !== null && questionEntry.requirement_count !== undefined) {
    assert.equal(packageValue.requirements.length, questionEntry.requirement_count, 'Requirement count differs from producer report');
  }
  const selected = new Map(packageValue.selected.map(row => [row.record.id, row]));
  const sourceTextHashes = {};
  for (const expectation of questionEntry.expectations) {
    const expectedIds = expectation.expected_record_ids;
    for (const id of expectedIds) {
      const selectedRow = selected.get(id);
      assert(selectedRow, `Expected target is missing: ${expectation.case_id} ${id}`);
      const source = graphRecords.get(id);
      assert(source && source.kind === 'evidence', `Pinned source baseline is absent: ${id}`);
      const expectedTextHash = expectation.expected_source_sha256_by_record[id];
      const actualTextHash = sha256(Buffer.from(selectedRow.record.text));
      assert.equal(actualTextHash, expectedTextHash, `Source text hash differs: ${expectation.case_id} ${id}`);
      assert.equal(actualTextHash, sha256(Buffer.from(source.text)), `Source text differs from pinned graph source: ${id}`);
      sourceTextHashes[id] = actualTextHash;
      assert(selectedRow.paths.length > 0 && selectedRow.paths.some(path => path.assertions.length > 0 && path.records.at(-1) === id),
        `Target lacks a directed source path: ${expectation.case_id} ${id}`);
      const expectedPaths = expectation.expected_paths_by_record[id] ?? [];
      if (expectedPaths.length) assert(pathRowsEqual(selectedRow.paths, expectedPaths),
        `Scoped target paths differ: ${expectation.case_id} ${id}`);
      const expectedProof = expectation.target_proof_by_record[id];
      if (expectedProof?.reasons) for (const reason of expectedProof.reasons) assert(selectedRow.reasons.includes(reason),
        `Target path reason differs: ${expectation.case_id} ${id}`);
      if (expectedProof?.literal_sha256) assert.equal(expectedProof.literal_sha256, actualTextHash);
      if (expectedProof?.provenance) assert(equal(selectedRow.record.provenance, source.provenance),
        `Target provenance differs from pinned source graph: ${expectation.case_id} ${id}`);
    }
    if (expectation.negative_boundary) assert.equal(expectedIds.length, 0, `Boundary entered recall denominator: ${expectation.case_id}`);
  }
  for (const requirement of packageValue.requirements) {
    assert.equal(requirement.status, 'insufficient');
    assert(Array.isArray(requirement.required) && Array.isArray(requirement.open_obligation_ids)
      && Array.isArray(requirement.missing_record_ids), 'Requirement obligation ledger is malformed');
    const declared = requirement.required.filter(id => obligationIds.has(id));
    for (const id of declared) {
      assert(requirement.open_obligation_ids.includes(id), `Original obligation was not left open: ${id}`);
      assert(requirement.missing_record_ids.includes(id), `Original obligation was removed from missing records: ${id}`);
    }
  }
  return { source_text_sha256: sourceTextHashes, target_checks: questionEntry.expectations.map(row => ({
    case_id: row.case_id, target_count: row.expected_record_ids.length,
    path_count: row.expected_record_ids.reduce((sum, id) => sum + (row.expected_paths_by_record[id]?.length ?? 0), 0),
    source_hashes_verified: row.expected_record_ids.length,
    negative_boundary: row.negative_boundary,
  })) };
}

export function createGuardedFetch({ origin, upstream = fetch, pace = true, now = () => performance.now(),
  sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms)) } = {}) {
  assert(typeof origin === 'string');
  const started = now(); let previous = null; let chain = Promise.resolve(); let closed = false;
  const receipt = { calls: 0, bytes_received: 0, max_response_bytes: 0, min_request_interval_ms: null,
    automatic_retries: 0, evidence_calls: 0, evidence_response_bytes: 0, events: [] };
  const guardedFetch = async (input, init = {}) => {
    const original = new Request(input, init);
    const url = new URL(original.url);
    assert.equal(url.origin, origin, 'Request origin drift');
    assert(!url.search && !url.hash && !url.username && !url.password, 'Request URL contains disallowed components');
    assert((url.pathname === '/health' && original.method === 'GET') || (url.pathname === PUBLIC_PATH && original.method === 'POST'),
      'Request route/method is outside the verifier contract');
    for (const name of ['authorization', 'cookie', 'proxy-authorization']) assert.equal(original.headers.has(name), false, 'Credentials are disallowed');
    let requestBytes = 0; let bodyText = '';
    if (original.body) {
      const body = await original.clone().arrayBuffer(); requestBytes = body.byteLength;
      assert(requestBytes <= MAX_LIMITS.request_bytes, 'Request body exceeds byte ceiling');
      bodyText = new TextDecoder('utf-8', { fatal: true }).decode(body);
    }
    let rpcMethod = null, toolName = null, questionSha = null;
    if (bodyText) {
      const message = JSON.parse(bodyText);
      assert(message && message.jsonrpc === '2.0' && typeof message.method === 'string', 'Invalid JSON-RPC request');
      rpcMethod = message.method;
      assert(['initialize', 'notifications/initialized', 'notifications/cancelled', 'ping', 'server/discover', 'tools/list', 'tools/call'].includes(rpcMethod), 'Unexpected MCP method');
      if (rpcMethod === 'tools/call') {
        toolName = message.params?.name;
        assert(['plan_okf_evidence', 'read_okf_planned_evidence'].includes(toolName), 'Unexpected MCP tool');
        const args = message.params.arguments ?? {};
        assert(typeof args.question === 'string' && args.question.length <= 2000, 'Question is missing or overlong');
        questionSha = sha256(Buffer.from(args.question));
        const allowed = toolName === 'plan_okf_evidence'
          ? ['bundle', 'question', 'graph_sha256', 'engine_id', 'plan_id', 'offset', 'delivery_bytes']
          : ['bundle', 'question', 'graph_sha256', 'engine_id', 'plan_id', 'offset', 'delivery_bytes', 'section', 'record_id'];
        assert(Object.keys(args).every(key => allowed.includes(key)), 'Unexpected graph tool argument');
        assert(!Object.hasOwn(args, 'target_ids') && !Object.hasOwn(args, 'expected_records'), 'Assessor targets must never enter runtime inputs');
      }
    }
    const admit = chain.then(async () => {
      assert(!closed, 'Verifier stopped after prior failure');
      assert(receipt.calls < MAX_LIMITS.requests, 'Request count ceiling exceeded');
      if (pace && previous !== null) {
        while (now() - previous < MAX_LIMITS.interval_ms) await sleep(MAX_LIMITS.interval_ms - (now() - previous));
      }
      assert(now() - started < MAX_LIMITS.run_ms, 'Run time ceiling exceeded');
      const at = now();
      if (previous !== null) receipt.min_request_interval_ms = Math.min(receipt.min_request_interval_ms ?? Infinity, at - previous);
      previous = at; receipt.calls++;
    });
    chain = admit.catch(() => {}); await admit;
    const event = { sequence: receipt.calls, method: original.method, path: url.pathname, rpc_method: rpcMethod,
      tool: toolName, question_sha256: questionSha, request_bytes: requestBytes,
      request_sha256: bodyText ? sha256(Buffer.from(bodyText)) : null, status: null, response_bytes: 0, response_sha256: null };
    receipt.events.push(event);
    const overLimitAbort = new AbortController();
    const signal = AbortSignal.any([original.signal, AbortSignal.timeout(MAX_LIMITS.request_ms), overLimitAbort.signal]);
    try {
      const request = new Request(original, { redirect: 'manual', signal });
      const response = await upstream(request);
      if (response.url && response.url !== request.url) {
        await response.body?.cancel().catch(() => {});
        throw new Error('response-url-drift');
      }
      event.status = response.status;
      if (response.status < 200 || response.status >= 300) {
        await response.body?.cancel().catch(() => {});
        throw new Error('http-status');
      }
      const evidenceCall = rpcMethod === 'tools/call' && ['plan_okf_evidence', 'read_okf_planned_evidence'].includes(toolName);
      const responseLimit = evidenceCall ? MAX_LIMITS.evidence_response_bytes : MAX_LIMITS.other_response_bytes;
      const declaredLength = response.headers.get('content-length');
      if (declaredLength !== null) {
        if (!/^\d+$/.test(declaredLength)) {
          await response.body?.cancel().catch(() => {});
          throw new Error('invalid-content-length');
        }
        if (Number(declaredLength) > responseLimit) {
          await response.body?.cancel().catch(() => {});
          throw new Error('response-limit');
        }
      }
      const reader = response.body?.getReader();
      const chunks = []; let responseBytes = 0;
      if (reader) {
        try {
          while (true) {
            let onAbort;
            const aborted = new Promise((_, reject) => {
              onAbort = () => {
                reject(new Error('request-deadline'));
                void reader.cancel().catch(() => {});
              };
              if (signal.aborted) onAbort();
              else signal.addEventListener('abort', onAbort, { once: true });
            });
            let item;
            try { item = await Promise.race([reader.read(), aborted]); }
            finally { signal.removeEventListener('abort', onAbort); }
            if (signal.aborted) throw new Error('request-deadline');
            if (item.done) break;
            const chunk = item.value;
            responseBytes += chunk.byteLength;
            receipt.bytes_received += chunk.byteLength;
            event.response_bytes = responseBytes;
            receipt.max_response_bytes = Math.max(receipt.max_response_bytes, responseBytes);
            if (responseBytes > responseLimit || receipt.bytes_received > MAX_LIMITS.bytes) {
              overLimitAbort.abort();
              await reader.cancel().catch(() => {});
              throw new Error('response-limit');
            }
            chunks.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
          }
        } finally { reader.releaseLock(); }
      }
      const bytes = Buffer.concat(chunks, responseBytes);
      event.response_bytes = bytes.length; event.response_sha256 = sha256(bytes);
      if (evidenceCall) { receipt.evidence_calls++; receipt.evidence_response_bytes += bytes.length; }
      assert(declaredLength === null || Number(declaredLength) === bytes.length, 'Response Content-Length differs from body');
      const headers = new Headers(response.headers);
      headers.delete('content-length'); headers.delete('content-encoding'); headers.delete('transfer-encoding');
      const body = [204, 205, 304].includes(response.status) ? null : bytes;
      return new Response(body, { status: response.status, statusText: response.statusText, headers });
    } catch {
      closed = true; event.status ??= 'failed'; event.failure = 'request-rejected';
      throw new Error('Graph HTTP verification request failed');
    }
  };
  return { fetch: guardedFetch, receipt };
}

function buildObligationSet(graph, assemblyIndex) {
  const fromOriginal = new Set(assemblyIndex.requirements.flatMap(row => row.required.filter(id => id.includes('/obligation/'))));
  const inGraph = new Set(graph.index.requirements.flatMap(row => row.required.filter(id => id.includes('/obligation/'))));
  assert.equal(fromOriginal.size, 203, 'Frozen original obligation census differs');
  for (const id of fromOriginal) assert(inGraph.has(id), `Graph omitted a frozen original obligation ${id}`);
  return fromOriginal;
}

export async function loadPinnedGraphSuite({ dwpRoot, producerCommit, serviceRoot = ROOT, publicExecution = false }) {
  assert.match(producerCommit, COMMIT, 'A full producer commit is required');
  execFileSync('git', ['-C', dwpRoot, 'cat-file', '-e', `${producerCommit}^{commit}`], { stdio: 'ignore', timeout: 15000 });
  const verifierProvenance = await inspectVerifierProvenance({ serviceRoot, publicExecution });
  const releaseRaw = await readFile(resolve(serviceRoot, 'vendor/graph-evidence/admission.json'));
  const release = jsonFile(releaseRaw, 'graph admission');
  assert.equal(release.schema, 'okf-graph-evidence-admission.v1');
  if (publicExecution) {
    assert.equal(release.publication_status, 'pinned', 'Public execution rejects candidate admission');
    assert.match(release.source_commit ?? '', COMMIT, 'Pinned release lacks a producer commit');
    assert.equal(producerCommit, release.source_commit, 'Producer source commit differs from admitted release');
  } else if (release.publication_status === 'pinned') {
    assert.equal(producerCommit, release.source_commit, 'Local source commit differs from pinned release');
  } else assert.equal(release.publication_status, 'candidate', 'Unknown graph publication status');

  const blobs = new Map(); let totalBytes = 0;
  const read = path => {
    if (!blobs.has(path)) {
      const bytes = readGitBlob(dwpRoot, producerCommit, path);
      totalBytes += bytes.length;
      assert(blobs.size < MAX_LIMITS.graph_files && totalBytes <= MAX_LIMITS.graph_total_bytes, 'Pinned source bundle exceeds aggregate limits');
      blobs.set(path, bytes);
    }
    return blobs.get(path);
  };
  for (const path of SOURCE_PATHS) read(path);
  const docs = Object.fromEntries(SOURCE_PATHS.filter(path => path.endsWith('.json'))
    .map(path => [path, jsonFile(read(path), path)]));
  const graphBytes = read('retrieval-graph/graph.json');
  assert.equal(sha256(graphBytes), release.graph_sha256, 'Producer graph differs from service admission');
  assert.equal(sha256(graphBytes), docs['evaluation/retrieval-gate/graph-evaluation.json'].identities.graph_sha256);
  const graph = jsonFile(graphBytes, 'retrieval graph');
  assert.equal(graph.schema, 'okf-dwp-evidence-route-graph.v1');
  assert.equal(docs['evaluation/retrieval-gate/graph-evaluation.json'].identities.engine_id, release.engine_id);
  assert.equal(docs['evaluation/retrieval-gate/graph-evaluation.json'].identities.engine_id,
    docs['evaluation/retrieval-gate/withheld/attempt-02/freeze.json'].engine_id);
  assert.equal(docs['evaluation/retrieval-gate/graph-evaluation.json'].identities.graph_sha256,
    docs['evaluation/retrieval-gate/withheld/attempt-02/freeze.json'].graph_sha256);
  const holdoutFreeze = docs['evaluation/retrieval-gate/withheld/attempt-02/freeze.json'];
  const holdoutProtocolRaw = blobs.get('evaluation/retrieval-gate/withheld/attempt-02/protocol.json');
  assert.equal(sha256(holdoutProtocolRaw), holdoutFreeze.withheld_protocol_sha256);
  const holdoutReceipt = docs['evaluation/retrieval-gate/withheld/attempt-02/receipt.json'];
  assert.equal(holdoutReceipt.identities.protocol_sha256, holdoutFreeze.withheld_protocol_sha256);
  assert.equal(holdoutReceipt.identities.freeze_file_sha256, sha256(blobs.get('evaluation/retrieval-gate/withheld/attempt-02/freeze.json')));
  assert.equal(holdoutReceipt.identities.runner_sha256, sha256(blobs.get('evaluation/retrieval-gate/withheld/attempt-02/run.mjs')));
  assert.equal(holdoutReceipt.identities.client_sha256, holdoutFreeze.client_sha256);
  assert.equal(holdoutReceipt.identities.graph_sha256, release.graph_sha256);
  assert.equal(holdoutReceipt.identities.engine_id, release.engine_id);
  assert.equal(holdoutReceipt.gates.positive_retrieval, 'passed');
  assert.equal(holdoutReceipt.gates.negative_nonfabrication, 'passed');
  assert.equal(holdoutReceipt.gates.complete_bounded_delivery, 'passed');

  for (const binding of graph.source_bindings) {
    const bytes = read(safePath(binding.path));
    assert.equal(bytes.length, binding.bytes, `Graph source byte binding differs: ${binding.path}`);
    assert.equal(sha256(bytes), binding.sha256, `Graph source hash binding differs: ${binding.path}`);
  }
  assert.equal(release.engine_id, docs['evaluation/retrieval-gate/graph-evaluation.json'].identities.engine_id);
  assert.deepEqual(release.engine_admission, docs['evaluation/retrieval-gate/graph-evaluation.json'].identities.engine_admission);

  const graphRecords = new Map(graph.index.records.map(row => [row.id, row]));
  const obligations = buildObligationSet(graph, docs['combined/context/assembly-index.json']);
  const report = docs['evaluation/retrieval-gate/graph-evaluation.json'];
  const suite = buildQuestionSuite({ report,
    personaCases: docs['evaluation/retrieval-gate/persona-cases.json'],
    recoveryProtocol: docs['evaluation/truncation/recovery-cases.json'],
    ucSpec: docs['evaluation/out-of-sample/uc-disabled-child-supersession-001.json'],
    custody: docs['evaluation/context-assembly/imprisonment-case.json'],
    sourceCheck: docs['evaluation/context-assembly/source-check.json'],
    hospital: docs['evaluation/remote-mcp/hospital-case.json'],
    legacyProtocol: docs['evaluation/manual-structure/original-acceptance/protocol.json'],
    holdoutProtocol: docs['evaluation/retrieval-gate/withheld/attempt-02/protocol.json'],
    holdoutFreeze, holdoutReceipt, graph });
  const vendorGraph = await readFile(resolve(serviceRoot, 'vendor/graph-evidence/graph.json'));
  assert(vendorGraph.equals(graphBytes), 'Service-vendored graph differs from pinned producer graph');
  const clientBytes = await readFile(resolve(serviceRoot, 'vendor/graph-evidence/graph_evidence_client.mjs'));
  assert.equal(sha256(clientBytes), holdoutFreeze.client_sha256, 'Service graph client differs from frozen attempt-02 client');
  for (const [name, expectedHash] of Object.entries(release.engine_admission.modules)) {
    assert(/^[A-Za-z0-9_.-]+$/.test(name) && name !== '.' && name !== '..', 'Unsafe vendored module name in admission');
    const moduleBytes = await readFile(resolve(serviceRoot, 'vendor/graph-evidence', name));
    assert.equal(sha256(moduleBytes), expectedHash, `Vendored runtime module differs: ${name}`);
  }
  return { release, producerCommit, verifierProvenance,
    sourceFiles: [...blobs].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) })),
    graph, graphRecords, obligations, suite, holdoutReceipt };
}

const outputInventory = suite => ({ schema: 'okf-graph-remote-verification-plan.v1',
  producer_commit: suite.producerCommit, graph_sha256: suite.release.graph_sha256, engine_id: suite.release.engine_id,
  publication_status: suite.release.publication_status, identities: suite.sourceFiles,
  verifier_provenance: suite.verifierProvenance,
  question_count: suite.suite.length, case_occurrences: suite.suite.reduce((sum, row) => sum + row.case_ids.length, 0),
  predicted_http_requests: estimateCallCount(suite),
  questions: suite.suite.map(row => ({ question_sha256: row.question_sha256, case_ids: row.case_ids,
    groups: [...new Set(row.expectations.map(item => item.group))].sort(), plan_id: row.plan_id,
    package_sha256: row.package_sha256, expected_record_ids: [...new Set(row.expectations.flatMap(item => item.expected_record_ids))].sort(),
    expected_source_text_hashes: Object.assign({}, ...row.expectations.map(item => item.expected_source_sha256_by_record)) })) });

async function prepareOutputDirectory(path) {
  assert(path, 'Output directory is required for execution');
  const absolute = resolve(path);
  const rel = relative(REPOSITORY_ROOT, absolute);
  assert(rel === '..' || rel.startsWith('../') || isAbsolute(rel), 'Store verifier output outside the Explorer repository');
  await mkdir(absolute, { recursive: false });
  return absolute;
}
async function writeExclusive(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx' });
}
async function savePackage(out, entry, collection, checks, originalObligationIds) {
  const packagePath = `packages/${entry.question_sha256}.json.gz`;
  const packageBytes = gzipSync(Buffer.from(JSON.stringify(collection.package)), { level: 9, mtime: 0 });
  await writeExclusive(resolve(out, packagePath), packageBytes);
  const checkpoint = { schema: 'okf-graph-remote-question-checkpoint.v1', question_sha256: entry.question_sha256,
    case_ids: entry.case_ids, groups: [...new Set(entry.expectations.map(row => row.group))].sort(),
    plan_id: collection.summary.plan_id, package_sha256: collection.summary.package_sha256,
    graph_sha256: collection.summary.graph_sha256, engine_id: collection.summary.engine_id,
    package_file: packagePath, package_file_sha256: sha256(packageBytes), package_file_bytes: packageBytes.length,
    delivery: collection.summary.delivery, evidence_status: collection.package.evidence_status,
    ai_answer: collection.package.ai_answer, retrieval_complete: collection.package.retrieval_complete,
    retrieval_status: collection.package.retrieval_status, assembly_truncated: collection.package.assembly_truncated,
    source_target_checks: checks.target_checks, verified_source_text_sha256: checks.source_text_sha256,
    open_original_obligation_ids: [...new Set(collection.package.requirements.flatMap(row => row.open_obligation_ids
      .filter(id => originalObligationIds.has(id))))].sort(),
    declared_original_obligation_ids: [...new Set(collection.package.requirements.flatMap(row => row.required
      .filter(id => originalObligationIds.has(id))))].sort() };
  await writeExclusive(resolve(out, `checkpoints/${entry.question_sha256}.json`), Buffer.from(JSON.stringify(checkpoint, null, 2) + '\n'));
  return checkpoint;
}

function checkHealth(health, suite) {
  assert(health && health.ready === true, 'Graph service is not ready');
  assert.equal(health.version, PACKAGE_VERSION, 'Service version drift');
  assert.equal(health.graph_sha256, suite.release.graph_sha256, 'Public graph digest drift');
  assert.equal(health.graph_engine_id, suite.release.engine_id, 'Public graph engine drift');
  assert.equal(health.graph_publication_status, suite.release.publication_status, 'Graph publication status differs from producer admission');
}
const expectedToolNames = ['plan_okf_evidence', 'read_okf_planned_evidence'];
export function checkTools(tools) {
  assert(Array.isArray(tools) && tools.length === 2, 'Unexpected graph tool count');
  assert.deepEqual(tools.map(row => row.name), expectedToolNames, 'Graph tool names/order differ');
  for (const tool of tools) {
    const expectedSchemas = tool.name === 'plan_okf_evidence'
      ? [GRAPH_MANIFEST_INPUT_SCHEMA, GRAPH_MANIFEST_OUTPUT_SCHEMA]
      : [GRAPH_READ_INPUT_SCHEMA, GRAPH_READ_OUTPUT_SCHEMA];
    assert(equal(tool.inputSchema, expectedSchemas[0]), `${tool.name} input schema differs from the pinned local contract`);
    assert(equal(tool.outputSchema, expectedSchemas[1]), `${tool.name} output schema differs from the pinned local contract`);
    assert.equal(tool.annotations?.readOnlyHint, true);
    assert.equal(tool.annotations?.destructiveHint, false);
    assert.equal(tool.annotations?.idempotentHint, true);
    assert.equal(tool.annotations?.openWorldHint, false);
    assert.equal(tool._meta?.['okf/untrustedContent'], true);
    assert.deepEqual(tool._meta?.securitySchemes, [{ type: 'noauth' }]);
  }
}

async function requestHealth(guarded, origin, suite) {
  const response = await guarded.fetch(new Request(origin + '/health', { method: 'GET' }));
  const health = await response.json(); checkHealth(health, suite); return health;
}

async function collectOne(client, entry, suite, guarded, out, persist = true) {
  const invoke = (name, args) => {
    const payload = { bundle: 'okf-dwp', ...args };
    const targetIds = new Set(entry.expectations.flatMap(row => row.expected_record_ids));
    assert(!Object.keys(payload).some(key => /target|expected_record/i.test(key)), 'Assessor target field was constructed for runtime');
    assert(!Object.values(payload).some(value => typeof value === 'string' && [...targetIds].some(id => id && value.includes(id))),
      'Assessor target identifier leaked into a runtime question or argument');
    return client.callTool({ name, arguments: payload });
  };
  const collection = await collectGraphEvidence({ question: entry.question,
    expectedGraphSha256: suite.release.graph_sha256, expectedEngineId: suite.release.engine_id,
    deliveryBytes: MAX_LIMITS.evidence_response_bytes,
    transport: { manifest: args => invoke('plan_okf_evidence', args), read: args => invoke('read_okf_planned_evidence', args) } });
  const checks = verifyGraphPackage({ packageValue: collection.package, collection,
    questionEntry: { ...entry, graph_sha256: suite.release.graph_sha256, engine_id: suite.release.engine_id },
    graphRecords: suite.graphRecords, obligationIds: suite.obligations });
  const checkpoint = persist ? await savePackage(out, entry, collection, checks, suite.obligations) : null;
  return { collection, checkpoint };
}

function makeV2Client(endpoint, fetcher) {
  const client = new Client({ name: 'okf-graph-public-sdk-verifier', version: '1.0.0' }, {
    jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
    versionNegotiation: { mode: { pin: '2026-07-28' } },
  });
  const transport = new StreamableHTTPClientTransport(endpoint, { fetch: fetcher,
    reconnectionOptions: { maxRetries: 0, maxReconnectionDelay: 1000, initialReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 } });
  return { client, transport };
}
function makeV1Client(endpoint, fetcher) {
  const client = new LegacyClient({ name: 'okf-graph-legacy-sdk-verifier', version: '1.0.0' });
  const transport = new LegacyTransport(endpoint, { fetch: fetcher,
    reconnectionOptions: { maxRetries: 0, maxReconnectionDelay: 1000, initialReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 } });
  return { client, transport };
}

function estimateCallCount(suite) {
  const calls = suite.suite.map(row => {
    const source = row.expectations.find(expectation => expectation.delivery_calls != null);
    return source?.delivery_calls ?? 24;
  });
  const uc = suite.suite.find(row => row.groups?.includes('fixed-uc'));
  const ucCalls = uc?.expectations.find(row => row.delivery_calls != null)?.delivery_calls ?? 24;
  // Health, SDK initialisation/tool discovery (v2+v1), plus the v1 UC replay.
  const predicted = calls.reduce((sum, value) => sum + value, 0) + ucCalls + 8;
  assert(predicted <= MAX_LIMITS.requests, 'Predicted HTTP request count exceeds the 12,000-call ceiling');
  return predicted;
}

export async function executeGraphVerification({ suite, origin, mode, outputDir, upstreamFetch = fetch,
  pace = true, timing } = {}) {
  assert(['public', 'local'].includes(mode));
  if (mode === 'public') assert.equal(origin, PUBLIC_ORIGIN, 'Public execution requires the exact approved origin');
  if (mode === 'local') {
    const url = new URL(origin);
    assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Local execution requires loopback HTTP');
  }
  const output = await prepareOutputDirectory(outputDir);
  const inventory = outputInventory(suite);
  await writeExclusive(resolve(output, 'plan.json'), Buffer.from(JSON.stringify({ ...inventory,
    run_mode: mode === 'public' ? 'public-connected-sdk-verification' : 'local-loopback-integration',
    withheld_wording_status: 'attempt-02 regression replay; not a fresh blind trial' }, null, 2) + '\n'));
  estimateCallCount(suite); // Enforce the request ceiling before starting a collection.
  const guard = createGuardedFetch({ origin, upstream: upstreamFetch, pace, ...(timing ?? {}) });
  const startedAt = new Date().toISOString(); const started = performance.now();
  const completed = new Set(); let toolsDigest = null; let health;
  let finalStatus = 'failed';
  try {
    health = await requestHealth(guard, origin, suite);
    const endpoint = new URL(PUBLIC_PATH, origin);
    const v2 = makeV2Client(endpoint, guard.fetch);
    try {
      await v2.client.connect(v2.transport);
      const discovery = await v2.client.listTools(); checkTools(discovery.tools);
      toolsDigest = sha256(Buffer.from(canonical(discovery.tools)));
      for (const entry of suite.suite) {
        const { checkpoint } = await collectOne(v2.client, entry, suite, guard, output);
        completed.add(entry.question_sha256);
        await writeExclusive(resolve(output, `case-index/${entry.question_sha256}.json`), Buffer.from(JSON.stringify({
          question_sha256: entry.question_sha256, case_ids: entry.case_ids, checkpoint_sha256: sha256(Buffer.from(JSON.stringify(checkpoint, null, 2) + '\n')),
        }, null, 2) + '\n'));
      }
    } finally { await v2.client.close(); }

    const v1 = makeV1Client(endpoint, guard.fetch);
    let sdkV1UC;
    try {
      await v1.client.connect(v1.transport);
      const discovery = await v1.client.listTools(); checkTools(discovery.tools);
      assert.equal(sha256(Buffer.from(canonical(discovery.tools))), toolsDigest, 'SDK v1 and v2 tool rows differ');
      const uc = suite.suite.find(row => row.groups.includes('fixed-uc'));
      assert(uc, 'Fixed UC comparison package is missing');
      sdkV1UC = await collectOne(v1.client, uc, suite, guard, output, false);
      assert.equal(sdkV1UC.collection.summary.package_sha256, uc.package_sha256, 'SDK v1 UC package differs from producer report');
    } finally { await v1.client.close(); }

    assert.equal(completed.size, suite.suite.length, 'Not every unique question was completed');
    assert(guard.receipt.calls <= MAX_LIMITS.requests);
    assert(performance.now() - started < MAX_LIMITS.run_ms);
    finalStatus = 'passed';
    const summary = { schema: 'okf-graph-remote-sdk-verification.v1', status: finalStatus,
      run: { mode, started_at: startedAt, duration_ms: Math.round(performance.now() - started),
        http_requests: guard.receipt.calls, public_network_calls: mode === 'public' ? guard.receipt.calls : 0,
        model_calls: 0, paid_api_calls: 0,
        automatic_retries: guard.receipt.automatic_retries },
      identities: { service_version: health.version, graph_sha256: suite.release.graph_sha256,
        engine_id: suite.release.engine_id, producer_commit: suite.producerCommit,
        admission_status: suite.release.publication_status, sdk_v2_tool_rows_sha256: toolsDigest,
        sdk_v1_tool_rows_sha256: toolsDigest, sdk_v1_uc_package_sha256: sdkV1UC.collection.summary.package_sha256,
        verifier_provenance: suite.verifierProvenance },
      counts: { source_case_occurrences: inventory.case_occurrences, unique_questions: suite.suite.length,
        completed_unique_questions: completed.size,
        expected_positive_targets: suite.suite.reduce((sum, row) => sum + row.expectations.reduce((total, expectation) => total + expectation.expected_record_ids.length, 0), 0),
        evidence_http_calls: guard.receipt.evidence_calls, max_evidence_http_response_bytes: Math.max(0, ...guard.receipt.events
          .filter(row => row.tool === 'plan_okf_evidence' || row.tool === 'read_okf_planned_evidence').map(row => row.response_bytes)),
        bytes_received: guard.receipt.bytes_received, original_graph_obligation_count: suite.obligations.size },
      gates: { producer_package_identity: 'passed', expected_targets_and_paths: 'passed', source_text_hashes: 'passed',
        insufficient_boundary: 'passed', no_truncation: 'passed', original_obligations_open: 'passed',
        full_http_envelope_limit: 'passed', sdk_v1_v2_tool_parity: 'passed', withheld_cases: 'attempt-02 regression replay; not a new blind trial',
        legal_or_entitlement_sufficiency: 'not-assessed', accessibility: 'not-assessed' },
      wire_receipt: { calls: guard.receipt.calls, bytes_received: guard.receipt.bytes_received,
        max_response_bytes: guard.receipt.max_response_bytes, max_evidence_response_bytes: summaryMaxEvidence(guard.receipt),
        min_request_interval_ms: guard.receipt.min_request_interval_ms, automatic_retries: 0,
        events: guard.receipt.events },
      limitations: ['Exact package replay, target retrieval and bounded HTTP delivery do not establish legal sufficiency or a correct entitlement answer.',
        'The service returns evidence only; interpretation, accessibility and specialist acceptance were not assessed.',
        'The withheld questions reproduce attempt-02 and are regression wording, not a fresh blind benchmark.'] };
    await writeExclusive(resolve(output, 'summary.json'), Buffer.from(JSON.stringify(summary, null, 2) + '\n'));
    return { output, summary };
  } finally {
    if (finalStatus !== 'passed') {
      const failure = { schema: 'okf-graph-remote-sdk-verification-progress.v1', status: 'incomplete',
        completed_unique_questions: completed.size, total_unique_questions: suite.suite.length,
        requests: guard.receipt.calls, bytes_received: guard.receipt.bytes_received,
        verifier_provenance: suite.verifierProvenance,
        automatic_retries: 0, no_raw_error_or_response_logged: true };
      try { await writeExclusive(resolve(output, 'incomplete.json'), Buffer.from(JSON.stringify(failure, null, 2) + '\n')); } catch { /* Preserve first failure evidence. */ }
    }
    try { await writeExclusive(resolve(output, 'wire.json'), Buffer.from(JSON.stringify(guard.receipt, null, 2) + '\n')); } catch { /* Existing attempt output is never overwritten. */ }
  }
}

function summaryMaxEvidence(receipt) {
  return Math.max(0, ...receipt.events.filter(row => row.tool === 'plan_okf_evidence' || row.tool === 'read_okf_planned_evidence')
    .map(row => row.response_bytes));
}

async function loadAdmissionSourceCommit({ mode, release, explicit }) {
  if (mode === 'public') {
    assert.equal(release.publication_status, 'pinned', 'Public verifier refuses candidate release');
    assert.match(release.source_commit ?? '', COMMIT, 'Public admission lacks its immutable producer commit');
    if (explicit) assert.equal(explicit, release.source_commit, 'Explicit producer commit differs from public admission');
    return release.source_commit;
  }
  if (explicit) return explicit;
  if (release.publication_status === 'pinned' && COMMIT.test(release.source_commit ?? '')) return release.source_commit;
  throw new Error('Candidate/local preflight requires --producer-commit FULL_SHA');
}

export async function runGraphVerifier(args, injection = {}) {
  const { mode, dwpRoot, outputDir, origin, producerCommit: explicitCommit } = args;
  const admission = jsonFile(await readFile(resolve(ROOT, 'vendor/graph-evidence/admission.json')), 'admission');
  const producerCommit = await loadAdmissionSourceCommit({ mode, release: admission, explicit: explicitCommit });
  const suite = await loadPinnedGraphSuite({ dwpRoot, producerCommit, publicExecution: mode === 'public' });
  if (mode === 'preflight') return { status: 'preflight-passed-no-network', producer_commit: producerCommit,
    graph_sha256: suite.release.graph_sha256, engine_id: suite.release.engine_id,
    admission_status: suite.release.publication_status, unique_questions: suite.suite.length,
    case_occurrences: suite.suite.reduce((sum, row) => sum + row.case_ids.length, 0),
    verifier_provenance: suite.verifierProvenance,
    output_plan: outputInventory(suite) };
  if (mode === 'local') {
    const url = new URL(origin);
    assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Local verifier only accepts loopback');
  }
  return executeGraphVerification({ suite, origin, mode, outputDir,
    upstreamFetch: injection.fetch ?? fetch, pace: injection.pace ?? true, timing: injection.timing });
}

async function main() {
  const args = parseGraphVerifierArgs(process.argv.slice(2));
  const result = await runGraphVerifier(args);
  const summary = result.summary;
  process.stdout.write(JSON.stringify(summary ? { status: summary.status, output: result.output,
    unique_questions: summary.counts.unique_questions, completed: summary.counts.completed_unique_questions,
    requests: summary.wire_receipt.calls, max_evidence_response_bytes: summary.counts.max_evidence_http_response_bytes,
    sdk_v1_v2_tool_parity: summary.gates.sdk_v1_v2_tool_parity }
    : { status: result.status, producer_commit: result.producer_commit, graph_sha256: result.graph_sha256,
      engine_id: result.engine_id, admission_status: result.admission_status,
      unique_questions: result.unique_questions, case_occurrences: result.case_occurrences }) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { process.stderr.write('Graph SDK verification failed; detailed server bodies and raw errors were not logged.\n'); process.exitCode = 1; });
}
