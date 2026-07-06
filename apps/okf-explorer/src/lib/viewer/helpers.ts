import type { LargeAnalysisOverview, OkfNode, OkfRelationship } from '$lib/types';

export type AnalysisFacet = NonNullable<LargeAnalysisOverview['facet_analysis']>[number];
export type AnalysisHierarchy = NonNullable<LargeAnalysisOverview['hierarchies']>[number];
export type AnalysisHierarchyValue = AnalysisHierarchy['values'][number];
export type AnalysisHierarchyChild = NonNullable<AnalysisHierarchyValue['children']>[number];

export function colorForType(type = 'Node'): string {
  const known: Record<string, string> = {
    dataset: '#0b6bcb',
    resource: '#5694ca',
    publisher: '#00703c',
    format: '#4c2c92',
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
  if (value === undefined || value === null || value === '') return 'None';
  if (Array.isArray(value)) return value.length ? value.map((item) => displayValue(item)).join(', ') : 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function facetLabel(key: string): string {
  return key.replaceAll('_', ' ');
}

export function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return 'n/a';
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

export function analysisFacetRows(
  analysis: LargeAnalysisOverview | undefined,
  fallbackFacetPreviews: Record<string, Array<{ value: string; count: number }>> = {}
): AnalysisFacet[] {
  if (analysis?.facet_analysis?.length) {
    const tierWeight: Record<string, number> = { primary: 0, secondary: 1, advanced: 2, suppressed: 3 };
    return [...analysis.facet_analysis].sort(
      (left, right) =>
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
