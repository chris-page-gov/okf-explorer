/** Local observation admission; never follow links or trust receipt paths. */
import assert from 'node:assert/strict';
import { lstat, open, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname, parse } from 'node:path';
import { createHash } from 'node:crypto';

export async function noSymlinks(path: string): Promise<void> {
  const absolute = resolve(path); const root = parse(absolute).root;
  let part = root;
  for (const name of absolute.slice(root.length).split('/').filter(Boolean)) {
    part = resolve(part, name); assert.equal((await lstat(part)).isSymbolicLink(), false, 'Symbolic links are not observation inputs');
  }
}
export async function boundedFile(path: string, limit = 8 * 1024 * 1024): Promise<Buffer> {
  await noSymlinks(path);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat(); assert.ok(stat.isFile() && stat.size <= limit, 'Observation input exceeds its bound');
    const raw = Buffer.alloc(Number(stat.size) + 1);
    let length = 0;
    while (length < raw.length) { const part = await handle.read(raw, length, raw.length - length, null); if (!part.bytesRead) break; length += part.bytesRead; }
    assert.equal(length, stat.size, 'Observation input changed while reading'); return raw.subarray(0, length);
  } finally { await handle.close(); }
}
export async function freshDirectory(path: string) { await noSymlinks(dirname(resolve(path))); await mkdir(path); }

const inputs = new Set([
  '../../apps/okf-explorer/src/lib/context/corpus.ts', '../../apps/okf-explorer/src/lib/context/delivery.ts', '../../apps/okf-explorer/src/lib/context/index.ts',
  '../../apps/okf-explorer/src/lib/context/corpusV3.ts',
  '../../apps/okf-explorer/src/lib/context/unit.ts', '../../profiles/context-assembly/v1/evidence-unit.schema.json',
  '../../profiles/context-assembly/v1/common.schema.json', '../../profiles/context-assembly/v1/package.schema.json',
  'package-lock.json', 'package.json', 'scripts/build.mjs', 'scripts/engine-admission.mjs',
  ...['bundles', 'contracts', 'corpusAssets', 'corpusFetch', 'deliveryContracts', 'enginePolicy', 'engines', 'landing', 'node', 'registry', 'replay', 'replayDelivery', 'review', 'service', 'worker'].map(name => `src/${name}.ts`),
  ...['assembly-index', 'corpus-manifest', 'descriptor', 'evidence-connect-corpus-manifest', 'evidence-connect-corpus-release', 'evidence-connect-descriptor', 'household-corpus-manifest', 'previous-corpus-manifest', 'staff-corpus-manifest', 'corpus-release', 'household-corpus-release', 'previous-corpus-release', 'staff-corpus-release'].map(name => `vendor/okf-dwp-${name}.json`),
  ...['corpus.ts', 'corpusV3.ts', 'index.ts', 'types.ts', 'unit.ts', 'manifest.json'].map(name => `vendor/engines/d6930bbcddaab616deec002d9e6efff6e3aae953/${name}`),
  ...['b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55', 'c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e'].flatMap(commit =>
    ['corpus.ts', 'index.ts', 'types.ts', 'manifest.json'].map(name => `vendor/engines/${commit}/${name}`))
]);
const sha = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
export async function verifiedBuild(root: string) {
  const raw = await boundedFile(resolve(root, 'dist/build-receipt.json'), 64 * 1024);
  const value = JSON.parse(raw.toString());
  assert.equal(value.schema, 'okf-remote-mcp-build.v1');
  assert.deepEqual(Object.keys(value.inputs).sort(), [...inputs].sort(), 'Exact approved build-input inventory required');
  assert.deepEqual(Object.keys(value.outputs).sort(), ['dist/node.mjs', 'dist/server/index.js']);
  for (const [path, digest] of Object.entries({ ...value.inputs, ...value.outputs })) {
    assert.match(String(digest), /^[a-f0-9]{64}$/); assert.equal(sha(await boundedFile(resolve(root, path))), digest);
  }
  return { raw, value };
}
