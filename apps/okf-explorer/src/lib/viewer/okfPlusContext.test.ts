import { describe, expect, it } from 'vitest';
import { citationUrl, contextValueText, MAX_OKF_PLUS_CONTEXT_BYTES, okfPlusContext } from './okfPlusContext';

const id = 'https://example.test/okf/id/field/height';
const fixture = (metadata: Record<string, unknown> = {}) => ({
  schema: 'gis-ai-go.okf-plus-record-context.v1', record_id: id, source_revision: 'a'.repeat(40),
  metadata: { '@id': id, nativeIdentifier: 'height_m', ...metadata }
});

describe('retained OKF+ record explanations', () => {
  it('does not infer units or vertical references from a field suffix or planar CRS', () => {
    const context = okfPlusContext(fixture({ description: 'A height field', details: { crs: ['EPSG:27700'] } }))!;
    expect(context.fields.find(row => row.label === 'Units')?.present).toBe(false);
    expect(context.fields.find(row => row.label === 'Vertical datum')?.present).toBe(false);
    expect(context.fields.find(row => row.label === 'Definition')?.present).toBe(false);
    expect(context.json).toContain('A height field');
  });
  it('keeps missing, null, empty, zero and false source values distinct', () => {
    const context = okfPlusContext(fixture({ definition: null, unit: '', version: 0, rights: { executionAdmitted: false }, limitations: [] }))!;
    expect(context.fields.find(row => row.label === 'Definition')).toMatchObject({ present: true, value: null });
    expect(contextValueText(undefined)).toBe('Not recorded in this record.');
    expect(contextValueText(null)).toBe('Recorded as null.');
    expect(contextValueText('')).toBe('Recorded as an empty string.');
    expect(contextValueText([])).toBe('Recorded as an empty list.');
    expect(contextValueText(0)).toBe('0');
    expect(contextValueText(false)).toBe('false');
  });
  it('retains full qualifications, exact source pointers and the original metadata', () => {
    const original = fixture({ definition: { '@value': 'A source definition', '@language': 'en-GB' }, limitations: ['Source scope only'],
      sources: [{ resource: 'https://example.test/schema/v4', sourcePointer: '/properties/height', responseSha256: 'b'.repeat(64), retrievedAt: '2026-10-02T00:00:00Z' }],
      update: { releaseVersion: '4' }, details: { arbitraryNativeField: ['unchanged', null, 0] } });
    const result = okfPlusContext(original)!;
    expect(JSON.parse(result.json)).toEqual(original.metadata);
    expect(result.sources[0].sourcePointer).toBe('/properties/height');
    expect(result.fields.find(row => row.label === 'Source version')).toMatchObject({ key: 'update.releaseVersion', value: '4' });
    expect(contextValueText(result.fields.find(row => row.label === 'Definition')?.value)).toBe('A source definition');
  });
  it('rejects substituted identities, unknown versions, circular values and oversized metadata', () => {
    expect(okfPlusContext({ ...fixture(), record_id: 'https://example.test/other' })).toBeNull();
    expect(okfPlusContext({ ...fixture(), schema: 'future' })).toBeNull();
    const circular = fixture(); (circular.metadata as Record<string, unknown>).loop = circular.metadata;
    expect(okfPlusContext(circular)).toBeNull();
    expect(okfPlusContext(fixture({ description: 'x'.repeat(MAX_OKF_PLUS_CONTEXT_BYTES) }))).toBeNull();
  });
  it('only links credential-free web source references', () => {
    for (const value of ['javascript:alert(1)', 'file:///etc/passwd', 'https:example.test', 'https://user:pass@example.test/', 'https://example.test/%oops', 'https://example.test/a b']) expect(citationUrl(value)).toBeNull();
    expect(citationUrl('https://example.test/schema?version=4#field')).toBe('https://example.test/schema?version=4#field');
  });
  it('keeps selected native fields version-scoped and exposes only their explicit schema statements', () => {
    const field = { '@id': `${id}/field/height_relativemax_m`, 'dcterms:identifier': 'height_relativemax_m',
      'okfp:schemaDefinition': { '@value': { type: ['number', 'null'] }, '@type': '@json' },
      'okfp:queryable': false, 'prov:wasDerivedFrom': { '@id': 'https://example.test/building/v4/schema' } };
    const context = okfPlusContext(fixture({ 'okfp:field': [field], details: { crs: ['EPSG:27700'] } }))!;
    expect(context.nativeFields[0].id).toBe(field['@id']);
    expect(context.nativeFields[0].metadata).toEqual(field);
    expect(context.nativeFields[0].fields.find(row => row.label === 'Units')?.present).toBe(false);
    expect(context.nativeFields[0].fields.find(row => row.label === 'Vertical datum')?.present).toBe(false);
    expect(context.nativeFields[0].fields.find(row => row.label === 'Queryable declaration')).toMatchObject({ present: true, value: false });
    expect(context.nativeFields[0].sourceUrl).toBe('https://example.test/building/v4/schema');
    expect(okfPlusContext(fixture({ 'okfp:field': [field, field] }))?.nativeFields).toEqual([]);
    expect(okfPlusContext(fixture({ 'okfp:field': [{ ...field, '@id': 'https://example.test/another-version/field/height_relativemax_m' }] }))?.fieldError).toBeTruthy();
  });
});
