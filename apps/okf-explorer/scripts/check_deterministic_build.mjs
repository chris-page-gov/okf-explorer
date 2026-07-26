#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUILD_TREE_ALGORITHM,
  writeCanonicalBuildManifest
} from './app_build_manifest.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_ROOT = path.join(APP_ROOT, 'build');
const GENERATED_ROOTS = [
  BUILD_ROOT,
  path.join(APP_ROOT, '.svelte-kit'),
  path.join(APP_ROOT, 'node_modules', '.vite')
];
const VITE_CLI = path.join(
  APP_ROOT,
  'node_modules',
  'vite',
  'bin',
  'vite.js'
);

async function cleanGeneratedState() {
  for (const generatedRoot of GENERATED_ROOTS) {
    await rm(generatedRoot, { recursive: true, force: true });
  }
}

function runProductionBuild() {
  const result = spawnSync(process.execPath, [VITE_CLI, 'build'], {
    cwd: APP_ROOT,
    env: { ...process.env },
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.signal) {
    throw new Error(`Vite production build terminated by ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(`Vite production build exited with status ${result.status}`);
  }
}

async function snapshotBuild() {
  const inspection = await writeCanonicalBuildManifest(BUILD_ROOT);
  const index = inspection.manifest.materials.find(
    (entry) => entry.path === 'index.html'
  );
  return {
    materials: inspection.manifest.materials,
    files: inspection.manifest.file_count,
    manifest_bytes: inspection.manifestMaterial.bytes,
    manifest_sha256: inspection.manifestMaterial.sha256,
    index_bytes: index.bytes,
    index_sha256: index.sha256,
    tree_sha256: inspection.manifest.tree_sha256
  };
}

function changedPaths(first, second) {
  const firstByPath = new Map(
    first.materials.map((entry) => [entry.path, entry])
  );
  const secondByPath = new Map(
    second.materials.map((entry) => [entry.path, entry])
  );
  return [...new Set([...firstByPath.keys(), ...secondByPath.keys()])]
    .sort()
    .filter(
      (relative) =>
        JSON.stringify(firstByPath.get(relative)) !==
        JSON.stringify(secondByPath.get(relative))
    );
}

async function buildCleanSnapshot() {
  await cleanGeneratedState();
  runProductionBuild();
  return snapshotBuild();
}

const first = await buildCleanSnapshot();
const second = await buildCleanSnapshot();
if (
  first.tree_sha256 !== second.tree_sha256 ||
  first.manifest_sha256 !== second.manifest_sha256 ||
  first.manifest_bytes !== second.manifest_bytes ||
  first.index_sha256 !== second.index_sha256 ||
  first.index_bytes !== second.index_bytes
) {
  const differences = changedPaths(first, second);
  throw new Error(
    'successive clean production builds differ: ' +
      `${differences.slice(0, 20).join(', ')}` +
      (differences.length > 20
        ? ` (+${differences.length - 20} more)`
        : '')
  );
}

console.log(
  'Deterministic Explorer build passed: ' +
    `algorithm=${BUILD_TREE_ALGORITHM} ` +
    `files=${second.files} ` +
    `tree_sha256=${second.tree_sha256} ` +
    `manifest_bytes=${second.manifest_bytes} ` +
    `manifest_sha256=${second.manifest_sha256} ` +
    `index_bytes=${second.index_bytes} ` +
    `index_sha256=${second.index_sha256}`
);
