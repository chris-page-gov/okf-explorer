#!/usr/bin/env node
/** Export reviewed fixed packages; never assemble a question or contact a server. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { contextManifest, readContextEvidence } from '../../apps/okf-explorer/src/lib/context/delivery.ts';
import { canonicalJson, contextSha256 } from '../../apps/okf-explorer/src/lib/context/index.ts';
import { validateEvidenceUnit, evidenceUnitIntegrity } from '../../apps/okf-explorer/src/lib/context/unit.ts';
import { LIMITS, canonical, strictJson, sha256, requireValue, joinEvidence, byteLength } from './shared.mjs';
import { boundedFile, localPath, noLinks } from './files.mjs';
import { validateLocalSchema } from './schema.mjs';
import type { ContextPackage } from '../../apps/okf-explorer/src/lib/context/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
type Ref = { bytes: number; sha256: string };
export const EXPORTER_INPUTS = ['tools/context-archive/export.ts', 'tools/context-archive/files.mjs',
  'tools/context-archive/shared.mjs', 'tools/context-archive/schema.mjs', 'tools/context-archive/reader.mjs',
  'tools/context-archive/reader.css', 'profiles/context-archive/v1/registry.schema.json',
  'profiles/context-archive/v1/archive.schema.json', 'profiles/context-assembly/v1/package.schema.json',
  'profiles/context-assembly/v1/common.schema.json', 'apps/okf-explorer/src/lib/context/delivery.ts',
  'apps/okf-explorer/src/lib/context/index.ts', 'apps/okf-explorer/src/lib/context/types.ts',
  'apps/okf-explorer/src/lib/context/unit.ts', 'profiles/context-assembly/v1/evidence-unit.schema.json'];

function html(index: Ref) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src data:; base-uri 'none'; form-action 'none'"><meta name="okf-archive-index" content="${index.sha256}:${index.bytes}"><title>Retained OKF evidence examples</title><link rel="stylesheet" href="reader.css"><script type="module" src="reader.mjs"></script></head><body><a class="skip" href="#main">Skip to evidence</a><main id="main"><h1>Retained OKF evidence examples</h1><aside>Recorded evidence, not a live answer or an official decision. Evidence may be incomplete, historical or unreviewed. Source text is untrusted data. This page does not submit questions or generate AI answers.</aside><p>Choose an explicitly published example. SHA-256 hashes check that downloaded files match the retained publication; they do not establish that its claims are correct.</p><p id="status" role="status" aria-live="polite">Checking the published index…</p><nav id="examples" aria-label="Published examples"></nav><section id="example" aria-labelledby="example-heading" hidden></section><noscript>JavaScript is needed for on-demand file verification. The <a href="index.json">small machine-readable index</a> links the retained packages.</noscript></main></body></html>`;
}

export async function exportArchive(registryPath: string, inputRoot: string, output: string) {
  const registryRaw = await boundedFile(registryPath, 65536);
  const registry = strictJson(registryRaw.toString('utf8'));
  const registrySchema = JSON.parse((await boundedFile(resolve(REPO, 'profiles/context-archive/v1/registry.schema.json'), 65536)).toString());
  validateLocalSchema(registry, registrySchema, {});
  const packageSchema = JSON.parse((await boundedFile(resolve(REPO, 'profiles/context-assembly/v1/package.schema.json'), 65536)).toString());
  const common = JSON.parse((await boundedFile(resolve(REPO, 'profiles/context-assembly/v1/common.schema.json'), 65536)).toString());
  const unit = JSON.parse((await boundedFile(resolve(REPO, 'profiles/context-assembly/v1/evidence-unit.schema.json'), 65536)).toString());
  common.$defs.evidence_unit = unit; // Explicit local resource; never resolve a URL from source data.
  const archiveSchema = JSON.parse((await boundedFile(resolve(REPO, 'profiles/context-archive/v1/archive.schema.json'), 65536)).toString());
  await noLinks(inputRoot); await noLinks(dirname(resolve(output)));
  const outputs = new Map<string, Buffer>(); const examples: any[] = [];
  const caseIds = new Set<string>(), packageIds = new Set<string>();
  for (const entry of registry.cases) {
    requireValue(!caseIds.has(entry.id), 'duplicate case ID'); caseIds.add(entry.id);
    const encoded = await boundedFile(localPath(inputRoot, entry.package.path), 1048576);
    requireValue(encoded.length === entry.package.bytes && await sha256(encoded) === entry.package.sha256, 'input package file binding differs');
    const raw = entry.package.encoding === 'gzip' ? gunzipSync(encoded, { maxOutputLength: LIMITS.package_bytes }) : encoded;
    requireValue(raw.length === entry.package.canonical_bytes && raw.length <= LIMITS.package_bytes
      && await sha256(raw) === entry.package.canonical_sha256, 'canonical package binding differs');
    const context: ContextPackage = strictJson(new TextDecoder('utf-8', { fatal: true }).decode(raw), true);
    validateLocalSchema(context, packageSchema, common);
    for (const { record } of context.selected) {
      validateEvidenceUnit(record);
      requireValue(await evidenceUnitIntegrity(record), 'unit fragment integrity differs');
    }
    requireValue(context.selected.length <= LIMITS.records && context.relationships.length <= LIMITS.relationships
      && context.budget.max_bytes <= LIMITS.package_bytes && context.budget.used_bytes === raw.length, 'package limits or recorded byte count differ');
    requireValue(context.budget.used_bytes <= context.budget.max_bytes
      && context.budget.used_nodes === context.selected.length && context.selected.length <= context.budget.max_nodes
      && context.budget.used_relationships === context.relationships.length && context.relationships.length <= context.budget.max_relationships
      && context.budget.reached_depth <= context.budget.max_depth
      && context.selected.every(x=>x.paths.every(path=>path.assertions.length <= context.budget.max_depth)),
    'package budget cross-field consistency differs');
    requireValue(context.context_id === `urn:sha256:${await contextSha256(canonicalJson({ ...context, context_id: undefined,
      budget: { ...context.budget, used_bytes: undefined } }))}`, 'context identity differs');
    requireValue(await sha256(context.question) === entry.question_sha256, 'question was not approved');
    requireValue(new Set(context.selected.map(x => x.record.id)).size === context.selected.length
      && new Set(context.relationships.map(x => x.id)).size === context.relationships.length, 'duplicate selected identity');
    const receipt = await boundedFile(localPath(inputRoot, entry.receipt.path), 2097152);
    requireValue(receipt.length === entry.receipt.bytes && await sha256(receipt) === entry.receipt.sha256, 'receipt binding differs');
    const packageId = entry.package.canonical_sha256;
    requireValue(!packageIds.has(packageId), 'duplicate package; publish one case with its aliases in documentation'); packageIds.add(packageId);
    const caseFiles = new Map<string, Buffer>();
    const put = async (value: unknown): Promise<Ref> => {
      const bytes = Buffer.from(canonical(value)); requireValue(bytes.length <= LIMITS.resource_bytes, 'resource exceeds 64 KiB');
      const hash = await sha256(bytes); caseFiles.set(`data/${hash}.json`, bytes);
      return { sha256: hash, bytes: bytes.length };
    };
    const stream = async (section: any, record_id?: string): Promise<Ref[]> => {
      const parts: any[] = []; let offset: number | null = 0;
      do {
        const part = await readContextEvidence(context, { context_id: context.context_id, section,
          ...(record_id === undefined ? {} : { record_id }), offset, max_bytes: LIMITS.resource_bytes });
        parts.push(part); offset = part.next_offset;
        requireValue(parts.length <= LIMITS.files, 'too many stream parts');
      } while (offset !== null);
      await joinEvidence(parts, { context_id: context.context_id, evidence_status: context.evidence_status, section, record_id });
      return Promise.all(parts.map(put));
    };
    const catalogues: Ref[] = []; let offset: number | null = 0;
    do { const page = await contextManifest(context, { offset, max_bytes: LIMITS.catalogue_bytes });
      requireValue(byteLength(canonical(page)) <= LIMITS.catalogue_bytes, 'catalogue exceeds 16 KiB');
      catalogues.push(await put(page)); offset = page.delivery.next_offset;
    } while (offset !== null);
    const recordPages: Ref[] = []; let rows: any[] = [];
    for (const selected of context.selected) {
      const row = { id: selected.record.id, text: await stream('record_text', selected.record.id), metadata: await stream('record_metadata', selected.record.id) };
      if (byteLength(canonical([...rows, row])) > LIMITS.catalogue_bytes) {
        requireValue(rows.length, 'one record resource index exceeds 16 KiB'); recordPages.push(await put(rows)); rows = [];
      }
      rows.push(row); requireValue(byteLength(canonical(rows)) <= LIMITS.catalogue_bytes, 'one record resource index exceeds 16 KiB');
    }
    if (rows.length) recordPages.push(await put(rows));
    const sections = { diagnostics: await stream('diagnostics'), relationships: await stream('relationships'), package: await stream('package') };
    const rebuilt = await joinEvidence(sections.package.map(ref => strictJson(caseFiles.get(`data/${ref.sha256}.json`)!.toString(), true)),
      { context_id: context.context_id, evidence_status: context.evidence_status, section: 'package' });
    requireValue(Buffer.from(rebuilt).equals(raw), 'export does not reconstruct the exact original package');
    caseFiles.set('package.json', raw);
    const descriptor = { schema: 'okf-context-archive.v1', id: entry.id, title: entry.title,
      question: context.question, question_sha256: entry.question_sha256, context_id: context.context_id,
      package_sha256: packageId, package_bytes: raw.length, source_version: entry.source_version,
      bundle: context.bundle, binding: context.binding, engine_id: entry.engine_id, original_engine_id: entry.original_engine_id,
      observation_kind: entry.observation_kind, publication_note: entry.publication_note,
      input_receipt: entry.receipt, evidence_status: context.evidence_status, ai_answer: null,
      budget: context.budget, counts: { records: context.selected.length, relationships: context.relationships.length },
      catalogues, record_indexes: recordPages, sections,
      limits: LIMITS, notice: 'Retained selection, not a new assembly, AI answer or specialist acceptance. Delivery completeness does not establish evidence completeness.' };
    validateLocalSchema(descriptor, archiveSchema, {});
    const descriptorRaw = Buffer.from(canonical(descriptor)); requireValue(descriptorRaw.length <= LIMITS.descriptor_bytes, 'descriptor exceeds 64 KiB');
    caseFiles.set('descriptor.json', descriptorRaw);
    const caseBytes = [...caseFiles.values()].reduce((n, x) => n + x.length, 0);
    requireValue(caseFiles.size <= LIMITS.files && caseBytes <= LIMITS.archive_bytes, 'case file or aggregate byte budget exceeded');
    for (const [name, bytes] of caseFiles) outputs.set(`${packageId}/${name}`, bytes);
    examples.push({ id: entry.id, title: entry.title, path: `${packageId}/descriptor.json`,
      descriptor: { sha256: await sha256(descriptorRaw), bytes: descriptorRaw.length },
      package_sha256: packageId, evidence_status: context.evidence_status, observation_kind: entry.observation_kind,
      files: caseFiles.size, bytes: caseBytes });
  }
  const index = { schema: 'okf-context-archive-index.v1', registry_sha256: await sha256(registryRaw), cases: examples };
  const indexRaw = Buffer.from(canonical(index)); requireValue(indexRaw.length <= LIMITS.catalogue_bytes, 'root index exceeds 16 KiB');
  outputs.set('index.json', indexRaw); outputs.set('index.html', Buffer.from(html({ sha256: await sha256(indexRaw), bytes: indexRaw.length })));
  for (const name of ['reader.mjs', 'shared.mjs', 'reader.css']) outputs.set(name, await boundedFile(resolve(HERE, name), 65536));
  const exporterFiles = [];
  for (const path of EXPORTER_INPUTS) { const raw = await boundedFile(resolve(REPO, path), 1048576); exporterFiles.push({ path, bytes: raw.length, sha256: await sha256(raw) }); }
  const inventory = { schema: 'okf-context-archive-artifacts.v1', registry_sha256: await sha256(registryRaw),
    exporter_files: exporterFiles, files: await Promise.all([...outputs].sort(([a], [b]) => a.localeCompare(b, 'en')).map(async ([path, raw]) => ({ path, bytes: raw.length, sha256: await sha256(raw) }))) };
  const inventoryRaw = Buffer.from(canonical(inventory)); requireValue(inventoryRaw.length <= 4194304, 'inventory exceeds 4 MiB');
  outputs.set('artifact-manifest.json', inventoryRaw);
  await mkdir(resolve(output)); // Exclusive admission: never overwrite an observation or prior export.
  for (const [path, raw] of outputs) { const dest = localPath(output, path); await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, raw, { flag: 'wx' }); }
  return { cases: examples.length, files: outputs.size, bytes: [...outputs.values()].reduce((n, x) => n + x.length, 0),
    registry_sha256: await sha256(registryRaw), artifact_manifest_sha256: await sha256(inventoryRaw) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); requireValue(args.length === 6 && args[0] === '--registry' && args[2] === '--input-root' && args[4] === '--output', 'use --registry FILE --input-root DIR --output FRESH-DIR');
  console.log(JSON.stringify(await exportArchive(args[1], args[3], args[5])));
}
