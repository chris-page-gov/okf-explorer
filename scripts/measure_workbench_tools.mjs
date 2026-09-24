#!/usr/bin/env node
/** Deterministic, local-only replay of the actual static workbench service. No model calls. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, realpath, stat, mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'apps/okf-explorer');
const receiptRoot = join(root, 'validation/workbench-tools/2026-09-24');
const args = process.argv.slice(2);
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  assert(i + 1 < args.length && /^--(?:manifest|manifest-sha256|output)$/.test(args[i]) && !options.has(args[i]), 'Use unique --manifest, --manifest-sha256 and --output arguments.');
  options.set(args[i], args[i + 1]);
}
for (const name of ['--manifest', '--manifest-sha256', '--output']) assert(options.has(name), `Missing ${name}.`);
assert(/^[a-f0-9]{64}$/.test(options.get('--manifest-sha256')), 'Expected a lower-case SHA-256 manifest digest.');
const manifestPath = await realpath(resolve(options.get('--manifest')));
const manifestRoot = dirname(manifestPath);
const outputPath = resolve(options.get('--output'));
assert(outputPath.startsWith(receiptRoot + sep) && outputPath.endsWith('.json'), 'Output must be a JSON receipt under validation/workbench-tools/2026-09-24/.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await readFile(manifestPath);
assert.equal(hash(manifestBytes), options.get('--manifest-sha256'), 'Manifest SHA-256 mismatch.');
assert(manifestBytes.length <= 256 * 1024, 'Manifest exceeds the workbench limit.');
const manifestRaw = JSON.parse(manifestBytes);
assert.equal(manifestRaw.questions?.length, 40, 'This replay requires the complete 40-question candidate.');
const sourceFiles = [
  'apps/okf-explorer/src/lib/evidence/session.ts', 'apps/okf-explorer/src/lib/evidence/toolContracts.ts',
  'apps/okf-explorer/src/lib/evidence/toolTypes.ts', 'apps/okf-explorer/src/lib/evidence/workbench.ts',
  'apps/okf-explorer/src/lib/evidence/modelValidation.ts', 'apps/okf-explorer/src/lib/context/packageDelivery.ts',
  'apps/okf-explorer/src/lib/sources/releaseDataPlane.ts', 'apps/okf-explorer/src/lib/context/index.ts',
  'apps/okf-explorer/src/lib/context/corpus.ts', 'apps/okf-explorer/src/lib/context/corpusV3.ts',
  'apps/okf-explorer/src/lib/context/types.ts', 'apps/okf-explorer/src/lib/context/delivery.ts',
  'scripts/measure_workbench_tools.mjs'
];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async name => [name, hash(await readFile(join(root, name)))])));
const git = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
assert.equal(git.status, 0, 'Could not identify Explorer base commit.');
const baseCommit = git.stdout.trim();
const nativeFetch = globalThis.fetch;
let localReads = 0, localBytes = 0;
const base = new URL('https://workbench-replay.invalid/local/manifest.json');
const allowedPrefix = new URL('.', base).href;
const localFetch = async (requested, init = {}) => {
  if (init.signal?.aborted) throw init.signal.reason ?? new DOMException('Cancelled.', 'AbortError');
  const url = new URL(String(requested));
  assert(url.href.startsWith(allowedPrefix) && url.origin === base.origin && !url.search && !url.hash, 'Network or out-of-scope URL blocked.');
  const encoded = url.href.slice(allowedPrefix.length);
  const parts = encoded.split('/').map(part => decodeURIComponent(part));
  assert(parts.length && parts.every(part => part && part !== '.' && part !== '..' && !part.includes('/') && !part.includes('\\')), 'Unsafe local path.');
  const candidate = resolve(manifestRoot, ...parts);
  assert(candidate.startsWith(manifestRoot + sep), 'Local file escaped manifest directory.');
  const actual = await realpath(candidate);
  assert(actual.startsWith(manifestRoot + sep), 'Local file symlink escaped manifest directory.');
  const info = await stat(actual);
  assert(info.isFile() && info.size <= 512 * 1024, 'Local response exceeds file limit.');
  const bytes = await readFile(actual);
  localReads++; localBytes += bytes.length;
  const response = new Response(bytes, { status: 200, headers: { 'content-type': 'application/json' } });
  Object.defineProperty(response, 'url', { value: url.href });
  return response;
};
globalThis.fetch = localFetch;
const temp = await mkdtemp(join(tmpdir(), 'okf-workbench-replay-'));
let receipt;
try {
  // Build to a temporary SSR bundle: TypeScript and $lib aliases are resolved without a listening server.
  const vite = await import(pathToFileURL(join(app, 'node_modules/vite/dist/node/index.js')).href);
  await vite.build({ root: app, configFile: false, logLevel: 'error', resolve: { alias: { $lib: join(app, 'src/lib') } },
    build: { ssr: true, outDir: temp, emptyOutDir: true, rollupOptions: { input: {
      session: join(app, 'src/lib/evidence/session.ts'), contracts: join(app, 'src/lib/evidence/toolContracts.ts'),
      workbench: join(app, 'src/lib/evidence/workbench.ts') }, output: { entryFileNames: '[name].mjs' } } } });
  const [{ WorkbenchSession }, { TOOL_CONTRACTS }, { parseManifest, loadPackage }] = await Promise.all(['session', 'contracts', 'workbench'].map(name => import(pathToFileURL(join(temp, `${name}.mjs`)).href)));
  const manifest = parseManifest(manifestRaw, base);
  const descriptorText = JSON.stringify(TOOL_CONTRACTS);
  const descriptor = { tools: TOOL_CONTRACTS.length, serialised_bytes: Buffer.byteLength(descriptorText), characters: descriptorText.length,
    estimated_tokens: Math.ceil(descriptorText.length / 4), maximum_name: Math.max(...TOOL_CONTRACTS.map(tool => tool.name.length)),
    maximum_description: Math.max(...TOOL_CONTRACTS.map(tool => tool.description.length)) };
  assert.equal(descriptor.tools, 7);
  const entries = new Map(manifest.questions.map(item => [item.id, item]));
  const baseline = {};
  const calls = [];
  const failures = [];
  const state = { revision: 0, loading: false, manifest, manifestUrl: base.href, manifestDigest: hash(manifestBytes), caseId: null, recordId: null, view: 'source', context: null };
  const port = { state: () => state, deepLink: selection => `${base.href}?case=${encodeURIComponent(selection.case_id)}&view=${encodeURIComponent(selection.view)}`,
    present: async (selection, expected, signal) => { assert(!signal.aborted && state.revision === expected, 'Stale or cancelled presentation.');
      Object.assign(state, { caseId: selection.case_id, recordId: selection.record_id ?? null, view: selection.view, revision: state.revision + 1 }); } };
  let session = new WorkbenchSession(port);
  const snapshot = `sha256:${hash(manifestBytes)}`;
  const packageFor = async id => {
    const entry = entries.get(id); assert(entry, `Unknown case ${id}`);
    const rawPath = resolve(manifestRoot, entry.package.url);
    assert(rawPath.startsWith(manifestRoot + sep), 'Baseline path escaped manifest directory.');
    const actualRaw = await realpath(rawPath);
    assert(actualRaw.startsWith(manifestRoot + sep), 'Baseline symlink escaped manifest directory.');
    const raw = await readFile(actualRaw);
    assert.equal(hash(raw), entry.package.sha256, `Raw package SHA-256 mismatch: ${id}`);
    const context = await loadPackage(entry, base);
    assert.equal(JSON.stringify(context), raw.toString('utf8'), `Canonical package changed on delivery: ${id}`);
    assert.equal(context.question, entry.question);
    baseline[id] = { package_sha256: hash(raw), package_bytes: raw.length, context_id: context.context_id,
      evidence_status: context.evidence_status, selected_records: context.selected.length, relationships: context.relationships.length,
      source_record_ids_sha256: hash(Buffer.from(JSON.stringify(context.selected.map(row => row.record.id)))) };
    return context;
  };
  const select = async id => { state.caseId = id; state.context = await packageFor(id); state.recordId = null; state.revision++; };
  const call = async (journey, name, input) => {
    const before = performance.now();
    let result;
    try { result = await session.invoke(name, input); }
    catch (error) { failures.push({ journey, tool: name, exception: String(error) }); return null; }
    const text = JSON.stringify(result);
    const entry = { journey, tool: name, input, response_bytes: Buffer.byteLength(text), response_characters: text.length,
      reported_bytes: result.delivery.bytes, reported_characters: result.delivery.characters,
      estimated_tokens: result.delivery.estimated_tokens, elapsed_ms: Math.round((performance.now() - before) * 1000) / 1000,
      evidence_status: result.evidence_status, complete: result.delivery.complete, error: result.error?.code ?? null };
    calls.push(entry);
    if (entry.response_bytes !== entry.reported_bytes || entry.response_characters !== entry.reported_characters || entry.response_bytes > Number(input.max_bytes ?? 4096)) failures.push({ journey, tool: name, reason: 'response_measure_or_budget_mismatch', entry });
    if (result.error) failures.push({ journey, tool: name, code: result.error.code, message: result.error.message });
    return result;
  };
  const callPages = async (journey, name, input) => {
    const pages = [];
    let cursor;
    do {
      const result = await call(journey, name, { ...input, ...(cursor ? { cursor } : {}) });
      if (!result) return pages;
      pages.push(result);
      if (result.error) return pages;
      cursor = result.delivery.next_cursor ?? undefined;
      assert(pages.length <= 30, `Unbounded continuation: ${name}`);
    } while (cursor);
    return pages;
  };
  // The search is a discovery call over all 40 questions, before any package is selected.
  const carerFind = await call('staff-039', 'okf_search_evidence', { query: 'Carers Allowance impact on other benefits', scope: 'questions', limit: 10, snapshot_id: snapshot });
  if (!carerFind?.data?.items?.some(row => row.case_id === 'staff-039')) failures.push({ journey: 'staff-039', reason: 'search_did_not_find_staff_039' });
  await select('staff-039');
  await call('staff-039', 'okf_get_state', {});
  const carerEvidence = await call('staff-039', 'okf_search_evidence', { query: 'carer allowance', scope: 'evidence', case_id: 'staff-039', limit: 3, snapshot_id: snapshot });
  const carerRef = carerEvidence?.data?.items?.[0]?.ref;
  if (!carerRef) failures.push({ journey: 'staff-039', reason: 'no_evidence_reference' });
  else {
    const passage = await call('staff-039', 'okf_get_evidence', { ref: carerRef, section: 'passage', max_bytes: 32768, snapshot_id: snapshot });
    if (passage?.data?.text) {
      const sourceId = passage.data.canonical_id;
      const source = state.context.selected.find(row => row.record.id === sourceId)?.record;
      if (!source || !source.text.startsWith(passage.data.text)) failures.push({ journey: 'staff-039', reason: 'passage_differs_from_canonical_source' });
    }
    await call('staff-039', 'okf_get_relationships', { ref: carerRef, depth: 1, limit: 10, max_bytes: 32768, snapshot_id: snapshot });
  }
  const interactionPages = await callPages('staff-039', 'okf_get_view_data', { case_id: 'staff-039', view: 'interactions', max_bytes: 32768, snapshot_id: snapshot });
  const interactions = interactionPages[0];
  if (!interactionPages.at(-1)?.delivery.complete) failures.push({ journey: 'staff-039', reason: 'interaction_pages_incomplete' });
  if (interactions?.result_id) await call('staff-039', 'okf_show_view', { case_id: 'staff-039', result_id: interactions.result_id, expected_revision: state.revision, snapshot_id: snapshot });
  for (const id of ['staff-015', 'staff-016']) {
    const found = await call('formula', 'okf_search_evidence', { query: entries.get(id).question, scope: 'questions', limit: 10, snapshot_id: snapshot });
    if (!found?.data?.items?.some(row => row.case_id === id)) failures.push({ journey: 'formula', reason: `search_did_not_find_${id}` });
    await select(id);
    await callPages('formula', 'okf_get_calculation', { case_id: id, section: 'inputs', model_id: 'pension-credit-source-inspection-v1', max_bytes: 32768, snapshot_id: snapshot });
    await callPages('formula', 'okf_get_calculation', { case_id: id, section: 'stages', model_id: 'pension-credit-source-inspection-v1', max_bytes: 32768, snapshot_id: snapshot });
    await callPages('formula', 'okf_get_view_data', { case_id: id, view: 'calculation', max_bytes: 32768, snapshot_id: snapshot });
  }
  const all40 = [];
  for (const entry of manifest.questions) {
    // Manual catalogue inspection is a distinct bounded page session per case.
    session.dispose(); session = new WorkbenchSession(port);
    await select(entry.id);
    const row = { id: entry.id, evidence_status: state.context.evidence_status, views: {} };
    for (const view of ['graph', 'requirements', 'rates']) {
      const pages = await callPages('all-40', 'okf_get_view_data', { case_id: entry.id, view, max_bytes: 32768, snapshot_id: snapshot });
      const result = pages[0], final = pages.at(-1);
      row.views[view] = { error: pages.find(page => page.error)?.error?.code ?? null, complete: final?.delivery.complete ?? false,
        pages: pages.length, rows: pages.reduce((sum, page) => sum + (page?.data?.rows?.length ?? 0), 0),
        limitations: result?.data?.limitations?.length ?? null,
        unknowns_visible: view === 'rates' ? Boolean(result?.data?.limitations?.some(text => /unknown|no reviewed/i.test(text))) : undefined };
      if (!row.views[view].complete) failures.push({ journey: 'all-40', case_id: entry.id, view, reason: 'view_pages_incomplete' });
      if (view === 'rates' && !row.views[view].unknowns_visible) failures.push({ journey: 'all-40', case_id: entry.id, reason: 'rates_unknowns_not_visible' });
    }
    if (state.context.context_id !== baseline[entry.id].context_id || state.context.evidence_status !== baseline[entry.id].evidence_status) failures.push({ journey: 'all-40', case_id: entry.id, reason: 'source_identity_or_status_changed' });
    all40.push(row);
  }
  const baselineBytes = Object.values(baseline).reduce((total, row) => total + row.package_bytes, 0);
  const responseBytes = calls.reduce((total, row) => total + row.response_bytes, 0);
  receipt = { schema: 'okf-workbench-tools-measurement.v1', method: 'Actual static WorkbenchSession over locally hash-verified candidate packages; no model or network calls.',
    inputs: { manifest_path: relative(root, manifestPath), manifest_sha256: hash(manifestBytes), manifest_bytes: manifestBytes.length,
      explorer_base_commit: baseCommit, explorer_files_sha256: sourceHashes,
      dwp_registry_sha256: manifestRaw.source?.registry_sha256 ?? null, dwp_corpus_sha256: manifestRaw.source?.corpus_sha256 ?? null },
    descriptor, limits: { case_count: 40, requested_view_cap_bytes: 32768, local_file_ceiling_bytes: 512 * 1024 },
    measurement: { calls, total_reply_bytes: responseBytes, total_reply_characters: calls.reduce((n, row) => n + row.response_characters, 0),
      total_reply_estimated_tokens: calls.reduce((n, row) => n + row.estimated_tokens, 0),
      whole_package_baseline_bytes: baselineBytes, local_file_reads: localReads, local_file_bytes: localBytes, network_calls: 0, model_calls: 0 },
    baseline, all40, failures,
    limitations: ['Retrieval and view delivery do not establish evidence sufficiency or legal applicability.', 'Call times are local observations, not network or assistant-host latency.', 'Estimated tokens use the service character heuristic, not a model tokenizer.', 'The 40 manual view checks use a fresh bounded page session for each case; an uninterrupted 40-case tool journey reaches the service journey budget. A person must explicitly reload the manifest to reset that budget.', 'The first unreset 40-case control run is retained in measurement-initial.json and its expected journey_budget failures must not be read as source failures.'] };
  for (const [name, prior] of Object.entries(sourceHashes)) assert.equal(hash(await readFile(join(root, name))), prior, `Explorer source changed during replay: ${name}`);
  assert.equal(hash(await readFile(manifestPath)), options.get('--manifest-sha256'), 'Manifest changed during replay.');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ receipt: outputPath, cases: all40.length, calls: calls.length, failures: failures.length, total_reply_bytes: responseBytes, whole_package_baseline_bytes: baselineBytes }));
} finally {
  globalThis.fetch = nativeFetch;
  await rm(temp, { recursive: true, force: true });
}
