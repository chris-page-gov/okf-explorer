import { describe, expect, it } from 'vitest';
import {
  relationshipAuthorityClass,
  relationshipPresentation,
  summarizeRelationships
} from './relationshipPresentation';

describe('relationship presentation', () => {
  it('keeps official, derived and model-assisted assertions visibly distinct', () => {
    expect(relationshipAuthorityClass({ authority: { class: 'official' } })).toBe('official');
    expect(relationshipAuthorityClass({ derivation: 'deterministic' })).toBe('derived');
    expect(relationshipAuthorityClass({ authority_class: 'model_assisted' })).toBe('model-assisted');
    expect(relationshipAuthorityClass({})).toBe('unclassified');
  });

  it('reports freshness and credential-free evidence without upgrading authority', () => {
    const result = relationshipPresentation({
      authority: { class: 'model-assisted', label: 'Candidate classification' },
      confidence: 0.96,
      observed_at: '2026-07-24T00:00:00Z',
      stale_after: '2026-07-26T00:00:00Z',
      evidence: [
        'https://example.test/evidence',
        'javascript:alert(1)'
      ]
    }, new Date('2026-07-25T00:00:00Z'));

    expect(result.authorityClass).toBe('model-assisted');
    expect(result.authorityLabel).toBe('Candidate classification');
    expect(result.confidence).toBe('0.96');
    expect(result.freshness).toBe('current');
    expect(result.evidenceUrls).toEqual(['https://example.test/evidence']);
  });

  it('summarizes the loaded relationship rows by predicate, authority and freshness', () => {
    const summary = summarizeRelationships([
      {
        predicate: 'amends',
        authority: { class: 'official' },
        freshness: 'current'
      },
      {
        predicate: 'topic',
        authority: { class: 'model-assisted' },
        freshness: 'unknown'
      },
      {
        predicate: 'topic',
        derivation: 'deterministic',
        freshness: 'stale'
      }
    ]);

    expect(summary.total).toBe(3);
    expect(summary.by_predicate).toEqual({ amends: 1, topic: 2 });
    expect(summary.by_authority.official).toBe(1);
    expect(summary.by_authority.derived).toBe(1);
    expect(summary.by_authority['model-assisted']).toBe(1);
    expect(summary.by_freshness).toEqual({ current: 1, stale: 1, unknown: 1 });
  });
});
