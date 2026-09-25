#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import YAML from 'yaml';

const APP = resolve(import.meta.dirname, '..');
const COOKIE_OVERRIDE = '^0.7.2';
const MIN_COOKIE = [0, 7, 2];
const MIN_VITEST = [4, 1, 11];

function version(value, label) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error(`${label} must be a stable version: ${value}`);
  return match.slice(1).map(Number);
}

function atLeast(value, minimum, label) {
  const parts = version(value, label);
  for (let i = 0; i < 3; i += 1) {
    if (parts[i] > minimum[i]) return;
    if (parts[i] < minimum[i]) break;
  }
  if (parts.every((part, i) => part === minimum[i])) return;
  throw new Error(`${label} version ${value} is below the reviewed minimum ${minimum.join('.')}`);
}

function resolved(value, label) {
  if (typeof value !== 'string') throw new Error(`${label} is missing`);
  return value.split('(')[0];
}

function packageVersion(key, name) {
  return key.startsWith(`${name}@`) ? key.slice(name.length + 1).split('(')[0] : null;
}

function entriesFor(rows, name) {
  return Object.entries(rows).flatMap(([key, row]) => {
    const found = packageVersion(key, name);
    return found === null ? [] : [{ key, row, version: found }];
  });
}

function requireInventory(lock, name, expected) {
  if (!Object.hasOwn(lock.packages, `${name}@${expected}`)) {
    throw new Error(`${name}@${expected} is absent from the package inventory`);
  }
}

function requireResolution(lock, name, reference) {
  requireInventory(lock, name, resolved(reference, `${name} dependency`));
  if (!Object.hasOwn(lock.snapshots, `${name}@${reference}`)) {
    throw new Error(`${name}@${reference} dependency has no matching snapshot`);
  }
}

function checkManifestRange(value, name) {
  if (typeof value !== 'string') throw new Error(`${name} is absent from the manifest`);
  const match = /^(?:\^|~)?(\d+\.\d+\.\d+)$/.exec(value);
  if (!match) throw new Error(`${name} has an unsupported or prerelease range: ${value}`);
  atLeast(match[1], MIN_VITEST, `${name} manifest minimum`);
}

export function checkDependencyPolicy(manifest, lock) {
  if (manifest?.pnpm?.overrides?.cookie !== COOKIE_OVERRIDE ||
      lock?.overrides?.cookie !== COOKIE_OVERRIDE) {
    throw new Error(`manifest and lockfile must retain cookie override ${COOKIE_OVERRIDE}`);
  }
  if (!lock.packages || !lock.snapshots || !lock.importers?.['.']) {
    throw new Error('lockfile package inventory, snapshots or root importer is missing');
  }

  const cookiePackages = entriesFor(lock.packages, 'cookie');
  const cookieSnapshots = entriesFor(lock.snapshots, 'cookie');
  if (!cookiePackages.length || !cookieSnapshots.length) {
    throw new Error('cookie package inventory or snapshot is missing');
  }
  for (const entry of [...cookiePackages, ...cookieSnapshots]) {
    atLeast(entry.version, MIN_COOKIE, entry.key);
    requireInventory(lock, 'cookie', entry.version);
  }
  for (const [key, row] of Object.entries(lock.snapshots)) {
    for (const dependencies of [row?.dependencies, row?.optionalDependencies]) {
      if (dependencies && Object.hasOwn(dependencies, 'cookie')) {
        const found = resolved(dependencies.cookie, `${key} cookie dependency`);
        atLeast(found, MIN_COOKIE, `${key} cookie dependency`);
        requireResolution(lock, 'cookie', dependencies.cookie);
      }
    }
  }

  // Guard the resolved packages, so a future native upstream fix can replace
  // the temporary conditional overrides without relaxing the security floor.
  for (const [name, minimum] of [['devalue', [5, 9, 2]], ['nanoid', [3, 3, 18]]]) {
    const packages = entriesFor(lock.packages, name);
    const snapshots = entriesFor(lock.snapshots, name);
    if (!packages.length || !snapshots.length) throw new Error(`${name} inventory or snapshot is missing`);
    for (const entry of [...packages, ...snapshots]) {
      atLeast(entry.version, minimum, entry.key);
      requireInventory(lock, name, entry.version);
    }
    for (const [key, row] of Object.entries(lock.snapshots)) {
      for (const dependencies of [row?.dependencies, row?.optionalDependencies]) {
        if (!dependencies || !Object.hasOwn(dependencies, name)) continue;
        const found = resolved(dependencies[name], `${key} ${name} dependency`);
        atLeast(found, minimum, `${key} ${name} dependency`);
        requireResolution(lock, name, dependencies[name]);
      }
    }
  }

  const importer = lock.importers['.'];
  for (const name of ['vitest', '@vitest/coverage-v8']) {
    checkManifestRange(manifest?.devDependencies?.[name], name);
    const direct = importer.devDependencies?.[name];
    if (direct?.specifier !== manifest.devDependencies[name]) {
      throw new Error(`${name} importer specifier differs from the manifest`);
    }
    const found = resolved(direct.version, `${name} importer version`);
    atLeast(found, MIN_VITEST, `${name} importer version`);
    requireInventory(lock, name, found);
    if (!Object.hasOwn(lock.snapshots, `${name}@${direct.version}`)) {
      throw new Error(`${name} importer resolution has no matching snapshot`);
    }
  }
  const vitestVersion = resolved(importer.devDependencies.vitest.version, 'vitest importer version');
  const coverageVersion = resolved(importer.devDependencies['@vitest/coverage-v8'].version,
    '@vitest/coverage-v8 importer version');
  if (coverageVersion !== vitestVersion) {
    throw new Error('coverage-v8 version must match Vitest exactly');
  }

  for (const name of ['vitest', '@vitest/mocker', '@vitest/coverage-v8']) {
    const packages = entriesFor(lock.packages, name);
    const snapshots = entriesFor(lock.snapshots, name);
    if (!packages.length || !snapshots.length) throw new Error(`${name} inventory or snapshot is missing`);
    for (const entry of [...packages, ...snapshots]) {
      atLeast(entry.version, MIN_VITEST, entry.key);
      requireInventory(lock, name, entry.version);
    }
  }
  for (const [key, row] of Object.entries(lock.snapshots)) {
    for (const dependencies of [row?.dependencies, row?.optionalDependencies]) {
      if (!dependencies) continue;
      for (const name of ['vitest', '@vitest/mocker', '@vitest/coverage-v8']) {
        if (!Object.hasOwn(dependencies, name)) continue;
        const found = resolved(dependencies[name], `${key} ${name} dependency`);
        atLeast(found, MIN_VITEST, `${key} ${name} dependency`);
        requireResolution(lock, name, dependencies[name]);
      }
    }
  }
  for (const entry of entriesFor(lock.snapshots, '@vitest/coverage-v8')) {
    if (resolved(entry.row?.dependencies?.vitest, `${entry.key} Vitest peer`) !== entry.version) {
      throw new Error('Every coverage-v8 snapshot must resolve the same Vitest version');
    }
  }
  const coverageResolution = `@vitest/coverage-v8@${importer.devDependencies['@vitest/coverage-v8'].version}`;
  const vitestResolution = `vitest@${importer.devDependencies.vitest.version}`;
  if (resolved(lock.snapshots[coverageResolution]?.dependencies?.vitest,
    `${coverageResolution} Vitest peer`) !== vitestVersion) {
    throw new Error('coverage-v8 snapshot must resolve the same Vitest version');
  }
  if (resolved(lock.snapshots[vitestResolution]?.optionalDependencies?.['@vitest/coverage-v8'],
    `${vitestResolution} coverage-v8 peer`) !== coverageVersion) {
    throw new Error('Vitest snapshot must resolve the same coverage-v8 version');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const manifest = JSON.parse(await readFile(resolve(APP, 'package.json'), 'utf8'));
  const lock = YAML.parse(await readFile(resolve(APP, 'pnpm-lock.yaml'), 'utf8'));
  checkDependencyPolicy(manifest, lock);
  console.log('Explorer dependency policy passed');
}
