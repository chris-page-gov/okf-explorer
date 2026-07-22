import { describe, expect, it } from 'vitest';
import type { LargeDataset } from '$lib/types';
import { largeDatasetFacetValues, presentLargeDatasetFacetValues } from './largeFacetValues';

const onsRecord = {
  name: 'ons-record',
  title: 'ONS record',
  topics: ['Population'],
  frequency: 'quarterly',
  population_type: 'Households',
  record_type: 'dataset',
  source_surface: 'nomis',
  state: 'published',
  subtopic: 'Families',
  unit_of_measure: 'Persons',
  geography_vintage: 2021,
  geography_metadata: { levels: ['region', 'oa'] },
  metadata_derivation: { modes: ['source-declared'] },
  selection: { binding_status: 'available' },
  source_publishers: [{ name: 'Office for National Statistics' }],
  quality_score: 0.7,
  methodology_links: ['https://example.test/method'],
  quality_links: [],
  quality_notes: ['Source note'],
  alternatives: [{ id: 'alternative' }]
} as LargeDataset;

describe('large facet value projection', () => {
  it('matches every ONS search-posting projection from full records', () => {
    const expected: Record<string, string[]> = {
      source_surface: ['nomis'],
      record_type: ['dataset'],
      topic: ['Population'],
      state: ['published'],
      frequency: ['quarterly'],
      population_type: ['Households'],
      source_publisher: ['Office for National Statistics'],
      subtopic: ['Families'],
      unit_of_measure: ['Persons'],
      geography_level: ['region', 'oa'],
      geography_vintage: ['2021'],
      derivation_mode: ['source-declared'],
      binding_status: ['available'],
      metadata_evidence_band: ['medium'],
      has_methodology: ['yes'],
      has_quality_documentation: ['yes'],
      has_alternatives: ['yes']
    };
    for (const [key, values] of Object.entries(expected)) {
      expect(presentLargeDatasetFacetValues(onsRecord, key), key).toEqual(values);
    }
  });

  it('uses the explicit metadata-gap value when a projected facet is absent', () => {
    expect(largeDatasetFacetValues(
      { name: 'gap', title: 'Metadata gap', geography_metadata: {} } as LargeDataset,
      'geography_level',
      '__missing__'
    )).toEqual(['__missing__']);
  });
});
