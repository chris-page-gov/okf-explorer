import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { assembleContext, canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { assembleCorpusContext } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';
import { APPROVED_BUNDLE, PREVIOUS_APPROVED_BUNDLE, LEGACY_APPROVED_BUNDLE, verifyBundledContext, verifyBundledCorpus } from '../src/registry.ts';
import { createCorpusFetcher } from '../src/corpusFetch.ts';
import { INPUT_SCHEMA, OUTPUT_SCHEMA } from '../src/contracts.ts';
import { MANIFEST_INPUT_SCHEMA, MANIFEST_OUTPUT_SCHEMA, EVIDENCE_INPUT_SCHEMA, EVIDENCE_OUTPUT_SCHEMA } from '../src/deliveryContracts.ts';
import { verifyCompactDelivery } from './verify-delivery.mjs';
import { verificationCases } from './verification-cases.mjs';

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--endpoint' || args[2] !== '--output') {
  throw new Error('Usage: node scripts/verify-remote.mjs --endpoint https://HOST/okf/mcp --output RECEIPT.json');
}
const endpoint = new URL(args[1]);
if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
  throw new Error('Verification requires a credential-free HTTPS endpoint without query parameters.');
}
const output = resolve(args[3]);
const serviceRoot = fileURLToPath(new URL('..', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const indexText = await readFile(new URL('../vendor/okf-dwp-assembly-index.json', import.meta.url), 'utf8');
const descriptorText = await readFile(new URL('../vendor/okf-dwp-descriptor.json', import.meta.url), 'utf8');
const legacy = await verifyBundledContext(indexText, descriptorText);
const approved = await verifyBundledCorpus(await readFile(new URL('../vendor/okf-dwp-corpus-manifest.json', import.meta.url), 'utf8'));
const corpusFetch = createCorpusFetcher(approved);
const previous = await verifyBundledCorpus(await readFile(new URL('../vendor/okf-dwp-previous-corpus-manifest.json', import.meta.url), 'utf8'), PREVIOUS_APPROVED_BUNDLE.version);
const previousFetch = createCorpusFetcher(previous);
const corpusSources = new Map([[APPROVED_BUNDLE.version, { source: approved, fetch: corpusFetch }],
  [PREVIOUS_APPROVED_BUNDLE.version, { source: previous, fetch: previousFetch }]]);
async function directContext(item) {
  if (item.version === LEGACY_APPROVED_BUNDLE.version) return assembleContext(legacy.index, item.question, item.budget, legacy.binding);
  const selected = corpusSources.get(item.version);
  if (!selected) throw new Error('Unapproved verification source version.');
  return assembleCorpusContext(selected.source.manifest, selected.source.binding, item.question, item.budget ?? {}, selected.fetch);
}
const buildReceiptPath = new URL('../dist/build-receipt.json', import.meta.url);
const buildReceipt = JSON.parse(await readFile(buildReceiptPath, 'utf8'));
const repositoryRoot = resolve(serviceRoot, '../..');
const comparisonCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: serviceRoot, encoding: 'utf8' }).trim();
const sourceProof = {};
async function checkSource(path, expectedDigest) {
  const absolute = resolve(serviceRoot, path);
  const repositoryPath = relative(repositoryRoot, absolute).replaceAll('\\', '/');
  if (repositoryPath.startsWith('../') || isAbsolute(repositoryPath)) throw new Error('Build input lies outside the repository.');
  const bytes = await readFile(absolute);
  const actual = hash(bytes);
  if (expectedDigest && actual !== expectedDigest) throw new Error('Build receipt is stale: ' + repositoryPath);
  const committed = execFileSync('git', ['show', comparisonCommit + ':' + repositoryPath], { cwd: repositoryRoot, maxBuffer: 8 * 1024 * 1024 });
  if (actual !== hash(committed)) throw new Error('Runtime comparison input differs from the recorded commit: ' + repositoryPath);
  sourceProof[repositoryPath] = actual;
}
if (buildReceipt.schema !== 'okf-remote-mcp-build.v1' || !buildReceipt.inputs || !buildReceipt.outputs) throw new Error('Invalid local build receipt.');
for (const [path, digest] of Object.entries(buildReceipt.inputs)) await checkSource(path, digest);
// Include executed build logic and erased type inputs, which esbuild's runtime input list omits.
for (const path of ['scripts/build.mjs', 'src/node.ts', '../../apps/okf-explorer/src/lib/context/types.ts']) await checkSource(path);
for (const [path, digest] of Object.entries(buildReceipt.outputs)) {
  if (!['dist/server/index.js', 'dist/node.mjs'].includes(path) || hash(await readFile(resolve(serviceRoot, path))) !== digest) {
    throw new Error('Local build output differs from its receipt.');
  }
}
// Reproduce locally, using installed locked dependencies, and reject stale or altered outputs.
execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: serviceRoot, timeout: 30000, stdio: 'pipe' });
const reproducedReceipt = JSON.parse(await readFile(buildReceiptPath, 'utf8'));
if (canonicalJson(reproducedReceipt) !== canonicalJson(buildReceipt)) throw new Error('Local build did not reproduce its recorded inputs and outputs.');
const verifierBytes = await readFile(fileURLToPath(import.meta.url));
const verifierHelperURL = new URL('./verify-delivery.mjs', import.meta.url);
const verifierHelperBytes = await readFile(verifierHelperURL);
const verifierHelperPath = relative(repositoryRoot, fileURLToPath(verifierHelperURL)).replaceAll('\\', '/');
const verifierCasesURL = new URL('./verification-cases.mjs', import.meta.url);
const verifierCasesBytes = await readFile(verifierCasesURL);
const verifierCasesPath = relative(repositoryRoot, fileURLToPath(verifierCasesURL)).replaceAll('\\', '/');
let verifierCasesMatchesCommit = false;
try { verifierCasesMatchesCommit = hash(execFileSync('git', ['show', comparisonCommit + ':' + verifierCasesPath], { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'ignore'] })) === hash(verifierCasesBytes); } catch { /* Explicit working-tree acceptance cases. */ }
let verifierHelperMatchesCommit = false;
try { verifierHelperMatchesCommit = hash(execFileSync('git', ['show', comparisonCommit + ':' + verifierHelperPath], { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'ignore'] })) === hash(verifierHelperBytes); } catch { /* Explicit working-tree verifier support. */ }
const verifierPath = relative(repositoryRoot, fileURLToPath(import.meta.url)).replaceAll('\\', '/');
let verifierMatchesCommit = false;
try { verifierMatchesCommit = hash(execFileSync('git', ['show', comparisonCommit + ':' + verifierPath], { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'ignore'] })) === hash(verifierBytes); } catch { /* An uncommitted verification script is explicitly classified. */ }
const expectedAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const healthResponse = await fetch(new URL('/health', endpoint), { signal: AbortSignal.timeout(15000) });
if (!healthResponse.ok) throw new Error(`Health check returned HTTP ${healthResponse.status}.`);
const health = await healthResponse.json();
if (health.ready !== true || health.bundle_version !== APPROVED_BUNDLE.version || health.index_sha256 !== APPROVED_BUNDLE.index_sha256) {
  throw new Error('Remote approved bundle identity differs from the comparison source.');
}
const verification = verificationCases(APPROVED_BUNDLE.version, PREVIOUS_APPROVED_BUNDLE.version, LEGACY_APPROVED_BUNDLE.version);
const cases = verification.full;
const client = new Client({ name: 'okf-remote-sdk-acceptance', version: '1.0.0' }, {
  versionNegotiation: { mode: { pin: '2026-07-28' } }, jsonSchemaValidator: new CfWorkerJsonSchemaValidator()
});
const transport = new StreamableHTTPClientTransport(endpoint);
const started = new Date().toISOString();
const results = [];
let toolsHash;
let compactDelivery;
const compactDeliveryVersions = [];
const toolContracts = [
  { name: 'ask_okf', inputSchema: INPUT_SCHEMA, outputSchema: OUTPUT_SCHEMA },
  { name: 'ask_okf_manifest', inputSchema: MANIFEST_INPUT_SCHEMA, outputSchema: MANIFEST_OUTPUT_SCHEMA },
  { name: 'read_okf_evidence', inputSchema: EVIDENCE_INPUT_SCHEMA, outputSchema: EVIDENCE_OUTPUT_SCHEMA }
];
try {
  await client.connect(transport);
  const tools = await client.listTools();
  if (tools.tools.length !== toolContracts.length || new Set(tools.tools.map(tool => tool.name)).size !== toolContracts.length) {
    throw new Error('Remote tool discovery differs from the governed service contract.');
  }
  for (const contract of toolContracts) {
    const tool = tools.tools.find(item => item.name === contract.name);
    if (!tool || canonicalJson(tool.inputSchema) !== canonicalJson(contract.inputSchema)
      || canonicalJson(tool.outputSchema) !== canonicalJson(contract.outputSchema)
      || canonicalJson(tool.annotations) !== canonicalJson(expectedAnnotations)
      || tool._meta?.['okf/untrustedContent'] !== true
      || canonicalJson(tool._meta?.securitySchemes) !== canonicalJson([{ type: 'noauth' }])) {
      throw new Error('Remote tool discovery differs for ' + contract.name + '.');
    }
  }
  toolsHash = hash(canonicalJson(tools));
  for (const item of cases) {
    const direct = await directContext(item);
    const start = performance.now();
    const response = await client.callTool({ name: 'ask_okf', arguments: {
      bundle: APPROVED_BUNDLE.id, version: item.version, question: item.question, ...(item.budget ? { budget: item.budget } : {})
    } });
    const duration = Math.round(performance.now() - start);
    const remote = response.structuredContent;
    if (response.isError || !remote || canonicalJson(remote) !== canonicalJson(direct)) {
      throw new Error(`Remote ${item.id} package differs from the direct engine.`);
    }
    if (response.content.length !== 1 || response.content[0].type !== 'text'
      || canonicalJson(JSON.parse(response.content[0].text)) !== canonicalJson(remote)) {
      throw new Error(`Remote ${item.id} text content differs from its structured package.`);
    }
    if (remote.evidence_status !== item.expected || remote.ai_answer !== null) {
      throw new Error(`Remote ${item.id} evidence boundary is unexpected.`);
    }
    results.push({ id: item.id, bundle_version: item.version, question_sha256: hash(item.question), context_id: remote.context_id,
      package_canonical_sha256: hash(canonicalJson(remote)), package_json_sha256: hash(JSON.stringify(remote)),
      package_bytes: Buffer.byteLength(JSON.stringify(remote)), evidence_status: remote.evidence_status,
      selected_records: remote.selected.length, selected_relationships: remote.relationships.length,
      missing_evidence_codes: [...new Set(remote.missing_evidence.map(item => item.code))].sort(),
      truncated: remote.budget.truncated, duration_ms: duration,
      full_package_matches_direct_engine: true, text_matches_structured_content: true, model_answer_present: false });
  }
  for (const item of verification.compact) {
    const compactRequest = { bundle: APPROVED_BUNDLE.id, version: item.version,
      question: item.question, ...(item.budget ? { budget: item.budget } : {}) };
    const compactContext = await directContext(item);
    compactDeliveryVersions.push({ ...await verifyCompactDelivery(client, compactContext, compactRequest,
      endpoint.origin, { read_bytes: 32768 }), id: item.id });
  }
  compactDelivery = compactDeliveryVersions[0];
} finally { await client.close(); }
// Detect a concurrent source or verifier change during the network verification as well.
if (hash(await readFile(fileURLToPath(import.meta.url))) !== hash(verifierBytes)
  || hash(await readFile(verifierHelperURL)) !== hash(verifierHelperBytes)
  || hash(await readFile(verifierCasesURL)) !== hash(verifierCasesBytes)) throw new Error('Verifier changed during verification.');
for (const [path, digest] of Object.entries(buildReceipt.inputs)) await checkSource(path, digest);
const receipt = {
  schema: 'okf-remote-mcp-sdk-verification.v1', endpoint: endpoint.href, started_at: started,
  completed_at: new Date().toISOString(), client: { name: '@modelcontextprotocol/client', version: '2.0.0', protocol: '2026-07-28' },
  comparison_source_commit: comparisonCommit,
  comparison_source_assurance: { classification: 'exact-runtime-inputs-match-commit', inputs_sha256: sourceProof,
    build_receipt_inputs_and_outputs_checked: true, local_build_reproduced: true,
    verifier: { path: verifierPath, sha256: hash(verifierBytes), matches_comparison_commit: verifierMatchesCommit,
      classification: verifierMatchesCommit ? 'committed' : 'working-tree-verifier',
      supporting_files: [{ path: verifierHelperPath, sha256: hash(verifierHelperBytes), matches_comparison_commit: verifierHelperMatchesCommit,
        classification: verifierHelperMatchesCommit ? 'committed' : 'working-tree-verifier' },
        { path: verifierCasesPath, sha256: hash(verifierCasesBytes), matches_comparison_commit: verifierCasesMatchesCommit,
          classification: verifierCasesMatchesCommit ? 'committed' : 'working-tree-verifier' }] } },
  comparison_worker_sha256: buildReceipt.outputs['dist/server/index.js'],
  deployment_identity_note: 'The remote health endpoint confirms the immutable bundle identity. The comparator Worker digest is not itself proof of the deployed Worker bytes; retain the hosting deployment receipt separately.',
  bundle_version: APPROVED_BUNDLE.version, binding: approved.binding, snapshot: APPROVED_BUNDLE.snapshot,
  tool: 'ask_okf', tools: toolContracts.map(tool => tool.name), tool_discovery_canonical_sha256: toolsHash,
  input_schema_matches: true, output_schema_matches: true, annotations: expectedAnnotations, health, cases: results, compact_delivery: compactDelivery, compact_delivery_versions: compactDeliveryVersions, passed: true,
  limitations: ['This official SDK client verification does not prove ChatGPT or Voice integration.',
    'Delivery bounds cover the structured JSON value. MCP may transmit both text and structured copies plus envelope metadata.',
    'Complete reconstruction proves delivery integrity, not evidence sufficiency or legal correctness.']
};
await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, endpoint: endpoint.href, cases: results.map(item => ({ id: item.id, evidence_status: item.evidence_status, context_id: item.context_id })), compact_delivery: { context_id: compactDelivery.context_id, catalogue_records: compactDelivery.catalogue_records, reads: compactDelivery.reads.length, reconstructed_package_matches_direct_engine: compactDelivery.reconstructed_package_matches_direct_engine }, receipt: output }));
