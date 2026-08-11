import assert from 'node:assert/strict';
import {
  cp,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  BUILD_MANIFEST_FILENAME,
  BUILD_MANIFEST_SCHEMA,
  BUILD_TREE_ALGORITHM,
  captureAppBuildEvidence,
  canonicalBuildTreeBytes,
  inspectCanonicalBuildRoot,
  parseCanonicalBuildManifest,
  sha256,
  verifyAssembledAppBuild,
  writeCanonicalBuildManifest
} from './app_build_manifest.mjs';

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), 'okf-app-build-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, '_app', 'immutable'), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<!doctype html>\n');
  await writeFile(path.join(root, '404.html'), 'not found\n');
  await writeFile(
    path.join(root, '_app', 'immutable', 'app.js'),
    'export const ok = true;\n'
  );
  return root;
}

function renderUnsafeManifest(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('writes and revalidates the canonical self-excluding manifest', async (context) => {
  const root = await fixture(context);
  const first = await writeCanonicalBuildManifest(root);
  const second = await inspectCanonicalBuildRoot(root);

  assert.equal(first.manifest.schema, BUILD_MANIFEST_SCHEMA);
  assert.equal(first.manifest.algorithm, BUILD_TREE_ALGORITHM);
  assert.deepEqual(
    first.manifest.materials.map((material) => material.path),
    ['404.html', '_app/immutable/app.js', 'index.html']
  );
  assert.equal(first.manifest.file_count, 3);
  assert.equal(
    first.manifest.tree_sha256,
    sha256(canonicalBuildTreeBytes(first.manifest.materials))
  );
  assert.equal(
    first.manifest.materials.some(
      (material) => material.path === BUILD_MANIFEST_FILENAME
    ),
    false
  );
  assert.deepEqual(first.manifest, second.manifest);
  assert.deepEqual(
    parseCanonicalBuildManifest(
      await readFile(path.join(root, BUILD_MANIFEST_FILENAME))
    ),
    first.manifest
  );
});

test('sorts the flattened material paths by raw codepoint order', async (context) => {
  const root = await fixture(context);
  const bmpName = '\uE000.txt';
  const nonBmpName = '\u{10000}.txt';
  await mkdir(path.join(root, 'a'));
  await writeFile(path.join(root, 'a', 'nested.js'), 'nested\n');
  await writeFile(path.join(root, 'a.txt'), 'sibling\n');
  await writeFile(path.join(root, bmpName), 'bmp\n');
  await writeFile(path.join(root, nonBmpName), 'non-bmp\n');

  const inspection = await writeCanonicalBuildManifest(root);
  const paths = inspection.manifest.materials.map(
    (material) => material.path
  );

  assert.ok(
    paths.indexOf('a.txt') < paths.indexOf('a/nested.js')
  );
  assert.ok(
    paths.indexOf(bmpName) < paths.indexOf(nonBmpName),
    'BMP U+E000 must sort before non-BMP U+10000 by code point'
  );
});

test('rejects missing, extra and tampered source files', async (context) => {
  const missing = await fixture(context);
  await writeCanonicalBuildManifest(missing);
  await rm(path.join(missing, 'index.html'));
  await assert.rejects(
    inspectCanonicalBuildRoot(missing),
    /exactly one index\.html/
  );

  const extra = await fixture(context);
  await writeCanonicalBuildManifest(extra);
  await writeFile(path.join(extra, 'extra.txt'), 'extra\n');
  await assert.rejects(
    inspectCanonicalBuildRoot(extra),
    /does not describe the exact app-build source tree/
  );

  const tampered = await fixture(context);
  await writeCanonicalBuildManifest(tampered);
  await writeFile(path.join(tampered, 'index.html'), 'tampered\n');
  await assert.rejects(
    inspectCanonicalBuildRoot(tampered),
    /does not describe the exact app-build source tree/
  );
});

test('rejects the former post-copy 404 overwrite', async (context) => {
  const appBuild = await fixture(context);
  await writeCanonicalBuildManifest(appBuild);
  const assembled = await mkdtemp(
    path.join(tmpdir(), 'okf-assembled-site-')
  );
  context.after(() =>
    rm(assembled, { recursive: true, force: true })
  );
  await cp(appBuild, assembled, { recursive: true });

  await writeFile(
    path.join(assembled, '404.html'),
    '<!doctype html><meta http-equiv="refresh" content="0; url=./">\n'
  );

  await assert.rejects(
    verifyAssembledAppBuild(assembled, appBuild),
    /Assembled app material differs: 404\.html/
  );
});

test('accepts fixed assembly and rejects extra app namespace files', async (context) => {
  const appBuild = await fixture(context);
  await mkdir(path.join(appBuild, '_app', 'a'));
  await writeFile(
    path.join(appBuild, '_app', 'a', 'nested.js'),
    'export const nested = true;\n'
  );
  await writeFile(
    path.join(appBuild, '_app', 'a.txt'),
    'flat sibling\n'
  );
  const source = await writeCanonicalBuildManifest(appBuild);
  const assembled = await mkdtemp(
    path.join(tmpdir(), 'okf-assembled-site-')
  );
  context.after(() =>
    rm(assembled, { recursive: true, force: true })
  );
  await cp(appBuild, assembled, { recursive: true });
  await writeFile(path.join(assembled, 'README.md'), 'Legacy content\n');
  await writeFile(path.join(assembled, '.nojekyll'), '');

  const verified = await verifyAssembledAppBuild(
    assembled,
    appBuild
  );
  assert.equal(verified.files, source.manifest.file_count);
  assert.equal(
    verified.tree_sha256,
    source.manifest.tree_sha256
  );

  await writeFile(
    path.join(assembled, '_app', 'undeclared.js'),
    'throw new Error("undeclared");\n'
  );
  await assert.rejects(
    verifyAssembledAppBuild(assembled, appBuild),
    /Assembled _app namespace differs/
  );
});

test('rejects duplicate, unsafe and non-canonical manifest materials', async (context) => {
  const duplicate = await fixture(context);
  const duplicateInspection = await writeCanonicalBuildManifest(duplicate);
  const duplicateDocument = structuredClone(duplicateInspection.manifest);
  duplicateDocument.materials.push(duplicateDocument.materials.at(-1));
  duplicateDocument.file_count += 1;
  await writeFile(
    path.join(duplicate, BUILD_MANIFEST_FILENAME),
    renderUnsafeManifest(duplicateDocument)
  );
  await assert.rejects(
    inspectCanonicalBuildRoot(duplicate),
    /paths must be unique/
  );

  const unsafe = await fixture(context);
  const unsafeInspection = await writeCanonicalBuildManifest(unsafe);
  const unsafeDocument = structuredClone(unsafeInspection.manifest);
  unsafeDocument.materials[0].path = '../escape.js';
  await writeFile(
    path.join(unsafe, BUILD_MANIFEST_FILENAME),
    renderUnsafeManifest(unsafeDocument)
  );
  await assert.rejects(
    inspectCanonicalBuildRoot(unsafe),
    /(?:Unsafe|Non-canonical) build material path/
  );

  const reordered = await fixture(context);
  const reorderedInspection = await writeCanonicalBuildManifest(reordered);
  const reorderedDocument = structuredClone(reorderedInspection.manifest);
  reorderedDocument.materials.reverse();
  await writeFile(
    path.join(reordered, BUILD_MANIFEST_FILENAME),
    renderUnsafeManifest(reorderedDocument)
  );
  await assert.rejects(
    inspectCanonicalBuildRoot(reordered),
    /strictly sorted/
  );
});

test('rejects symbolic links, hard links and a missing index', async (context) => {
  const symbolic = await fixture(context);
  await symlink(
    path.join(symbolic, 'index.html'),
    path.join(symbolic, 'linked.html')
  );
  await assert.rejects(
    writeCanonicalBuildManifest(symbolic),
    /symbolic link/
  );

  const hard = await fixture(context);
  await link(
    path.join(hard, 'index.html'),
    path.join(hard, 'linked.html')
  );
  await assert.rejects(
    writeCanonicalBuildManifest(hard),
    /independent regular file/
  );

  const noIndex = await fixture(context);
  await rm(path.join(noIndex, 'index.html'));
  await assert.rejects(
    writeCanonicalBuildManifest(noIndex),
    /exactly one index\.html/
  );
});

test('enforces inspection ceilings before reading an unbounded build', async (context) => {
  const entryBound = await fixture(context);
  await assert.rejects(
    writeCanonicalBuildManifest(entryBound, {
      limits: { max_entries: 4 }
    }),
    /entry-count bound/
  );

  const fileBound = await fixture(context);
  await assert.rejects(
    writeCanonicalBuildManifest(fileBound, {
      limits: { max_file_bytes: 4 }
    }),
    /byte bound/
  );

  const aggregateBound = await fixture(context);
  await assert.rejects(
    writeCanonicalBuildManifest(aggregateBound, {
      limits: { max_bytes: 20 }
    }),
    /aggregate byte bound/
  );

  const manifestBound = await fixture(context);
  await writeCanonicalBuildManifest(manifestBound);
  await assert.rejects(
    inspectCanonicalBuildRoot(manifestBound, {
      limits: { max_manifest_bytes: 10 }
    }),
    /byte bound/
  );

  const expired = await fixture(context);
  await assert.rejects(
    writeCanonicalBuildManifest(expired, {
      deadline: Date.now() - 1
    }),
    /inspection deadline/
  );
});

test('captures the manifest and every described file into strict evidence', async (context) => {
  const root = await fixture(context);
  const inspection = await writeCanonicalBuildManifest(root);
  const evidence = await mkdtemp(
    path.join(tmpdir(), 'okf-app-build-evidence-')
  );
  context.after(() => rm(evidence, { recursive: true, force: true }));
  const capturedPaths = [];
  const receipt = await captureAppBuildEvidence(
    inspection,
    async (relative, bytes) => {
      const destination = path.join(evidence, ...relative.split('/'));
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes, { flag: 'wx' });
      capturedPaths.push(relative);
      return {
        path: relative,
        bytes: bytes.length,
        sha256: sha256(bytes)
      };
    }
  );

  assert.equal(receipt.root, 'explorer-build');
  assert.equal(receipt.algorithm, BUILD_TREE_ALGORITHM);
  assert.equal(receipt.files, inspection.manifest.file_count);
  assert.equal(receipt.sha256, inspection.manifest.tree_sha256);
  assert.equal(receipt.materials.length, inspection.manifest.file_count);
  assert.deepEqual(
    capturedPaths,
    [
      `explorer-build/${BUILD_MANIFEST_FILENAME}`,
      ...inspection.manifest.materials.map(
        (material) => `explorer-build/${material.path}`
      )
    ]
  );
  assert.deepEqual(
    receipt.index,
    receipt.materials.find(
      (material) => material.path === 'explorer-build/index.html'
    )
  );
  for (const relative of capturedPaths) {
    const metadata = await lstat(
      path.join(evidence, ...relative.split('/'))
    );
    assert.equal(metadata.isFile(), true);
    assert.equal(metadata.isSymbolicLink(), false);
    assert.equal(metadata.nlink, 1);
  }

  await assert.rejects(
    captureAppBuildEvidence(
      inspection,
      async (relative, bytes) => ({
        path: relative,
        bytes: bytes.length,
        sha256: '0'.repeat(64)
      })
    ),
    /Captured build material differs/
  );
});
