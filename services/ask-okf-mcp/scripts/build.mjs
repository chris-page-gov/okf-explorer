import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const hash = value => createHash('sha256').update(value).digest('hex');
const corpusRelease = JSON.parse(await readFile('vendor/okf-dwp-corpus-release.json', 'utf8'));
if (corpusRelease.publication_status !== 'pinned' || !/^[a-f0-9]{40}$/.test(corpusRelease.version || '')) {
  throw new Error('Corpus publication is pending: pin an approved immutable DWP commit before building a release.');
}
const approved = [
  ['vendor/okf-dwp-assembly-index.json', '38159445a60d4bcabc23cb2cf728e14cbd0a4b55013276c291356e7a1452ff54'],
  ['vendor/okf-dwp-descriptor.json', '9881779ab550efe9f73da1e16acd8c8dcb64933c9981bb290b66ff51572853f3'],
  ['vendor/okf-dwp-corpus-manifest.json', corpusRelease.manifest_sha256]
];
for (const [path, digest] of approved) if (hash(await readFile(path)) !== digest) throw new Error(`Integrity mismatch: ${path}`);
const raw = { name: 'raw-file', setup(build) {
  build.onResolve({ filter: /\?raw$/ }, args => ({
    path: relative(root, resolve(args.resolveDir, args.path.slice(0, -4))).replaceAll('\\', '/'), namespace: 'raw'
  }));
  build.onLoad({ filter: /.*/, namespace: 'raw' }, async args => ({ contents: await readFile(resolve(root, args.path), 'utf8'), loader: 'text' }));
} };
const shared = { tsconfigRaw: { compilerOptions: { target: 'ES2022', useDefineForClassFields: true } }, bundle: true, format: 'esm', target: 'es2022', plugins: [raw], metafile: true, sourcemap: false, legalComments: 'eof' };
await mkdir('dist/server', { recursive: true });
const worker = await build({ ...shared, entryPoints: ['src/worker.ts'], outfile: 'dist/server/index.js', platform: 'browser', conditions: ['workerd', 'browser'] });
if (Object.keys(worker.metafile.inputs).some(p => /shimsNode|ajvProvider|node:/.test(p))) throw new Error('Worker includes a Node/Ajv dependency.');
await build({ ...shared, entryPoints: ['src/node.ts'], outfile: 'dist/node.mjs', platform: 'node', packages: 'external' });
const inputs = {};
for (const path of [...new Set([...Object.keys(worker.metafile.inputs).filter(p => !p.startsWith('node_modules/')),
  'package.json', 'package-lock.json'])].sort()) {
  const localPath = path.replace(/^raw:/, '');
  inputs[localPath] = hash(await readFile(localPath));
}
const receipt = { schema: 'okf-remote-mcp-build.v1', service_version: '0.3.0', inputs,
  outputs: { 'dist/server/index.js': hash(await readFile('dist/server/index.js')), 'dist/node.mjs': hash(await readFile('dist/node.mjs')) },
  worker_node_dependencies: false, bundle_version: corpusRelease.version,
  historical_bundle_versions: ['efb05c66616a9cd4328a86cf412780fe7bc7cf0b'] };
await writeFile('dist/build-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ built: ['dist/server/index.js', 'dist/node.mjs'], worker_sha256: receipt.outputs['dist/server/index.js'] }));
