/** Pure archive admission; no module loading, acquisition or source execution. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const LEGACY_ENGINE_FILES = Object.freeze(['corpus.ts', 'index.ts', 'types.ts']);
export const STRUCTURED_ENGINE_FILES = Object.freeze(['corpus.ts', 'corpusV3.ts', 'index.ts', 'types.ts', 'unit.ts']);
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const sha = raw => createHash('sha256').update(raw).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function validateEngineManifest(raw, commit) {
  assert.match(commit, /^[a-f0-9]{40}$/, 'Immutable engine commit required');
  assert.ok(object(raw), 'Engine manifest must be an object');
  const { engine_id, ...manifest } = raw;
  const structured = manifest.schema === 'okf-context-engine-manifest.v2';
  assert.ok(structured || manifest.schema === 'okf-context-engine-manifest.v1', 'Unsupported engine manifest');
  assert.deepEqual(Object.keys(raw).sort(), ['schema', 'source_commit', 'family', 'files', 'engine_id', ...(structured ? ['corpus_schemas'] : [])].sort(), 'Unsupported engine manifest fields');
  assert.equal(manifest.source_commit, commit);
  assert.equal(manifest.family, 'okf-context-assembly.v1');
  assert.equal(engine_id, `urn:okf:context-engine:sha256:${sha(canonical(manifest))}`, 'Engine manifest identity mismatch');
  assert.ok(object(manifest.files), 'Engine module bindings required');
  const names = structured ? STRUCTURED_ENGINE_FILES : LEGACY_ENGINE_FILES;
  assert.deepEqual(Object.keys(manifest.files).sort(), names, 'Exact versioned engine modules required');
  if (structured) assert.deepEqual(manifest.corpus_schemas, ['okf-context-corpus.v3'], 'Only the reviewed structured corpus family is admitted');
  for (const [name, ref] of Object.entries(manifest.files)) {
    assert.ok(object(ref)); assert.deepEqual(Object.keys(ref).sort(), ['bytes', 'sha256', 'source_path']);
    assert.ok(Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= 1024 * 1024, 'Bounded engine module required');
    assert.match(ref.sha256, /^[a-f0-9]{64}$/);
    assert.equal(ref.source_path, `apps/okf-explorer/src/lib/context/${name}`);
  }
  return { engine_id, source_commit: commit, files: [...names] };
}
export function verifyEngineModule(raw, ref) {
  assert.equal(raw.length, ref.bytes, 'Frozen engine byte count differs');
  assert.equal(sha(raw), ref.sha256, 'Frozen engine digest differs');
}
