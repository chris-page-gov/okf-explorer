import { describe, expect, it } from 'vitest';
import {
  governedHelpText,
  governedTermIdsForRecord,
  normalizeGovernedTermRegistry,
  normalizeGovernedTermValidation,
  semanticResourceLabel,
  semanticResources,
  validateGovernedTermEvidence
} from './governedTerms';

function registryFixture() {
  return {
    schema: 'okf-explorer-governed-terms.v1',
    title: 'Governed terms',
    snapshot: 'snapshot-1',
    review: {
      applicationStatus: 'validated-for-bounded-use',
      checkedAt: '2026-07-26T12:00:00Z',
      checkedBy: 'process:standards-review',
      liveLookupPerformed: false,
      method: 'curated-static-specification-review',
      scope: 'Emitted semantic metadata and reader help.'
    },
    vocabularies: [
      {
        id: 'dcat-3',
        title: 'DCAT 3',
        namespace: 'http://www.w3.org/ns/dcat#',
        prefix: 'dcat',
        source: 'https://www.w3.org/TR/vocab-dcat-3/',
        version: 'W3C Recommendation'
      },
      {
        id: 'ui-v1',
        title: 'Explorer UI terms',
        namespace: 'https://example.test/ui/',
        prefix: 'ui',
        source: 'https://example.test/terms.json',
        version: '1'
      }
    ],
    terms: [
      {
        id: 'dcat:DataService',
        label: 'Data service',
        iri: 'http://www.w3.org/ns/dcat#DataService',
        kind: 'class',
        definition: 'A collection of operations that provides access to data.',
        application: 'Used only for the service-level record.',
        vocabulary: 'dcat-3',
        status: 'validated',
        provenance: {
          vocabulary: 'dcat-3',
          resource: 'https://www.w3.org/TR/vocab-dcat-3/',
          version: 'W3C Recommendation'
        },
        validation: {
          recognition: 'validated',
          meaning: 'validated',
          application: 'validated',
          method: 'curated-static-specification-review',
          checkedBy: 'process:standards-review',
          checkedAt: '2026-07-26T12:00:00Z'
        },
        usage: [
          {
            artifact: 'okf-bundle.jsonld',
            occurrences: 1,
            samplePaths: ['$.service.@type']
          }
        ]
      },
      {
        id: 'ui:source-date',
        label: 'Source date',
        iri: 'https://example.test/ui/source-date',
        kind: 'ui-term',
        definition: 'A date supplied by the source, not the Explorer build time.',
        application: 'Explorer help key source-date:search-result.',
        vocabulary: 'ui-v1',
        status: 'validated',
        helpKey: 'source-date:search-result',
        provenance: {
          vocabulary: 'ui-v1',
          resource: 'https://example.test/terms.json',
          version: '1'
        },
        validation: {
          recognition: 'validated',
          meaning: 'validated',
          application: 'validated',
          method: 'curated-static-specification-review',
          checkedBy: 'process:standards-review',
          checkedAt: '2026-07-26T12:00:00Z'
        },
        usage: []
      }
    ],
    counts: {
      standardsTerms: 1,
      uiTerms: 1
    }
  };
}

function validationFixture() {
  return {
    schema: 'okf-explorer-governed-term-validation.v1',
    snapshot: 'snapshot-1',
    status: 'conformant',
    checkedAt: '2026-07-26T12:00:00Z',
    checkedBy: 'process:standards-review',
    liveLookupPerformed: false,
    method: 'curated-static-specification-review',
    scope: 'Emitted semantic metadata and reader help.',
    checks: {
      authoritativeProvenance: 'passed',
      boundedApplicationReviewed: 'passed',
      generatedTermCoverage: 'passed',
      meaningReviewed: 'passed',
      namespaceExpansion: 'passed',
      termRecognition: 'passed',
      termKindDeclared: 'passed',
      uniqueIdentifiers: 'passed'
    },
    counts: {
      registeredTerms: 2,
      unregisteredTerms: 0
    },
    limitations: ['Closed-world validation against a curated register.'],
    unregisteredTerms: [],
    unusedStandardsTerms: [],
    pendingApplicationReviews: []
  };
}

describe('governed metadata terms', () => {
  it('normalizes a provenance-bound term registry and validation report', () => {
    const registry = normalizeGovernedTermRegistry(registryFixture());
    const validation = normalizeGovernedTermValidation(validationFixture());

    expect(() => validateGovernedTermEvidence(registry, validation)).not.toThrow();
    expect(registry.terms).toHaveLength(2);
    expect(registry.terms[0].iri).toBe('http://www.w3.org/ns/dcat#DataService');
  });

  it('rejects a term whose full IRI does not expand from its registered namespace', () => {
    const input = registryFixture();
    input.terms[0].iri = 'http://www.w3.org/ns/dcat#Operation';

    expect(() => normalizeGovernedTermRegistry(input)).toThrow(
      'IRI does not expand from its registered namespace'
    );
  });

  it('rejects conformant evidence with unresolved terms', () => {
    const registry = normalizeGovernedTermRegistry(registryFixture());
    const input = {
      ...validationFixture(),
      unregisteredTerms: ['dcat:ImaginedClass']
    };
    const validation = normalizeGovernedTermValidation(input);

    expect(() => validateGovernedTermEvidence(registry, validation)).toThrow(
      'contains unresolved findings'
    );
  });

  it('uses bundle-governed UI meanings for related help-key variants', () => {
    const registry = normalizeGovernedTermRegistry(registryFixture());

    expect(governedHelpText(registry, 'source-date:created')).toContain(
      'not the Explorer build time'
    );
  });

  it('collects declared and standards-alignment terms for a record', () => {
    expect(
      governedTermIdsForRecord({
        name: 'operation',
        title: 'Operation',
        standard_term_ids: ['dcat:DataService', 'hydra:Operation'],
        hydra_type: 'hydra:Operation',
        standards_alignment: {
          dcat: { term: 'dcat:DataService' },
          hydra: { term: 'hydra:Operation' }
        }
      })
    ).toEqual(['dcat:DataService', 'hydra:Operation']);
  });
});

describe('semantic descriptor labels', () => {
  it.each([
    ['okf-bundle.yamlld', 'YAML-LD'],
    ['okf-bundle.jsonld?version=1', 'JSON-LD'],
    ['metadata.yaml', 'YAML'],
    ['semantic', 'Semantic descriptor']
  ])('derives %s as %s', (path, label) => {
    expect(semanticResourceLabel(path)).toBe(label);
  });

  it('deduplicates the canonical resource while retaining alternate serializations', () => {
    expect(
      semanticResources({
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus',
        title: 'Bundle',
        semantic_descriptor: 'okf-bundle.yamlld',
        entrypoints: {
          data_manifest: 'data/manifest.json',
          semantic_yamlld: 'okf-bundle.yamlld',
          semantic_jsonld: 'okf-bundle.jsonld'
        },
        counts: {}
      })
    ).toEqual([
      { path: 'okf-bundle.yamlld', label: 'YAML-LD' },
      { path: 'okf-bundle.jsonld', label: 'JSON-LD' }
    ]);
  });
});
