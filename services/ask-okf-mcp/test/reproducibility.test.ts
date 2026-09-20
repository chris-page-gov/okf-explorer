import test from 'node:test';
import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { cp, mkdtemp, mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

test('Worker, Node build and receipt are identical with relocated real and linked dependencies', async () => {
  const serviceRoot = fileURLToPath(new URL('..', import.meta.url));
  const repoRoot = resolve(serviceRoot, '../..');
  const relocatedRoot = await mkdtemp(join(tmpdir(), 'okf-mcp-build-'));
  const relocatedService = join(relocatedRoot, 'services/ask-okf-mcp');
  const copy = { recursive: true, mode: constants.COPYFILE_FICLONE };
  try {
    await mkdir(relocatedService, { recursive: true });
    for (const path of ['src', 'scripts', 'vendor', 'node_modules', 'package.json', 'package-lock.json', 'tsconfig.json']) {
      await cp(join(serviceRoot, path), join(relocatedService, path), copy);
    }
    for (const path of ['apps/okf-explorer/src/lib/context/index.ts', 'apps/okf-explorer/src/lib/context/types.ts',
      'apps/okf-explorer/src/lib/context/corpus.ts',
      'apps/okf-explorer/src/lib/context/delivery.ts',
      'profiles/context-assembly/v1/package.schema.json', 'profiles/context-assembly/v1/common.schema.json']) {
      await mkdir(resolve(relocatedRoot, path, '..'), { recursive: true });
      await cp(join(repoRoot, path), join(relocatedRoot, path), copy);
    }
    for (const dependencyLayout of ['real', 'linked']) {
      if (dependencyLayout === 'linked') {
        await rm(join(relocatedService, 'node_modules'), { recursive: true, force: true });
        await symlink(join(serviceRoot, 'node_modules'), join(relocatedService, 'node_modules'), 'dir');
      }
      const child = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: relocatedService, encoding: 'utf8', timeout: 30000 });
      assert.equal(child.status, 0, child.stderr + child.stdout);
      for (const path of ['dist/server/index.js', 'dist/node.mjs', 'dist/build-receipt.json']) {
        assert.deepEqual(await readFile(join(relocatedService, path)), await readFile(join(serviceRoot, path)), dependencyLayout + ': ' + path);
      }
      const receipt = JSON.parse(await readFile(join(relocatedService, 'dist/build-receipt.json'), 'utf8'));
      assert.ok(Object.keys(receipt.inputs).every(path => !path.includes('node_modules/') && !path.startsWith('../../../')));
      assert.ok(receipt.inputs['scripts/build.mjs']);
    }
    const worker = await readFile(join(relocatedService, 'dist/server/index.js'), 'utf8');
    assert.ok(!worker.includes(serviceRoot));
    assert.ok(!worker.includes(relocatedRoot));
  } finally { await rm(relocatedRoot, { recursive: true, force: true }); }
});
