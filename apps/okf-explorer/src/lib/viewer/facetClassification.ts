/** Producer-declared discovery metadata, never an authority or applicability claim. */
export type FacetClassification = {
  basis: string[];
  review_status: 'unreviewed' | 'partially-reviewed' | 'reviewed';
  classified_records: number;
  total_records: number;
  limitations: string[];
};

const BASIS_LABELS: Record<string, string> = {
  'explicit-mention': 'Explicit text mentions',
  'curated-reference': 'Authored concept references',
  'source-declared': 'Source-declared classification',
  normalised: 'Normalised classification',
  'model-derived': 'Model-derived classification'
};

export function facetClassification(value: unknown): FacetClassification | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  if (!['unreviewed', 'partially-reviewed', 'reviewed'].includes(String(row.review_status))) return undefined;
  if (!Number.isSafeInteger(row.classified_records) || !Number.isSafeInteger(row.total_records)
    || Number(row.classified_records) < 0 || Number(row.total_records) < Number(row.classified_records)) return undefined;
  const strings = (input: unknown) => Array.isArray(input)
    ? [...new Set(input.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim()))].slice(0, 12)
    : [];
  return {
    basis: strings(row.basis), review_status: row.review_status as FacetClassification['review_status'],
    classified_records: Number(row.classified_records), total_records: Number(row.total_records),
    limitations: strings(row.limitations)
  };
}

export function classificationMethodLabels(value: FacetClassification): string[] {
  return value.basis.map(method => BASIS_LABELS[method] || `Other producer method: ${method}`);
}
