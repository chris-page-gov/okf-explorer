import test from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_SCHEMA, validator } from '../src/contracts.ts';
import { MANIFEST_INPUT_SCHEMA, EVIDENCE_INPUT_SCHEMA } from '../src/deliveryContracts.ts';

const contracts = [
  ['ask_okf', INPUT_SCHEMA, {}],
  ['ask_okf_manifest', MANIFEST_INPUT_SCHEMA, {}],
  ['read_okf_evidence', EVIDENCE_INPUT_SCHEMA, {
    context_id: `urn:sha256:${'a'.repeat(64)}`, section: 'package'
  }]
] as const;

// Some clients apply a whole-string regex match to a JSON Schema pattern.
// Compare the actual match extent; a bare `$` can also precede a final newline.
function wholeStringMatch(pattern: string, value: string) {
  const match = new RegExp(pattern, 'u').exec(value);
  return match !== null && match.index === 0 && match[0] === value;
}

for (const [name, schema, extra] of contracts) {
  test(`${name} accepts ordinary questions with search and whole-string pattern matching`, () => {
    const check = validator.getValidator(schema);
    const pattern = schema.properties.question.pattern;
    const values = [
      'x', 'xylophonicquasarteleportation',
      'What happens to Pension Credit when a claimant moves into a care home?',
      '  Explain the effect on JSA and Income Support.  ',
      'Comment évolue la pension ? 日本語の質問 🧑🏽‍🦽',
      'First line.\nSecond line.\r\n',
      '\n\tA question\u2028with another line\u2029',
      'é'.repeat(2000), 'x' + '\n'.repeat(1999)
    ];
    for (const question of values) {
      assert.equal(new RegExp(pattern, 'u').test(question), true, JSON.stringify(question));
      assert.equal(wholeStringMatch(pattern, question), true, JSON.stringify(question));
      assert.equal(check({ bundle: 'okf-dwp', question, ...extra }).valid, true);
    }
    // This reproduces the incompatible interpretation of the previous schema.
    assert.equal(wholeStringMatch('\\S', values[1]), false);
  });

  test(`${name} keeps the non-blank and 2000-character constraints`, () => {
    const check = validator.getValidator(schema);
    const pattern = schema.properties.question.pattern;
    assert.equal(schema.properties.question.minLength, 1);
    assert.equal(schema.properties.question.maxLength, 2000);
    for (const question of ['', ' ', '\t\n\r', '\u00a0\u2003\u2028\u2029\ufeff']) {
      assert.equal(new RegExp(pattern, 'u').test(question), false);
      assert.equal(wholeStringMatch(pattern, question), false);
      assert.equal(check({ bundle: 'okf-dwp', question, ...extra }).valid, false);
    }
    for (const question of ['x'.repeat(2001), 'é'.repeat(2001), 'x' + '\n'.repeat(2000)]) {
      assert.equal(check({ bundle: 'okf-dwp', question, ...extra }).valid, false);
    }
    for (const question of [null, 1, [], {}]) {
      assert.equal(check({ bundle: 'okf-dwp', question, ...extra }).valid, false);
    }
  });
}

test('anchoring preserves the old non-blank accepted set for mixed whitespace and Unicode', () => {
  const pattern = INPUT_SCHEMA.properties.question.pattern;
  const alphabet = ['x', 'é', '漢', '🦽', ' ', '\t', '\n', '\r', '\u00a0', '\u2028'];
  let values = [''];
  for (let length = 0; length <= 3; length++) {
    for (const value of values) {
      const expected = /\S/u.test(value);
      assert.equal(new RegExp(pattern, 'u').test(value), expected);
      assert.equal(wholeStringMatch(pattern, value), expected);
    }
    values = values.flatMap(prefix => alphabet.map(letter => prefix + letter));
  }
});
