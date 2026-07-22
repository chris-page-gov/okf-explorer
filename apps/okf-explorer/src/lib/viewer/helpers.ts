import type { LargeAnalysisOverview, LargeDataset, LargeDatasetOperationalMetadata, LargeResource, OkfNode, OkfRelationship } from '$lib/types';
import { normalizeExplorerDisplay } from './facetPresentation';

export type AnalysisFacet = NonNullable<LargeAnalysisOverview['facet_analysis']>[number];
export type AnalysisHierarchy = NonNullable<LargeAnalysisOverview['hierarchies']>[number];
export type AnalysisHierarchyValue = AnalysisHierarchy['values'][number];
export type AnalysisHierarchyChild = NonNullable<AnalysisHierarchyValue['children']>[number];
export type AnalysisTimelineBucket = NonNullable<LargeAnalysisOverview['timeline_overview']>['buckets'][number];

export type DatasetDateContext = {
  updated: string;
  updatedLabel: string;
  catalogueMetadata: boolean;
  years: string[];
  series: string;
  seriesKey: string;
};

export type DatasetOperationalContext = {
  explicit: boolean;
  catalogueDerived: boolean;
  canonicalSource: { label: string; url: string; host: string } | null;
  authoritativeSource: { name: string; url: string } | null;
  updateFrequency: string;
  latestRelease: string;
  maintenanceStatus: string;
  distributions: Array<{ label: string; kind: string; url: string }>;
  api: { label: string; url: string } | null;
  technicalSpecificationUrl: string;
  licenceUrl: string;
  verifiedAt: string;
  catalogueFrequency: string;
  catalogueReferenceDates: Array<{ date: string; kind: string }>;
  linkedSources: Array<{ label: string; host: string; url: string }>;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function recordString(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function operationalMetadata(value: unknown): LargeDatasetOperationalMetadata | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as LargeDatasetOperationalMetadata) : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function urlHost(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function uniqueLinkedSources(resources: LargeResource[]): Array<{ label: string; host: string; url: string }> {
  const rows = new Map<string, { label: string; host: string; url: string }>();
  for (const resource of resources) {
    const url = stringValue(resource.url);
    if (!/^https?:\/\//i.test(url)) continue;
    const host = stringValue(resource.host) || urlHost(url);
    if (!host || rows.has(url)) continue;
    rows.set(url, { label: stringValue(resource.name) || host, host, url });
  }
  return [...rows.values()];
}

function catalogueReferenceDates(value: unknown): Array<{ date: string; kind: string }> {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      const date = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || '';
      return date ? [{ date, kind: '' }] : [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return { date: '', kind: '' };
      const row = item as Record<string, unknown>;
      return { date: stringValue(row.value || row.date), kind: stringValue(row.type || row.kind) };
    })
    .filter((row) => Boolean(row.date));
}

function normalizedSeriesValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function yearsFromValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(yearsFromValue);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(yearsFromValue);
  if (typeof value !== 'string' && typeof value !== 'number') return [];
  return String(value).match(/\b(?:18|19|20|21)\d{2}\b/g) || [];
}

export function sourceDateLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const month = MONTH_NAMES[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : value.slice(0, 10);
}

export function datasetDateContext(dataset: LargeDataset, resources: LargeResource[] = []): DatasetDateContext {
  const direct = dataset as Record<string, unknown>;
  const extras = dataset.extras;
  const series =
    recordString(direct, 'series_title') ||
    recordString(direct, 'series') ||
    recordString(extras, 'series_title') ||
    recordString(extras, 'series');
  const seriesId = recordString(direct, 'series_id') || recordString(extras, 'series_id');
  const declaredCoverage = [direct.temporal_coverage, direct.coverage_years, extras?.temporal_coverage, extras?.coverage_years, dataset.year];
  const resourceCoverage = resources.flatMap((resource) => yearsFromValue([resource.name, resource.description]));
  const years = [...new Set([...declaredCoverage.flatMap(yearsFromValue), ...resourceCoverage])].sort();
  const dateCandidates: Array<[unknown, string, boolean]> = [
    [dataset.metadata_modified, 'Catalogue metadata updated', true],
    [dataset.timestamp, 'Catalogue/index date', true],
    [dataset.updated_at, 'Record updated', false],
    [dataset.published_at, 'Record published', false],
    [dataset.metadata_created, 'Catalogue metadata created', true],
    [dataset.creation_date, 'Record created', false]
  ];
  const dateCandidate = dateCandidates.find(([value]) => Boolean(value));
  const updated = String(dateCandidate?.[0] || '');
  return {
    updated,
    updatedLabel: dateCandidate?.[1] || 'Record date',
    catalogueMetadata: dateCandidate?.[2] || false,
    years,
    series,
    seriesKey: seriesId ? `id:${seriesId}` : series ? `label:${normalizedSeriesValue(series)}` : ''
  };
}

export function datasetOperationalContext(dataset: LargeDataset, resources: LargeResource[] = []): DatasetOperationalContext {
  const operational = operationalMetadata(dataset.operational_metadata);
  const canonical = operational?.canonical_source;
  const authoritative = operational?.authoritative_source;
  const canonicalUrl = stringValue(canonical?.url);
  const authoritativeUrl = stringValue(authoritative?.url);
  const latest = operational?.latest_release;
  const latestRelease = latest
    ? stringValue(latest.label) || stringValue(latest.date) || (latest.dynamic ? 'Dynamic — check the canonical source' : '')
    : '';
  const api = operational?.api;
  const apiLabel = api
    ? api.available === true
      ? `Available${api.access ? ` · ${api.access}` : ''}`
      : api.available === false
        ? 'Not available'
        : stringValue(api.access)
    : '';
  const sourceSignal = `${stringValue(dataset.source_adapter)} ${stringValue(dataset.source_api_url)}`.toLocaleLowerCase();
  const extras = dataset.extras;
  const catalogueFrequency = recordString(extras, 'frequency-of-update') || recordString(extras, 'frequency_of_update');
  const referenceDates = catalogueReferenceDates(extras?.['dataset-reference-date'] || extras?.dataset_reference_date);

  return {
    explicit: Boolean(operational && Object.keys(operational).length),
    catalogueDerived: sourceSignal.includes('ckan') || sourceSignal.includes('data.gov.uk'),
    canonicalSource: canonicalUrl
      ? {
          label: stringValue(canonical?.label) || urlHost(canonicalUrl) || 'Canonical source',
          url: canonicalUrl,
          host: stringValue(canonical?.host) || urlHost(canonicalUrl)
        }
      : null,
    authoritativeSource: authoritative?.name
      ? { name: authoritative.name, url: authoritativeUrl }
      : null,
    updateFrequency: stringValue(operational?.update_frequency),
    latestRelease,
    maintenanceStatus: stringValue(operational?.maintenance_status),
    distributions: (operational?.distributions || [])
      .map((distribution) => ({
        label: stringValue(distribution.label),
        kind: stringValue(distribution.kind),
        url: stringValue(distribution.url)
      }))
      .filter((distribution) => Boolean(distribution.label)),
    api: apiLabel ? { label: apiLabel, url: stringValue(api?.url) } : null,
    technicalSpecificationUrl: stringValue(operational?.technical_specification_url),
    licenceUrl: stringValue(operational?.licence_url),
    verifiedAt: stringValue(operational?.verified_at || operational?.provenance?.observed_at),
    catalogueFrequency,
    catalogueReferenceDates: referenceDates,
    linkedSources: uniqueLinkedSources(resources)
  };
}

export function relatedSeriesDatasets(dataset: LargeDataset, datasets: LargeDataset[]): LargeDataset[] {
  const context = datasetDateContext(dataset);
  if (!context.seriesKey) return [];
  return datasets
    .filter((candidate) => {
      if (candidate.name === dataset.name) return false;
      const candidateContext = datasetDateContext(candidate);
      if (candidateContext.seriesKey !== context.seriesKey) return false;
      if (context.seriesKey.startsWith('id:')) return true;
      return Boolean(dataset.publisher && candidate.publisher === dataset.publisher);
    })
    .sort((left, right) => {
      const leftDate = datasetDateContext(left).updated;
      const rightDate = datasetDateContext(right).updated;
      return rightDate.localeCompare(leftDate) || left.title.localeCompare(right.title);
    });
}

export function colorForType(type = 'Node'): string {
  const known: Record<string, string> = {
    dataset: '#0b6bcb',
    resource: '#5694ca',
    publisher: '#00703c',
    format: '#4c2c92',
    topic: '#007a7a',
    tag: '#d4351c',
    license: '#b58800',
    licence: '#b58800',
    host: '#5d6b78',
    resource_type: '#5d6b78'
  };
  const normalized = type.toLowerCase().replaceAll(' ', '_');
  if (known[normalized]) return known[normalized];
  const palette = ['#0b6bcb', '#00703c', '#4c2c92', '#d4351c', '#b58800', '#1d70b8', '#5d6b78', '#b10e73'];
  const index = Math.abs([...type].reduce((total, char) => total + char.charCodeAt(0), 0)) % palette.length;
  return palette[index];
}

export function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Not specified (metadata gap)';
  if (Array.isArray(value)) return value.length ? value.map((item) => displayValue(item)).join(', ') : 'Not specified (metadata gap)';
  if (typeof value === 'string' && ['none', 'null', 'not-specified', '__missing__'].includes(value.trim().toLowerCase())) {
    return 'Not specified (metadata gap)';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function facetLabel(key: string): string {
  return key.replaceAll('_', ' ');
}

export function metadataGapLabel(value: string): string {
  return ['none', 'null', 'not-specified', '__missing__'].includes(value.trim().toLowerCase()) ? 'Not specified (metadata gap)' : value;
}

export function facetValueLabel(analysis: LargeAnalysisOverview | undefined, key: string, value: string): string {
  if (value === 'not-specified') return metadataGapLabel(value);
  const analysisLabel = analysisLabelForRoute(analysis, `facet/${key}/${value}`);
  return analysisLabel || metadataGapLabel(value);
}

export function selectedFacetValueSummary(
  analysis: LargeAnalysisOverview | undefined,
  key: string,
  values: string[],
  maxValues = 2
): string {
  const labels = values.slice(0, maxValues).map((value) => facetValueLabel(analysis, key, value));
  return `${labels.join(', ')}${values.length > maxValues ? ` +${values.length - maxValues}` : ''}`;
}

export function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value < 0 || value > 1) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

export function routeForAnalysisNode(id: string): { key: string; value: string } | null {
  if (!id.startsWith('facet/')) return null;
  const [, key, ...valueParts] = id.split('/');
  const value = valueParts.join('/');
  return key && value ? { key, value } : null;
}

export function timelineBucketFacetFilter(bucket: AnalysisTimelineBucket): { key: string; value: string } | null {
  const explicitRoute = bucket.route?.trim();
  if (explicitRoute) {
    const routeFacet = routeForAnalysisNode(explicitRoute);
    if (routeFacet) return routeFacet;
    const routeYear = yearBucketValue(explicitRoute);
    if (routeYear) return { key: 'update_year', value: routeYear };
  }

  const id = bucket.id.trim();
  const idFacet = routeForAnalysisNode(id);
  if (idFacet) return idFacet;
  const idYear = yearBucketValue(id);
  return idYear ? { key: 'update_year', value: idYear } : null;
}

function yearBucketValue(value: string): string | null {
  const match = /^(?:year|update_year):(\d{4})$/.exec(value);
  return match?.[1] || null;
}

export function analysisFacetRows(
  analysis: LargeAnalysisOverview | undefined,
  fallbackFacetPreviews: Record<string, Array<{ value: string; count: number }>> = {}
): AnalysisFacet[] {
  if (analysis?.facet_analysis?.length) {
    const tierWeight: Record<string, number> = { primary: 0, secondary: 1, advanced: 2, suppressed: 3 };
    const display = normalizeExplorerDisplay(analysis.display);
    const configuredOrder = new Map((display.facets?.order || []).map((key, index) => [key, index]));
    const configuredPins = new Set(display.facets?.pinned || []);
    return [...analysis.facet_analysis].sort(
      (left, right) =>
        Number(!(left.default_pinned || configuredPins.has(left.key))) - Number(!(right.default_pinned || configuredPins.has(right.key))) ||
        (configuredOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) - (configuredOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER) ||
        (left.display_priority ?? Number.MAX_SAFE_INTEGER) - (right.display_priority ?? Number.MAX_SAFE_INTEGER) ||
        (tierWeight[left.recommendation] ?? 2) - (tierWeight[right.recommendation] ?? 2) ||
        right.expected_reduction - left.expected_reduction ||
        left.label.localeCompare(right.label)
    );
  }
  return Object.entries(fallbackFacetPreviews).map(([key, values]) => ({
    key,
    label: facetLabel(key),
    coverage: 0,
    cardinality: values.length,
    top_share: values[0]?.count ? 1 : 0,
    entropy: 0,
    expected_reduction: 0,
    recommended_control: 'chips',
    recommendation: 'secondary',
    values
  }));
}

export function analysisFacetForKey(
  analysis: LargeAnalysisOverview | undefined,
  key: string,
  fallbackFacetPreviews: Record<string, Array<{ value: string; count: number }>> = {}
): AnalysisFacet | null {
  return analysisFacetRows(analysis, fallbackFacetPreviews).find((facet) => facet.key === key) || null;
}

export function analysisNodeForRoute(analysis: LargeAnalysisOverview | undefined, route: string) {
  return analysis?.graph_overview?.nodes?.find((node) => node.id === route) || null;
}

export function analysisHierarchiesForFacet(analysis: LargeAnalysisOverview | undefined, key: string): AnalysisHierarchy[] {
  return (analysis?.hierarchies || []).filter((hierarchy) => hierarchy.facet === key);
}

export function analysisHierarchyValueForRoute(
  analysis: LargeAnalysisOverview | undefined,
  route: string
): { hierarchy: AnalysisHierarchy; value: AnalysisHierarchyValue | AnalysisHierarchyChild; parent?: AnalysisHierarchyValue } | null {
  for (const hierarchy of analysis?.hierarchies || []) {
    for (const value of hierarchy.values || []) {
      if (value.route === route || value.id === route) return { hierarchy, value };
      const child = (value.children || []).find((item) => item.route === route || item.id === route);
      if (child) return { hierarchy, value: child, parent: value };
    }
  }
  return null;
}

export function orderedFacetKeys(
  analysis: LargeAnalysisOverview | undefined,
  currentKeys: string[],
  defaultKeys: string[],
  fallbackFacetPreviews: Record<string, Array<{ value: string; count: number }>> = {}
): string[] {
  const keys = [...analysisFacetRows(analysis, fallbackFacetPreviews).map((facet) => facet.key), ...currentKeys, ...defaultKeys];
  return [...new Set(keys)].filter(Boolean);
}

export function facetSummary(
  analysis: LargeAnalysisOverview | undefined,
  key: string,
  fallbackFacetPreviews: Record<string, Array<{ value: string; count: number }>> = {}
): string {
  const facet = analysisFacetForKey(analysis, key, fallbackFacetPreviews);
  if (!facet) return '';
  return `${facet.recommendation} · ${facet.recommended_control} · reduction ${formatPercent(facet.expected_reduction)}`;
}

export function analysisLabelForRoute(analysis: LargeAnalysisOverview | undefined, route: string): string | null {
  const analysisNode = analysisNodeForRoute(analysis, route);
  if (analysisNode) return analysisNode.label;
  const hierarchyValue = analysisHierarchyValueForRoute(analysis, route);
  if (hierarchyValue) return hierarchyValue.value.label;
  const analysisFacet = routeForAnalysisNode(route);
  if (analysisFacet) return analysisFacet.value;
  return null;
}

export function relationshipTitle(edge: { source: string; target: string; label: string; count?: number }, labelForRoute: (route: string) => string): string {
  if (!edge.source || !edge.target) {
    return `${edge.label}${edge.count ? ` (${edge.count.toLocaleString()} relationships)` : ''}`;
  }
  return `${labelForRoute(edge.source)} \u2192 ${edge.label} \u2192 ${labelForRoute(edge.target)}`;
}

export function smallRelationshipKind(relationship: OkfRelationship): string {
  return relationship.kind || relationship.label || relationship.type || 'related';
}

export function smallRelationshipTitle(relationship: OkfRelationship, nodes: Record<string, OkfNode> | undefined): string {
  return `${nodes?.[relationship.source]?.title || relationship.source} \u2192 ${smallRelationshipKind(relationship)} \u2192 ${
    nodes?.[relationship.target]?.title || relationship.target
  }`;
}
