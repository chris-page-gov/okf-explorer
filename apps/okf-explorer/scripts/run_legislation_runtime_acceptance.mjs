#!/usr/bin/env node

import AxeBuilder from '@axe-core/playwright';
import { chromium, firefox, webkit } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants as fileConstants } from 'node:fs';
import { createServer } from 'node:http';
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  opendir,
  realpath,
  rm
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import {
  compareBuildPath,
  captureAppBuildEvidence,
  inspectBuildSourceTree,
  inspectCanonicalBuildRoot,
  sha256
} from './app_build_manifest.mjs';
import {
  buildFrozenReleaseBinding,
  buildRuntimeAcceptanceProjections,
  canonicalPublicationInventory,
  EXPLORER_RELEASE_TAG,
  EXPLORER_RELEASE_VERSION,
  publishWriteOnce,
  verifyFrozenReleaseBinding
} from './runtime_acceptance_contract.mjs';
import { verifyAcceptanceInvocationLock } from './acceptance_invocation_lock.mjs';
import { deterministicBuildRequirement } from './run_acceptance_invocation.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = path.resolve(APP_ROOT, '../..');
const BUILD_ROOT = path.join(APP_ROOT, 'build');
const DEFAULT_BUNDLE_ROOT = path.resolve(REPOSITORY_ROOT, '../okf-uk-legislation/bundle');
const DEFAULT_OUTPUT = path.join(REPOSITORY_ROOT, 'release-assurance/explorer-runtime-acceptance.json');
const OUTPUT_BASENAME = 'explorer-runtime-acceptance.json';
const EVIDENCE_RUNNER_PATH = 'apps/okf-explorer/scripts/run_legislation_runtime_acceptance.mjs';
const INVOCATION_WRAPPER_PATH = path.join(APP_ROOT, 'scripts/run_acceptance_invocation.mjs');
const INVOCATION_LOCK_MODULE_PATH = path.join(APP_ROOT, 'scripts/acceptance_invocation_lock.mjs');
const RUNTIME_CONTRACT_PATH = path.join(APP_ROOT, 'scripts/runtime_acceptance_contract.mjs');
const APP_BUILD_MANIFEST_MODULE_PATH = path.join(APP_ROOT, 'scripts/app_build_manifest.mjs');
const PACKAGE_PATH = path.join(APP_ROOT, 'package.json');
const DEPENDENCY_LOCK_PATH = path.join(APP_ROOT, 'pnpm-lock.yaml');
const COMPLETED_BUILD_REQUIREMENT = deterministicBuildRequirement(APP_ROOT);
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
const GIT_EXECUTABLE = '/usr/bin/git';
const execFileAsync = promisify(execFile);
export const ACCEPTANCE_LIMITS = Object.freeze({
  run_ms: 19 * 60 * 1000,
  cleanup_ms: 15_000,
  git_ms: 10_000,
  max_path_bytes: 4096,
  max_tree_depth: 32,
  max_bundle_entries: 20_000,
  max_bundle_files: 12_000,
  max_bundle_bytes: 2 * 1024 * 1024 * 1024,
  max_build_entries: 2_000,
  max_build_files: 1_000,
  max_build_bytes: 128 * 1024 * 1024,
  max_file_bytes: 128 * 1024 * 1024,
  max_executable_bytes: 32 * 1024 * 1024,
  max_transfer_rows: 50_000,
  max_transfer_wire_bytes: 8 * 1024 * 1024 * 1024,
  max_transfer_decoded_bytes: 8 * 1024 * 1024 * 1024,
  max_telemetry_bytes: 8 * 1024 * 1024,
  max_retained_string_bytes: 64 * 1024,
  max_inflight_requests: 16,
  max_inflight_decoded_bytes: 256 * 1024 * 1024,
  max_graph_edges: 10_000,
  max_screenshot_bytes: 20 * 1024 * 1024,
  max_screenshots: 2,
  max_receipt_bytes: 32 * 1024 * 1024,
  receipt_publication_budget_ms: 10_000,
  io_chunk_bytes: 1024 * 1024
});
const EXECUTABLE_MATERIALS = Object.freeze([
  ['runner', fileURLToPath(import.meta.url), EVIDENCE_RUNNER_PATH],
  [
    'runtime_acceptance_contract',
    RUNTIME_CONTRACT_PATH,
    'apps/okf-explorer/scripts/runtime_acceptance_contract.mjs'
  ],
  [
    'app_build_manifest',
    APP_BUILD_MANIFEST_MODULE_PATH,
    'apps/okf-explorer/scripts/app_build_manifest.mjs'
  ],
  [
    'invocation_wrapper',
    INVOCATION_WRAPPER_PATH,
    'apps/okf-explorer/scripts/run_acceptance_invocation.mjs'
  ],
  [
    'invocation_lock',
    INVOCATION_LOCK_MODULE_PATH,
    'apps/okf-explorer/scripts/acceptance_invocation_lock.mjs'
  ],
  [
    'deterministic_build',
    COMPLETED_BUILD_REQUIREMENT.scriptPath,
    'apps/okf-explorer/scripts/check_deterministic_build.mjs'
  ],
  ['package', PACKAGE_PATH, 'apps/okf-explorer/package.json'],
  ['dependency_lock', DEPENDENCY_LOCK_PATH, 'apps/okf-explorer/pnpm-lock.yaml']
]);
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

let bundleRoot = DEFAULT_BUNDLE_ROOT;
let outputPath = DEFAULT_OUTPUT;
let screenshotRoot = path.join(path.dirname(DEFAULT_OUTPUT), EVIDENCE_SCREENSHOT_ROOT);
let candidateCommit = null;
let candidateTree = null;
let candidateBundleTree = null;
let explorerCommit = null;
let explorerTag = EXPLORER_RELEASE_TAG;
let releaseBinding = null;
let argumentFailure = null;
try {
  bundleRoot = argument('--bundle-root', process.env.OKF_LEGISLATION_BUNDLE || DEFAULT_BUNDLE_ROOT);
  outputPath = argument('--output', process.env.OKF_EXPLORER_ACCEPTANCE_OUTPUT || DEFAULT_OUTPUT);
  screenshotRoot = argument(
    '--screenshot-root',
    path.join(path.dirname(outputPath), EVIDENCE_SCREENSHOT_ROOT)
  );
  candidateCommit = valueArgument('--candidate-commit', process.env.OKF_LEGISLATION_COMMIT || null);
  candidateTree = valueArgument('--candidate-tree', process.env.OKF_LEGISLATION_TREE || null);
  candidateBundleTree = valueArgument(
    '--candidate-bundle-tree-sha256',
    process.env.OKF_LEGISLATION_BUNDLE_TREE_SHA256 || null
  );
  explorerCommit = valueArgument('--explorer-commit', process.env.OKF_EXPLORER_COMMIT || null);
  explorerTag = valueArgument('--explorer-tag', process.env.OKF_EXPLORER_TAG || EXPLORER_RELEASE_TAG);
  if (path.basename(outputPath) !== OUTPUT_BASENAME) {
    throw new Error(`--output must use the canonical basename ${OUTPUT_BASENAME}`);
  }
  releaseBinding = buildFrozenReleaseBinding({
    candidateCommit,
    candidateTree,
    candidateBundleTree,
    explorerCommit,
    explorerTag
  });
} catch (error) {
  argumentFailure = error;
}
const releaseBound = releaseBinding !== null;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function encodedJsonScalarBytes(value, label) {
  if (typeof value === 'string') {
    invariant(
      Buffer.byteLength(value, 'utf8') <=
        ACCEPTANCE_LIMITS.max_retained_string_bytes,
      `${label} contains a string above the retained-string byte bound`
    );
  }
  const encoded = JSON.stringify(value);
  invariant(encoded !== undefined, `${label} contains a non-JSON value`);
  return Buffer.byteLength(encoded, 'utf8');
}

/** Measure JSON before serialising the complete value, failing as soon as the
 * governed byte ceiling would be crossed. */
export function boundedJsonByteLength(
  value,
  maxBytes,
  { label = 'JSON evidence', indent = 0, deadline = null } = {}
) {
  invariant(
    Number.isSafeInteger(maxBytes) && maxBytes > 0,
    `${label} requires a positive byte bound`
  );
  invariant(
    Number.isSafeInteger(indent) && indent >= 0 && indent <= 10,
    `${label} has an invalid indentation width`
  );
  if (deadline !== null) remainingMilliseconds(deadline, label);
  const active = new WeakSet();
  let total = 0;
  const add = (bytes) => {
    if (deadline !== null) remainingMilliseconds(deadline, label);
    invariant(
      Number.isSafeInteger(bytes) && bytes >= 0 && total + bytes <= maxBytes,
      `${label} exceeds its byte bound`
    );
    total += bytes;
  };
  const visit = (current, depth, arrayValue = false) => {
    if (deadline !== null) remainingMilliseconds(deadline, label);
    if (
      current === null ||
      typeof current === 'string' ||
      typeof current === 'number' ||
      typeof current === 'boolean'
    ) {
      add(encodedJsonScalarBytes(current, label));
      return;
    }
    if (current === undefined && arrayValue) {
      add(4);
      return;
    }
    invariant(
      current && typeof current === 'object',
      `${label} contains a non-JSON value`
    );
    invariant(!active.has(current), `${label} contains a cycle`);
    active.add(current);
    if (Array.isArray(current)) {
      add(1);
      if (current.length) {
        if (indent) add(1);
        for (let index = 0; index < current.length; index += 1) {
          if (index > 0) add(indent ? 2 : 1);
          if (indent) add(indent * (depth + 1));
          visit(current[index], depth + 1, true);
        }
        if (indent) add(1 + indent * depth);
      }
      add(1);
    } else {
      if (deadline !== null) remainingMilliseconds(deadline, label);
      const entries = Object.entries(current).filter(
        ([, item]) => item !== undefined
      );
      add(1);
      if (entries.length) {
        if (indent) add(1);
        for (let index = 0; index < entries.length; index += 1) {
          if (index > 0) add(indent ? 2 : 1);
          if (indent) add(indent * (depth + 1));
          add(encodedJsonScalarBytes(entries[index][0], label));
          add(indent ? 2 : 1);
          visit(entries[index][1], depth + 1);
        }
        if (indent) add(1 + indent * depth);
      }
      add(1);
    }
    active.delete(current);
  };
  visit(value, 0);
  if (deadline !== null) remainingMilliseconds(deadline, label);
  return total;
}

function remainingMilliseconds(deadline, label) {
  const remaining = deadline - Date.now();
  invariant(remaining > 0, `${label} exceeded the governed acceptance deadline`);
  return remaining;
}

async function withinDeadline(promise, deadline, label) {
  const remaining = remainingMilliseconds(deadline, label);
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded the governed acceptance deadline`)),
          remaining
        );
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function stableFileIdentity(value) {
  return [
    value.dev,
    value.ino,
    value.mode,
    value.nlink,
    value.size,
    value.mtimeMs,
    value.ctimeMs
  ];
}

function sameFileIdentity(left, right) {
  return JSON.stringify(stableFileIdentity(left)) === JSON.stringify(stableFileIdentity(right));
}

async function readStableIndependentFile(
  filePath,
  label,
  maxBytes,
  deadline = null
) {
  if (deadline !== null) remainingMilliseconds(deadline, label);
  const before = await lstat(filePath);
  invariant(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `${label} is not an independent regular file`
  );
  invariant(before.size > 0 && before.size <= maxBytes, `${label} exceeds its byte bound`);
  if (deadline !== null) remainingMilliseconds(deadline, label);
  const handle = await open(
    filePath,
    fileConstants.O_RDONLY | (fileConstants.O_NOFOLLOW || 0)
  );
  try {
    if (deadline !== null) remainingMilliseconds(deadline, label);
    const opened = await handle.stat();
    if (deadline !== null) remainingMilliseconds(deadline, label);
    invariant(
      opened.isFile() && opened.nlink === 1 &&
        opened.dev === before.dev && opened.ino === before.ino &&
        opened.size === before.size && opened.size <= maxBytes,
      `${label} changed before it was opened`
    );
    if (deadline !== null) remainingMilliseconds(deadline, label);
    const bytes = Buffer.allocUnsafe(opened.size);
    let offset = 0;
    while (offset < opened.size) {
      if (deadline !== null) remainingMilliseconds(deadline, label);
      const { bytesRead } = await handle.read(
        bytes,
        offset,
        Math.min(ACCEPTANCE_LIMITS.io_chunk_bytes, opened.size - offset),
        offset
      );
      if (deadline !== null) remainingMilliseconds(deadline, label);
      invariant(bytesRead > 0, `${label} was truncated while it was read`);
      offset += bytesRead;
    }
    if (deadline !== null) remainingMilliseconds(deadline, label);
    const probe = Buffer.allocUnsafe(1);
    const { bytesRead: extraBytes } = await handle.read(
      probe,
      0,
      1,
      opened.size
    );
    if (deadline !== null) remainingMilliseconds(deadline, label);
    invariant(extraBytes === 0, `${label} grew while it was read`);
    const after = await handle.stat();
    if (deadline !== null) remainingMilliseconds(deadline, label);
    invariant(
      bytes.length === opened.size && sameFileIdentity(opened, after),
      `${label} changed while it was read`
    );
    const pathAfter = await lstat(filePath);
    invariant(sameFileIdentity(before, pathAfter), `${label} was replaced while it was read`);
    if (deadline !== null) remainingMilliseconds(deadline, label);
    return bytes;
  } finally {
    await handle.close();
  }
}

function materialProjection(relative, bytes) {
  return {
    path: safeEvidencePath(relative),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

async function readExecutableMaterials(deadline = null) {
  const result = new Map();
  for (const [name, absolute, relative] of EXECUTABLE_MATERIALS) {
    const bytes = await readStableIndependentFile(
      absolute,
      `Acceptance executable material ${name}`,
      ACCEPTANCE_LIMITS.max_executable_bytes,
      deadline
    );
    result.set(name, {
      material: materialProjection(relative, bytes),
      bytes
    });
  }
  return result;
}

function verifyExecutableMaterials(before, after) {
  invariant(before.size === after.size, 'Acceptance executable material set changed during the run');
  for (const [name, initial] of before) {
    const final = after.get(name);
    invariant(
      final &&
        JSON.stringify(final.material) === JSON.stringify(initial.material) &&
        final.bytes.equals(initial.bytes),
      `Acceptance executable material ${name} changed during the run`
    );
  }
}

function repositoryRelativePath(absolute, label) {
  const relative = path.relative(REPOSITORY_ROOT, absolute).split(path.sep).join('/');
  invariant(
    relative && relative !== '..' && !relative.startsWith('../'),
    `${label} must be inside the Explorer repository`
  );
  return safeEvidencePath(relative);
}

function completedBuildReceiptProjection(completedBuild) {
  return {
    schema: completedBuild.schema,
    completed_at: completedBuild.completed_at,
    command_sha256: completedBuild.command.sha256,
    deterministic_build_script: {
      path: repositoryRelativePath(
        completedBuild.deterministic_build_script.path,
        'Completed-build script path'
      ),
      bytes: completedBuild.deterministic_build_script.bytes,
      sha256: completedBuild.deterministic_build_script.sha256
    },
    canonical_build: {
      root: repositoryRelativePath(
        completedBuild.canonical_build.root,
        'Completed canonical build root'
      ),
      manifest_path: repositoryRelativePath(
        completedBuild.canonical_build.manifest_path,
        'Completed canonical build manifest path'
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

function verifyCompletedBuildInspection(completedBuild, inspection, deterministicBuildScriptBytes) {
  const canonicalBuild = completedBuild.canonical_build;
  invariant(
    completedBuild.deterministic_build_script.bytes === deterministicBuildScriptBytes.length &&
      completedBuild.deterministic_build_script.sha256 === sha256(deterministicBuildScriptBytes) &&
      canonicalBuild.manifest_bytes === inspection.manifestBytes.length &&
      canonicalBuild.manifest_sha256 === sha256(inspection.manifestBytes) &&
      canonicalBuild.manifest_schema === inspection.manifest.schema &&
      canonicalBuild.algorithm === inspection.manifest.algorithm &&
      canonicalBuild.files === inspection.manifest.file_count &&
      canonicalBuild.tree_sha256 === inspection.manifest.tree_sha256,
    'Explorer deterministic-build script or initial canonical app-build inspection differs from the completed wrapper build attestation'
  );
}

function safeEvidencePath(relative) {
  invariant(typeof relative === 'string' && relative.length > 0, 'Evidence path must be a non-empty string');
  invariant(Buffer.byteLength(relative, 'utf8') <= ACCEPTANCE_LIMITS.max_path_bytes, `Evidence path is too long: ${relative.slice(0, 80)}`);
  invariant(!relative.includes('\\'), `Evidence path must use POSIX separators: ${relative}`);
  invariant(!/[\u0000-\u001f\u007f]/.test(relative), 'Evidence path contains control characters');
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
  await mkdir(root, { recursive: true, mode: 0o700 });
  let current = root;
  const parts = relativeDirectory ? safeEvidencePath(relativeDirectory).split('/') : [];
  for (const part of ['', ...parts]) {
    if (part) {
      current = path.join(current, part);
      await mkdir(current, { recursive: true, mode: 0o700 });
    }
    const info = await lstat(current);
    invariant(info.isDirectory() && !info.isSymbolicLink(), `Evidence directory is not a real directory: ${current}`);
  }
}

async function projectedPhysicalPath(candidate) {
  let existing = path.resolve(candidate);
  const missing = [];
  while (true) {
    try {
      await lstat(existing);
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parent = path.dirname(existing);
      invariant(parent !== existing, 'No existing parent contains the evidence destination');
      missing.unshift(path.basename(existing));
      existing = parent;
    }
  }
  return path.join(await realpath(existing), ...missing);
}

function physicallyContained(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export async function prepareEvidenceLayout(
  evidenceRoot,
  {
    releaseMode = releaseBound,
    protectedSourceRoots = [REPOSITORY_ROOT, path.dirname(bundleRoot)],
    requestedScreenshotRoot = screenshotRoot
  } = {}
) {
  const protectedRoots = await Promise.all(
    protectedSourceRoots.map((root) => realpath(root))
  );
  const projectedEvidenceRoot = await projectedPhysicalPath(evidenceRoot);
  if (releaseMode) {
    invariant(
      protectedRoots.every(
        (protectedRoot) =>
          !physicallyContained(projectedEvidenceRoot, protectedRoot) &&
          !physicallyContained(protectedRoot, projectedEvidenceRoot)
      ),
      'Release evidence must use a disjoint external directory outside both source checkouts'
    );
    try {
      await lstat(evidenceRoot);
      throw new Error(
        'Release evidence must use a new, absent directory for this measured attempt'
      );
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await mkdir(evidenceRoot, { mode: 0o700 });
  } else {
    await ensureRealDirectoryTree(evidenceRoot);
  }
  await ensureRealDirectoryTree(evidenceRoot, EVIDENCE_SCREENSHOT_ROOT);
  const physicalEvidenceRoot = await realpath(evidenceRoot);
  const physicalScreenshotRoot = await realpath(requestedScreenshotRoot);
  invariant(
    physicalScreenshotRoot === path.join(physicalEvidenceRoot, ...EVIDENCE_SCREENSHOT_ROOT.split('/')),
    '--screenshot-root must be the physically contained output/playwright directory beside the receipt'
  );
  invariant(
    physicalEvidenceRoot === projectedEvidenceRoot,
    'Evidence root changed physical location while it was created'
  );
  return {
    evidenceRoot: physicalEvidenceRoot,
    screenshotRoot: physicalScreenshotRoot,
    publicationOptions: {
      containmentRoot: physicalEvidenceRoot,
      forbiddenRoots: releaseMode
        ? protectedSourceRoots
        : [BUILD_ROOT, bundleRoot]
    }
  };
}

async function stageEvidenceMaterial(layout, relative, bytes, deadline) {
  remainingMilliseconds(deadline, `Staging evidence ${relative}`);
  const safe = safeEvidencePath(relative);
  const absolute = path.resolve(layout.evidenceRoot, ...safe.split('/'));
  invariant(
    physicallyContained(absolute, layout.evidenceRoot) && absolute !== layout.evidenceRoot,
    `Evidence path escaped its root: ${relative}`
  );
  await ensureRealDirectoryTree(
    layout.evidenceRoot,
    path.posix.dirname(safe) === '.' ? '' : path.posix.dirname(safe)
  );
  await publishWriteOnce(absolute, bytes, {
    ...layout.publicationOptions,
    deadline,
    maxBytes: ACCEPTANCE_LIMITS.max_file_bytes
  });
  remainingMilliseconds(deadline, `Staging evidence ${relative}`);
  const staged = await readStableIndependentFile(
    absolute,
    `Staged evidence ${relative}`,
    ACCEPTANCE_LIMITS.max_file_bytes,
    deadline
  );
  invariant(staged.length === bytes.length, `Staged evidence byte count changed: ${relative}`);
  invariant(sha256(staged) === sha256(bytes), `Staged evidence digest changed: ${relative}`);
  return {
    path: safe,
    bytes: staged.length,
    sha256: sha256(staged)
  };
}

async function captureEvidenceMaterial(layout, relative, bytes, deadline) {
  return stageEvidenceMaterial(layout, relative, bytes, deadline);
}

async function writeReceipt(layout, output, bytes, deadline) {
  invariant(
    remainingMilliseconds(deadline, 'Acceptance receipt publication') >=
      ACCEPTANCE_LIMITS.receipt_publication_budget_ms,
    'Acceptance receipt publication has insufficient governed time remaining'
  );
  invariant(bytes.length <= ACCEPTANCE_LIMITS.max_receipt_bytes, 'Acceptance receipt exceeds its byte bound');
  invariant(
    await realpath(path.dirname(output)) === layout.evidenceRoot &&
      path.basename(output) === OUTPUT_BASENAME,
    'Receipt is not physically contained directly by its evidence root'
  );
  const physicalOutput = path.join(layout.evidenceRoot, OUTPUT_BASENAME);
  await publishWriteOnce(physicalOutput, bytes, {
    ...layout.publicationOptions,
    deadline,
    maxBytes: ACCEPTANCE_LIMITS.max_receipt_bytes
  });
  remainingMilliseconds(deadline, 'Acceptance receipt publication');
}

function treeLimits(kind) {
  return kind === 'bundle'
    ? {
        maxEntries: ACCEPTANCE_LIMITS.max_bundle_entries,
        maxFiles: ACCEPTANCE_LIMITS.max_bundle_files,
        maxBytes: ACCEPTANCE_LIMITS.max_bundle_bytes
      }
    : {
        maxEntries: ACCEPTANCE_LIMITS.max_build_entries,
        maxFiles: ACCEPTANCE_LIMITS.max_build_files,
        maxBytes: ACCEPTANCE_LIMITS.max_build_bytes
      };
}

async function copyAndHashStableFile({
  source,
  destination,
  relative,
  label,
  deadline,
  maxFileBytes
}) {
  remainingMilliseconds(deadline, `${label} snapshot`);
  const before = await lstat(source);
  remainingMilliseconds(deadline, `${label} snapshot`);
  invariant(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `${label} contains a linked, symbolic or non-regular file: ${relative}`
  );
  invariant(
    before.size >= 0 && before.size <= maxFileBytes,
    `${label} file exceeds its byte bound: ${relative}`
  );
  const sourceHandle = await open(
    source,
    fileConstants.O_RDONLY | (fileConstants.O_NOFOLLOW || 0)
  );
  let destinationHandle = null;
  try {
    const opened = await sourceHandle.stat();
    remainingMilliseconds(deadline, `${label} snapshot`);
    invariant(
      opened.isFile() && opened.nlink === 1 &&
        opened.dev === before.dev && opened.ino === before.ino,
      `${label} file changed before it was opened: ${relative}`
    );
    if (destination !== null) {
      remainingMilliseconds(deadline, `${label} snapshot`);
      destinationHandle = await open(
        destination,
        fileConstants.O_WRONLY | fileConstants.O_CREAT | fileConstants.O_EXCL,
        0o400
      );
    }
    const digest = createHash('sha256');
    remainingMilliseconds(deadline, `${label} snapshot allocation`);
    const buffer = Buffer.allocUnsafe(ACCEPTANCE_LIMITS.io_chunk_bytes);
    let position = 0;
    while (position < opened.size) {
      remainingMilliseconds(deadline, `${label} snapshot`);
      const length = Math.min(buffer.length, opened.size - position);
      const { bytesRead } = await sourceHandle.read(buffer, 0, length, position);
      invariant(bytesRead > 0, `${label} file read made no progress: ${relative}`);
      const chunk = buffer.subarray(0, bytesRead);
      digest.update(chunk);
      if (destinationHandle) {
        let written = 0;
        while (written < bytesRead) {
          const result = await destinationHandle.write(
            chunk,
            written,
            bytesRead - written,
            position + written
          );
          invariant(result.bytesWritten > 0, `${label} snapshot write made no progress: ${relative}`);
          written += result.bytesWritten;
        }
      }
      position += bytesRead;
    }
    const after = await sourceHandle.stat();
    const pathAfter = await lstat(source);
    invariant(
      sameFileIdentity(opened, after) && sameFileIdentity(before, pathAfter),
      `${label} file changed while it was snapshotted: ${relative}`
    );
    return {
      path: relative,
      bytes: position,
      sha256: digest.digest('hex')
    };
  } finally {
    if (destinationHandle) await destinationHandle.close();
    await sourceHandle.close();
  }
}

export async function scanTree({ root, snapshotRoot = null, kind, deadline }) {
  const label = kind === 'bundle' ? 'Legislation bundle' : 'Explorer build';
  const absoluteRoot = path.resolve(root);
  const rootBefore = await lstat(absoluteRoot);
  invariant(
    rootBefore.isDirectory() && !rootBefore.isSymbolicLink(),
    `${label} root is not a real directory`
  );
  if (snapshotRoot !== null) {
    await mkdir(snapshotRoot, { mode: 0o700 });
    const snapshotMetadata = await lstat(snapshotRoot);
    invariant(
      snapshotMetadata.isDirectory() && !snapshotMetadata.isSymbolicLink(),
      `${label} snapshot root is not a private real directory`
    );
  }
  const limits = treeLimits(kind);
  const materials = [];
  let entries = 0;
  let totalBytes = 0;

  async function walk(relativeDirectory = '') {
    remainingMilliseconds(deadline, `${label} traversal`);
    const sourceDirectory = relativeDirectory
      ? path.join(absoluteRoot, ...relativeDirectory.split('/'))
      : absoluteRoot;
    const sourceDirectoryMetadata = await lstat(sourceDirectory);
    invariant(
      sourceDirectoryMetadata.isDirectory() && !sourceDirectoryMetadata.isSymbolicLink(),
      `${label} contains a symbolic or non-directory path: ${relativeDirectory || '.'}`
    );
    const directory = await opendir(sourceDirectory);
    const children = [];
    try {
      while (true) {
        remainingMilliseconds(deadline, `${label} traversal`);
        const child = await directory.read();
        if (child === null) break;
        invariant(entries < limits.maxEntries, `${label} exceeds its entry-count bound`);
        entries += 1;
        children.push({
          child,
          relative: safeEvidencePath(
            relativeDirectory
              ? path.posix.join(relativeDirectory, child.name)
              : child.name
          )
        });
      }
    } finally {
      await directory.close();
    }
    const sourceDirectoryAfter = await lstat(sourceDirectory);
    invariant(
      sameFileIdentity(sourceDirectoryMetadata, sourceDirectoryAfter),
      `${label} directory changed while it was enumerated: ${relativeDirectory || '.'}`
    );
    children.sort((left, right) => compareBuildPath(left.relative, right.relative));
    for (const { relative } of children) {
      const depth = relative.split('/').length;
      invariant(depth <= ACCEPTANCE_LIMITS.max_tree_depth, `${label} exceeds its depth bound`);
      const source = path.join(absoluteRoot, ...relative.split('/'));
      const metadata = await lstat(source);
      invariant(!metadata.isSymbolicLink(), `${label} contains a symbolic link: ${relative}`);
      if (metadata.isDirectory()) {
        if (snapshotRoot !== null) {
          await mkdir(path.join(snapshotRoot, ...relative.split('/')), { mode: 0o700 });
        }
        await walk(relative);
        continue;
      }
      invariant(metadata.isFile(), `${label} contains a non-regular entry: ${relative}`);
      invariant(materials.length < limits.maxFiles, `${label} exceeds its file-count bound`);
      const destination = snapshotRoot === null
        ? null
        : path.join(snapshotRoot, ...relative.split('/'));
      const material = await copyAndHashStableFile({
        source,
        destination,
        relative,
        label,
        deadline,
        maxFileBytes: ACCEPTANCE_LIMITS.max_file_bytes
      });
      totalBytes += material.bytes;
      invariant(totalBytes <= limits.maxBytes, `${label} exceeds its aggregate byte bound`);
      materials.push(material);
    }
  }

  await walk();
  const rootAfter = await lstat(absoluteRoot);
  invariant(
    rootAfter.isDirectory() && !rootAfter.isSymbolicLink() &&
      rootBefore.dev === rootAfter.dev && rootBefore.ino === rootAfter.ino,
    `${label} root changed while it was inspected`
  );
  invariant(materials.length > 0, `${label} contains no files`);
  materials.sort((left, right) => compareBuildPath(left.path, right.path));
  const identity = canonicalPublicationInventory(materials);
  invariant(identity.bytes === totalBytes, `${label} aggregate byte accounting differs`);
  return {
    root: snapshotRoot === null ? absoluteRoot : path.resolve(snapshotRoot),
    entries,
    materials,
    materialByPath: new Map(materials.map((material) => [material.path, material])),
    identity
  };
}

export function sameTreeIdentity(left, right) {
  return Boolean(
    left && right &&
      left.entries === right.entries &&
      JSON.stringify(left.identity) === JSON.stringify(right.identity) &&
      JSON.stringify(left.materials) === JSON.stringify(right.materials)
  );
}

async function readSnapshotMaterial(tree, relative, label, deadline = null) {
  const material = tree.materialByPath.get(relative);
  invariant(material, `${label} is not present in the immutable snapshot: ${relative}`);
  const absolute = path.join(tree.root, ...relative.split('/'));
  const bytes = await readStableIndependentFile(
    absolute,
    `${label} ${relative}`,
    ACCEPTANCE_LIMITS.max_file_bytes,
    deadline
  );
  invariant(
    bytes.length === material.bytes && sha256(bytes) === material.sha256,
    `${label} differs from its immutable snapshot inventory: ${relative}`
  );
  return bytes;
}

async function gitOutput(root, gitArgs, deadline, allowMissing = false) {
  try {
    const { stdout } = await execFileAsync(
      GIT_EXECUTABLE,
      ['-C', root, ...gitArgs],
      {
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024,
        timeout: Math.min(ACCEPTANCE_LIMITS.git_ms, remainingMilliseconds(deadline, 'Git identity derivation')),
        env: {
          PATH: process.env.PATH || '/usr/bin:/bin',
          LANG: 'C',
          LC_ALL: 'C'
        }
      }
    );
    return stdout.trim();
  } catch (error) {
    if (allowMissing) return null;
    throw new Error(`Git identity derivation failed (${sha256(Buffer.from(String(error?.message || error)))})`);
  }
}

async function repositoryState(root, tag, deadline) {
  const top = await gitOutput(root, ['rev-parse', '--show-toplevel'], deadline);
  const physicalTop = await realpath(top);
  const [commit, tree, status, tagObject, tagCommit, tagType] = await Promise.all([
    gitOutput(physicalTop, ['rev-parse', 'HEAD'], deadline),
    gitOutput(physicalTop, ['rev-parse', 'HEAD^{tree}'], deadline),
    gitOutput(physicalTop, ['status', '--porcelain=v1', '--untracked-files=all'], deadline),
    tag === null
      ? Promise.resolve(null)
      : gitOutput(physicalTop, ['rev-parse', `refs/tags/${tag}`], deadline, true),
    tag === null
      ? Promise.resolve(null)
      : gitOutput(physicalTop, ['rev-parse', `refs/tags/${tag}^{commit}`], deadline, true),
    tag === null
      ? Promise.resolve(null)
      : gitOutput(physicalTop, ['cat-file', '-t', `refs/tags/${tag}`], deadline, true)
  ]);
  return {
    root: physicalTop,
    commit,
    tree,
    clean: status.length === 0,
    dirty_entries: status ? status.split('\n').length : 0,
    tag,
    tag_object: tagObject,
    tag_commit: tagCommit,
    tag_type: tagType
  };
}

function repositoryStateProjection(state) {
  return {
    commit: state.commit,
    tree: state.tree,
    clean: state.clean,
    dirty_entries: state.dirty_entries,
    tag: state.tag,
    tag_object: state.tag_object,
    tag_commit: state.tag_commit,
    tag_type: state.tag_type
  };
}

function verifyRepositoryStateStable(before, after, label) {
  invariant(
    JSON.stringify(repositoryStateProjection(before)) ===
      JSON.stringify(repositoryStateProjection(after)),
    `${label} Git identity changed during runtime acceptance`
  );
}

function sanitisedFailure(error, browser) {
  const raw = error instanceof Error ? error.stack || error.message : String(error);
  const retained = raw.slice(0, ACCEPTANCE_LIMITS.max_retained_string_bytes);
  const detail = Buffer.from(retained, 'utf8');
  return {
    browser,
    status: 'failed',
    error: {
      kind: 'acceptance-error',
      detail_bytes: detail.length,
      detail_sha256: sha256(detail),
      detail_truncated: retained.length < raw.length
    }
  };
}

function retainTelemetry(tracker, value, label) {
  const remaining = ACCEPTANCE_LIMITS.max_telemetry_bytes -
    tracker.telemetry_bytes;
  const bytes = boundedJsonByteLength(value, remaining, { label });
  tracker.telemetry_bytes += bytes;
  invariant(
    tracker.telemetry_bytes <= ACCEPTANCE_LIMITS.max_telemetry_bytes,
    `${label} exceeds the aggregate telemetry byte bound`
  );
}

export function assertNoSensitiveRuntimeData(receipt, forbiddenValues) {
  const prohibited = forbiddenValues.filter(
    (value) => typeof value === 'string' && value.length > 0
  );
  const visit = (value) => {
    if (typeof value === 'string') {
      for (const forbidden of prohibited) {
        invariant(
          !value.includes(forbidden),
          'Receipt contains a forbidden absolute path or runtime secret'
        );
      }
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        invariant(!url.username && !url.password, 'Receipt URL contains credentials');
        invariant(!url.search, 'Receipt URL contains a query string');
      }
      invariant(
        !/(?:^|[?&])(access[_-]?token|api[_-]?key|key|secret|signature|sig|token)=/i.test(value),
        'Receipt contains a query credential'
      );
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value && typeof value === 'object') {
      for (const item of Object.values(value)) visit(item);
    }
  };
  visit(receipt);
}

async function closeAcceptanceServer(server) {
  if (!server) return;
  if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

export async function removePrivateSnapshot(
  cleanupRoot,
  {
    deadline = Date.now() + ACCEPTANCE_LIMITS.cleanup_ms,
    removeTree = rm,
    temporaryRoot = null
  } = {}
) {
  const physicalTemporaryRoot = temporaryRoot || await realpath(tmpdir());
  const metadata = await lstat(cleanupRoot);
  invariant(
    metadata.isDirectory() && !metadata.isSymbolicLink(),
    'Acceptance snapshot cleanup target is not a private real directory'
  );
  const physicalCleanupRoot = await realpath(cleanupRoot);
  invariant(
    physicalCleanupRoot === path.resolve(cleanupRoot) &&
      path.basename(physicalCleanupRoot).startsWith(
        'okf-legislation-acceptance-'
      ) &&
      physicallyContained(physicalCleanupRoot, physicalTemporaryRoot) &&
      physicalCleanupRoot !== physicalTemporaryRoot,
    'Refusing to clean an unexpected snapshot directory'
  );
  await withinDeadline(
    removeTree(physicalCleanupRoot, {
      recursive: true,
      force: true,
      maxRetries: 2
    }),
    deadline,
    'Acceptance snapshot cleanup'
  );
  try {
    await lstat(physicalCleanupRoot);
    throw new Error(
      'Acceptance snapshot cleanup left its private directory behind'
    );
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function redactedDiagnostic(error) {
  let message = error instanceof Error ? error.message : String(error);
  for (const [value, replacement] of [
    [REPOSITORY_ROOT, '<explorer-checkout>'],
    [bundleRoot, '<legislation-bundle>'],
    [path.dirname(bundleRoot), '<legislation-checkout>'],
    [path.dirname(outputPath), '<evidence-root>']
  ]) {
    if (value) message = message.split(value).join(replacement);
  }
  message = message.replace(
    /https?:\/\/[^\s]+/gi,
    (candidate) => {
      try {
        const url = new URL(candidate);
        return `${url.origin}${url.pathname}`;
      } catch {
        return '<redacted-url>';
      }
    }
  );
  message = message.replace(
    /([?&](?:access[_-]?token|api[_-]?key|key|secret|signature|sig|token)=)[^&\s]+/gi,
    '$1<redacted>'
  );
  return message.slice(0, 2048);
}

async function inspectRuntimeBuildRoot(deadline) {
  try {
    return await inspectCanonicalBuildRoot(BUILD_ROOT, { deadline });
  } catch (error) {
    if (releaseBound || error?.code !== 'ENOENT') throw error;
    return inspectBuildSourceTree(BUILD_ROOT, { deadline });
  }
}

function round(value, places = 3) {
  return Number(value.toFixed(places));
}

function retainedText(value, label) {
  const text = String(value);
  invariant(
    Buffer.byteLength(text, 'utf8') <=
      ACCEPTANCE_LIMITS.max_retained_string_bytes,
    `${label} exceeds the retained-string byte bound`
  );
  return text;
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

async function waitForServer(deadline) {
  const readyDeadline = Math.min(deadline, Date.now() + 10_000);
  while (Date.now() < readyDeadline) {
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

function retainTransfer(transfers, telemetry, row, limits = ACCEPTANCE_LIMITS) {
  invariant(
    transfers.length < limits.max_transfer_rows,
    'Acceptance transfer telemetry exceeds its row-count bound'
  );
  telemetry.transfer_wire_bytes += row.wire_bytes;
  telemetry.transfer_decoded_bytes += row.decoded_bytes;
  invariant(
    telemetry.transfer_wire_bytes <= limits.max_transfer_wire_bytes,
    'Acceptance transfer telemetry exceeds its aggregate wire-byte bound'
  );
  invariant(
    telemetry.transfer_decoded_bytes <= limits.max_transfer_decoded_bytes,
    'Acceptance transfer telemetry exceeds its aggregate decoded-byte bound'
  );
  retainTelemetry(telemetry, row, 'Acceptance transfer telemetry');
  transfers.push(row);
}

function serverFailureEvidence(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const retained = raw.slice(0, ACCEPTANCE_LIMITS.max_retained_string_bytes);
  const bytes = Buffer.from(retained, 'utf8');
  return {
    kind: 'acceptance-server-error',
    detail_bytes: bytes.length,
    detail_sha256: sha256(bytes),
    detail_truncated: retained.length < raw.length
  };
}

function reserveRequest(serverState, reservation, limits) {
  invariant(
    serverState.inflight_requests < limits.max_inflight_requests,
    'Acceptance server exceeds its concurrent-request bound'
  );
  serverState.inflight_requests += 1;
  reservation.request_reserved = true;
  serverState.peak_inflight_requests = Math.max(
    serverState.peak_inflight_requests,
    serverState.inflight_requests
  );
}

function reserveTransfer(serverState, telemetry, transfers, reservation, limits) {
  invariant(
    reservation.request_reserved && !reservation.transfer_reserved,
    'Acceptance transfer requires one live request reservation'
  );
  invariant(
    serverState.pending_rows + transfers.length < limits.max_transfer_rows,
    'Acceptance transfer telemetry exceeds its row-count bound'
  );
  invariant(
    telemetry.transfer_wire_bytes + serverState.pending_wire_bytes +
      reservation.wire_bytes <= limits.max_transfer_wire_bytes,
    'Acceptance transfer telemetry exceeds its aggregate wire-byte bound'
  );
  invariant(
    telemetry.transfer_decoded_bytes + serverState.pending_decoded_bytes +
      reservation.decoded_bytes <= limits.max_transfer_decoded_bytes,
    'Acceptance transfer telemetry exceeds its aggregate decoded-byte bound'
  );
  invariant(
    serverState.inflight_decoded_bytes + reservation.source_bytes <=
      limits.max_inflight_decoded_bytes,
    'Acceptance server exceeds its in-flight decoded-byte bound'
  );
  serverState.pending_rows += 1;
  serverState.pending_wire_bytes += reservation.wire_bytes;
  serverState.pending_decoded_bytes += reservation.decoded_bytes;
  serverState.inflight_decoded_bytes += reservation.source_bytes;
  reservation.transfer_reserved = true;
  serverState.peak_inflight_decoded_bytes = Math.max(
    serverState.peak_inflight_decoded_bytes,
    serverState.inflight_decoded_bytes
  );
}

function releaseTransferReservation(serverState, reservation) {
  if (!reservation) return;
  if (reservation.transfer_reserved) {
    serverState.pending_rows -= 1;
    serverState.pending_wire_bytes -= reservation.wire_bytes;
    serverState.pending_decoded_bytes -= reservation.decoded_bytes;
    serverState.inflight_decoded_bytes -= reservation.source_bytes;
    reservation.transfer_reserved = false;
  }
  if (reservation.request_reserved) {
    serverState.inflight_requests -= 1;
    reservation.request_reserved = false;
  }
}

async function finishAcceptanceResponse(response, body, deadline, label) {
  await withinDeadline(
    new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        response.off('finish', onFinish);
        response.off('close', onClose);
        response.off('error', onError);
      };
      const settle = (callback, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };
      const onFinish = () => settle(resolve);
      const onClose = () => {
        if (response.writableFinished) settle(resolve);
        else settle(reject, new Error(`${label} closed before its response finished`));
      };
      const onError = (error) => settle(reject, error);
      response.once('finish', onFinish);
      response.once('close', onClose);
      response.once('error', onError);
      response.end(body);
    }),
    deadline,
    label
  );
}

export function assertAcceptanceServerHealthy(serverState) {
  invariant(
    serverState.failure === null,
    `Acceptance server encountered a governed failure (${serverState.failure?.detail_sha256 || 'unknown'})`
  );
  invariant(
    serverState.inflight_requests === 0 &&
      serverState.inflight_decoded_bytes === 0 &&
      serverState.pending_rows === 0 &&
      serverState.pending_wire_bytes === 0 &&
      serverState.pending_decoded_bytes === 0,
    'Acceptance server retained unfinished request reservations after shutdown'
  );
}

export function createAcceptanceServer(
  transfers,
  currentRun,
  roots,
  telemetry,
  deadline,
  serverState,
  limits = ACCEPTANCE_LIMITS
) {
  return createServer(async (request, response) => {
    const reservation = {
      request_reserved: false,
      transfer_reserved: false,
      source_bytes: 0,
      decoded_bytes: 0,
      wire_bytes: 0
    };
    try {
      reserveRequest(serverState, reservation, limits);
      invariant(
        serverState.failure === null,
        'Acceptance server has already entered its fatal state'
      );
      remainingMilliseconds(deadline, 'Acceptance HTTP server');
      invariant(request.method === 'GET' || request.method === 'HEAD', 'Unsupported acceptance request method');
      invariant(
        Buffer.byteLength(request.url || '/', 'utf8') <= ACCEPTANCE_LIMITS.max_path_bytes,
        'Acceptance request target exceeds its byte bound'
      );
      const requestUrl = new URL(request.url || '/', BASE_URL);
      const fromBundle = requestUrl.pathname.startsWith(BUNDLE_PREFIX);
      let relative = fromBundle
        ? safeRelativePath(requestUrl.pathname, BUNDLE_PREFIX)
        : safeRelativePath(requestUrl.pathname);
      const tree = fromBundle ? roots.bundle : roots.build;
      if (!relative) relative = 'index.html';
      if (!tree.materialByPath.has(relative) && !fromBundle && !path.extname(relative)) {
        relative = 'index.html';
      }
      if (!tree.materialByPath.has(relative)) {
        const body = Buffer.from('Not found', 'utf8');
        reservation.decoded_bytes = body.length;
        reservation.wire_bytes = body.length;
        reserveTransfer(serverState, telemetry, transfers, reservation, limits);
        retainTransfer(transfers, telemetry, {
          browser: currentRun.browser,
          phase: currentRun.phase,
          path: requestUrl.pathname,
          source: fromBundle ? 'legislation-bundle' : 'explorer-build',
          status: 404,
          wire_bytes: body.length,
          decoded_bytes: body.length,
          content_encoding: 'identity',
          range: null
        }, limits);
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        await finishAcceptanceResponse(
          response,
          request.method === 'HEAD' ? undefined : body,
          deadline,
          'Acceptance HTTP 404 response'
        );
        return;
      }
      const declared = tree.materialByPath.get(relative);
      const requestedRange = rangeSlice(request.headers.range, declared.bytes);
      const decodedBytes = requestedRange
        ? requestedRange.end - requestedRange.start + 1
        : declared.bytes;
      const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(
        String(request.headers['accept-encoding'] || '')
      );
      const useGzip = !requestedRange && acceptsGzip && compressible(relative);
      reservation.source_bytes = declared.bytes;
      reservation.decoded_bytes = decodedBytes;
      reservation.wire_bytes = useGzip
          ? Math.min(
              Number.MAX_SAFE_INTEGER,
              declared.bytes * 2 + 1024
            )
          : decodedBytes;
      reserveTransfer(
        serverState,
        telemetry,
        transfers,
        reservation,
        limits
      );
      const original = await readSnapshotMaterial(
        tree,
        relative,
        fromBundle ? 'Legislation bundle snapshot' : 'Explorer build snapshot',
        deadline
      );
      invariant(
        original.length === declared.bytes,
        'Acceptance snapshot material differs from its reserved byte count'
      );
      let body = original;
      let status = 200;
      const headers = {
        'accept-ranges': 'bytes',
        'cache-control': 'no-store',
        'content-type': contentType(relative),
        'cross-origin-resource-policy': 'same-origin',
        'x-content-type-options': 'nosniff'
      };
      if (requestedRange) {
        status = 206;
        body = original.subarray(requestedRange.start, requestedRange.end + 1);
        headers['content-range'] = `bytes ${requestedRange.start}-${requestedRange.end}/${original.length}`;
      } else if (useGzip) {
        body = gzipSync(original, { level: 9 });
        headers['content-encoding'] = 'gzip';
        headers.vary = 'Accept-Encoding';
      }
      remainingMilliseconds(deadline, 'Acceptance HTTP response');
      headers['content-length'] = String(body.length);

      retainTransfer(transfers, telemetry, {
        browser: currentRun.browser,
        phase: currentRun.phase,
        path: requestUrl.pathname,
        source: fromBundle ? 'legislation-bundle' : 'explorer-build',
        status,
        wire_bytes: body.length,
        decoded_bytes: requestedRange ? body.length : original.length,
        content_encoding: headers['content-encoding'] || 'identity',
        range: requestedRange ? `${requestedRange.start}-${requestedRange.end}` : null
      }, limits);
      response.writeHead(status, headers);
      await finishAcceptanceResponse(
        response,
        request.method === 'HEAD' ? undefined : body,
        deadline,
        'Acceptance HTTP response'
      );
    } catch (error) {
      if (serverState.failure === null) {
        serverState.failure = serverFailureEvidence(error);
      }
      if (!response.headersSent) {
        try {
          response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
          await finishAcceptanceResponse(
            response,
            'Internal acceptance server failure',
            deadline,
            'Acceptance HTTP failure response'
          );
        } catch {
          response.destroy();
        }
      } else {
        response.destroy();
      }
    } finally {
      releaseTransferReservation(serverState, reservation);
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
  const present = errors.filter((text) => text.trim());
  if (present.length) {
    const retained = present
      .slice(0, 20)
      .map((text) => retainedText(text, `${label} visible error`))
      .join(' | ');
    invariant(false, `${label}: ${retained}`);
  }
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
  const inventory = retainedText(
    (await page.locator('.facet-inventory').textContent())?.trim() || '',
    'Facet inventory'
  );
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
  const summary = retainedText(
    (await page.locator('.graph-summary').textContent())?.trim() || '',
    'Graph summary'
  );
  const edgeLocator = page.locator('.graph-edge');
  const edgeCount = await edgeLocator.count();
  invariant(
    edgeCount <= ACCEPTANCE_LIMITS.max_graph_edges,
    'Graph exceeds the retained-edge bound'
  );
  const edges = await edgeLocator.evaluateAll((elements) => elements.map((element) => {
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
  const modelEdgeLocator = graph.locator('.graph-edge');
  invariant(
    await modelEdgeLocator.count() <= ACCEPTANCE_LIMITS.max_graph_edges,
    'Model-enriched graph exceeds the retained-edge bound'
  );
  const styles = await modelEdgeLocator.evaluateAll((elements) =>
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
    'Model-assisted filter state was not serialised into the Explorer URL'
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

async function captureScreenshot(page, name, capturedScreenshots) {
  invariant(
    capturedScreenshots.length < ACCEPTANCE_LIMITS.max_screenshots,
    'Chrome screenshot count exceeds its hard bound'
  );
  const bytes = await page.screenshot({ fullPage: false, type: 'png' });
  invariant(
    bytes.length > 0 && bytes.length <= ACCEPTANCE_LIMITS.max_screenshot_bytes,
    `Chrome screenshot ${name} exceeds its byte bound`
  );
  capturedScreenshots.push({ name, bytes });
}

async function runBrowser(
  browserName,
  browserType,
  transfers,
  currentRun,
  capturedScreenshots,
  deadline
) {
  currentRun.browser = browserName;
  currentRun.phase = 'launch';
  const launchOptions = browserName === 'chrome'
    ? {
        channel: 'chrome',
        headless: true,
        args: ['--enable-precise-memory-info'],
        timeout: Math.min(120_000, remainingMilliseconds(deadline, `${browserName} launch`))
      }
    : {
        headless: true,
        timeout: Math.min(120_000, remainingMilliseconds(deadline, `${browserName} launch`))
      };
  const browser = await withinDeadline(
    browserType.launch(launchOptions),
    deadline,
    `${browserName} launch`
  );
  const browserVersion = browser.version();
  let memorySession = null;
  const memorySamples = [];
  let deadlineExpired = false;
  const watchdog = setTimeout(() => {
    deadlineExpired = true;
    void browser.close().catch(() => {});
  }, remainingMilliseconds(deadline, `${browserName} journey`));
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
    federationPage.setDefaultTimeout(
      Math.min(30_000, remainingMilliseconds(deadline, `${browserName} federation journey`))
    );
    federationPage.setDefaultNavigationTimeout(
      Math.min(30_000, remainingMilliseconds(deadline, `${browserName} federation navigation`))
    );
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
    page.setDefaultTimeout(
      Math.min(30_000, remainingMilliseconds(deadline, `${browserName} direct journey`))
    );
    page.setDefaultNavigationTimeout(
      Math.min(30_000, remainingMilliseconds(deadline, `${browserName} direct navigation`))
    );
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
      await captureScreenshot(
        page,
        'legislation-runtime-graph-chrome.png',
        capturedScreenshots
      );
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
      await captureScreenshot(
        page,
        'legislation-runtime-chrome.png',
        capturedScreenshots
      );
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
  } catch (error) {
    if (deadlineExpired) {
      throw new Error(`${browserName} exceeded the governed acceptance deadline`);
    }
    throw error;
  } finally {
    clearTimeout(watchdog);
    await withinDeadline(
      browser.close().catch(() => {}),
      Date.now() + 5_000,
      `${browserName} browser cleanup`
    );
  }
}

async function main() {
  const startedAt = Date.now();
  const deadline = startedAt + ACCEPTANCE_LIMITS.run_ms;
  let snapshotParent = null;
  let server = null;
  try {
    if (argumentFailure) throw argumentFailure;
    const lockAttestation = await verifyAcceptanceInvocationLock({
      checkoutRoot: REPOSITORY_ROOT,
      expectedPurpose: 'legislation OKF Explorer acceptance',
      expectedCompletedBuild: COMPLETED_BUILD_REQUIREMENT,
      deadline
    });
    invariant(
      lockAttestation.ownerPid === process.ppid,
      'Explorer legislation acceptance runner is not a direct child of the attested checkout-scoped wrapper'
    );
    const layout = await prepareEvidenceLayout(path.dirname(outputPath));
    const executableBefore = await readExecutableMaterials(deadline);
    let packageDocument;
    try {
      packageDocument = JSON.parse(executableBefore.get('package').bytes.toString('utf8'));
    } catch {
      throw new Error('Explorer package metadata is not valid JSON');
    }
    invariant(
      packageDocument?.name === '@okf/explorer' &&
        typeof packageDocument.version === 'string',
      'Explorer package metadata has an unexpected name or version'
    );

    const initialBuildInspection = await inspectRuntimeBuildRoot(deadline);
    verifyCompletedBuildInspection(
      lockAttestation.completedBuild,
      initialBuildInspection,
      executableBefore.get('deterministic_build').bytes
    );

    const [explorerStateBefore, candidateStateBefore] = await Promise.all([
      repositoryState(REPOSITORY_ROOT, explorerTag, deadline),
      repositoryState(bundleRoot, null, deadline)
    ]);
    invariant(
      explorerStateBefore.root === await realpath(REPOSITORY_ROOT),
      'Explorer Git identity was derived from a different checkout'
    );
    invariant(
      await realpath(bundleRoot) === await realpath(path.join(candidateStateBefore.root, 'bundle')),
      'The legislation bundle is not the candidate repository publication root'
    );
    if (releaseBound) {
      invariant(
        packageDocument.version === EXPLORER_RELEASE_VERSION,
        `Release acceptance requires Explorer package ${EXPLORER_RELEASE_VERSION}`
      );
      invariant(explorerStateBefore.clean, 'Release acceptance requires a clean Explorer checkout');
      invariant(candidateStateBefore.clean, 'Release acceptance requires a clean legislation candidate checkout');
      invariant(
        explorerStateBefore.tag_object &&
          explorerStateBefore.tag_type === 'tag' &&
          explorerStateBefore.tag_commit === explorerStateBefore.commit,
        `Explorer ${EXPLORER_RELEASE_TAG} is not an annotated tag resolving to the running commit`
      );
      invariant(
        explorerTag === `v${packageDocument.version}`,
        'Explorer package version and release tag differ'
      );
    }

    snapshotParent = await mkdtemp(path.join(tmpdir(), 'okf-legislation-acceptance-'));
    const snapshotMetadata = await lstat(snapshotParent);
    invariant(
      snapshotMetadata.isDirectory() && !snapshotMetadata.isSymbolicLink() &&
        (snapshotMetadata.mode & 0o077) === 0,
      'Acceptance snapshot parent is not a private real directory'
    );
    const bundleSnapshotRoot = path.join(snapshotParent, 'bundle');
    const buildSnapshotRoot = path.join(snapshotParent, 'explorer-build');
    const [bundleSnapshot, buildSnapshot] = await Promise.all([
      scanTree({
        root: bundleRoot,
        snapshotRoot: bundleSnapshotRoot,
        kind: 'bundle',
        deadline
      }),
      scanTree({
        root: BUILD_ROOT,
        snapshotRoot: buildSnapshotRoot,
        kind: 'build',
        deadline
      })
    ]);
    const buildInspection = await inspectCanonicalBuildRoot(
      buildSnapshotRoot,
      { deadline }
    );
    verifyCompletedBuildInspection(
      lockAttestation.completedBuild,
      buildInspection,
      executableBefore.get('deterministic_build').bytes
    );
    const [federationDescriptor, legislationDescriptor] = await Promise.all([
      readSnapshotMaterial(
        bundleSnapshot,
        EVIDENCE_FEDERATION_DESCRIPTOR_PATH,
        'Legislation bundle snapshot'
      ),
      readSnapshotMaterial(
        bundleSnapshot,
        EVIDENCE_LEGISLATION_DESCRIPTOR_PATH,
        'Legislation bundle snapshot'
      )
    ]);

    if (releaseBound) {
      const observedBinding = buildFrozenReleaseBinding({
        candidateCommit: candidateStateBefore.commit,
        candidateTree: candidateStateBefore.tree,
        candidateBundleTree: bundleSnapshot.identity.sha256,
        explorerCommit: explorerStateBefore.commit,
        explorerTag
      });
      verifyFrozenReleaseBinding(releaseBinding, observedBinding);
    }

    const transfers = [];
    const telemetry = {
      telemetry_bytes: 0,
      transfer_wire_bytes: 0,
      transfer_decoded_bytes: 0
    };
    const currentRun = { browser: 'preflight', phase: 'preflight' };
    const capturedScreenshots = [];
    const serverState = {
      failure: null,
      pending_rows: 0,
      pending_wire_bytes: 0,
      pending_decoded_bytes: 0,
      inflight_requests: 0,
      inflight_decoded_bytes: 0,
      peak_inflight_requests: 0,
      peak_inflight_decoded_bytes: 0
    };
    server = createAcceptanceServer(
      transfers,
      currentRun,
      { bundle: bundleSnapshot, build: buildSnapshot },
      telemetry,
      deadline,
      serverState
    );
    await withinDeadline(
      new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(PORT, HOST, resolve);
      }),
      deadline,
      'Acceptance server startup'
    );
    await waitForServer(deadline);

    const runs = [];
    const failures = [];
    for (const [name, type] of [['chrome', chromium], ['firefox', firefox], ['webkit', webkit]]) {
      try {
        const run = await runBrowser(
          name,
          type,
          transfers,
          currentRun,
          capturedScreenshots,
          deadline
        );
        retainTelemetry(telemetry, run, `${name} browser evidence`);
        runs.push(run);
      } catch (error) {
        const failure = sanitisedFailure(error, name);
        retainTelemetry(telemetry, failure, `${name} failure evidence`);
        runs.push(failure);
        failures.push(`${name}:acceptance-error:${failure.error.detail_sha256}`);
      }
    }
    await closeAcceptanceServer(server);
    server = null;
    assertAcceptanceServerHealthy(serverState);

    const lockAttestationAfter = await verifyAcceptanceInvocationLock({
      checkoutRoot: REPOSITORY_ROOT,
      expectedPurpose: 'legislation OKF Explorer acceptance',
      expectedCompletedBuild: COMPLETED_BUILD_REQUIREMENT,
      deadline
    });
    invariant(
      lockAttestationAfter.ownerPid === process.ppid &&
        JSON.stringify(completedBuildReceiptProjection(lockAttestationAfter.completedBuild)) ===
          JSON.stringify(completedBuildReceiptProjection(lockAttestation.completedBuild)),
      'Completed-build or checkout-lock attestation changed during runtime acceptance'
    );
    const [
      bundleSourceAfter,
      buildSourceAfter,
      bundleSnapshotAfter,
      buildSnapshotAfter,
      explorerStateAfter,
      candidateStateAfter
    ] = await Promise.all([
      scanTree({ root: bundleRoot, kind: 'bundle', deadline }),
      scanTree({ root: BUILD_ROOT, kind: 'build', deadline }),
      scanTree({ root: bundleSnapshotRoot, kind: 'bundle', deadline }),
      scanTree({ root: buildSnapshotRoot, kind: 'build', deadline }),
      repositoryState(REPOSITORY_ROOT, explorerTag, deadline),
      repositoryState(bundleRoot, null, deadline)
    ]);
    invariant(
      sameTreeIdentity(bundleSnapshot, bundleSourceAfter) &&
        sameTreeIdentity(bundleSnapshot, bundleSnapshotAfter),
      'Legislation source or private snapshot changed during runtime acceptance'
    );
    invariant(
      sameTreeIdentity(buildSnapshot, buildSourceAfter) &&
        sameTreeIdentity(buildSnapshot, buildSnapshotAfter),
      'Explorer build source or private snapshot changed during runtime acceptance'
    );
    verifyRepositoryStateStable(explorerStateBefore, explorerStateAfter, 'Explorer');
    verifyRepositoryStateStable(candidateStateBefore, candidateStateAfter, 'Legislation candidate');
    const buildInspectionAfter = await inspectCanonicalBuildRoot(
      buildSnapshotRoot,
      { deadline }
    );
    invariant(
      buildInspection.manifestBytes.equals(buildInspectionAfter.manifestBytes),
      'Private Explorer build snapshot changed during runtime acceptance'
    );

    const completed = runs.filter((run) => run.status === 'passed');
    const named = Object.fromEntries(runs.map((run) => [run.browser, run]));
    const screenshots = [];
    if (named.chrome?.status === 'passed') {
      invariant(
        capturedScreenshots.length === ACCEPTANCE_LIMITS.max_screenshots &&
          JSON.stringify(capturedScreenshots.map((value) => value.name)) ===
            JSON.stringify([
              'legislation-runtime-graph-chrome.png',
              'legislation-runtime-chrome.png'
            ]),
        'Current Chrome screenshot set is incomplete or unexpected'
      );
      for (const screenshot of capturedScreenshots) {
        screenshots.push(
          await captureEvidenceMaterial(
            layout,
            `${EVIDENCE_SCREENSHOT_ROOT}/${screenshot.name}`,
            screenshot.bytes,
            deadline
          )
        );
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
    const executableEvidence = {};
    for (const [name, value] of executableBefore) {
      executableEvidence[name] = await captureEvidenceMaterial(
        layout,
        value.material.path,
        value.bytes,
        deadline
      );
    }
    const runnerMaterial = executableEvidence.runner;
    const federationMaterial = await captureEvidenceMaterial(
      layout,
      `${EVIDENCE_BUNDLE_ROOT}/${EVIDENCE_FEDERATION_DESCRIPTOR_PATH}`,
      federationDescriptor,
      deadline
    );
    const legislationMaterial = await captureEvidenceMaterial(
      layout,
      `${EVIDENCE_BUNDLE_ROOT}/${EVIDENCE_LEGISLATION_DESCRIPTOR_PATH}`,
      legislationDescriptor,
      deadline
    );
    const explorerBuild = await captureAppBuildEvidence(
      buildInspection,
      (relative, bytes) =>
        captureEvidenceMaterial(layout, relative, bytes, deadline),
      EVIDENCE_BUILD_ROOT
    );
    const executableAfter = await readExecutableMaterials(deadline);
    verifyExecutableMaterials(executableBefore, executableAfter);

    const privateSnapshotPath = snapshotParent;
    await removePrivateSnapshot(snapshotParent, {
      deadline: Math.min(
        deadline,
        Date.now() + ACCEPTANCE_LIMITS.cleanup_ms
      )
    });
    snapshotParent = null;

    const inputs = {
      bundle_root: EVIDENCE_BUNDLE_ROOT,
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
      receipt: OUTPUT_BASENAME,
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
      scope: 'Production Explorer build and final local UK legislation publication served only from private byte-copy snapshots whose complete source and snapshot identities were verified before and after the browser journeys.',
      runner: runnerMaterial,
      invocation: {
        mode: 'checkout-scoped-single-writer-wrapper',
        evidence_class: releaseBound ? 'release' : 'diagnostic',
        release_eligible: releaseBound && overall === 'passed',
        purpose: lockAttestation.purpose,
        owner_pid: lockAttestation.ownerPid,
        acquired_at: lockAttestation.acquiredAt,
        parent_pid_verified: true,
        deterministic_build_precedes_runner: true,
        completed_build_reverified_after_browsers: true,
        completed_build: completedBuildReceiptProjection(lockAttestation.completedBuild),
        executable_materials: executableEvidence,
        repository_identity: {
          explorer: {
            ...repositoryStateProjection(explorerStateBefore),
            package_name: packageDocument.name,
            package_version: packageDocument.version
          },
          candidate: {
            commit: candidateStateBefore.commit,
            tree: candidateStateBefore.tree,
            clean: candidateStateBefore.clean,
            dirty_entries: candidateStateBefore.dirty_entries,
            bundle_tree: bundleSnapshot.identity
          }
        },
        snapshots: {
          mode: 'private-byte-copy-read-only-files',
          source_and_snapshot_reverified: true,
          cleanup_completed_before_receipt: true,
          bundle: {
            entries: bundleSnapshot.entries,
            ...bundleSnapshot.identity
          },
          explorer_build: {
            entries: buildSnapshot.entries,
            ...buildSnapshot.identity
          }
        },
        resources: {
          limits: ACCEPTANCE_LIMITS,
          observed: {
            duration_ms: 0,
            transfer_rows: transfers.length,
            transfer_wire_bytes: telemetry.transfer_wire_bytes,
            transfer_decoded_bytes: telemetry.transfer_decoded_bytes,
            telemetry_bytes: telemetry.telemetry_bytes,
            peak_inflight_requests: serverState.peak_inflight_requests,
            peak_inflight_decoded_bytes:
              serverState.peak_inflight_decoded_bytes,
            screenshots: screenshots.length,
            screenshot_bytes: screenshots.reduce((total, item) => total + item.bytes, 0)
          }
        }
      },
      inputs,
      outputs,
      gates,
      browsers: runs,
      failures,
      limitations: [
        'The nominated browser-memory measure is the Explorer renderer JavaScript heap exposed by Chrome CDP; Firefox and WebKit do not expose that metric and are recorded unavailable, not passed.',
        'Live official full-text search is deliberately stubbed so network availability cannot alter search latency or results.',
        'A diagnostic invocation is deliberately release-ineligible even when its individual browser and integrity checks pass.'
      ]
    };
    assertNoSensitiveRuntimeData(receipt, [
      REPOSITORY_ROOT,
      bundleRoot,
      path.dirname(bundleRoot),
      BUILD_ROOT,
      privateSnapshotPath,
      layout.evidenceRoot,
      process.env.OKF_EXPLORER_ACCEPTANCE_LOCK_TOKEN || ''
    ]);
    remainingMilliseconds(deadline, 'Acceptance receipt preflight');
    const durationMs = Date.now() - startedAt;
    invariant(durationMs <= ACCEPTANCE_LIMITS.run_ms, 'Acceptance run exceeded its hard time bound');
    receipt.invocation.resources.observed.duration_ms = durationMs;
    const measuredReceiptBytes = boundedJsonByteLength(
      receipt,
      ACCEPTANCE_LIMITS.max_receipt_bytes - 1,
      { label: 'Acceptance receipt', indent: 2, deadline }
    ) + 1;
    remainingMilliseconds(deadline, 'Acceptance receipt serialisation');
    const receiptBytes = Buffer.from(
      `${JSON.stringify(receipt, null, 2)}\n`,
      'utf8'
    );
    remainingMilliseconds(deadline, 'Acceptance receipt serialisation');
    invariant(
      receiptBytes.length === measuredReceiptBytes,
      'Acceptance receipt byte preflight differs from serialised bytes'
    );
    await writeReceipt(layout, outputPath, receiptBytes, deadline);
    invariant(
      Date.now() - startedAt <= ACCEPTANCE_LIMITS.run_ms,
      'Acceptance receipt completed after the hard run deadline'
    );
    process.stdout.write(`${JSON.stringify({
      status: overall,
      output: OUTPUT_BASENAME,
      gates,
      failures,
      receipt_bytes: receiptBytes.length
    }, null, 2)}\n`);
    if (overall !== 'passed') process.exitCode = 1;
  } finally {
    if (server) {
      await withinDeadline(
        closeAcceptanceServer(server),
        Date.now() + 5_000,
        'Acceptance server cleanup'
      ).catch(() => {});
    }
    if (snapshotParent) {
      await removePrivateSnapshot(snapshotParent);
      snapshotParent = null;
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
  } catch (error) {
    console.error(redactedDiagnostic(error));
    process.exitCode = 1;
  }
}
