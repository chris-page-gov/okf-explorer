import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { boundedFile, freshDirectory, verifiedBuild } from '../scripts/replay-observation-files.ts';
import { createHash } from 'node:crypto';
import { canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { ENGINES, CURRENT_ENGINE_ID, PRIOR_ENGINE_ID } from '../src/engines.ts';
import { APPROVED_VERSIONS, BUNDLE_VERSION, PRIOR_BUNDLE_VERSION } from '../src/registry.ts';

test('current build admission includes every live import and keeps the frozen engines bound', async () => {
  const { value } = await verifiedBuild(new URL('..', import.meta.url).pathname);
  assert.ok(value.inputs['../../apps/okf-explorer/src/lib/context/unit.ts']);
  assert.ok(value.inputs['../../profiles/context-assembly/v1/evidence-unit.schema.json']);
  assert.ok(value.inputs['vendor/okf-dwp-household-corpus-manifest.json']);
});

test('observation files reject oversized inputs, linked files/parents and existing output directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'okf-replay-admission-'));
  try {
    await writeFile(join(root, 'small'), 'abc');
    assert.equal((await boundedFile(join(root, 'small'), 3)).toString(), 'abc');
    await assert.rejects(boundedFile(join(root, 'small'), 2), /bound/);
    await symlink(join(root, 'small'), join(root, 'linked'));
    await assert.rejects(boundedFile(join(root, 'linked')), /Symbolic/);
    await symlink(root, join(root, 'parent'));
    await assert.rejects(boundedFile(join(root, 'parent', 'small')), /Symbolic/);
    await assert.rejects(freshDirectory(join(root, 'parent', 'out')), /Symbolic/);
    await freshDirectory(join(root, 'out'));
    await assert.rejects(freshDirectory(join(root, 'out')), /EEXIST/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('build admission rejects receipt path injection before reading any declared input', async () => {
  const root = await mkdtemp(join(tmpdir(), 'okf-replay-build-'));
  try {
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist', 'build-receipt.json'), JSON.stringify({ schema: 'okf-remote-mcp-build.v1',
      inputs: { '../../../private.email.md': '0'.repeat(64) }, outputs: {} }));
    await assert.rejects(verifiedBuild(root), /approved build-input inventory/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('all immutable engine manifests bind exact files and explicit source compatibility', async () => {
  const sha = (raw: string | Uint8Array) => createHash('sha256').update(raw).digest('hex');
  for (const engine of ENGINES) {
    const base = new URL(`../vendor/engines/${engine.source_commit}/`, import.meta.url);
    const { engine_id, ...manifest } = JSON.parse(await readFile(new URL('manifest.json', base), 'utf8'));
    assert.equal(engine_id, 'urn:okf:context-engine:sha256:' + sha(canonicalJson(manifest)));
    const expected = engine.engine_id === CURRENT_ENGINE_ID ? [BUNDLE_VERSION]
      : engine.engine_id === PRIOR_ENGINE_ID ? APPROVED_VERSIONS.filter(version => version !== BUNDLE_VERSION)
        : APPROVED_VERSIONS.filter(version => version !== BUNDLE_VERSION && version !== PRIOR_BUNDLE_VERSION);
    assert.equal(engine.engine_id, engine_id); assert.deepEqual(engine.source_versions, expected);
    assert.deepEqual(Object.keys(manifest.files).sort(), engine.engine_id === CURRENT_ENGINE_ID
      ? ['corpus.ts', 'corpusV3.ts', 'index.ts', 'types.ts', 'unit.ts'] : ['corpus.ts', 'index.ts', 'types.ts']);
    for (const [name, ref] of Object.entries(manifest.files) as [string, any][]) {
      const raw = await readFile(new URL(name, base)); assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256);
    }
  }
});
