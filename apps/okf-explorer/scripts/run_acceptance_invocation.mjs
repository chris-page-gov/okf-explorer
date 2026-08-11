#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runSingleWriterAcceptance } from './acceptance_invocation_lock.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = path.resolve(APP_ROOT, '../..');
const RUNNERS = new Map([
  ['bundle', 'run_external_bundle_acceptance.mjs'],
  ['legislation', 'run_legislation_runtime_acceptance.mjs']
]);
const BUILD_COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const ACCEPTANCE_COMMAND_TIMEOUT_MS = 20 * 60 * 1000 + 15_000;

export function deterministicBuildRequirement(appRoot = APP_ROOT) {
  const resolvedAppRoot = path.resolve(appRoot);
  const scriptPath = path.join(
    resolvedAppRoot,
    'scripts',
    'check_deterministic_build.mjs'
  );
  return {
    command: {
      executable: process.execPath,
      args: [scriptPath],
      cwd: resolvedAppRoot
    },
    scriptPath,
    buildRoot: path.join(resolvedAppRoot, 'build')
  };
}

export function acceptanceCommands(target, forwardedArgs, appRoot = APP_ROOT) {
  const runner = RUNNERS.get(target);
  if (!runner) {
    throw new Error(
      `Acceptance target must be one of ${[...RUNNERS.keys()].join(', ')}; got ${target || '(missing)'}`
    );
  }
  const args = forwardedArgs[0] === '--' ? forwardedArgs.slice(1) : forwardedArgs;
  const completedBuild = deterministicBuildRequirement(appRoot);
  return [
    {
      label: 'deterministic Explorer build',
      ...completedBuild.command,
      timeoutMs: BUILD_COMMAND_TIMEOUT_MS,
      completedBuild: {
        scriptPath: completedBuild.scriptPath,
        buildRoot: completedBuild.buildRoot
      }
    },
    {
      label: `${target} Explorer acceptance`,
      executable: process.execPath,
      args: [path.join(appRoot, 'scripts', runner), ...args],
      cwd: appRoot,
      timeoutMs: ACCEPTANCE_COMMAND_TIMEOUT_MS
    }
  ];
}

async function main(argv = process.argv.slice(2)) {
  const [target, ...forwardedArgs] = argv;
  const outcome = await runSingleWriterAcceptance({
    checkoutRoot: REPOSITORY_ROOT,
    commands: acceptanceCommands(target, forwardedArgs),
    purpose: `${target} OKF Explorer acceptance`
  });
  if (outcome.interruptedBy) {
    process.kill(process.pid, outcome.interruptedBy);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
