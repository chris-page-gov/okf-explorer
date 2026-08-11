#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const require = createRequire(import.meta.url);

const DEFAULT_SUITE = 'evaluation/okf-explorer/questions.json';
const DEFAULT_VISUALS = 'evaluation/okf-explorer/visual-regressions.json';
const DEFAULT_OUT = 'evaluation/okf-explorer/results/latest';
const DEFAULT_BASE_URL = 'http://127.0.0.1:8002/next/';
const DEFAULT_BUNDLE = '/uk-government-apis/okf-explorer.json';
const CANDIDATE_FETCH_TIMEOUT_MS = 30_000;
const EXPLORER_BUILD_MANIFEST_NAME = 'okf-explorer-build-manifest.json';
const EXPLORER_BUILD_MANIFEST_SCHEMA = 'okf-explorer-app-build-manifest.v1';
const EXPLORER_BUILD_MANIFEST_ALGORITHM = 'sha256-canonical-json-materials-v1';
const EXPLORER_BUILD_MANIFEST_MAX_BYTES = 1024 * 1024;
const EXPLORER_BUILD_MANIFEST_MAX_FILES = 4096;
const EVALUATOR_RELATIVE_PATH = 'scripts/evaluate_okf_explorer.mjs';
const HERITAGE_LOCAL_CANDIDATE_RECEIPT_SCHEMA = 'okf-heritage-local-candidate-receipt.v1';
const HERITAGE_PRODUCER_MATERIALS_SCHEMA = 'okf-heritage-producer-materials.v1';
const HERITAGE_PRODUCER_MATERIALS_ALGORITHM = 'sha256-over-canonical-json-path-bytes-digest-list-v1';
const HERITAGE_PRODUCER_MATERIAL_PATHS = [
  'requirements-okf.txt',
  'scripts/build_heritage_evaluation.py',
  'scripts/build_uk_government_api_okf.py',
  'scripts/heritage_build_io.py',
  'scripts/okf_semantic.py'
];
const MAX_HERITAGE_PRODUCER_MATERIALS = 64;
const MAX_HERITAGE_PRODUCER_MATERIAL_BYTES = 8 * 1024 * 1024;
const MAX_HERITAGE_PRODUCER_MATERIALS_BYTES = 32 * 1024 * 1024;
const PUBLICATION_VALIDATION_RECEIPT_SCHEMA = 'okf-publication-validation-receipt.v1';
const GENUINE_BROWSER_VERIFICATION_CHANNEL = 'genuine-browser-receipt';
const GENUINE_BROWSER_RECEIPT_SCHEMA = 'okf-genuine-browser-link-receipt.v1';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CREDENTIAL_QUERY_KEY = /^(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd|bearer|token)$/i;
const SECRET_PATTERN = /\b(api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd|bearer)\s*[=:]\s*[^&\s]+/i;
const RAW_GAP_PATTERN = /\b(None|null|undefined)\b/;
const BROWSER_ENGINES = new Set(['chromium', 'firefox', 'webkit']);

function parseArgs(argv) {
  const options = {
    suite: DEFAULT_SUITE,
    visual: DEFAULT_VISUALS,
    out: DEFAULT_OUT,
    baseUrl: DEFAULT_BASE_URL,
    bundle: DEFAULT_BUNDLE,
    candidateBundle: null,
    candidateReceipt: null,
    limit: 100,
    noBrowser: false,
    headed: false,
    browserEngine: 'chromium',
    journeys: null,
    journeyLimit: Number.POSITIVE_INFINITY,
    journeyIds: [],
    verificationDelayMs: 0,
    journeysOnly: false,
    deferBrowserReceipts: false,
    bundleExplicit: false,
    bundleRoot: null,
    outExplicit: false,
    visualExplicit: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--suite') options.suite = argv[++index];
    else if (arg === '--visual') {
      options.visual = argv[++index];
      options.visualExplicit = true;
    }
    else if (arg === '--out') {
      options.out = argv[++index];
      options.outExplicit = true;
    }
    else if (arg === '--base-url') options.baseUrl = argv[++index];
    else if (arg === '--bundle') {
      options.bundle = argv[++index];
      options.bundleExplicit = true;
    }
    else if (arg === '--bundle-root') options.bundleRoot = argv[++index];
    else if (arg === '--candidate-bundle') options.candidateBundle = argv[++index];
    else if (arg === '--candidate-receipt') options.candidateReceipt = argv[++index];
    else if (arg === '--limit') options.limit = Number(argv[++index]);
    else if (arg === '--journeys') options.journeys = argv[++index];
    else if (arg === '--journey-limit') options.journeyLimit = Number(argv[++index]);
    else if (arg === '--journey-id') options.journeyIds.push(argv[++index]);
    else if (arg === '--verification-delay-ms') options.verificationDelayMs = Number(argv[++index]);
    else if (arg === '--browser-engine') options.browserEngine = argv[++index];
    else if (arg === '--journeys-only') options.journeysOnly = true;
    else if (arg === '--defer-browser-receipts') options.deferBrowserReceipts = true;
    else if (arg === '--no-browser') options.noBrowser = true;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(options.limit) || options.limit < 1) options.limit = 100;
  if ((!Number.isFinite(options.journeyLimit) && options.journeyLimit !== Number.POSITIVE_INFINITY) || options.journeyLimit < 1) {
    options.journeyLimit = Number.POSITIVE_INFINITY;
  }
  if (options.journeysOnly && !options.journeys) throw new Error('--journeys-only requires --journeys.');
  if (options.journeyIds.length && !options.journeys) throw new Error('--journey-id requires --journeys.');
  if (options.bundleRoot && !options.journeys) throw new Error('--bundle-root requires --journeys.');
  if (options.candidateBundle && !options.journeys) throw new Error('--candidate-bundle requires --journeys.');
  if (options.candidateReceipt && !options.journeys) throw new Error('--candidate-receipt requires --journeys.');
  if (options.deferBrowserReceipts && !options.journeys) throw new Error('--defer-browser-receipts requires --journeys.');
  if (options.deferBrowserReceipts && !options.noBrowser) throw new Error('--defer-browser-receipts requires --no-browser.');
  if (options.verificationDelayMs && !options.journeys) throw new Error('--verification-delay-ms requires --journeys.');
  if (!Number.isInteger(options.verificationDelayMs) || options.verificationDelayMs < 0 || options.verificationDelayMs > 10000) {
    throw new Error('--verification-delay-ms must be an integer from 0 to 10000.');
  }
  if (!BROWSER_ENGINES.has(options.browserEngine)) {
    throw new Error(
      '--browser-engine must be one of chromium, firefox or webkit.'
    );
  }
  options.suite = resolveRepoPath(options.suite);
  options.visual = resolveRepoPath(options.visual);
  options.out = resolveRepoPath(options.out);
  if (options.journeys) options.journeys = resolveRepoPath(options.journeys);
  if (options.candidateReceipt) options.candidateReceipt = resolveRepoPath(options.candidateReceipt);
  if (options.bundleRoot) options.bundleRoot = normalizeBundleRoot(options.bundleRoot);
  return options;
}

function normalizeBundleRoot(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('--bundle-root must be an HTTP(S) Site root URL.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('--bundle-root must not contain credentials, a query, or a fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.toString();
}

function printHelp() {
  console.log(`Usage: node scripts/evaluate_okf_explorer.mjs [options]

Options:
  --base-url <url>   OKF Explorer URL, default ${DEFAULT_BASE_URL}
  --bundle <path>    Bundle URL/path to pass to the Explorer, default ${DEFAULT_BUNDLE}
  --bundle-root <url> Resolve journey-declared root paths below this deployed Site root
  --candidate-bundle <path> Bind evidence to this bundle without overriding per-journey starts
  --candidate-receipt <path> Require the deployed candidate SHA-256 from a local candidate receipt
  --suite <path>     Question suite JSON, default ${DEFAULT_SUITE}
  --visual <path>    Visual regression manifest, default ${DEFAULT_VISUALS}
  --limit <n>        Number of questions to run, default 100
  --out <path>       Output directory, default ${DEFAULT_OUT}
  --journeys <path>  Optional persona-linked interaction journey manifest
  --journey-limit <n> Number of interaction journeys to run
  --journey-id <id>  Run only this journey (repeatable)
  --verification-delay-ms <n> Pause before each verify_url action (0–10000 ms)
  --browser-engine <name> Playwright engine: chromium, firefox or webkit (default chromium)
  --journeys-only    Skip the 100 retrieval questions and run only --journeys
  --no-browser       Validate suite/manifests without launching Playwright
  --defer-browser-receipts Validate immutable candidate journeys without loading mutable browser receipts
  --headed           Run browser headed
`);
}

const JOURNEY_ACTIONS = new Set([
  'search',
  'open_external_link_new_tab',
  'open_first_result',
  'open_facet',
  'select_facet_value',
  'set_sort',
  'history_round_trip',
  'select_view',
  'select_map_filter',
  'select_map_record',
  'select_graph_edge',
  'resize_relationship_drawer',
  'load_full_record',
  'toggle_disclosure',
  'open_source_inspector',
  'open_raw_source_new_tab',
  'verify_url'
]);

const JOURNEY_ASSERTIONS = new Set([
  'url_param_equals',
  'url_param_includes',
  'url_param_absent',
  'sort_value',
  'search_value',
  'history_round_trip_restored',
  'result_count_min',
  'map_filter_applied',
  'map_marker_visible',
  'map_record_selected',
  'graph_edge_selected',
  'relationship_drawer_resized',
  'disclosure_defaults_observed',
  'disclosure_toggle_observed',
  'source_inspector_visible',
  'external_link_opened_in_new_tab',
  'visible_text'
]);

function resolveRepoPath(value) {
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalJsonBytes(value) {
  function ordered(item) {
    if (Array.isArray(item)) return item.map(ordered);
    if (item && typeof item === 'object') {
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, ordered(item[key])])
      );
    }
    return item;
  }
  return Buffer.from(`${JSON.stringify(ordered(value))}\n`, 'utf8');
}

function evaluatorIdentity() {
  const expectedPath = path.join(repoRoot, ...EVALUATOR_RELATIVE_PATH.split('/'));
  if (path.resolve(__filename) !== path.resolve(expectedPath)) {
    throw new Error(`Evaluator executable path differs from ${EVALUATOR_RELATIVE_PATH}.`);
  }
  return {
    path: EVALUATOR_RELATIVE_PATH,
    sha256: sha256(fs.readFileSync(expectedPath))
  };
}

function producerMaterialFileIdentity(value) {
  return [
    value.dev,
    value.ino,
    value.mode,
    value.nlink,
    value.size,
    value.mtimeNs,
    value.ctimeNs
  ].map(String).join(':');
}

function readHeritageProducerMaterial(relative) {
  const materialPath = path.join(repoRoot, ...relative.split('/'));
  let before;
  try {
    before = fs.lstatSync(materialPath, { bigint: true });
  } catch (error) {
    throw new Error(`Cannot stat heritage producer material ${relative}: ${error.message}`);
  }
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1n ||
    before.size < 1n ||
    before.size > BigInt(MAX_HERITAGE_PRODUCER_MATERIAL_BYTES)
  ) {
    throw new Error(`Heritage producer material is not a bounded independent regular file: ${relative}`);
  }
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  let descriptor;
  try {
    descriptor = fs.openSync(materialPath, flags);
  } catch (error) {
    throw new Error(`Cannot open heritage producer material ${relative}: ${error.message}`);
  }
  try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    if (
      producerMaterialFileIdentity(before) !== producerMaterialFileIdentity(opened) ||
      opened.size > BigInt(MAX_HERITAGE_PRODUCER_MATERIAL_BYTES)
    ) {
      throw new Error(`Heritage producer material changed before it was opened: ${relative}`);
    }
    const chunks = [];
    let remaining = Number(opened.size);
    while (remaining > 0) {
      const buffer = Buffer.allocUnsafe(Math.min(1024 * 1024, remaining));
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead < 1) {
        throw new Error(`Heritage producer material was truncated while it was read: ${relative}`);
      }
      chunks.push(bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead));
      remaining -= bytesRead;
    }
    const overflow = Buffer.allocUnsafe(1);
    if (fs.readSync(descriptor, overflow, 0, 1, null) !== 0) {
      throw new Error(`Heritage producer material grew while it was read: ${relative}`);
    }
    const after = fs.fstatSync(descriptor, { bigint: true });
    const pathAfter = fs.lstatSync(materialPath, { bigint: true });
    if (
      producerMaterialFileIdentity(opened) !== producerMaterialFileIdentity(after) ||
      producerMaterialFileIdentity(before) !== producerMaterialFileIdentity(pathAfter)
    ) {
      throw new Error(`Heritage producer material changed while it was read: ${relative}`);
    }
    return Buffer.concat(chunks, Number(opened.size));
  } finally {
    fs.closeSync(descriptor);
  }
}

function validateHeritageProducerMaterials(value, receiptPath) {
  const expectedKeys = ['algorithm', 'bytes', 'file_count', 'materials', 'root_sha256', 'schema'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Heritage candidate receipt must declare producer_materials: ${receiptPath}`);
  }
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys)) {
    throw new Error(`Heritage candidate receipt producer_materials has an unexpected key set: ${receiptPath}`);
  }
  if (value.schema !== HERITAGE_PRODUCER_MATERIALS_SCHEMA) {
    throw new Error(`Heritage candidate receipt producer_materials has an unsupported schema: ${receiptPath}`);
  }
  if (value.algorithm !== HERITAGE_PRODUCER_MATERIALS_ALGORITHM) {
    throw new Error(`Heritage candidate receipt producer_materials has an unsupported root algorithm: ${receiptPath}`);
  }
  if (!Array.isArray(value.materials) || value.materials.length < 1) {
    throw new Error(`Heritage candidate receipt producer_materials.materials must be non-empty: ${receiptPath}`);
  }
  if (value.materials.length > MAX_HERITAGE_PRODUCER_MATERIALS) {
    throw new Error(`Heritage candidate receipt producer_materials exceeds its material-count bound: ${receiptPath}`);
  }
  const materials = value.materials.map((material, index) => {
    if (
      !material ||
      typeof material !== 'object' ||
      Array.isArray(material) ||
      JSON.stringify(Object.keys(material).sort()) !== JSON.stringify(['bytes', 'path', 'sha256'])
    ) {
      throw new Error(`Heritage candidate receipt producer_materials.materials[${index}] has an unexpected shape: ${receiptPath}`);
    }
    if (
      typeof material.path !== 'string' ||
      !Number.isSafeInteger(material.bytes) ||
      material.bytes < 1 ||
      material.bytes > MAX_HERITAGE_PRODUCER_MATERIAL_BYTES ||
      typeof material.sha256 !== 'string' ||
      !SHA256_PATTERN.test(material.sha256)
    ) {
      throw new Error(`Heritage candidate receipt producer material is invalid at index ${index}: ${receiptPath}`);
    }
    return { path: material.path, bytes: material.bytes, sha256: material.sha256 };
  });
  const materialPaths = materials.map((material) => material.path);
  if (JSON.stringify(materialPaths) !== JSON.stringify(HERITAGE_PRODUCER_MATERIAL_PATHS)) {
    const missing = HERITAGE_PRODUCER_MATERIAL_PATHS.filter((materialPath) => !materialPaths.includes(materialPath));
    const extra = materialPaths.filter((materialPath) => !HERITAGE_PRODUCER_MATERIAL_PATHS.includes(materialPath));
    const reason = missing.length
      ? `missing required path(s): ${missing.join(', ')}`
      : extra.length
        ? `contains unexpected path(s): ${extra.join(', ')}`
        : 'paths must be unique and sorted lexically';
    throw new Error(`Heritage candidate receipt producer_materials ${reason}: ${receiptPath}`);
  }
  const totalBytes = materials.reduce((total, material) => total + material.bytes, 0);
  if (totalBytes > MAX_HERITAGE_PRODUCER_MATERIALS_BYTES) {
    throw new Error(`Heritage candidate receipt producer_materials exceeds its aggregate byte bound: ${receiptPath}`);
  }
  if (value.file_count !== materials.length || value.bytes !== totalBytes) {
    throw new Error(`Heritage candidate receipt producer_materials aggregate fields differ from materials: ${receiptPath}`);
  }
  const expectedRootSha256 = sha256(canonicalJsonBytes(materials));
  if (value.root_sha256 !== expectedRootSha256) {
    throw new Error(`Heritage candidate receipt producer_materials.root_sha256 does not bind canonical materials: ${receiptPath}`);
  }
  for (const material of materials) {
    const raw = readHeritageProducerMaterial(material.path);
    if (raw.length !== material.bytes || sha256(raw) !== material.sha256) {
      throw new Error(`Heritage producer material differs from exact current bytes: ${material.path}`);
    }
  }
  return expectedRootSha256;
}

function loadCandidateReceipt(receiptPath) {
  let raw;
  try {
    raw = fs.readFileSync(receiptPath);
  } catch (error) {
    throw new Error(`Candidate receipt could not be read: ${receiptPath} (${error.message})`);
  }
  let receipt;
  try {
    receipt = JSON.parse(raw.toString('utf8'));
  } catch (error) {
    throw new Error(`Candidate receipt is not valid JSON: ${receiptPath} (${error.message})`);
  }
  if (![HERITAGE_LOCAL_CANDIDATE_RECEIPT_SCHEMA, PUBLICATION_VALIDATION_RECEIPT_SCHEMA].includes(receipt?.schema)) {
    throw new Error(
      `Candidate receipt schema must be ${HERITAGE_LOCAL_CANDIDATE_RECEIPT_SCHEMA} or ${PUBLICATION_VALIDATION_RECEIPT_SCHEMA}: ${receiptPath}`
    );
  }
  if (receipt.schema === PUBLICATION_VALIDATION_RECEIPT_SCHEMA && receipt.status !== 'passed') {
    throw new Error(`Publication validation receipt status must be passed: ${receiptPath}`);
  }
  const expectedDescriptorSha256 = receipt?.candidate?.heritage_descriptor_sha256;
  if (typeof expectedDescriptorSha256 !== 'string' || !SHA256_PATTERN.test(expectedDescriptorSha256)) {
    throw new Error(`Candidate receipt must declare candidate.heritage_descriptor_sha256: ${receiptPath}`);
  }
  const expectedReleaseRootSha256 = receipt?.candidate?.heritage_release_root_sha256;
  if (typeof expectedReleaseRootSha256 !== 'string' || !SHA256_PATTERN.test(expectedReleaseRootSha256)) {
    throw new Error(`Candidate receipt must declare candidate.heritage_release_root_sha256: ${receiptPath}`);
  }
  const producerMaterialsRootSha256 = receipt.schema === HERITAGE_LOCAL_CANDIDATE_RECEIPT_SCHEMA
    ? validateHeritageProducerMaterials(receipt.producer_materials, receiptPath)
    : null;
  let publicationIdentity = null;
  if (receipt.schema === PUBLICATION_VALIDATION_RECEIPT_SCHEMA) {
    const expectedPublicationManifestSha256 = receipt?.subject?.publication_manifest_sha256;
    if (
      typeof expectedPublicationManifestSha256 !== 'string' ||
      !SHA256_PATTERN.test(expectedPublicationManifestSha256)
    ) {
      throw new Error(
        `Publication validation receipt must declare subject.publication_manifest_sha256: ${receiptPath}`
      );
    }
    const expectedSiteTreeSha256 = receipt?.subject?.site_tree_sha256;
    if (
      typeof expectedSiteTreeSha256 !== 'string' ||
      !SHA256_PATTERN.test(expectedSiteTreeSha256)
    ) {
      throw new Error(
        `Publication validation receipt must declare subject.site_tree_sha256: ${receiptPath}`
      );
    }
    const expectedSiteFileCount = receipt?.subject?.site_file_count;
    if (!Number.isInteger(expectedSiteFileCount) || expectedSiteFileCount < 1) {
      throw new Error(
        `Publication validation receipt must declare a positive integer subject.site_file_count: ${receiptPath}`
      );
    }
    publicationIdentity = {
      expected_publication_manifest_sha256: expectedPublicationManifestSha256,
      expected_site_tree_sha256: expectedSiteTreeSha256,
      expected_site_file_count: expectedSiteFileCount
    };
  }
  if (typeof receipt.observed_at !== 'string' || !Number.isFinite(Date.parse(receipt.observed_at))) {
    throw new Error(`Candidate receipt must declare a valid observed_at timestamp: ${receiptPath}`);
  }
  const relative = path.relative(repoRoot, receiptPath);
  return {
    schema: receipt.schema,
    path: !relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
      ? receiptPath
      : relative,
    raw_sha256: sha256(raw),
    observed_at: receipt.observed_at,
    expected_descriptor_sha256: expectedDescriptorSha256,
    expected_release_root_sha256: expectedReleaseRootSha256,
    ...(producerMaterialsRootSha256
      ? { producer_materials_root_sha256: producerMaterialsRootSha256 }
      : {}),
    ...(publicationIdentity || {})
  };
}

function credentialFreeHttpUrl(value, label, { allowHash = true } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a nonempty HTTP(S) URL.`);
  }
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`${label} must be a valid HTTP(S) URL: ${value} (${error.message})`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${label} only supports HTTP(S): ${value}`);
  }
  if (url.username || url.password || [...url.searchParams.keys()].some((key) => CREDENTIAL_QUERY_KEY.test(key))) {
    throw new Error(`${label} must not contain credentials: ${value}`);
  }
  if (!allowHash && url.hash) {
    throw new Error(`${label} must not contain a fragment; use expected_final_hash instead: ${value}`);
  }
  return url;
}

function candidateBundleUrl(options) {
  const declared = String(options.bundle || '').trim();
  let bundleUrl;
  try {
    bundleUrl = new URL(declared);
  } catch {
    bundleUrl = options.bundleRoot && declared.startsWith('/')
      ? new URL(declared.replace(/^\/+/, ''), options.bundleRoot)
      : new URL(declared, options.baseUrl);
  }
  if (
    !['http:', 'https:'].includes(bundleUrl.protocol) ||
    bundleUrl.username ||
    bundleUrl.password ||
    [...bundleUrl.searchParams.keys()].some((key) => CREDENTIAL_QUERY_KEY.test(key))
  ) {
    throw new Error(`Candidate bundle must resolve to credential-free HTTP(S): ${options.bundle}`);
  }
  return bundleUrl;
}

function candidateRequestFailure(error, bundleUrl, label = 'Candidate bundle') {
  if (
    error?.name === 'TimeoutError' ||
    error?.name === 'AbortError' ||
    error?.cause?.name === 'TimeoutError' ||
    error?.cause?.name === 'AbortError'
  ) {
    return new Error(`${label} request timed out after ${CANDIDATE_FETCH_TIMEOUT_MS} ms: ${bundleUrl}`);
  }
  return new Error(`${label} request failed: ${bundleUrl} (${error.message})`);
}

async function boundedResponseBytes(response, maximumBytes, label, url) {
  const declaredLength = response.headers?.get?.('content-length');
  if (declaredLength !== undefined && declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 1 || parsedLength > maximumBytes) {
      throw new Error(`${label} Content-Length is outside the 1-${maximumBytes} byte bound: ${url}`);
    }
  }
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        total += chunk.length;
        if (total > maximumBytes) {
          await reader.cancel().catch(() => {});
          throw new Error(`${label} exceeds the ${maximumBytes} byte bound: ${url}`);
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    if (!total) throw new Error(`${label} is empty: ${url}`);
    return Buffer.concat(chunks, total);
  }
  const raw = Buffer.from(await response.arrayBuffer());
  if (!raw.length || raw.length > maximumBytes) {
    throw new Error(`${label} is outside the 1-${maximumBytes} byte bound: ${url}`);
  }
  return raw;
}

function siteMaterialPath(siteRootValue, targetValue, label) {
  const siteRoot = credentialFreeHttpUrl(String(siteRootValue), 'Publication Site root', {
    allowHash: false
  });
  const target = credentialFreeHttpUrl(String(targetValue), label, { allowHash: false });
  if (siteRoot.search || target.search) {
    throw new Error(`${label} must not contain a query.`);
  }
  if (!siteRoot.pathname.endsWith('/')) {
    throw new Error(`Publication Site root must end in a slash: ${siteRoot}`);
  }
  if (target.origin !== siteRoot.origin || !target.pathname.startsWith(siteRoot.pathname)) {
    throw new Error(`${label} must stay inside the deployed Publication Site root: ${target}`);
  }
  const encodedRelative = target.pathname.slice(siteRoot.pathname.length);
  if (/%(?:2f|5c|00)/i.test(encodedRelative)) {
    throw new Error(`${label} has an unsafe encoded path: ${target}`);
  }
  let relative;
  try {
    relative = decodeURIComponent(encodedRelative);
  } catch (error) {
    throw new Error(`${label} has an invalid encoded path: ${target} (${error.message})`);
  }
  if (
    !relative ||
    relative.includes('\\') ||
    relative.includes('\u0000') ||
    relative.startsWith('/') ||
    relative.split('/').some((part) => !part || part === '.' || part === '..') ||
    path.posix.normalize(relative) !== relative
  ) {
    throw new Error(`${label} has an unsafe Publication Site material path: ${target}`);
  }
  return relative;
}

function publicationMaterial(materials, materialPath, bytes, label) {
  const matches = materials.filter((item) => item.path === materialPath);
  if (matches.length !== 1) {
    throw new Error(
      `Publication manifest must bind exactly one ${label} material at ${materialPath}; found ${matches.length}.`
    );
  }
  const material = matches[0];
  const observedSha256 = sha256(bytes);
  if (material.bytes !== bytes.length) {
    throw new Error(
      `Publication manifest ${label} material byte count differs from exact fetched bytes: ` +
      `expected ${material.bytes}, got ${bytes.length} (${materialPath})`
    );
  }
  if (material.sha256 !== observedSha256) {
    throw new Error(
      `Publication manifest ${label} material SHA-256 differs from exact fetched bytes: ` +
      `expected ${material.sha256}, got ${observedSha256} (${materialPath})`
    );
  }
  return {
    path: materialPath,
    bytes: material.bytes,
    sha256: material.sha256
  };
}

async function inspectPublicationSiteArtifact({
  siteRootValue,
  bundleUrl,
  descriptorBytes,
  planeRootsUrl,
  planeBytes,
  candidateReceipt
}) {
  const siteRootUrl = credentialFreeHttpUrl(
    String(siteRootValue),
    'Publication Site root',
    { allowHash: false }
  );
  if (!siteRootUrl.pathname.endsWith('/') || siteRootUrl.search) {
    throw new Error(`Publication Site root must end in a slash and have no query: ${siteRootUrl}`);
  }
  const descriptorPath = siteMaterialPath(siteRootUrl, bundleUrl, 'Candidate descriptor URL');
  const planeRootsPath = siteMaterialPath(
    siteRootUrl,
    planeRootsUrl,
    'Candidate plane-roots URL'
  );
  const manifestUrl = new URL('publication-unit-manifest.json', siteRootUrl);
  siteMaterialPath(siteRootUrl, manifestUrl, 'Publication manifest URL');
  let manifestResponse;
  try {
    manifestResponse = await fetch(manifestUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(CANDIDATE_FETCH_TIMEOUT_MS)
    });
  } catch (error) {
    throw candidateRequestFailure(error, manifestUrl, 'Candidate publication manifest');
  }
  if (manifestResponse.status >= 300 && manifestResponse.status < 400) {
    throw new Error(
      `Candidate publication manifest redirected with HTTP ${manifestResponse.status}; ` +
      `the exact deployed URL must return its own bytes: ${manifestUrl}`
    );
  }
  if (!manifestResponse.ok) {
    throw new Error(
      `Candidate publication manifest returned HTTP ${manifestResponse.status}: ${manifestUrl}`
    );
  }
  if (manifestResponse.url) {
    credentialFreeHttpUrl(
      manifestResponse.url,
      'Candidate publication-manifest URL',
      { allowHash: false }
    );
    assertFinalLocation(
      manifestResponse.url,
      manifestUrl.toString(),
      'Candidate publication-manifest URL'
    );
  }
  let manifestBytes;
  try {
    manifestBytes = Buffer.from(await manifestResponse.arrayBuffer());
  } catch (error) {
    throw candidateRequestFailure(error, manifestUrl, 'Candidate publication manifest');
  }
  const manifestSha256 = sha256(manifestBytes);
  if (manifestSha256 !== candidateReceipt.expected_publication_manifest_sha256) {
    throw new Error(
      'Deployed publication manifest SHA-256 differs from the publication validation receipt; ' +
      `expected ${candidateReceipt.expected_publication_manifest_sha256}, got ${manifestSha256}: ${manifestUrl}`
    );
  }
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    throw new Error(
      `Candidate publication manifest is not valid JSON: ${manifestUrl} (${error.message})`
    );
  }
  if (manifest?.schema !== 'okf-publication-unit-manifest.v1') {
    throw new Error(
      `Candidate publication manifest schema must be okf-publication-unit-manifest.v1: ${manifestUrl}`
    );
  }
  if (manifest.algorithm !== 'sha256-canonical-json-materials-v1') {
    throw new Error(
      `Candidate publication manifest algorithm must be sha256-canonical-json-materials-v1: ${manifestUrl}`
    );
  }
  if (!Array.isArray(manifest.materials) || !manifest.materials.length) {
    throw new Error(`Candidate publication manifest must contain materials: ${manifestUrl}`);
  }
  if (!Number.isInteger(manifest.file_count) || manifest.file_count !== manifest.materials.length) {
    throw new Error(`Candidate publication manifest file count differs from its materials: ${manifestUrl}`);
  }
  const materialPaths = [];
  const seenPaths = new Set();
  for (const [index, material] of manifest.materials.entries()) {
    const prefix = `Candidate publication manifest material ${index + 1}`;
    if (!material || typeof material !== 'object' || Array.isArray(material)) {
      throw new Error(`${prefix} must be an object.`);
    }
    const materialPath = material.path;
    if (
      typeof materialPath !== 'string' ||
      !materialPath ||
      materialPath.includes('\\') ||
      materialPath.includes('\u0000') ||
      materialPath.startsWith('/') ||
      materialPath.split('/').some((part) => !part || part === '.' || part === '..') ||
      path.posix.normalize(materialPath) !== materialPath
    ) {
      throw new Error(`${prefix} has an unsafe path: ${String(materialPath)}`);
    }
    if (seenPaths.has(materialPath)) {
      throw new Error(`Candidate publication manifest duplicates material path: ${materialPath}`);
    }
    if (!Number.isInteger(material.bytes) || material.bytes < 0) {
      throw new Error(`${prefix} must declare a non-negative integer byte count.`);
    }
    if (typeof material.sha256 !== 'string' || !SHA256_PATTERN.test(material.sha256)) {
      throw new Error(`${prefix} must declare a SHA-256 digest.`);
    }
    seenPaths.add(materialPath);
    materialPaths.push(materialPath);
  }
  const orderedPaths = [...materialPaths].sort();
  if (materialPaths.some((item, index) => item !== orderedPaths[index])) {
    throw new Error(`Candidate publication manifest materials are not path ordered: ${manifestUrl}`);
  }
  const treeMaterials = manifest.materials.map((material) => ({
    path: material.path,
    bytes: material.bytes,
    sha256: material.sha256
  }));
  const observedTreeSha256 = sha256(canonicalJsonBytes(treeMaterials));
  if (
    typeof manifest.tree_sha256 !== 'string' ||
    !SHA256_PATTERN.test(manifest.tree_sha256) ||
    manifest.tree_sha256 !== observedTreeSha256
  ) {
    throw new Error(
      `Candidate publication manifest tree digest differs; ` +
      `declared ${String(manifest.tree_sha256)}, recomputed ${observedTreeSha256}: ${manifestUrl}`
    );
  }
  if (manifest.tree_sha256 !== candidateReceipt.expected_site_tree_sha256) {
    throw new Error(
      'Deployed publication Site tree differs from the publication validation receipt; ' +
      `expected ${candidateReceipt.expected_site_tree_sha256}, got ${manifest.tree_sha256}: ${manifestUrl}`
    );
  }
  if (manifest.file_count !== candidateReceipt.expected_site_file_count) {
    throw new Error(
      'Deployed publication Site file count differs from the publication validation receipt; ' +
      `expected ${candidateReceipt.expected_site_file_count}, got ${manifest.file_count}: ${manifestUrl}`
    );
  }
  const descriptorMaterial = publicationMaterial(
    manifest.materials,
    descriptorPath,
    descriptorBytes,
    'descriptor'
  );
  const planeRootsMaterial = publicationMaterial(
    manifest.materials,
    planeRootsPath,
    planeBytes,
    'plane-roots'
  );
  return {
    manifest_url: manifestUrl.toString(),
    publication_manifest_sha256: manifestSha256,
    tree_sha256: manifest.tree_sha256,
    file_count: manifest.file_count,
    materials: {
      descriptor: descriptorMaterial,
      plane_roots: planeRootsMaterial
    }
  };
}

async function inspectCandidate(options, candidateReceipt = null) {
  const bundleUrl = candidateBundleUrl(options);
  if (bundleUrl.hash) {
    throw new Error(`Candidate bundle URL must not contain a fragment: ${bundleUrl}`);
  }
  let response;
  try {
    response = await fetch(bundleUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(CANDIDATE_FETCH_TIMEOUT_MS)
    });
  } catch (error) {
    throw candidateRequestFailure(error, bundleUrl);
  }
  if (response.status >= 300 && response.status < 400) {
    throw new Error(
      `Candidate bundle redirected with HTTP ${response.status}; the exact deployed URL must return its own bytes: ${bundleUrl}`
    );
  }
  if (!response.ok) {
    throw new Error(`Candidate bundle returned HTTP ${response.status}: ${bundleUrl}`);
  }
  if (response.url) {
    assertFinalLocation(response.url, bundleUrl.toString(), 'Candidate bundle URL');
  }
  let bytes;
  try {
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw candidateRequestFailure(error, bundleUrl);
  }
  let descriptor;
  try {
    descriptor = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`Candidate bundle is not valid JSON: ${bundleUrl} (${error.message})`);
  }
  const descriptorSha256 = sha256(bytes);
  if (
    candidateReceipt &&
    descriptorSha256 !== candidateReceipt.expected_descriptor_sha256
  ) {
    throw new Error(
      'Deployed candidate descriptor SHA-256 differs from the local candidate receipt; ' +
      `expected ${candidateReceipt.expected_descriptor_sha256}, got ${descriptorSha256}: ${bundleUrl}`
    );
  }
  let releaseRoot = null;
  let siteArtifact = null;
  if (candidateReceipt) {
    const declaredPlaneRoots = descriptor?.entrypoints?.plane_roots;
    if (typeof declaredPlaneRoots !== 'string' || !declaredPlaneRoots.trim()) {
      throw new Error('Deployed candidate descriptor must declare entrypoints.plane_roots.');
    }
    const planeRootsUrl = new URL(declaredPlaneRoots, bundleUrl);
    const bundleDirectory = new URL('.', bundleUrl);
    if (
      planeRootsUrl.origin !== bundleUrl.origin ||
      !planeRootsUrl.pathname.startsWith(bundleDirectory.pathname) ||
      planeRootsUrl.username ||
      planeRootsUrl.password ||
      planeRootsUrl.search ||
      planeRootsUrl.hash
    ) {
      throw new Error(
        `Candidate plane-roots entrypoint must stay inside the deployed bundle directory: ${declaredPlaneRoots}`
      );
    }
    let planeResponse;
    try {
      planeResponse = await fetch(planeRootsUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(CANDIDATE_FETCH_TIMEOUT_MS)
      });
    } catch (error) {
      throw candidateRequestFailure(error, planeRootsUrl);
    }
    if (planeResponse.status >= 300 && planeResponse.status < 400) {
      throw new Error(
        `Candidate plane roots redirected with HTTP ${planeResponse.status}; the exact deployed URL must return its own bytes: ${planeRootsUrl}`
      );
    }
    if (!planeResponse.ok) {
      throw new Error(`Candidate plane roots returned HTTP ${planeResponse.status}: ${planeRootsUrl}`);
    }
    if (planeResponse.url) {
      assertFinalLocation(planeResponse.url, planeRootsUrl.toString(), 'Candidate plane-roots URL');
    }
    let planeBytes;
    try {
      planeBytes = Buffer.from(await planeResponse.arrayBuffer());
    } catch (error) {
      throw candidateRequestFailure(error, planeRootsUrl);
    }
    let planeRoots;
    try {
      planeRoots = JSON.parse(planeBytes.toString('utf8'));
    } catch (error) {
      throw new Error(`Candidate plane roots are not valid JSON: ${planeRootsUrl} (${error.message})`);
    }
    const observedReleaseRoot = planeRoots?.release_root_sha256;
    if (!SHA256_PATTERN.test(String(observedReleaseRoot || ''))) {
      throw new Error(`Candidate plane roots must declare release_root_sha256: ${planeRootsUrl}`);
    }
    if (observedReleaseRoot !== candidateReceipt.expected_release_root_sha256) {
      throw new Error(
        'Deployed candidate release root differs from the local candidate receipt; ' +
        `expected ${candidateReceipt.expected_release_root_sha256}, got ${observedReleaseRoot}: ${planeRootsUrl}`
      );
    }
    releaseRoot = {
      plane_roots_url: planeRootsUrl.toString(),
      plane_roots_sha256: sha256(planeBytes),
      release_root_sha256: observedReleaseRoot
    };
    if (candidateReceipt.schema === PUBLICATION_VALIDATION_RECEIPT_SCHEMA) {
      siteArtifact = await inspectPublicationSiteArtifact({
        siteRootValue: options.bundleRoot || new URL('.', bundleUrl),
        bundleUrl,
        descriptorBytes: bytes,
        planeRootsUrl,
        planeBytes,
        candidateReceipt
      });
    }
  }
  return {
    bundle_url: bundleUrl.toString(),
    descriptor_sha256: descriptorSha256,
    schema: descriptor.schema || null,
    snapshot: descriptor.snapshot || null,
    generated_at: descriptor.generated_at || null,
    ...(releaseRoot ? { release_root: releaseRoot } : {}),
    ...(siteArtifact ? { site_artifact: siteArtifact } : {}),
    ...(candidateReceipt ? { candidate_receipt: candidateReceipt } : {})
  };
}

function validateExplorerBuildManifest(manifest, manifestUrl) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`Explorer build manifest must be an object: ${manifestUrl}`);
  }
  const keys = Object.keys(manifest).sort();
  const expectedKeys = ['algorithm', 'file_count', 'materials', 'schema', 'tree_sha256'].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`Explorer build manifest fields are unsupported or have drifted: ${manifestUrl}`);
  }
  if (manifest.schema !== EXPLORER_BUILD_MANIFEST_SCHEMA) {
    throw new Error(`Explorer build manifest schema is unsupported: ${manifestUrl}`);
  }
  if (manifest.algorithm !== EXPLORER_BUILD_MANIFEST_ALGORITHM) {
    throw new Error(`Explorer build manifest algorithm is unsupported: ${manifestUrl}`);
  }
  if (
    !Number.isSafeInteger(manifest.file_count) ||
    manifest.file_count < 1 ||
    manifest.file_count > EXPLORER_BUILD_MANIFEST_MAX_FILES ||
    !Array.isArray(manifest.materials) ||
    manifest.materials.length !== manifest.file_count
  ) {
    throw new Error(`Explorer build manifest file count is invalid: ${manifestUrl}`);
  }
  const paths = [];
  for (const [index, material] of manifest.materials.entries()) {
    if (!material || typeof material !== 'object' || Array.isArray(material)) {
      throw new Error(`Explorer build manifest material ${index} is malformed: ${manifestUrl}`);
    }
    const materialKeys = Object.keys(material).sort();
    const expectedMaterialKeys = ['bytes', 'path', 'sha256'];
    if (
      materialKeys.length !== expectedMaterialKeys.length ||
      materialKeys.some((key, keyIndex) => key !== expectedMaterialKeys[keyIndex])
    ) {
      throw new Error(`Explorer build manifest material ${index} fields have drifted: ${manifestUrl}`);
    }
    if (
      typeof material.path !== 'string' ||
      !material.path ||
      material.path.length > 1024 ||
      material.path.includes('\\') ||
      material.path.includes('\u0000') ||
      path.posix.isAbsolute(material.path) ||
      path.posix.normalize(material.path) !== material.path ||
      material.path.split('/').some((part) => !part || part === '.' || part === '..')
    ) {
      throw new Error(`Explorer build manifest material ${index} path is unsafe: ${manifestUrl}`);
    }
    if (!Number.isSafeInteger(material.bytes) || material.bytes < 0 || !SHA256_PATTERN.test(material.sha256)) {
      throw new Error(`Explorer build manifest material ${index} identity is invalid: ${manifestUrl}`);
    }
    paths.push(material.path);
  }
  if (new Set(paths).size !== paths.length || paths.some((value, index) => index > 0 && paths[index - 1] >= value)) {
    throw new Error(`Explorer build manifest material paths are duplicated or unordered: ${manifestUrl}`);
  }
  const treeMaterials = manifest.materials.map((material) => ({
    path: material.path,
    bytes: material.bytes,
    sha256: material.sha256
  }));
  const observedTreeSha256 = sha256(Buffer.from(`${JSON.stringify(treeMaterials)}\n`, 'utf8'));
  if (!SHA256_PATTERN.test(manifest.tree_sha256) || manifest.tree_sha256 !== observedTreeSha256) {
    throw new Error(
      `Explorer build manifest tree SHA-256 differs from its exact materials; ` +
      `declared ${String(manifest.tree_sha256)}, recomputed ${observedTreeSha256}: ${manifestUrl}`
    );
  }
  return manifest;
}

async function inspectExplorerBuild(options) {
  const baseUrl = credentialFreeHttpUrl(String(options.baseUrl || ''), 'Explorer base URL', {
    allowHash: false
  });
  if (baseUrl.search) throw new Error('Explorer base URL must not contain a query.');
  const manifestUrl = new URL(EXPLORER_BUILD_MANIFEST_NAME, baseUrl);
  let response;
  try {
    response = await fetch(manifestUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(CANDIDATE_FETCH_TIMEOUT_MS)
    });
  } catch (error) {
    throw candidateRequestFailure(error, manifestUrl, 'Explorer build manifest');
  }
  if (response.status >= 300 && response.status < 400) {
    throw new Error(
      `Explorer build manifest redirected with HTTP ${response.status}; the exact URL must return its own bytes: ${manifestUrl}`
    );
  }
  if (!response.ok) {
    throw new Error(`Explorer build manifest returned HTTP ${response.status}: ${manifestUrl}`);
  }
  const finalUrl = response.url || manifestUrl.toString();
  assertFinalLocation(finalUrl, manifestUrl.toString(), 'Explorer build manifest URL');
  let raw;
  try {
    raw = await boundedResponseBytes(
      response,
      EXPLORER_BUILD_MANIFEST_MAX_BYTES,
      'Explorer build manifest',
      manifestUrl
    );
  } catch (error) {
    if (/byte bound|Content-Length| is empty:/.test(error.message)) throw error;
    throw candidateRequestFailure(error, manifestUrl, 'Explorer build manifest');
  }
  let manifest;
  try {
    manifest = JSON.parse(raw.toString('utf8'));
  } catch (error) {
    throw new Error(`Explorer build manifest is not valid JSON: ${manifestUrl} (${error.message})`);
  }
  validateExplorerBuildManifest(manifest, manifestUrl);
  return {
    manifest_url: credentialFreeHttpUrl(finalUrl, 'Explorer build manifest final URL', {
      allowHash: false
    }).toString(),
    manifest_sha256: sha256(raw),
    schema: manifest.schema,
    algorithm: manifest.algorithm,
    file_count: manifest.file_count,
    tree_sha256: manifest.tree_sha256
  };
}

function validateSuite(suite) {
  if (suite.schema !== 'okf-explorer-evaluation-suite.v1') throw new Error(`Unexpected suite schema: ${suite.schema}`);
  if (!Array.isArray(suite.questions) || suite.questions.length !== 100) throw new Error('Evaluation suite must contain exactly 100 questions.');
  const ids = new Set();
  for (const question of suite.questions) {
    if (!question.id || ids.has(question.id)) throw new Error(`Duplicate or missing question id: ${question.id}`);
    ids.add(question.id);
    if (!question.query || !question.intent) throw new Error(`Question ${question.id} must have query and intent.`);
    if (!Array.isArray(question.expected_terms) || !question.expected_terms.length) {
      throw new Error(`Question ${question.id} must have expected_terms.`);
    }
    const expectedMin = question.expected_min_results ?? 1;
    const expectedMax = question.expected_max_results ?? null;
    if (!Number.isInteger(expectedMin) || expectedMin < 0) {
      throw new Error(`Question ${question.id} expected_min_results must be a non-negative integer.`);
    }
    if (expectedMax !== null && (!Number.isInteger(expectedMax) || expectedMax < 0)) {
      throw new Error(`Question ${question.id} expected_max_results must be a non-negative integer when supplied.`);
    }
    if (expectedMax !== null && expectedMax < expectedMin) {
      throw new Error(`Question ${question.id} expected_max_results must be greater than or equal to expected_min_results.`);
    }
  }
  const total = Object.values(suite.rubric || {}).reduce((sum, part) => sum + Number(part.points || 0), 0);
  if (total !== 100) throw new Error(`Rubric must total 100 points, found ${total}.`);
}

function validateVisuals(visuals, visualPath) {
  if (visuals.schema !== 'okf-explorer-visual-regressions.v1') throw new Error(`Unexpected visual schema: ${visuals.schema}`);
  if (!Array.isArray(visuals.items)) throw new Error('Visual regression manifest must contain items.');
  const baseDir = path.dirname(visualPath);
  for (const item of visuals.items) {
    if (!item.id || !item.image || !item.comment) throw new Error('Every visual regression item needs id, image and comment.');
    const imagePath = path.join(baseDir, item.image);
    if (!fs.existsSync(imagePath)) throw new Error(`Visual regression image missing: ${imagePath}`);
  }
}

function fixtureRelativeReceiptReference(journeysPath, receiptReference) {
  if (typeof receiptReference !== 'string' || !receiptReference.trim()) {
    throw new Error('genuine-browser-receipt verification needs a nonempty receipt path.');
  }
  const reference = receiptReference.trim();
  if (
    path.isAbsolute(reference) ||
    path.win32.isAbsolute(reference) ||
    reference.includes('\\') ||
    reference.split('/').includes('..')
  ) {
    throw new Error(`genuine-browser-receipt path must be safe and fixture-relative: ${receiptReference}`);
  }
  const fixtureDirectory = path.dirname(path.resolve(journeysPath));
  const resolved = path.resolve(fixtureDirectory, reference);
  const lexicalRelative = path.relative(fixtureDirectory, resolved);
  if (!lexicalRelative || lexicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(lexicalRelative)) {
    throw new Error(`genuine-browser-receipt path must name a file inside the journey fixture: ${receiptReference}`);
  }
  return { fixtureDirectory, resolved };
}

function fixtureRelativeReceiptPath(journeysPath, receiptReference) {
  const { fixtureDirectory, resolved } = fixtureRelativeReceiptReference(
    journeysPath,
    receiptReference
  );
  if (!fs.existsSync(resolved)) {
    throw new Error(`genuine-browser-receipt file is missing: ${resolved}`);
  }
  if (!fs.statSync(resolved).isFile()) {
    throw new Error(`genuine-browser-receipt path is not a file: ${resolved}`);
  }
  const realFixtureDirectory = fs.realpathSync(fixtureDirectory);
  const realReceipt = fs.realpathSync(resolved);
  const realRelative = path.relative(realFixtureDirectory, realReceipt);
  if (!realRelative || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error(`genuine-browser-receipt path escapes the journey fixture: ${receiptReference}`);
  }
  return resolved;
}

function assertFinalLocation(actualValue, expectedValue, label = 'Published URL') {
  const actual = credentialFreeHttpUrl(actualValue, `${label} final URL`);
  const expected = credentialFreeHttpUrl(expectedValue, `${label} expected final URL`);
  const actualLocation = `${actual.origin}${actual.pathname}${actual.search}`;
  const expectedLocation = `${expected.origin}${expected.pathname}${expected.search}`;
  if (actualLocation !== expectedLocation) {
    throw new Error(
      `${label} redirected to an unexpected origin, path, or query; expected ${expectedLocation}, got ${actualLocation}`
    );
  }
  return { actual, expected };
}

function receiptTimestamp(value, label) {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`${label} must be a timezone-qualified timestamp.`);
  }
  return Date.parse(value);
}

function loadGenuineBrowserReceipt(action, journeysPath) {
  const receiptPath = fixtureRelativeReceiptPath(journeysPath, action.receipt);
  let raw;
  let receipt;
  try {
    raw = fs.readFileSync(receiptPath);
    receipt = JSON.parse(raw.toString('utf8'));
  } catch (error) {
    throw new Error(`genuine-browser-receipt is not valid JSON: ${receiptPath} (${error.message})`);
  }
  if (receipt?.schema !== GENUINE_BROWSER_RECEIPT_SCHEMA) {
    throw new Error(`Unexpected genuine-browser-receipt schema: ${receipt?.schema || '(missing)'}`);
  }
  if (!receipt.browser || receipt.browser.webdriver !== false) {
    throw new Error('genuine-browser-receipt must record browser.webdriver as false.');
  }
  if (typeof receipt.browser.channel !== 'string' || !receipt.browser.channel.trim()) {
    throw new Error('genuine-browser-receipt must record a browser channel.');
  }
  if (typeof receipt.browser.user_agent !== 'string' || !receipt.browser.user_agent.trim()) {
    throw new Error('genuine-browser-receipt must record a browser user_agent.');
  }
  const receiptObservedAt = receiptTimestamp(
    receipt.observed_at,
    'genuine-browser-receipt observed_at'
  );
  if (!Array.isArray(receipt.records) || !receipt.records.length) {
    throw new Error('genuine-browser-receipt must contain records.');
  }
  const recordKeys = new Set();
  let previousObservedAt = Number.NEGATIVE_INFINITY;
  for (const [index, record] of receipt.records.entries()) {
    const prefix = `genuine-browser-receipt record ${index + 1}`;
    if (typeof record?.requested_url !== 'string' || !record.requested_url) {
      throw new Error(`${prefix} must have requested_url.`);
    }
    if (typeof record.expected_text !== 'string' || !record.expected_text) {
      throw new Error(`${prefix} must have expected_text.`);
    }
    if (typeof record.title !== 'string' || !record.title.trim()) {
      throw new Error(`${prefix} must have a title.`);
    }
    const recordObservedAt = receiptTimestamp(record.observed_at, `${prefix} observed_at`);
    if (recordObservedAt < previousObservedAt) {
      throw new Error('genuine-browser-receipt records must be ordered by observed_at.');
    }
    previousObservedAt = recordObservedAt;
    credentialFreeHttpUrl(record.requested_url, `${prefix} requested_url`);
    credentialFreeHttpUrl(record.final_url, `${prefix} final_url`);
    if (!Number.isInteger(record.response_status) || record.response_status < 200 || record.response_status >= 400) {
      throw new Error(`${prefix} response_status must be an integer from 200 to 399.`);
    }
    if (record.identity_matched !== true) {
      throw new Error(`${prefix} identity_matched must be true.`);
    }
    if (record.identity_source !== 'document.body.innerText') {
      throw new Error(`${prefix} identity_source must be document.body.innerText.`);
    }
    if (
      typeof record.identity_excerpt !== 'string' ||
      !record.identity_excerpt.toLocaleLowerCase('en-GB').includes(
        record.expected_text.toLocaleLowerCase('en-GB')
      )
    ) {
      throw new Error(`${prefix} identity_excerpt must contain expected_text.`);
    }
    const key = `${record.requested_url}\u0000${record.expected_text}`;
    if (recordKeys.has(key)) {
      throw new Error(`${prefix} duplicates requested_url and expected_text.`);
    }
    recordKeys.add(key);
  }
  if (previousObservedAt !== receiptObservedAt) {
    throw new Error(
      'genuine-browser-receipt observed_at must equal the latest ordered record observed_at.'
    );
  }
  return { receipt, receiptPath, receiptSha256: sha256(raw) };
}

function genuineBrowserReceiptEvidence(action, journeysPath) {
  const { receipt, receiptSha256 } = loadGenuineBrowserReceipt(action, journeysPath);
  const matches = receipt.records.filter(
    (record) => record.requested_url === action.value && record.expected_text === action.expected_text
  );
  if (matches.length !== 1) {
    throw new Error(
      `genuine-browser-receipt needs exactly one exact requested_url/expected_text match for ${action.value}; found ${matches.length}.`
    );
  }
  const record = matches[0];
  const expectedFinalUrl = action.expected_final_url || action.value;
  assertFinalLocation(record.final_url, expectedFinalUrl, 'genuine-browser-receipt URL');
  const finalHash = new URL(record.final_url).hash;
  const expectedFinalHash = action.expected_final_hash || null;
  const finalHashMatched = expectedFinalHash ? finalHash === expectedFinalHash : null;
  if (expectedFinalHash && !finalHashMatched) {
    throw new Error(
      `genuine-browser-receipt did not preserve expected final hash ${expectedFinalHash}; got ${finalHash || '(empty)'}: ${action.value}`
    );
  }
  return {
    verificationChannel: GENUINE_BROWSER_VERIFICATION_CHANNEL,
    receipt: action.receipt,
    receiptSha256,
    receiptObservedAt: receipt.observed_at,
    recordObservedAt: record.observed_at,
    browser: {
      channel: receipt.browser.channel,
      userAgent: receipt.browser.user_agent,
      webdriver: receipt.browser.webdriver
    },
    requestedUrl: record.requested_url,
    finalUrl: record.final_url,
    status: record.response_status,
    title: record.title,
    expectedText: record.expected_text,
    identityMatched: record.identity_matched,
    identitySource: record.identity_source,
    identityExcerpt: record.identity_excerpt,
    expectedFinalUrl,
    finalLocationMatched: true,
    expectedFinalHash,
    finalHashMatched
  };
}

function validateJourneys(
  journeys,
  journeysPath,
  { requireReceiptEvidence = true } = {}
) {
  if (journeys.schema !== 'okf-explorer-interaction-suite.v1') {
    throw new Error(`Unexpected interaction journey schema: ${journeys.schema}`);
  }
  if (!journeys.title || !journeys.target_bundle || !journeys.question_suite) {
    throw new Error('Interaction journey manifest needs title, target_bundle and question_suite.');
  }
  const questionSuitePath = path.resolve(path.dirname(journeysPath), journeys.question_suite);
  if (!fs.existsSync(questionSuitePath)) throw new Error(`Journey question suite missing: ${questionSuitePath}`);
  const questionSuite = readJson(questionSuitePath);
  const availableQuestions = new Set(
    (questionSuite.questions || [])
      .map((question) => (typeof question?.id === 'string' ? question.id.trim() : ''))
      .filter(Boolean)
  );
  if (!availableQuestions.size) throw new Error('Journey question suite has no question ids.');

  const personas = Array.isArray(journeys.personas) ? journeys.personas : [];
  const stories = Array.isArray(journeys.stories) ? journeys.stories : [];
  const interactionJourneys = Array.isArray(journeys.journeys) ? journeys.journeys : [];
  if (!personas.length || !stories.length || !interactionJourneys.length) {
    throw new Error('Interaction journey manifest needs personas, stories and journeys.');
  }
  const personaIds = new Set();
  for (const persona of personas) {
    if (!persona.id || personaIds.has(persona.id) || !persona.name || !persona.need) {
      throw new Error(`Invalid or duplicate journey persona: ${persona.id || '(missing id)'}`);
    }
    personaIds.add(persona.id);
  }
  const storyIds = new Set();
  const coveredQuestions = new Set();
  const referencedPersonas = new Set();
  const referencedPlaywrightTests = new Set();
  for (const story of stories) {
    if (!story.id || storyIds.has(story.id) || !story.user_story) {
      throw new Error(`Invalid or duplicate journey story: ${story.id || '(missing id)'}`);
    }
    storyIds.add(story.id);
    if (!Array.isArray(story.persona_ids) || !story.persona_ids.length) {
      throw new Error(`Story ${story.id} must reference at least one persona.`);
    }
    for (const personaId of story.persona_ids) {
      if (!personaIds.has(personaId)) throw new Error(`Story ${story.id} references unknown persona ${personaId}.`);
      referencedPersonas.add(personaId);
    }
    if (!Array.isArray(story.question_ids)) throw new Error(`Story ${story.id} must define question_ids.`);
    if (!story.question_ids.length && !story.coverage_gap) {
      throw new Error(`Story ${story.id} needs question_ids or an explicit coverage_gap.`);
    }
    for (const questionId of story.question_ids) {
      if (!availableQuestions.has(questionId)) throw new Error(`Story ${story.id} references unknown question ${questionId}.`);
      coveredQuestions.add(questionId);
    }
    if (story.playwright_test_ids !== undefined) {
      if (!Array.isArray(story.playwright_test_ids) || !story.playwright_test_ids.length) {
        throw new Error(`Story ${story.id} playwright_test_ids must be a non-empty array when supplied.`);
      }
      for (const testId of story.playwright_test_ids) {
        if (typeof testId !== 'string' || !/^GEO-E2E-\d{2}$/.test(testId)) {
          throw new Error(`Story ${story.id} has invalid Playwright test id ${testId}.`);
        }
        referencedPlaywrightTests.add(testId);
      }
    }
  }
  const unreferencedPersonas = [...personaIds].filter((id) => !referencedPersonas.has(id));
  if (unreferencedPersonas.length) throw new Error(`Personas without stories: ${unreferencedPersonas.join(', ')}`);
  const uncoveredQuestions = [...availableQuestions].filter((id) => !coveredQuestions.has(id));
  if (uncoveredQuestions.length) throw new Error(`Questions without persona/story traceability: ${uncoveredQuestions.join(', ')}`);

  if (referencedPlaywrightTests.size) {
    const specPath = path.join(repoRoot, 'apps/okf-explorer/tests/ui/geospatial-map.spec.ts');
    if (!fs.existsSync(specPath)) throw new Error(`Geospatial Playwright spec missing: ${specPath}`);
    const implementedPlaywrightTests = new Set(fs.readFileSync(specPath, 'utf8').match(/\bGEO-E2E-\d{2}\b/g) || []);
    const missingPlaywrightTests = [...referencedPlaywrightTests].filter((id) => !implementedPlaywrightTests.has(id));
    if (missingPlaywrightTests.length) {
      throw new Error(`Journey stories reference missing Playwright tests: ${missingPlaywrightTests.join(', ')}`);
    }
    const untracedPlaywrightTests = [...implementedPlaywrightTests].filter((id) => !referencedPlaywrightTests.has(id));
    if (untracedPlaywrightTests.length) {
      throw new Error(`Geospatial Playwright tests without persona/story traceability: ${untracedPlaywrightTests.join(', ')}`);
    }
  }

  const journeyIds = new Set();
  for (const journey of interactionJourneys) {
    if (!journey.id || journeyIds.has(journey.id) || !journey.title) {
      throw new Error(`Invalid or duplicate interaction journey: ${journey.id || '(missing id)'}`);
    }
    journeyIds.add(journey.id);
    if (!Array.isArray(journey.persona_ids) || !journey.persona_ids.length || !Array.isArray(journey.story_ids) || !journey.story_ids.length) {
      throw new Error(`Journey ${journey.id} must reference personas and stories.`);
    }
    for (const id of journey.persona_ids) if (!personaIds.has(id)) throw new Error(`Journey ${journey.id} references unknown persona ${id}.`);
    for (const id of journey.story_ids) if (!storyIds.has(id)) throw new Error(`Journey ${journey.id} references unknown story ${id}.`);
    if (!Array.isArray(journey.actions) || !journey.actions.length) throw new Error(`Journey ${journey.id} needs actions.`);
    if (!Array.isArray(journey.assertions) || !journey.assertions.length) throw new Error(`Journey ${journey.id} needs assertions.`);
    for (const action of journey.actions) {
      if (!JOURNEY_ACTIONS.has(action.action)) throw new Error(`Journey ${journey.id} has unknown action ${action.action}.`);
      if (action.action === 'open_external_link_new_tab' && !action.href_includes) {
        throw new Error(`Journey ${journey.id} external-link action needs href_includes.`);
      }
      if (action.action === 'verify_url' && (!action.value || !action.expected_text)) {
        throw new Error(`Journey ${journey.id} verify_url action needs value and expected_text.`);
      }
      if (action.action === 'verify_url') {
        credentialFreeHttpUrl(action.value, `Journey ${journey.id} verify_url value`);
        if (action.expected_final_url !== undefined) {
          credentialFreeHttpUrl(
            action.expected_final_url,
            `Journey ${journey.id} expected_final_url`,
            { allowHash: false }
          );
        }
        if (
          action.expected_final_hash !== undefined &&
          (typeof action.expected_final_hash !== 'string' ||
            !action.expected_final_hash.startsWith('#') ||
            action.expected_final_hash.length < 2 ||
            /\s/.test(action.expected_final_hash))
        ) {
          throw new Error(`Journey ${journey.id} expected_final_hash must be a nonempty URL hash without whitespace.`);
        }
        if (
          action.verification_channel !== undefined &&
          action.verification_channel !== GENUINE_BROWSER_VERIFICATION_CHANNEL
        ) {
          throw new Error(
            `Journey ${journey.id} has unsupported verification_channel ${action.verification_channel}.`
          );
        }
        if (action.verification_channel === GENUINE_BROWSER_VERIFICATION_CHANNEL) {
          if (requireReceiptEvidence) {
            genuineBrowserReceiptEvidence(action, journeysPath);
          } else {
            // A publication candidate is deliberately immutable and therefore
            // excludes time-varying browser receipts. Validation-only runs
            // still fail closed on the receipt reference shape; terminal
            // assurance loads and verifies the materialized receipt.
            fixtureRelativeReceiptReference(journeysPath, action.receipt);
          }
        } else if (action.receipt !== undefined) {
          throw new Error(
            `Journey ${journey.id} receipt requires verification_channel ${GENUINE_BROWSER_VERIFICATION_CHANNEL}.`
          );
        }
      }
    }
    for (const assertion of journey.assertions) {
      if (!JOURNEY_ASSERTIONS.has(assertion.assertion)) {
        throw new Error(`Journey ${journey.id} has unknown assertion ${assertion.assertion}.`);
      }
    }
  }
}

function loadPlaywright() {
  const moduleName = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
  try {
    return require(moduleName);
  } catch (error) {
    throw new Error(`Playwright is not available as "${moduleName}". Install it or set PLAYWRIGHT_PACKAGE to an installed playwright module path. Original error: ${error.message}`);
  }
}

function selectPlaywrightBrowser(playwright, browserEngine) {
  if (!BROWSER_ENGINES.has(browserEngine)) {
    throw new Error(
      `Unsupported Playwright browser engine: ${browserEngine}.`
    );
  }
  const browserType = playwright?.[browserEngine];
  if (!browserType || typeof browserType.launch !== 'function') {
    throw new Error(
      `Playwright does not provide the selected ${browserEngine} browser engine.`
    );
  }
  return browserType;
}

async function launchSelectedBrowser(options) {
  const browserType = selectPlaywrightBrowser(
    loadPlaywright(),
    options.browserEngine
  );
  const launchOptions = { headless: !options.headed };
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }
  return browserType.launch(launchOptions);
}

function buildUrl(baseUrl, bundle, query) {
  const url = new URL(baseUrl);
  url.searchParams.set('bundle', bundle);
  url.searchParams.set('q', query);
  return url.toString();
}

function receiptUrl(value) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:__cf|cf_|challenge|captcha)|(?:^|[_-])(?:access|refresh|session)?token$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

function includesAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(String(term).toLowerCase()));
}

function countTerms(text, terms) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(String(term).toLowerCase())).length;
}

function scoreQuestion(question, observation) {
  const text = `${observation.mainText}\n${observation.detailText}\n${observation.bodyText}`;
  const expectedMatches = countTerms(text, question.expected_terms);
  const expectedRatio = expectedMatches / Math.max(question.expected_terms.length, 1);
  const expectedMin = Number(question.expected_min_results ?? 1);
  const expectedMax = question.expected_max_results === undefined || question.expected_max_results === null
    ? null
    : Number(question.expected_max_results);
  const meetsExpectedMinimum = observation.resultCount >= expectedMin;
  const meetsExpectedMaximum = expectedMax === null || observation.resultCount <= expectedMax;
  const hasExpectedResults = meetsExpectedMinimum && meetsExpectedMaximum;
  const hasRoute = Boolean(observation.hash || observation.detailText.match(/\bRoute\b/i));
  const metadataTerms = ['Provider', 'Record type', 'Source', 'Protocol'].filter((term) => text.includes(term)).length;
  const hasSearchStatus = /Search Results|shown|No results|Searching static index|Preparing static search index/i.test(observation.mainText);
  const hasDetailBasics = Boolean(observation.detailTitle) && observation.detailText.length > 80;
  const hasLicenceAccess = /Licence|License|Access model|Contract status|Confidence/i.test(observation.detailText);
  const noRawGaps = !RAW_GAP_PATTERN.test(observation.detailText);
  const hasFollowOn = observation.chipCount > 0 || /Copy route|Graph|Pin|Load full relationships/i.test(observation.detailText);
  const notLoadingStuck = !/Loading bundle|Searching static index|Preparing static search index/i.test(observation.bodyText) || observation.resultCount > 0 || hasDetailBasics;
  const expectsEmpty = expectedMin === 0 && observation.resultCount === 0 && meetsExpectedMaximum;
  const queryRetained = String(observation.searchValue || '').trim() === String(question.query || '').trim();
  const explicitEmptySummary = /\b0\s+shown\s+of\s+0\s+matching\s+records\b/i.test(observation.mainText);
  const explicitEmptyMessage = /No static-search matches|No results|No records match|No matching records/i.test(observation.mainText);
  const emptyRecovery = /Clear search|Reset|Clear (?:all|filters?)|widen/i.test(observation.mainText);
  const meaningfulBoundedEmpty = Boolean(
    expectsEmpty && queryRetained && explicitEmptySummary && explicitEmptyMessage && notLoadingStuck
  );
  const namedControls = observation.emptyButtonCount === 0 && observation.emptyLinkCount === 0;
  const hasLandmarks = observation.landmarkCount >= 3;
  const hasLiveStatus = observation.liveRegionCount >= 1;
  const hasFocusableControls = observation.focusableCount >= 8;
  const noOverlapFlag = !observation.visualWarnings.length;
  const plainLanguage = /Licence|Access model|Metadata quality|Confidence|Source|Record type/i.test(observation.detailText);
  const provenance = /Source|source_|source url|Documentation|Endpoint URL|Provider/i.test(observation.detailText);
  const qualityExplained = /Explain metadata quality|Explain confidence|Explain licence|Explain evidence count/i.test(observation.bodyText);
  const noSecrets = !SECRET_PATTERN.test(observation.bodyText);

  const score = {
    retrieval: 0,
    display: 0,
    accessibility: 0,
    govuk: 0
  };
  score.retrieval += hasExpectedResults ? 10 : 0;
  score.retrieval += meaningfulBoundedEmpty ? 10 : Math.round(expectedRatio * 10);
  score.retrieval += hasSearchStatus ? 5 : 0;
  score.retrieval += hasRoute || meaningfulBoundedEmpty ? 5 : 0;
  score.retrieval += meaningfulBoundedEmpty ? 5 : Math.min(metadataTerms, 4) >= 3 ? 5 : Math.min(metadataTerms, 4);

  score.display += hasDetailBasics || meaningfulBoundedEmpty ? 5 : 0;
  score.display += hasLicenceAccess ? 5 : 0;
  score.display += noRawGaps ? 5 : 0;
  score.display += hasFollowOn || (meaningfulBoundedEmpty && emptyRecovery) ? 5 : 0;
  score.display += notLoadingStuck ? 5 : 0;

  score.accessibility += namedControls ? 5 : 0;
  score.accessibility += hasLiveStatus ? 5 : 0;
  score.accessibility += hasFocusableControls ? 5 : 0;
  score.accessibility += hasLandmarks && noOverlapFlag ? 5 : Math.min(hasLandmarks ? 3 : 0, 3);

  score.govuk += plainLanguage || meaningfulBoundedEmpty ? 5 : 0;
  score.govuk += provenance ? 5 : 0;
  score.govuk += /Copy route|Clear search|Load full relationships|Reduce context/i.test(observation.bodyText) ? 5 : 0;
  score.govuk += qualityExplained && noSecrets ? 5 : noSecrets ? 3 : 0;

  const total = score.retrieval + score.display + score.accessibility + score.govuk;
  return {
    ...score,
    total,
    checks: {
      resultCount: observation.resultCount,
      expectedMatches,
      expectedTerms: question.expected_terms,
      expectedMinResults: expectedMin,
      expectedMaxResults: expectedMax,
      meetsExpectedMinimum,
      meetsExpectedMaximum,
      hasExpectedResults,
      expectsEmpty,
      meaningfulBoundedEmpty,
      queryRetained,
      explicitEmptySummary,
      explicitEmptyMessage,
      emptyRecovery,
      hasRoute,
      hasDetailBasics,
      noRawGaps,
      namedControls,
      hasLiveStatus,
      hasLandmarks,
      noSecrets,
      visualWarnings: observation.visualWarnings
    }
  };
}

async function observeQuestion(page, options, question) {
  await page.goto(buildUrl(options.baseUrl, options.bundle, question.query), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main', { timeout: 20000 });
  await page.waitForTimeout(500);
  await waitForSettledSearch(page);
  const results = await page.locator('.result-list button, .record-list button, .large-card, [data-route]').count().catch(() => 0);
  const resultButtons = page.locator('.result-list button, .record-list button');
  const firstResultCount = await resultButtons.count().catch(() => 0);
  if (firstResultCount > 0) {
    await resultButtons.first().click();
    await page.waitForTimeout(350);
  }
  await waitForSettledSearch(page);

  return page.evaluate(() => {
    const textOf = (selector) => Array.from(document.querySelectorAll(selector)).map((node) => node.textContent || '').join('\n').trim();
    const accessibleName = (element) => (element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '').trim();
    const buttons = Array.from(document.querySelectorAll('button'));
    const links = Array.from(document.querySelectorAll('a'));
    const blankButtons = buttons.filter((button) => !accessibleName(button));
    const blankLinks = links.filter((link) => !accessibleName(link));
    const detailRoot = document.querySelector('.right-panel') || document.querySelector('aside:last-of-type') || document.body;
    const main = document.querySelector('main') || document.body;
    const detailTitle = detailRoot.querySelector('h1, h2, h3')?.textContent?.trim() || '';
    const graph = document.querySelector('svg.graph');
    const visualWarnings = [];
    if (graph) {
      const labels = Array.from(graph.querySelectorAll('text')).map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
      const nodes = Array.from(graph.querySelectorAll('.node-hit')).map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
      const overlapCount = labels.reduce((count, label) => count + nodes.filter((node) => intersects(label, node)).length, 0);
      if (overlapCount > 12) visualWarnings.push(`high graph label/node overlap count: ${overlapCount}`);
    }
    function intersects(a, b) {
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }
    return {
      bodyText: document.body.innerText,
      mainText: main.innerText,
      detailText: detailRoot.innerText,
      detailTitle,
      searchValue: document.querySelector('.search-input')?.value || '',
      resultCount: Math.max(
        document.querySelectorAll('.result-list button, .record-list button').length,
        document.querySelectorAll('.api-card, .dataset-card-ui, .large-card').length
      ),
      chipCount: document.querySelectorAll('.metadata-chip, .chip, .tag-chip').length,
      emptyButtonCount: blankButtons.length,
      emptyLinkCount: blankLinks.length,
      landmarkCount: document.querySelectorAll('header, main, nav, aside, footer, [role="banner"], [role="main"], [role="navigation"], [role="complementary"]').length,
      liveRegionCount: document.querySelectorAll('[aria-live]').length,
      focusableCount: document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length,
      hash: window.location.hash,
      visualWarnings
    };
  });
}

async function waitForSettledSearch(page) {
  await page.waitForFunction(() => {
    const bodyText = document.body.innerText || '';
    const query = new URL(window.location.href).searchParams.get('q')?.trim() || '';
    const busy = [
      'Loading bundle...',
      'Preparing static search index',
      'Searching static index...',
      'Loading the record and resource index'
    ].some((message) => bodyText.includes(message));
    const resultCount = document.querySelectorAll('.result-list > button, .record-list > button').length;
    const explicitEmptyState = /No static-search matches|No results|No records match|No spatial evidence in this context|0\s+shown\s+of\s+0\s+matching\s+records/i.test(bodyText);
    return !busy && (!query || resultCount > 0 || explicitEmptyState);
  }, undefined, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

function buildJourneyUrl(baseUrl, bundle, start = {}, bundleExplicit = false, bundleRoot = null) {
  const url = new URL(baseUrl);
  const declaredBundle = typeof start.bundle === 'string' && start.bundle.trim() ? start.bundle.trim() : bundle;
  const rootedBundle = bundleRoot && typeof start.bundle === 'string' && start.bundle.trim()
    ? new URL(start.bundle.trim().replace(/^\/+/, ''), bundleRoot).toString()
    : declaredBundle;
  url.searchParams.set('bundle', bundleExplicit ? bundle : rootedBundle);
  if (start.query) url.searchParams.set('q', start.query);
  if (start.sort) url.searchParams.set('sort', start.sort);
  for (const [key, values] of Object.entries(start.filters || {})) {
    for (const value of values) url.searchParams.append(`filter.${key}`, value);
  }
  if (start.hash) url.hash = start.hash;
  return url.toString();
}

function assertPublicationCandidateBinding(options, journeys, candidateReceipt) {
  const publicationJourneys = selectedJourneys(options, journeys).filter(
    (journey) => journey.id === 'journey-publication'
  );
  if (!publicationJourneys.length) return;
  if (!candidateReceipt) {
    throw new Error(
      'journey-publication requires --candidate-receipt so the deployed descriptor is bound to the locally passed candidate.'
    );
  }

  const candidateUrl = candidateBundleUrl(options);
  const baseUrl = credentialFreeHttpUrl(options.baseUrl, 'journey-publication base URL');
  if (baseUrl.search || baseUrl.hash) {
    throw new Error('journey-publication base URL must not contain a query or fragment.');
  }

  for (const journey of publicationJourneys) {
    const targetBundle = options.bundleExplicit ? options.bundle : journeys.target_bundle;
    const startUrl = new URL(
      buildJourneyUrl(
        options.baseUrl,
        targetBundle,
        journey.start,
        options.bundleExplicit,
        options.bundleRoot
      )
    );
    const startBundleValue = startUrl.searchParams.get('bundle');
    if (!startBundleValue) {
      throw new Error('journey-publication start URL must declare its candidate bundle.');
    }
    if (startBundleValue.startsWith('/') && !options.bundleRoot) {
      throw new Error(
        'journey-publication requires --bundle-root when its start bundle is root-relative.'
      );
    }
    const startBundleUrl = credentialFreeHttpUrl(
      startBundleValue.startsWith('/')
        ? new URL(startBundleValue.replace(/^\/+/, ''), options.bundleRoot).toString()
        : new URL(startBundleValue, options.bundleRoot || options.baseUrl).toString(),
      'journey-publication start bundle'
    );
    assertFinalLocation(
      startBundleUrl.toString(),
      candidateUrl.toString(),
      'journey-publication candidate/start binding'
    );

    const publicExplorerActions = journey.actions.filter((action) => {
      if (action.action !== 'verify_url') return false;
      try {
        return new URL(action.value).searchParams.has('bundle');
      } catch {
        return false;
      }
    });
    if (!publicExplorerActions.length) {
      throw new Error(
        'journey-publication must verify a public Explorer URL carrying the exact candidate bundle.'
      );
    }
    const declaredBundleUrls = new Set(
      journeys.journeys
        .map((declaredJourney) => declaredJourney.start?.bundle)
        .filter((declaredBundle) => typeof declaredBundle === 'string' && declaredBundle.trim())
        .map((declaredBundle) => credentialFreeHttpUrl(
          declaredBundle.startsWith('/')
            ? new URL(declaredBundle.replace(/^\/+/, ''), options.bundleRoot).toString()
            : new URL(declaredBundle, options.bundleRoot || options.baseUrl).toString(),
          'journey-publication declared auxiliary bundle'
        ).toString())
    );
    let exactCandidateActions = 0;
    for (const action of publicExplorerActions) {
      const publicExplorerUrl = credentialFreeHttpUrl(
        action.value,
        'journey-publication public Explorer URL'
      );
      const publicBundleValue = publicExplorerUrl.searchParams.get('bundle');
      const publicBundleUrl = credentialFreeHttpUrl(
        publicBundleValue,
        'journey-publication public Explorer bundle'
      );
      const publicExplorerLocation = `${publicExplorerUrl.origin}${publicExplorerUrl.pathname}`;
      const expectedExplorerLocation = `${baseUrl.origin}${baseUrl.pathname}`;
      if (publicExplorerLocation !== expectedExplorerLocation) {
        throw new Error(
          'journey-publication base URL and public Explorer verification URL differ; ' +
          `expected ${expectedExplorerLocation}, got ${publicExplorerLocation}`
        );
      }
      if (publicBundleUrl.toString() === candidateUrl.toString()) {
        exactCandidateActions += 1;
      } else if (!declaredBundleUrls.has(publicBundleUrl.toString())) {
        throw new Error(
          'journey-publication candidate/public URL binding rejected an undeclared auxiliary bundle; ' +
          `got ${publicBundleUrl.toString()}`
        );
      }
    }
    if (!exactCandidateActions) {
      throw new Error(
        'journey-publication candidate/public URL binding requires at least one public Explorer action carrying the exact candidate bundle.'
      );
    }
  }
}

function selectedJourneys(options, journeys) {
  const requested = new Set(options.journeyIds);
  const selected = requested.size
    ? journeys.journeys.filter((journey) => requested.has(journey.id))
    : journeys.journeys;
  if (requested.size && selected.length !== requested.size) {
    const available = new Set(journeys.journeys.map((journey) => journey.id));
    const missing = [...requested].filter((id) => !available.has(id));
    throw new Error(`Unknown journey id(s): ${missing.join(', ')}`);
  }
  return selected.slice(0, options.journeyLimit);
}

async function locateFacet(page, action) {
  const label = action.facet_label || action.facet || action.facet_key;
  const facetKey = action.facet_key || action.facet;
  const sections = page.locator('.facet-section');
  const count = await sections.count();
  for (let index = 0; index < count; index += 1) {
    const section = sections.nth(index);
    const sectionKey = await section.getAttribute('data-facet-key');
    if (facetKey && sectionKey === String(facetKey)) return section;
    const control = section.locator('.facet-toggle, summary').first();
    if (!(await control.count())) continue;
    const controlText = (await control.innerText()).trim().toLowerCase();
    if (controlText.includes(String(label).toLowerCase())) return section;
  }
  throw new Error(`Facet section not found: ${label}`);
}

async function openFacet(section) {
  const toggle = section.locator('.facet-toggle').first();
  if (await toggle.count()) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    await toggle.waitFor({ state: 'visible' });
    return {
      label: (await toggle.innerText()).trim(),
      open: (await toggle.getAttribute('aria-expanded')) === 'true'
    };
  }
  const summary = section.locator('summary').first();
  if (!(await section.evaluate((node) => node.hasAttribute('open')))) await summary.click();
  return {
    label: (await summary.innerText()).trim(),
    open: await section.evaluate((node) => node.hasAttribute('open'))
  };
}

async function runJourneyAction(page, action, evidence, options) {
  if (action.action === 'search') {
    const input = page.locator('.search-input').first();
    await input.fill(action.value);
    await waitForSettledSearch(page);
    return { value: await input.inputValue(), url: page.url() };
  }
  if (action.action === 'open_first_result') {
    const result = page.locator('.result-list > button').first();
    await result.waitFor({ state: 'visible', timeout: 20000 });
    const title = (await result.locator('strong').first().innerText()).trim();
    await result.click();
    await page.waitForTimeout(300);
    return { title, url: page.url() };
  }
  if (action.action === 'open_facet') {
    const section = await locateFacet(page, action);
    const state = await openFacet(section);
    await page.waitForTimeout(250);
    return state;
  }
  if (action.action === 'select_facet_value') {
    const section = await locateFacet(page, action);
    await openFacet(section);
    const search = section.locator('.facet-search input');
    if (await search.count()) {
      await search.fill(action.search || action.value);
      await page.waitForTimeout(100);
    }
    const candidate = section.locator('.facet-values button:not(.facet-more)').filter({ hasText: action.value }).first();
    await candidate.waitFor({ state: 'visible', timeout: 20000 });
    const label = (await candidate.innerText()).trim();
    await candidate.click();
    const facetKey = action.facet_key || action.facet;
    if (
      facetKey &&
      !new URL(page.url()).searchParams.getAll(`filter.${facetKey}`).includes(String(action.value))
    ) {
      // Current compact facets use a first click to preview a value and Enter
      // to commit it. Legacy facets applied immediately, so retain both paths.
      await candidate.press('Enter');
    }
    await waitForSettledSearch(page);
    return { facet: action.facet_key || action.facet, value: action.value, label, url: page.url() };
  }
  if (action.action === 'set_sort') {
    let select = page.locator('.sort-control select').first();
    if (!(await select.count())) {
      const resultsTab = page.getByRole('tab', { name: 'Results', exact: true }).first();
      await resultsTab.waitFor({ state: 'visible', timeout: 10000 });
      await resultsTab.click();
      select = page.locator('.sort-control select').first();
    }
    await select.selectOption(action.value);
    await page.waitForTimeout(150);
    evidence.sortState = { value: await select.inputValue(), url: page.url() };
    return evidence.sortState;
  }
  if (action.action === 'history_round_trip') {
    const originalUrl = page.url();
    const originalQuery = await page.locator('.search-input').first().inputValue();
    const alternateUrl = new URL(originalUrl);
    alternateUrl.searchParams.set('q', action.alternate_query || `${originalQuery} alternate`);
    await page.goto(alternateUrl.toString(), { waitUntil: 'domcontentloaded' });
    await waitForSettledSearch(page);
    const alternateQuery = await page.locator('.search-input').first().inputValue();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitForSettledSearch(page);
    const restoredBackUrl = page.url();
    const restoredBackQuery = await page.locator('.search-input').first().inputValue();
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await waitForSettledSearch(page);
    const restoredForwardQuery = await page.locator('.search-input').first().inputValue();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitForSettledSearch(page);
    const restored = restoredBackUrl === originalUrl && restoredBackQuery === originalQuery && restoredForwardQuery === alternateQuery;
    evidence.historyRoundTrip = { originalUrl, originalQuery, alternateQuery, restoredBackUrl, restoredBackQuery, restoredForwardQuery, restored };
    return evidence.historyRoundTrip;
  }
  if (action.action === 'select_view') {
    const button = page.locator('nav.tabs button').filter({ hasText: action.value }).first();
    await button.click();
    await page.waitForTimeout(350);
    return { value: action.value, active: await button.evaluate((node) => node.classList.contains('active')) };
  }
  if (action.action === 'select_map_filter') {
    const button = page.locator('.map-chips button').filter({ hasText: action.value }).first();
    await button.waitFor({ state: 'visible', timeout: 30000 });
    await button.click();
    await page.waitForTimeout(200);
    evidence.mapFilter = {
      label: action.value,
      url: page.url(),
      value: new URL(page.url()).searchParams.get('geo'),
      active: await button.evaluate((node) => node.classList.contains('active'))
    };
    return evidence.mapFilter;
  }
  if (action.action === 'select_map_record') {
    const record = page.locator('.map-record-list button').first();
    await record.waitFor({ state: 'visible', timeout: 20000 });
    const markerCount = await page.locator('.locator-marker').count();
    const title = (await record.locator('strong').first().innerText()).trim();
    await record.click();
    await page.waitForTimeout(200);
    const selected = await record.evaluate((node) => node.classList.contains('active'));
    const detailText = await page.locator('.right-panel').innerText();
    evidence.mapRecord = { title, markerCount, selected, detailVisible: detailText.includes(title), url: page.url() };
    return evidence.mapRecord;
  }
  if (action.action === 'select_graph_edge') {
    const edges = page.locator('svg.graph .edge-hit');
    let edge = edges.first();
    if (action.key_includes) {
      edge = null;
      for (let index = 0; index < await edges.count(); index += 1) {
        const candidate = edges.nth(index);
        const candidateKey = await candidate.getAttribute('data-edge');
        if (candidateKey?.includes(action.key_includes)) {
          edge = candidate;
          break;
        }
      }
      if (!edge) throw new Error(`Graph edge not found: ${action.key_includes}`);
    }
    await edge.waitFor({ state: 'visible', timeout: 20000 });
    const key = await edge.getAttribute('data-edge');
    await edge.focus();
    await edge.press('Enter');
    const relationshipBadge = page.locator('.right-panel .badge').filter({ hasText: /^Relationship$/ }).first();
    await relationshipBadge.waitFor({ state: 'visible', timeout: 10000 });
    const selectedRows = await page.locator('.relationship-rows button[aria-pressed="true"], .edge-panel button.active').count();
    const relationshipCard = await relationshipBadge.count();
    const detailText = await page.locator('.right-panel').innerText();
    const expectedText = Array.isArray(action.expected_text) ? action.expected_text : [];
    const expectedTextMatched = expectedText.every((value) => detailText.toLowerCase().includes(String(value).toLowerCase()));
    evidence.graphEdge = {
      key,
      selectedRows,
      relationshipCard,
      expectedText,
      expectedTextMatched,
      selected: selectedRows > 0 && relationshipCard > 0 && expectedTextMatched
    };
    return evidence.graphEdge;
  }
  if (action.action === 'resize_relationship_drawer') {
    const summary = page.locator('.edge-panel summary').first();
    await summary.waitFor({ state: 'visible', timeout: 10000 });
    await summary.scrollIntoViewIfNeeded();
    const beforeLabel = await summary.getAttribute('aria-label');
    const before = Number((beforeLabel || '').match(/(\d+) pixels/)?.[1] || 0);
    const requestedPixels = Number(action.pixels || 80);
    const resizeKey = requestedPixels >= 0 ? 'ArrowUp' : 'ArrowDown';
    const keyPresses = Math.max(1, Math.ceil(Math.abs(requestedPixels) / 20));
    await summary.focus();
    for (let index = 0; index < keyPresses; index += 1) await summary.press(resizeKey);
    await page.waitForTimeout(100);
    const afterLabel = await summary.getAttribute('aria-label');
    const after = Number((afterLabel || '').match(/(\d+) pixels/)?.[1] || 0);
    evidence.relationshipDrawer = {
      before,
      after,
      input: 'keyboard',
      resized: before > 0 && Math.abs(after - before) >= 20
    };
    return evidence.relationshipDrawer;
  }
  if (action.action === 'load_full_record') {
    const button = page.getByRole('button', { name: /^Load (?:full|selected) record$/ }).first();
    // Search selection may already have completed bounded locator hydration.
    // Keep the action idempotent so success proves the loaded state, not that
    // a transient button happened to remain on screen long enough to click.
    if (await button.count()) {
      await button.waitFor({ state: 'visible', timeout: 10000 });
      await button.click();
    }
    await page.waitForFunction(() => {
      const labels = [...document.querySelectorAll('.right-panel button')]
        .map((node) => (node.textContent || '').trim());
      const stillLoading = labels.some((label) => /^Loading (?:full|selected) record/.test(label));
      const stillLoadable = labels.some((label) => /^Load (?:full|selected) record$/.test(label));
      const visibleDisclosures = [...document.querySelectorAll('.right-panel .disclosure-section')]
        .filter((node) => {
          const style = getComputedStyle(node);
          return !node.hasAttribute('hidden') && style.display !== 'none' && style.visibility !== 'hidden';
        });
      return !stillLoading && !stillLoadable && visibleDisclosures.length >= 2;
    }, undefined, { timeout: 30000 });
    // A locator hydration can replace the lightweight search card without a
    // user-visible Load button. Give Svelte one settled paint before recording
    // disclosure defaults so the evidence never mixes the outgoing and
    // hydrated cards.
    await page.waitForTimeout(250);
    const states = await page.locator('.right-panel .disclosure-section:visible').evaluateAll(
      (nodes) => nodes.map((node) => node.hasAttribute('open'))
    );
    evidence.disclosureDefaults = { states, observed: states.length >= 2 && states[0] === true && states.slice(1).every((open) => !open) };
    return evidence.disclosureDefaults;
  }
  if (action.action === 'toggle_disclosure') {
    const disclosure = page.locator('.right-panel .disclosure-section').filter({ has: page.locator('summary', { hasText: action.label }) }).first();
    await disclosure.waitFor({ state: 'visible', timeout: 10000 });
    const initial = await disclosure.evaluate((node) => node.hasAttribute('open'));
    await disclosure.locator('summary').click();
    const afterOpen = await disclosure.evaluate((node) => node.hasAttribute('open'));
    await disclosure.locator('summary').click();
    const afterClose = await disclosure.evaluate((node) => node.hasAttribute('open'));
    evidence.disclosureToggle = { label: action.label, initial, afterOpen, afterClose, observed: !initial && afterOpen && !afterClose };
    return evidence.disclosureToggle;
  }
  if (action.action === 'open_source_inspector') {
    const button = page.getByRole('button', { name: action.label || 'View source data', exact: true }).first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await page.locator('.source-inspector').waitFor({ state: 'visible', timeout: 20000 });
    evidence.sourceInspector = { visible: true, openerUrl: page.url() };
    return evidence.sourceInspector;
  }
  if (action.action === 'open_external_link_new_tab') {
    const links = page.locator('a[target="_blank"]:visible');
    let link = null;
    for (let index = 0; index < await links.count(); index += 1) {
      const candidate = links.nth(index);
      const href = await candidate.getAttribute('href');
      if (href?.includes(action.href_includes)) {
        link = candidate;
        break;
      }
    }
    if (!link) throw new Error(`External link not found: ${action.href_includes}`);
    await link.waitFor({ state: 'visible', timeout: 10000 });
    const openerUrl = page.url();
    const popupPromise = page.waitForEvent('popup', { timeout: 10000 });
    await link.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => undefined);
    const popupUrl = receiptUrl(popup.url());
    const externalTab = {
      openerUrl,
      popupUrl,
      openerUnchanged: page.url() === openerUrl,
      separatePage: popup !== page,
      opened: Boolean(popupUrl && popupUrl !== 'about:blank'),
      hrefIncludes: action.href_includes
    };
    evidence.externalTab = externalTab;
    evidence.externalTabs = [...(evidence.externalTabs || []), externalTab];
    await popup.close().catch(() => undefined);
    return externalTab;
  }
  if (action.action === 'open_raw_source_new_tab') {
    const openerUrl = page.url();
    const popupPromise = page.waitForEvent('popup', { timeout: 10000 });
    await page.getByRole('link', { name: /Open raw JSON/ }).first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => undefined);
    const popupUrl = popup.url();
    evidence.externalTab = {
      openerUrl,
      popupUrl,
      openerUnchanged: page.url() === openerUrl,
      separatePage: popup !== page,
      opened: Boolean(popupUrl && popupUrl !== 'about:blank')
    };
    evidence.externalTabs = [...(evidence.externalTabs || []), evidence.externalTab];
    await popup.close().catch(() => undefined);
    return evidence.externalTab;
  }
  if (action.action === 'verify_url') {
    if (action.verification_channel === GENUINE_BROWSER_VERIFICATION_CHANNEL) {
      const receiptEvidence = genuineBrowserReceiptEvidence(action, options.journeys);
      evidence.verifiedUrls = [...(evidence.verifiedUrls || []), receiptEvidence];
      return receiptEvidence;
    }
    const expectedUrl = credentialFreeHttpUrl(action.value, 'verify_url');
    const candidate = evidence.verificationPage || await page.context().newPage();
    evidence.verificationPage = candidate;
    if (options.verificationDelayMs) {
      await candidate.waitForTimeout(options.verificationDelayMs);
    }
    const timeoutMs = Number(action.timeout_ms || 30000);
    const response = await candidate.goto(expectedUrl.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs
    });
    const status = response?.status() ?? 0;
    if (status < 200 || status >= 400) throw new Error(`Published URL returned HTTP ${status}: ${action.value}`);
    await candidate.waitForFunction(
      ({ expectedText, expectedHash }) =>
        (document.body.innerText || '').toLowerCase().includes(expectedText) &&
        (!expectedHash || window.location.hash === expectedHash),
      {
        expectedText: String(action.expected_text).toLowerCase(),
        expectedHash: action.expected_final_hash ? String(action.expected_final_hash) : ''
      },
      { timeout: timeoutMs }
    );
    const bodyText = await candidate.locator('body').innerText();
    const identityMatched = bodyText.toLowerCase().includes(String(action.expected_text).toLowerCase());
    if (!identityMatched) throw new Error(`Published URL did not contain expected identity ${action.expected_text}: ${action.value}`);
    const finalUrl = candidate.url();
    const expectedFinalUrl = action.expected_final_url || action.value;
    assertFinalLocation(finalUrl, expectedFinalUrl);
    const finalHash = new URL(finalUrl).hash;
    const expectedFinalHash = action.expected_final_hash || null;
    const finalHashMatched = expectedFinalHash ? finalHash === expectedFinalHash : null;
    if (expectedFinalHash && !finalHashMatched) {
      throw new Error(
        `Published URL did not preserve expected final hash ${expectedFinalHash}; got ${finalHash || '(empty)'}: ${action.value}`
      );
    }
    const receipt = {
      verificationChannel: 'live-browser',
      requestedUrl: action.value,
      finalUrl,
      status,
      expectedText: action.expected_text,
      identityMatched,
      expectedFinalUrl,
      finalLocationMatched: true,
      expectedFinalHash,
      finalHashMatched
    };
    evidence.verifiedUrls = [...(evidence.verifiedUrls || []), receipt];
    return receipt;
  }
  throw new Error(`Unsupported journey action: ${action.action}`);
}

async function evaluateJourneyAssertion(page, assertion, evidence) {
  let passed = false;
  let actual = null;
  if (assertion.assertion === 'url_param_equals' || assertion.assertion === 'url_param_includes' || assertion.assertion === 'url_param_absent') {
    actual = new URL(page.url()).searchParams.getAll(assertion.name);
    passed = assertion.assertion === 'url_param_absent'
      ? actual.length === 0
      : assertion.assertion === 'url_param_equals'
        ? actual.length === 1 && actual[0] === assertion.value
        : actual.some((value) => value.includes(String(assertion.value)));
  } else if (assertion.assertion === 'sort_value') {
    const urlValue = new URL(page.url()).searchParams.get('sort');
    const control = page.locator('.sort-control select').first();
    const controlValue = await control.count() ? await control.inputValue() : null;
    actual = { url: urlValue, control: controlValue, action: evidence.sortState?.value || null };
    passed = urlValue === assertion.value && actual.action === assertion.value && (controlValue === null || controlValue === assertion.value);
  } else if (assertion.assertion === 'search_value') {
    actual = await page.locator('.search-input').first().inputValue();
    passed = actual === assertion.value;
  } else if (assertion.assertion === 'history_round_trip_restored') {
    actual = evidence.historyRoundTrip || null;
    passed = Boolean(actual?.restored);
  } else if (assertion.assertion === 'result_count_min') {
    actual = await page.locator('.result-list > button').count();
    passed = actual >= Number(assertion.value);
  } else if (assertion.assertion === 'map_filter_applied') {
    actual = evidence.mapFilter || null;
    passed = Boolean(actual?.active && actual?.value);
  } else if (assertion.assertion === 'map_marker_visible') {
    // The journey intentionally leaves Map before final assertions. Preserve
    // the count observed at map-record selection instead of inspecting the
    // final Reader projection and producing a false negative.
    actual = evidence.mapRecord?.markerCount ?? await page.locator('.locator-marker').count();
    passed = actual >= Number(assertion.value || 1);
  } else if (assertion.assertion === 'map_record_selected') {
    actual = evidence.mapRecord || null;
    passed = Boolean(actual?.selected && actual?.detailVisible);
  } else if (assertion.assertion === 'graph_edge_selected') {
    actual = evidence.graphEdge || null;
    passed = Boolean(actual?.selected);
  } else if (assertion.assertion === 'relationship_drawer_resized') {
    actual = evidence.relationshipDrawer || null;
    passed = Boolean(actual?.resized);
  } else if (assertion.assertion === 'disclosure_defaults_observed') {
    actual = evidence.disclosureDefaults || null;
    passed = Boolean(actual?.observed);
  } else if (assertion.assertion === 'disclosure_toggle_observed') {
    actual = evidence.disclosureToggle || null;
    passed = Boolean(actual?.observed);
  } else if (assertion.assertion === 'source_inspector_visible') {
    actual = evidence.sourceInspector || null;
    passed = Boolean(actual?.visible);
  } else if (assertion.assertion === 'external_link_opened_in_new_tab') {
    const tabs = evidence.externalTabs || (evidence.externalTab ? [evidence.externalTab] : []);
    actual = assertion.href_includes
      ? tabs.find((tab) => tab.popupUrl?.includes(assertion.href_includes)) || null
      : tabs.at(-1) || null;
    passed = Boolean(actual?.opened && actual?.separatePage && actual?.openerUnchanged);
  } else if (assertion.assertion === 'visible_text') {
    const root = assertion.selector ? page.locator(assertion.selector).first() : page.locator('body');
    actual = await root.innerText();
    passed = actual.toLowerCase().includes(String(assertion.value).toLowerCase());
  }
  return { assertion: assertion.assertion, passed, expected: assertion.value ?? null, actual };
}

async function runInteractionJourneys(browserContext, options, journeys) {
  const page = await browserContext.newPage();
  const records = [];
  const targetBundle = options.bundleExplicit ? options.bundle : journeys.target_bundle;
  for (const journey of selectedJourneys(options, journeys)) {
    const started = Date.now();
    const evidence = {};
    const actionRecords = [];
    const startUrl = buildJourneyUrl(
      options.baseUrl,
      targetBundle,
      journey.start,
      options.bundleExplicit,
      options.bundleRoot
    );
    try {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('main', { timeout: 20000 });
      await waitForSettledSearch(page);
      for (const action of journey.actions) {
        actionRecords.push({ action: action.action, passed: true, evidence: await runJourneyAction(page, action, evidence, options) });
      }
      const assertions = [];
      for (const assertion of journey.assertions) assertions.push(await evaluateJourneyAssertion(page, assertion, evidence));
      const passed = assertions.every((assertion) => assertion.passed);
      await evidence.verificationPage?.close().catch(() => undefined);
      records.push({
        id: journey.id,
        title: journey.title,
        persona_ids: journey.persona_ids,
        story_ids: journey.story_ids,
        start_url: startUrl,
        status: passed ? 'passed' : 'failed',
        elapsed_ms: Date.now() - started,
        actions: actionRecords,
        assertions
      });
      process.stdout.write(`${journey.id} ${passed ? 'passed' : 'failed'} ${journey.title}\n`);
    } catch (error) {
      await evidence.verificationPage?.close().catch(() => undefined);
      actionRecords.push({ action: journey.actions[actionRecords.length]?.action || 'setup', passed: false, error: error.message });
      records.push({
        id: journey.id,
        title: journey.title,
        persona_ids: journey.persona_ids,
        story_ids: journey.story_ids,
        start_url: startUrl,
        status: 'error',
        elapsed_ms: Date.now() - started,
        actions: actionRecords,
        assertions: [],
        error: error.message
      });
      process.stdout.write(`${journey.id} error ${journey.title} (${error.message})\n`);
    }
  }
  await page.close();
  return records;
}

function buildValidationOnlyJourneyRecords(options, journeys) {
  const targetBundle = options.bundleExplicit ? options.bundle : journeys.target_bundle;
  return selectedJourneys(options, journeys).map((journey) => ({
    id: journey.id,
    title: journey.title,
    persona_ids: journey.persona_ids,
    story_ids: journey.story_ids,
    start_url: buildJourneyUrl(
      options.baseUrl,
      targetBundle,
      journey.start,
      options.bundleExplicit,
      options.bundleRoot
    ),
    status: 'validation-only',
    elapsed_ms: 0,
    actions: journey.actions.map((action) => ({
      action: action.action,
      passed: null,
      ...(options.deferBrowserReceipts &&
      action.verification_channel === GENUINE_BROWSER_VERIFICATION_CHANNEL
        ? { receipt_evidence: 'deferred-to-terminal-assurance' }
        : {})
    })),
    assertions: journey.assertions.map((assertion) => ({ assertion: assertion.assertion, passed: null }))
  }));
}

function summariseJourneys(records) {
  return {
    journeys_run: records.length,
    passed: records.filter((record) => record.status === 'passed').length,
    failed: records.filter((record) => record.status === 'failed').length,
    errors: records.filter((record) => record.status === 'error').length,
    validation_only: records.filter((record) => record.status === 'validation-only').length
  };
}

async function runBrowserEvaluation(options, suite) {
  const browser = await launchSelectedBrowser(options);
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await browserContext.newPage();
  const questions = suite.questions.slice(0, options.limit);
  const records = [];
  for (const question of questions) {
    const started = Date.now();
    let attempts = 0;
    try {
      let observation;
      while (attempts < 2) {
        attempts += 1;
        try {
          observation = await observeQuestion(page, options, question);
          break;
        } catch (error) {
          if (attempts >= 2) throw error;
          process.stdout.write(`${question.id} retry after browser observation error (${error.message})\n`);
          await page.goto('about:blank').catch(() => undefined);
        }
      }
      const score = scoreQuestion(question, observation);
      records.push({
        id: question.id,
        query: question.query,
        intent: question.intent,
        tags: question.tags || [],
        score,
        elapsed_ms: Date.now() - started,
        attempts,
        evidence: {
          result_count: observation.resultCount,
          expected_min_results: question.expected_min_results ?? 1,
          expected_max_results: question.expected_max_results ?? null,
          detail_title: observation.detailTitle,
          hash: observation.hash,
          warnings: observation.visualWarnings
        }
      });
      process.stdout.write(`${question.id} ${score.total}/100 ${question.query}\n`);
    } catch (error) {
      records.push({
        id: question.id,
        query: question.query,
        intent: question.intent,
        tags: question.tags || [],
        score: { retrieval: 0, display: 0, accessibility: 0, govuk: 0, total: 0, checks: { error: error.message } },
        elapsed_ms: Date.now() - started,
        attempts,
        evidence: { error: error.message }
      });
      process.stdout.write(`${question.id} 0/100 ${question.query} (${error.message})\n`);
    }
  }
  await browserContext.close();
  await browser.close();
  return records;
}

async function runBrowserJourneys(options, journeys) {
  const browser = await launchSelectedBrowser(options);
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    return await runInteractionJourneys(browserContext, options, journeys);
  } finally {
    await browserContext.close();
    await browser.close();
  }
}

function buildValidationOnlyRecords(options, suite) {
  return suite.questions.slice(0, options.limit).map((question) => ({
    id: question.id,
    query: question.query,
    intent: question.intent,
    tags: question.tags || [],
    score: {
      retrieval: null,
      display: null,
      accessibility: null,
      govuk: null,
      total: null,
      scored: false,
      checks: {
        validation_only: true,
        expected_terms: question.expected_terms,
        expected_min_results: question.expected_min_results ?? 1,
        expected_max_results: question.expected_max_results ?? null
      }
    },
    elapsed_ms: 0,
    evidence: {
      validation_only: true,
      expected_terms: question.expected_terms,
      expected_min_results: question.expected_min_results ?? 1,
      expected_max_results: question.expected_max_results ?? null
    }
  }));
}

function summarise(records) {
  const summary = {
    questions_run: records.length,
    questions_scored: 0,
    average_total: 0,
    average_retrieval: 0,
    average_display: 0,
    average_accessibility: 0,
    average_govuk: 0,
    pass_count_80: 0,
    fail_count_below_60: 0
  };
  if (!records.length) {
    summary.average_total = null;
    summary.average_retrieval = null;
    summary.average_display = null;
    summary.average_accessibility = null;
    summary.average_govuk = null;
    return summary;
  }
  for (const record of records) {
    if (!Number.isFinite(record.score.total)) continue;
    summary.questions_scored += 1;
    summary.average_total += record.score.total;
    summary.average_retrieval += record.score.retrieval;
    summary.average_display += record.score.display;
    summary.average_accessibility += record.score.accessibility;
    summary.average_govuk += record.score.govuk;
    if (record.score.total >= 80) summary.pass_count_80 += 1;
    if (record.score.total < 60) summary.fail_count_below_60 += 1;
  }
  if (!summary.questions_scored) {
    summary.average_total = null;
    summary.average_retrieval = null;
    summary.average_display = null;
    summary.average_accessibility = null;
    summary.average_govuk = null;
    return summary;
  }
  for (const key of ['average_total', 'average_retrieval', 'average_display', 'average_accessibility', 'average_govuk']) {
    summary[key] = Number((summary[key] / summary.questions_scored).toFixed(1));
  }
  return summary;
}

function resultTimestamp(value = new Date()) {
  const milliseconds = value.toISOString();
  return `${milliseconds.slice(0, -1)}000Z`;
}

function writeReports(options, suite, visuals, records, metadata, candidate = null, journeyPayload = null) {
  fs.mkdirSync(options.out, { recursive: true });
  const summary = summarise(records);
  const payload = {
    schema: 'okf-explorer-evaluation-results.v1',
    generated_at: resultTimestamp(),
    base_url: options.baseUrl,
    bundle: options.bundle,
    suite: path.relative(repoRoot, options.suite),
    visual_regressions: visuals,
    summary,
    metadata,
    ...(candidate ? { candidate } : {}),
    records,
    ...(journeyPayload ? { interaction_journeys: journeyPayload } : {})
  };
  fs.writeFileSync(path.join(options.out, 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(options.out, 'results.md'), renderMarkdown(payload, suite));
  return { summary, files: [path.join(options.out, 'results.json'), path.join(options.out, 'results.md')] };
}

function renderMarkdown(payload, suite) {
  const lines = [];
  lines.push('# OKF Explorer Evaluation Results');
  lines.push('');
  lines.push(`Generated: ${payload.generated_at}`);
  lines.push(`Base URL: ${payload.base_url}`);
  lines.push(`Bundle: ${payload.bundle}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Questions run: ${payload.summary.questions_run}`);
  lines.push(`- Questions scored: ${payload.summary.questions_scored}`);
  lines.push(`- Average total: ${formatScore(payload.summary.average_total, 100)}`);
  lines.push(`- Retrieval: ${formatScore(payload.summary.average_retrieval, 35)}`);
  lines.push(`- Display: ${formatScore(payload.summary.average_display, 25)}`);
  lines.push(`- Accessibility: ${formatScore(payload.summary.average_accessibility, 20)}`);
  lines.push(`- GOV.UK-aligned publication quality: ${formatScore(payload.summary.average_govuk, 20)}`);
  lines.push(`- Questions at or above 80: ${payload.summary.pass_count_80}`);
  lines.push(`- Questions below 60: ${payload.summary.fail_count_below_60}`);
  lines.push('');
  lines.push('## Rubric');
  lines.push('');
  for (const [name, part] of Object.entries(suite.rubric)) {
    lines.push(`### ${name} (${part.points} points)`);
    for (const check of part.checks) lines.push(`- ${check}`);
    lines.push('');
  }
  lines.push('## Visual Regression Evidence');
  lines.push('');
  for (const item of payload.visual_regressions.items) {
    lines.push(`### ${item.id}: ${item.view}`);
    lines.push('');
    lines.push(item.comment);
    lines.push('');
    lines.push(`Image: ${item.image}`);
    lines.push('');
    for (const check of item.checks) lines.push(`- ${check}`);
    lines.push('');
  }
  if (payload.interaction_journeys) {
    lines.push('## Persona-linked Interaction Journeys');
    lines.push('');
    lines.push(`Manifest: ${payload.interaction_journeys.manifest}`);
    lines.push(`Journeys run: ${payload.interaction_journeys.summary.journeys_run}`);
    lines.push(`Passed: ${payload.interaction_journeys.summary.passed}`);
    lines.push(`Failed: ${payload.interaction_journeys.summary.failed}`);
    lines.push(`Errors: ${payload.interaction_journeys.summary.errors}`);
    lines.push(`Validation only: ${payload.interaction_journeys.summary.validation_only}`);
    lines.push('');
    lines.push('| ID | Status | Personas | Stories | Journey |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const record of payload.interaction_journeys.records) {
      lines.push(`| ${record.id} | ${record.status} | ${escapePipe(record.persona_ids.join(', '))} | ${escapePipe(record.story_ids.join(', '))} | ${escapePipe(record.title)} |`);
    }
    lines.push('');
  }
  lines.push('## Question Scores');
  lines.push('');
  lines.push('| ID | Score | Retrieval | Display | Accessibility | GOV.UK | Query | Evidence |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |');
  for (const record of payload.records) {
    const evidence = record.evidence.validation_only
      ? `validation-only; expected results: ${formatExpectedResults(record.evidence.expected_min_results, record.evidence.expected_max_results)}; expected terms: ${(record.evidence.expected_terms || []).join(', ')}`
      : record.evidence.error || `${record.evidence.result_count} results (expected ${formatExpectedResults(record.evidence.expected_min_results, record.evidence.expected_max_results)}); ${record.evidence.detail_title || 'no detail title'}`;
    lines.push(`| ${record.id} | ${formatScore(record.score.total, 100)} | ${formatScore(record.score.retrieval, 35)} | ${formatScore(record.score.display, 25)} | ${formatScore(record.score.accessibility, 20)} | ${formatScore(record.score.govuk, 20)} | ${escapePipe(record.query)} | ${escapePipe(evidence)} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function formatExpectedResults(minimum, maximum) {
  const min = Number(minimum ?? 1);
  if (maximum === undefined || maximum === null) return `at least ${min}`;
  const max = Number(maximum);
  return min === max ? `exactly ${min}` : `${min} to ${max}`;
}

function formatScore(value, max) {
  return Number.isFinite(value) ? `${value}/${max}` : 'not scored';
}

function escapePipe(value) {
  return String(value).replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const journeys = options.journeys ? readJson(options.journeys) : null;
  if (journeys) {
    validateJourneys(journeys, options.journeys, {
      requireReceiptEvidence: !options.deferBrowserReceipts
    });
  }
  let suite;
  let visuals;
  if (options.journeysOnly && journeys) {
    options.suite = path.resolve(path.dirname(options.journeys), journeys.question_suite);
    suite = readJson(options.suite);
    visuals = { schema: 'okf-explorer-visual-regressions.v1', items: [] };
    if (options.candidateBundle) options.bundle = options.candidateBundle;
    else if (!options.bundleExplicit) options.bundle = journeys.target_bundle;
    if (!options.outExplicit) options.out = path.join(path.dirname(options.journeys), 'results', 'latest');
  } else {
    suite = readJson(options.suite);
    if (!options.bundleExplicit && typeof suite.target_bundle === 'string' && suite.target_bundle.trim()) {
      options.bundle = suite.target_bundle.trim();
    }
    if (!options.outExplicit && options.suite !== resolveRepoPath(DEFAULT_SUITE)) {
      options.out = path.join(path.dirname(options.suite), 'results', 'latest');
    }
    if (!options.visualExplicit && options.suite !== resolveRepoPath(DEFAULT_SUITE)) {
      options.visual = path.join(path.dirname(options.suite), 'visual-regressions.json');
    }
    visuals = readJson(options.visual);
    validateSuite(suite);
    validateVisuals(visuals, options.visual);
    if (options.candidateBundle) options.bundle = options.candidateBundle;
  }
  const candidateReceipt = options.candidateReceipt
    ? loadCandidateReceipt(options.candidateReceipt)
    : null;
  if (!options.noBrowser && journeys) {
    assertPublicationCandidateBinding(options, journeys, candidateReceipt);
  }
  const metadata = {
    browser: options.noBrowser ? 'not-run' : 'playwright',
    browser_engine: options.browserEngine,
    mode: options.noBrowser ? 'validation-only' : 'browser-scored',
    limit: options.limit,
    candidate_bundle_url: candidateBundleUrl(options).toString(),
    evaluator: evaluatorIdentity()
  };
  const candidate = options.noBrowser
    ? null
    : await Promise.all([
        inspectCandidate(options, candidateReceipt),
        inspectExplorerBuild(options)
      ]).then(([identity, explorerBuild]) => ({
        ...identity,
        explorer_build: explorerBuild
      }));
  const records = options.journeysOnly
    ? []
    : options.noBrowser
      ? buildValidationOnlyRecords(options, suite)
      : await runBrowserEvaluation(options, suite);
  const journeyRecords = journeys
    ? options.noBrowser
      ? buildValidationOnlyJourneyRecords(options, journeys)
      : await runBrowserJourneys(options, journeys)
    : null;
  const journeyPayload = journeys ? {
    manifest: path.relative(repoRoot, options.journeys),
    target_bundle: options.bundle,
    summary: summariseJourneys(journeyRecords),
    records: journeyRecords
  } : null;
  const { summary, files } = writeReports(options, suite, visuals, records, metadata, candidate, journeyPayload);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${files.map((file) => path.relative(repoRoot, file)).join(', ')}`);
  if (!options.noBrowser && journeyPayload && (journeyPayload.summary.failed || journeyPayload.summary.errors)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export {
  assertFinalLocation,
  assertPublicationCandidateBinding,
  candidateBundleUrl,
  genuineBrowserReceiptEvidence,
  inspectCandidate,
  inspectExplorerBuild,
  loadCandidateReceipt,
  parseArgs,
  resultTimestamp,
  selectPlaywrightBrowser,
  validateJourneys
};
