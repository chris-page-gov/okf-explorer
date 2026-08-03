import { describe, expect, it } from 'vitest';
import {
  relationshipAuthorityClass,
  relationshipPresentation,
  summarizeRelationships
} from './relationshipPresentation';

describe('relationship presentation', () => {
  it('keeps official, derived and model-assisted assertions visibly distinct', () => {
    expect(relationshipAuthorityClass({ authority: { class: 'official' } })).toBe('official');
    expect(relationshipAuthorityClass({ authority: 'official-source' })).toBe('official');
    expect(relationshipAuthorityClass({ derivation: 'deterministic' })).toBe('derived');
    expect(relationshipAuthorityClass({ authority: 'derived-non-official' })).toBe('derived');
    expect(relationshipAuthorityClass({ authority_class: 'model_assisted' })).toBe('model-assisted');
    expect(relationshipAuthorityClass({ assertion_scope: 'synthetic-fixture' })).toBe('synthetic');
    expect(relationshipAuthorityClass({})).toBe('unclassified');
  });

  it('presents semantic identity, status, derivation and evidence independently', () => {
    const result = relationshipPresentation({
      id: 'https://example.test/assertion/1',
      source_iri: 'https://example.test/asset/1',
      target_iri: 'https://example.test/designation/1',
      predicate: 'https://example.test/vocabulary/hasDesignation',
      inverse_label: 'designation of',
      assertion_status: 'inferred',
      assertion_scope: 'real-world',
      authority: { class: 'derived', label: 'Boundary rule' },
      derivation: 'https://example.test/rules/within-v1',
      derivation_activity: 'https://example.test/activity/build-1',
      rule: 'https://example.test/rules/within-v1',
      supporting_assertions: ['https://example.test/assertion/source-1'],
      confidence_score: 0.91,
      evidence: [{
        url: 'https://example.test/source/1',
        source_artifact: 'source/1.json',
        source_sha256: 'a'.repeat(64),
        source_field: 'geometry',
        locator: '/geometry',
        retrieved_at: '2026-08-01T12:00:00Z'
      }]
    });

    expect(result).toEqual(expect.objectContaining({
      id: 'https://example.test/assertion/1',
      predicate: 'https://example.test/vocabulary/hasDesignation',
      inverseLabel: 'designation of',
      sourceIri: 'https://example.test/asset/1',
      targetIri: 'https://example.test/designation/1',
      assertionStatus: 'inferred',
      assertionScope: 'real-world',
      authorityClass: 'derived',
      derivationActivity: 'https://example.test/activity/build-1',
      rule: 'https://example.test/rules/within-v1',
      supportingAssertions: ['https://example.test/assertion/source-1'],
      confidence: '0.91'
    }));
    expect(result.evidenceItems[0]).toEqual(expect.objectContaining({
      sourceArtifact: 'source/1.json',
      sourceSha256: 'a'.repeat(64),
      locator: '/geometry',
      retrievedAt: '2026-08-01T12:00:00Z'
    }));
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

  it('preserves governed title then notes evidence and its support profile', () => {
    const result = relationshipPresentation({
      authority: { class: 'model-assisted' },
      support_profile: 'multi-field',
      review_status: 'accepted-independent-review',
      official_legal_classification: false,
      rights: {
        source:
          'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
        assertion: 'derived discovery metadata'
      },
      evidence: [
        {
          url: 'https://www.legislation.gov.uk/id/ukpga/1998/42',
          type: 'literal-title-match',
          source_field: 'title',
          field_provenance: 'official-source-record-work-title',
          source_value: 'Consumer Credit Act 1998',
          source_value_sha256: 'a'.repeat(64),
          source_value_hash_canonicalization: 'canonical-json-utf8',
          normalization: 'Unicode-NFC-and-whitespace-collapse',
          value: 'Consumer Credit',
          literal_sha256: 'b'.repeat(64),
          rule_id: 'R001',
          rationale: 'Named field'
        },
        {
          url: 'https://www.legislation.gov.uk/id/ukpga/1998/42',
          type: 'literal-notes-match',
          source_field: 'notes',
          field_provenance: 'official-source-record-explanatory-note-or-long-title-equivalent',
          source_value: 'An Act concerning regulated consumer credit agreements.',
          source_value_sha256: 'c'.repeat(64),
          source_value_hash_canonicalization: 'canonical-json-utf8',
          normalization: 'Unicode-NFC-and-whitespace-collapse',
          value: 'regulated consumer credit',
          literal_sha256: 'd'.repeat(64),
          rule_id: 'R001',
          rationale: 'Supporting long-title equivalent'
        }
      ]
    });

    expect(result.supportProfile).toBe('multi-field');
    expect(result.reviewStatus).toBe('accepted-independent-review');
    expect(result.officialLegalClassification).toBe(false);
    expect(result.rightsSource).toBe(
      'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
    );
    expect(result.rightsAssertion).toBe('derived discovery metadata');
    expect(result.rights).toBe(result.rightsSource);
    expect(result.evidenceItems.map(({ sourceField }) => sourceField)).toEqual([
      'title',
      'notes'
    ]);
    expect(result.evidenceItems[1]).toEqual(
      expect.objectContaining({
        sourceValue: 'An Act concerning regulated consumer credit agreements.',
        sourceValueHashCanonicalization: 'canonical-json-utf8',
        normalization: 'Unicode-NFC-and-whitespace-collapse',
        value: 'regulated consumer credit',
        ruleId: 'R001'
      })
    );
    expect(result.evidenceUrls).toEqual([
      'https://www.legislation.gov.uk/id/ukpga/1998/42'
    ]);

    expect(
      relationshipPresentation({
        rightsSource: result.rightsSource,
        rightsAssertion: result.rightsAssertion
      })
    ).toEqual(
      expect.objectContaining({
        rights: result.rightsSource,
        rightsSource: result.rightsSource,
        rightsAssertion: result.rightsAssertion
      })
    );
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
    expect(summary.by_authority.synthetic).toBe(0);
    expect(summary.by_freshness).toEqual({ current: 1, stale: 1, unknown: 1 });
  });
});
