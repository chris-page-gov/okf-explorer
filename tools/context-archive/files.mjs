import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { resolve, parse, dirname, relative } from 'node:path';
import { requireValue } from './shared.mjs';

export async function noLinks(path) {
  const full = resolve(path); let current = parse(full).root;
  for (const part of full.slice(current.length).split('/').filter(Boolean)) {
    current = resolve(current, part);
    const stat = await lstat(current);
    requireValue(!stat.isSymbolicLink(), 'symlinked root, parent or file');
    if (current !== full) requireValue(stat.isDirectory(), 'non-directory parent');
  }
}
export function localPath(root, path) {
  requireValue(typeof path === 'string' && path.length <= 512 && !path.startsWith('/') && path.split('/').every(x => x && x !== '.' && x !== '..') && !/[\\\u0000-\u001f]/.test(path), 'unsafe local path');
  const result = resolve(root, path);
  requireValue(!relative(resolve(root), result).startsWith('..'), 'path escaped root'); return result;
}
export async function boundedFile(path, maximum) {
  await noLinks(path);
  const before = await lstat(path);
  requireValue(before.isFile() && before.size <= maximum, 'not a bounded regular file');
  return readAdmittedRegularFile(path, before, maximum);
}
/** Separate admission/read boundary permits a deterministic race regression. */
export async function readAdmittedRegularFile(path, before, maximum) {
  requireValue(before.isFile() && before.size <= maximum, 'not a bounded regular file');
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    requireValue(stat.isFile() && stat.ino === before.ino && stat.dev === before.dev && stat.size === before.size, 'file changed during admission');
    const buffer = Buffer.alloc(stat.size + 1); let offset = 0;
    while (offset < buffer.length) { const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, null); if (!bytesRead) break; offset += bytesRead; }
    const after = await file.stat();
    requireValue(offset === stat.size && after.size === stat.size && after.mtimeMs === stat.mtimeMs, 'file changed while reading');
    return buffer.subarray(0, offset);
  } finally { await file.close(); }
}
