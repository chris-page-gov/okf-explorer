/** Stage the reviewed Evidence Connect source and engine from immutable local Git blobs. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContextCorpusManifest } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';
// @ts-ignore -- Shared pure Node admission module.
import { STRUCTURED_ENGINE_FILES, validateEngineManifest } from './engine-admission.mjs';

const SOURCE = '7eeded763042ddd0070f4fed834c6074149e8e2f';
const ENGINE = 'd6930bbcddaab616deec002d9e6efff6e3aae953';
const MANIFEST = 'structured-context/evidence-connect-manifest.json';
const DESCRIPTOR = 'structured-context/evidence-connect-explorer.json';
const sha = (raw: Uint8Array | string) => createHash('sha256').update(raw).digest('hex');
const canonical = (value: any): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);

function gitBlob(root: string, commit: string, path: string): Buffer {
  assert.match(path, /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/);
  assert.ok(!path.split('/').some(part => part === '.' || part === '..'));
  const key = `${commit}:${path}`, options = { cwd: root, timeout: 10000 };
  const bytes = Number(execFileSync('git', ['cat-file', '-s', key], { ...options, maxBuffer: 100 }).toString().trim());
  assert.ok(Number.isSafeInteger(bytes) && bytes > 0 && bytes <= 4 * 1024 * 1024, 'Immutable input exceeds bound');
  const raw = execFileSync('git', ['show', key], { ...options, maxBuffer: bytes + 1 });
  assert.equal(raw.length, bytes);
  return raw;
}

export function prepareEvidenceConnect(sourceRoot: string, engineRoot: string) {
  const manifestRaw = gitBlob(sourceRoot, SOURCE, MANIFEST);
  const descriptorRaw = gitBlob(sourceRoot, SOURCE, DESCRIPTOR);
  const manifest = validateContextCorpusManifest(JSON.parse(manifestRaw.toString()));
  assert.equal(manifest.schema, 'okf-context-corpus.v3');
  const descriptor = JSON.parse(descriptorRaw.toString());
  assert.equal(descriptor.schema, 'okf-explorer-large-corpus.v1');
  assert.equal(descriptor.snapshot_id, manifest.semantic_source_snapshot);
  assert.deepEqual(descriptor.entrypoint_integrity.context_corpus,
    { bytes: manifestRaw.length, path: 'evidence-connect-manifest.json', sha256: sha(manifestRaw) });
  const outputs = new Map<string, Buffer>();
  const files: Record<string, { bytes: number; sha256: string; source_path: string }> = {};
  for (const name of STRUCTURED_ENGINE_FILES as string[]) {
    const path = `apps/okf-explorer/src/lib/context/${name}`;
    const raw = gitBlob(engineRoot, ENGINE, path);
    files[name] = { bytes: raw.length, sha256: sha(raw), source_path: path };
    outputs.set(`engines/${ENGINE}/${name}`, raw);
  }
  const body = { schema: 'okf-context-engine-manifest.v2', source_commit: ENGINE,
    family: 'okf-context-assembly.v1', corpus_schemas: ['okf-context-corpus.v3'], files };
  const engine = { ...body, engine_id: `urn:okf:context-engine:sha256:${sha(canonical(body))}` };
  validateEngineManifest(engine, ENGINE);
  const release = { schema: 'okf-remote-corpus-release.v2', publication_status: 'pinned',
    selection: 'default', version: SOURCE, snapshot: manifest.bundle.snapshot,
    manifest_path: MANIFEST, manifest_sha256: sha(manifestRaw), manifest_bytes: manifestRaw.length,
    descriptor_path: DESCRIPTOR, descriptor_sha256: sha(descriptorRaw), descriptor_bytes: descriptorRaw.length,
    corpus_schema: manifest.schema, engine_id: engine.engine_id, engine_commit: ENGINE,
    limitation: 'Source-bound evidence delivery only; legal answerability and client acceptance require separate review.' };
  const json = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
  outputs.set(`engines/${ENGINE}/manifest.json`, json(engine));
  outputs.set('okf-dwp-evidence-connect-corpus-manifest.json', manifestRaw);
  outputs.set('okf-dwp-evidence-connect-descriptor.json', descriptorRaw);
  outputs.set('okf-dwp-evidence-connect-corpus-release.json', json(release));
  return { outputs, release };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.equal(args.length, 6);
  assert.equal(args[0], '--dwp-root'); assert.equal(args[2], '--engine-root'); assert.equal(args[4], '--out');
  const candidate = prepareEvidenceConnect(resolve(args[1]), resolve(args[3]));
  const destination = resolve(args[5]);
  await mkdir(destination);
  for (const [path, raw] of candidate.outputs) {
    const target = resolve(destination, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, raw, { flag: 'wx' });
  }
  console.log(JSON.stringify({ source_commit: SOURCE, engine_commit: ENGINE,
    outputs: candidate.outputs.size, network_calls: 0, model_calls: 0, deployed: false }));
}
