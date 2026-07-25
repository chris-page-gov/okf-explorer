import { describe, expect, it } from 'vitest';
import { isFederationDescriptor, loadFederationOverview } from './federation';

function fixture() {
  return {
    schema: 'okf-explorer-federation.v1',
    kind: 'okf-federation',
    okf_version: '0.2',
    title: 'UK Whole-Law OKF',
    description: 'Federated legal discovery control plane.',
    version: '0.3.0',
    status: 'candidate',
    generated_at: '2026-07-25T12:00:00Z',
    snapshot: 'whole-law-2026-07-25',
    profile: 'https://example.test/profile/whole-law/v1/',
    publisher: 'https://example.test/publisher',
    license: 'https://example.test/licence',
    discovery: {
      repository: 'https://github.com/example/whole-law',
      documentation: './docs/',
      raw_subpath: 'bundle/whole-law',
      release_archive: 'https://github.com/example/whole-law/releases/tag/v0.3.0',
      routes: [
        {
          kind: 'published',
          purpose: 'descriptor',
          url: './okf-explorer.json',
          priority: 10
        },
        {
          kind: 'raw',
          purpose: 'descriptor',
          url: 'https://raw.example/main/bundle/whole-law/okf-explorer.json',
          priority: 20
        }
      ]
    },
    counts: {
      children: 2,
      available: 1,
      planned: 1
    },
    children: [
      {
        id: 'uk-legislation',
        title: 'UK Legislation',
        role: 'legislation',
        status: 'available',
        descriptor: 'https://example.test/legislation/okf-explorer.json',
        authority: {
          class: 'official',
          source: 'https://www.legislation.gov.uk/'
        },
        coverage: {
          status: 'available',
          applicable: 365786,
          represented: 365786,
          percent: 100,
          as_of: '2026-07-25'
        },
        freshness: {
          state: 'current',
          observed_at: '2026-07-25T11:00:00Z',
          snapshot: 'legislation-2026-07-25',
          stale_after: '2026-08-01T00:00:00Z'
        },
        discovery: {
          repository: 'https://github.com/example/legislation',
          documentation: 'https://example.test/legislation/docs/',
          raw_subpath: 'bundle',
          release_archive: 'https://github.com/example/legislation/releases/tag/v0.3.0',
          semantic_descriptor: 'https://example.test/legislation/okf-bundle.yamlld',
          routes: [
            {
              kind: 'published',
              purpose: 'descriptor',
              url: 'https://example.test/legislation/okf-explorer.json'
            }
          ]
        },
        counts: {
          records: 365786,
          relationships: 853883
        }
      },
      {
        id: 'case-law',
        title: 'Case Law',
        role: 'case-law',
        status: 'planned',
        authority: {
          class: 'official',
          source: 'https://caselaw.nationalarchives.gov.uk/'
        },
        coverage: {
          status: 'planned',
          applicable: 0,
          represented: 0
        },
        freshness: {
          state: 'unknown'
        },
        discovery: {
          repository: 'https://github.com/example/whole-law',
          documentation: 'https://example.test/docs/case-law/',
          raw_subpath: 'whole-law/case-law',
          release_archive: 'https://github.com/example/whole-law/releases/',
          routes: [
            {
              kind: 'documentation',
              purpose: 'documentation',
              url: 'https://example.test/docs/case-law/'
            }
          ]
        }
      }
    ],
    relationships: [
      {
        schema: 'okf-relationship-assertion.v2',
        source: 'uk-legislation',
        target: 'case-law',
        predicate: 'informs',
        authority: {
          class: 'derived',
          source: 'https://example.test/methodology'
        },
        derivation: 'deterministic',
        confidence: 1,
        observed_at: '2026-07-25T12:00:00Z',
        freshness: 'current',
        evidence: ['https://example.test/evidence/reconciliation.json']
      }
    ],
    relationship_summary: {
      scope: 'federated-data-plane',
      total: 4,
      by_predicate: {
        amends: 2,
        topic: 2
      },
      by_authority: {
        official: 2,
        derived: 1,
        'model-assisted': 1
      },
      by_freshness: {
        current: 3,
        stale: 0,
        unknown: 1
      },
      snapshot: 'whole-law-2026-07-25'
    },
    notices: [
      'Children load only when selected.'
    ]
  };
}

describe('federation overview loader', () => {
  it('normalizes only the federation control plane and keeps child access declarative', () => {
    const document = fixture();
    expect(isFederationDescriptor(document)).toBe(true);
    const loaded = loadFederationOverview(
      document,
      'https://pages.example/whole-law/okf-explorer.json',
      'https://mirror.example/whole-law/okf-explorer.json',
      [
        'https://pages.example/whole-law/okf-explorer.json',
        'https://mirror.example/whole-law/okf-explorer.json'
      ]
    );

    expect(Object.keys(loaded.corpus.nodes)).toEqual(['uk-legislation', 'case-law']);
    expect(loaded.corpus.nodes['uk-legislation'].descriptor_url).toBe(
      'https://example.test/legislation/okf-explorer.json'
    );
    expect(loaded.corpus.nodes['uk-legislation'].resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Repository' }),
        expect.objectContaining({ title: 'Documentation' }),
        expect.objectContaining({ title: 'Release archive' })
      ])
    );
    expect(loaded.corpus.relationships).toHaveLength(1);
    expect(loaded.overview.inlineRelationshipSummary.by_authority.derived).toBe(1);
    expect(loaded.overview.descriptor.relationship_summary.total).toBe(4);
    expect(loaded.overview.resolvedUrl).toBe('https://mirror.example/whole-law/okf-explorer.json');
  });

  it('fails closed on coverage, relationship endpoints and dishonest totals', () => {
    const excessiveCoverage = fixture();
    excessiveCoverage.children[0].coverage.represented = 365787;
    expect(() => loadFederationOverview(excessiveCoverage, 'https://example.test/federation.json'))
      .toThrow('represented cannot exceed applicable');

    const missingEndpoint = fixture();
    missingEndpoint.relationships[0].target = 'invented-child';
    expect(() => loadFederationOverview(missingEndpoint, 'https://example.test/federation.json'))
      .toThrow('declared federation child IDs');

    const dishonestSummary = fixture();
    dishonestSummary.relationship_summary.by_authority.official = 3;
    expect(() => loadFederationOverview(dishonestSummary, 'https://example.test/federation.json'))
      .toThrow('by_authority sums to 5, not total 4');

    const incompleteSummary = fixture();
    delete (incompleteSummary.relationship_summary.by_authority as Record<string, number>)['model-assisted'];
    expect(() => loadFederationOverview(incompleteSummary, 'https://example.test/federation.json'))
      .toThrow('by_authority.model-assisted is required');
  });

  it('requires available children to declare a loadable descriptor route', () => {
    const document = fixture();
    document.children[0].descriptor = undefined;
    document.children[0].discovery.routes = [
      {
        kind: 'documentation',
        purpose: 'documentation',
        url: 'https://example.test/docs/'
      }
    ];
    expect(() => loadFederationOverview(document, 'https://example.test/federation.json'))
      .toThrow('has no declared descriptor route');
  });
});
