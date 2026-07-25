#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import YAML from 'yaml';

const APP = resolve(import.meta.dirname, '..');
const ROOT = resolve(APP, '../..');
const LOCK = resolve(APP, 'pnpm-lock.yaml');
const PACKAGE = resolve(APP, 'package.json');
const OUTPUT = resolve(ROOT, 'release-assurance/explorer.sbom.cdx.json');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function packageIdentity(key) {
  const split = key.lastIndexOf('@');
  if (split <= 0) throw new Error(`unsupported pnpm package key: ${key}`);
  return { name: key.slice(0, split), version: key.slice(split + 1) };
}

function purl(name, version) {
  if (name.startsWith('@')) {
    const [scope, leaf] = name.split('/');
    return `pkg:npm/%40${scope.slice(1)}/${leaf}@${version}`;
  }
  return `pkg:npm/${name}@${version}`;
}

function resolvedVersion(value) {
  return String(value).split('(')[0];
}

function render(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function build() {
  const lockBytes = await readFile(LOCK);
  const lock = YAML.parse(lockBytes.toString('utf8'));
  const packageDocument = JSON.parse(await readFile(PACKAGE, 'utf8'));
  const components = Object.entries(lock.packages || {}).map(([key, row]) => {
    const { name, version } = packageIdentity(key);
    const component = {
      'bom-ref': purl(name, version),
      name,
      purl: purl(name, version),
      type: 'library',
      version
    };
    const integrity = row?.resolution?.integrity;
    if (typeof integrity === 'string' && integrity.startsWith('sha512-')) {
      component.hashes = [{
        alg: 'SHA-512',
        content: Buffer.from(integrity.slice(7), 'base64').toString('hex')
      }];
    }
    return component;
  }).sort((left, right) => left['bom-ref'].localeCompare(right['bom-ref']));

  const importer = lock.importers?.['.'] || {};
  const direct = {
    ...(importer.dependencies || {}),
    ...(importer.devDependencies || {})
  };
  const directRefs = Object.entries(direct).map(([name, row]) => {
    const version = resolvedVersion(row.version);
    return purl(name, version);
  }).sort();
  const known = new Set(components.map((component) => component['bom-ref']));
  const missing = directRefs.filter((reference) => !known.has(reference));
  if (missing.length) throw new Error(`direct dependencies absent from package inventory: ${missing.join(', ')}`);

  const rootRef = 'pkg:github/chris-page-gov/okf-explorer@0.5.0';
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    metadata: {
      component: {
        'bom-ref': rootRef,
        licenses: [{ license: { id: 'MIT' } }],
        name: packageDocument.name,
        type: 'application',
        version: packageDocument.version
      },
      properties: [{
        name: 'okf:pnpm-lock-sha256',
        value: sha256(lockBytes)
      }],
      tools: {
        components: [{
          name: 'build_sbom.mjs',
          type: 'application',
          version: '1.0.0'
        }]
      }
    },
    components,
    dependencies: [{
      ref: rootRef,
      dependsOn: directRefs
    }]
  };
}

const expected = render(await build());
if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = await readFile(OUTPUT, 'utf8');
  } catch {
    // The mismatch below is the fail-closed result.
  }
  if (current !== expected) {
    console.error(`stale or missing Explorer SBOM: ${OUTPUT}`);
    process.exit(1);
  }
} else {
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, expected);
}

const sbom = JSON.parse(expected);
console.log(`Explorer CycloneDX SBOM passed: ${sbom.components.length} pinned package components`);
