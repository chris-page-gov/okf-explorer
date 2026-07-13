import { describe, expect, it } from 'vitest';
import type { LargeAnalysisOverview, LargeDataset, OkfNode, OkfRelationship } from '$lib/types';
import {
  analysisFacetForKey,
  analysisFacetRows,
  analysisHierarchiesForFacet,
  analysisHierarchyValueForRoute,
  analysisLabelForRoute,
  analysisNodeForRoute,
  colorForType,
  datasetDateContext,
  datasetOperationalContext,
  displayValue,
  facetLabel,
  facetSummary,
  facetValueLabel,
  formatPercent,
  isHttpUrl,
  orderedFacetKeys,
  relatedSeriesDatasets,
  relationshipTitle,
  routeForAnalysisNode,
  selectedFacetValueSummary,
  smallRelationshipKind,
  smallRelationshipTitle,
  sourceDateLabel,
  timelineBucketFacetFilter
} from './helpers';

const analysis: LargeAnalysisOverview = {
  schema: 'okf-explorer-analysis.v1',
  generated_at: '2026-07-06T00:00:00Z',
  graph_overview: {
    nodes: [{ id: 'facet/publisher/nhs-digital', label: 'NHS Digital', type: 'publisher', count: 42 }],
    edges: []
  },
  facet_analysis: [
    {
      key: 'tag',
      label: 'Tag',
      coverage: 0.9,
      cardinality: 10,
      top_share: 0.2,
      entropy: 2,
      expected_reduction: 0.85,
      recommended_control: 'chips',
      recommendation: 'secondary'
    },
    {
      key: 'publisher',
      label: 'Publisher',
      coverage: 1,
      cardinality: 100,
      top_share: 0.1,
      entropy: 4,
      expected_reduction: 0.95,
      recommended_control: 'searchable list',
      recommendation: 'primary'
    }
  ],
  hierarchies: [
    {
      id: 'publisher-family',
      label: 'Publisher family',
      facet: 'publisher_family',
      levels: ['family', 'publisher'],
      values: [
        {
          id: 'facet/publisher_family/health',
          label: 'health',
          count: 10,
          children: [{ id: 'facet/publisher/nhs-digital', label: 'NHS Digital', count: 8 }]
        }
      ]
    }
  ]
};

describe('viewer helpers', () => {
  it('formats stable display, percentage and URL values', () => {
    expect(displayValue(undefined)).toBe('Not specified (metadata gap)');
    expect(displayValue(null)).toBe('Not specified (metadata gap)');
    expect(displayValue('')).toBe('Not specified (metadata gap)');
    expect(displayValue([])).toBe('Not specified (metadata gap)');
    expect(displayValue('None')).toBe('Not specified (metadata gap)');
    expect(displayValue('__missing__')).toBe('Not specified (metadata gap)');
    expect(displayValue(['CSV', 'XLS'])).toBe('CSV, XLS');
    expect(displayValue({ a: 1 })).toBe('{"a":1}');
    expect(formatPercent(0.955)).toBe('96%');
    expect(formatPercent(undefined)).toBe('n/a');
    expect(formatPercent(Number.NaN)).toBe('n/a');
    expect(facetLabel('publisher_family')).toBe('publisher family');
    expect(isHttpUrl('https://example.test')).toBe(true);
    expect(isHttpUrl('HTTP://example.test')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl(42)).toBe(false);
  });

  it('provides deterministic type colours without collapsing all types to one colour', () => {
    expect(colorForType('dataset')).toBe(colorForType('dataset'));
    expect(colorForType('dataset')).not.toBe(colorForType('publisher'));
    expect(colorForType('custom cluster')).toMatch(/^#/);
  });

  it('sorts facet analysis by recommendation and reduction', () => {
    expect(analysisFacetRows(analysis).map((facet) => facet.key)).toEqual(['publisher', 'tag']);
    expect(analysisFacetForKey(analysis, 'publisher')?.label).toBe('Publisher');
    expect(facetSummary(analysis, 'publisher')).toBe('primary · searchable list · reduction 95%');
    expect(orderedFacetKeys(analysis, ['license'], ['publisher', 'format'])).toEqual(['publisher', 'tag', 'license', 'format']);

    const withUnknownTier: LargeAnalysisOverview = {
      ...analysis,
      facet_analysis: [
        {
          key: 'advanced',
          label: 'Advanced',
          coverage: 1,
          cardinality: 3,
          top_share: 0.5,
          entropy: 1,
          expected_reduction: 0.1,
          recommended_control: 'details',
          recommendation: 'experimental'
        },
        {
          key: 'suppressed',
          label: 'Suppressed',
          coverage: 1,
          cardinality: 1,
          top_share: 1,
          entropy: 0,
          expected_reduction: 0,
          recommended_control: 'hidden',
          recommendation: 'suppressed'
        }
      ]
    };
    expect(analysisFacetRows(withUnknownTier).map((facet) => facet.key)).toEqual(['advanced', 'suppressed']);
  });

  it('builds fallback facets from overview previews', () => {
    const rows = analysisFacetRows(undefined, { format: [{ value: 'CSV', count: 3 }], empty: [] });
    expect(rows).toEqual([
      expect.objectContaining({
        key: 'format',
        label: 'format',
        cardinality: 1,
        recommendation: 'secondary'
      }),
      expect.objectContaining({
        key: 'empty',
        top_share: 0,
        cardinality: 0
      })
    ]);
    expect(facetSummary(undefined, 'missing')).toBe('');
  });

  it('resolves analysis routes from graph nodes, facet routes and hierarchies', () => {
    expect(routeForAnalysisNode('facet/tag/IAPT')).toEqual({ key: 'tag', value: 'IAPT' });
    expect(routeForAnalysisNode('facet/tag')).toBeNull();
    expect(routeForAnalysisNode('dataset/example')).toBeNull();
    expect(analysisNodeForRoute(analysis, 'facet/publisher/nhs-digital')?.count).toBe(42);
    expect(analysisHierarchiesForFacet(analysis, 'publisher_family')).toHaveLength(1);
    expect(analysisHierarchiesForFacet(undefined, 'publisher_family')).toEqual([]);
    expect(analysisHierarchyValueForRoute(analysis, 'facet/publisher_family/health')?.value.label).toBe('health');
    expect(analysisHierarchyValueForRoute(analysis, 'facet/publisher/nhs-digital')?.parent?.label).toBe('health');
    expect(analysisHierarchyValueForRoute(analysis, 'facet/publisher/missing')).toBeNull();
    expect(analysisHierarchyValueForRoute(undefined, 'facet/publisher/missing')).toBeNull();
    expect(analysisLabelForRoute(analysis, 'facet/publisher/nhs-digital')).toBe('NHS Digital');
    expect(analysisLabelForRoute(analysis, 'facet/publisher_family/health')).toBe('health');
    expect(analysisLabelForRoute(analysis, 'facet/tag/IAPT')).toBe('IAPT');
    expect(analysisLabelForRoute(analysis, 'dataset/unknown')).toBeNull();

    const routeBasedHierarchy: LargeAnalysisOverview = {
      ...analysis,
      hierarchies: [
        {
          id: 'route-test',
          label: 'Route test',
          facet: 'tag',
          levels: ['parent', 'child'],
          values: [
            {
              id: 'parent-id',
              route: 'facet/tag/parent',
              label: 'Parent',
              count: 2,
              children: [{ id: 'child-id', route: 'facet/tag/child', label: 'Child', count: 1 }]
            },
            { id: 'no-children', label: 'No children', count: 1 }
          ]
        }
      ]
    };
    expect(analysisHierarchyValueForRoute(routeBasedHierarchy, 'facet/tag/parent')?.value.label).toBe('Parent');
    expect(analysisHierarchyValueForRoute(routeBasedHierarchy, 'facet/tag/child')?.parent?.label).toBe('Parent');
  });

  it('labels selected facet values for humans and calls out metadata gaps', () => {
    expect(facetValueLabel(analysis, 'publisher', 'nhs-digital')).toBe('NHS Digital');
    expect(facetValueLabel(analysis, 'license', 'not-specified')).toBe('Not specified (metadata gap)');
    expect(facetValueLabel(analysis, 'tag', 'IAPT')).toBe('IAPT');
    expect(selectedFacetValueSummary(analysis, 'publisher', ['nhs-digital'])).toBe('NHS Digital');
    expect(selectedFacetValueSummary(analysis, 'license', ['not-specified', 'ogl', 'cc-by'])).toBe(
      'Not specified (metadata gap), ogl +1'
    );
  });

  it('resolves timeline bucket filters without forcing non-year buckets into update_year', () => {
    expect(timelineBucketFacetFilter({ id: 'year:2026', label: '2026', count: 3 })).toEqual({
      key: 'update_year',
      value: '2026'
    });
    expect(timelineBucketFacetFilter({ id: 'month:2026-07', label: 'Jul 2026', count: 2 })).toBeNull();
    expect(timelineBucketFacetFilter({ id: 'month:2026-07', label: 'Jul 2026', count: 2, route: 'facet/update_month/2026-07' })).toEqual({
      key: 'update_month',
      value: '2026-07'
    });
    expect(timelineBucketFacetFilter({ id: 'band:recent', label: 'Recent', count: 4, route: 'facet/tag/recent releases' })).toEqual({
      key: 'tag',
      value: 'recent releases'
    });
    expect(timelineBucketFacetFilter({ id: 'custom:recent', label: 'Recent', count: 4, route: 'year:2025' })).toEqual({
      key: 'update_year',
      value: '2025'
    });
  });

  it('formats concrete and aggregate relationship titles', () => {
    const labelForRoute = (route: string) => ({ 'dataset/a': 'Dataset A', 'tag/t': 'Tag T' })[route] || route;
    expect(relationshipTitle({ source: 'dataset/a', target: 'tag/t', label: 'tagged' }, labelForRoute)).toBe('Dataset A → tagged → Tag T');
    expect(relationshipTitle({ source: '', target: '', label: 'tagged', count: 1200 }, labelForRoute)).toBe('tagged (1,200 relationships)');
    expect(relationshipTitle({ source: '', target: '', label: 'tagged' }, labelForRoute)).toBe('tagged');
  });

  it('distinguishes source update dates, resource years and explicit series membership', () => {
    const current: LargeDataset = {
      name: 'home-workers',
      title: 'Characteristics of Home Workers',
      publisher: 'ons',
      metadata_modified: '2014-06-04T11:00:07Z',
      extras: { series: 'Characteristics of Home Workers' }
    };
    const earlier: LargeDataset = {
      name: 'home-workers-2011',
      title: 'Characteristics of Home Workers 2011',
      publisher: 'ons',
      metadata_modified: '2011-03-01',
      extras: { series: 'Characteristics of Home Workers' }
    };
    const otherPublisher: LargeDataset = {
      name: 'home-workers-copy',
      title: 'Characteristics of Home Workers copy',
      publisher: 'other',
      extras: { series: 'Characteristics of Home Workers' }
    };

    expect(datasetDateContext(current, [{ id: 'resource-1', dataset: current.name, name: '2014' }])).toEqual({
      updated: '2014-06-04T11:00:07Z',
      updatedLabel: 'Catalogue metadata updated',
      catalogueMetadata: true,
      years: ['2014'],
      series: 'Characteristics of Home Workers',
      seriesKey: 'label:characteristics of home workers'
    });
    expect(sourceDateLabel('2014-06-04T11:00:07Z')).toBe('4 Jun 2014');
    expect(relatedSeriesDatasets(current, [otherPublisher, earlier, current])).toEqual([earlier]);
  });

  it('separates CKAN catalogue dates from evidence-backed operational metadata', () => {
    const dataset: LargeDataset = {
      name: 'overseas-companies',
      title: 'Overseas companies that own property in England and Wales',
      source_adapter: 'data.gov.uk CKAN',
      source_api_url: 'https://data.gov.uk/api/action/package_show?id=overseas-companies',
      extras: {
        'dataset-reference-date': '[{"type":"publication","value":"2016-04-04"}]',
        'frequency-of-update': 'monthly'
      },
      operational_metadata: {
        canonical_source: {
          url: 'https://use-land-property-data.service.gov.uk/datasets/ocod',
          label: 'Use land and property data'
        },
        authoritative_source: { name: 'HM Land Registry', url: 'https://www.gov.uk/government/organisations/land-registry' },
        update_frequency: 'Monthly',
        latest_release: { dynamic: true },
        maintenance_status: 'Active',
        distributions: [
          { label: 'Complete monthly extract', kind: 'full' },
          { label: 'Change-only monthly extract', kind: 'delta' }
        ],
        api: { available: true, access: 'Account and API key required', url: 'https://use-land-property-data.service.gov.uk/api-documentation' },
        technical_specification_url: 'https://use-land-property-data.service.gov.uk/datasets/ocod/tech-spec',
        verified_at: '2026-07-13'
      }
    };
    const context = datasetOperationalContext(dataset, [
      {
        id: 'resource-1',
        dataset: dataset.name,
        name: 'Information service',
        url: 'https://use-land-property-data.service.gov.uk/datasets/ocod',
        host: 'use-land-property-data.service.gov.uk'
      }
    ]);

    expect(context.explicit).toBe(true);
    expect(context.catalogueDerived).toBe(true);
    expect(context.canonicalSource).toEqual({
      label: 'Use land and property data',
      url: 'https://use-land-property-data.service.gov.uk/datasets/ocod',
      host: 'use-land-property-data.service.gov.uk'
    });
    expect(context.updateFrequency).toBe('Monthly');
    expect(context.latestRelease).toBe('Dynamic — check the canonical source');
    expect(context.api).toEqual({
      label: 'Available · Account and API key required',
      url: 'https://use-land-property-data.service.gov.uk/api-documentation'
    });
    expect(context.catalogueFrequency).toBe('monthly');
    expect(context.catalogueReferenceDates).toEqual([{ date: '2016-04-04', kind: 'publication' }]);
    expect(context.linkedSources).toEqual([
      {
        label: 'Information service',
        host: 'use-land-property-data.service.gov.uk',
        url: 'https://use-land-property-data.service.gov.uk/datasets/ocod'
      }
    ]);
  });

  it('formats small-bundle relationship labels against node titles', () => {
    const nodes: Record<string, OkfNode> = {
      a: { id: 'a', title: 'Alpha' },
      b: { id: 'b', title: 'Beta' }
    };
    const relationship: OkfRelationship = { source: 'a', target: 'b', label: 'supports' };
    expect(smallRelationshipKind(relationship)).toBe('supports');
    expect(smallRelationshipKind({ source: 'a', target: 'b', type: 'typed' })).toBe('typed');
    expect(smallRelationshipKind({ source: 'a', target: 'b', kind: 'defined by' })).toBe('defined by');
    expect(smallRelationshipTitle(relationship, nodes)).toBe('Alpha → supports → Beta');
    expect(smallRelationshipTitle({ source: 'missing', target: 'b', kind: 'related' }, nodes)).toBe('missing → related → Beta');
    expect(smallRelationshipTitle({ source: 'a', target: 'missing', kind: 'related' }, nodes)).toBe('Alpha → related → missing');
    expect(smallRelationshipKind({ source: 'x', target: 'y' })).toBe('related');
  });
});
