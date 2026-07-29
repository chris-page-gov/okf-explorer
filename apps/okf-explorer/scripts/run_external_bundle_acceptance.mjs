#!/usr/bin/env node

import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { lstat, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  descriptorIdentity,
  identityErrors,
  safeRelativePath,
  validateJourneyManifest
} from './external_bundle_acceptance_contract.mjs';
import { inspectCanonicalBuildRoot } from './app_build_manifest.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = path.resolve(APP_ROOT, '../..');
const BUILD_ROOT = path.join(APP_ROOT, 'build');
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

async function regularFiles(root, relative = '') {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    const info = await lstat(path.join(root, child));
    if (info.isSymbolicLink()) throw new Error(`symbolic links are not accepted in runtime inputs: ${child}`);
    if (info.isDirectory()) files.push(...await regularFiles(root, child));
    else if (info.isFile()) files.push(child);
  }
  return files;
}

async function treeIdentity(root) {
  const files = await regularFiles(root);
  const rows = [];
  for (const relative of files) {
    const bytes = await readFile(path.join(root, relative));
    rows.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const canonical = Buffer.from(`${rows.map((row) => `${row.sha256}  ${row.path}`).join('\n')}\n`);
  return { sha256: sha256(canonical), files: rows.length, bytes: rows.reduce((sum, row) => sum + row.bytes, 0) };
}

function resolveUnder(root, relative) {
  const safe = safeRelativePath(relative);
  const resolved = path.resolve(root, ...safe.split('/'));
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`path escapes root: ${relative}`);
  return resolved;
}

function staticServer(requests) {
  return createServer(async (request, response) => {
    const started = Date.now();
    try {
      const url = new URL(request.url || '/', baseUrl);
      let root = BUILD_ROOT;
      let relative = url.pathname.replace(/^\/+/, '');
      if (url.pathname.startsWith('/bundle/')) {
        root = bundleRoot;
        relative = url.pathname.slice('/bundle/'.length);
      }
      if (!relative) relative = 'index.html';
      let filePath = resolveUnder(root, relative);
      let info;
      try {
        info = await stat(filePath);
      } catch (error) {
        if (root !== BUILD_ROOT || error?.code !== 'ENOENT') throw error;
        filePath = path.join(BUILD_ROOT, '404.html');
        info = await stat(filePath);
      }
      if (!info.isFile()) throw new Error(`not a regular file: ${relative}`);
      const bytes = await readFile(filePath);
      response.writeHead(200, {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
        'content-length': bytes.length,
        'content-type': contentType(filePath)
      });
      response.end(bytes);
      requests.push({ method: request.method, path: url.pathname, status: 200, bytes: bytes.length, elapsed_ms: Date.now() - started });
    } catch (error) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      requests.push({ method: request.method, path: request.url, status: 404, bytes: 0, elapsed_ms: Date.now() - started, error: String(error) });
    }
  });
}

function descriptorUrl(relative) {
  return `${baseUrl}/bundle/${safeRelativePath(relative)}`;
}

async function applyAction(page, action, defaultDescriptor) {
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
  const locator = page.locator(action.selector);
  if (action.type === 'click') await locator.click();
  if (action.type === 'fill') await locator.fill(action.value);
  if (action.type === 'press') await locator.press(action.key);
  if (action.type === 'wait_for') await locator.waitFor({ state: action.state || 'visible' });
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
  const locator = page.locator(assertion.selector);
  if (assertion.type === 'visible' && !(await locator.isVisible())) throw new Error(`${assertion.selector} is not visible`);
  if (assertion.type === 'hidden' && await locator.isVisible()) throw new Error(`${assertion.selector} is visible`);
  if (assertion.type === 'text' && !(await locator.innerText()).includes(assertion.includes)) throw new Error(`${assertion.selector} does not include ${assertion.includes}`);
  if (assertion.type === 'not_text' && (await locator.innerText()).includes(assertion.includes)) throw new Error(`${assertion.selector} includes forbidden text ${assertion.includes}`);
  if (assertion.type === 'count' && await locator.count() !== assertion.equals) throw new Error(`${assertion.selector} count did not equal ${assertion.equals}`);
  if (assertion.type === 'attribute' && await locator.getAttribute(assertion.name) !== assertion.equals) throw new Error(`${assertion.selector} attribute ${assertion.name} did not equal ${assertion.equals}`);
}

async function runJourney(browser, journey, manifest, requests) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleEvents = [];
  const pageErrors = [];
  const browserRequests = [];
  page.on('console', (message) => consoleEvents.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => pageErrors.push({ type: 'pageerror', text: error.message }));
  page.on('request', (request) => browserRequests.push({
    method: request.method(),
    url: request.url(),
    resource_type: request.resourceType()
  }));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === baseUrl) await route.continue();
    else await route.abort('blockedbyclient');
  });
  const started = Date.now();
  let status = 'passed';
  let error = null;
  try {
    for (const action of journey.actions) await applyAction(page, action, manifest.bundle_descriptor);
    for (const assertion of journey.assertions) await applyAssertion(
      page,
      assertion,
      [...requests, ...browserRequests],
      consoleEvents,
      pageErrors
    );
  } catch (caught) {
    status = 'failed';
    error = caught instanceof Error ? caught.stack || caught.message : String(caught);
  }
  const terminal = {
    status,
    url: page.url(),
    title: await page.title().catch(() => ''),
    elapsed_ms: Date.now() - started,
    error
  };
  await context.close();
  return {
    id: journey.id,
    terminal,
    restored_state: { url: terminal.url },
    requests: browserRequests,
    console: consoleEvents,
    page_errors: pageErrors
  };
}

async function main() {
  const [manifestBytes, descriptorBytes, bundleTree, explorerBuild] = await Promise.all([
    readFile(manifestPath),
    readFile(resolveUnder(bundleRoot, JSON.parse(await readFile(manifestPath, 'utf8')).bundle_descriptor)),
    treeIdentity(bundleRoot),
    inspectCanonicalBuildRoot(BUILD_ROOT)
  ]);
  const manifest = validateJourneyManifest(JSON.parse(manifestBytes));
  const descriptor = JSON.parse(descriptorBytes);
  const identity = descriptorIdentity(descriptor);
  const mismatches = identityErrors(identity, manifest.expected_identity);
  if (mismatches.length) throw new Error(mismatches.join('; '));
  const [{ stdout: commit }, { stdout: status }, packageBytes, lockBytes, runnerBytes] = await Promise.all([
    execFileAsync('git', ['-C', REPOSITORY_ROOT, 'rev-parse', 'HEAD']),
    execFileAsync('git', ['-C', REPOSITORY_ROOT, 'status', '--porcelain']),
    readFile(path.join(APP_ROOT, 'package.json')),
    readFile(path.join(APP_ROOT, 'pnpm-lock.yaml')),
    readFile(fileURLToPath(import.meta.url))
  ]);
  const requests = [];
  const server = staticServer(requests);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const browser = await chromium.launch({ headless: true });
  const journeys = [];
  try {
    for (const journey of manifest.journeys) journeys.push(await runJourney(browser, journey, manifest, requests));
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  const failures = journeys.filter((journey) => journey.terminal.status !== 'passed');
  const receipt = {
    schema: 'okf-explorer-external-runtime-acceptance.v1',
    measured_at: new Date().toISOString(),
    status: failures.length ? 'failed' : 'passed',
    consumer: {
      package: '@okf/explorer',
      version: JSON.parse(packageBytes).version,
      source_commit: commit.trim(),
      source_dirty: Boolean(status.trim()),
      dependency_lock_sha256: sha256(lockBytes),
      runner_sha256: sha256(runnerBytes),
      build_manifest_sha256: sha256(explorerBuild.manifestBytes)
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
      sha256: sha256(manifestBytes)
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
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o644, flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ status: receipt.status, output: outputPath, terminal: receipt.terminal }, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
}

await main();
