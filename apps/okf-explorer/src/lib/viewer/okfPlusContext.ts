/** A read-only presentation of retained producer metadata, without inferred facts. */
export const MAX_OKF_PLUS_CONTEXT_BYTES = 2 * 1024 * 1024;
export type ContextField = { label: string; key: string; present: boolean; value: unknown };
export type OkfPlusContext = {
  id: string; revision: string; fields: ContextField[]; sources: Record<string, unknown>[];
  metadata: Record<string, unknown>; json: string; nativeFields: NativeField[]; fieldError: string;
};
export type NativeField = { id: string; name: string; metadata: Record<string, unknown>; fields: ContextField[]; sourceUrl: string | null };

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function ownPath(root: Record<string, unknown>, path: string[]): { present: boolean; value: unknown } {
  let value: unknown = root;
  for (const key of path) {
    const record = object(value);
    if (!record || !Object.hasOwn(record, key)) return { present: false, value: undefined };
    value = record[key];
  }
  return { present: true, value };
}

export function contextValueText(value: unknown): string {
  if (value === undefined) return 'Not recorded in this record.';
  if (value === null) return 'Recorded as null.';
  if (value === '') return 'Recorded as an empty string.';
  if (Array.isArray(value) && !value.length) return 'Recorded as an empty list.';
  if (typeof value === 'object') {
    const record = object(value);
    if (record && Object.hasOwn(record, '@value')) return contextValueText(record['@value']);
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export function citationUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !/^https?:\/\//.test(value) || value.length > 4096 || /[\s<>"\\]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password ? value : null;
  } catch { return null; }
}

function selectedField(root: Record<string, unknown>, label: string, ...paths: string[][]): ContextField {
  for (const path of paths) {
    const result = ownPath(root, path);
    if (result.present) return { label, key: path.join('.'), ...result };
  }
  return { label, key: paths[0].join('.'), present: false, value: undefined };
}

function nativeFields(metadata: Record<string, unknown>, parent: string): { nativeFields: NativeField[]; fieldError: string } {
  if (!Object.hasOwn(metadata, 'okfp:field')) return { nativeFields: [], fieldError: '' };
  const rows = metadata['okfp:field'];
  const output: NativeField[] = [], ids = new Set<string>();
  const invalid = { nativeFields: [], fieldError: 'The native field list has invalid or repeated identities. Inspect the retained metadata; no fields have been combined.' };
  if (!Array.isArray(rows) || rows.length > 5000) return invalid;
  for (const value of rows) {
    const row = object(value);
    if (!row || typeof row['@id'] !== 'string' || !row['@id'].startsWith(`${parent}/field/`) || ids.has(row['@id'])
      || typeof row['dcterms:identifier'] !== 'string' || !row['dcterms:identifier']) return invalid;
    ids.add(row['@id']);
    output.push({ id: row['@id'], name: row['dcterms:identifier'], metadata: row,
      sourceUrl: citationUrl(object(row['prov:wasDerivedFrom'])?.['@id']),
      fields: [
        selectedField(row, 'Definition or schema description', ['skos:definition'], ['definition'], ['okfp:schemaDefinition', '@value', 'description']),
        selectedField(row, 'Units', ['unit'], ['okfp:schemaDefinition', '@value', 'unit'], ['okfp:schemaDefinition', '@value', 'units']),
        selectedField(row, 'Derivation or measurement method', ['derivationMethod']),
        selectedField(row, 'Vertical datum', ['verticalDatum']),
        selectedField(row, 'Queryable declaration', ['okfp:queryable'])
      ] });
  }
  return { nativeFields: output, fieldError: '' };
}

export function okfPlusContext(value: unknown): OkfPlusContext | null {
  const envelope = object(value), metadata = object(envelope?.metadata);
  if (envelope?.schema !== 'gis-ai-go.okf-plus-record-context.v1' || !metadata
    || typeof envelope.record_id !== 'string' || envelope.record_id !== metadata['@id']
    || !citationUrl(envelope.record_id)) return null;
  let json: string;
  try {
    json = JSON.stringify(metadata, null, 2);
    if (new TextEncoder().encode(json).length > MAX_OKF_PLUS_CONTEXT_BYTES) return null;
  } catch { return null; }
  const field = (label: string, ...paths: string[][]) => selectedField(metadata, label, ...paths);
  const sources = Array.isArray(metadata.sources) ? metadata.sources.map(object).filter((row): row is Record<string, unknown> => row !== null) : [];
  const source = object(metadata.source);
  if (source) sources.push(source);
  if (!sources.length && Object.hasOwn(metadata, 'resource')) sources.push({ resource: metadata.resource });
  return {
    id: envelope.record_id,
    revision: typeof envelope.source_revision === 'string' ? envelope.source_revision : '',
    metadata, json, sources, ...nativeFields(metadata, envelope.record_id),
    fields: [
      field('Native identifier', ['nativeIdentifier']),
      field('Source version', ['version'], ['update', 'releaseVersion']),
      field('Definition', ['definition'], ['skos:definition'], ['details', 'definition']),
      field('Units', ['unit'], ['details', 'unit']),
      field('Derivation or measurement method', ['derivationMethod'], ['details', 'derivationMethod']),
      field('Vertical datum', ['verticalDatum'], ['details', 'verticalDatum']),
      field('Declared coverage or extent', ['coverage'], ['details', 'coverage'], ['details', 'extent']),
      field('Temporal context', ['temporal']),
      field('Retrieval instructions', ['retrieval'], ['details', 'retrieval'], ['details', 'retrievalInstructions']),
      field('Qualifications', ['limitations']),
      field('Evidence gaps', ['gaps']),
      field('Rights and retrieval authority', ['rights'])
    ]
  };
}
