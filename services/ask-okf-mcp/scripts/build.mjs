import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';
import { validateEngineManifest, verifyEngineModule } from './engine-admission.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const hash = value => createHash('sha256').update(value).digest('hex');
const engineManifests = [];
for (const commit of ['d6930bbcddaab616deec002d9e6efff6e3aae953', 'c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e', 'b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55']) {
  const base = `vendor/engines/${commit}`;
  const manifest = JSON.parse(await readFile(`${base}/manifest.json`, 'utf8'));
  const admission = validateEngineManifest(manifest, commit);
  for (const name of admission.files) verifyEngineModule(await readFile(`${base}/${name}`), manifest.files[name]);
  engineManifests.push(admission);
}
const corpusRelease = JSON.parse(await readFile('vendor/okf-dwp-corpus-release.json', 'utf8'));
const evidenceConnectRelease = JSON.parse(await readFile('vendor/okf-dwp-evidence-connect-corpus-release.json', 'utf8'));
if (evidenceConnectRelease.publication_status !== 'pinned'
  || evidenceConnectRelease.version !== '7eeded763042ddd0070f4fed834c6074149e8e2f'
  || evidenceConnectRelease.engine_commit !== 'd6930bbcddaab616deec002d9e6efff6e3aae953'
  || evidenceConnectRelease.engine_id !== engineManifests[0].engine_id
  || evidenceConnectRelease.corpus_schema !== 'okf-context-corpus.v3') throw new Error('Evidence Connect admission differs.');
if (corpusRelease.publication_status !== 'pinned' || !/^[a-f0-9]{40}$/.test(corpusRelease.version || '')) {
  throw new Error('Corpus publication is pending: pin an approved immutable DWP commit before building a release.');
}
const householdRelease = JSON.parse(await readFile('vendor/okf-dwp-household-corpus-release.json', 'utf8'));
if (householdRelease.publication_status !== 'pinned' || householdRelease.version !== '3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84' || householdRelease.version === corpusRelease.version) throw new Error('Exact original household source must remain separately available.');
const staffRelease = JSON.parse(await readFile('vendor/okf-dwp-staff-corpus-release.json', 'utf8'));
if (staffRelease.publication_status !== 'pinned' || !/^[a-f0-9]{40}$/.test(staffRelease.version || '') || staffRelease.version === corpusRelease.version) throw new Error('Distinct immutable staff corpus version is required.');
const previousRelease = JSON.parse(await readFile('vendor/okf-dwp-previous-corpus-release.json', 'utf8'));
if (previousRelease.publication_status !== 'pinned' || !/^[a-f0-9]{40}$/.test(previousRelease.version || '')
  || [corpusRelease.version, householdRelease.version, staffRelease.version].includes(previousRelease.version)) throw new Error('Distinct immutable corpus versions are required.');
const approved = [
  ['vendor/okf-dwp-assembly-index.json', '38159445a60d4bcabc23cb2cf728e14cbd0a4b55013276c291356e7a1452ff54'],
  ['vendor/okf-dwp-descriptor.json', '9881779ab550efe9f73da1e16acd8c8dcb64933c9981bb290b66ff51572853f3'],
  ['vendor/okf-dwp-corpus-manifest.json', corpusRelease.manifest_sha256],
  ['vendor/okf-dwp-evidence-connect-corpus-manifest.json', evidenceConnectRelease.manifest_sha256],
  ['vendor/okf-dwp-evidence-connect-descriptor.json', evidenceConnectRelease.descriptor_sha256],
  ['vendor/okf-dwp-household-corpus-manifest.json', householdRelease.manifest_sha256],
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
  'scripts/build.mjs', 'scripts/engine-admission.mjs', 'src/node.ts', 'package.json', 'package-lock.json',
  'vendor/okf-dwp-evidence-connect-descriptor.json',
  ...engineManifests.flatMap(engine => [...engine.files, 'manifest.json'].map(name => `vendor/engines/${engine.source_commit}/${name}`))])].sort()) {
  const localPath = path.replace(/^raw:/, '');
  inputs[localPath] = hash(await readFile(localPath));
}
const receipt = { schema: 'okf-remote-mcp-build.v1', service_version: '0.7.0', inputs,
  engines: engineManifests.map(({ engine_id, source_commit }) => ({ engine_id, source_commit })),
  outputs: { 'dist/server/index.js': hash(await readFile('dist/server/index.js')), 'dist/node.mjs': hash(await readFile('dist/node.mjs')) },
  worker_node_dependencies: false, bundle_version: evidenceConnectRelease.version,
  historical_bundle_versions: [corpusRelease.version, householdRelease.version, staffRelease.version, previousRelease.version, 'efb05c66616a9cd4328a86cf412780fe7bc7cf0b'] };
await writeFile('dist/build-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ built: ['dist/server/index.js', 'dist/node.mjs'], worker_sha256: receipt.outputs['dist/server/index.js'] }));
