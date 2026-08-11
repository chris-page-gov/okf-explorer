import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { lstat, open, unlink } from 'node:fs/promises';
import path from 'node:path';

import {
  BUILD_MANIFEST_FILENAME,
  inspectCanonicalBuildRoot
} from './app_build_manifest.mjs';

export const ACCEPTANCE_LOCK_BASENAME = '.okf-explorer-acceptance.lock';
export const ACCEPTANCE_LOCK_ENVIRONMENT = Object.freeze({
  path: 'OKF_EXPLORER_ACCEPTANCE_LOCK_PATH',
  token: 'OKF_EXPLORER_ACCEPTANCE_LOCK_TOKEN',
  purpose: 'OKF_EXPLORER_ACCEPTANCE_LOCK_PURPOSE'
});
export const COMPLETED_BUILD_ATTESTATION_SCHEMA =
  'okf-explorer-completed-build-attestation.v1';
const DEFAULT_COMMAND_TIMEOUT_MS = 20 * 60 * 1000 + 15_000;
const MAX_LOCK_DOCUMENT_BYTES = 1024 * 1024;
const MAX_BUILD_SCRIPT_BYTES = 32 * 1024 * 1024;
const MAX_LOCK_VERIFICATION_MS = 5 * 60 * 1000;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function boundedDeadline(requested, label) {
  const now = Date.now();
  const deadline = requested ?? now + MAX_LOCK_VERIFICATION_MS;
  invariant(Number.isFinite(deadline), `${label} deadline must be finite`);
  const bounded = Math.min(deadline, now + MAX_LOCK_VERIFICATION_MS);
  invariant(now < bounded, `${label} exceeded its deadline`);
  return bounded;
}

function beforeDeadline(deadline, label) {
  invariant(Date.now() < deadline, `${label} exceeded its deadline`);
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

async function readExactBoundedHandle(handle, size, maxBytes, label, deadline) {
  invariant(
    Number.isSafeInteger(size) && size > 0 && size <= maxBytes,
    `${label} exceeds its byte bound`
  );
  beforeDeadline(deadline, label);
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    beforeDeadline(deadline, label);
    const { bytesRead } = await handle.read(
      bytes,
      offset,
      Math.min(1024 * 1024, size - offset),
      offset
    );
    beforeDeadline(deadline, label);
    invariant(bytesRead > 0, `${label} was truncated while it was read`);
    offset += bytesRead;
  }
  beforeDeadline(deadline, label);
  const probe = Buffer.allocUnsafe(1);
  const { bytesRead: extraBytes } = await handle.read(probe, 0, 1, size);
  beforeDeadline(deadline, label);
  invariant(extraBytes === 0, `${label} grew while it was read`);
  return bytes;
}

async function readStableIndependentFile(
  filePath,
  label,
  maxBytes = MAX_LOCK_DOCUMENT_BYTES,
  requestedDeadline = null
) {
  const deadline = boundedDeadline(requestedDeadline, label);
  beforeDeadline(deadline, label);
  const before = await lstat(filePath);
  beforeDeadline(deadline, label);
  invariant(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `${label} must be an independent regular file`
  );
  invariant(
    before.size > 0 && before.size <= maxBytes,
    `${label} exceeds its byte bound`
  );
  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0);
  beforeDeadline(deadline, label);
  const handle = await open(filePath, flags);
  try {
    beforeDeadline(deadline, label);
    const opened = await handle.stat();
    beforeDeadline(deadline, label);
    invariant(
      opened.isFile() && opened.nlink === 1 &&
        before.dev === opened.dev && before.ino === opened.ino &&
        before.size === opened.size && opened.size <= maxBytes,
      `${label} changed before it was opened`
    );
    const bytes = await readExactBoundedHandle(
      handle,
      opened.size,
      maxBytes,
      label,
      deadline
    );
    beforeDeadline(deadline, label);
    const after = await handle.stat();
    beforeDeadline(deadline, label);
    const pathAfter = await lstat(filePath);
    beforeDeadline(deadline, label);
    invariant(
      after.isFile() && after.nlink === 1 && sameFileIdentity(opened, after),
      `${label} changed while it was being read`
    );
    invariant(
      bytes.length === opened.size && sameFileIdentity(before, pathAfter),
      `${label} was replaced while it was being read`
    );
    return bytes;
  } finally {
    await handle.close();
  }
}

function canonicalCommand(command) {
  invariant(command && typeof command === 'object', 'Completed-build command must be an object');
  invariant(
    typeof command.executable === 'string' && path.isAbsolute(command.executable),
    'Completed-build command executable must be absolute'
  );
  invariant(
    Array.isArray(command.args) && command.args.every((value) => typeof value === 'string'),
    'Completed-build command args must be a string array'
  );
  invariant(
    typeof command.cwd === 'string' && path.isAbsolute(command.cwd),
    'Completed-build command cwd must be absolute'
  );
  const value = {
    executable: command.executable,
    args: [...command.args],
    cwd: path.resolve(command.cwd)
  };
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
  return { ...value, sha256: sha256(bytes) };
}

function completedBuildRequirement(value, label = 'expectedCompletedBuild') {
  invariant(value && typeof value === 'object' && !Array.isArray(value), `${label} is required`);
  const command = canonicalCommand(value.command);
  invariant(
    typeof value.scriptPath === 'string' && path.isAbsolute(value.scriptPath),
    `${label}.scriptPath must be absolute`
  );
  invariant(
    typeof value.buildRoot === 'string' && path.isAbsolute(value.buildRoot),
    `${label}.buildRoot must be absolute`
  );
  const scriptPath = path.resolve(value.scriptPath);
  const buildRoot = path.resolve(value.buildRoot);
  invariant(
    command.args.length === 1 &&
      path.resolve(command.cwd, command.args[0]) === scriptPath,
    `${label}.command must execute exactly its declared deterministic-build script`
  );
  return { command, scriptPath, buildRoot };
}

async function currentCompletedBuildMaterials(
  requirement,
  owner,
  scriptBytes = null,
  requestedDeadline = null
) {
  const deadline = boundedDeadline(
    requestedDeadline,
    'completed-build material verification'
  );
  const bytes = scriptBytes || await readStableIndependentFile(
    requirement.scriptPath,
    'deterministic-build script',
    MAX_BUILD_SCRIPT_BYTES,
    deadline
  );
  beforeDeadline(deadline, 'completed-build material verification');
  const build = await inspectCanonicalBuildRoot(requirement.buildRoot, {
    deadline
  });
  beforeDeadline(deadline, 'completed-build material verification');
  return {
    owner_pid: owner.pid,
    owner_token_sha256: sha256(Buffer.from(owner.token, 'utf8')),
    command: requirement.command,
    deterministic_build_script: {
      path: requirement.scriptPath,
      bytes: bytes.length,
      sha256: sha256(bytes)
    },
    canonical_build: {
      root: requirement.buildRoot,
      manifest_path: path.join(requirement.buildRoot, BUILD_MANIFEST_FILENAME),
      manifest_bytes: build.manifestBytes.length,
      manifest_sha256: sha256(build.manifestBytes),
      manifest_schema: build.manifest.schema,
      algorithm: build.manifest.algorithm,
      files: build.manifest.file_count,
      tree_sha256: build.manifest.tree_sha256
    }
  };
}

function exactCompletedBuildMaterials(value) {
  return {
    owner_pid: value?.owner_pid,
    owner_token_sha256: value?.owner_token_sha256,
    command: value?.command,
    deterministic_build_script: value?.deterministic_build_script,
    canonical_build: value?.canonical_build
  };
}

function lockOwnerDocument(checkoutRoot, purpose) {
  return {
    schema: 'okf-explorer-acceptance-lock.v1',
    token: randomUUID(),
    pid: process.pid,
    acquired_at: new Date().toISOString(),
    checkout_root: path.resolve(checkoutRoot),
    purpose
  };
}

async function existingOwnerSummary(lockPath) {
  try {
    const owner = JSON.parse((await readStableIndependentFile(
      lockPath,
      'existing acceptance lock owner document'
    )).toString('utf8'));
    const pid = Number.isSafeInteger(owner?.pid) ? `pid ${owner.pid}` : 'unknown pid';
    const purpose = typeof owner?.purpose === 'string' && owner.purpose.trim()
      ? owner.purpose.trim()
      : 'an Explorer acceptance invocation';
    return `${purpose}, ${pid}, acquired ${owner?.acquired_at || 'at an unknown time'}`;
  } catch {
    return 'owner details are unavailable';
  }
}

export function checkoutAcceptanceLockPath(checkoutRoot) {
  return path.join(path.resolve(checkoutRoot), ACCEPTANCE_LOCK_BASENAME);
}

function requiredAttestationValue(environment, name) {
  const value = environment?.[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `Explorer acceptance lock attestation is missing ${name}; this runner must be ` +
      'launched by the checkout-scoped acceptance wrapper.'
    );
  }
  return value;
}

function ownerProcessIsLive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function verifyAcceptanceInvocationLock({
  checkoutRoot,
  environment = process.env,
  expectedPurpose = null,
  expectedCompletedBuild,
  deadline: requestedDeadline = null
} = {}) {
  const deadline = boundedDeadline(
    requestedDeadline,
    'Explorer acceptance lock verification'
  );
  beforeDeadline(deadline, 'Explorer acceptance lock verification');
  if (typeof checkoutRoot !== 'string' || !path.isAbsolute(checkoutRoot)) {
    throw new Error('Explorer acceptance lock verification requires an absolute checkoutRoot');
  }
  const resolvedRoot = path.resolve(checkoutRoot);
  const expectedLockPath = checkoutAcceptanceLockPath(resolvedRoot);
  const attestedLockPath = requiredAttestationValue(
    environment,
    ACCEPTANCE_LOCK_ENVIRONMENT.path
  );
  const attestedToken = requiredAttestationValue(
    environment,
    ACCEPTANCE_LOCK_ENVIRONMENT.token
  );
  const attestedPurpose = requiredAttestationValue(
    environment,
    ACCEPTANCE_LOCK_ENVIRONMENT.purpose
  );
  if (attestedLockPath !== expectedLockPath) {
    throw new Error(
      `Explorer acceptance lock attestation points outside the expected checkout: ${attestedLockPath}`
    );
  }

  let owner;
  try {
    const ownerBytes = await readStableIndependentFile(
      attestedLockPath,
      'acceptance lock owner document',
      MAX_LOCK_DOCUMENT_BYTES,
      deadline
    );
    beforeDeadline(deadline, 'Explorer acceptance lock owner parsing');
    owner = JSON.parse(ownerBytes.toString('utf8'));
    beforeDeadline(deadline, 'Explorer acceptance lock owner parsing');
  } catch (error) {
    throw new Error(
      `Explorer acceptance lock attestation cannot read its live owner document: ` +
      `${attestedLockPath} (${error.message})`
    );
  }
  if (
    owner?.schema !== 'okf-explorer-acceptance-lock.v1' ||
    owner?.token !== attestedToken ||
    owner?.checkout_root !== resolvedRoot ||
    owner?.purpose !== attestedPurpose
  ) {
    throw new Error(
      'Explorer acceptance lock attestation does not match the live lock owner, token, ' +
      'checkout and purpose.'
    );
  }
  if (expectedPurpose !== null && owner.purpose !== expectedPurpose) {
    throw new Error(
      `Explorer acceptance lock purpose mismatch: expected ${expectedPurpose}; got ${owner.purpose}`
    );
  }
  if (!ownerProcessIsLive(owner.pid)) {
    throw new Error(
      `Explorer acceptance lock owner process ${owner?.pid || '(missing)'} is not live`
    );
  }
  const requirement = completedBuildRequirement(expectedCompletedBuild);
  const completedBuild = owner.completed_build;
  if (
    !completedBuild ||
    completedBuild.schema !== COMPLETED_BUILD_ATTESTATION_SCHEMA
  ) {
    throw new Error(
      'Explorer acceptance lock has no completed deterministic-build attestation; ' +
      'the runner cannot start before the wrapper build step succeeds.'
    );
  }
  const completedAt = Date.parse(completedBuild.completed_at);
  const acquiredAt = Date.parse(owner.acquired_at);
  invariant(
    Number.isFinite(completedAt) && Number.isFinite(acquiredAt) && completedAt >= acquiredAt,
    'Explorer completed deterministic-build attestation has an invalid completion time'
  );
  const currentMaterials = await currentCompletedBuildMaterials(
    requirement,
    owner,
    null,
    deadline
  );
  beforeDeadline(deadline, 'Explorer acceptance lock verification');
  const expectedMaterialsJson = JSON.stringify(
    exactCompletedBuildMaterials(completedBuild)
  );
  beforeDeadline(deadline, 'Explorer acceptance lock verification');
  const currentMaterialsJson = JSON.stringify(currentMaterials);
  beforeDeadline(deadline, 'Explorer acceptance lock verification');
  invariant(
    expectedMaterialsJson === currentMaterialsJson,
    'Explorer completed deterministic-build attestation differs from the exact current script, command or canonical build'
  );
  return {
    lockPath: attestedLockPath,
    checkoutRoot: resolvedRoot,
    purpose: owner.purpose,
    ownerPid: owner.pid,
    acquiredAt: owner.acquired_at,
    completedBuild: {
      schema: completedBuild.schema,
      completed_at: completedBuild.completed_at,
      ...currentMaterials
    }
  };
}

async function persistCompletedBuild(lock, completedBuild) {
  const deadline = boundedDeadline(
    null,
    'Explorer completed-build attestation persistence'
  );
  invariant(
    completedBuild?.schema === COMPLETED_BUILD_ATTESTATION_SCHEMA,
    'Cannot persist an invalid completed deterministic-build attestation'
  );
  const flags = fsConstants.O_RDWR | (fsConstants.O_NOFOLLOW || 0);
  const before = await lstat(lock.path);
  invariant(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `Explorer acceptance lock is not an independent regular file: ${lock.path}`
  );
  const handle = await open(lock.path, flags);
  try {
    const info = await handle.stat();
    invariant(
      info.isFile() && info.nlink === 1 &&
        info.dev === before.dev && info.ino === before.ino &&
        info.size === before.size && info.size <= MAX_LOCK_DOCUMENT_BYTES,
      `Explorer acceptance lock is not an independent regular file: ${lock.path}`
    );
    const currentBytes = await readExactBoundedHandle(
      handle,
      info.size,
      MAX_LOCK_DOCUMENT_BYTES,
      'acceptance lock owner document',
      deadline
    );
    beforeDeadline(deadline, 'Explorer completed-build attestation parsing');
    const current = JSON.parse(currentBytes.toString('utf8'));
    beforeDeadline(deadline, 'Explorer completed-build attestation parsing');
    invariant(
      current?.schema === 'okf-explorer-acceptance-lock.v1' &&
        current.token === lock.owner.token &&
        current.pid === lock.owner.pid &&
        current.checkout_root === lock.owner.checkout_root &&
        current.purpose === lock.owner.purpose,
      `Explorer acceptance lock ownership changed before build attestation: ${lock.path}`
    );
    invariant(
      current.completed_build === undefined,
      `Explorer acceptance lock already contains a completed build attestation: ${lock.path}`
    );
    const next = { ...current, completed_build: completedBuild };
    beforeDeadline(deadline, 'Explorer completed-build attestation serialisation');
    const bytes = Buffer.from(`${JSON.stringify(next, null, 2)}\n`, 'utf8');
    beforeDeadline(deadline, 'Explorer completed-build attestation serialisation');
    invariant(
      bytes.length <= MAX_LOCK_DOCUMENT_BYTES,
      'Explorer completed-build lock attestation exceeds its byte bound'
    );
    let offset = 0;
    while (offset < bytes.length) {
      beforeDeadline(deadline, 'Explorer completed-build attestation write');
      const { bytesWritten } = await handle.write(
        bytes,
        offset,
        bytes.length - offset,
        offset
      );
      beforeDeadline(deadline, 'Explorer completed-build attestation write');
      invariant(bytesWritten > 0, 'Explorer acceptance lock attestation write made no progress');
      offset += bytesWritten;
    }
    beforeDeadline(deadline, 'Explorer completed-build attestation truncation');
    await handle.truncate(bytes.length);
    beforeDeadline(deadline, 'Explorer completed-build attestation synchronisation');
    await handle.sync();
    beforeDeadline(deadline, 'Explorer completed-build attestation synchronisation');
    const pathAfter = await lstat(lock.path);
    invariant(
      pathAfter.isFile() && pathAfter.nlink === 1 &&
        pathAfter.dev === info.dev && pathAfter.ino === info.ino,
      `Explorer acceptance lock path changed during build attestation: ${lock.path}`
    );
  } finally {
    await handle.close();
  }
  const persistedBytes = await readStableIndependentFile(
    lock.path,
    'acceptance lock owner document',
    MAX_LOCK_DOCUMENT_BYTES,
    deadline
  );
  beforeDeadline(deadline, 'Explorer completed-build attestation parsing');
  const persisted = JSON.parse(persistedBytes.toString('utf8'));
  beforeDeadline(deadline, 'Explorer completed-build attestation parsing');
  invariant(
    persisted?.token === lock.owner.token &&
      JSON.stringify(persisted.completed_build) === JSON.stringify(completedBuild),
    `Explorer completed deterministic-build attestation was not durably persisted: ${lock.path}`
  );
  lock.owner.completed_build = completedBuild;
}

export async function acquireCheckoutAcceptanceLock(
  checkoutRoot,
  purpose = 'OKF Explorer acceptance'
) {
  const resolvedRoot = path.resolve(checkoutRoot);
  const lockPath = checkoutAcceptanceLockPath(resolvedRoot);
  const owner = lockOwnerDocument(resolvedRoot, purpose);
  let handle;
  let created = false;
  try {
    handle = await open(lockPath, 'wx', 0o600);
    created = true;
    await handle.writeFile(`${JSON.stringify(owner, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    if (error?.code === 'EEXIST') {
      const summary = await existingOwnerSummary(lockPath);
      throw new Error(
        `Concurrent OKF Explorer acceptance invocation refused: the checkout-scoped lock ` +
        `${lockPath} is already held (${summary}). No deterministic build output was ` +
        'touched, Chromium was not launched, and no receipt was created by this invocation. ' +
        'If no invocation is active, inspect and remove the stale lock before retrying.'
      );
    }
    if (created) await unlink(lockPath).catch(() => undefined);
    throw error;
  }

  let released = false;
  return {
    path: lockPath,
    owner,
    async release() {
      if (released) return;
      let current;
      try {
        current = JSON.parse((await readStableIndependentFile(
          lockPath,
          'acceptance lock owner document'
        )).toString('utf8'));
      } catch (error) {
        throw new Error(`Explorer acceptance lock cannot be verified before release: ${lockPath} (${error.message})`);
      }
      if (current?.token !== owner.token) {
        throw new Error(`Explorer acceptance lock ownership changed before release: ${lockPath}`);
      }
      await unlink(lockPath);
      released = true;
    }
  };
}

function validateCommand(command, index) {
  if (!command || typeof command !== 'object') {
    throw new Error(`Acceptance command ${index + 1} must be an object`);
  }
  if (typeof command.executable !== 'string' || !command.executable) {
    throw new Error(`Acceptance command ${index + 1} requires an executable`);
  }
  if (!Array.isArray(command.args) || !command.args.every((value) => typeof value === 'string')) {
    throw new Error(`Acceptance command ${index + 1} args must be a string array`);
  }
  if (typeof command.cwd !== 'string' || !path.isAbsolute(command.cwd)) {
    throw new Error(`Acceptance command ${index + 1} cwd must be an absolute path`);
  }
  if (command.timeoutMs !== undefined && (
    !Number.isSafeInteger(command.timeoutMs) ||
      command.timeoutMs < 1 ||
      command.timeoutMs > 60 * 60 * 1000
  )) {
    throw new Error(
      `Acceptance command ${index + 1} timeoutMs must be an integer from 1 to 3600000`
    );
  }
  if (command.completedBuild !== undefined) {
    completedBuildRequirement({
      command,
      scriptPath: command.completedBuild?.scriptPath,
      buildRoot: command.completedBuild?.buildRoot
    }, `Acceptance command ${index + 1} completedBuild`);
  }
}

async function prepareCompletedBuild(command) {
  if (command.completedBuild === undefined) return null;
  const requirement = completedBuildRequirement({
    command,
    scriptPath: command.completedBuild.scriptPath,
    buildRoot: command.completedBuild.buildRoot
  }, 'Acceptance completedBuild');
  return {
    requirement,
    scriptBytes: await readStableIndependentFile(
      requirement.scriptPath,
      'deterministic-build script before execution',
      MAX_BUILD_SCRIPT_BYTES
    )
  };
}

async function attestCompletedBuild(lock, prepared) {
  const scriptAfter = await readStableIndependentFile(
    prepared.requirement.scriptPath,
    'deterministic-build script after execution',
    MAX_BUILD_SCRIPT_BYTES
  );
  invariant(
    prepared.scriptBytes.equals(scriptAfter),
    'Deterministic-build script changed while its command executed'
  );
  const materials = await currentCompletedBuildMaterials(
    prepared.requirement,
    lock.owner,
    scriptAfter
  );
  await persistCompletedBuild(lock, {
    schema: COMPLETED_BUILD_ATTESTATION_SCHEMA,
    completed_at: new Date().toISOString(),
    ...materials
  });
}

const TERMINATION_GRACE_MS = 3000;
const TERMINATION_VERIFICATION_MS = 1000;
const TERMINATION_POLL_MS = 25;

function signalProcessGroup(processGroup, signal, bestEffort = false) {
  if (!processGroup) return false;
  try {
    if (process.platform !== 'win32' && processGroup.processGroupId) {
      process.kill(-processGroup.processGroupId, signal);
    } else {
      if (
        !processGroup.child?.pid ||
        processGroup.child.exitCode !== null ||
        processGroup.child.signalCode !== null
      ) {
        return false;
      }
      processGroup.child.kill(signal);
    }
    return true;
  } catch (error) {
    // EPERM can race with another termination attempt while the final group
    // member is disappearing. The subsequent liveness check remains the
    // authority: a persistent, unverifiable group still prevents lock release.
    if (error?.code === 'ESRCH' || error?.code === 'EPERM' || bestEffort) return false;
    throw error;
  }
}

function processGroupIsLive(processGroup) {
  if (process.platform !== 'win32' && processGroup.processGroupId) {
    try {
      process.kill(-processGroup.processGroupId, 0);
      return true;
    } catch (error) {
      if (error?.code === 'ESRCH') return false;
      if (error?.code === 'EPERM') return true;
      throw error;
    }
  }
  return Boolean(
    processGroup.child?.pid &&
    processGroup.child.exitCode === null &&
    processGroup.child.signalCode === null
  );
}

function liveProcessGroups(processGroups) {
  return processGroups.filter((processGroup) => processGroupIsLive(processGroup));
}

async function waitForProcessGroupsToExit(processGroups, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let live = liveProcessGroups(processGroups);
  while (live.length && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(
      resolve,
      Math.min(TERMINATION_POLL_MS, Math.max(1, deadline - Date.now()))
    ));
    live = liveProcessGroups(live);
  }
  return live;
}

async function terminateRegisteredProcessGroups(state) {
  const registered = [...state.processGroups];
  let live = liveProcessGroups(registered);
  for (const processGroup of registered) {
    if (!live.includes(processGroup)) state.processGroups.delete(processGroup);
  }
  if (!live.length) return;

  for (const processGroup of live) signalProcessGroup(processGroup, 'SIGTERM');
  live = await waitForProcessGroupsToExit(live, TERMINATION_GRACE_MS);
  for (const processGroup of registered) {
    if (!live.includes(processGroup)) state.processGroups.delete(processGroup);
  }
  if (!live.length) return;

  for (const processGroup of live) signalProcessGroup(processGroup, 'SIGKILL');
  live = await waitForProcessGroupsToExit(live, TERMINATION_VERIFICATION_MS);
  for (const processGroup of registered) {
    if (!live.includes(processGroup)) state.processGroups.delete(processGroup);
  }
  if (live.length) {
    const identities = live.map((processGroup) =>
      processGroup.processGroupId
        ? `process group ${processGroup.processGroupId}`
        : `child process ${processGroup.child?.pid || 'with an unknown PID'}`
    );
    throw new Error(
      `Explorer acceptance could not verify termination of ${identities.join(', ')} after SIGKILL`
    );
  }
}

function runCommand(command, state, lock) {
  return new Promise((resolve, reject) => {
    const timeoutMs = command.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const child = spawn(command.executable, command.args, {
      cwd: command.cwd,
      env: {
        ...(command.env || process.env),
        [ACCEPTANCE_LOCK_ENVIRONMENT.path]: lock.path,
        [ACCEPTANCE_LOCK_ENVIRONMENT.token]: lock.owner.token,
        [ACCEPTANCE_LOCK_ENVIRONMENT.purpose]: lock.owner.purpose
      },
      stdio: command.stdio || 'inherit',
      detached: process.platform !== 'win32'
    });
    const processGroup = {
      child,
      label: command.label || command.executable,
      processGroupId: process.platform !== 'win32' && Number.isSafeInteger(child.pid)
        ? child.pid
        : null
    };
    state.processGroups.add(processGroup);
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      signalProcessGroup(processGroup, 'SIGTERM', true);
      reject(new Error(
        `${command.label || command.executable} exceeded its hard ${timeoutMs} ms command deadline`
      ));
    }, timeoutMs);
    timeout.unref();

    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (state.interruptedBy || code === 0) {
        resolve({ code, signal });
      } else {
        reject(new Error(
          `${command.label || command.executable} failed` +
          (signal ? ` after signal ${signal}` : ` with exit status ${code}`)
        ));
      }
    });
  });
}

export async function runSingleWriterAcceptance({
  checkoutRoot,
  commands,
  purpose = 'OKF Explorer acceptance'
}) {
  if (!Array.isArray(commands) || !commands.length) {
    throw new Error('Explorer acceptance requires at least one command');
  }
  commands.forEach(validateCommand);
  const completedBuildCommands = commands
    .map((command, index) => command.completedBuild === undefined ? -1 : index)
    .filter((index) => index >= 0);
  if (completedBuildCommands.length > 1 || completedBuildCommands[0] > 0) {
    throw new Error(
      'Explorer acceptance permits at most one completed-build command and it must run first'
    );
  }

  const state = { processGroups: new Set(), interruptedBy: null };
  let forcedTermination = null;
  let lock = null;
  const signalHandlers = new Map();
  for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
    const handler = () => {
      if (!state.interruptedBy) {
        state.interruptedBy = signal;
        for (const processGroup of state.processGroups) {
          signalProcessGroup(processGroup, signal, true);
        }
        forcedTermination = setTimeout(() => {
          for (const processGroup of state.processGroups) {
            signalProcessGroup(processGroup, 'SIGKILL', true);
          }
        }, TERMINATION_GRACE_MS);
        forcedTermination.unref();
      } else {
        for (const processGroup of state.processGroups) {
          signalProcessGroup(processGroup, 'SIGKILL', true);
        }
      }
    };
    signalHandlers.set(signal, handler);
    process.on(signal, handler);
  }

  let commandError = null;
  let cleanupError = null;
  let releaseError = null;
  try {
    lock = await acquireCheckoutAcceptanceLock(checkoutRoot, purpose);
    for (const command of commands) {
      if (state.interruptedBy) break;
      let preparedCompletedBuild = null;
      try {
        preparedCompletedBuild = await prepareCompletedBuild(command);
        const commandToRun = preparedCompletedBuild
          ? { ...command, ...preparedCompletedBuild.requirement.command }
          : command;
        await runCommand(commandToRun, state, lock);
      } catch (error) {
        commandError = error;
      }
      try {
        await terminateRegisteredProcessGroups(state);
      } catch (error) {
        cleanupError = error;
      }
      if (!commandError && !cleanupError && !state.interruptedBy && preparedCompletedBuild) {
        try {
          await attestCompletedBuild(lock, preparedCompletedBuild);
        } catch (error) {
          commandError = error;
        }
      }
      if (commandError || cleanupError) break;
    }
  } catch (error) {
    commandError = error;
  } finally {
    if (!cleanupError) {
      try {
        await terminateRegisteredProcessGroups(state);
      } catch (error) {
        cleanupError = error;
      }
    }
    if (forcedTermination) clearTimeout(forcedTermination);
    if (lock && cleanupError) {
      cleanupError = new Error(
        `${cleanupError.message}. The checkout-scoped lock ${lock.path} was deliberately retained ` +
        'because descendant termination could not be verified before release.',
        { cause: cleanupError }
      );
    } else {
      try {
        await lock?.release();
      } catch (error) {
        releaseError = error;
      }
    }
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  }

  const errors = [commandError, cleanupError, releaseError].filter(Boolean);
  if (errors.length > 1) {
    throw new AggregateError(
      errors,
      errors.map((error) => error.message).join('; ')
    );
  }
  if (errors.length) throw errors[0];
  return { interruptedBy: state.interruptedBy };
}
