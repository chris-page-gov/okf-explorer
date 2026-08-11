#!/usr/bin/env node

import { chromium } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants as fileConstants } from 'node:fs';
import { createServer } from 'node:http';
import { link, lstat, mkdir, mkdtemp, open, opendir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  ACCEPTANCE_LIMITS,
  captureAttributeObservation,
  descriptorIdentity,
  identityErrors,
  inspectSafeOutputDestination,
  receiptFailureReference,
  receiptPageState,
  safeRelativePath,
  validateJourneyManifest,
  verifySafeOutputParent,
  waitForLocator,
  waitForRankedResult
} from './external_bundle_acceptance_contract.mjs';
import { verifyAcceptanceInvocationLock } from './acceptance_invocation_lock.mjs';
import { inspectCanonicalBuildRoot } from './app_build_manifest.mjs';
import { deterministicBuildRequirement } from './run_acceptance_invocation.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = path.resolve(APP_ROOT, '../..');
const BUILD_ROOT = path.join(APP_ROOT, 'build');
const LOCK_MODULE_PATH = path.join(APP_ROOT, 'scripts', 'acceptance_invocation_lock.mjs');
const WRAPPER_PATH = path.join(APP_ROOT, 'scripts', 'run_acceptance_invocation.mjs');
const CONTRACT_MODULE_PATH = path.join(APP_ROOT, 'scripts', 'external_bundle_acceptance_contract.mjs');
const BUILD_MANIFEST_MODULE_PATH = path.join(APP_ROOT, 'scripts', 'app_build_manifest.mjs');
const DETERMINISTIC_BUILD_PATH = path.join(APP_ROOT, 'scripts', 'check_deterministic_build.mjs');
const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);

function option(name, fallback = null) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1]) throw new Error(`${name} requires a value`);
  return args[index + 1];
}

function requiredPath(name) {
  const value = option(name);
  if (!value) throw new Error(`${name} is required`);
  return path.resolve(value);
}

const bundleRoot = requiredPath('--bundle-root');
const manifestPath = requiredPath('--journeys');
const outputPath = path.resolve(option('--output', 'external-runtime-acceptance.json'));
const bundleLabel = safeRelativePath(option('--bundle-label', path.basename(bundleRoot)), '--bundle-label');
const journeyLabel = safeRelativePath(option('--journey-label', path.basename(manifestPath)), '--journey-label');
const port = Number(option('--port', '4179'));
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('--port must be an integer from 1024 to 65535');
const baseUrl = `http://127.0.0.1:${port}`;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function beforeDeadline(deadline, label) {
  invariant(Date.now() <= deadline, `${label} exceeded the bounded acceptance run deadline`);
}

function sameFileIdentity(before, after) {
  return (
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.mode === after.mode &&
    before.nlink === after.nlink &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs &&
    before.ctimeMs === after.ctimeMs
  );
}

async function readStableRegularFile(filePath, maximum, label, { independent = false } = {}) {
  let handle;
  try {
    handle = await open(
      filePath,
      fileConstants.O_RDONLY | (fileConstants.O_NOFOLLOW || 0)
    );
    const before = await handle.stat();
    invariant(
      before.isFile() && (!independent || before.nlink === 1),
      `${label} must be ${independent ? 'an independent ' : 'a '}regular file`
    );
    invariant(before.size <= maximum, `${label} exceeds ${maximum} bytes`);
    const bytes = await handle.readFile();
    invariant(bytes.length === before.size, `${label} byte count changed while it was being read`);
    const after = await handle.stat();
    const pathAfter = await lstat(filePath);
    invariant(
      after.isFile() &&
        pathAfter.isFile() &&
        !pathAfter.isSymbolicLink() &&
        (!independent || (after.nlink === 1 && pathAfter.nlink === 1)) &&
        sameFileIdentity(before, after) &&
        after.dev === pathAfter.dev &&
        after.ino === pathAfter.ino,
      `${label} changed while it was being read`
    );
    return bytes;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function readBoundedFile(filePath, maximum, label) {
  return readStableRegularFile(filePath, maximum, label, { independent: true });
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jsonl': 'application/x-ndjson; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm'
  }[extension] || 'application/octet-stream';
}

async function regularFiles(
  root,
  relative = '',
  state = {
    entries: 0,
    files: 0,
    maximumEntries: ACCEPTANCE_LIMITS.input_entries,
    maximumFiles: ACCEPTANCE_LIMITS.input_files,
    deadline: Number.POSITIVE_INFINITY
  },
  depth = 0
) {
  beforeDeadline(state.deadline, 'runtime input inventory');
  invariant(depth <= ACCEPTANCE_LIMITS.input_depth, `runtime input exceeds directory depth ${ACCEPTANCE_LIMITS.input_depth}`);
  if (!relative) {
    const rootInfo = await lstat(root);
    invariant(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), `runtime input root must be a real directory: ${root}`);
  }
  const entries = [];
  const directory = await opendir(path.join(root, relative));
  for await (const entry of directory) {
    beforeDeadline(state.deadline, 'runtime input inventory');
    state.entries += 1;
    invariant(state.entries <= state.maximumEntries, `runtime input exceeds ${state.maximumEntries} total entries`);
    entries.push(entry);
  }
  entries.sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
  const files = [];
  for (const entry of entries) {
    const child = safeRelativePath(
      relative ? `${relative}/${entry.name}` : entry.name,
      'runtime input path'
    );
    const info = await lstat(path.join(root, child));
    if (info.isSymbolicLink()) throw new Error(`symbolic links are not accepted in runtime inputs: ${child}`);
    if (info.isDirectory()) files.push(...await regularFiles(root, child, state, depth + 1));
    else if (info.isFile()) {
      state.files += 1;
      invariant(state.files <= state.maximumFiles, `runtime input exceeds ${state.maximumFiles} files`);
      files.push(child);
    } else throw new Error(`non-regular runtime input entry is not accepted: ${child}`);
  }
  return files;
}

function identityFromRows(rows, maximumBytes = ACCEPTANCE_LIMITS.input_total_bytes) {
  const bytes = rows.reduce((sum, row) => sum + row.bytes, 0);
  invariant(bytes <= maximumBytes, `runtime input exceeds ${maximumBytes} bytes`);
  const canonical = Buffer.from(`${rows.map((row) => `${row.sha256}  ${row.path}`).join('\n')}\n`);
  return { algorithm: 'sha256-sha256sum-lines-v1', sha256: sha256(canonical), files: rows.length, bytes };
}

async function treeRows(root, {
  maximumBytes = ACCEPTANCE_LIMITS.input_total_bytes,
  maximumEntries = ACCEPTANCE_LIMITS.input_entries,
  maximumFiles = ACCEPTANCE_LIMITS.input_files,
  deadline = Number.POSITIVE_INFINITY
} = {}) {
  const files = await regularFiles(root, '', {
    entries: 0,
    files: 0,
    maximumEntries,
    maximumFiles,
    deadline
  });
  const rows = [];
  let totalBytes = 0;
  for (const relative of files) {
    beforeDeadline(deadline, 'runtime input hashing');
    const filePath = path.join(root, relative);
    const remaining = maximumBytes - totalBytes;
    invariant(remaining >= 0, `runtime input exceeds ${maximumBytes} bytes`);
    const bytes = await readStableRegularFile(
      filePath,
      remaining,
      `runtime input ${relative}`
    );
    totalBytes += bytes.length;
    rows.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return rows;
}

async function treeIdentity(root, limits = {}) {
  return identityFromRows(await treeRows(root, limits), limits.maximumBytes);
}

function sameTreeIdentity(left, right) {
  return left.sha256 === right.sha256 && left.files === right.files && left.bytes === right.bytes;
}

async function stageImmutableTree(sourceRoot, snapshotRoot, label, limits = {}) {
  const maximumBytes = limits.maximumBytes ?? ACCEPTANCE_LIMITS.input_total_bytes;
  const maximumEntries = limits.maximumEntries ?? ACCEPTANCE_LIMITS.input_entries;
  const maximumFiles = limits.maximumFiles ?? ACCEPTANCE_LIMITS.input_files;
  const deadline = limits.deadline ?? Number.POSITIVE_INFINITY;
  await mkdir(snapshotRoot, { mode: 0o700 });
  const inventory = {
    entries: 0,
    files: 0,
    maximumEntries,
    maximumFiles,
    deadline
  };
  const files = await regularFiles(sourceRoot, '', inventory);
  const rows = [];
  let totalBytes = 0;
  for (const relative of files) {
    beforeDeadline(deadline, `${label} snapshot staging`);
    const sourcePath = path.join(sourceRoot, relative);
    const remaining = maximumBytes - totalBytes;
    invariant(remaining >= 0, `${label} exceeds ${maximumBytes} bytes`);
    const bytes = await readStableRegularFile(
      sourcePath,
      remaining,
      `${label} ${relative}`
    );
    totalBytes += bytes.length;
    const destinationPath = path.join(snapshotRoot, relative);
    await mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
    await writeFile(destinationPath, bytes, { flag: 'wx', mode: 0o400 });
    const stagedBytes = await readStableRegularFile(
      destinationPath,
      bytes.length,
      `${label} snapshot ${relative}`,
      { independent: true }
    );
    invariant(stagedBytes.equals(bytes), `${label} snapshot bytes differ after staging: ${relative}`);
    rows.push({ path: relative, bytes: stagedBytes.length, sha256: sha256(stagedBytes) });
  }
  const identity = identityFromRows(rows, maximumBytes);
  const [sourceAfter, snapshotAfter] = await Promise.all([
    treeIdentity(sourceRoot, { maximumBytes, maximumEntries, maximumFiles, deadline }),
    treeIdentity(snapshotRoot, { maximumBytes, maximumEntries, maximumFiles, deadline })
  ]);
  invariant(sameTreeIdentity(identity, sourceAfter), `${label} changed while its immutable snapshot was staged`);
  invariant(sameTreeIdentity(identity, snapshotAfter), `${label} immutable snapshot failed identity verification`);
  return {
    identity,
    entries: inventory.entries,
    materials: new Map(rows.map((row) => [row.path, row]))
  };
}

function resolveUnder(root, relative) {
  const safe = safeRelativePath(relative);
  const resolved = path.resolve(root, ...safe.split('/'));
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`path escapes root: ${relative}`);
  return resolved;
}

function repositoryRelative(absolute, label) {
  const relative = path.relative(REPOSITORY_ROOT, path.resolve(absolute)).split(path.sep).join('/');
  invariant(relative && !relative.startsWith('../') && relative !== '..', `${label} must be inside the Explorer checkout`);
  return safeRelativePath(relative, label);
}

const EXECUTABLE_PATHS = Object.freeze({
  runner: fileURLToPath(import.meta.url),
  wrapper: WRAPPER_PATH,
  invocation_lock_module: LOCK_MODULE_PATH,
  contract_module: CONTRACT_MODULE_PATH,
  app_build_manifest_module: BUILD_MANIFEST_MODULE_PATH,
  deterministic_build_script: DETERMINISTIC_BUILD_PATH
});

async function readExecutableMaterials() {
  const materials = {};
  for (const [name, filePath] of Object.entries(EXECUTABLE_PATHS)) {
    const bytes = await readBoundedFile(
      filePath,
      ACCEPTANCE_LIMITS.manifest_bytes,
      `acceptance executable material ${name}`
    );
    materials[name] = {
      path: repositoryRelative(filePath, `${name} path`),
      bytes,
      sha256: sha256(bytes)
    };
  }
  return materials;
}

function sameExecutableMaterials(before, after) {
  for (const name of Object.keys(EXECUTABLE_PATHS)) {
    invariant(
      before[name].path === after[name].path &&
        before[name].bytes.equals(after[name].bytes) &&
        before[name].sha256 === after[name].sha256,
      `acceptance executable material changed during browser acceptance: ${name}`
    );
  }
}

function executableMaterialProjection(materials) {
  return Object.fromEntries(Object.entries(materials).map(([name, material]) => [
    name,
    { path: material.path, bytes: material.bytes.length, sha256: material.sha256 }
  ]));
}

function completedBuildProjection(completedBuild) {
  return {
    schema: completedBuild.schema,
    completed_at: completedBuild.completed_at,
    command_sha256: completedBuild.command.sha256,
    deterministic_build_script: {
      path: repositoryRelative(
        completedBuild.deterministic_build_script.path,
        'completed deterministic-build script path'
      ),
      bytes: completedBuild.deterministic_build_script.bytes,
      sha256: completedBuild.deterministic_build_script.sha256
    },
    canonical_build: {
      root: repositoryRelative(completedBuild.canonical_build.root, 'completed build root'),
      manifest_path: repositoryRelative(
        completedBuild.canonical_build.manifest_path,
        'completed build manifest path'
      ),
      manifest_bytes: completedBuild.canonical_build.manifest_bytes,
      manifest_sha256: completedBuild.canonical_build.manifest_sha256,
      manifest_schema: completedBuild.canonical_build.manifest_schema,
      algorithm: completedBuild.canonical_build.algorithm,
      files: completedBuild.canonical_build.files,
      tree_sha256: completedBuild.canonical_build.tree_sha256
    }
  };
}

function verifyCompletedBuild(completedBuild, inspection) {
  invariant(
    completedBuild.canonical_build.manifest_bytes === inspection.manifestBytes.length &&
      completedBuild.canonical_build.manifest_sha256 === sha256(inspection.manifestBytes) &&
      completedBuild.canonical_build.manifest_schema === inspection.manifest.schema &&
      completedBuild.canonical_build.algorithm === inspection.manifest.algorithm &&
      completedBuild.canonical_build.files === inspection.manifest.file_count &&
      completedBuild.canonical_build.tree_sha256 === inspection.manifest.tree_sha256,
    'completed deterministic-build attestation differs from the immutable Explorer build snapshot'
  );
}

async function writeDurableExclusiveOutput(outputState, bytes) {
  await verifySafeOutputParent(outputState);
  const temporary = path.join(
    outputState.parent,
    `.${path.basename(outputState.outputPath)}.${randomUUID()}.tmp`
  );
  let handle = null;
  let linked = false;
  try {
    handle = await open(temporary, 'wx', 0o644);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await verifySafeOutputParent(outputState);
    await link(temporary, outputState.outputPath);
    linked = true;
    await unlink(temporary);
    const parentHandle = await open(outputState.parent, fileConstants.O_RDONLY);
    try {
      await parentHandle.sync();
    } finally {
      await parentHandle.close();
    }
    const published = await readStableRegularFile(
      outputState.outputPath,
      bytes.length,
      'published acceptance receipt',
      { independent: true }
    );
    invariant(published.equals(bytes), 'published acceptance receipt differs from the final receipt bytes');
    await verifySafeOutputParent(outputState);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    if (!linked) await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function retainTelemetry(telemetry, collection, value, kind, limit) {
  if (telemetry.failure) return false;
  let encoded;
  try {
    encoded = JSON.stringify(value);
  } catch (error) {
    telemetry.failure = new Error(`${kind} telemetry could not be serialised: ${error.message}`);
    return false;
  }
  if (encoded.length > ACCEPTANCE_LIMITS.general_string_chars * 4) {
    telemetry.failure = new Error(`${kind} telemetry event exceeds its bounded representation`);
    return false;
  }
  const encodedBytes = Buffer.byteLength(encoded);
  if (telemetry.bytes + encodedBytes > ACCEPTANCE_LIMITS.telemetry_bytes) {
    telemetry.failure = new Error(`retained telemetry exceeds ${ACCEPTANCE_LIMITS.telemetry_bytes} aggregate bytes`);
    return false;
  }
  telemetry.counts[kind] = (telemetry.counts[kind] || 0) + 1;
  if (telemetry.counts[kind] > limit) {
    telemetry.failure = new Error(`${kind} telemetry exceeds ${limit} retained events`);
    return false;
  }
  telemetry.bytes += encodedBytes;
  collection.push(value);
  return true;
}

function failTelemetry(telemetry, error) {
  if (!telemetry.failure) {
    telemetry.failure = error instanceof Error ? error : new Error(String(error));
  }
  return false;
}

function sanitisedRequestUrl(value) {
  const raw = boundedReceiptText(value, 'browser request URL');
  const url = new URL(raw);
  invariant(!url.username && !url.password, 'browser request URL contains credentials');
  url.search = '';
  url.hash = '';
  return url.toString();
}

function boundedReceiptText(value, label) {
  const text = String(value ?? '');
  invariant(text.length <= ACCEPTANCE_LIMITS.general_string_chars, `${label} exceeds ${ACCEPTANCE_LIMITS.general_string_chars} characters`);
  return text;
}

function textReference(value, label) {
  const text = boundedReceiptText(value, label);
  const bytes = Buffer.from(text, 'utf8');
  return { text_bytes: bytes.length, text_sha256: sha256(bytes) };
}

function staticServer(requests, roots, telemetry) {
  return createServer(async (request, response) => {
    const started = Date.now();
    try {
      if (telemetry.failure) throw telemetry.failure;
      const url = new URL(request.url || '/', baseUrl);
      let root = roots.build;
      let relative = url.pathname.replace(/^\/+/, '');
      if (url.pathname.startsWith('/bundle/')) {
        root = roots.bundle;
        relative = url.pathname.slice('/bundle/'.length);
      }
      if (!relative) relative = 'index.html';
      let expected = root.materials.get(relative);
      if (!expected && root === roots.build) {
        relative = '404.html';
        expected = root.materials.get(relative);
      }
      invariant(expected, `runtime input snapshot has no declared file: ${relative}`);
      invariant(
        expected.bytes <= ACCEPTANCE_LIMITS.served_asset_bytes,
        `served snapshot asset exceeds ${ACCEPTANCE_LIMITS.served_asset_bytes} bytes: ${relative}`
      );
      const filePath = resolveUnder(root.path, relative);
      const bytes = await readStableRegularFile(
        filePath,
        expected.bytes,
        `served snapshot ${relative}`,
        { independent: true }
      );
      invariant(
        bytes.length === expected.bytes && sha256(bytes) === expected.sha256,
        `served snapshot identity changed: ${relative}`
      );
      if (!retainTelemetry(
        telemetry,
        requests,
        {
          method: boundedReceiptText(request.method, 'server request method'),
          path: boundedReceiptText(url.pathname, 'server request path'),
          status: 200,
          bytes: bytes.length,
          elapsed_ms: Date.now() - started
        },
        'request_events',
        ACCEPTANCE_LIMITS.request_events
      )) throw telemetry.failure;
      response.writeHead(200, {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
        'content-length': bytes.length,
        'content-type': contentType(relative)
      });
      response.end(bytes);
    } catch (error) {
      response.writeHead(telemetry.failure ? 503 : 404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      if (!telemetry.failure) {
        retainTelemetry(
          telemetry,
          requests,
          {
            method: request.method,
            path: boundedReceiptText(
              new URL(request.url || '/', baseUrl).pathname,
              'failed request path'
            ),
            status: 404,
            bytes: 0,
            elapsed_ms: Date.now() - started,
            error: receiptFailureReference(error)
          },
          'request_events',
          ACCEPTANCE_LIMITS.request_events
        );
      }
    }
  });
}

function descriptorUrl(relative) {
  return `${baseUrl}/bundle/${safeRelativePath(relative)}`;
}

async function applyAction(page, action, defaultDescriptor, observations, telemetry) {
  if (action.type === 'goto') {
    const url = new URL(baseUrl);
    url.searchParams.set('bundle', descriptorUrl(action.descriptor || defaultDescriptor));
    for (const [name, raw] of Object.entries(action.params || {})) {
      for (const value of Array.isArray(raw) ? raw : [raw]) url.searchParams.append(name, value);
    }
    url.hash = action.hash || '';
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    return;
  }
  if (action.type === 'wait_for_ranked_result') {
    await waitForRankedResult(page, action.canonical_url);
    return;
  }
  const locator = page.locator(action.selector);
  if (action.type === 'capture_attributes') {
    const observation = await captureAttributeObservation(locator, action);
    telemetry.counts.captured_value_chars =
      (telemetry.counts.captured_value_chars || 0) +
      observation.values.reduce((total, value) => total + value.length, 0);
    invariant(
      telemetry.counts.captured_value_chars <= ACCEPTANCE_LIMITS.captured_values_total_chars,
      `runtime observations exceed ${ACCEPTANCE_LIMITS.captured_values_total_chars} captured characters`
    );
    observations.push(observation);
    return;
  }
  if (action.type === 'click') await locator.click();
  if (action.type === 'fill') await locator.fill(action.value);
  if (action.type === 'press') await locator.press(action.key);
  if (action.type === 'wait_for') {
    await waitForLocator(locator, action.state || 'visible');
  }
}

async function applyAssertion(page, assertion, requests, consoleEvents, pageErrors) {
  const requestTarget = (request) => request.path || request.url || '';
  if (assertion.type === 'console_clean') {
    const failures = consoleEvents.filter((event) => event.type === 'error').concat(pageErrors);
    if (failures.length) throw new Error(`console/page errors: ${JSON.stringify(failures)}`);
    return;
  }
  if (assertion.type === 'requested') {
    if (!requests.some((request) => requestTarget(request).includes(assertion.includes))) throw new Error(`no request included ${assertion.includes}`);
    return;
  }
  if (assertion.type === 'not_requested') {
    if (requests.some((request) => requestTarget(request).includes(assertion.includes))) throw new Error(`a forbidden request included ${assertion.includes}`);
    return;
  }
  if (assertion.type === 'url_hash') {
    if (new URL(page.url()).hash !== assertion.equals) throw new Error(`URL hash did not equal ${assertion.equals}`);
    return;
  }
  if (assertion.type === 'url_param') {
    const actual = new URL(page.url()).searchParams.get(assertion.name);
    if (actual !== assertion.equals) throw new Error(`URL parameter ${assertion.name} was ${actual}, expected ${assertion.equals}`);
    return;
  }
  if (assertion.type === 'ranked_result') {
    await waitForRankedResult(page, assertion.canonical_url);
    return;
  }
  const locator = page.locator(assertion.selector);
  if (assertion.type === 'visible' && !(await locator.isVisible())) throw new Error(`${assertion.selector} is not visible`);
  if (assertion.type === 'hidden' && await locator.isVisible()) throw new Error(`${assertion.selector} is visible`);
  if (assertion.type === 'text' && !(await locator.innerText()).includes(assertion.includes)) throw new Error(`${assertion.selector} does not include ${assertion.includes}`);
  if (assertion.type === 'not_text' && (await locator.innerText()).includes(assertion.includes)) throw new Error(`${assertion.selector} includes forbidden text ${assertion.includes}`);
  if (assertion.type === 'count' && await locator.count() !== assertion.equals) throw new Error(`${assertion.selector} count did not equal ${assertion.equals}`);
  if (assertion.type === 'attribute' && await locator.getAttribute(assertion.name) !== assertion.equals) throw new Error(`${assertion.selector} attribute ${assertion.name} did not equal ${assertion.equals}`);
}

const DEFERRED_EVENT_ASSERTIONS = new Set([
  'console_clean',
  'not_requested',
  'requested'
]);

async function runBoundedJourney(browser, journey, manifest, requests, telemetry, runDeadline) {
  beforeDeadline(runDeadline, `journey ${journey.id}`);
  const remainingRunMs = runDeadline - Date.now();
  const journeyTimeoutMs = Math.min(ACCEPTANCE_LIMITS.journey_timeout_ms, remainingRunMs);
  invariant(journeyTimeoutMs > 0, `journey ${journey.id} has no remaining run time`);
  const journeyDeadline = Date.now() + journeyTimeoutMs;
  const contextPromise = browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let context;
  try {
    context = await withinDeadline(
      contextPromise,
      journeyDeadline,
      `journey ${journey.id} context creation`
    );
  } catch (error) {
    void contextPromise.then((lateContext) => lateContext.close()).catch(() => undefined);
    throw error;
  }
  const page = await withinDeadline(
    context.newPage(),
    journeyDeadline,
    `journey ${journey.id} page creation`
  );
  page.setDefaultTimeout(journeyTimeoutMs);
  page.setDefaultNavigationTimeout(journeyTimeoutMs);
  const serverRequestStart = requests.length;
  const consoleEvents = [];
  const pageErrors = [];
  const browserRequests = [];
  const observations = [];
  page.on('console', (message) => {
    try {
      retainTelemetry(
        telemetry,
        consoleEvents,
        {
          type: boundedReceiptText(message.type(), 'console event type'),
          ...textReference(message.text(), 'console event text')
        },
        'console_events',
        ACCEPTANCE_LIMITS.console_events
      );
    } catch (error) {
      failTelemetry(telemetry, error);
    }
  });
  page.on('pageerror', (error) => {
    try {
      retainTelemetry(
        telemetry,
        pageErrors,
        { type: 'pageerror', ...textReference(error.message, 'page error text') },
        'page_errors',
        ACCEPTANCE_LIMITS.page_errors
      );
    } catch (caught) {
      failTelemetry(telemetry, caught);
    }
  });
  page.on('request', (request) => {
    try {
      retainTelemetry(
        telemetry,
        browserRequests,
        {
          method: request.method(),
          url: sanitisedRequestUrl(request.url()),
          resource_type: request.resourceType()
        },
        'request_events',
        ACCEPTANCE_LIMITS.request_events
      );
    } catch (error) {
      failTelemetry(telemetry, error);
    }
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === baseUrl) await route.continue();
    else await route.abort('blockedbyclient');
  });
  const started = Date.now();
  let status = 'passed';
  let error = null;
  let finalPageState = receiptPageState(baseUrl);
  let finalTitle = '';
  let timeoutHandle = null;
  const fail = (caught) => {
    status = 'failed';
    error = receiptFailureReference(caught);
  };
  try {
    await Promise.race([
      (async () => {
        for (const action of journey.actions) {
          beforeDeadline(runDeadline, `journey ${journey.id}`);
          if (telemetry.failure) throw telemetry.failure;
          await applyAction(page, action, manifest.bundle_descriptor, observations, telemetry);
        }
        for (const assertion of journey.assertions) {
          if (DEFERRED_EVENT_ASSERTIONS.has(assertion.type)) continue;
          await applyAssertion(page, assertion, [], consoleEvents, pageErrors);
        }
        if (telemetry.failure) throw telemetry.failure;
      })(),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`journey ${journey.id} exceeded ${journeyTimeoutMs} ms`));
        }, journeyTimeoutMs);
      })
    ]);
  } catch (caught) {
    fail(caught);
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    finalPageState = receiptPageState(page.url() || baseUrl);
    finalTitle = boundedReceiptText(
      await page.title().catch(() => ''),
      `journey ${journey.id} title`
    );
    try {
      await withinDeadline(
        context.close(),
        Math.min(runDeadline, Date.now() + 5000),
        `journey ${journey.id} context shutdown`
      );
    } catch (caught) {
      if (status === 'passed') fail(caught);
    }
  }

  const serverRequests = requests.slice(serverRequestStart);
  const journeyRequests = [...serverRequests, ...browserRequests];
  if (status === 'passed') {
    try {
      if (telemetry.failure) throw telemetry.failure;
      for (const assertion of journey.assertions) {
        if (!DEFERRED_EVENT_ASSERTIONS.has(assertion.type)) continue;
        await applyAssertion(null, assertion, journeyRequests, consoleEvents, pageErrors);
      }
      if (telemetry.failure) throw telemetry.failure;
    } catch (caught) {
      fail(caught);
    }
  }
  const terminal = {
    status,
    ...finalPageState,
    title: finalTitle,
    elapsed_ms: Date.now() - started,
    error
  };
  return {
    id: journey.id,
    terminal,
    restored_state: finalPageState,
    observations,
    requests: browserRequests,
    server_requests: serverRequests,
    console: consoleEvents,
    page_errors: pageErrors
  };
}

async function withinDeadline(operation, deadline, label) {
  beforeDeadline(deadline, label);
  let timeoutHandle;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error(`${label} exceeded the bounded acceptance run deadline`)),
          Math.max(1, deadline - Date.now())
        );
      })
    ]);
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}

async function closeServer(server, deadline) {
  if (!server?.listening) return;
  await withinDeadline(
    new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    deadline,
    'acceptance server shutdown'
  );
}

async function main() {
  const runDeadline = Date.now() + ACCEPTANCE_LIMITS.run_timeout_ms;
  const buildRequirement = deterministicBuildRequirement(APP_ROOT);
  const lockAttestation = await withinDeadline(
    verifyAcceptanceInvocationLock({
      checkoutRoot: REPOSITORY_ROOT,
      expectedPurpose: 'bundle OKF Explorer acceptance',
      expectedCompletedBuild: buildRequirement,
      deadline: runDeadline
    }),
    runDeadline,
    'acceptance lock and completed-build verification'
  );
  invariant(
    lockAttestation.ownerPid === process.ppid,
    'Explorer acceptance runner is not a direct child of the attested checkout-scoped wrapper'
  );
  const outputState = await inspectSafeOutputDestination(
    outputPath,
    [bundleRoot, BUILD_ROOT]
  );

  const manifestBytes = await readBoundedFile(
    manifestPath,
    ACCEPTANCE_LIMITS.manifest_bytes,
    'journey manifest'
  );
  const manifest = validateJourneyManifest(JSON.parse(manifestBytes.toString('utf8')));
  const executableBefore = await readExecutableMaterials();
  invariant(
    executableBefore.deterministic_build_script.bytes.length ===
      lockAttestation.completedBuild.deterministic_build_script.bytes &&
      executableBefore.deterministic_build_script.sha256 ===
        lockAttestation.completedBuild.deterministic_build_script.sha256,
    'completed deterministic-build attestation differs from the acceptance executable material'
  );
  const snapshotParent = await mkdtemp(path.join(tmpdir(), 'okf-explorer-acceptance-'));
  try {
    const snapshotBundleRoot = path.join(snapshotParent, 'bundle');
    const snapshotBuildRoot = path.join(snapshotParent, 'explorer-build');
    const bundleSnapshot = await stageImmutableTree(
      bundleRoot,
      snapshotBundleRoot,
      'bundle input',
      { deadline: runDeadline }
    );
    const buildSnapshot = await stageImmutableTree(
      BUILD_ROOT,
      snapshotBuildRoot,
      'Explorer build input',
      {
        deadline: runDeadline,
        maximumBytes: ACCEPTANCE_LIMITS.input_total_bytes - bundleSnapshot.identity.bytes,
        maximumEntries: ACCEPTANCE_LIMITS.input_entries - bundleSnapshot.entries,
        maximumFiles: ACCEPTANCE_LIMITS.input_files - bundleSnapshot.identity.files
      }
    );
    const bundleTree = bundleSnapshot.identity;
    const buildTree = buildSnapshot.identity;
    const descriptorBytes = await readBoundedFile(
      resolveUnder(snapshotBundleRoot, manifest.bundle_descriptor),
      16 * 1024 * 1024,
      'bundle descriptor'
    );
    const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
    const identity = descriptorIdentity(descriptor);
    const mismatches = identityErrors(identity, manifest.expected_identity);
    if (mismatches.length) throw new Error(mismatches.join('; '));

    const [
      explorerBuild,
      { stdout: commit },
      { stdout: status },
      packageBytes,
      dependencyLockBytes
    ] = await Promise.all([
      inspectCanonicalBuildRoot(snapshotBuildRoot),
      execFileAsync('git', ['-C', REPOSITORY_ROOT, 'rev-parse', 'HEAD']),
      execFileAsync('git', ['-C', REPOSITORY_ROOT, 'status', '--porcelain']),
      readBoundedFile(path.join(APP_ROOT, 'package.json'), ACCEPTANCE_LIMITS.manifest_bytes, 'Explorer package manifest'),
      readBoundedFile(path.join(APP_ROOT, 'pnpm-lock.yaml'), 16 * 1024 * 1024, 'Explorer dependency lock')
    ]);
    verifyCompletedBuild(lockAttestation.completedBuild, explorerBuild);
    const requests = [];
    const telemetry = { counts: {}, bytes: 0, failure: null };
    const server = staticServer(
      requests,
      {
        bundle: { path: snapshotBundleRoot, materials: bundleSnapshot.materials },
        build: { path: snapshotBuildRoot, materials: buildSnapshot.materials }
      },
      telemetry
    );
    let browser = null;
    let browserVersion = null;
    const journeys = [];
    try {
      await withinDeadline(
        new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(port, '127.0.0.1', resolve);
        }),
        runDeadline,
        'acceptance server start'
      );
      browser = await withinDeadline(
        chromium.launch({ headless: true }),
        runDeadline,
        'Chromium launch'
      );
      browserVersion = boundedReceiptText(browser.version(), 'Chromium version');
      for (const journey of manifest.journeys) {
        journeys.push(await runBoundedJourney(
          browser,
          journey,
          manifest,
          requests,
          telemetry,
          runDeadline
        ));
      }
    } finally {
      let cleanupError = null;
      if (browser) {
        try {
          await withinDeadline(browser.close(), Date.now() + 5000, 'Chromium shutdown');
        } catch (error) {
          cleanupError = error;
        }
      }
      try {
        await closeServer(server, Date.now() + 5000);
      } catch (error) {
        cleanupError ||= error;
      }
      if (cleanupError) throw cleanupError;
    }
    if (telemetry.failure) throw telemetry.failure;
    beforeDeadline(runDeadline, 'browser acceptance');

    const bundleLimits = {
      deadline: runDeadline,
      maximumBytes: bundleTree.bytes,
      maximumEntries: bundleSnapshot.entries,
      maximumFiles: bundleTree.files
    };
    const buildLimits = {
      deadline: runDeadline,
      maximumBytes: buildTree.bytes,
      maximumEntries: buildSnapshot.entries,
      maximumFiles: buildTree.files
    };
    const bundleSourceAfter = await treeIdentity(bundleRoot, bundleLimits);
    const bundleSnapshotAfter = await treeIdentity(snapshotBundleRoot, bundleLimits);
    const buildSourceAfter = await treeIdentity(BUILD_ROOT, buildLimits);
    const buildSnapshotAfter = await treeIdentity(snapshotBuildRoot, buildLimits);
    const manifestAfter = await readBoundedFile(
      manifestPath,
      ACCEPTANCE_LIMITS.manifest_bytes,
      'journey manifest'
    );
    const packageAfter = await readBoundedFile(
      path.join(APP_ROOT, 'package.json'),
      ACCEPTANCE_LIMITS.manifest_bytes,
      'Explorer package manifest'
    );
    const dependencyLockAfter = await readBoundedFile(
      path.join(APP_ROOT, 'pnpm-lock.yaml'),
      16 * 1024 * 1024,
      'Explorer dependency lock'
    );
    const executableAfter = await readExecutableMaterials();
    const explorerBuildAfter = await inspectCanonicalBuildRoot(snapshotBuildRoot);
    const finalLockAttestation = await withinDeadline(
      verifyAcceptanceInvocationLock({
        checkoutRoot: REPOSITORY_ROOT,
        expectedPurpose: 'bundle OKF Explorer acceptance',
        expectedCompletedBuild: buildRequirement,
        deadline: runDeadline
      }),
      runDeadline,
      'final acceptance lock and completed-build verification'
    );
    invariant(sameTreeIdentity(bundleTree, bundleSourceAfter), 'bundle input changed during browser acceptance');
    invariant(sameTreeIdentity(bundleTree, bundleSnapshotAfter), 'bundle snapshot changed during browser acceptance');
    invariant(sameTreeIdentity(buildTree, buildSourceAfter), 'Explorer build input changed during browser acceptance');
    invariant(sameTreeIdentity(buildTree, buildSnapshotAfter), 'Explorer build snapshot changed during browser acceptance');
    invariant(sha256(manifestBytes) === sha256(manifestAfter), 'journey manifest changed during browser acceptance');
    invariant(packageBytes.equals(packageAfter), 'Explorer package manifest changed during browser acceptance');
    invariant(dependencyLockBytes.equals(dependencyLockAfter), 'Explorer dependency lock changed during browser acceptance');
    sameExecutableMaterials(executableBefore, executableAfter);
    verifyCompletedBuild(lockAttestation.completedBuild, explorerBuildAfter);
    invariant(
      JSON.stringify(completedBuildProjection(lockAttestation.completedBuild)) ===
        JSON.stringify(completedBuildProjection(finalLockAttestation.completedBuild)),
      'completed deterministic-build attestation changed during browser acceptance'
    );

    const failures = journeys.filter((journey) => journey.terminal.status !== 'passed');
    const receipt = {
      schema: 'okf-explorer-external-runtime-acceptance.v1',
      measured_at: new Date().toISOString(),
      status: failures.length ? 'failed' : 'passed',
      consumer: {
        package: '@okf/explorer',
        version: JSON.parse(packageBytes.toString('utf8')).version,
        source_commit: commit.trim(),
        source_dirty: Boolean(status.trim()),
        dependency_lock_sha256: sha256(dependencyLockBytes),
        runner_sha256: executableBefore.runner.sha256,
        wrapper_sha256: executableBefore.wrapper.sha256,
        invocation_lock_module_sha256: executableBefore.invocation_lock_module.sha256,
        executable_materials: executableMaterialProjection(executableBefore),
        build_manifest_sha256: sha256(explorerBuild.manifestBytes),
        runtime: {
          node: process.version,
          platform: process.platform,
          architecture: process.arch,
          chromium: browserVersion
        },
        invocation: {
          mode: 'checkout-scoped-single-writer-wrapper',
          purpose: lockAttestation.purpose,
          owner_pid: lockAttestation.ownerPid,
          acquired_at: lockAttestation.acquiredAt,
          parent_pid_verified: true,
          deterministic_build_precedes_runner: true,
          completed_build: completedBuildProjection(lockAttestation.completedBuild)
        }
      },
      immutable_inputs: {
        private_snapshot_served: true,
        source_trees_matched_snapshots_after_run: true,
        private_snapshots_matched_initial_identity_after_run: true,
        manifest_matched_initial_bytes_after_run: true,
        executable_materials_matched_after_run: true,
        explorer_build_tree: buildTree
      },
      bundle: {
        root_label: bundleLabel,
        descriptor: manifest.bundle_descriptor,
        identity,
        expected_identity: manifest.expected_identity,
        tree: bundleTree
      },
      journey_manifest: {
        path_label: journeyLabel,
        sha256: sha256(manifestBytes),
        bytes: manifestBytes.length
      },
      requests,
      journeys,
      terminal: {
        outcome: failures.length ? 'failed' : 'passed',
        journeys_total: journeys.length,
        journeys_passed: journeys.length - failures.length,
        journeys_failed: failures.length
      }
    };
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
    invariant(
      receiptBytes.length <= ACCEPTANCE_LIMITS.receipt_bytes,
      `acceptance receipt exceeds ${ACCEPTANCE_LIMITS.receipt_bytes} bytes`
    );
    beforeDeadline(runDeadline, 'acceptance receipt publication');
    await writeDurableExclusiveOutput(outputState, receiptBytes);
    process.stdout.write(`${JSON.stringify({ status: receipt.status, output: outputPath, terminal: receipt.terminal }, null, 2)}\n`);
    if (failures.length) process.exitCode = 1;
  } finally {
    await rm(snapshotParent, { recursive: true, force: true });
  }
}

const hardRunWatchdog = setTimeout(() => {
  process.stderr.write(
    `Explorer acceptance exceeded its hard ${ACCEPTANCE_LIMITS.run_timeout_ms} ms process deadline; ` +
    'the checkout wrapper must now terminate and verify the complete acceptance process group.\n'
  );
  process.exit(124);
}, ACCEPTANCE_LIMITS.run_timeout_ms);
hardRunWatchdog.unref();

let mainCompleted = false;
try {
  await main();
  mainCompleted = true;
} finally {
  if (mainCompleted) clearTimeout(hardRunWatchdog);
}
