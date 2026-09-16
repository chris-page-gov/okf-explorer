import { canonical, sha256 } from '../../scripts/evaluate_context_package.mjs';

export function sealFixturePackage(pack) {
  pack.context_id = `urn:sha256:${sha256(canonical({ ...pack, context_id: undefined, budget: { ...pack.budget, used_bytes: undefined } }))}`;
  for (let ordinal = 0; ordinal < 4; ordinal += 1) pack.budget.used_bytes = Buffer.byteLength(JSON.stringify(pack), 'utf8');
  return pack;
}

/** Small assessor unit fixture; separate from the engine's study-club fixture. */
export function contextEvaluationFixture() {
  const provenance = [{ url: 'https://example.test/source', source_sha256: sha256('source'), locator: 'paragraph 1',
    captured_at: '2026-09-16T00:00:00Z', literal_sha256: sha256('Complete fictional evidence.') }];
  const record = (id, kind) => ({ id, route: id, label: id, kind, text: 'Complete fictional evidence.',
    assertion_status: 'normalized', authority: { class: 'synthetic', label: 'Unit fixture', source: 'https://example.test/source' },
    scope: 'Synthetic evaluator unit fixture only', provenance: structuredClone(provenance), rights: 'MIT', access: 'public' });
  const edge = (id, source, target) => ({ id, source, target, predicate: 'http://purl.org/dc/terms/requires', label: 'requires',
    assertion_status: 'normalized', authority: { class: 'synthetic', label: 'Unit fixture', source: 'https://example.test/source' },
    scope: 'Synthetic evaluator unit fixture only', provenance: structuredClone(provenance) });
  const requirement = { id: 'requirement/alpha', label: 'Complete the fictional chain', when_all: ['concept/alpha'],
    required: ['concept/beta', 'evidence/one'], scope: 'Synthetic evaluator unit fixture only' };
  const index = { schema: 'okf-context-index.v1', bundle: { id: 'synthetic-assessor-unit', snapshot: 'fixture-v1', source_url: 'https://example.test/index' },
    scope: 'Synthetic evaluator unit fixture only', limitations: ['Invented unit-test data.'],
    records: [record('concept/alpha', 'concept'), record('concept/beta', 'concept'), record('evidence/one', 'evidence')],
    assertions: [edge('edge/ab', 'concept/alpha', 'concept/beta'), edge('edge/be', 'concept/beta', 'evidence/one')],
    requirements: [requirement] };
  const paths = [
    { seed: 'concept/alpha', assertions: [], records: ['concept/alpha'] },
    { seed: 'concept/alpha', assertions: ['edge/ab'], records: ['concept/alpha', 'concept/beta'] },
    { seed: 'concept/alpha', assertions: ['edge/ab', 'edge/be'], records: ['concept/alpha', 'concept/beta', 'evidence/one'] }
  ];
  const packageValue = { schema: 'okf-governed-context.v1', context_id: 'unit-package', engine: 'okf-context-assembly.v1',
    question: 'Explain Alpha.', bundle: structuredClone(index.bundle),
    binding: { index_url: 'https://example.test/index', index_sha256: sha256(canonical(index)) },
    scope: index.scope, evidence_status: 'sufficient',
    resolved_concepts: [{ id: 'concept/alpha', label: 'Alpha', matched: ['Alpha'], method: 'declared-phrase', confidence: 'exact-alias' }],
    ambiguities: [], unresolved_terms: [], selected: index.records.map((row, ordinal) => ({ record: structuredClone(row), reasons: ['unit fixture'], paths: [paths[ordinal]] })),
    relationships: structuredClone(index.assertions), requirements: [{ ...requirement, status: 'supported-within-declared-scope', missing: [] }],
    missing_evidence: [], conflicts: [], limitations: index.limitations,
    budget: { max_nodes: 64, max_relationships: 128, max_depth: 6, max_bytes: 196608, used_nodes: 3, used_relationships: 2, used_bytes: 4096, reached_depth: 2, truncated: false, omissions: [] }, ai_answer: null };
  const testCase = { schema: 'okf-context-evaluation-case.v1', id: 'assessor-unit/complete-chain', title: 'Complete a synthetic chain',
    question: packageValue.question, description: 'Evaluator unit test, not a source or engine acceptance case.',
    scope: index.scope, fixture_kind: 'synthetic', limitations: ['Invented unit-test data.'], expected: {
      resolved_concepts: ['concept/alpha'], selected_concepts: ['concept/alpha', 'concept/beta'],
      sources: [{ record_id: 'evidence/one', route: 'evidence/one', source_sha256: provenance[0].source_sha256,
        locator: 'paragraph 1', literal_sha256: provenance[0].literal_sha256 }],
      assertions: index.assertions.map(({ id, source, target, predicate }) => ({ id, source, target, predicate })),
      paths: [paths[2]], evidence: ['evidence/one'], forbidden_records: ['evidence/wrong'], requirements: ['requirement/alpha'],
      issues: [], boundaries: [{ record_id: 'evidence/one', scope: index.scope, authority_class: 'synthetic', assertion_status: 'normalized' }],
      evidence_status: 'sufficient' } };
  return { index, package: sealFixturePackage(packageValue), case: testCase };
}
