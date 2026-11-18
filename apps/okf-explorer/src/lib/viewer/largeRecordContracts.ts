import type {
  LargeDataset,
  LargeRecordNarrative,
  LargeResource,
  LargeRouteLink,
  LargeSourceAccess,
  LargeSourceDisplayMode
} from '$lib/types';
import { officialClmlUrl, officialDocumentUrl } from '$lib/legislation/structure';

export type ResolvedLargeSourceAccess = LargeSourceAccess & {
  resourceId?: string;
  legacy?: boolean;
};

const DISPLAY_MODES = new Set<LargeSourceDisplayMode>(['link', 'json', 'xml', 'text']);
type SourceFormat = Pick<LargeSourceAccess, 'label' | 'media_type' | 'display_mode'>;
const XML: SourceFormat = { label: 'Source XML', media_type: 'application/xml', display_mode: 'xml' };
const JSON_API: SourceFormat = { label: 'Source API', media_type: 'application/json', display_mode: 'json' };
const LEGACY_FORMATS = new Map<string, SourceFormat>([
  ['xml', XML],
  ['clml', XML],
  ['csv', { label: 'Source table', media_type: 'text/csv', display_mode: 'text' }],
  ['tsv', { label: 'Source table', media_type: 'text/tab-separated-values', display_mode: 'text' }],
  ['rdf', { label: 'Source document', media_type: 'application/rdf+xml', display_mode: 'link' }],
  ['pdf', { label: 'Source document', media_type: 'application/pdf', display_mode: 'link' }],
  ['html', { label: 'Source document', media_type: 'text/html', display_mode: 'link' }]
]);

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

/** Preserve the producer's type label; collection vocabulary is only a fallback. */
export function recordTypeLabel(
  record: { record_type?: unknown; type?: unknown },
  collectionLabel: string
): string {
  const declared = [record.record_type, record.type].find(nonEmpty);
  return declared?.trim() || collectionLabel;
}

function httpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function routeLink(value: unknown): value is LargeRouteLink {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && nonEmpty((value as LargeRouteLink).route));
}

export function recordNarrative(dataset: LargeDataset | undefined): LargeRecordNarrative | null {
  const candidate = dataset?.narrative;
  if (!candidate || !nonEmpty(candidate.body)) return null;
  return candidate;
}

export function narrativeBaseUrl(narrative: LargeRecordNarrative, fallback: string): string {
  const value = narrative.source_url;
  if (typeof value !== 'string' || !/^https?:\/\//.test(value) || /[\s<>"\\]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) return fallback;
  try {
    const url = new URL(value);
    return url.hostname && !url.username && !url.password ? value : fallback;
  } catch { return fallback; }
}

export function narrativeRouteLinks(value: unknown): LargeRouteLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(routeLink);
}

export function narrativeRouteGroups(narrative: LargeRecordNarrative): Array<{ label: string; links: LargeRouteLink[] }> {
  return [
    { label: 'What comes before', links: narrativeRouteLinks(narrative.previous) },
    { label: 'What may follow', links: narrativeRouteLinks(narrative.next) },
    { label: 'Route variants', links: narrativeRouteLinks(narrative.variants) },
    { label: 'Related routes', links: narrativeRouteLinks(narrative.related) }
  ].filter((group) => group.links.length);
}

export function sourceAccesses(dataset: LargeDataset, resources: LargeResource[]): ResolvedLargeSourceAccess[] {
  const declared = resources.flatMap((resource) => {
    const access = resource.source_access;
    if (
      !access ||
      !nonEmpty(access.url) ||
      !httpUrl(access.url) ||
      !nonEmpty(access.label) ||
      !nonEmpty(access.media_type) ||
      !DISPLAY_MODES.has(access.display_mode)
    ) {
      return [];
    }
    return [{ ...access, resourceId: resource.id }];
  });

  const deduplicated = new Map<string, ResolvedLargeSourceAccess>();
  for (const access of declared) deduplicated.set(`${access.display_mode}\u0000${access.url}`, access);

  if (!deduplicated.size && nonEmpty(dataset.source_api_url) && httpUrl(dataset.source_api_url)) {
    const url = new URL(dataset.source_api_url);
    const legislative = dataset.record_type === 'Legislation Work' || Boolean(dataset.legislation_id_uri);
    const structure = legislative ? officialClmlUrl(dataset) : '';
    // The official legislation panel already renders this exact XML manifestation.
    if (structure && officialDocumentUrl(url.href) === structure) return [];

    const extension = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() || '';
    const format = LEGACY_FORMATS.get(extension) || JSON_API;
    deduplicated.set(`${format.display_mode}\u0000${url.href}`, {
      url: dataset.source_api_url, ...format, legacy: true
    });
  }
  return [...deduplicated.values()];
}

export function canDisplaySourceInline(access: ResolvedLargeSourceAccess): boolean {
  return access.display_mode !== 'link';
}

export function sourceOpenLabel(access: ResolvedLargeSourceAccess): string {
  return access.display_mode === 'link'
    ? `Open ${access.label.trim() || 'source'} ↗`
    : `Open source ${access.display_mode.toUpperCase()} ↗`;
}
