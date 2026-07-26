#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  lstat,
  readFile,
  readdir,
  rm
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_ROOT = path.join(APP_ROOT, 'build');
const GENERATED_ROOTS = [
  BUILD_ROOT,
  path.join(APP_ROOT, '.svelte-kit'),
  path.join(APP_ROOT, 'node_modules', '.vite')
];
const VITE_CLI = path.join(APP_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

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

async function buildTreeEntries(root, directory = '') {
  const absoluteDirectory = path.join(root, directory);
  const children = await readdir(absoluteDirectory, { withFileTypes: true });
  children.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0
  );
  const entries = [];
  for (const child of children) {
    const relative = directory
      ? path.posix.join(directory, child.name)
      : child.name;
    const absolute = path.join(root, ...relative.split('/'));
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) {
      throw new Error(`build tree contains a symbolic link: ${relative}`);
    }
    if (metadata.isDirectory()) {
      entries.push({ path: relative, type: 'directory' });
      entries.push(...await buildTreeEntries(root, relative));
      continue;
    }
    if (!metadata.isFile()) {
      throw new Error(`build tree contains a non-regular entry: ${relative}`);
    }
    const bytes = await readFile(absolute);
    entries.push({
      bytes: bytes.length,
      path: relative,
      sha256: sha256(bytes),
      type: 'file'
    });
  }
  return entries;
}

async function snapshotBuild() {
  const rootMetadata = await lstat(BUILD_ROOT);
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
    throw new Error('Vite did not produce an independent build directory');
  }
  const entries = await buildTreeEntries(BUILD_ROOT);
  const index = entries.find(
    (entry) => entry.type === 'file' && entry.path === 'index.html'
  );
  if (!index) throw new Error('production build has no index.html');
  const canonicalManifest = Buffer.from(
    `${JSON.stringify(entries)}\n`,
    'utf8'
  );
  return {
    entries,
    files: entries.filter((entry) => entry.type === 'file').length,
    index_bytes: index.bytes,
    index_sha256: index.sha256,
    tree_sha256: sha256(canonicalManifest)
  };
}

function changedPaths(first, second) {
  const firstByPath = new Map(first.entries.map((entry) => [entry.path, entry]));
  const secondByPath = new Map(second.entries.map((entry) => [entry.path, entry]));
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
    `files=${second.files} ` +
    `tree_sha256=${second.tree_sha256} ` +
    `index_bytes=${second.index_bytes} ` +
    `index_sha256=${second.index_sha256}`
);
