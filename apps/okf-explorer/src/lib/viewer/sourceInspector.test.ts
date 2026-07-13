import { describe, expect, it } from 'vitest';
import componentSource from './SourceInspector.svelte?raw';
import { formatBytes, jsonNodeMatches, jsonPath, sourceHostname, sourcePayload, sourceSummary } from './sourceInspector';

const ckanResponse = {
  success: true,
  result: {
    id: 'c8f5787c-3332-4cf1-b72d-b434acfaf911',
    name: 'land-registry-inspire-download-service-metadata',
    title: 'Land Registry INSPIRE Download Service Metadata',
    notes: 'INSPIRE Polygons for England and Wales.',
    license_title: 'UK Open Government Licence (OGL)',
    metadata_modified: '2020-11-25T09:06:58.705403',
    organization: { name: 'land-registry', title: 'HM Land Registry' },
    resources: [],
    tags: [{ name: 'Geospatial' }, { display_name: 'Cadastral parcels' }]
  }
};

describe('source inspector helpers', () => {
  it('unwraps CKAN responses into a useful human summary', () => {
    expect(sourcePayload(ckanResponse)).toBe(ckanResponse.result);
    expect(sourceSummary(ckanResponse, 'Fallback')).toEqual({
      title: 'Land Registry INSPIRE Download Service Metadata',
      description: 'INSPIRE Polygons for England and Wales.',
      rows: [
        { label: 'Source status', value: 'Successful response' },
        { label: 'Identifier', value: 'c8f5787c-3332-4cf1-b72d-b434acfaf911' },
        { label: 'Publisher', value: 'HM Land Registry' },
        { label: 'Licence', value: 'UK Open Government Licence (OGL)' },
        { label: 'Last modified', value: '2020-11-25T09:06:58.705403' },
        { label: 'Resources', value: '0' }
      ],
      tags: ['Geospatial', 'Cadastral parcels']
    });
  });

  it('matches nested JSON while preserving ancestors and paths', () => {
    expect(jsonNodeMatches('$', ckanResponse, '$', 'HM Land Registry')).toBe(true);
    expect(jsonNodeMatches('organization', ckanResponse.result.organization, '$.result.organization', 'publisher absent')).toBe(false);
    expect(jsonPath('$.result.resources', '0')).toBe('$.result.resources[0]');
    expect(jsonPath('$', 'odd key')).toBe('$["odd key"]');
  });

  it('formats response provenance without exposing ambiguous token language', () => {
    expect(formatBytes(850)).toBe('850 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
    expect(sourceHostname('https://ckan.publishing.service.gov.uk/api/3/action/package_show?id=x')).toBe('ckan.publishing.service.gov.uk');
  });
});

describe('SourceInspector UI harness', () => {
  it('keeps the in-app view primary and raw JSON explicitly in a new tab', () => {
    expect(componentSource).toContain('Source data');
    expect(componentSource).toContain('← Back to record');
    expect(componentSource).toContain('Open raw JSON ↗');
    expect(componentSource).toContain('target="_blank" rel="noopener noreferrer"');
  });

  it('offers summary, searchable tree and raw views with copy controls', () => {
    expect(componentSource).toContain('Summary');
    expect(componentSource).toContain('JSON tree');
    expect(componentSource).toContain('Raw JSON');
    expect(componentSource).toContain('Find a field or value');
    expect(componentSource).toContain('Copy value');
    expect(componentSource).toContain('Copy path');
    expect(componentSource).not.toContain('{@html');
  });
});
