/** Vendor the exact reviewed producer bytes, preserving every legacy engine. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flags = {};
for (let n = 0; n < args.length; n++) {
  if (['--candidate', '--check'].includes(args[n])) { assert(!flags[args[n]], 'Duplicate flag'); flags[args[n]] = true; }
  else { assert(['--dwp-root', '--source-commit'].includes(args[n]) && args[n + 1] && !flags[args[n]], 'Expected explicit graph source arguments'); flags[args[n]] = args[++n]; }
}
assert(flags['--dwp-root'], 'Use --dwp-root PATH --source-commit FULL_SHA, or --candidate for local development');
assert(flags['--candidate'] || /^[a-f0-9]{40}$/.test(flags['--source-commit']), 'Immutable reviewed producer commit required');
const dwp = resolve(flags['--dwp-root']);
const sha = raw => createHash('sha256').update(raw).digest('hex');
const canonical = v => Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}' : JSON.stringify(v);
const source = async path => flags['--candidate'] ? readFile(resolve(dwp, path))
  : execFileSync('git', ['-C', dwp, 'show', `${flags['--source-commit']}:${path}`], { maxBuffer: 32 * 1024 * 1024 });
const graph = await source('retrieval-graph/graph.json');
const policy = JSON.parse(await source('domain-profile/context-recovery/policy.yamlld'));
const modules = {}, output = new Map([['graph.json', graph]]);
for (const name of ['graph_evidence_runtime.mjs', 'insufficiency_categories.mjs', 'graph_evidence_client.mjs']) {
  const raw = await source('scripts/' + name); output.set(name, raw);
  if (name !== 'graph_evidence_client.mjs') modules[name] = sha(raw);
}
const parsed = JSON.parse(graph);
assert.equal(parsed.schema, 'okf-dwp-evidence-route-graph.v1');
for (const ref of parsed.source_bindings) {
  assert(/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(ref.path) && !ref.path.split('/').some(p => p === '..' || p === '.'), 'Unsafe graph input reference');
  const raw = await source(ref.path);
  assert.equal(raw.length, ref.bytes); assert.equal(sha(raw), ref.sha256, 'Producer graph input differs: ' + ref.path);
}
const admission = { schema: 'okf-graph-engine-admission.v1', modules, resolver: policy.engine };
const release = { schema: 'okf-graph-evidence-admission.v1', publication_status: flags['--candidate'] ? 'candidate' : 'pinned',
  source_repository: 'https://github.com/chris-page-gov/okf-dwp', source_commit: flags['--candidate'] ? null : flags['--source-commit'],
  graph_sha256: sha(graph), engine_id: 'urn:okf:graph-engine:sha256:' + sha(canonical(admission)),
  engine_admission: admission, client_sha256: sha(output.get('graph_evidence_client.mjs')) };
output.set('admission.json', Buffer.from(JSON.stringify(release, null, 2) + '\n'));
for (const [name, bytes] of output) {
  const path = resolve(root, 'vendor/graph-evidence', name);
  if (flags['--check']) assert.deepEqual(await readFile(path), bytes, 'Vendored evidence graph is stale: ' + name);
  else await writeFile(path, bytes);
}
console.log(JSON.stringify({ status: flags['--check'] ? 'current' : 'prepared', ...release, engine_admission: undefined }));
