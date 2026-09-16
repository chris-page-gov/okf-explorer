import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { sha256 } from '../scripts/evaluate_context_package.mjs';
import { createControlArchive, controlOutputBinding, readControlArchive, verifyControlArchive,
  MAX_CONTROL_ARCHIVE_BYTES, MAX_CONTROL_CONTENT_BYTES } from '../scripts/context_control_archive.mjs';

const content = Buffer.from(JSON.stringify({ evidence: 'Exact retained evidence. '.repeat(400), status: 'insufficient' }) + '\n');
const fixture = () => {
  const archive = createControlArchive(content);
  return { archive, binding: controlOutputBinding('control-outputs/example.json.gz', archive, content) };
};

test('same evidence encoded with different DEFLATE bytes passes only with its own archive binding', () => {
  const original = fixture();
  const alternate = gzipSync(content, { level: 1 }); alternate[9] = 255;
  assert.notDeepEqual(alternate, original.archive);
  const binding = controlOutputBinding(original.binding.path, alternate, content);
  assert.equal(verifyControlArchive(alternate, binding, content), binding);
  assert.throws(() => verifyControlArchive(alternate, original.binding, content), /archive integrity mismatch/);
});

test('archive tampering is rejected before decompression', () => {
  const { archive, binding } = fixture();
  const changed = Buffer.from(archive); changed[12] ^= 1;
  assert.throws(() => verifyControlArchive(changed, binding, content), /archive integrity mismatch/);
});

test('valid changed content cannot pass by updating its archive and content digests', () => {
  const changedContent = Buffer.from('Different evidence, correctly compressed.');
  const archive = createControlArchive(changedContent);
  const binding = controlOutputBinding('control-outputs/example.json.gz', archive, changedContent);
  assert.throws(() => verifyControlArchive(archive, binding, content), /differs from retained evidence/);
});

test('a false retained uncompressed digest is rejected', () => {
  const { archive, binding } = fixture();
  assert.throws(() => verifyControlArchive(archive, { ...binding, uncompressed_sha256: '0'.repeat(64) }, content), /uncompressed integrity mismatch/);
});

test('a truncated archive still fails when its archive digest is updated', () => {
  const { archive, binding } = fixture();
  const truncated = archive.subarray(0, archive.length - 8);
  assert.throws(() => verifyControlArchive(truncated, { ...binding, bytes: truncated.length, sha256: sha256(truncated) }, content), /bounded decompression failed/);
});

test('decompression cannot exceed the receipt declared content size', () => {
  const { archive, binding } = fixture();
  assert.throws(() => verifyControlArchive(archive, { ...binding, uncompressed_bytes: 10 }, content), /bounded decompression failed/);
});

test('compressed and uncompressed hard limits are enforced', () => {
  const { archive, binding } = fixture();
  assert.throws(() => verifyControlArchive(Buffer.alloc(MAX_CONTROL_ARCHIVE_BYTES + 1), binding, content), /archive outside/);
  assert.throws(() => verifyControlArchive(archive, { ...binding, uncompressed_bytes: MAX_CONTROL_CONTENT_BYTES + 1 }, content), /content outside/);
  assert.throws(() => createControlArchive(Buffer.alloc(MAX_CONTROL_CONTENT_BYTES + 1)), /content outside/);
});

test('both archive and content bindings are required', () => {
  const { archive, binding } = fixture();
  const missing = { ...binding }; delete missing.uncompressed_sha256;
  assert.throws(() => verifyControlArchive(archive, missing, content), /requires archive and content SHA-256/);
});

test('file reads preserve exact bytes and reject files over the archive limit', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'context-archive-test-'));
  try {
    const file = path.join(directory, 'result.gz');
    const { archive } = fixture();
    await writeFile(file, archive);
    assert.deepEqual(await readControlArchive(file), archive);
    await writeFile(file, Buffer.alloc(MAX_CONTROL_ARCHIVE_BYTES + 1));
    await assert.rejects(readControlArchive(file), /archive outside/);
  } finally { await rm(directory, { recursive: true }); }
});
