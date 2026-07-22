import type { LargeDataset, LargePublisher, LargeResource } from '$lib/types';

export type LargeFacetValueContext = {
  publisher?: LargePublisher;
  resources?: LargeResource[];
  publisherFamily?: (value: LargePublisher | LargeDataset) => string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function values(value: unknown): string[] {
  const rows = Array.isArray(value) ? value : [value];
  return [...new Set(rows
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map(String))];
}

function hasContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== undefined && value !== null && value !== '' && value !== false;
}

function metadataEvidenceBand(value: unknown): string {
  const score = Number(value || 0);
  if (score >= 0.8) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
}

/**
 * Project a full record into the same facet values used by generated static
 * search postings. Providers may expose nested source evidence rather than
 * duplicating every generated facet as a flat record field.
 */
export function presentLargeDatasetFacetValues(
  dataset: LargeDataset,
  key: string,
  context: LargeFacetValueContext = {}
): string[] {
  const raw = dataset as Record<string, unknown>;
  if (key === 'publisher') return values(dataset.publisher);
  if (key === 'format') return values(dataset.formats);
  if (key === 'interaction_style') return values(raw.interaction_style ?? dataset.formats);
  if (key === 'topic') return values(dataset.topics);
  if (key === 'tag') return values(dataset.tags);
  if (key === 'category') return values(dataset.category);
  if (key === 'type_code') return values(dataset.type_code);
  if (key === 'document_type') return values(dataset.document_type);
  if (key === 'creation_year') return values(dataset.year);
  if (key === 'jurisdiction') return values(dataset.jurisdiction);
  if (key === 'legal_status') return values(dataset.legal_status);
  if (key === 'license') return values(dataset.license_id);
  if (key === 'host') return values([dataset.host, ...(dataset.resource_hosts || [])]);
  if (key === 'govuk_linked') return [(dataset.govuk_content_paths || []).length ? 'yes' : 'no'];

  if (key === 'metadata_evidence_band') return [metadataEvidenceBand(raw.quality_score)];
  if (key === 'has_methodology') return [hasContent(raw.methodology_links) ? 'yes' : 'no'];
  if (key === 'has_quality_documentation') {
    return [hasContent(raw.quality_links) || hasContent(raw.quality_notes) ? 'yes' : 'no'];
  }
  if (key === 'has_alternatives') return [hasContent(raw.alternatives) ? 'yes' : 'no'];
  if (key === 'source_publisher') {
    const publishers = Array.isArray(raw.source_publishers) ? raw.source_publishers : [];
    return values(publishers.map((publisher) => record(publisher)?.name));
  }
  if (key === 'geography_level') return values(record(raw.geography_metadata)?.levels);
  if (key === 'derivation_mode') return values(record(raw.metadata_derivation)?.modes);
  if (key === 'binding_status') return values(record(raw.selection)?.binding_status);

  if (key === 'update_year') {
    const stamp = String(dataset.metadata_modified || dataset.timestamp || '');
    return stamp ? [stamp.slice(0, 4)] : [];
  }
  if (key === 'update_month') {
    const stamp = String(dataset.metadata_modified || dataset.timestamp || '');
    return /^\d{4}-\d{2}/.test(stamp) ? [stamp.slice(0, 7)] : [];
  }
  if (key === 'update_quarter') {
    const stamp = String(dataset.metadata_modified || dataset.timestamp || '');
    if (!/^\d{4}-\d{2}/.test(stamp)) return [];
    const month = Number(stamp.slice(5, 7));
    return Number.isFinite(month) && month >= 1 && month <= 12
      ? [`${stamp.slice(0, 4)}-Q${Math.floor((month - 1) / 3) + 1}`]
      : [];
  }
  if (key === 'update_date') {
    const stamp = String(dataset.metadata_modified || dataset.timestamp || '');
    return /^\d{4}-\d{2}-\d{2}/.test(stamp) ? [stamp.slice(0, 10)] : [];
  }
  if (key === 'update_decade') {
    const year = Number(String(dataset.metadata_modified || dataset.timestamp || '').slice(0, 4));
    if (!Number.isFinite(year)) return [];
    const decade = String(Math.floor(year / 10) * 10);
    return [decade, `${decade}s`];
  }
  if (key === 'resource_type') {
    return values((context.resources || []).map((resource) => resource.resource_type || 'unknown'));
  }
  if (key === 'publisher_state') return values(context.publisher?.state);
  if (key === 'publisher_family' && context.publisherFamily) {
    return [context.publisherFamily(context.publisher || dataset)];
  }
  return values(raw[key]);
}

export function largeDatasetFacetValues(
  dataset: LargeDataset,
  key: string,
  missingValue: string,
  context: LargeFacetValueContext = {}
): string[] {
  const projected = presentLargeDatasetFacetValues(dataset, key, context);
  return projected.length ? projected : [missingValue];
}
