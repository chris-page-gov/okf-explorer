import type { LargeDataset } from '$lib/types';

export type HeritageDetailField = {
  key: string;
  label: string;
  value: unknown;
  help?: string;
  href?: string;
};

export type HeritageDetailSection = {
  id: 'designation' | 'risk' | 'semantic';
  title: string;
  description: string;
  fields: HeritageDetailField[];
};

function present(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.some(present);
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function field(
  record: LargeDataset,
  key: string,
  label: string,
  help?: string,
  fallback?: unknown,
  href?: unknown
): HeritageDetailField | null {
  const value = [record[key], record.extras?.[key], fallback].find(present);
  const safeHref = webUrl(href);
  return present(value)
    ? { key, label, value, ...(help ? { help } : {}), ...(safeHref ? { href: safeHref } : {}) }
    : null;
}

function webUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

function licenceUrl(record: LargeDataset): string {
  const suppliedUrl = [
    record.operational_metadata?.licence_url,
    record.licence_url,
    record.license_url,
    record.license_source_id
  ].map(webUrl).find(Boolean);
  if (suppliedUrl) return suppliedUrl;
  const identifier = String(record.license_id || record.license_source_id || '').trim().toUpperCase();
  if (identifier === 'OGL-3.0') {
    return 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';
  }
  return '';
}

function fields(rows: Array<HeritageDetailField | null>): HeritageDetailField[] {
  return rows.filter((row): row is HeritageDetailField => Boolean(row));
}

export function isHeritageEvaluationRecord(record: LargeDataset | undefined): boolean {
  if (!record) return false;
  return (
    String(record.source_adapter || '').startsWith('historic-england-') ||
    String(record.source_adapter || '') === 'evaluation-foundry-synthetic' ||
    String(record.record_type || '').startsWith('Heritage') ||
    String(record.record_type || '').startsWith('Synthetic Heritage')
  );
}

export function heritageDetailSections(record: LargeDataset): HeritageDetailSection[] {
  if (!isHeritageEvaluationRecord(record)) return [];
  const isAnnualRiskRecord = String(record.record_type || '').startsWith('Heritage at Risk');
  const isSyntheticFixture = String(record.assertion_scope || '') === 'synthetic-fixture';
  const sourceUnknown = isAnnualRiskRecord
    ? 'Unknown — not supplied by this annual source row'
    : undefined;
  const primaryLinkLabel = isSyntheticFixture
    ? 'Synthetic fixture page'
    : isAnnualRiskRecord
      ? 'Official register search'
      : 'Official rich page';
  const primaryLinkHelp = isSyntheticFixture
    ? 'An isolated, invented demonstration page; this is not an official Historic England representation.'
    : isAnnualRiskRecord
      ? 'Historic England results bound to the source List Entry Number; this is not a derived item page.'
      : 'The identifier-bound Historic England HTML representation.';
  const designation = fields([
    field(record, 'native_id', 'Source-native identifier'),
    field(record, 'list_entry_number', 'NHLE List entry', 'The identifier used by Historic England; blank when the source row has no List entry.'),
    field(record, 'url', primaryLinkLabel, primaryLinkHelp),
    field(record, 'heritage_category', 'Heritage category'),
    field(record, 'grade', 'Grade', 'Source grade; not every designation category has one.'),
    field(record, 'designation_date', 'Designation date'),
    field(record, 'amendment_or_expiry_date', 'Amendment or expiry date'),
    field(record, 'national_grid_reference', 'National Grid reference'),
    field(record, 'area_hectares', 'Area in hectares'),
    field(record, 'local_authority', 'Intersected local authority'),
    field(record, 'geography_code', 'Boundary code'),
    field(record, 'geometry_type', 'Source geometry type'),
    field(record, 'source_surface', 'Source surface'),
    field(
      record,
      'license_title',
      'Licence',
      'Rights recorded for the acquired source fields; this does not broaden rights in linked rich-page content.',
      record.license_id,
      licenceUrl(record)
    ),
    field(
      record,
      'license_source_title',
      'Licence source',
      'The source attribution retained with this record.',
      record.license_source_id,
      licenceUrl(record)
    ),
    field(
      record,
      'reviewed_search_names',
      'Reviewed discovery names',
      'Evidence-backed search terms only; they do not replace the official title or assert exact identity.'
    ),
    field(record, 'reviewed_search_name_relationship', 'Discovery-name relationship'),
    field(record, 'reviewed_search_name_evidence_title', 'Discovery-name evidence'),
    field(record, 'reviewed_search_name_evidence_url', 'Discovery-name evidence link')
  ]);
  const risk = fields([
    field(record, 'register_year', 'Annual register year', 'This dates the source snapshot; it is not automatically a current condition claim.'),
    field(record, 'risk_event', 'Annual event'),
    field(record, 'risk_status', 'Projected risk status'),
    field(record, 'risk_methodology', 'Assessment type or methodology'),
    field(record, 'condition', 'Condition', undefined, sourceUnknown),
    field(record, 'vulnerability', 'Principal vulnerability', undefined, sourceUnknown),
    field(record, 'trend', 'Trend', undefined, sourceUnknown),
    field(record, 'ownership', 'Ownership category', undefined, sourceUnknown),
    field(record, 'priority_category', 'Priority category', undefined, sourceUnknown),
    field(record, 'site_type', 'Site type', undefined, sourceUnknown),
    field(record, 'site_subtype', 'Site subtype', undefined, sourceUnknown)
  ]);
  const semantic = fields([
    field(record, '@id', 'Semantic IRI'),
    field(record, '@type', 'Semantic type'),
    field(record, 'assertion_status', 'Assertion status', 'Who or what supports the statement: official, normalized, inferred or model-derived.'),
    field(record, 'assertion_scope', 'Assertion scope', 'Whether this concerns the real world or an invented synthetic fixture.'),
    field(record, 'concept_id', 'OKF concept identity'),
    field(record, 'route', 'Explorer route')
  ]);
  return [
    ...(designation.length
      ? [{
          id: 'designation' as const,
          title: 'Heritage identity and designation',
          description: 'Source identity, designation and spatial fields retained by the evaluation.',
          fields: designation
        }]
      : []),
    ...(risk.length
      ? [{
          id: 'risk' as const,
          title: 'Heritage at Risk observation',
          description: 'Time-specific fields preserved from the sanctioned annual workbook.',
          fields: risk
        }]
      : []),
    {
      id: 'semantic',
      title: 'YAML-LD identity and assertion boundary',
      description: 'Additive semantic identity used to link Search, Graph, Map and this data card without changing source authority.',
      fields: semantic
    }
  ];
}
