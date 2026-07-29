#!/usr/bin/env node

import AxeBuilder from '@axe-core/playwright';
import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { lstat, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  captureAppBuildEvidence,
  inspectBuildSourceTree,
  inspectCanonicalBuildRoot,
  sha256
} from './app_build_manifest.mjs';
import {
  buildFrozenReleaseBinding,
  buildRuntimeAcceptanceProjections,
  publishWriteOnce
} from './runtime_acceptance_contract.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = path.resolve(APP_ROOT, '../..');
const BUILD_ROOT = path.join(APP_ROOT, 'build');
const DEFAULT_BUNDLE_ROOT = path.resolve(REPOSITORY_ROOT, '../okf-uk-legislation/bundle');
const DEFAULT_OUTPUT = path.join(REPOSITORY_ROOT, 'release-assurance/explorer-runtime-acceptance.json');
const DEFAULT_SCREENSHOT_ROOT = path.join(REPOSITORY_ROOT, 'output/playwright');
const OUTPUT_BASENAME = 'explorer-runtime-acceptance.json';
const EVIDENCE_RUNNER_PATH = 'apps/okf-explorer/scripts/run_legislation_runtime_acceptance.mjs';
const EVIDENCE_BUNDLE_ROOT = 'bundle';
const EVIDENCE_FEDERATION_DESCRIPTOR_PATH = 'whole-law/okf-explorer.json';
const EVIDENCE_LEGISLATION_DESCRIPTOR_PATH = 'okf-explorer.json';
const EVIDENCE_BUILD_ROOT = 'explorer-build';
const EVIDENCE_SCREENSHOT_ROOT = 'output/playwright';
const HOST = '127.0.0.1';
const PORT = Number(process.env.OKF_EXPLORER_ACCEPTANCE_PORT || 4178);
const BASE_URL = `http://${HOST}:${PORT}`;
const BUNDLE_PREFIX = '/okf-uk-legislation/';
const FEDERATION_PATH = `${BUNDLE_PREFIX}whole-law/okf-explorer.json`;
const LEGISLATION_PATH = `${BUNDLE_PREFIX}okf-explorer.json`;
const STARTUP_LIMIT = 1024 * 1024;
const COLD_SEARCH_LIMIT_MS = 3000;
const WARM_SEARCH_LIMIT_MS = 1000;
const MEMORY_LIMIT = 256 * 1024 * 1024;
const VIEWPORT = { width: 1440, height: 1000 };
const COLD_QUERY = 'Consumer Credit Act 1974';
const WARM_QUERY = 'The Air Navigation (Amendment) Order 2026';
const EXPECTED_GRAPH_AUTHORITIES = ['derived', 'official'];
const EXPECTED_MODEL_GRAPH_AUTHORITIES = ['derived', 'model-assisted', 'official'];
const RECONCILIATION_STATES = ['agreement', 'live-addition', 'superseded', 'inaccessible'];
const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1]) throw new Error(`${name} requires a value`);
  return path.resolve(args[index + 1]);
}

function valueArgument(name, fallback = null) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1]) throw new Error(`${name} requires a value`);
  return args[index + 1];
}

const bundleRoot = argument('--bundle-root', process.env.OKF_LEGISLATION_BUNDLE || DEFAULT_BUNDLE_ROOT);
const outputPath = argument('--output', process.env.OKF_EXPLORER_ACCEPTANCE_OUTPUT || DEFAULT_OUTPUT);
const screenshotRoot = argument('--screenshot-root', DEFAULT_SCREENSHOT_ROOT);
const candidateCommit = valueArgument('--candidate-commit', process.env.OKF_LEGISLATION_COMMIT || null);
const candidateTree = valueArgument('--candidate-tree', process.env.OKF_LEGISLATION_TREE || null);
const candidateBundleTree = valueArgument(
  '--candidate-bundle-tree-sha256',
  process.env.OKF_LEGISLATION_BUNDLE_TREE_SHA256 || null
);
const explorerCommit = valueArgument('--explorer-commit', process.env.OKF_EXPLORER_COMMIT || null);
const explorerTag = valueArgument('--explorer-tag', process.env.OKF_EXPLORER_TAG || 'v0.5.7');
if (path.basename(outputPath) !== OUTPUT_BASENAME) {
  throw new Error(`--output must use the canonical basename ${OUTPUT_BASENAME}`);
}
const releaseBinding = buildFrozenReleaseBinding({
  candidateCommit,
  candidateTree,
  candidateBundleTree,
  explorerCommit,
  explorerTag
});
const releaseBound = releaseBinding !== null;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function safeEvidencePath(relative) {
  invariant(typeof relative === 'string' && relative.length > 0, 'Evidence path must be a non-empty string');
  invariant(!relative.includes('\\'), `Evidence path must use POSIX separators: ${relative}`);
  const normalized = path.posix.normalize(relative);
  invariant(
    normalized === relative &&
      !path.posix.isAbsolute(normalized) &&
      normalized.split('/').every((part) => part && part !== '.' && part !== '..'),
    `Unsafe evidence path: ${relative}`
  );
  return normalized;
}

async function ensureRealDirectoryTree(root, relativeDirectory = '') {
  await mkdir(root, { recursive: true });
  let current = root;
  const parts = relativeDirectory ? safeEvidencePath(relativeDirectory).split('/') : [];
  for (const part of ['', ...parts]) {
    if (part) {
      current = path.join(current, part);
      await mkdir(current, { recursive: true });
    }
    const info = await lstat(current);
    invariant(info.isDirectory() && !info.isSymbolicLink(), `Evidence directory is not a real directory: ${current}`);
  }
}

async function stageEvidenceMaterial(evidenceRoot, relative, bytes) {
  const safe = safeEvidencePath(relative);
  const absolute = path.resolve(evidenceRoot, ...safe.split('/'));
  invariant(
    absolute.startsWith(`${path.resolve(evidenceRoot)}${path.sep}`),
    `Evidence path escaped its root: ${relative}`
  );
  await ensureRealDirectoryTree(evidenceRoot, path.posix.dirname(safe) === '.' ? '' : path.posix.dirname(safe));
  await publishWriteOnce(absolute, bytes);
  const info = await lstat(absolute);
  invariant(
    info.isFile() && !info.isSymbolicLink() && info.nlink === 1,
    `Staged evidence is not an independent regular file: ${relative}`
  );
  const staged = await readFile(absolute);
  invariant(staged.length === bytes.length, `Staged evidence byte count changed: ${relative}`);
  invariant(sha256(staged) === sha256(bytes), `Staged evidence digest changed: ${relative}`);
  return {
    path: safe,
    bytes: staged.length,
    sha256: sha256(staged)
  };
}

function identifyEvidenceMaterial(relative, bytes) {
  return {
    path: safeEvidencePath(relative),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

async function captureEvidenceMaterial(evidenceRoot, relative, bytes) {
  return releaseBound
    ? stageEvidenceMaterial(evidenceRoot, relative, bytes)
    : identifyEvidenceMaterial(relative, bytes);
}

async function writeReceipt(output, bytes) {
  const evidenceRoot = path.dirname(output);
  await ensureRealDirectoryTree(evidenceRoot);
  if (releaseBound) {
    await publishWriteOnce(output, bytes);
  } else {
    await writeFile(output, bytes, { mode: 0o644 });
  }
}

async function inspectRuntimeBuildRoot() {
  try {
    return await inspectCanonicalBuildRoot(BUILD_ROOT);
  } catch (error) {
    if (releaseBound || error?.code !== 'ENOENT') throw error;
    return inspectBuildSourceTree(BUILD_ROOT);
  }
}

function round(value, places = 3) {
  return Number(value.toFixed(places));
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.gz': 'application/gzip',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jsonld': 'application/ld+json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ttl': 'text/turtle; charset=utf-8',
    '.yaml': 'application/yaml; charset=utf-8',
    '.yamlld': 'application/ld+yaml; charset=utf-8',
    '.yml': 'application/yaml; charset=utf-8'
  }[extension] || 'application/octet-stream';
}

function compressible(filePath) {
  return /\.(?:css|html|js|json|jsonld|map|md|svg|ttl|ya?ml|yamlld)$/i.test(filePath);
}

function safeRelativePath(urlPath, prefix = '/') {
  const decoded = decodeURIComponent(urlPath);
  const relative = decoded.startsWith(prefix) ? decoded.slice(prefix.length) : decoded.replace(/^\/+/, '');
  const normalized = path.posix.normalize(relative);
  if (!normalized || normalized === '.') return '';
  invariant(!normalized.startsWith('../') && !path.posix.isAbsolute(normalized), `Unsafe request path: ${urlPath}`);
  return normalized;
}

function rangeSlice(header, total) {
  if (!header) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : total - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= total) return null;
  return { start, end: Math.min(end, total - 1) };
}

function gate(status, evidence = {}) {
  return { status, ...evidence };
}

async function waitForServer() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // The listener may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Acceptance server did not become ready at ${BASE_URL}`);
}

function serverFor(transfers, currentRun) {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', BASE_URL);
      const fromBundle = requestUrl.pathname.startsWith(BUNDLE_PREFIX);
      let relative = fromBundle
        ? safeRelativePath(requestUrl.pathname, BUNDLE_PREFIX)
        : safeRelativePath(requestUrl.pathname);
      let root = fromBundle ? bundleRoot : BUILD_ROOT;
      if (!relative) relative = 'index.html';
      let absolute = path.resolve(root, relative);
      invariant(absolute === root || absolute.startsWith(`${root}${path.sep}`), `Request escaped its publication root: ${requestUrl.pathname}`);
      let info;
      try {
        info = await stat(absolute);
      } catch {
        info = null;
      }
      if ((!info || !info.isFile()) && !fromBundle && !path.extname(relative)) {
        absolute = path.join(BUILD_ROOT, 'index.html');
        info = await stat(absolute);
      }
      if (!info?.isFile()) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      const original = await readFile(absolute);
      const requestedRange = rangeSlice(request.headers.range, original.length);
      let body = original;
      let status = 200;
      const headers = {
        'accept-ranges': 'bytes',
        'cache-control': 'no-store',
        'content-type': contentType(absolute),
        'cross-origin-resource-policy': 'same-origin',
        'x-content-type-options': 'nosniff'
      };
      if (requestedRange) {
        status = 206;
        body = original.subarray(requestedRange.start, requestedRange.end + 1);
        headers['content-range'] = `bytes ${requestedRange.start}-${requestedRange.end}/${original.length}`;
      } else if (compressible(absolute)) {
        body = gzipSync(original, { level: 9 });
        headers['content-encoding'] = 'gzip';
        headers.vary = 'Accept-Encoding';
      }
      headers['content-length'] = String(body.length);

      transfers.push({
        browser: currentRun.browser,
        phase: currentRun.phase,
        path: requestUrl.pathname,
        source: fromBundle ? 'legislation-bundle' : 'explorer-build',
        status,
        wire_bytes: body.length,
        decoded_bytes: requestedRange ? body.length : original.length,
        content_encoding: headers['content-encoding'] || 'identity',
        range: requestedRange ? `${requestedRange.start}-${requestedRange.end}` : null
      });
      response.writeHead(status, headers);
      if (request.method === 'HEAD') response.end();
      else response.end(body);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
}

function phaseTransfer(transfers, browser, phase) {
  const rows = transfers.filter((row) => row.browser === browser && row.phase === phase);
  return {
    wire_bytes: rows.reduce((total, row) => total + row.wire_bytes, 0),
    decoded_bytes: rows.reduce((total, row) => total + row.decoded_bytes, 0),
    requests: rows.length,
    explorer_wire_bytes: rows.filter((row) => row.source === 'explorer-build').reduce((total, row) => total + row.wire_bytes, 0),
    bundle_wire_bytes: rows.filter((row) => row.source === 'legislation-bundle').reduce((total, row) => total + row.wire_bytes, 0),
    resources: rows.map((row) => ({
      path: row.path,
      source: row.source,
      wire_bytes: row.wire_bytes,
      decoded_bytes: row.decoded_bytes,
      content_encoding: row.content_encoding,
      range: row.range
    }))
  };
}

async function noVisibleError(page, label) {
  const errors = await page.locator('.error:visible').allTextContents();
  invariant(!errors.some((text) => text.trim()), `${label}: ${errors.join(' | ')}`);
}

async function waitForLegislationReady(page) {
  await page.getByPlaceholder('Search titles locally; official full-text results are added automatically').waitFor({ state: 'visible' });
  await page.locator('.facet-inventory').waitFor({ state: 'visible' });
  await page.getByText('Preparing static search index...').waitFor({ state: 'hidden' });
  await page.getByText('Loading descriptor and overview...').waitFor({ state: 'hidden' });
  await noVisibleError(page, 'Legislation load failed');
}

async function sampleChromeMemory(page, session, label) {
  if (!session) return { label, status: 'unavailable', reason: 'CDP Performance metrics are Chromium-only' };
  const result = await session.send('Performance.getMetrics');
  const values = Object.fromEntries(result.metrics.map((metric) => [metric.name, metric.value]));
  const used = Number(values.JSHeapUsedSize);
  const total = Number(values.JSHeapTotalSize);
  invariant(Number.isFinite(used) && Number.isFinite(total), `Chrome did not return JS heap metrics for ${label}`);
  return {
    label,
    status: 'measured',
    used_js_heap_bytes: used,
    total_js_heap_bytes: total
  };
}

async function facetEvidence(page) {
  const inventory = (await page.locator('.facet-inventory').textContent())?.trim() || '';
  const match = /(\d[\d,]*)\s+of\s+(\d[\d,]*)\s+facets shown/.exec(inventory);
  invariant(match, `Facet inventory is not explicit: ${inventory}`);
  const shown = Number(match[1].replaceAll(',', ''));
  const available = Number(match[2].replaceAll(',', ''));
  const sections = page.locator('.facet-section:visible');
  const sectionCount = await sections.count();
  const segmentCount = await page.locator('.facet-distribution-segment:visible').count();
  const colours = await page.locator('.facet-distribution-segment:visible').evaluateAll((elements) =>
    [...new Set(elements.map((element) => getComputedStyle(element, '::before').backgroundColor))]
  );
  const layout = await page.evaluate(() => {
    const workspace = document.querySelector('.workspace');
    const left = document.querySelector('.left-panel');
    const leftContent = document.querySelector('.left-content');
    const stage = document.querySelector('.stage');
    const right = document.querySelector('.right-panel');
    const sections = [...document.querySelectorAll('.facet-section')].filter((element) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (!workspace || !left || !leftContent || !stage || !right) return null;
    const workspaceBox = workspace.getBoundingClientRect();
    const leftBox = left.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const rightBox = right.getBoundingClientRect();
    return {
      workspace_width: workspaceBox.width,
      left_panel_width: leftBox.width,
      stage_width: stageBox.width,
      right_panel_width: rightBox.width,
      stage_share: stageBox.width / workspaceBox.width,
      left_horizontal_overflow_pixels: Math.max(0, leftContent.scrollWidth - leftContent.clientWidth),
      facet_overflow_count: sections.filter((section) => {
        const box = section.getBoundingClientRect();
        return box.left < leftBox.left - 1 || box.right > leftBox.right + 1;
      }).length
    };
  });
  invariant(shown > 0 && available >= shown, `Invalid facet inventory: ${inventory}`);
  invariant(sectionCount === shown, `Facet inventory says ${shown}, but ${sectionCount} visible cards were rendered`);
  invariant(segmentCount > 0, 'No compact facet distribution segments were rendered');
  invariant(colours.length >= 2 && colours.every((colour) => colour !== 'rgba(0, 0, 0, 0)'), 'Facet distributions do not expose multiple visible colours');
  invariant(layout, 'Explorer workspace layout was unavailable');
  invariant(layout.left_horizontal_overflow_pixels <= 1, `Facet panel overflows horizontally by ${layout.left_horizontal_overflow_pixels}px`);
  invariant(layout.facet_overflow_count === 0, `${layout.facet_overflow_count} facet cards overflow the left panel`);
  invariant(layout.stage_share >= 0.5, `Explorer stage uses only ${round(layout.stage_share * 100, 1)}% of workspace width`);
  return {
    inventory,
    shown,
    available,
    rendered_sections: sectionCount,
    coloured_segments: segmentCount,
    distinct_segment_colours: colours,
    layout: {
      ...layout,
      stage_share: round(layout.stage_share, 4)
    }
  };
}

async function reconciliationEvidence(page) {
  const panel = page.getByRole('region', { name: 'Official effects live reconciliation' });
  await panel.waitFor({ state: 'visible' });
  const states = {};
  for (const id of RECONCILIATION_STATES) {
    const card = panel.locator(`[data-reconciliation-state="${id}"]`);
    await card.waitFor({ state: 'visible' });
    const raw = (await card.locator('strong').textContent())?.trim() || '';
    const count = Number(raw.replaceAll(',', ''));
    invariant(Number.isSafeInteger(count) && count >= 0, `Reconciliation state ${id} has an invalid count: ${raw}`);
    states[id] = count;
  }
  invariant(
    Object.keys(states).length === RECONCILIATION_STATES.length,
    `Reconciliation did not expose all four states: ${JSON.stringify(states)}`
  );
  return {
    status: 'passed',
    states,
    explicit_zero_states: Object.entries(states)
      .filter(([, count]) => count === 0)
      .map(([id]) => id)
  };
}

async function axeEvidence(page) {
  const analysis = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const releaseBlocking = analysis.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical'
  );
  return {
    serious_or_critical: releaseBlocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target)
    })),
    all_violation_count: analysis.violations.length,
    passes: analysis.passes.length,
    incomplete: analysis.incomplete.length
  };
}

async function timeSearch(page, query, keyboard = false) {
  const search = page.getByPlaceholder('Search titles locally; official full-text results are added automatically');
  const started = performance.now();
  if (keyboard) {
    await search.fill('');
    await search.focus();
    await page.keyboard.type(query);
  } else {
    await search.fill(query);
  }
  const result = page.locator('.result-list button').filter({
    has: page.getByText(query, { exact: true })
  }).first();
  await result.waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByText('Searching static index...').waitFor({ state: 'hidden' });
  const elapsed = performance.now() - started;
  await noVisibleError(page, `Search failed for ${query}`);
  return { elapsed_ms: round(elapsed), result };
}

async function graphEvidence(page, result) {
  await result.click();
  await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).focus();
  await page.keyboard.press('Enter');
  const graph = page.getByRole('group', { name: 'Large corpus graph' });
  await graph.waitFor({ state: 'visible' });
  await page.waitForFunction((expected) => {
    const edges = [...document.querySelectorAll('.graph-edge')];
    const authorities = new Set(edges.map((edge) => edge.getAttribute('data-relationship-authority')));
    return edges.length >= 3 && expected.every((authority) => authorities.has(authority));
  }, EXPECTED_GRAPH_AUTHORITIES);
  const summary = (await page.locator('.graph-summary').textContent())?.trim() || '';
  const edges = await page.locator('.graph-edge').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return {
      authority: element.getAttribute('data-relationship-authority') || '',
      stroke: style.stroke,
      stroke_dasharray: style.strokeDasharray,
      stroke_width: style.strokeWidth,
      path_length: typeof element.getTotalLength === 'function' ? element.getTotalLength() : 0
    };
  }));
  const authorities = [...new Set(edges.map((edge) => edge.authority))].sort();
  for (const expected of EXPECTED_GRAPH_AUTHORITIES) {
    invariant(authorities.includes(expected), `Graph is missing ${expected} relationship styling: ${JSON.stringify(edges)}`);
  }
  invariant(edges.length >= 3, `Consumer Credit Act graph rendered only ${edges.length} edges`);
  invariant(edges.every((edge) => edge.path_length > 0), 'A graph relationship has zero visible path length');
  invariant(
    new Set(edges.map((edge) => edge.stroke)).size >= 2,
    `Graph relationship classes do not have distinct line colours: ${JSON.stringify(edges)}`
  );
  const keyboardEdge = page.locator('.edge-hit').first();
  await keyboardEdge.focus();
  await page.keyboard.press('Enter');
  await page.locator('.right-panel [data-relationship-authority]').first().waitFor({ state: 'visible' });
  invariant(await keyboardEdge.evaluate((element) => element.getAttribute('tabindex') === '0'), 'Graph edge is not keyboard-focusable');
  return {
    summary,
    edge_count: edges.length,
    authorities,
    styles: edges,
    keyboard_edge_activation: 'passed'
  };
}

async function modelRelationshipEvidence(page, result) {
  await result.click();
  await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();
  const graph = page.getByRole('group', { name: 'Large corpus graph' });
  await graph.waitFor({ state: 'visible' });
  await page.waitForFunction((expected) => {
    const authorities = new Set(
      [...document.querySelectorAll('.graph-edge')]
        .map((edge) => edge.getAttribute('data-relationship-authority'))
    );
    return expected.every((authority) => authorities.has(authority));
  }, EXPECTED_MODEL_GRAPH_AUTHORITIES);
  const styles = await graph.locator('.graph-edge').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        authority: element.getAttribute('data-relationship-authority') || '',
        stroke: style.stroke,
        stroke_dasharray: style.strokeDasharray
      };
    })
  );
  const representative = Object.fromEntries(
    EXPECTED_MODEL_GRAPH_AUTHORITIES.map((authority) => [
      authority,
      styles.find((style) => style.authority === authority)
    ])
  );
  for (const authority of EXPECTED_MODEL_GRAPH_AUTHORITIES) {
    invariant(representative[authority], `Model-enriched graph is missing ${authority}: ${JSON.stringify(styles)}`);
  }
  invariant(
    new Set(EXPECTED_MODEL_GRAPH_AUTHORITIES.map((authority) => representative[authority].stroke)).size ===
      EXPECTED_MODEL_GRAPH_AUTHORITIES.length,
    `Official, derived and model-assisted relationships do not have distinct colours: ${JSON.stringify(representative)}`
  );
  invariant(
    representative['model-assisted'].stroke_dasharray !== 'none',
    'Model-assisted relationship line is not visually distinguished with a dash pattern'
  );

  const filters = page.getByLabel('Relationship authority filters');
  const modelFilter = filters.getByRole('button', { name: 'Model-assisted relationships' });
  await modelFilter.waitFor({ state: 'visible' });
  invariant(await modelFilter.getAttribute('aria-pressed') === 'true', 'Model-assisted authority filter did not start enabled');
  await modelFilter.click();
  await page.waitForFunction(() =>
    document.querySelectorAll('.graph-edge[data-relationship-authority="model-assisted"]').length === 0
  );
  const officialWhileHidden = await graph.locator('.graph-edge[data-relationship-authority="official"]').count();
  const derivedWhileHidden = await graph.locator('.graph-edge[data-relationship-authority="derived"]').count();
  invariant(officialWhileHidden > 0, 'Hiding model-assisted relationships also removed official relationships');
  invariant(derivedWhileHidden > 0, 'Hiding model-assisted relationships also removed derived relationships');
  invariant(
    new URL(page.url()).searchParams.getAll('graph.hideAuthority').includes('model-assisted'),
    'Model-assisted filter state was not serialized into the Explorer URL'
  );
  await modelFilter.click();
  await page.waitForFunction(() =>
    document.querySelectorAll('.graph-edge[data-relationship-authority="model-assisted"]').length > 0
  );
  return {
    status: 'passed',
    authorities: EXPECTED_MODEL_GRAPH_AUTHORITIES,
    styles: representative,
    filter: {
      authority: 'model-assisted',
      hidden_model_edge_count: 0,
      official_edges_preserved: officialWhileHidden,
      derived_edges_preserved: derivedWhileHidden,
      url_round_trip: 'passed',
      restored: true
    }
  };
}

async function runBrowser(browserName, browserType, transfers, currentRun) {
  currentRun.browser = browserName;
  currentRun.phase = 'launch';
  const launchOptions = browserName === 'chrome'
    ? { channel: 'chrome', headless: true, args: ['--enable-precise-memory-info'] }
    : { headless: true };
  const browser = await browserType.launch(launchOptions);
  const browserVersion = browser.version();
  let memorySession = null;
  const memorySamples = [];
  try {
    const federationContext = await browser.newContext({ viewport: VIEWPORT });
    await federationContext.route('https://www.legislation.gov.uk/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/atom+xml',
        body: '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Offline acceptance stub</title></feed>'
      });
    });
    const federationPage = await federationContext.newPage();
    await federationPage.addInitScript(() => localStorage.clear());
    currentRun.phase = 'federation-overview';
    const federationStarted = performance.now();
    await federationPage.goto(`${BASE_URL}/?bundle=${encodeURIComponent(`${BASE_URL}${FEDERATION_PATH}`)}#overview`, { waitUntil: 'domcontentloaded' });
    const federation = federationPage.locator('[data-federation-overview="okf-explorer-federation.v1"]');
    await federation.waitFor({ state: 'visible' });
    await federation.getByText('UK Whole-Law OKF', { exact: true }).waitFor({ state: 'visible' });
    await federation.getByText('36 legal source classes', { exact: true }).waitFor({ state: 'visible' });
    const federationMs = performance.now() - federationStarted;
    await noVisibleError(federationPage, 'Federation overview failed');

    currentRun.phase = 'federation-child';
    const childStarted = performance.now();
    await federation.getByRole('button', { name: 'Open UK Legislation OKF' }).click();
    await waitForLegislationReady(federationPage);
    const childMs = performance.now() - childStarted;
    invariant(new URL(federationPage.url()).hash === '#overview', `Child load retained an invalid federation hash: ${federationPage.url()}`);
    await federationContext.close();

    const context = await browser.newContext({ viewport: VIEWPORT });
    await context.route('https://www.legislation.gov.uk/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/atom+xml',
        body: '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Offline acceptance stub</title></feed>'
      });
    });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.clear());
    if (browserName === 'chrome') {
      memorySession = await context.newCDPSession(page);
      await memorySession.send('Performance.enable');
    }

    currentRun.phase = 'direct-startup';
    await page.goto(`${BASE_URL}/?bundle=${encodeURIComponent(`${BASE_URL}${LEGISLATION_PATH}`)}#overview`, { waitUntil: 'domcontentloaded' });
    await waitForLegislationReady(page);
    await page.waitForLoadState('networkidle');
    await new Promise((resolve) => setTimeout(resolve, 150));
    memorySamples.push(await sampleChromeMemory(page, memorySession, 'startup'));
    const startupTransfer = phaseTransfer(transfers, browserName, 'direct-startup');
    invariant(startupTransfer.wire_bytes < STARTUP_LIMIT, `Startup transfer is ${startupTransfer.wire_bytes} bytes (limit ${STARTUP_LIMIT})`);
    const reconciliation = await reconciliationEvidence(page);
    const facets = await facetEvidence(page);

    currentRun.phase = 'cold-search';
    const cold = await timeSearch(page, COLD_QUERY);
    memorySamples.push(await sampleChromeMemory(page, memorySession, 'cold-search'));
    invariant(cold.elapsed_ms < COLD_SEARCH_LIMIT_MS, `Cold search took ${cold.elapsed_ms}ms`);

    currentRun.phase = 'graph';
    const graph = await graphEvidence(page, cold.result);
    memorySamples.push(await sampleChromeMemory(page, memorySession, 'graph'));
    await noVisibleError(page, 'Graph exploration failed');
    if (browserName === 'chrome') {
      await mkdir(screenshotRoot, { recursive: true });
      await page.screenshot({ path: path.join(screenshotRoot, 'legislation-runtime-graph-chrome.png'), fullPage: false });
    }

    currentRun.phase = 'warm-search';
    await page.getByLabel('Views').getByRole('button', { name: 'Reader', exact: true }).focus();
    await page.keyboard.press('Enter');
    const warm = await timeSearch(page, WARM_QUERY, true);
    memorySamples.push(await sampleChromeMemory(page, memorySession, 'warm-search'));
    invariant(warm.elapsed_ms < WARM_SEARCH_LIMIT_MS, `Warm search took ${warm.elapsed_ms}ms`);
    invariant(
      await page.getByPlaceholder('Search titles locally; official full-text results are added automatically').evaluate((element) => document.activeElement === element),
      'Keyboard search did not retain focus'
    );
    currentRun.phase = 'model-relationship-graph';
    const modelRelationships = await modelRelationshipEvidence(page, warm.result);
    memorySamples.push(await sampleChromeMemory(page, memorySession, 'model-relationship-graph'));
    await noVisibleError(page, 'Model-assisted relationship exploration failed');

    currentRun.phase = 'accessibility';
    const accessibility = await axeEvidence(page);
    invariant(accessibility.serious_or_critical.length === 0, `Axe found release-blocking violations: ${JSON.stringify(accessibility.serious_or_critical)}`);

    const measuredMemory = memorySamples.filter((sample) => sample.status === 'measured');
    const memory = measuredMemory.length
      ? {
          status: 'measured',
          metric: 'Chrome DevTools Protocol Performance.JSHeapUsedSize',
          scope: 'Explorer renderer JavaScript heap during normal startup, search and graph exploration',
          samples: memorySamples,
          maximum_used_js_heap_bytes: Math.max(...measuredMemory.map((sample) => sample.used_js_heap_bytes))
        }
      : {
          status: 'unavailable',
          metric: 'Chrome DevTools Protocol Performance.JSHeapUsedSize',
          reason: 'This browser engine does not expose the nominated CDP memory metric',
          samples: memorySamples
        };
    if (memory.status === 'measured') {
      invariant(memory.maximum_used_js_heap_bytes < MEMORY_LIMIT, `Chrome Explorer JS heap reached ${memory.maximum_used_js_heap_bytes} bytes`);
    }

    if (browserName === 'chrome') {
      await mkdir(screenshotRoot, { recursive: true });
      await page.screenshot({ path: path.join(screenshotRoot, 'legislation-runtime-chrome.png'), fullPage: false });
    }
    await context.close();

    return {
      browser: browserName,
      version: browserVersion,
      status: 'passed',
      federation: {
        overview_elapsed_ms: round(federationMs),
        child_elapsed_ms: round(childMs),
        child_load_completed: true,
        source_classes_rendered: 36,
        child_hash_reset_to_overview: true,
        overview_transfer: phaseTransfer(transfers, browserName, 'federation-overview'),
        child_transfer: phaseTransfer(transfers, browserName, 'federation-child')
      },
      startup_transfer: startupTransfer,
      search: {
        cold: { query: COLD_QUERY, ...cold, result: undefined },
        warm: { query: WARM_QUERY, ...warm, result: undefined }
      },
      facets,
      graph,
      model_relationships: modelRelationships,
      reconciliation,
      keyboard: {
        view_activation: 'passed',
        search_input: 'passed',
        graph_edge_activation: 'passed'
      },
      accessibility,
      memory
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const evidenceRoot = path.dirname(outputPath);
  const [
    initialBuildInspection,
    federationDescriptor,
    legislationDescriptor
  ] = await Promise.all([
    inspectRuntimeBuildRoot(),
    readFile(path.join(bundleRoot, 'whole-law/okf-explorer.json')),
    readFile(path.join(bundleRoot, 'okf-explorer.json'))
  ]);
  const runnerBytes = await readFile(fileURLToPath(import.meta.url));
  const transfers = [];
  const currentRun = { browser: 'preflight', phase: 'preflight' };
  const server = serverFor(transfers, currentRun);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, resolve);
  });
  await waitForServer();

  const runs = [];
  const failures = [];
  try {
    for (const [name, type] of [['chrome', chromium], ['firefox', firefox], ['webkit', webkit]]) {
      try {
        runs.push(await runBrowser(name, type, transfers, currentRun));
      } catch (error) {
        const detail = error instanceof Error ? error.stack || error.message : String(error);
        runs.push({ browser: name, status: 'failed', error: detail });
        failures.push(`${name}: ${detail}`);
      }
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  const buildInspection = await inspectRuntimeBuildRoot();
  invariant(
    initialBuildInspection.manifestBytes.equals(
      buildInspection.manifestBytes
    ),
    'Explorer app-build tree changed during runtime acceptance'
  );

  const completed = runs.filter((run) => run.status === 'passed');
  const named = Object.fromEntries(runs.map((run) => [run.browser, run]));
  const screenshots = [];
  if (named.chrome?.status === 'passed') {
    for (const name of ['legislation-runtime-graph-chrome.png', 'legislation-runtime-chrome.png']) {
      try {
        const screenshotBytes = await readFile(path.join(screenshotRoot, name));
        screenshots.push(
          await captureEvidenceMaterial(
            evidenceRoot,
            `${EVIDENCE_SCREENSHOT_ROOT}/${name}`,
            screenshotBytes
          )
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        failures.push(`chrome screenshot ${name}: ${detail}`);
      }
    }
  }
  const startupValues = completed.map((run) => run.startup_transfer.wire_bytes);
  const coldValues = completed.map((run) => run.search.cold.elapsed_ms);
  const warmValues = completed.map((run) => run.search.warm.elapsed_ms);
  const chromeMemory = named.chrome?.memory;
  const gates = {
    startup_transfer: gate(
      completed.length === 3 && Math.max(...startupValues) < STARTUP_LIMIT ? 'passed' : 'failed',
      { limit_bytes: STARTUP_LIMIT, observed_max_bytes: startupValues.length ? Math.max(...startupValues) : null, browser_values: Object.fromEntries(completed.map((run) => [run.browser, run.startup_transfer.wire_bytes])) }
    ),
    cold_search: gate(
      completed.length === 3 && Math.max(...coldValues) < COLD_SEARCH_LIMIT_MS ? 'passed' : 'failed',
      { limit_ms: COLD_SEARCH_LIMIT_MS, observed_max_ms: coldValues.length ? Math.max(...coldValues) : null, browser_values: Object.fromEntries(completed.map((run) => [run.browser, run.search.cold.elapsed_ms])) }
    ),
    warm_search: gate(
      completed.length === 3 && Math.max(...warmValues) < WARM_SEARCH_LIMIT_MS ? 'passed' : 'failed',
      { limit_ms: WARM_SEARCH_LIMIT_MS, observed_max_ms: warmValues.length ? Math.max(...warmValues) : null, browser_values: Object.fromEntries(completed.map((run) => [run.browser, run.search.warm.elapsed_ms])) }
    ),
    browser_memory: gate(
      chromeMemory?.status === 'measured' && chromeMemory.maximum_used_js_heap_bytes < MEMORY_LIMIT ? 'passed' : 'failed',
      {
        limit_bytes: MEMORY_LIMIT,
        nominated_metric: 'Chrome DevTools Protocol Performance.JSHeapUsedSize',
        observed_max_bytes: chromeMemory?.status === 'measured' ? chromeMemory.maximum_used_js_heap_bytes : null,
        firefox: named.firefox?.memory?.status || 'run-failed',
        webkit: named.webkit?.memory?.status || 'run-failed',
        note: 'Firefox and WebKit are explicitly unavailable for this Chromium-only metric and are not represented as memory passes.'
      }
    ),
    federation_and_child: gate(completed.length === 3 && completed.every((run) => run.federation.child_load_completed) ? 'passed' : 'failed'),
    graph_relationship_rendering: gate(completed.length === 3 && completed.every((run) => run.graph.edge_count >= 3) ? 'passed' : 'failed'),
    model_assisted_styling_and_filtering: gate(
      completed.length === 3 &&
      completed.every((run) =>
        run.model_relationships?.status === 'passed' &&
        run.model_relationships.authorities.includes('official') &&
        run.model_relationships.authorities.includes('derived') &&
        run.model_relationships.authorities.includes('model-assisted') &&
        run.model_relationships.filter.url_round_trip === 'passed'
      )
        ? 'passed'
        : 'failed'
    ),
    live_reconciliation_states: gate(
      completed.length === 3 &&
      completed.every((run) =>
        run.reconciliation?.status === 'passed' &&
        RECONCILIATION_STATES.every((state) => Number.isSafeInteger(run.reconciliation.states[state]))
      )
        ? 'passed'
        : 'failed'
    ),
    facet_count_colour_and_space: gate(completed.length === 3 && completed.every((run) => run.facets.rendered_sections === run.facets.shown) ? 'passed' : 'failed'),
    cross_browser: gate(completed.length === 3 ? 'passed' : 'failed', { required: ['chrome', 'firefox', 'webkit'], completed: completed.map((run) => run.browser) }),
    keyboard: gate(completed.length === 3 && completed.every((run) => Object.values(run.keyboard).every((value) => value === 'passed')) ? 'passed' : 'failed'),
    accessibility: gate(
      completed.length === 3 &&
        completed.every((run) => run.accessibility.serious_or_critical.length === 0)
        ? 'passed'
        : 'failed',
      { standard: 'WCAG 2.2 AA' }
    )
  };
  const runnerMaterial = await captureEvidenceMaterial(
    evidenceRoot,
    EVIDENCE_RUNNER_PATH,
    runnerBytes
  );
  const federationMaterial = await captureEvidenceMaterial(
    evidenceRoot,
    `${EVIDENCE_BUNDLE_ROOT}/${EVIDENCE_FEDERATION_DESCRIPTOR_PATH}`,
    federationDescriptor
  );
  const legislationMaterial = await captureEvidenceMaterial(
    evidenceRoot,
    `${EVIDENCE_BUNDLE_ROOT}/${EVIDENCE_LEGISLATION_DESCRIPTOR_PATH}`,
    legislationDescriptor
  );
  const explorerBuild = await captureAppBuildEvidence(
    buildInspection,
    (relative, bytes) =>
      captureEvidenceMaterial(evidenceRoot, relative, bytes),
    EVIDENCE_BUILD_ROOT
  );
  const inputs = {
    bundle_root: releaseBound
      ? EVIDENCE_BUNDLE_ROOT
      : path.relative(REPOSITORY_ROOT, bundleRoot).split(path.sep).join('/'),
    federation_descriptor: {
      ...federationMaterial,
      path: EVIDENCE_FEDERATION_DESCRIPTOR_PATH
    },
    legislation_descriptor: {
      ...legislationMaterial,
      path: EVIDENCE_LEGISLATION_DESCRIPTOR_PATH
    },
    explorer_build: explorerBuild
  };
  const outputs = {
    receipt: releaseBound
      ? OUTPUT_BASENAME
      : path.relative(REPOSITORY_ROOT, outputPath).split(path.sep).join('/'),
    screenshots
  };
  const projections = buildRuntimeAcceptanceProjections({
    gates,
    failures,
    browsers: runs,
    inputs,
    outputs,
    canonicalEvidence: releaseBound
  });
  const overall = projections.status;
  const receipt = {
    schema: releaseBound
      ? 'okf-explorer-runtime-acceptance.v2'
      : 'okf-explorer-runtime-acceptance.v1',
    measured_at: new Date().toISOString(),
    ...(releaseBinding || {}),
    ...projections,
    scope: 'Production Explorer build with the final local UK Whole-Law and UK Legislation descriptors and every fetched bundle byte served read-only from the local publication tree.',
    runner: runnerMaterial,
    inputs,
    outputs,
    gates,
    browsers: runs,
    failures,
    limitations: [
      'The nominated browser-memory measure is the Explorer renderer JavaScript heap exposed by Chrome CDP; Firefox and WebKit do not expose that metric and are recorded unavailable, not passed.',
      'The source bundle is local and immutable for this run. Live official full-text search is deliberately stubbed so network availability cannot alter search latency or results.',
      'The Playwright CLI wrapper was attempted first but the current @playwright/mcp package did not expose a playwright-cli executable; the repository-pinned Playwright browser runtime executed this receipt.'
    ]
  };
  await writeReceipt(outputPath, Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`));
  process.stdout.write(`${JSON.stringify({ status: overall, output: outputPath, gates, failures }, null, 2)}\n`);
  if (overall !== 'passed') process.exitCode = 1;
}

await main();
