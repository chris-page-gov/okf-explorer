import { describe, expect, it } from 'vitest';
import type { LargeResource } from '$lib/types';
import { officialClmlUrl, officialDocumentUrl, provisionOfficialUrl, provisionPathFromId, provisionType } from './structure';

describe('legislation provision normalisation', () => {
  it('uses the typed CLML representation of the requested work and exact expression', () => {
    const document_uri = 'https://www.legislation.gov.uk/eur/2017/669';
    const url = document_uri + '/2024-12-31/data.xml';
    const resource = {
      id: 'eur-2017-669-clml-2024-12-31', dataset: 'eur-2017-669', resource_type: 'authoritative-structure',
      source_access: {
        url, label: 'Official structured legislation (CLML)', media_type: 'application/xml', display_mode: 'xml',
        content_profile: 'https://www.legislation.gov.uk/schema/legislation',
        representation_version: '2024-12-31', retrieval_mode: 'live'
      }
    } satisfies LargeResource;
    expect(officialClmlUrl({ document_uri, source_representations: [resource] })).toBe(url);
    expect(officialClmlUrl({ document_uri: document_uri + '/2023-01-01', source_representations: [resource] }))
      .toBe(document_uri + '/2023-01-01/data.xml');
    expect(officialClmlUrl({
      document_uri,
      source_representations: [{ ...resource, source_access: { ...resource.source_access, url: url.replace('/669/', '/668/') } }]
    })).toBe(document_uri + '/data.xml');
  });

  it('normalises nested official IDs into passage paths', () => {
    expect(provisionPathFromId('schedule-1-paragraph-3')).toBe('/schedule/1/paragraph/3');
    expect(provisionPathFromId('section-6')).toBe('/section/6');
  });

  it('falls back to a stable fragment when a semantic path is unavailable', () => {
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1998/42', 'body-1')).toBe(
      'https://www.legislation.gov.uk/ukpga/1998/42#body-1'
    );
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1998/42', 'section-6-1')).toBe(
      'https://www.legislation.gov.uk/ukpga/1998/42/section/6#section-6-1'
    );
  });

  it('puts dated versions after the selected provision and keeps enacted or made versions', () => {
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1992/4/2026-04-29', 'section-70')).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1992/4/enacted', 'section-70-subsection-1')).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/enacted#section-70-subsection-1');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/uksi/2020/1/made', 'regulation-2')).toBe('https://www.legislation.gov.uk/uksi/2020/1/regulation/2/made');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1984/27/prospective', 'section-22b')).toBe('https://www.legislation.gov.uk/ukpga/1984/27/section/22b/prospective');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/wsi/2026/99/made/welsh', 'regulation-2')).toBe('https://www.legislation.gov.uk/wsi/2026/99/regulation/2/made/welsh');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29', 'section-70')).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29');
  });

  it('rejects hostile official links before display', () => {
    expect(officialDocumentUrl('javascript:alert(1)')).toBe('');
    expect(officialDocumentUrl('https://www.legislation.gov.uk.evil.test/ukpga/1992/4')).toBe('');
    expect(officialDocumentUrl('https://user@www.legislation.gov.uk/ukpga/1992/4')).toBe('');
    expect(provisionOfficialUrl('javascript:alert(1)', 'section-70')).toBe('');
  });

  it('uses the official ID to distinguish semantic provision types', () => {
    expect(provisionType('P1', 'regulation-2')).toBe('Regulation');
    expect(provisionType('P2', 'section-6-subsection-1')).toBe('Nested provision (P2)');
    expect(provisionType('P2', 'schedule-1-paragraph-3')).toBe('Nested provision (P2)');
  });
});
