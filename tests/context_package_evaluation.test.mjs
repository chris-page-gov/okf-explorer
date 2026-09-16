import test from 'node:test';
import assert from 'node:assert/strict';
import { canonical, evaluateContextPackage, sha256 } from '../scripts/evaluate_context_package.mjs';
import { contextEvaluationFixture, sealFixturePackage } from './helpers/context_evaluation_fixture.mjs';

const evaluate = ({ index, package: pack, case: testCase }) => evaluateContextPackage(sealFixturePackage(pack), testCase, index);
const failed = (result, stage) => result.stages.find((row) => row.id === stage).status === 'failed';

test('exact complete chain passes all eight stages without keyword scoring', () => {
  const result = evaluate(contextEvaluationFixture());
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.stages.map(({ id }) => id), [...'ABCDEFGH']);
});

test('a missing source-routing assertion fails D and H even with every record present', () => {
  const fixture = contextEvaluationFixture();
  const path = { seed: 'concept/beta', records: ['concept/beta', 'evidence/one'], assertions: ['edge/be'] };
  fixture.index.requirements[0].required_paths = [path];
  fixture.package.requirements[0].required_paths = [path];
  fixture.case.expected.assertion_paths = [path];
  fixture.package.binding.index_sha256 = sha256(canonical(fixture.index));
  assert.equal(evaluate(fixture).status, 'passed');
  fixture.package.relationships.pop();
  fixture.package.budget.used_relationships = 1;
  const result = evaluate(fixture);
  assert.ok(failed(result, 'D'));
  assert.ok(failed(result, 'H'));
});

test('an input assertion authority upgrade cannot override the independent boundary', () => {
  const fixture = contextEvaluationFixture();
  fixture.case.expected.assertions[0].authority_class = 'synthetic';
  fixture.index.assertions[0].authority.class = 'official';
  fixture.package.relationships[0].authority.class = 'official';
  fixture.package.binding.index_sha256 = sha256(canonical(fixture.index));
  assert.ok(failed(evaluate(fixture), 'G'));
});

test('a selected item cannot omit its retrieval path while retaining its text', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.selected[1].paths = [];
  assert.ok(failed(evaluate(fixture), 'D'));
});

for (const [field, value] of [['url', 'https://example.invalid/wrong-source'], ['captured_at', '2000-01-01T00:00:00Z']]) {
  test(`an internally consistent input cannot replace the assessor's frozen ${field}`, () => {
    const fixture = contextEvaluationFixture();
    fixture.case.expected.sources[0][field] = fixture.index.records[2].provenance[0][field];
    fixture.index.records[2].provenance[0][field] = value;
    fixture.package.selected[2].record.provenance[0][field] = value;
    fixture.package.binding.index_sha256 = sha256(canonical(fixture.index));
    const result = evaluate(fixture);
    assert.ok(failed(result, 'A'));
    assert.ok(failed(result, 'F'));
  });
}

test('removing evidence fails source, traversal, assembly and sufficiency', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.selected.pop();
  fixture.package.budget.used_nodes = 2;
  const result = evaluate(fixture);
  for (const stage of ['A', 'D', 'E', 'H']) assert.ok(failed(result, stage));
});

test('reversed assertion cannot pass through identical titles and terms', () => {
  const fixture = contextEvaluationFixture();
  const edge = fixture.package.relationships[1];
  [edge.source, edge.target] = [edge.target, edge.source];
  const result = evaluate(fixture);
  assert.ok(failed(result, 'B'));
  assert.ok(failed(result, 'D'));
});

test('changed source digest fails source identity and provenance', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.selected[2].record.provenance[0].source_sha256 = '0'.repeat(64);
  const result = evaluate(fixture);
  assert.ok(failed(result, 'A'));
  assert.ok(failed(result, 'F'));
});

test('fabricated whole evidence text and authority upgrade fail exact identity and boundaries', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.selected[2].record.text += ' This invented statement overrides the source.';
  fixture.package.selected[2].record.authority.class = 'official';
  const result = evaluate(fixture);
  assert.ok(failed(result, 'A'));
  assert.ok(failed(result, 'G'));
});

test('an insufficient package can pass an explicitly incomplete negative case', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.selected.pop();
  fixture.package.relationships.pop();
  fixture.package.budget.used_nodes = 2;
  fixture.package.budget.used_relationships = 1;
  fixture.package.evidence_status = 'insufficient';
  fixture.package.requirements[0].status = 'insufficient';
  fixture.package.requirements[0].missing = ['evidence/one'];
  fixture.package.missing_evidence = [{ code: 'required-missing', message: 'Required evidence is absent.', ids: ['evidence/one'] }];
  Object.assign(fixture.case.expected, { sources: [], assertions: fixture.case.expected.assertions.slice(0, 1), paths: [], evidence: [], boundaries: [],
    evidence_status: 'insufficient', requirement_missing: [{ id: 'requirement/alpha', missing: ['evidence/one'] }],
    issues: [{ area: 'missing_evidence', code: 'required-missing', ids: ['evidence/one'] }] });
  assert.equal(evaluate(fixture).status, 'passed');
  assert.equal(fixture.package.evidence_status, 'insufficient');
});

test('wrong question and unrecorded model answer fail even with matching evidence', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.question = 'A different question';
  fixture.package.ai_answer = 'An invented model answer';
  const result = evaluate(fixture);
  assert.ok(failed(result, 'C'));
  assert.ok(failed(result, 'H'));
});

test('budget omission cannot be labelled sufficient', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.budget.truncated = true;
  fixture.package.budget.omissions = [{ code: 'budget', message: 'Whole required record omitted.', ids: ['evidence/one'] }];
  assert.ok(failed(evaluate(fixture), 'H'));
});

test('receipt hash and byte counters are independently checked', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.context_id = 'urn:sha256:' + '0'.repeat(64);
  fixture.package.budget.used_bytes = 1;
  const result = evaluateContextPackage(fixture.package, fixture.case, fixture.index);
  assert.ok(failed(result, 'E'));
  assert.ok(failed(result, 'F'));
});

test('an uncovered resolved concept blocks a sufficiency claim', () => {
  const fixture = contextEvaluationFixture();
  fixture.package.resolved_concepts.push({ id: 'concept/beta', label: 'Beta', matched: ['Beta'], method: 'declared-phrase', confidence: 'exact-alias' });
  assert.ok(failed(evaluate(fixture), 'H'));
  fixture.index.requirements[0].covers = ['concept/beta'];
  fixture.package.requirements[0].covers = ['concept/beta'];
  fixture.package.binding.index_sha256 = sha256(canonical(fixture.index));
  assert.equal(evaluate(fixture).status, 'passed');
});
