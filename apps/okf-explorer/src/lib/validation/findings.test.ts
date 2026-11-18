import { describe, expect, it } from 'vitest';
import { parseFindings, sourceRecordLink, webIri } from './findings';
import { routeFromHash } from '$lib/viewer/routeHash';

const bundle = 'https://example.test/bundle/okf-explorer.json';
const finding = {
  // Emitted by scripts/normalise_shacl_report.py for its two-occurrence fixture.
  id: '08044dfe6a7f014f34293fa5856ceae4b52c3c39b3455aefc475fd95025aba81',
  bundle,
  severity: 'violation',
  focus: 'urn:example:record',
  shape: 'urn:example:shape',
  path: 'urn:example:property',
  constraint: 'http://www.w3.org/ns/shacl#MinCountConstraintComponent',
  occurrences: 2
};
const report = {
  schema: 'okf-shacl-findings.v1',
  conforms: false,
  bundle,
  report_sha256: 'a'.repeat(64),
  findings: [finding]
};

describe('published SHACL findings', () => {
  it('accepts the normaliser’s stable identity and retains occurrences', async () => {
    await expect(parseFindings(report, bundle)).resolves.toMatchObject({ findings: [finding] });
    await expect(parseFindings({ ...report, conforms: true, findings: [] }, bundle))
      .resolves.toMatchObject({ conforms: true });
  });

  it('requires matching bundle, occurrence range, conformance state and unique identity', async () => {
    await expect(parseFindings(report, 'urn:another:bundle')).rejects.toThrow('bundle identity');
    await expect(parseFindings({ ...report, conforms: true }, bundle)).rejects.toThrow('SHACL report');
    await expect(parseFindings({ ...report, findings: [finding, finding] }, bundle)).rejects.toThrow('unique');
    await expect(parseFindings({ ...report, findings: [{ ...finding, occurrences: 0 }] }, bundle)).rejects.toThrow('count');
    await expect(parseFindings({ ...report, findings: [{ ...finding, path: 'urn:example:other' }] }, bundle))
      .rejects.toThrow('Finding ID');
  });

  it('preserves encoded record routes and links only to safe web IRIs', () => {
    const route = 'method/register%2Farchive';
    const link = new URL(sourceRecordLink(bundle, route), 'https://example.test/project/validation/');
    expect(link.pathname).toBe('/project/explore/');
    expect(link.searchParams.get('bundle')).toBe(bundle);
    expect(routeFromHash(link.hash)).toBe(route);
    expect(webIri('urn:example:record')).toBeUndefined();
    expect(webIri('https://example.test/record')).toBe('https://example.test/record');
  });
});
