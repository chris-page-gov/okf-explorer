import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BUILD_MANIFEST_FILENAME,
  BUILD_MANIFEST_SCHEMA,
  inspectCanonicalBuildRoot,
  writeCanonicalBuildManifest
} from './app_build_manifest.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_ROOT = path.join(APP_ROOT, 'build');
const VITE_CLI = path.join(APP_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const PUBLIC_ORIGIN = 'https://chris-page-gov.github.io';
const PUBLIC_ROOT = `${PUBLIC_ORIGIN}/okf-explorer/`;

function attribute(document, selector, name) {
  const tag = document.match(selector)?.[0];
  assert.ok(tag, `missing ${selector}`);
  const value = tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
  assert.ok(value, `missing ${name} on ${selector}`);
  return value;
}

test('production build emits a project-root-safe GitHub Pages 404', async () => {
  const result = spawnSync(process.execPath, [VITE_CLI, 'build'], {
    cwd: APP_ROOT,
    env: { ...process.env },
    encoding: 'utf8'
  });
  assert.equal(
    result.status,
    0,
    `production build failed:\n${result.stdout}\n${result.stderr}`
  );

  const written = await writeCanonicalBuildManifest(BUILD_ROOT);
  const restored = await inspectCanonicalBuildRoot(BUILD_ROOT);
  assert.equal(restored.manifest.schema, BUILD_MANIFEST_SCHEMA);
  assert.deepEqual(restored.manifest, written.manifest);
  await access(path.join(BUILD_ROOT, BUILD_MANIFEST_FILENAME));

  const document = await readFile(path.join(BUILD_ROOT, '404.html'), 'utf8');
  const indexDocument = await readFile(path.join(BUILD_ROOT, 'index.html'), 'utf8');
  const requestedUrl = `${PUBLIC_ROOT}missing/nested/page`;
  const favicon = attribute(document, /<link\b[^>]*\brel="icon"[^>]*>/i, 'href');
  const returnLink = attribute(
    document,
    /<a\b[^>]*>Return to OKF Explorer<\/a>/i,
    'href'
  );

  assert.equal(new URL(favicon, requestedUrl).href, `${PUBLIC_ROOT}favicon.svg`);
  assert.equal(new URL(returnLink, requestedUrl).href, PUBLIC_ROOT);
  assert.match(document, /<html\s+lang="en-GB">/i);
  assert.match(indexDocument, /<html\s+lang="en-GB">/i);
  assert.doesNotMatch(document, /(?:href|src)="\/(?!okf-explorer(?:\/|"))/i);
  assert.doesNotMatch(document, /(?:import\(|modulepreload|\/_app\/)/i);
  await access(path.join(BUILD_ROOT, 'favicon.svg'));
});
