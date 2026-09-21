/** Synthetic evidence and explicit registries for offline tests only. */
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { assembleContext } from '../../apps/okf-explorer/src/lib/context/index.ts';
import { canonical, sha256 } from './shared.mjs';
import { boundedFile } from './files.mjs';
export async function syntheticContext(text = 'Synthetic room evidence. <script>unsafe()</script> 💷') {
  const base = 'https://example.test/museum/'; const literal = await sha256(text);
  const record = { id: base + 'evidence/room', route: 'evidence/room', label: 'Fictional room', kind: 'evidence' as const,
    aliases: ['Museum room'], text, assertion_status: 'normalized' as const,
    authority: { class: 'synthetic' as const, label: 'Invented museum fixture', source: base },
    scope: 'Fictional teaching evidence; no real venue.', provenance: [{ url: base, source_sha256: literal,
      locator: 'Synthetic passage', captured_at: '2026-09-21T00:00:00Z', source_date: '2026-04', source_date_kind: 'Fictional edition month', literal_sha256: literal }],
    rights: 'CC0 synthetic data', access: 'public' as const };
  const concept = { ...record, id: base + 'concept/museum', route: 'concept/museum', kind: 'concept' as const,
    label: 'Museum room', aliases: ['Museum room'], text: 'Navigation concept for the fictional museum room.',
    provenance: record.provenance.map(({literal_sha256: _literal, ...rest})=>rest) };
  return assembleContext({ schema: 'okf-context-index.v1', bundle: { id: base + 'bundle', snapshot: 'fictional-v1', source_url: base },
    scope: record.scope, limitations: ['Synthetic example only.'], records: [record, concept], assertions: [{
      id: base + 'assertion/room', source: concept.id, target: record.id, predicate: 'http://purl.org/dc/terms/references',
      label: 'references', assertion_status: 'normalized', authority: record.authority, scope: record.scope,
      provenance: record.provenance }], requirements: [] }, 'Explain Museum room');
}
export async function prepareSynthetic(root: string, context?: any) {
  context ??= await syntheticContext();
  await mkdir(root, { recursive: true });
  const canonicalRaw = Buffer.from(canonical(context)); const compressed = gzipSync(canonicalRaw, { mtime: 0 } as any);
  await writeFile(resolve(root, 'package.json.gz'), compressed); const receipt = Buffer.from(canonical({ schema: 'synthetic-test-receipt.v1', public_network: false }));
  await writeFile(resolve(root, 'receipt.json'), receipt);
  const entry = { id: 'museum', title: 'Fictional museum room', package: { path: 'package.json.gz', encoding: 'gzip', bytes: compressed.length,
    sha256: await sha256(compressed), canonical_bytes: canonicalRaw.length, canonical_sha256: await sha256(canonicalRaw) },
    receipt: { path: 'receipt.json', bytes: receipt.length, sha256: await sha256(receipt) }, question_sha256: await sha256(context.question), source_version: 'fictional-v1',
    engine_id: 'synthetic-test-assembler', original_engine_id: null, observation_kind: 'synthetic', approved_publication: true, publication_note: 'Explicit synthetic test publication; not a real service or model answer.' };
  const registry = { schema: 'okf-context-archive-registry.v1', cases: [entry] };
  await writeFile(resolve(root, 'registry.json'), canonical(registry)); return { registry, context };
}
export async function retainedRegistry(repo: string) {
  const prefix = 'services/ask-okf-mcp/validation/candidates/release-0.6.0-2026-09-21/integration-02/';
  const receiptRaw = await boundedFile(resolve(repo, prefix + 'observation.json'), 2097152);
  const receipt = JSON.parse(receiptRaw.toString()); const cases = [];
  for (const [caseIndex, id] of [[0, 'current-care-home'], [1, 'unknown-control'], [3, 'historical-care-home']] as const) {
    const row = receipt.cases[caseIndex], path = prefix + row.retained_package;
    const encoded = await boundedFile(resolve(repo, path), 1048576), raw = gunzipSync(encoded, { maxOutputLength: 524288 });
    const context = JSON.parse(raw.toString());
    cases.push({ id, title: `Retained local ${id}`, package: { path, encoding: 'gzip', bytes: encoded.length, sha256: await sha256(encoded),
      canonical_bytes: raw.length, canonical_sha256: await sha256(raw) }, receipt: { path: prefix + 'observation.json', bytes: receiptRaw.length, sha256: await sha256(receiptRaw) },
      question_sha256: row.question_sha256, source_version: row.source_version, engine_id: row.engine_id,
      original_engine_id: id === 'historical-care-home' ? null : row.engine_id, observation_kind: 'local', approved_publication: true,
      publication_note: 'Offline acceptance fixture from a retained local integration observation. No new public request or specialist acceptance.' });
  }
  return { schema: 'okf-context-archive-registry.v1', cases };
}
