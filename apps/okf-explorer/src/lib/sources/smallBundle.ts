import type { NormalizedCorpus, OkfBundle, OkfNode, OkfRelationship } from '$lib/types';

function titleForNode(id: string, node: OkfNode): string {
  return String(node.title || node.name || node.label || id);
}

function normalizeNode(id: string, node: OkfNode): OkfNode {
  return {
    ...node,
    id,
    title: titleForNode(id, node),
    type: node.type || 'Node',
    section: node.section || 'root'
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

export function normalizeSmallBundle(bundle: OkfBundle, preferredCorpus = ''): NormalizedCorpus {
  const corpora = bundle.corpora || {};
  const corpusId = preferredCorpus && corpora[preferredCorpus] ? preferredCorpus : Object.keys(corpora)[0];
  const rawCorpus = (corpusId ? corpora[corpusId] : bundle) as Partial<NormalizedCorpus> & OkfBundle;
  const nodes = Object.fromEntries(
    Object.entries(rawCorpus.nodes || bundle.nodes || {}).map(([id, node]) => [id, normalizeNode(id, node)])
  );
  return {
    id: corpusId || 'default',
    title: String(rawCorpus.title || bundle.meta?.title || bundle.title || 'OKF bundle'),
    description: String(rawCorpus.description || bundle.meta?.description || ''),
    nodes,
    relationships: normalizeRelationships(rawCorpus.relationships || bundle.relationships),
    meta: bundle.meta
  };
}
