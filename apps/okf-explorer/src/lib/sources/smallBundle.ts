import type {
  NormalizedCorpus,
  OkfBundle,
  OkfNode,
  OkfRelationship,
  RelationshipAssertionScope
} from '$lib/types';

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

function assertionScope(value: unknown): RelationshipAssertionScope | undefined {
  return value === 'real-world' || value === 'synthetic-fixture' ? value : undefined;
}

export function normalizeSmallBundle(bundle: OkfBundle, preferredCorpus = ''): NormalizedCorpus {
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
