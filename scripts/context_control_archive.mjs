/** Preserve archive identity while comparing portable uncompressed evidence. */
import { open } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { sha256 } from './evaluate_context_package.mjs';

export const MAX_CONTROL_ARCHIVE_BYTES = 4 * 1024 * 1024;
export const MAX_CONTROL_CONTENT_BYTES = 16 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;

function boundedSize(value, maximum, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error(`${label} outside 1–${maximum} bytes`);
}

export function createControlArchive(content) {
  boundedSize(content.length, MAX_CONTROL_CONTENT_BYTES, 'Context control content');
  const archive = gzipSync(content, { level: 9 });
  archive[9] = 255; // Stable header; DEFLATE bytes can still vary by zlib build.
  boundedSize(archive.length, MAX_CONTROL_ARCHIVE_BYTES, 'Context control archive');
  return archive;
}

export function controlOutputBinding(relative, archive, content) {
  boundedSize(archive.length, MAX_CONTROL_ARCHIVE_BYTES, 'Context control archive');
  boundedSize(content.length, MAX_CONTROL_CONTENT_BYTES, 'Context control content');
  return { path: relative, sha256: sha256(archive), bytes: archive.length,
    uncompressed_sha256: sha256(content), uncompressed_bytes: content.length };
}

/** Read at most the declared file size plus one byte, with a fixed hard cap. */
export async function readControlArchive(file) {
  const handle = await open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error('Context control archive must be a regular file');
    boundedSize(stat.size, MAX_CONTROL_ARCHIVE_BYTES, 'Context control archive');
    const buffer = Buffer.alloc(stat.size + 1);
    let used = 0;
    while (used < buffer.length) {
      const { bytesRead } = await handle.read(buffer, used, buffer.length - used, used);
      if (!bytesRead) break;
      used += bytesRead;
    }
    if (used !== stat.size) throw new Error('Context control archive size changed during read');
    return buffer.subarray(0, used);
  } finally { await handle.close(); }
}

/** Check the retained archive first; never replace its digest with a recompression. */
export function verifyControlArchive(archive, binding, freshContent) {
  boundedSize(archive.length, MAX_CONTROL_ARCHIVE_BYTES, 'Context control archive');
  boundedSize(freshContent.length, MAX_CONTROL_CONTENT_BYTES, 'Fresh context control content');
  boundedSize(binding?.bytes, MAX_CONTROL_ARCHIVE_BYTES, 'Declared context control archive');
  boundedSize(binding?.uncompressed_bytes, MAX_CONTROL_CONTENT_BYTES, 'Declared context control content');
  if (!HASH.test(binding.sha256) || !HASH.test(binding.uncompressed_sha256)) throw new Error('Context control binding requires archive and content SHA-256');
  if (archive.length !== binding.bytes || sha256(archive) !== binding.sha256) throw new Error('Context control archive integrity mismatch');
  let retainedContent;
  try {
    retainedContent = gunzipSync(archive, { maxOutputLength: binding.uncompressed_bytes });
  } catch (error) {
    throw new Error('Context control bounded decompression failed', { cause: error });
  }
  if (retainedContent.length !== binding.uncompressed_bytes || sha256(retainedContent) !== binding.uncompressed_sha256) {
    throw new Error('Context control uncompressed integrity mismatch');
  }
  if (!retainedContent.equals(freshContent)) throw new Error('Fresh context control content differs from retained evidence');
  return binding;
}
