import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

import {
  ACCEPTANCE_LOCK_ENVIRONMENT,
  COMPLETED_BUILD_ATTESTATION_SCHEMA,
  acquireCheckoutAcceptanceLock,
  checkoutAcceptanceLockPath,
  runSingleWriterAcceptance,
  verifyAcceptanceInvocationLock
} from './acceptance_invocation_lock.mjs';
import {
  acceptanceCommands,
  deterministicBuildRequirement
} from './run_acceptance_invocation.mjs';

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const BUILD_MANIFEST_MODULE_URL = pathToFileURL(
  path.join(SCRIPT_ROOT, 'app_build_manifest.mjs')
).href;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function temporaryCheckout(context) {
  const root = await mkdtemp(path.join(tmpdir(), 'okf-explorer-acceptance-lock-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function absent(filePath) {
  try {
    await access(filePath);
    return false;
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
}

function nodeCommand(cwd, source, label = 'test command') {
  return {
    label,
    executable: process.execPath,
    args: ['--input-type=module', '--eval', source],
    cwd,
    stdio: 'ignore'
  };
}

async function fixtureBuildPlan(checkoutRoot, { failing = false } = {}) {
  const scriptPath = path.join(checkoutRoot, 'deterministic-build.mjs');
  const buildRoot = path.join(checkoutRoot, 'build');
  const source = failing
    ? 'process.exit(7);\n'
    : `
      import { mkdir, writeFile } from 'node:fs/promises';
      import path from 'node:path';
      import { writeCanonicalBuildManifest } from ${JSON.stringify(BUILD_MANIFEST_MODULE_URL)};
      const buildRoot = ${JSON.stringify(buildRoot)};
      await mkdir(buildRoot, { recursive: true });
      await writeFile(path.join(buildRoot, 'index.html'), '<main>attested build</main>\\n');
      await writeCanonicalBuildManifest(buildRoot);
    `;
  await writeFile(scriptPath, source, { mode: 0o600 });
  const requirement = {
    command: {
      executable: process.execPath,
      args: [scriptPath],
      cwd: checkoutRoot
    },
    scriptPath,
    buildRoot
  };
  return {
    requirement,
    command: {
      label: failing ? 'failing deterministic build' : 'fixture deterministic build',
      ...requirement.command,
      completedBuild: { scriptPath, buildRoot },
      stdio: 'ignore'
    }
  };
}

async function waitForFile(filePath) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

async function waitForProcessToDisappear(pid) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === 'ESRCH') return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for process ${pid} to terminate`);
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

test('refuses a second invocation before starting any command', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const marker = path.join(checkoutRoot, 'command-started');
  const lock = await acquireCheckoutAcceptanceLock(checkoutRoot, 'first test invocation');
  context.after(() => lock.release().catch(() => undefined));

  await assert.rejects(
    runSingleWriterAcceptance({
      checkoutRoot,
      commands: [
        nodeCommand(
          checkoutRoot,
          `await import('node:fs/promises').then(({ writeFile }) => writeFile(${JSON.stringify(marker)}, 'started'))`
        )
      ]
    }),
    (error) => {
      assert.match(error.message, /Concurrent OKF Explorer acceptance invocation refused/);
      assert.match(error.message, /No deterministic build output was touched/);
      assert.match(error.message, /Chromium was not launched/);
      assert.match(error.message, /no receipt was created/);
      return true;
    }
  );
  assert.equal(await absent(marker), true);
  await lock.release();
});

test('refuses an oversized existing lock before starting any command', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const lockPath = checkoutAcceptanceLockPath(checkoutRoot);
  const marker = path.join(checkoutRoot, 'command-started');
  await writeFile(lockPath, 'x'.repeat(1024 * 1024 + 1), { mode: 0o600 });

  await assert.rejects(
    runSingleWriterAcceptance({
      checkoutRoot,
      commands: [
        nodeCommand(
          checkoutRoot,
          `await import('node:fs/promises').then(({ writeFile }) => writeFile(${JSON.stringify(marker)}, 'started'))`
        )
      ]
    }),
    (error) => {
      assert.match(error.message, /Concurrent OKF Explorer acceptance invocation refused/);
      assert.match(error.message, /owner details are unavailable/);
      return true;
    }
  );
  assert.equal(await absent(marker), true);
});

test('rejects direct runner execution without a live wrapper lock attestation', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  await assert.rejects(
    verifyAcceptanceInvocationLock({ checkoutRoot, environment: {} }),
    /must be launched by the checkout-scoped acceptance wrapper/
  );
});

test('rejects an expired lock-verification deadline before reading attestation input', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  await assert.rejects(
    verifyAcceptanceInvocationLock({
      checkoutRoot,
      environment: {},
      deadline: Date.now() - 1
    }),
    /lock verification exceeded its deadline/
  );
});

test('custom lock acquisition and supplied environment cannot replace a completed build', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const purpose = 'custom acquisition without build';
  const build = await fixtureBuildPlan(checkoutRoot);
  const lock = await acquireCheckoutAcceptanceLock(checkoutRoot, purpose);
  context.after(() => lock.release().catch(() => undefined));
  const environment = {
    ...process.env,
    [ACCEPTANCE_LOCK_ENVIRONMENT.path]: lock.path,
    [ACCEPTANCE_LOCK_ENVIRONMENT.token]: lock.owner.token,
    [ACCEPTANCE_LOCK_ENVIRONMENT.purpose]: purpose,
    OKF_EXPLORER_COMPLETED_BUILD_ATTESTATION: JSON.stringify({ status: 'completed' })
  };

  await assert.rejects(
    verifyAcceptanceInvocationLock({
      checkoutRoot,
      environment,
      expectedPurpose: purpose,
      expectedCompletedBuild: build.requirement
    }),
    /no completed deterministic-build attestation/
  );
  await lock.release();
});

test('runner command observes the exact completed deterministic-build attestation', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const marker = path.join(checkoutRoot, 'verified-attestation.json');
  const purpose = 'attested test invocation';
  const build = await fixtureBuildPlan(checkoutRoot);
  const moduleUrl = pathToFileURL(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'acceptance_invocation_lock.mjs')
  ).href;
  const source = `
    import { writeFile } from 'node:fs/promises';
    import {
      ACCEPTANCE_LOCK_ENVIRONMENT,
      verifyAcceptanceInvocationLock
    } from ${JSON.stringify(moduleUrl)};
    const verified = await verifyAcceptanceInvocationLock({
      checkoutRoot: ${JSON.stringify(checkoutRoot)},
      expectedPurpose: ${JSON.stringify(purpose)},
      expectedCompletedBuild: ${JSON.stringify(build.requirement)}
    });
    await writeFile(
      ${JSON.stringify(marker)},
      JSON.stringify({
        ...verified,
        token: process.env[ACCEPTANCE_LOCK_ENVIRONMENT.token]
      })
    );
  `;
  await runSingleWriterAcceptance({
    checkoutRoot,
    purpose,
    commands: [
      build.command,
      {
        ...nodeCommand(checkoutRoot, source, 'attested child'),
        env: {
          ...process.env,
          [ACCEPTANCE_LOCK_ENVIRONMENT.path]: '/spoofed/lock',
          [ACCEPTANCE_LOCK_ENVIRONMENT.token]: 'spoofed-token',
          [ACCEPTANCE_LOCK_ENVIRONMENT.purpose]: 'spoofed purpose',
          OKF_EXPLORER_COMPLETED_BUILD_ATTESTATION: 'spoofed-attestation'
        }
      }
    ]
  });

  const verified = JSON.parse(await readFile(marker, 'utf8'));
  assert.equal(verified.lockPath, checkoutAcceptanceLockPath(checkoutRoot));
  assert.equal(verified.checkoutRoot, checkoutRoot);
  assert.equal(verified.purpose, purpose);
  assert.equal(verified.ownerPid, process.pid);
  assert.match(verified.acquiredAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(
    verified.token,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  assert.equal(
    verified.completedBuild.schema,
    COMPLETED_BUILD_ATTESTATION_SCHEMA
  );
  assert.deepEqual(
    verified.completedBuild.command,
    {
      ...build.requirement.command,
      sha256: sha256(Buffer.from(
        `${JSON.stringify(build.requirement.command)}\n`,
        'utf8'
      ))
    }
  );
  const scriptBytes = await readFile(build.requirement.scriptPath);
  assert.deepEqual(verified.completedBuild.deterministic_build_script, {
    path: build.requirement.scriptPath,
    bytes: scriptBytes.length,
    sha256: sha256(scriptBytes)
  });
  const manifestPath = path.join(
    build.requirement.buildRoot,
    'okf-explorer-build-manifest.json'
  );
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.deepEqual(verified.completedBuild.canonical_build, {
    root: build.requirement.buildRoot,
    manifest_path: manifestPath,
    manifest_bytes: manifestBytes.length,
    manifest_sha256: sha256(manifestBytes),
    manifest_schema: manifest.schema,
    algorithm: manifest.algorithm,
    files: manifest.file_count,
    tree_sha256: manifest.tree_sha256
  });
  assert.equal(await absent(checkoutAcceptanceLockPath(checkoutRoot)), true);
});

test('a failed deterministic build never attests or starts the runner', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const marker = path.join(checkoutRoot, 'runner-started');
  const build = await fixtureBuildPlan(checkoutRoot, { failing: true });

  await assert.rejects(
    runSingleWriterAcceptance({
      checkoutRoot,
      purpose: 'failing build test',
      commands: [
        build.command,
        nodeCommand(
          checkoutRoot,
          `await import('node:fs/promises').then(({ writeFile }) => writeFile(${JSON.stringify(marker)}, 'started'))`,
          'runner after failed build'
        )
      ]
    }),
    /failing deterministic build failed with exit status 7/
  );
  assert.equal(await absent(marker), true);
  assert.equal(await absent(checkoutAcceptanceLockPath(checkoutRoot)), true);
});

test('completed-build verification rejects a subsequently changed canonical manifest', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const marker = path.join(checkoutRoot, 'changed-build-error.txt');
  const build = await fixtureBuildPlan(checkoutRoot);
  const moduleUrl = pathToFileURL(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'acceptance_invocation_lock.mjs')
  ).href;
  const manifestPath = path.join(
    build.requirement.buildRoot,
    'okf-explorer-build-manifest.json'
  );
  const tamperSource = `
    import { rm, writeFile } from 'node:fs/promises';
    import path from 'node:path';
    import { writeCanonicalBuildManifest } from ${JSON.stringify(BUILD_MANIFEST_MODULE_URL)};
    const buildRoot = ${JSON.stringify(build.requirement.buildRoot)};
    await rm(${JSON.stringify(manifestPath)});
    await writeFile(path.join(buildRoot, 'index.html'), '<main>changed after attestation</main>\\n');
    await writeCanonicalBuildManifest(buildRoot);
  `;
  const verifyChangedSource = `
    import { writeFile } from 'node:fs/promises';
    import { verifyAcceptanceInvocationLock } from ${JSON.stringify(moduleUrl)};
    try {
      await verifyAcceptanceInvocationLock({
        checkoutRoot: ${JSON.stringify(checkoutRoot)},
        expectedPurpose: 'changed build test',
        expectedCompletedBuild: ${JSON.stringify(build.requirement)}
      });
      process.exitCode = 9;
    } catch (error) {
      await writeFile(${JSON.stringify(marker)}, error.message);
    }
  `;

  await runSingleWriterAcceptance({
    checkoutRoot,
    purpose: 'changed build test',
    commands: [
      build.command,
      nodeCommand(checkoutRoot, tamperSource, 'change canonical build'),
      nodeCommand(checkoutRoot, verifyChangedSource, 'verify changed canonical build')
    ]
  });
  assert.match(
    await readFile(marker, 'utf8'),
    /differs from the exact current script, command or canonical build/
  );
  assert.equal(await absent(checkoutAcceptanceLockPath(checkoutRoot)), true);
});

test('releases the lock after command success and failure', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const lockPath = checkoutAcceptanceLockPath(checkoutRoot);

  assert.deepEqual(
    await runSingleWriterAcceptance({
      checkoutRoot,
      commands: [nodeCommand(checkoutRoot, '')]
    }),
    { interruptedBy: null }
  );
  assert.equal(await absent(lockPath), true);

  await assert.rejects(
    runSingleWriterAcceptance({
      checkoutRoot,
      commands: [nodeCommand(checkoutRoot, 'process.exit(7)', 'failing test command')]
    }),
    /failing test command failed with exit status 7/
  );
  assert.equal(await absent(lockPath), true);
});

test('terminates a command at its hard deadline before releasing the lock', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const lockPath = checkoutAcceptanceLockPath(checkoutRoot);
  const command = nodeCommand(
    checkoutRoot,
    'setInterval(() => undefined, 1000)',
    'bounded hanging command'
  );
  command.timeoutMs = 50;

  await assert.rejects(
    runSingleWriterAcceptance({ checkoutRoot, commands: [command] }),
    /bounded hanging command exceeded its hard 50 ms command deadline/
  );
  assert.equal(await absent(lockPath), true);
});

test('forwards interruption and releases the lock', async (context) => {
  const checkoutRoot = await temporaryCheckout(context);
  const lockPath = checkoutAcceptanceLockPath(checkoutRoot);
  const moduleUrl = pathToFileURL(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'acceptance_invocation_lock.mjs')
  ).href;
  const helper = `
    import { runSingleWriterAcceptance } from ${JSON.stringify(moduleUrl)};
    const outcome = await runSingleWriterAcceptance({
      checkoutRoot: ${JSON.stringify(checkoutRoot)},
      commands: [{
        label: 'interruptible child',
        executable: process.execPath,
        args: ['--input-type=module', '--eval', 'setInterval(() => undefined, 1000)'],
        cwd: ${JSON.stringify(checkoutRoot)},
        stdio: 'ignore'
      }]
    });
    if (outcome.interruptedBy !== 'SIGTERM') process.exit(2);
    process.exit(143);
  `;
  const child = spawn(
    process.execPath,
    ['--input-type=module', '--eval', helper],
    { stdio: 'ignore' }
  );
  const exited = waitForExit(child);
  await waitForFile(lockPath);
  child.kill('SIGTERM');
  assert.deepEqual(await exited, { code: 143, signal: null });
  assert.equal(await absent(lockPath), true);
});

test(
  'retains the lock until a SIGTERM-handling descendant is killed and verified absent',
  { skip: process.platform === 'win32' },
  async (context) => {
    const checkoutRoot = await temporaryCheckout(context);
    const lockPath = checkoutAcceptanceLockPath(checkoutRoot);
    const descendantPidPath = path.join(checkoutRoot, 'descendant.pid');
    const descendantReadyPath = path.join(checkoutRoot, 'descendant-ready');
    const descendantTermPath = path.join(checkoutRoot, 'descendant-handled-sigterm');
    const competingMarker = path.join(checkoutRoot, 'competing-command-started');
    const moduleUrl = pathToFileURL(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'acceptance_invocation_lock.mjs')
    ).href;
    const descendantSource = `
      import { writeFileSync } from 'node:fs';
      writeFileSync(${JSON.stringify(descendantPidPath)}, String(process.pid));
      process.on('SIGTERM', () => {
        writeFileSync(${JSON.stringify(descendantTermPath)}, 'handled');
      });
      writeFileSync(${JSON.stringify(descendantReadyPath)}, 'ready');
      setInterval(() => undefined, 1000);
    `;
    const commandSource = `
      import { spawn } from 'node:child_process';
      spawn(
        process.execPath,
        ['--input-type=module', '--eval', ${JSON.stringify(descendantSource)}],
        { stdio: 'ignore' }
      );
      setInterval(() => undefined, 1000);
    `;
    const helper = `
      import { runSingleWriterAcceptance } from ${JSON.stringify(moduleUrl)};
      const outcome = await runSingleWriterAcceptance({
        checkoutRoot: ${JSON.stringify(checkoutRoot)},
        commands: [{
          label: 'parent with a persistent descendant',
          executable: process.execPath,
          args: ['--input-type=module', '--eval', ${JSON.stringify(commandSource)}],
          cwd: ${JSON.stringify(checkoutRoot)},
          stdio: 'ignore'
        }]
      });
      if (outcome.interruptedBy !== 'SIGTERM') process.exit(2);
      process.exit(143);
    `;
    const child = spawn(
      process.execPath,
      ['--input-type=module', '--eval', helper],
      { stdio: 'ignore' }
    );
    const exited = waitForExit(child);
    let descendantPid = null;
    context.after(async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      if (descendantPid) {
        try {
          process.kill(descendantPid, 'SIGKILL');
        } catch (error) {
          if (error?.code !== 'ESRCH') throw error;
        }
      }
    });

    await waitForFile(lockPath);
    await waitForFile(descendantReadyPath);
    descendantPid = Number.parseInt(await readFile(descendantPidPath, 'utf8'), 10);
    assert.equal(Number.isSafeInteger(descendantPid), true);

    child.kill('SIGTERM');
    await waitForFile(descendantTermPath);
    assert.equal(await absent(lockPath), false);

    await assert.rejects(
      runSingleWriterAcceptance({
        checkoutRoot,
        commands: [nodeCommand(
          checkoutRoot,
          `await import('node:fs/promises').then(({ writeFile }) => writeFile(${JSON.stringify(competingMarker)}, 'started'))`
        )],
        purpose: 'competing test invocation'
      }),
      /Concurrent OKF Explorer acceptance invocation refused/
    );
    assert.equal(await absent(competingMarker), true);
    assert.equal(await absent(lockPath), false);

    assert.deepEqual(await exited, { code: 143, signal: null });
    await waitForProcessToDisappear(descendantPid);
    assert.equal(await absent(lockPath), true);
  }
);

test('routes both public acceptance commands through the build-first wrapper', () => {
  const appRoot = '/checkout/apps/okf-explorer';
  for (const [target, runner] of [
    ['bundle', 'run_external_bundle_acceptance.mjs'],
    ['legislation', 'run_legislation_runtime_acceptance.mjs']
  ]) {
    const expectedBuild = deterministicBuildRequirement(appRoot);
    const commands = acceptanceCommands(
      target,
      ['--', '--output', '/tmp/receipt.json'],
      appRoot
    );
    assert.equal(commands.length, 2);
    assert.deepEqual(commands[0], {
      label: 'deterministic Explorer build',
      ...expectedBuild.command,
      timeoutMs: 10 * 60 * 1000,
      completedBuild: {
        scriptPath: expectedBuild.scriptPath,
        buildRoot: expectedBuild.buildRoot
      }
    });
    assert.equal(
      commands[1].args[0],
      path.join(appRoot, 'scripts', runner)
    );
    assert.deepEqual(commands[1].args.slice(1), ['--output', '/tmp/receipt.json']);
    assert.equal(commands[1].timeoutMs, 20 * 60 * 1000 + 15_000);
  }
});
