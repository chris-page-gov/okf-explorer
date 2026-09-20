import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(dir, 'compare.mjs');
async function fixture() {
  const temp = await mkdtemp(path.join(tmpdir(), 'okf-allocation-admission-'));
  const receipt = path.join(temp, 'receipt'); await mkdir(receipt); await mkdir(path.join(receipt, 'candidate'));
  const old = JSON.parse(await readFile(path.join(dir, 'attempt-01/comparison.json')));
  await writeFile(path.join(receipt, 'comparison.json'), JSON.stringify(old));
  await writeFile(path.join(receipt, 'runner.mjs'), 'retained source placeholder');
  for (const name of ['index.ts', 'corpus.ts', 'types.ts']) await writeFile(path.join(receipt, 'candidate', name), `throw new Error('ARCHIVED CODE WAS EXECUTED');`);
  return { temp, receipt };
}
function run(receipt, dwp) {
  try { execFileSync(process.execPath, ['--experimental-strip-types', runner, '--dwp-root', dwp, '--check', receipt], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }); assert.fail('Tampered receipt accepted'); }
  catch (e) { const text = String(e.stderr); assert(!text.includes('ARCHIVED CODE WAS EXECUTED')); return text; }
}
test('rejects changed archived modules before any dynamic import', async () => {
  const f = await fixture(); try { assert.match(run(f.receipt, f.temp), /Candidate module digest mismatch before import/); } finally { await rm(f.temp, { recursive: true }); }
});
test('rejects unexpected archive files before executing candidate code', async () => {
  const f = await fixture(); try { await writeFile(path.join(f.receipt, 'extra.mjs'), 'unsafe'); assert.match(run(f.receipt, f.temp), /Unapproved archive file/); } finally { await rm(f.temp, { recursive: true }); }
});
test('rejects unknown manifest fields before candidate execution', async () => {
  const f = await fixture(); try { const p = path.join(f.receipt, 'comparison.json'); const j = JSON.parse(await readFile(p)); j.inputs.injected = true; await writeFile(p, JSON.stringify(j)); assert.match(run(f.receipt, f.temp), /Unrecognised receipt manifest fields/); } finally { await rm(f.temp, { recursive: true }); }
});
for (const target of ['root', 'parent', 'candidate']) test(`rejects ${target} directory symlinks`, async () => {
  const f = await fixture(); try {
    let selected = f.receipt;
    if (target === 'root') { selected = path.join(f.temp, 'linked'); await symlink(f.receipt, selected); }
    if (target === 'parent') { const parent = path.join(f.temp, 'linked'); await symlink(f.temp, parent); selected = path.join(parent, 'receipt'); }
    if (target === 'candidate') { await rm(path.join(f.receipt, 'candidate'), { recursive: true }); await mkdir(path.join(f.temp, 'linked-candidate')); await symlink(path.join(f.temp, 'linked-candidate'), path.join(f.receipt, 'candidate')); }
    assert.match(run(selected, f.temp), /[Ss]ymlink/);
  } finally { await rm(f.temp, { recursive: true }); }
});
test('rejects an oversized candidate before reading/importing it', async () => {
  const f = await fixture(); try { await writeFile(path.join(f.receipt, 'candidate/index.ts'), 'x'.repeat(2 * 1024 * 1024 + 1)); assert.match(run(f.receipt, f.temp), /Invalid retained file/); } finally { await rm(f.temp, { recursive: true }); }
});
