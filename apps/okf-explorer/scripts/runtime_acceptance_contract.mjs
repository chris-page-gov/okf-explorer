import {
  link,
  lstat,
  open,
  realpath,
  unlink
} from 'node:fs/promises';
import { constants as fileConstants } from 'node:fs';
import path from 'node:path';

import {
  BUILD_MANIFEST_FILENAME,
  BUILD_MANIFEST_SCHEMA,
  BUILD_TREE_ALGORITHM,
  canonicalBuildTreeBytes,
  compareBuildPath,
  renderBuildManifest,
  safeBuildPath,
  sha256
} from './app_build_manifest.mjs';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const FEDERATION_DESCRIPTOR_PATH = 'whole-law/okf-explorer.json';
const LEGISLATION_DESCRIPTOR_PATH = 'okf-explorer.json';
const EXPLORER_BUILD_ROOT = 'explorer-build';
const EXPLORER_BUILD_INDEX_PATH = 'explorer-build/index.html';
const EXPLORER_BUILD_MANIFEST_PATH =
  `explorer-build/${BUILD_MANIFEST_FILENAME}`;
export const EXPLORER_RELEASE_VERSION = '0.6.2';
export const EXPLORER_RELEASE_TAG = `v${EXPLORER_RELEASE_VERSION}`;
export const LEGISLATION_BUNDLE_TREE_ALGORITHM =
  'sha256-canonical-json-inventory-v1';
let temporarySequence = 0;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function beforePublicationDeadline(deadline, label) {
  if (deadline === null || deadline === undefined) return;
  invariant(Number.isFinite(deadline), `${label} deadline must be finite`);
  invariant(Date.now() < deadline, `${label} exceeded its deadline`);
}

function physicallyContained(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function verifiedPublicationParent(
  destination,
  {
    containmentRoot = null,
    forbiddenRoots = [],
    deadline = null
  } = {}
) {
  beforePublicationDeadline(deadline, 'Write-once parent verification');
  const parent = path.dirname(path.resolve(destination));
  const parentMetadata = await lstat(parent);
  beforePublicationDeadline(deadline, 'Write-once parent verification');
  invariant(
    parentMetadata.isDirectory() && !parentMetadata.isSymbolicLink(),
    `Write-once publication parent is not a real directory: ${parent}`
  );
  const physicalParent = await realpath(parent);
  beforePublicationDeadline(deadline, 'Write-once parent verification');
  let physicalRoot = null;
  if (containmentRoot !== null) {
    physicalRoot = await realpath(path.resolve(containmentRoot));
    invariant(
      physicallyContained(physicalParent, physicalRoot),
      `Write-once destination is not physically contained by its evidence root: ${destination}`
    );
  }
  for (const forbiddenRoot of forbiddenRoots) {
    let physicalForbidden;
    try {
      physicalForbidden = await realpath(path.resolve(forbiddenRoot));
      beforePublicationDeadline(deadline, 'Write-once protected-root verification');
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    invariant(
      !physicallyContained(physicalParent, physicalForbidden),
      `Write-once destination overlaps a protected input root: ${destination}`
    );
  }
  return {
    path: physicalParent,
    root: physicalRoot,
    dev: parentMetadata.dev,
    ino: parentMetadata.ino
  };
}

async function syncDirectory(directory, deadline = null) {
  beforePublicationDeadline(deadline, 'Write-once directory synchronisation');
  const handle = await open(directory, 'r');
  try {
    beforePublicationDeadline(deadline, 'Write-once directory synchronisation');
    await handle.sync();
    beforePublicationDeadline(deadline, 'Write-once directory synchronisation');
  } finally {
    await handle.close();
  }
}

async function readExactExpectedBytes(
  handle,
  expected,
  label,
  deadline = null
) {
  beforePublicationDeadline(deadline, label);
  const actual = Buffer.allocUnsafe(expected.length);
  let offset = 0;
  while (offset < expected.length) {
    beforePublicationDeadline(deadline, label);
    const { bytesRead } = await handle.read(
      actual,
      offset,
      Math.min(1024 * 1024, expected.length - offset),
      offset
    );
    beforePublicationDeadline(deadline, label);
    if (bytesRead === 0) {
      throw new Error(`${label} was truncated while it was verified`);
    }
    offset += bytesRead;
  }
  beforePublicationDeadline(deadline, label);
  const probe = Buffer.allocUnsafe(1);
  const { bytesRead: extraBytes } = await handle.read(
    probe,
    0,
    1,
    expected.length
  );
  beforePublicationDeadline(deadline, label);
  if (extraBytes !== 0) {
    throw new Error(`${label} grew while it was verified`);
  }
  return actual;
}

async function verifyExistingWriteOnceFile(
  destination,
  expected,
  deadline = null
) {
  beforePublicationDeadline(deadline, 'Existing write-once destination verification');
  const before = await lstat(destination);
  beforePublicationDeadline(deadline, 'Existing write-once destination verification');
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    throw new Error(`Existing write-once destination is not an independent regular file: ${destination}`);
  }
  if (before.size !== expected.length) {
    throw new Error(`Existing write-once destination has different bytes: ${destination}`);
  }
  const handle = await open(
    destination,
    fileConstants.O_RDONLY | (fileConstants.O_NOFOLLOW || 0)
  );
  try {
    beforePublicationDeadline(deadline, 'Existing write-once destination verification');
    const opened = await handle.stat();
    beforePublicationDeadline(deadline, 'Existing write-once destination verification');
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      opened.size !== expected.length
    ) {
      throw new Error(`Existing write-once destination changed before it was opened: ${destination}`);
    }
    const actual = await readExactExpectedBytes(
      handle,
      expected,
      'Existing write-once destination',
      deadline
    );
    beforePublicationDeadline(deadline, 'Existing write-once destination synchronisation');
    await handle.sync();
    beforePublicationDeadline(deadline, 'Existing write-once destination synchronisation');
    const after = await handle.stat();
    beforePublicationDeadline(deadline, 'Existing write-once destination verification');
    const pathAfter = await lstat(destination);
    beforePublicationDeadline(deadline, 'Existing write-once destination verification');
    if (
      before.dev !== pathAfter.dev ||
      before.ino !== pathAfter.ino ||
      before.mode !== pathAfter.mode ||
      before.size !== pathAfter.size ||
      before.mtimeMs !== pathAfter.mtimeMs ||
      before.ctimeMs !== pathAfter.ctimeMs ||
      pathAfter.nlink !== 1 ||
      opened.dev !== after.dev ||
      opened.ino !== after.ino ||
      opened.mode !== after.mode ||
      opened.size !== after.size ||
      opened.mtimeMs !== after.mtimeMs ||
      opened.ctimeMs !== after.ctimeMs ||
      after.nlink !== 1
    ) {
      throw new Error(`Existing write-once destination changed while it was verified: ${destination}`);
    }
    if (!actual.equals(expected)) {
      throw new Error(`Existing write-once destination has different bytes: ${destination}`);
    }
  } finally {
    await handle.close();
  }
}

/**
 * Publish bytes without replacing an existing path. A byte-identical,
 * independent regular file is accepted to make interrupted attempts safely
 * resumable; divergent, linked or symbolic destinations fail closed.
 */
export async function publishWriteOnce(destination, bytes, options = {}) {
  const deadline = options.deadline ?? null;
  beforePublicationDeadline(deadline, 'Write-once publication');
  const expectedBytes = Buffer.isBuffer(bytes)
    ? bytes.length
    : Buffer.byteLength(bytes);
  invariant(
    options.maxBytes === undefined || (
      Number.isSafeInteger(options.maxBytes) &&
      options.maxBytes > 0 &&
      expectedBytes <= options.maxBytes
    ),
    'Write-once evidence exceeds its byte bound'
  );
  beforePublicationDeadline(deadline, 'Write-once publication allocation');
  const expected = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  beforePublicationDeadline(deadline, 'Write-once publication allocation');
  invariant(expected.length > 0, 'Write-once evidence must not be empty');
  const parentBefore = await verifiedPublicationParent(destination, options);
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}-${temporarySequence++}`;
  beforePublicationDeadline(deadline, 'Write-once temporary-file creation');
  const temporaryHandle = await open(temporary, 'wx', 0o400);
  let temporaryIdentity;
  try {
    beforePublicationDeadline(deadline, 'Write-once temporary-file write');
    await temporaryHandle.writeFile(expected);
    beforePublicationDeadline(deadline, 'Write-once temporary-file synchronisation');
    await temporaryHandle.sync();
    beforePublicationDeadline(deadline, 'Write-once temporary-file synchronisation');
    temporaryIdentity = await temporaryHandle.stat();
  } finally {
    await temporaryHandle.close();
  }
  let temporaryPresent = true;
  let createdDestination = false;
  let publicationCompleted = false;
  try {
    let outcome;
    try {
      beforePublicationDeadline(deadline, 'Write-once destination publication');
      await link(temporary, destination);
      createdDestination = true;
      beforePublicationDeadline(deadline, 'Write-once destination publication');
      outcome = 'created';
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      outcome = 'existing-identical';
    }
    beforePublicationDeadline(deadline, 'Write-once temporary-name removal');
    await unlink(temporary);
    temporaryPresent = false;
    await syncDirectory(parentBefore.path, deadline);
    const parentAfter = await verifiedPublicationParent(destination, options);
    invariant(
      parentAfter.dev === parentBefore.dev &&
        parentAfter.ino === parentBefore.ino &&
        parentAfter.path === parentBefore.path &&
        parentAfter.root === parentBefore.root,
      `Write-once publication parent changed during publication: ${destination}`
    );
    await verifyExistingWriteOnceFile(destination, expected, deadline);
    beforePublicationDeadline(deadline, 'Write-once publication');
    publicationCompleted = true;
    return outcome;
  } finally {
    let cleanupError = null;
    if (temporaryPresent) {
      let removed = false;
      try {
        await unlink(temporary);
        removed = true;
      } catch (error) {
        if (error?.code !== 'ENOENT') cleanupError = error;
      }
      if (removed) {
        try {
          await syncDirectory(parentBefore.path);
        } catch (error) {
          cleanupError ||= error;
        }
      }
    }
    if (createdDestination && !publicationCompleted) {
      try {
        const destinationMetadata = await lstat(destination);
        if (
          destinationMetadata.isFile() &&
          destinationMetadata.dev === temporaryIdentity.dev &&
          destinationMetadata.ino === temporaryIdentity.ino
        ) {
          await unlink(destination);
          await syncDirectory(parentBefore.path);
        }
      } catch (error) {
        if (error?.code !== 'ENOENT') cleanupError ||= error;
      }
    }
    if (cleanupError) throw cleanupError;
  }
}

/**
 * Reproduce the Python release pack's canonical publication inventory: rows
 * are path ordered and each object is serialised with lexically sorted keys.
 */
export function canonicalPublicationInventory(materials) {
  invariant(
    Array.isArray(materials) && materials.length > 0,
    'Publication inventory must contain at least one material'
  );
  const rows = materials.map((material, index) => {
    invariant(
      material &&
        typeof material === 'object' &&
        !Array.isArray(material) &&
        Object.keys(material).sort().join(',') === 'bytes,path,sha256',
      `Publication material ${index} has an unexpected key set`
    );
    invariant(
      typeof material.path === 'string' &&
        material.path.length > 0 &&
        Buffer.byteLength(material.path, 'utf8') <= 4096 &&
        !/[\u0000-\u001f\u007f]/.test(material.path) &&
        !pathIsUnsafe(material.path),
      `Publication material ${index} has an unsafe path`
    );
    invariant(
      Number.isSafeInteger(material.bytes) && material.bytes >= 0,
      `Publication material ${index} has an invalid byte count`
    );
    invariant(
      SHA256_PATTERN.test(material.sha256 || ''),
      `Publication material ${index} has an invalid SHA-256`
    );
    return {
      bytes: material.bytes,
      path: material.path,
      sha256: material.sha256
    };
  });
  invariant(
    rows.every(
      (row, index) =>
        index === 0 || compareBuildPath(rows[index - 1].path, row.path) < 0
    ),
    'Publication materials must have unique paths in strict code-point order'
  );
  const canonicalBytes = Buffer.from(`${JSON.stringify(rows)}\n`, 'utf8');
  const totalBytes = rows.reduce((total, row) => total + row.bytes, 0);
  invariant(Number.isSafeInteger(totalBytes), 'Publication aggregate byte count is not safe');
  return {
    algorithm: LEGISLATION_BUNDLE_TREE_ALGORITHM,
    files: rows.length,
    bytes: totalBytes,
    sha256: sha256(canonicalBytes)
  };
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

export function verifyFrozenReleaseBinding(expected, observed) {
  invariant(expected !== null, 'Expected frozen release binding is required');
  invariant(observed !== null, 'Observed frozen release binding is required');
  invariant(
    JSON.stringify(observed) === JSON.stringify(expected),
    'Derived candidate or Explorer identity differs from the requested frozen release binding'
  );
  return observed;
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
      Number.isSafeInteger(value.bytes) &&
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

function sameMaterial(left, right) {
  return Boolean(
    isStrictMaterial(left) &&
      isStrictMaterial(right) &&
      left.path === right.path &&
      left.bytes === right.bytes &&
      left.sha256 === right.sha256
  );
}

function explorerBuildState(value) {
  const state = {
    manifest: false,
    materials: false,
    index: false,
    tree: false,
    computedTree: null
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return state;
  }
  if (
    Object.keys(value).sort().join(',') !==
    'algorithm,files,index,manifest,materials,root,sha256'
  ) {
    return state;
  }
  const manifestIdentity =
    value.root === EXPLORER_BUILD_ROOT &&
    isStrictMaterial(value.manifest, EXPLORER_BUILD_MANIFEST_PATH);
  if (!Array.isArray(value.materials) || value.materials.length === 0) {
    return state;
  }
  try {
    const expectedPrefix = `${EXPLORER_BUILD_ROOT}/`;
    const sourceMaterials = value.materials.map((material) => {
      if (
        !isStrictMaterial(material) ||
        !material.path.startsWith(expectedPrefix)
      ) {
        throw new Error('invalid staged build material');
      }
      const sourcePath = safeBuildPath(
        material.path.slice(expectedPrefix.length)
      );
      return {
        path: sourcePath,
        bytes: material.bytes,
        sha256: material.sha256
      };
    });
    const sourcePaths = sourceMaterials.map((material) => material.path);
    state.materials =
      value.materials.length === value.files &&
      new Set(sourcePaths).size === sourcePaths.length &&
      sourcePaths.every(
        (current, index) =>
          index === 0 ||
          compareBuildPath(sourcePaths[index - 1], current) < 0
      );
    if (!state.materials) return state;
    state.computedTree = sha256(
      canonicalBuildTreeBytes(sourceMaterials)
    );
    state.tree =
      value.algorithm === BUILD_TREE_ALGORITHM &&
      Number.isSafeInteger(value.files) &&
      value.files > 0 &&
      SHA256_PATTERN.test(value.sha256 || '') &&
      value.sha256 === state.computedTree;
    const expectedManifest = renderBuildManifest({
      schema: BUILD_MANIFEST_SCHEMA,
      algorithm: BUILD_TREE_ALGORITHM,
      file_count: sourceMaterials.length,
      tree_sha256: state.computedTree,
      materials: sourceMaterials
    });
    state.manifest =
      manifestIdentity &&
      value.manifest.bytes === expectedManifest.length &&
      value.manifest.sha256 === sha256(expectedManifest);
    const indexMaterials = value.materials.filter(
      (material) => material.path === EXPLORER_BUILD_INDEX_PATH
    );
    state.index =
      indexMaterials.length === 1 &&
      isStrictMaterial(value.index, EXPLORER_BUILD_INDEX_PATH) &&
      sameMaterial(value.index, indexMaterials[0]);
  } catch {
    // Invalid build evidence is represented by failed integrity checks.
  }
  return state;
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
  const buildState = explorerBuildState(inputs.explorer_build);
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
      'explorer_build_manifest',
      buildState.manifest,
      {
        path: inputs.explorer_build?.manifest?.path ?? null,
        bytes: inputs.explorer_build?.manifest?.bytes ?? null,
        sha256: inputs.explorer_build?.manifest?.sha256 ?? null
      }
    ),
    integrityCheck(
      'explorer_build_materials',
      buildState.materials,
      {
        files: Array.isArray(inputs.explorer_build?.materials)
          ? inputs.explorer_build.materials.length
          : null
      }
    ),
    integrityCheck(
      'explorer_build_index',
      buildState.index,
      { sha256: inputs.explorer_build?.index?.sha256 ?? null }
    ),
    integrityCheck(
      'explorer_build_tree',
      buildState.tree,
      {
        algorithm: inputs.explorer_build?.algorithm ?? null,
        files: inputs.explorer_build?.files ?? null,
        sha256: inputs.explorer_build?.sha256 ?? null,
        computed_sha256: buildState.computedTree
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
  const status = canonicalEvidence &&
    [runtime, crossEngine, accessibility, performance, integrity]
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
