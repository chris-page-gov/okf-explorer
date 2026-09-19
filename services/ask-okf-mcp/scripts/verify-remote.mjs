import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { assembleContext, canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { APPROVED_BUNDLE, verifyBundledContext } from '../src/registry.ts';
import { INPUT_SCHEMA, OUTPUT_SCHEMA } from '../src/contracts.ts';

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
const approved = await verifyBundledContext(indexText, descriptorText);
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
const cases = [
  { id: 'imprisonment', question: 'A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance.', expected: 'sufficient' },
  { id: 'hospital', question: 'A claimant is admitted to hospital. Explain the effect on JSA, Income Support, State Pension Credit and ESA, distinguishing entitlement, payment and changes in amount, and trace each conclusion to the applicable DWP guidance.', expected: 'insufficient' }
];
const client = new Client({ name: 'okf-remote-sdk-acceptance', version: '1.0.0' }, {
  versionNegotiation: { mode: { pin: '2026-07-28' } }, jsonSchemaValidator: new CfWorkerJsonSchemaValidator()
});
const transport = new StreamableHTTPClientTransport(endpoint);
const started = new Date().toISOString();
const results = [];
let toolsHash;
try {
  await client.connect(transport);
  const tools = await client.listTools();
  if (tools.tools.length !== 1 || tools.tools[0].name !== 'ask_okf'
    || canonicalJson(tools.tools[0].inputSchema) !== canonicalJson(INPUT_SCHEMA)
    || canonicalJson(tools.tools[0].outputSchema) !== canonicalJson(OUTPUT_SCHEMA)
    || canonicalJson(tools.tools[0].annotations) !== canonicalJson(expectedAnnotations)) {
    throw new Error('Remote tool discovery differs from the governed service contract.');
  }
  toolsHash = hash(canonicalJson(tools));
  for (const item of cases) {
    const direct = await assembleContext(approved.index, item.question, undefined, approved.binding);
    const start = performance.now();
    const response = await client.callTool({ name: 'ask_okf', arguments: {
      bundle: APPROVED_BUNDLE.id, version: APPROVED_BUNDLE.version, question: item.question
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
    results.push({ id: item.id, question_sha256: hash(item.question), context_id: remote.context_id,
      package_canonical_sha256: hash(canonicalJson(remote)), package_json_sha256: hash(JSON.stringify(remote)),
      package_bytes: Buffer.byteLength(JSON.stringify(remote)), evidence_status: remote.evidence_status,
      selected_records: remote.selected.length, selected_relationships: remote.relationships.length,
      missing_evidence_codes: [...new Set(remote.missing_evidence.map(item => item.code))].sort(),
      truncated: remote.budget.truncated, duration_ms: duration,
      full_package_matches_direct_engine: true, text_matches_structured_content: true, model_answer_present: false });
  }
} finally { await client.close(); }
// Detect a concurrent source change during the network verification as well.
for (const [path, digest] of Object.entries(buildReceipt.inputs)) await checkSource(path, digest);
const receipt = {
  schema: 'okf-remote-mcp-sdk-verification.v1', endpoint: endpoint.href, started_at: started,
  completed_at: new Date().toISOString(), client: { name: '@modelcontextprotocol/client', version: '2.0.0', protocol: '2026-07-28' },
  comparison_source_commit: comparisonCommit,
  comparison_source_assurance: { classification: 'exact-runtime-inputs-match-commit', inputs_sha256: sourceProof,
    build_receipt_inputs_and_outputs_checked: true, local_build_reproduced: true,
    verifier: { path: verifierPath, sha256: hash(verifierBytes), matches_comparison_commit: verifierMatchesCommit,
      classification: verifierMatchesCommit ? 'committed' : 'working-tree-verifier' } },
  comparison_worker_sha256: buildReceipt.outputs['dist/server/index.js'],
  deployment_identity_note: 'The remote health endpoint confirms the immutable bundle identity. The comparator Worker digest is not itself proof of the deployed Worker bytes; retain the hosting deployment receipt separately.',
  bundle_version: APPROVED_BUNDLE.version, binding: approved.binding, snapshot: APPROVED_BUNDLE.snapshot,
  tool: 'ask_okf', tool_discovery_canonical_sha256: toolsHash,
  input_schema_matches: true, output_schema_matches: true, annotations: expectedAnnotations, health, cases: results, passed: true,
  limitations: ['This official SDK client verification does not prove ChatGPT or Voice integration.']
};
await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, endpoint: endpoint.href, cases: results.map(item => ({ id: item.id, evidence_status: item.evidence_status, context_id: item.context_id })), receipt: output }));
