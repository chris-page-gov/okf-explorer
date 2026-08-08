import { describe, expect, it } from 'vitest';
import type { LargeDataset, LargeResource } from '$lib/types';
import {
  canDisplaySourceInline,
  narrativeRouteGroups,
  narrativeRouteLinks,
  recordNarrative,
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

describe('large record narrative contract', () => {
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
    expect(sourceOpenLabel(access)).toBe('Open official source ↗');
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
