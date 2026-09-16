/** Assessor-side checks: expected requirements never enter the assembler. */
import { createHash } from 'node:crypto';

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const equal = (left, right) => canonical(left) === canonical(right);
const stages = [
  ['A', 'source'], ['B', 'semantic'], ['C', 'retrieval'], ['D', 'traversal'],
  ['E', 'assembly'], ['F', 'provenance'], ['G', 'boundaries'], ['H', 'answerability']
];

/** Evaluate an observed package against independent exact-identity requirements. */
export function evaluateContextPackage(packageValue, testCase, index, binding = {}) {
  const checks = Object.fromEntries(stages.map(([id, label]) => [id, { id, label, checks: [] }]));
  const check = (stage, id, passed, expected, actual) => checks[stage].checks.push({
    id, status: passed ? 'passed' : 'failed', expected, actual
  });
  const pack = packageValue;
  const wanted = testCase.expected;
  const selectedRows = pack.selected || [];
  const selected = new Map(selectedRows.map(({ record }) => [record.id, record]));
  const relations = new Map((pack.relationships || []).map((row) => [row.id, row]));
  const sourceRecords = new Map(index.records.map((row) => [row.id, row]));
  const sourceAssertions = new Map(index.assertions.map((row) => [row.id, row]));
  const resolutions = new Set((pack.resolved_concepts || []).map((row) => row.id));
  const requirements = new Map((pack.requirements || []).map((row) => [row.id, row]));
  const sourceRequirements = new Map(index.requirements.map((row) => [row.id, row]));
  const sourceIdentityMatches = (row, required) => row.source_sha256 === required.source_sha256
    && row.locator === required.locator
    && ['literal_sha256', 'url', 'captured_at', 'source_date', 'source_date_kind']
      .every((key) => required[key] === undefined || row[key] === required[key]);

  check('A', 'same-bundle-identity', equal(pack.bundle, index.bundle), index.bundle, pack.bundle);
  check('A', 'unique-selected-records', selected.size === selectedRows.length, selectedRows.length, selected.size);
  for (const [id, record] of selected) {
    check('A', `source-record:${id}`, equal(record, sourceRecords.get(id)), 'exact input record', sourceRecords.has(id) ? 'compared with index' : 'missing from index');
  }
  for (const required of wanted.sources) {
    const record = selected.get(required.record_id);
    const provenance = record?.provenance?.find((row) => sourceIdentityMatches(row, required));
    check('A', `required-source:${required.record_id}:${required.locator}`,
      record?.route === required.route && Boolean(provenance), required,
      record ? { route: record.route, provenance: record.provenance } : null);
  }

  for (const id of wanted.selected_concepts) {
    check('B', `selected-concept:${id}`, selected.get(id)?.kind === 'concept', 'concept', selected.get(id)?.kind ?? null);
  }
  check('B', 'unique-assertions', relations.size === (pack.relationships || []).length,
    (pack.relationships || []).length, relations.size);
  for (const [id, assertion] of relations) {
    check('B', `input-assertion:${id}`, equal(assertion, sourceAssertions.get(id)), 'exact input assertion', sourceAssertions.has(id) ? 'compared with index' : 'missing from index');
  }
  for (const required of wanted.assertions) {
    const matches = [...relations.values()].filter((row) => (!required.id || row.id === required.id)
      && row.source === required.source && row.target === required.target && row.predicate === required.predicate);
    check('B', `required-assertion:${required.id || required.source + '->' + required.target}`,
      matches.length > 0, required, matches.map((row) => row.id));
    for (const field of ['assertion_status', 'authority_class', 'scope']) {
      if (required[field] === undefined) continue;
      const value = (row) => field === 'authority_class' ? row.authority.class : row[field];
      check('G', `assertion-boundary:${required.id || required.source + '->' + required.target}:${field}`,
        matches.length > 0 && matches.every((row) => value(row) === required[field]),
        required[field], matches.map(value));
    }
  }

  check('C', 'actual-question', pack.question === testCase.question, testCase.question, pack.question);
  for (const id of wanted.resolved_concepts) {
    check('C', `resolved-concept:${id}`, resolutions.has(id), id, [...resolutions]);
  }
  for (const phrase of wanted.ambiguity_phrases || []) {
    check('C', `ambiguous:${phrase}`, pack.ambiguities.some((row) => row.phrase === phrase), phrase, pack.ambiguities);
  }
  for (const term of wanted.unresolved_terms || []) {
    check('C', `unresolved:${term}`, pack.unresolved_terms.includes(term), term, pack.unresolved_terms);
  }

  const allPaths = selectedRows.flatMap((row) => row.paths || []);
  const includedChain = (path) => path.records.length === path.assertions.length + 1
    && path.records[0] === path.seed && path.records.every((id) => selected.has(id))
    && path.assertions.every((id, ordinal) => {
      const edge = relations.get(id);
      return edge?.source === path.records[ordinal] && edge?.target === path.records[ordinal + 1];
    });
  // Required source-routing chains can start at an evidence page already
  // reached from a resolved seed. They must exist in the actual retained graph.
  for (const path of wanted.assertion_paths || []) {
    check('D', `required-directed-chain:${path.seed}:${path.records.at(-1)}`,
      includedChain(path), path, path.assertions.map((id) => relations.get(id) || null));
  }
  for (const required of wanted.paths) {
    check('D', `required-path:${required.seed}:${required.records.at(-1)}`,
      allPaths.some((path) => equal(path, required)), required,
      allPaths.filter((path) => path.seed === required.seed));
  }
  for (const [rowIndex, row] of selectedRows.entries()) {
    check('D', `selection-has-path:${row.record.id}`, Array.isArray(row.paths) && row.paths.length > 0,
      'at least one retained path from a resolved seed', row.paths?.length || 0);
    for (const [pathIndex, path] of (row.paths || []).entries()) {
      const structural = path.records.length === path.assertions.length + 1
        && path.records[0] === path.seed && path.records.at(-1) === row.record.id
        && resolutions.has(path.seed);
      const directed = structural && path.assertions.every((id, ordinal) => {
        const edge = relations.get(id);
        return edge?.source === path.records[ordinal] && edge?.target === path.records[ordinal + 1];
      });
      check('D', `valid-directed-path:${rowIndex}:${pathIndex}`, directed,
        'resolved seed and exact directed retained assertions to selected record', path);
    }
  }

  for (const id of wanted.evidence) {
    check('E', `required-evidence:${id}`, selected.get(id)?.kind === 'evidence', 'whole evidence record', selected.get(id)?.kind ?? null);
  }
  check('E', 'selected-count', pack.budget.used_nodes === selectedRows.length, selectedRows.length, pack.budget.used_nodes);
  check('E', 'relationship-count', pack.budget.used_relationships === relations.size, relations.size, pack.budget.used_relationships);
  const actualBytes = Buffer.byteLength(JSON.stringify(pack), 'utf8');
  check('E', 'exact-package-byte-count', pack.budget.used_bytes === actualBytes, actualBytes, pack.budget.used_bytes);
  for (const [used, maximum] of [['used_nodes', 'max_nodes'], ['used_relationships', 'max_relationships'], ['used_bytes', 'max_bytes'], ['reached_depth', 'max_depth']]) {
    check('E', `bounded:${used}`, pack.budget[used] <= pack.budget[maximum], { maximum: pack.budget[maximum] }, pack.budget[used]);
  }
  if (wanted.budget_truncated !== undefined) {
    check('E', 'budget-truncation', pack.budget.truncated === wanted.budget_truncated, wanted.budget_truncated, pack.budget.truncated);
  }

  const bindingValid = /^[a-f0-9]{64}$/.test(pack.binding?.index_sha256 || '') && typeof pack.binding?.index_url === 'string';
  check('F', 'index-binding-present', bindingValid, 'SHA-256 and index locator', pack.binding);
  const expectedIndexHash = binding.index_sha256 || sha256(canonical(index));
  check('F', 'index-binding-exact', pack.binding?.index_sha256 === expectedIndexHash, expectedIndexHash, pack.binding?.index_sha256);
  const expectedContextId = `urn:sha256:${sha256(canonical({ ...pack, context_id: undefined, budget: { ...pack.budget, used_bytes: undefined } }))}`;
  check('F', 'context-identity-recomputed', pack.context_id === expectedContextId, expectedContextId, pack.context_id);
  for (const required of wanted.sources) {
    const record = selected.get(required.record_id);
    const matching = record?.provenance?.filter((row) => sourceIdentityMatches(row, required)) || [];
    const complete = matching.some((row) => /^https?:\/\//.test(row.url)
      && /^[a-f0-9]{64}$/.test(row.source_sha256) && row.locator.length > 0
      && row.captured_at.length > 0 && !Number.isNaN(Date.parse(row.captured_at)));
    check('F', `complete-source-provenance:${required.record_id}:${required.locator}`, complete,
      'source URL, digest, locator and capture time', matching);
    const actualLiteral = record ? sha256(Buffer.from(record.text, 'utf8')) : null;
    check('F', `exact-source-passage:${required.record_id}`, actualLiteral === required.literal_sha256,
      required.literal_sha256, actualLiteral);
  }

  for (const id of wanted.forbidden_records) {
    check('G', `excluded:${id}`, !selected.has(id), 'not selected', selected.has(id));
  }
  check('G', 'declared-scope-retained', pack.scope === index.scope || pack.missing_evidence.some((row) => row.code === 'metadata_budget'),
    index.scope, pack.scope);
  check('G', 'declared-limitations-retained', index.limitations.every((value) => pack.limitations.includes(value))
    || pack.missing_evidence.some((row) => row.code === 'metadata_budget'), index.limitations, pack.limitations);
  for (const [id, record] of selected) {
    check('G', `public-access:${id}`, record.access === 'public', 'public', record.access);
  }
  for (const boundary of wanted.boundaries) {
    const record = selected.get(boundary.record_id);
    for (const [field, value] of Object.entries(boundary)) {
      if (field === 'record_id') continue;
      const actual = field === 'authority_class' ? record?.authority?.class : record?.[field];
      check('G', `boundary:${boundary.record_id}:${field}`, equal(actual, value), value, actual ?? null);
    }
  }
  for (const required of wanted.issues) {
    const rows = required.area === 'omissions' ? pack.budget.omissions : pack[required.area];
    const actual = rows.filter((row) => row.code === required.code && required.ids.every((id) => row.ids.includes(id)));
    check('G', `issue:${required.area}:${required.code}:${required.ids.join(',')}`, actual.length > 0, required, actual);
  }

  check('H', 'evidence-status', pack.evidence_status === wanted.evidence_status, wanted.evidence_status, pack.evidence_status);
  check('H', 'no-model-answer', pack.ai_answer === null, null, pack.ai_answer);
  for (const id of wanted.requirements) {
    check('H', `requirement:${id}`, requirements.has(id), 'requirement assessed', requirements.get(id) ?? null);
  }
  for (const [id, requirement] of requirements) {
    const { status: _status, missing: _missing, ...declaration } = requirement;
    check('H', `requirement-declaration:${id}`, equal(declaration, sourceRequirements.get(id)),
      sourceRequirements.get(id) ?? null, declaration);
  }
  for (const required of wanted.requirement_missing || []) {
    const actual = requirements.get(required.id);
    check('H', `missing-requirement:${required.id}`, actual?.status === 'insufficient'
      && required.missing.every((id) => actual.missing.includes(id)), required, actual ?? null);
  }
  if (pack.evidence_status === 'sufficient') {
    const covered = new Set([...requirements.values()].flatMap((row) => [...row.when_all, ...(row.covers || [])]));
    check('H', 'sufficiency-covers-all-resolved-concepts', [...resolutions].every((id) => covered.has(id)),
      [...resolutions], [...covered]);
    check('H', 'sufficiency-has-declared-requirement', requirements.size > 0, 'at least one applicable requirement', requirements.size);
    check('H', 'sufficiency-retains-required-evidence', [...requirements.values()].every((row) => row.status === 'supported-within-declared-scope'
      && row.missing.length === 0 && row.required.every((id) => selected.has(id))), 'all declared required records retained', [...requirements.values()]);
    check('H', 'sufficiency-retains-required-paths', [...requirements.values()].every((row) => (row.required_paths || []).every(includedChain)),
      'all declared exact directed chains retained', [...requirements.values()].flatMap((row) => row.required_paths || []));
    check('H', 'sufficiency-without-omissions-or-conflicts', !pack.budget.truncated
      && pack.missing_evidence.length === 0 && pack.conflicts.length === 0 && pack.ambiguities.length === 0,
    'no omitted, missing, conflicting or ambiguous requirements', {
      truncated: pack.budget.truncated, missing: pack.missing_evidence, conflicts: pack.conflicts, ambiguities: pack.ambiguities
    });
  }

  const resultStages = stages.map(([id]) => ({ ...checks[id],
    status: checks[id].checks.every((row) => row.status === 'passed') ? 'passed' : 'failed' }));
  return {
    schema: 'okf-context-evaluation-result.v1', case_id: testCase.id,
    question: testCase.question, context_id: pack.context_id,
    status: resultStages.every((row) => row.status === 'passed') ? 'passed' : 'failed',
    execution_kind: 'deterministic exact-identity, dependency and boundary checks; no model answer generation',
    case_sha256: sha256(canonical(testCase)), package_sha256: sha256(canonical(pack)),
    stages: resultStages,
    limitations: ['A passing case establishes its declared structural evidence requirements, not specialist acceptance or legal correctness.']
  };
}
