import type {
  FederationAccessRoute,
  FederationAuthority,
  FederationAvailability,
  FederationChild,
  FederationCoverage,
  FederationDescriptor,
  FederationDiscovery,
  FederationFreshness,
  FederationOverview,
  FederationRelationshipAssertion,
  FederationRelationshipSummary,
  NormalizedCorpus,
  OkfNode,
  OkfRelationship
} from '$lib/types';
import { summarizeRelationships } from '$lib/viewer/relationshipPresentation';
import { resolveUrl } from './fetch';

const AVAILABILITY = new Set<FederationAvailability>([
  'available',
  'partial',
  'restricted',
  'unavailable',
  'planned'
]);
const AUTHORITY = new Set(['official', 'derived', 'model-assisted', 'unclassified']);
const FRESHNESS = new Set(['current', 'stale', 'unknown']);

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}.${key} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.trim() !== value || !value) {
    throw new Error(`${key} must be a trimmed string`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return Number(value);
}

function normalizedCounts(value: unknown, label: string): Record<string, number> {
  const record = recordValue(value, label);
  return Object.fromEntries(
    Object.entries(record).map(([key, count]) => [key, nonNegativeInteger(count, `${label}.${key}`)])
  );
}

function safeResolvedUrl(value: string, baseUrl: string, label: string): string {
  let url: URL;
  try {
    url = new URL(value, baseUrl);
  } catch {
    throw new Error(`${label} must be an absolute or descriptor-relative URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${label} must use HTTP(S) without embedded credentials`);
  }
  return url.toString();
}

function normalizedRoute(value: unknown, baseUrl: string, label: string): FederationAccessRoute {
  const record = recordValue(value, label);
  const kind = stringValue(record, 'kind', label);
  const route: FederationAccessRoute = {
    kind,
    url: safeResolvedUrl(stringValue(record, 'url', label), baseUrl, `${label}.url`)
  };
  const purpose = optionalString(record, 'purpose');
  const mediaType = optionalString(record, 'media_type');
  const routeLabel = optionalString(record, 'label');
  if (purpose) route.purpose = purpose;
  if (mediaType) route.media_type = mediaType;
  if (routeLabel) route.label = routeLabel;
  if (record.priority !== undefined) {
    route.priority = nonNegativeInteger(record.priority, `${label}.priority`);
  }
  return route;
}

function normalizedDiscovery(value: unknown, baseUrl: string, label: string): FederationDiscovery {
  const record = recordValue(value, label);
  const rawSubpath = stringValue(record, 'raw_subpath', label);
  if (
    rawSubpath.startsWith('/') ||
    rawSubpath.includes('\\') ||
    rawSubpath.split('/').some((part) => part === '..')
  ) {
    throw new Error(`${label}.raw_subpath must be a repository-relative path without traversal`);
  }
  const routesValue = record.routes;
  if (!Array.isArray(routesValue) || !routesValue.length) {
    throw new Error(`${label}.routes must contain at least one declared access route`);
  }
  const routes = routesValue.map((route, index) =>
    normalizedRoute(route, baseUrl, `${label}.routes[${index}]`)
  );
  const routeKeys = routes.map((route) => `${route.kind}\u0000${route.url}`);
  if (new Set(routeKeys).size !== routeKeys.length) {
    throw new Error(`${label}.routes contains duplicate kind/URL entries`);
  }
  const discovery: FederationDiscovery = {
    repository: safeResolvedUrl(stringValue(record, 'repository', label), baseUrl, `${label}.repository`),
    documentation: safeResolvedUrl(stringValue(record, 'documentation', label), baseUrl, `${label}.documentation`),
    raw_subpath: rawSubpath,
    release_archive: safeResolvedUrl(stringValue(record, 'release_archive', label), baseUrl, `${label}.release_archive`),
    routes
  };
  const semanticDescriptor = optionalString(record, 'semantic_descriptor');
  if (semanticDescriptor) {
    discovery.semantic_descriptor = safeResolvedUrl(
      semanticDescriptor,
      baseUrl,
      `${label}.semantic_descriptor`
    );
  }
  return discovery;
}

function normalizedAuthority(value: unknown, baseUrl: string, label: string): FederationAuthority {
  const record = recordValue(value, label);
  const authorityClass = stringValue(record, 'class', label).toLowerCase().replace(/_/g, '-');
  if (!AUTHORITY.has(authorityClass)) {
    throw new Error(`${label}.class must be official, derived, model-assisted or unclassified`);
  }
  const authority: FederationAuthority = { class: authorityClass };
  const authorityLabel = optionalString(record, 'label');
  const source = optionalString(record, 'source');
  if (authorityLabel) authority.label = authorityLabel;
  if (source) authority.source = safeResolvedUrl(source, baseUrl, `${label}.source`);
  return authority;
}

function normalizedCoverage(value: unknown, label: string): FederationCoverage {
  const record = recordValue(value, label);
  const status = stringValue(record, 'status', label) as FederationAvailability;
  if (!AVAILABILITY.has(status)) {
    throw new Error(`${label}.status is not a supported coverage state`);
  }
  const coverage: FederationCoverage = { status };
  for (const key of ['applicable', 'represented', 'assertions'] as const) {
    if (record[key] !== undefined) coverage[key] = nonNegativeInteger(record[key], `${label}.${key}`);
  }
  if (record.percent !== undefined) {
    const percent = Number(record.percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error(`${label}.percent must be between 0 and 100`);
    }
    coverage.percent = percent;
  }
  if (
    coverage.applicable !== undefined &&
    coverage.represented !== undefined &&
    coverage.represented > coverage.applicable
  ) {
    throw new Error(`${label}.represented cannot exceed applicable`);
  }
  const asOf = optionalString(record, 'as_of');
  if (asOf) coverage.as_of = asOf;
  if (record.notes !== undefined) {
    if (!Array.isArray(record.notes) || record.notes.some((note) => typeof note !== 'string' || !note.trim())) {
      throw new Error(`${label}.notes must contain non-empty strings`);
    }
    coverage.notes = record.notes as string[];
  }
  return coverage;
}

function normalizedFreshness(value: unknown, label: string): FederationFreshness {
  const record = recordValue(value, label);
  const freshness: FederationFreshness = {};
  const state = optionalString(record, 'state');
  if (state && !FRESHNESS.has(state)) {
    throw new Error(`${label}.state must be current, stale or unknown`);
  }
  if (state) freshness.state = state as FederationFreshness['state'];
  for (const key of ['observed_at', 'snapshot', 'stale_after'] as const) {
    const item = optionalString(record, key);
    if (item) freshness[key] = item;
  }
  return freshness;
}

function normalizedChild(value: unknown, baseUrl: string, index: number): FederationChild {
  const label = `children[${index}]`;
  const record = recordValue(value, label);
  const status = stringValue(record, 'status', label) as FederationAvailability;
  if (!AVAILABILITY.has(status)) throw new Error(`${label}.status is not supported`);
  const descriptorValue = optionalString(record, 'descriptor');
  const semanticValue = optionalString(record, 'semantic_descriptor');
  const discovery = normalizedDiscovery(record.discovery, baseUrl, `${label}.discovery`);
  const child: FederationChild = {
    id: stringValue(record, 'id', label),
    title: stringValue(record, 'title', label),
    role: stringValue(record, 'role', label),
    status,
    authority: normalizedAuthority(record.authority, baseUrl, `${label}.authority`),
    coverage: normalizedCoverage(record.coverage, `${label}.coverage`),
    freshness: normalizedFreshness(record.freshness, `${label}.freshness`),
    discovery
  };
  const description = optionalString(record, 'description');
  if (description) child.description = description;
  if (descriptorValue) {
    child.descriptor = safeResolvedUrl(descriptorValue, baseUrl, `${label}.descriptor`);
  }
  if (semanticValue) {
    child.semantic_descriptor = safeResolvedUrl(
      semanticValue,
      baseUrl,
      `${label}.semantic_descriptor`
    );
  }
  if (record.counts !== undefined) child.counts = normalizedCounts(record.counts, `${label}.counts`);
  if (record.extensions !== undefined) child.extensions = recordValue(record.extensions, `${label}.extensions`);
  const hasLoadableDescriptor = Boolean(
    child.descriptor ||
    discovery.routes.some((route) =>
      route.purpose === 'descriptor' ||
      (!route.purpose && ['published', 'raw'].includes(route.kind))
    )
  );
  if (['available', 'partial'].includes(status) && !hasLoadableDescriptor) {
    throw new Error(`${label} is ${status} but has no declared descriptor route`);
  }
  return child;
}

function normalizedSummary(value: unknown, label: string): FederationRelationshipSummary {
  const record = recordValue(value, label);
  const total = nonNegativeInteger(record.total, `${label}.total`);
  const authorityCounts = normalizedCounts(record.by_authority, `${label}.by_authority`);
  const freshnessCounts = normalizedCounts(record.by_freshness, `${label}.by_freshness`);
  for (const required of ['official', 'derived', 'model-assisted']) {
    if (!(required in authorityCounts)) throw new Error(`${label}.by_authority.${required} is required`);
  }
  for (const required of ['current', 'stale', 'unknown']) {
    if (!(required in freshnessCounts)) throw new Error(`${label}.by_freshness.${required} is required`);
  }
  const summary: FederationRelationshipSummary = {
    scope: stringValue(record, 'scope', label),
    total,
    by_predicate: normalizedCounts(record.by_predicate, `${label}.by_predicate`),
    by_authority: {
      official: 0,
      derived: 0,
      'model-assisted': 0,
      ...authorityCounts
    },
    by_freshness: {
      current: 0,
      stale: 0,
      unknown: 0,
      ...freshnessCounts
    }
  };
  const sums = [
    ['by_predicate', Object.values(summary.by_predicate).reduce<number>((sum, count) => sum + Number(count || 0), 0)],
    ['by_authority', Object.values(summary.by_authority).reduce<number>((sum, count) => sum + Number(count || 0), 0)],
    ['by_freshness', Object.values(summary.by_freshness).reduce<number>((sum, count) => sum + Number(count || 0), 0)]
  ] as const;
  for (const [key, sum] of sums) {
    if (sum !== total) throw new Error(`${label}.${key} sums to ${sum}, not total ${total}`);
  }
  const observedAt = optionalString(record, 'observed_at');
  const snapshot = optionalString(record, 'snapshot');
  if (observedAt) summary.observed_at = observedAt;
  if (snapshot) summary.snapshot = snapshot;
  return summary;
}

function normalizedRelationship(
  value: unknown,
  baseUrl: string,
  childIds: Set<string>,
  index: number
): FederationRelationshipAssertion {
  const label = `relationships[${index}]`;
  const record = recordValue(value, label);
  const source = stringValue(record, 'source', label);
  const target = stringValue(record, 'target', label);
  if (!childIds.has(source) || !childIds.has(target)) {
    throw new Error(`${label} must reference declared federation child IDs`);
  }
  const relationship: FederationRelationshipAssertion = {
    source,
    target,
    predicate: stringValue(record, 'predicate', label),
    kind: optionalString(record, 'kind') || stringValue(record, 'predicate', label),
    authority: normalizedAuthority(record.authority, baseUrl, `${label}.authority`),
    derivation: stringValue(record, 'derivation', label)
  };
  const schema = optionalString(record, 'schema');
  const relationshipLabel = optionalString(record, 'label');
  const confidence = record.confidence;
  const observedAt = optionalString(record, 'observed_at');
  const staleAfter = optionalString(record, 'stale_after');
  const freshness = optionalString(record, 'freshness');
  if (schema) relationship.schema = schema;
  if (relationshipLabel) relationship.label = relationshipLabel;
  if (confidence !== undefined) {
    if (!['string', 'number'].includes(typeof confidence)) throw new Error(`${label}.confidence must be a string or number`);
    relationship.confidence = confidence as string | number;
  }
  if (observedAt) relationship.observed_at = observedAt;
  if (staleAfter) relationship.stale_after = staleAfter;
  if (freshness) {
    if (!FRESHNESS.has(freshness)) throw new Error(`${label}.freshness is invalid`);
    relationship.freshness = freshness;
  }
  if (record.evidence !== undefined) {
    if (!Array.isArray(record.evidence)) throw new Error(`${label}.evidence must be an array`);
    relationship.evidence = record.evidence.map((item, evidenceIndex) => {
      if (typeof item === 'string') {
        return safeResolvedUrl(item, baseUrl, `${label}.evidence[${evidenceIndex}]`);
      }
      const evidence = recordValue(item, `${label}.evidence[${evidenceIndex}]`);
      const url = optionalString(evidence, 'url') || optionalString(evidence, 'resource') || optionalString(evidence, '@id');
      if (!url) throw new Error(`${label}.evidence[${evidenceIndex}] has no URL`);
      return {
        ...evidence,
        url: safeResolvedUrl(url, baseUrl, `${label}.evidence[${evidenceIndex}]`)
      };
    });
  }
  if (record.rights !== undefined) relationship.rights = record.rights as string | Record<string, unknown>;
  return relationship;
}

function childResources(child: FederationChild): Array<Record<string, unknown>> {
  const resources: Array<Record<string, unknown>> = [];
  const add = (title: string, url: string | undefined, kind: string) => {
    if (url && !resources.some((resource) => resource.url === url)) resources.push({ title, url, kind });
  };
  add('Published descriptor', child.descriptor, 'descriptor');
  add('Semantic YAML-LD descriptor', child.semantic_descriptor || child.discovery.semantic_descriptor, 'semantic');
  add('Repository', child.discovery.repository, 'repository');
  add('Documentation', child.discovery.documentation, 'documentation');
  add('Release archive', child.discovery.release_archive, 'archive');
  for (const route of child.discovery.routes) add(route.label || route.kind, route.url, route.kind);
  return resources;
}

function childNode(child: FederationChild, publisher: string, generatedAt: string): OkfNode {
  const source = child.descriptor || child.discovery.routes.find((route) => route.purpose === 'descriptor')?.url || child.discovery.repository;
  return {
    id: child.id,
    title: child.title,
    type: 'FederatedBundle',
    section: 'federation',
    description: child.description || `${child.role} · ${child.status}`,
    source,
    status: child.status,
    stale_after: child.freshness.stale_after,
    generated: {
      by: publisher,
      at: child.freshness.observed_at || generatedAt
    },
    sources: [{ resource: source }],
    tags: [
      child.role,
      child.status,
      child.authority.class,
      child.freshness.state || 'unknown'
    ],
    resources: childResources(child),
    publisher,
    federation_role: child.role,
    federation_status: child.status,
    authority_class: child.authority.class,
    authority_label: child.authority.label,
    coverage_status: child.coverage.status,
    coverage_applicable: child.coverage.applicable,
    coverage_represented: child.coverage.represented,
    coverage_assertions: child.coverage.assertions,
    coverage_percent: child.coverage.percent,
    coverage_as_of: child.coverage.as_of,
    freshness_state: child.freshness.state || 'unknown',
    snapshot: child.freshness.snapshot,
    observed_at: child.freshness.observed_at,
    descriptor_url: child.descriptor,
    repository_url: child.discovery.repository,
    documentation_url: child.discovery.documentation,
    raw_subpath: child.discovery.raw_subpath,
    release_archive_url: child.discovery.release_archive,
    access_routes: child.discovery.routes,
    counts: child.counts || {}
  };
}

export function isFederationDescriptor(value: unknown): value is FederationDescriptor {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).schema === 'okf-explorer-federation.v1' &&
    (value as Record<string, unknown>).kind === 'okf-federation'
  );
}

/**
 * Validate and normalize a federation control plane without fetching a child
 * descriptor or data-plane resource. Child hydration remains an explicit user
 * action through the child's declared descriptor routes.
 */
export function loadFederationOverview(
  value: unknown,
  requestedUrl: string,
  resolvedUrl = requestedUrl,
  attemptedUrls: string[] = [requestedUrl]
): { corpus: NormalizedCorpus; overview: FederationOverview } {
  const record = recordValue(value, 'Federation descriptor');
  if (record.schema !== 'okf-explorer-federation.v1' || record.kind !== 'okf-federation') {
    throw new Error(`${resolvedUrl}: expected okf-explorer-federation.v1 / okf-federation`);
  }
  const childrenValue = record.children;
  if (!Array.isArray(childrenValue) || !childrenValue.length) {
    throw new Error('Federation descriptor children must be a non-empty array');
  }
  const children = childrenValue.map((child, index) => normalizedChild(child, resolvedUrl, index));
  const childIds = children.map((child) => child.id);
  if (new Set(childIds).size !== childIds.length) throw new Error('Federation child IDs must be unique');
  const relationshipsValue = record.relationships;
  if (relationshipsValue !== undefined && !Array.isArray(relationshipsValue)) {
    throw new Error('Federation descriptor relationships must be an array');
  }
  const relationships = (relationshipsValue || []).map((relationship, index) =>
    normalizedRelationship(relationship, resolvedUrl, new Set(childIds), index)
  );
  const counts = normalizedCounts(record.counts, 'counts');
  if (counts.children !== undefined && counts.children !== children.length) {
    throw new Error(`counts.children is ${counts.children}, not ${children.length}`);
  }
  for (const status of AVAILABILITY) {
    if (counts[status] === undefined) continue;
    const actual = children.filter((child) => child.status === status).length;
    if (counts[status] !== actual) {
      throw new Error(`counts.${status} is ${counts[status]}, not ${actual}`);
    }
  }
  const descriptor: FederationDescriptor = {
    schema: 'okf-explorer-federation.v1',
    kind: 'okf-federation',
    okf_version: stringValue(record, 'okf_version', 'Federation descriptor'),
    title: stringValue(record, 'title', 'Federation descriptor'),
    description: optionalString(record, 'description'),
    version: stringValue(record, 'version', 'Federation descriptor'),
    status: stringValue(record, 'status', 'Federation descriptor'),
    generated_at: stringValue(record, 'generated_at', 'Federation descriptor'),
    snapshot: stringValue(record, 'snapshot', 'Federation descriptor'),
    profile: safeResolvedUrl(stringValue(record, 'profile', 'Federation descriptor'), resolvedUrl, 'profile'),
    publisher: safeResolvedUrl(stringValue(record, 'publisher', 'Federation descriptor'), resolvedUrl, 'publisher'),
    license: safeResolvedUrl(stringValue(record, 'license', 'Federation descriptor'), resolvedUrl, 'license'),
    discovery: normalizedDiscovery(record.discovery, resolvedUrl, 'discovery'),
    counts,
    children,
    relationship_summary: normalizedSummary(record.relationship_summary, 'relationship_summary')
  };
  const context = record['@context'];
  const identifier = optionalString(record, '@id');
  if (typeof context === 'string' || Array.isArray(context) || (context && typeof context === 'object')) {
    descriptor['@context'] = context as FederationDescriptor['@context'];
  }
  if (identifier) descriptor['@id'] = safeResolvedUrl(identifier, resolvedUrl, '@id');
  if (relationships.length) descriptor.relationships = relationships;
  if (record.notices !== undefined) {
    if (!Array.isArray(record.notices) || record.notices.some((notice) => typeof notice !== 'string' || !notice.trim())) {
      throw new Error('notices must contain non-empty strings');
    }
    descriptor.notices = record.notices as string[];
  }
  if (record.extensions !== undefined) descriptor.extensions = recordValue(record.extensions, 'extensions');

  const nodes = Object.fromEntries(
    children.map((child) => [child.id, childNode(child, descriptor.publisher, descriptor.generated_at)])
  );
  const normalizedRelationships: OkfRelationship[] = relationships.map((relationship) => ({
    ...relationship,
    kind: relationship.kind || relationship.predicate
  }));
  const inlineRelationshipSummary = summarizeRelationships(
    normalizedRelationships,
    'federation-control-plane'
  );
  return {
    corpus: {
      id: descriptor['@id'] || 'whole-law-federation',
      title: descriptor.title,
      description: descriptor.description,
      okfVersion: descriptor.okf_version,
      profile: descriptor.profile,
      nodes,
      relationships: normalizedRelationships,
      meta: {
        generated_at: descriptor.generated_at,
        snapshot: descriptor.snapshot,
        version: descriptor.version,
        status: descriptor.status,
        publisher: descriptor.publisher,
        license: descriptor.license,
        federation_schema: descriptor.schema
      }
    },
    overview: {
      descriptor,
      requestedUrl,
      resolvedUrl,
      attemptedUrls,
      inlineRelationshipSummary
    }
  };
}
