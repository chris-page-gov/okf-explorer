import { describe, expect, it } from 'vitest';
import type { LargeDataset, LargeResource } from '$lib/types';
import {
  canDisplaySourceInline,
  narrativeBaseUrl,
  narrativeRouteGroups,
  narrativeRouteLinks,
  recordNarrative,
  recordTypeLabel,
  sourceAccesses,
  sourceOpenLabel
} from './largeRecordContracts';

const dataset: LargeDataset = {
  name: 'family',
  title: 'Family',
  narrative: {
    body: 'What comes before, what happens here, and what may follow.',
    process: { route: 'process/enclosing', label: 'Enclosing process' },
    next: [{ route: 'episode/follow-up', label: 'Follow up' }]
  }
};

describe('large record type label', () => {
  it('prefers the declared record type and preserves authored case', () => {
    expect(recordTypeLabel({ record_type: '  API Product  ', type: 'Dataset' }, 'Catalogue record'))
      .toBe('API Product');
  });

  it('uses type when record_type is absent, blank or not a string', () => {
    for (const record_type of [undefined, '', ' \n ', 42, ['API Product']]) {
      expect(recordTypeLabel({ record_type, type: '  Research Protocol  ' }, 'Catalogue record'))
        .toBe('Research Protocol');
    }
  });

  it('retains the collection label when neither declared type is usable', () => {
    expect(recordTypeLabel({}, 'Heritage record')).toBe('Heritage record');
    expect(recordTypeLabel({ record_type: '\t', type: ' ' }, 'API/data record')).toBe('API/data record');
    expect(recordTypeLabel({ record_type: {}, type: ['Dataset'] }, 'Catalogue record')).toBe('Catalogue record');
  });

  it('returns labels as text without interpreting markup or source family', () => {
    const record = { record_type: '<em>Case Study</em>', source_family: 'Research' };
    expect(recordTypeLabel(record, 'Catalogue record')).toBe('<em>Case Study</em>');
    expect(recordTypeLabel({ ...record, record_type: '' }, 'Catalogue record')).toBe('Catalogue record');
  });
});

describe('large record narrative contract', () => {
  it('resolves source-relative Markdown against its immutable original location', () => {
    const source = 'https://github.com/example/knowledge/blob/abc/records/concepts/height.md';
    expect(new URL('datum.md', narrativeBaseUrl({ body: 'See [datum](datum.md).', source_url: source }, 'https://preview.test/bundle.json')).href)
      .toBe('https://github.com/example/knowledge/blob/abc/records/concepts/datum.md');
    for (const source_url of ['file:///etc/passwd', 'https:example.test', 'https://user:pass@example.test/', 'https://example.test/%oops']) {
      expect(narrativeBaseUrl({ body: 'text', source_url }, 'https://preview.test/bundle.json')).toBe('https://preview.test/bundle.json');
    }
  });
  it('accepts a non-empty authored narrative and filters invalid route links', () => {
    expect(recordNarrative(dataset)?.process?.route).toBe('process/enclosing');
    expect(narrativeRouteLinks([dataset.narrative?.next?.[0], { route: '' }, null])).toEqual([
      { route: 'episode/follow-up', label: 'Follow up' }
    ]);
  });

  it('names only the populated process-navigation groups', () => {
    expect(narrativeRouteGroups(dataset.narrative!).map((group) => group.label)).toEqual(['What may follow']);
  });

  it('does not invent a narrative for an unpopulated record', () => {
    expect(recordNarrative({ name: 'empty', title: 'Empty' })).toBeNull();
  });
});

describe('typed source access contract', () => {
  it('does not promote an authored reference label to an official-source claim', () => {
    const [access] = sourceAccesses(dataset, [{ id: 'authored', dataset: 'family', source_access: {
      url: 'https://example.test/authored', label: 'Authored project reference',
      media_type: 'not-established', display_mode: 'link'
    } }]);
    expect(sourceOpenLabel(access)).toBe('Open Authored project reference ↗');
    expect(sourceOpenLabel({ ...access, label: ' ' })).toBe('Open source ↗');
  });

  it('keeps link-only sources out of the inline response viewer', () => {
    const resources: LargeResource[] = [{
      id: 'official-guidance',
      dataset: 'family',
      source_access: {
        url: 'https://www.gov.uk/example',
        label: 'Official guidance',
        media_type: 'text/html',
        display_mode: 'link'
      }
    }];
    const [access] = sourceAccesses(dataset, resources);
    expect(canDisplaySourceInline(access)).toBe(false);
    expect(sourceOpenLabel(access)).toBe('Open Official guidance ↗');
  });

  it('allows declared JSON, XML and text responses and deduplicates exact access routes', () => {
    const resources: LargeResource[] = ['json', 'xml', 'text', 'xml'].map((mode, index) => ({
      id: `${mode}-${index}`,
      dataset: 'family',
      source_access: {
        url: `https://example.test/source.${mode}`,
        label: `${mode} source`,
        media_type: mode === 'text' ? 'text/plain' : `application/${mode}`,
        display_mode: mode as 'json' | 'xml' | 'text'
      }
    }));
    const accesses = sourceAccesses(dataset, resources);
    expect(accesses.map((access) => access.display_mode)).toEqual(['json', 'xml', 'text']);
    expect(accesses.every(canDisplaySourceInline)).toBe(true);
  });

  it('retains source_api_url only as JSON compatibility behaviour', () => {
    const [access] = sourceAccesses({ ...dataset, source_api_url: 'https://example.test/legacy' }, []);
    expect(access).toMatchObject({ display_mode: 'json', media_type: 'application/json', legacy: true });
  });

  it('ignores incomplete or non-HTTP source declarations', () => {
    const invalid = [{
      id: 'unsafe',
      dataset: 'family',
      source_access: {
        url: 'javascript:alert(1)',
        label: 'Unsafe',
        media_type: 'text/html',
        display_mode: 'link' as const
      }
    }];
    expect(sourceAccesses({ ...dataset, source_api_url: 'not a URL' }, invalid)).toEqual([]);
  });
});
