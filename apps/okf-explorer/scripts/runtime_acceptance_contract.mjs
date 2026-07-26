import { link, lstat, readFile, unlink, writeFile } from 'node:fs/promises';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const FEDERATION_DESCRIPTOR_PATH = 'whole-law/okf-explorer.json';
const LEGISLATION_DESCRIPTOR_PATH = 'okf-explorer.json';
const EXPLORER_BUILD_INDEX_PATH = 'explorer-build/index.html';
const EXPLORER_RELEASE_TAG = 'v0.5.2';
let temporarySequence = 0;

async function verifyExistingWriteOnceFile(destination, expected) {
  const before = await lstat(destination);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    throw new Error(`Existing write-once destination is not an independent regular file: ${destination}`);
  }
  const actual = await readFile(destination);
  const after = await lstat(destination);
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    before.ctimeMs !== after.ctimeMs ||
    after.nlink !== 1
  ) {
    throw new Error(`Existing write-once destination changed while it was verified: ${destination}`);
  }
  if (!actual.equals(expected)) {
    throw new Error(`Existing write-once destination has different bytes: ${destination}`);
  }
}

/**
 * Publish bytes without replacing an existing path. A byte-identical,
 * independent regular file is accepted to make interrupted attempts safely
 * resumable; divergent, linked or symbolic destinations fail closed.
 */
export async function publishWriteOnce(destination, bytes) {
  const expected = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}-${temporarySequence++}`;
  await writeFile(temporary, expected, { flag: 'wx', mode: 0o644 });
  try {
    try {
      await link(temporary, destination);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      await verifyExistingWriteOnceFile(destination, expected);
      return 'existing-identical';
    }
    await unlink(temporary);
    const published = await lstat(destination);
    if (!published.isFile() || published.isSymbolicLink() || published.nlink !== 1) {
      throw new Error(`Published write-once destination is not an independent regular file: ${destination}`);
    }
    return 'created';
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

export const RUNTIME_GATE_IDS = Object.freeze([
  'startup_transfer',
  'cold_search',
  'warm_search',
  'browser_memory',
  'federation_and_child',
  'graph_relationship_rendering',
  'model_assisted_styling_and_filtering',
  'live_reconciliation_states',
  'facet_count_colour_and_space',
  'cross_browser',
  'keyboard',
  'accessibility'
]);

export const PERFORMANCE_GATE_IDS = Object.freeze([
  'startup_transfer',
  'cold_search',
  'warm_search',
  'browser_memory'
]);

export function buildFrozenReleaseBinding({
  candidateCommit = null,
  candidateTree = null,
  candidateBundleTree = null,
  explorerCommit = null,
  explorerTag = EXPLORER_RELEASE_TAG
} = {}) {
  const values = [
    candidateCommit,
    candidateTree,
    candidateBundleTree,
    explorerCommit
  ];
  if (values.every((value) => !value)) return null;
  if (!values.every(Boolean)) {
    throw new Error(
      'Frozen-candidate acceptance requires candidate commit, tree, bundle-tree SHA-256 and Explorer commit together'
    );
  }
  if (!GIT_SHA_PATTERN.test(candidateCommit)) {
    throw new Error('Candidate commit is not a full Git SHA');
  }
  if (!GIT_SHA_PATTERN.test(candidateTree)) {
    throw new Error('Candidate tree is not a full Git SHA');
  }
  if (!SHA256_PATTERN.test(candidateBundleTree)) {
    throw new Error('Candidate bundle-tree digest is not SHA-256');
  }
  if (!GIT_SHA_PATTERN.test(explorerCommit)) {
    throw new Error('Explorer commit is not a full Git SHA');
  }
  if (explorerTag !== EXPLORER_RELEASE_TAG) {
    throw new Error(`Frozen-candidate acceptance requires Explorer ${EXPLORER_RELEASE_TAG}`);
  }
  return {
    candidate: {
      repository: 'https://github.com/chris-page-gov/okf-uk-legislation',
      commit: candidateCommit,
      tree: candidateTree,
      bundle_tree_sha256: candidateBundleTree
    },
    explorer: {
      repository: 'https://github.com/chris-page-gov/okf-explorer',
      tag: explorerTag,
      commit: explorerCommit
    }
  };
}

const EXPECTED_SCREENSHOTS = Object.freeze([
  'output/playwright/legislation-runtime-graph-chrome.png',
  'output/playwright/legislation-runtime-chrome.png'
]);

function statusOf(gates, id) {
  return gates[id]?.status === 'passed' ? 'passed' : 'failed';
}

function gateSummary(gates, ids) {
  const checks = ids.map((id) => ({ id, status: statusOf(gates, id) }));
  const checksPassed = checks.filter((check) => check.status === 'passed').length;
  return {
    checks,
    checks_total: checks.length,
    checks_passed: checksPassed,
    checks_failed: checks.length - checksPassed
  };
}

function integrityCheck(id, condition, evidence = {}) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    ...evidence
  };
}

function isStrictMaterial(value, expectedPath = null) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === 'bytes,path,sha256' &&
      (expectedPath === null || value.path === expectedPath) &&
      typeof value.path === 'string' &&
      value.path.length > 0 &&
      !pathIsUnsafe(value.path) &&
      Number.isInteger(value.bytes) &&
      value.bytes > 0 &&
      SHA256_PATTERN.test(value.sha256 || '')
  );
}

function pathIsUnsafe(value) {
  return (
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  );
}

/**
 * Build stable, release-facing acceptance projections without discarding the
 * detailed `gates` and `browsers` evidence retained by the runner.
 *
 * @param {{
 *   gates: Record<string, {status?: string, [key: string]: unknown}>,
 *   failures?: string[],
 *   browsers?: Array<Record<string, any>>,
 *   inputs: Record<string, any>,
 *   outputs: Record<string, any>,
 *   canonicalEvidence?: boolean
 * }} evidence
 */
export function buildRuntimeAcceptanceProjections({
  gates,
  failures = [],
  browsers = [],
  inputs,
  outputs,
  canonicalEvidence = true
}) {
  const runtimeSummary = gateSummary(gates, RUNTIME_GATE_IDS);
  runtimeSummary.all_passed = runtimeSummary.checks_failed === 0 && failures.length === 0;

  const performanceSummary = gateSummary(gates, PERFORMANCE_GATE_IDS);
  performanceSummary.all_passed = performanceSummary.checks_failed === 0;

  const crossBrowserGate = gates.cross_browser || {};
  const browserAccessibility = browsers.map((browser) => ({
    browser: browser.browser,
    run_status: browser.status,
    serious_or_critical: Array.isArray(browser.accessibility?.serious_or_critical)
      ? browser.accessibility.serious_or_critical.length
      : null
  }));
  const seriousOrCriticalTotal = browserAccessibility.reduce(
    (total, browser) => total + (browser.serious_or_critical || 0),
    0
  );

  const screenshots = Array.isArray(outputs.screenshots) ? outputs.screenshots : [];
  const screenshotByPath = new Map(screenshots.map((screenshot) => [screenshot.path, screenshot]));
  const chromePassed = browsers.some((browser) => browser.browser === 'chrome' && browser.status === 'passed');
  const screenshotChecks = EXPECTED_SCREENSHOTS.map((expectedPath) => {
    const screenshot = screenshotByPath.get(expectedPath);
    return integrityCheck(
      `screenshot:${expectedPath}`,
      chromePassed &&
        screenshots.length === EXPECTED_SCREENSHOTS.length &&
        screenshotByPath.size === EXPECTED_SCREENSHOTS.length &&
        isStrictMaterial(screenshot, expectedPath),
      {
        path: expectedPath,
        bytes: screenshot?.bytes ?? null,
        sha256: screenshot?.sha256 ?? null
      }
    );
  });
  const integrityChecks = [
    integrityCheck(
      'federation_descriptor',
      (!canonicalEvidence || inputs.bundle_root === 'bundle') &&
        isStrictMaterial(inputs.federation_descriptor, FEDERATION_DESCRIPTOR_PATH),
      {
        path: inputs.federation_descriptor?.path ?? null,
        bytes: inputs.federation_descriptor?.bytes ?? null,
        sha256: inputs.federation_descriptor?.sha256 ?? null
      }
    ),
    integrityCheck(
      'legislation_descriptor',
      (!canonicalEvidence || inputs.bundle_root === 'bundle') &&
        isStrictMaterial(inputs.legislation_descriptor, LEGISLATION_DESCRIPTOR_PATH),
      {
        path: inputs.legislation_descriptor?.path ?? null,
        bytes: inputs.legislation_descriptor?.bytes ?? null,
        sha256: inputs.legislation_descriptor?.sha256 ?? null
      }
    ),
    integrityCheck(
      'explorer_build_index',
      isStrictMaterial(inputs.explorer_build?.index, EXPLORER_BUILD_INDEX_PATH),
      { sha256: inputs.explorer_build?.index?.sha256 ?? null }
    ),
    integrityCheck(
      'explorer_build_tree',
      Number.isInteger(inputs.explorer_build?.files) &&
        inputs.explorer_build.files > 0 &&
        SHA256_PATTERN.test(inputs.explorer_build.sha256 || ''),
      {
        files: inputs.explorer_build?.files ?? null,
        sha256: inputs.explorer_build?.sha256 ?? null
      }
    ),
    ...screenshotChecks
  ];
  const integrityPassed = integrityChecks.filter((check) => check.status === 'passed').length;
  const integritySummary = {
    checks_total: integrityChecks.length,
    checks_passed: integrityPassed,
    checks_failed: integrityChecks.length - integrityPassed,
    all_passed: integrityPassed === integrityChecks.length
  };

  const runtime = {
    status: runtimeSummary.all_passed ? 'passed' : 'failed',
    summary: runtimeSummary
  };
  const crossEngine = {
    status: statusOf(gates, 'cross_browser'),
    required: Array.isArray(crossBrowserGate.required) ? [...crossBrowserGate.required] : [],
    completed: Array.isArray(crossBrowserGate.completed) ? [...crossBrowserGate.completed] : []
  };
  const accessibility = {
    status: statusOf(gates, 'accessibility'),
    serious_or_critical_total: seriousOrCriticalTotal,
    browsers: browserAccessibility
  };
  const performance = {
    status: performanceSummary.all_passed ? 'passed' : 'failed',
    summary: performanceSummary
  };
  const integrity = {
    status: integritySummary.all_passed ? 'passed' : 'failed',
    summary: integritySummary,
    checks: integrityChecks
  };
  const status = [runtime, crossEngine, accessibility, performance, integrity]
    .every((section) => section.status === 'passed')
    ? 'passed'
    : 'failed';

  return {
    status,
    runtime,
    cross_engine: crossEngine,
    accessibility,
    performance,
    integrity
  };
}
