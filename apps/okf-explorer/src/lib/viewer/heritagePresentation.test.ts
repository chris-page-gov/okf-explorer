import { describe, expect, it } from 'vitest';

import type { LargeDataset } from '$lib/types';
import { heritageDetailSections, isHeritageEvaluationRecord } from './heritagePresentation';

const record: LargeDataset = {
  '@id': 'https://historicengland.org.uk/listing/the-list/list-entry/1342941',
  '@type': 'https://schema.org/LandmarksOrHistoricalBuildings',
  name: 'nhle-1342941',
  title: 'Cathedral Church of St Michael',
  route: 'asset/1342941',
  native_id: '1342941',
  url: 'https://historicengland.org.uk/listing/the-list/list-entry/1342941',
  source_adapter: 'historic-england-nhle-arcgis',
  record_type: 'Heritage Asset',
  heritage_category: 'Listed Building',
  grade: 'I',
  local_authority: ['Coventry'],
  geography_code: ['E08000026'],
  assertion_status: 'official',
  assertion_scope: 'real-world',
  license_id: 'OGL-3.0',
  license_title: 'Open Government Licence v3.0',
  license_source_id: 'OGL-3.0',
  license_source_title: 'Historic England open data terms',
  extras: {
    list_entry_number: '1342941',
    national_grid_reference: 'SP3378578997'
  }
};

describe('heritage record presentation', () => {
  it('recognises the heritage adapter and exposes source-native designation fields', () => {
    expect(isHeritageEvaluationRecord(record)).toBe(true);
    const sections = heritageDetailSections(record);
    expect(sections.map((section) => section.id)).toEqual(['designation', 'semantic']);
    expect(sections[0].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'list_entry_number', value: '1342941' }),
        expect.objectContaining({ key: 'url', label: 'Official rich page' }),
        expect.objectContaining({ key: 'heritage_category', value: 'Listed Building' }),
        expect.objectContaining({ key: 'geography_code', value: ['E08000026'] }),
        expect.objectContaining({
          key: 'license_title',
          label: 'Licence',
          value: 'Open Government Licence v3.0'
        }),
        expect.objectContaining({
          key: 'license_source_title',
          label: 'Licence source',
          value: 'Historic England open data terms'
        })
      ])
    );
    expect(sections[0].fields.find((item) => item.key === 'license_title')).toEqual(
      expect.objectContaining({
        href: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
      })
    );
  });

  it('links the readable licence title only when the record supplies a web URL', () => {
    const linked = {
      ...record,
      license_source_id:
        'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
    };
    const designation = heritageDetailSections(linked).find((section) => section.id === 'designation');
    expect(designation?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'license_title',
          value: 'Open Government Licence v3.0',
          href: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
        })
      ])
    );
  });

  it('does not turn an unsafe licence source into a link', () => {
    const unsafe = {
      ...record,
      license_id: 'CUSTOM-TERMS',
      license_source_id: 'javascript:alert(1)'
    };
    const designation = heritageDetailSections(unsafe).find((section) => section.id === 'designation');
    expect(designation?.fields.find((item) => item.key === 'license_title')).not.toHaveProperty('href');
  });

  it('does not invent a link for an unknown licence identifier', () => {
    const unknown = {
      ...record,
      license_id: 'HERITAGE-CUSTOM-1.0',
      license_source_id: 'HERITAGE-CUSTOM-1.0'
    };
    const designation = heritageDetailSections(unknown).find((section) => section.id === 'designation');
    expect(designation?.fields.find((item) => item.key === 'license_title')).not.toHaveProperty('href');
  });

  it('keeps assertion authority and synthetic scope independent', () => {
    const synthetic = {
      ...record,
      source_adapter: 'evaluation-foundry-synthetic',
      assertion_status: 'model-derived',
      assertion_scope: 'synthetic-fixture'
    };
    const semantic = heritageDetailSections(synthetic).find((section) => section.id === 'semantic');
    expect(semantic?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'assertion_status', value: 'model-derived' }),
        expect.objectContaining({ key: 'assertion_scope', value: 'synthetic-fixture' })
      ])
    );
  });

  it('labels reviewed discovery names without replacing source identity', () => {
    const named = {
      ...record,
      extras: {
        ...record.extras,
        reviewed_search_names: ["St Mary's Guildhall"],
        reviewed_search_name_relationship: 'familiar-name',
        reviewed_search_name_evidence_url:
          'https://historicengland.org.uk/images-books/photos/item/AA42/00537'
      }
    };
    const designation = heritageDetailSections(named).find((section) => section.id === 'designation');
    expect(designation?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'reviewed_search_names', value: ["St Mary's Guildhall"] }),
        expect.objectContaining({ key: 'reviewed_search_name_relationship', value: 'familiar-name' }),
        expect.objectContaining({ key: 'reviewed_search_name_evidence_url' })
      ])
    );
  });

  it('shows annual source gaps as unknown instead of silently omitting them', () => {
    const annual = {
      ...record,
      record_type: 'Heritage at Risk Observation',
      register_year: '2013',
      condition: '',
      vulnerability: [],
      extras: {
        ...record.extras,
        condition: '',
        vulnerability: []
      }
    };
    const risk = heritageDetailSections(annual).find((section) => section.id === 'risk');
    expect(risk?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'condition',
          value: 'Unknown — not supplied by this annual source row'
        }),
        expect.objectContaining({
          key: 'vulnerability',
          value: 'Unknown — not supplied by this annual source row'
        })
      ])
    );
  });

  it('does not add a heritage panel to unrelated large-corpus records', () => {
    expect(heritageDetailSections({ name: 'api', title: 'API', source_adapter: 'api-catalogue' })).toEqual([]);
  });
});
