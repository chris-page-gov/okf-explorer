import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const engineManifests = [];
for (const commit of ['c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e', 'b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55']) {
  const base = `vendor/engines/${commit}`;
  const { engine_id, ...manifest } = JSON.parse(await readFile(`${base}/manifest.json`, 'utf8'));
  if (manifest.schema !== 'okf-context-engine-manifest.v1' || manifest.source_commit !== commit
    || manifest.family !== 'okf-context-assembly.v1' || engine_id !== `urn:okf:context-engine:sha256:${hash(canonical(manifest))}`
    || Object.keys(manifest.files).sort().join(',') !== 'corpus.ts,index.ts,types.ts') throw new Error('Engine manifest identity mismatch.');
  for (const [name, ref] of Object.entries(manifest.files)) {
    const raw = await readFile(`${base}/${name}`);
    if (raw.length !== ref.bytes || hash(raw) !== ref.sha256 || ref.source_path !== `apps/okf-explorer/src/lib/context/${name}`) throw new Error('Frozen engine bytes differ.');
  }
  engineManifests.push({ engine_id, source_commit: commit });
}
const corpusRelease = JSON.parse(await readFile('vendor/okf-dwp-corpus-release.json', 'utf8'));
if (corpusRelease.publication_status !== 'pinned' || !/^[a-f0-9]{40}$/.test(corpusRelease.version || '')) {
  throw new Error('Corpus publication is pending: pin an approved immutable DWP commit before building a release.');
}
const staffRelease = JSON.parse(await readFile('vendor/okf-dwp-staff-corpus-release.json', 'utf8'));
if (staffRelease.publication_status !== 'pinned' || !/^[a-f0-9]{40}$/.test(staffRelease.version || '') || staffRelease.version === corpusRelease.version) throw new Error('Distinct immutable staff corpus version is required.');
const previousRelease = JSON.parse(await readFile('vendor/okf-dwp-previous-corpus-release.json', 'utf8'));
if (previousRelease.publication_status !== 'pinned' || !/^[a-f0-9]{40}$/.test(previousRelease.version || '')
  || [corpusRelease.version, staffRelease.version].includes(previousRelease.version)) throw new Error('Distinct immutable corpus versions are required.');
const approved = [
  ['vendor/okf-dwp-assembly-index.json', '38159445a60d4bcabc23cb2cf728e14cbd0a4b55013276c291356e7a1452ff54'],
  ['vendor/okf-dwp-descriptor.json', '9881779ab550efe9f73da1e16acd8c8dcb64933c9981bb290b66ff51572853f3'],
  ['vendor/okf-dwp-corpus-manifest.json', corpusRelease.manifest_sha256],
  ['vendor/okf-dwp-staff-corpus-manifest.json', staffRelease.manifest_sha256],
  ['vendor/okf-dwp-previous-corpus-manifest.json', previousRelease.manifest_sha256]
];
for (const [path, digest] of approved) if (hash(await readFile(path)) !== digest) throw new Error(`Integrity mismatch: ${path}`);
const raw = { name: 'raw-file', setup(build) {
  build.onResolve({ filter: /\?raw$/ }, args => ({
    path: relative(root, resolve(args.resolveDir, args.path.slice(0, -4))).replaceAll('\\', '/'), namespace: 'raw'
  }));
  build.onLoad({ filter: /.*/, namespace: 'raw' }, async args => ({ contents: await readFile(resolve(root, args.path), 'utf8'), loader: 'text' }));
} };
// Keep dependency identities under the logical node_modules path when a checkout
// reuses a locked installation through a symlink. Real paths otherwise leak into
// emitted comments and the source receipt, changing bytes across installations.
const shared = { tsconfigRaw: { compilerOptions: { target: 'ES2022', useDefineForClassFields: true } }, preserveSymlinks: true, bundle: true, format: 'esm', target: 'es2022', plugins: [raw], metafile: true, sourcemap: false, legalComments: 'eof' };
await mkdir('dist/server', { recursive: true });
const worker = await build({ ...shared, entryPoints: ['src/worker.ts'], outfile: 'dist/server/index.js', platform: 'browser', conditions: ['workerd', 'browser'] });
if (Object.keys(worker.metafile.inputs).some(p => /shimsNode|ajvProvider|node:/.test(p))) throw new Error('Worker includes a Node/Ajv dependency.');
await build({ ...shared, entryPoints: ['src/node.ts'], outfile: 'dist/node.mjs', platform: 'node', packages: 'external' });
const inputs = {};
for (const path of [...new Set([...Object.keys(worker.metafile.inputs).filter(p => !p.startsWith('node_modules/')),
  'scripts/build.mjs', 'src/node.ts', 'package.json', 'package-lock.json',
  ...engineManifests.flatMap(engine => ['index.ts', 'corpus.ts', 'types.ts', 'manifest.json'].map(name => `vendor/engines/${engine.source_commit}/${name}`))])].sort()) {
  const localPath = path.replace(/^raw:/, '');
  inputs[localPath] = hash(await readFile(localPath));
}
const receipt = { schema: 'okf-remote-mcp-build.v1', service_version: '0.5.0', inputs,
  engines: engineManifests,
  outputs: { 'dist/server/index.js': hash(await readFile('dist/server/index.js')), 'dist/node.mjs': hash(await readFile('dist/node.mjs')) },
  worker_node_dependencies: false, bundle_version: corpusRelease.version,
  historical_bundle_versions: [staffRelease.version, previousRelease.version, 'efb05c66616a9cd4328a86cf412780fe7bc7cf0b'] };
await writeFile('dist/build-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ built: ['dist/server/index.js', 'dist/node.mjs'], worker_sha256: receipt.outputs['dist/server/index.js'] }));
