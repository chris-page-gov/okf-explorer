import type {
  NormalizedCorpus,
  OkfBundle,
  OkfNode,
  OkfRelationship,
  RelationshipAssertionScope
} from '$lib/types';
import { isHttpUrl } from '$lib/viewer/helpers';

const MAX_SMALL_SEMANTIC_GRAPH_NODES = 10_000;
const LOCAL_SEMANTIC_ROUTE = /^[a-z][a-z0-9-]*(?:\/[A-Za-z0-9._~-]+)+$/;
const ABSOLUTE_SEMANTIC_IRI = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/;
const SHA256 = /^[0-9a-f]{64}$/;

function titleForNode(id: string, node: OkfNode): string {
  return String(node.title || node.name || node.label || id);
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(';').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeNode(id: string, node: OkfNode): OkfNode {
  return {
    ...node,
    id,
    title: titleForNode(id, node),
    type: node.type || 'Node',
    section: node.section || 'root',
    aliases: normalizeStringList(node.aliases),
    tags: normalizeStringList(node.tags)
  };
}

function normalizeRelationships(values: OkfRelationship[] | undefined): OkfRelationship[] {
  return (values || [])
    .filter((relationship) => relationship.source && relationship.target)
    .map((relationship) => ({
      ...relationship,
      kind: relationship.kind || relationship.type || relationship.label || 'related'
    }));
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function isAbsoluteSemanticIri(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim() === value
    && /^[\x21-\x7e]+$/.test(value)
    && !/["'<>\\^`{|}]/.test(value)
    && !/%(?![0-9A-Fa-f]{2})/.test(value)
    && ABSOLUTE_SEMANTIC_IRI.test(value);
}

function semanticId(value: unknown): string {
  const candidate = typeof value === 'string' ? value : record(value)?.['@id'];
  return isAbsoluteSemanticIri(candidate) ? candidate : '';
}

function semanticType(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.map(String).map((item) => item.trim()).filter(Boolean);
}

function localSemanticRoute(value: unknown): string {
  const route = typeof value === 'string' && value.trim() === value ? value : '';
  return LOCAL_SEMANTIC_ROUTE.test(route) ? route : '';
}

function semanticRoute(value: Record<string, unknown>): string {
  return localSemanticRoute(value.route || value['okf:route']);
}

function isRelationshipAssertion(value: Record<string, unknown>): boolean {
  return semanticType(value['@type']).some((item) =>
    item === 'RelationshipAssertion'
    || item === 'okf:RelationshipAssertion'
    || item.endsWith('#RelationshipAssertion')
    || item.endsWith('/RelationshipAssertion')
  );
}

function looksLikeRelationshipAssertion(value: Record<string, unknown>): boolean {
  return isRelationshipAssertion(value)
    || ('source' in value && 'predicate' in value && 'target' in value)
    || [
    'assertion_status',
    'assertion_scope',
    'inverse_label',
    'rdf:subject',
    'rdf:predicate',
    'rdf:object'
    ].some((field) => field in value);
}

function semanticText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requireSemantic(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid explicit semantic graph: ${message}`);
}

function validateEvidence(value: unknown, assertionId: string, index: number): void {
  const evidence = record(value);
  const label = `${assertionId} evidence[${index}]`;
  requireSemantic(evidence, `${label} must be an object`);
  requireSemantic(semanticId(evidence['@id']), `${label} requires an absolute @id`);
  requireSemantic(semanticText(evidence.type), `${label} requires type`);
  requireSemantic(isHttpUrl(evidence.url), `${label} requires a canonical HTTP(S) url`);
  if (evidence.resource !== undefined) {
    requireSemantic(isHttpUrl(evidence.resource), `${label} resource must be a canonical HTTP(S) URL`);
  }
  requireSemantic(semanticText(evidence.source_field), `${label} requires source_field`);
  requireSemantic(
    typeof evidence.source_value_sha256 === 'string' && SHA256.test(evidence.source_value_sha256),
    `${label} requires source_value_sha256`
  );
  requireSemantic(
    typeof evidence.retrieved_at === 'string' && Number.isFinite(Date.parse(evidence.retrieved_at)),
    `${label} requires a valid retrieved_at`
  );
  for (const field of ['normalization', 'rule_id']) {
    if (evidence[field] !== undefined) {
      requireSemantic(semanticId(evidence[field]), `${label} ${field} must be an absolute IRI`);
    }
  }
  for (const field of ['source_sha256', 'literal_sha256']) {
    if (evidence[field] !== undefined) {
      requireSemantic(
        typeof evidence[field] === 'string' && SHA256.test(evidence[field]),
        `${label} ${field} must be a SHA-256 digest`
      );
    }
  }
}

function semanticRelationship(
  value: Record<string, unknown>,
  routesByIri: Map<string, string>,
  graphIds: Set<string>
): OkfRelationship {
  requireSemantic(isRelationshipAssertion(value), 'relationship-like nodes must declare RelationshipAssertion type');
  const assertionId = semanticId(value['@id']);
  requireSemantic(assertionId, 'relationship assertion requires an absolute @id');
  requireSemantic(!graphIds.has(assertionId), `duplicate graph @id ${assertionId}`);
  graphIds.add(assertionId);
  const sourceIri = semanticId(value.source || value['rdf:subject'] || value.subject);
  const targetIri = semanticId(value.target || value['rdf:object'] || value.object);
  requireSemantic(sourceIri, `${assertionId} requires an absolute source IRI`);
  requireSemantic(targetIri, `${assertionId} requires an absolute target IRI`);
  if (value.source_iri !== undefined || value.sourceIri !== undefined) {
    requireSemantic(
      semanticId(value.source_iri || value.sourceIri) === sourceIri,
      `${assertionId} source_iri must match source`
    );
  }
  if (value.target_iri !== undefined || value.targetIri !== undefined) {
    requireSemantic(
      semanticId(value.target_iri || value.targetIri) === targetIri,
      `${assertionId} target_iri must match target`
    );
  }
  const declaredSourceRoute = value.source_route || value.sourceRoute;
  const declaredTargetRoute = value.target_route || value.targetRoute;
  const mappedSourceRoute = routesByIri.get(sourceIri) || '';
  const mappedTargetRoute = routesByIri.get(targetIri) || '';
  requireSemantic(mappedSourceRoute, `${assertionId} source does not resolve to a route-bearing graph node`);
  requireSemantic(mappedTargetRoute, `${assertionId} target does not resolve to a route-bearing graph node`);
  const source = declaredSourceRoute === undefined ? mappedSourceRoute : localSemanticRoute(declaredSourceRoute);
  const target = declaredTargetRoute === undefined ? mappedTargetRoute : localSemanticRoute(declaredTargetRoute);
  requireSemantic(source === mappedSourceRoute, `${assertionId} source route is missing, unsafe, or inconsistent`);
  requireSemantic(target === mappedTargetRoute, `${assertionId} target route is missing, unsafe, or inconsistent`);
  const predicate = semanticId(value.predicate || value['rdf:predicate']);
  requireSemantic(predicate, `${assertionId} requires an absolute predicate IRI`);
  const kind = semanticText(value.kind);
  const label = semanticText(value.label);
  const inverseLabel = semanticText(value.inverse_label);
  requireSemantic(kind, `${assertionId} requires kind`);
  requireSemantic(label, `${assertionId} requires label`);
  requireSemantic(inverseLabel, `${assertionId} requires inverse_label`);
  const assertionStatus = semanticText(value.assertion_status);
  const assertionScope = semanticText(value.assertion_scope);
  requireSemantic(
    ['official', 'normalized', 'inferred', 'model-derived'].includes(assertionStatus),
    `${assertionId} has an unsupported assertion_status`
  );
  requireSemantic(
    ['real-world', 'synthetic-fixture'].includes(assertionScope),
    `${assertionId} has an unsupported assertion_scope`
  );
  const authority = record(value.authority);
  requireSemantic(authority, `${assertionId} requires authority`);
  const authorityClass = semanticText(authority.class);
  requireSemantic(
    ['official', 'derived', 'model-assisted', 'synthetic', 'unclassified'].includes(authorityClass),
    `${assertionId} has an unsupported authority class`
  );
  requireSemantic(semanticText(authority.label), `${assertionId} authority requires label`);
  requireSemantic(isHttpUrl(authority.source), `${assertionId} authority requires a canonical HTTP(S) source`);
  const expectedAuthority = assertionScope === 'synthetic-fixture'
    ? 'synthetic'
    : {
        official: 'official',
        normalized: 'derived',
        inferred: 'derived',
        'model-derived': 'model-assisted'
      }[assertionStatus];
  requireSemantic(authorityClass === expectedAuthority, `${assertionId} authority conflicts with status/scope`);
  requireSemantic(semanticId(value.derivation), `${assertionId} requires an absolute derivation IRI`);
  requireSemantic(
    typeof value.observed_at === 'string' && Number.isFinite(Date.parse(value.observed_at)),
    `${assertionId} requires a valid observed_at`
  );
  requireSemantic(Array.isArray(value.evidence) && value.evidence.length > 0, `${assertionId} requires evidence`);
  value.evidence.forEach((item, index) => validateEvidence(item, assertionId, index));
  const rights = record(value.rights);
  requireSemantic(rights, `${assertionId} requires rights`);
  requireSemantic(isHttpUrl(rights.source), `${assertionId} rights requires a canonical HTTP(S) source`);
  requireSemantic(semanticText(rights.assertion), `${assertionId} rights requires assertion text`);
  if (assertionStatus === 'inferred') {
    requireSemantic(semanticId(value.rule), `${assertionId} inferred assertion requires rule`);
    requireSemantic(semanticId(value.derivation_activity), `${assertionId} inferred assertion requires derivation_activity`);
    requireSemantic(
      Array.isArray(value.supporting_assertions)
        && value.supporting_assertions.length > 0
        && value.supporting_assertions.every((item) => Boolean(semanticId(item))),
      `${assertionId} inferred assertion requires supporting_assertions`
    );
    requireSemantic(
      typeof value.confidence_score === 'number'
        && value.confidence_score >= 0
        && value.confidence_score <= 1,
      `${assertionId} inferred assertion requires confidence_score`
    );
  }
  if (assertionStatus === 'model-derived') {
    requireSemantic(semanticId(value.derivation_activity), `${assertionId} model-derived assertion requires derivation_activity`);
    requireSemantic(
      typeof value.confidence_score === 'number'
        && value.confidence_score >= 0
        && value.confidence_score <= 1,
      `${assertionId} model-derived assertion requires confidence_score`
    );
    requireSemantic(semanticText(value.review_status), `${assertionId} model-derived assertion requires review_status`);
  }
  return {
    ...value,
    id: assertionId,
    source,
    target,
    source_iri: sourceIri,
    target_iri: targetIri,
    predicate,
    kind,
    label,
    inverse_label: inverseLabel,
    assertion_status: assertionStatus,
    assertion_scope: assertionScope
  };
}

/**
 * Normalize the bounded OKF YAML-LD `@graph` projection. The browser does not
 * expand arbitrary contexts or infer RDF statements: producers must publish
 * explicit route-bearing nodes and reified RelationshipAssertion rows. This
 * keeps navigation deterministic while preserving the semantic IRIs and the
 * complete evidence-bearing assertion object for the relationship card.
 */
function normalizeSemanticGraph(bundle: OkfBundle): NormalizedCorpus | null {
  if (!Array.isArray(bundle['@graph'])) return null;
  const graph = bundle['@graph'];
  requireSemantic(bundle['@context'], 'an explicit @graph requires @context');
  requireSemantic(graph.length <= MAX_SMALL_SEMANTIC_GRAPH_NODES, `@graph exceeds ${MAX_SMALL_SEMANTIC_GRAPH_NODES} nodes`);
  const entities: Record<string, unknown>[] = [];
  const assertions: Record<string, unknown>[] = [];
  for (const item of graph) {
    requireSemantic(record(item), '@graph entries must be objects');
    if (looksLikeRelationshipAssertion(item)) assertions.push(item);
    else entities.push(item);
  }
  const routesByIri = new Map<string, string>();
  const graphIds = new Set<string>();
  const routeIds = new Set<string>();
  const nodeRows: Array<readonly [string, OkfNode]> = [];
  for (const item of entities) {
    const iri = semanticId(item['@id']);
    const route = semanticRoute(item);
    requireSemantic(iri, 'each semantic entity requires an absolute @id');
    requireSemantic(route, `${iri} requires an explicit safe local route`);
    requireSemantic(!graphIds.has(iri), `duplicate graph @id ${iri}`);
    requireSemantic(!routeIds.has(route), `duplicate semantic route ${route}`);
    graphIds.add(iri);
    routeIds.add(route);
    routesByIri.set(iri, route);
    const types = semanticType(item['@type']);
    nodeRows.push([route, normalizeNode(route, {
      ...item,
      id: route,
      semantic_id: iri,
      title: String(item.title || item.name || item.label || route),
      description: String(item.description || item.summary || ''),
      type: String(item.type || types[0] || 'Semantic entity')
    })]);
  }
  const relationships = assertions.map((item) => semanticRelationship(item, routesByIri, graphIds));
  const nodes = Object.fromEntries(nodeRows);
  const top = bundle as unknown as Record<string, unknown>;
  return {
    id: String(bundle['@id'] || 'semantic'),
    title: String(bundle.title || bundle.meta?.title || bundle['@id'] || 'OKF semantic bundle'),
    description: String(bundle.meta?.description || top.description || ''),
    okfVersion: String(bundle.okf_version || top.okfVersion || ''),
    profile: String(bundle.meta?.profile || semanticId(top.profile) || ''),
    nodes,
    relationships: normalizeRelationships(relationships),
    assertionScope: assertionScope(top.assertion_scope || top.assertionScope),
    meta: {
      ...(bundle.meta || {}),
      semantic_source: true,
      semantic_id: bundle['@id'] || '',
      semantic_type: bundle['@type'] || ''
    }
  };
}

function assertionScope(value: unknown): RelationshipAssertionScope | undefined {
  return value === 'real-world' || value === 'synthetic-fixture' ? value : undefined;
}

export function normalizeSmallBundle(bundle: OkfBundle, preferredCorpus = ''): NormalizedCorpus {
  const semantic = normalizeSemanticGraph(bundle);
  if (semantic) return semantic;
  const corpora = bundle.corpora || {};
  const corpusEntries = Object.entries(corpora);
  const isDefaultLoaded = (corpus: Partial<NormalizedCorpus>) => {
    const record = corpus as unknown as Record<string, unknown>;
    return record.default_loaded !== false && corpus.defaultLoaded !== false;
  };
  const declaredDefault = typeof bundle.meta?.default_corpus === 'string'
    ? bundle.meta.default_corpus
    : '';
  const corpusId = preferredCorpus && corpora[preferredCorpus]
    ? preferredCorpus
    : declaredDefault && corpora[declaredDefault] && isDefaultLoaded(corpora[declaredDefault])
      ? declaredDefault
      : corpusEntries.find(([, corpus]) => isDefaultLoaded(corpus))?.[0]
        || corpusEntries[0]?.[0];
  const rawCorpus = (corpusId ? corpora[corpusId] : bundle) as Partial<NormalizedCorpus> & OkfBundle;
  const rawRecord = rawCorpus as unknown as Record<string, unknown>;
  const nodes = Object.fromEntries(
    Object.entries(rawCorpus.nodes || bundle.nodes || {}).map(([id, node]) => [id, normalizeNode(id, node)])
  );
  return {
    id: corpusId || 'default',
    title: String(rawCorpus.title || bundle.meta?.title || bundle.title || 'OKF bundle'),
    description: String(rawCorpus.description || bundle.meta?.description || ''),
    okfVersion: String(bundle.okf_version || ''),
    profile: String(bundle.meta?.profile || ''),
    nodes,
    relationships: normalizeRelationships(rawCorpus.relationships || rawCorpus.edges || bundle.relationships || bundle.edges),
    assertionScope: assertionScope(rawRecord.assertion_scope || rawCorpus.assertionScope),
    defaultLoaded:
      typeof rawRecord.default_loaded === 'boolean'
        ? rawRecord.default_loaded
        : rawCorpus.defaultLoaded,
    includeInCounts:
      typeof rawRecord.include_in_counts === 'boolean'
        ? rawRecord.include_in_counts
        : rawCorpus.includeInCounts,
    includeInSearch:
      typeof rawRecord.include_in_search === 'boolean'
        ? rawRecord.include_in_search
        : rawCorpus.includeInSearch,
    meta: {
      ...(bundle.meta || {}),
      okf_version: bundle.okf_version || '',
      bundle_version: bundle.version || '',
      semantic_model: bundle.extensions?.['okf-semantic-model.v1']
    }
  };
}
