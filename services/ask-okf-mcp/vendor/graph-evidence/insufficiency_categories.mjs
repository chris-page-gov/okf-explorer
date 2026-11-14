/** Editorial grouping of original diagnostics; never changes evidence status. */
export const INSUFFICIENCY_CATEGORIES = Object.freeze({
  source_coverage: 'Source coverage not established',
  retrieval: 'Lack of retrieved evidence',
  graph_connections: 'Lack of verified graph connections',
  question_scope: 'Lack of a resolved question scope',
  legal_applicability: 'Lack of reconciled legal applicability',
  source_interpretation: 'Lack of reliable source interpretation',
  specialist_review: 'Lack of specialist review',
  assembly_delivery: 'Loss during assembly or delivery',
  access: 'Lack of permitted source access',
  unclassified: 'Reason awaiting classification',
});
const rules = {
  source_coverage: ['source_absent', 'unresolved_reference', 'evidence_closure_unverified'],
  retrieval: ['retrieval_candidate_budget', 'retrieval_resource_budget', 'retrieval_index_budget',
    'retrieval_query_budget', 'retrieval_alias_budget', 'retrieval_alias_query_budget', 'retrieval_ranking_budget',
    'referenced_record_budget', 'referenced_relationship_budget', 'referenced_depth_budget', 'retrieval_path_priority_budget'],
  graph_connections: ['missing_required_evidence', 'no_evidence_requirements', 'uncovered_resolved_concept', 'reference_target_review',
    'unresolved_task', 'missing_scope', 'unsupported_predicate', 'missing_required_path', 'retrieval_scope_mismatch'],
  question_scope: ['unresolved_terms', 'ambiguous_concepts', 'question_scope_unresolved', 'resolution_budget'],
  legal_applicability: ['legal_version_unreconciled', 'applicability_unresolved'],
  source_interpretation: ['unresolved_unit_boundary', 'unit_fragment_integrity', 'evidence_digest_mismatch', 'declared_conflict'],
  specialist_review: ['independent_review_pending'],
  assembly_delivery: ['byte_budget', 'node_budget', 'relationship_budget', 'relationship_byte_budget', 'depth_budget',
    'metadata_budget', 'delivery_incomplete', 'package_incomplete'],
  access: ['restricted_record', 'restricted_evidence'],
};
const categoryFor = new Map(Object.entries(rules).flatMap(([category, codes]) => codes.map(code => [code, category])));

/** Missing from a working index does not prove absence from the source corpus. */
export function categoriseInsufficiency(issues, { availableRecordIds } = {}) {
  if (!Array.isArray(issues)) throw new Error('Insufficiency issues must be an array');
  const inventory = availableRecordIds === undefined ? null : new Set(availableRecordIds);
  const categories = new Map();
  for (const issue of issues) {
    if (!issue || typeof issue.code !== 'string' || typeof issue.message !== 'string') throw new Error('Invalid insufficiency issue');
    let category = categoryFor.get(issue.code) ?? 'unclassified';
    let basis = 'Original diagnostic code';
    if (['missing_record', 'missing_dependency', 'referenced_record_missing'].includes(issue.code)) {
      const ids = (issue.ids ?? []).filter(id => typeof id === 'string' && !id.includes('/obligation/'));
      if (inventory && ids.length) {
        category = ids.every(id => inventory.has(id)) ? 'retrieval' : 'source_coverage';
        basis = 'Compared with the declared record inventory; absence is scoped to that inventory';
      } else {
        category = 'graph_connections';
        basis = 'Missing from the working graph; source-corpus absence has not been established';
      }
    }
    if (!categories.has(category)) categories.set(category, { id: category, label: INSUFFICIENCY_CATEGORIES[category], reasons: [] });
    categories.get(category).reasons.push({ ...structuredClone(issue), classification_basis: basis });
  }
  return [...categories.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
