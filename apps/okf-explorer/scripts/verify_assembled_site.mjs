#!/usr/bin/env node

import path from 'node:path';

import {
  verifyAssembledAppBuild
} from './app_build_manifest.mjs';

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (
      !['--site-root', '--app-build-root'].includes(name) ||
      typeof value !== 'string' ||
      value.length === 0 ||
      values.has(name)
    ) {
      throw new Error(
        'Usage: verify_assembled_site.mjs ' +
          '--site-root <path> --app-build-root <path>'
      );
    }
    values.set(name, value);
  }
  if (
    values.size !== 2 ||
    !values.has('--site-root') ||
    !values.has('--app-build-root')
  ) {
    throw new Error(
      'Usage: verify_assembled_site.mjs ' +
        '--site-root <path> --app-build-root <path>'
    );
  }
  return {
    siteRoot: path.resolve(values.get('--site-root')),
    appBuildRoot: path.resolve(values.get('--app-build-root'))
  };
}

const { siteRoot, appBuildRoot } = parseArguments(
  process.argv.slice(2)
);
const result = await verifyAssembledAppBuild(
  siteRoot,
  appBuildRoot
);
console.log(
  'Verified assembled Explorer app: ' +
    `algorithm=${result.algorithm} ` +
    `files=${result.files} ` +
    `tree_sha256=${result.tree_sha256} ` +
    `manifest_bytes=${result.manifest.bytes} ` +
    `manifest_sha256=${result.manifest.sha256}`
);
