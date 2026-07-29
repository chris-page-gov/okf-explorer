import assert from 'node:assert/strict';
import test from 'node:test';

import {
  descriptorIdentity,
  identityErrors,
  safeRelativePath,
  validateJourneyManifest
} from './external_bundle_acceptance_contract.mjs';

const valid = {
  schema: 'okf-explorer-journeys.v1',
  bundle_descriptor: 'okf-explorer.json',
  expected_identity: {
    schema: 'okf-explorer-bundle.v0',
    id: 'urn:example',
    version: '1.0.0',
    snapshot: 'snapshot-1'
  },
  journeys: [
    {
      id: 'load-and-search',
      actions: [
        { type: 'goto', hash: '#overview', params: { view: 'reader' } },
        { type: 'fill', selector: 'input[type=search]', value: 'leasehold' },
        { type: 'press', selector: 'input[type=search]', key: 'Enter' }
      ],
      assertions: [
        { type: 'visible', selector: 'main' },
        { type: 'requested', includes: '/bundle/okf-explorer.json' },
        { type: 'console_clean' }
      ]
    }
  ]
};

test('accepts a bounded declarative journey manifest', () => {
  assert.equal(validateJourneyManifest(structuredClone(valid)).schema, valid.schema);
});

test('rejects unsafe descriptor paths and unsupported actions', () => {
  const unsafe = structuredClone(valid);
  unsafe.bundle_descriptor = '../outside.json';
  assert.throws(() => validateJourneyManifest(unsafe), /unsafe bundle_descriptor/);
  const unsupported = structuredClone(valid);
  unsupported.journeys[0].actions[0].type = 'evaluate-javascript';
  assert.throws(() => validateJourneyManifest(unsupported), /unsupported/);
});

test('rejects duplicate journey ids', () => {
  const duplicate = structuredClone(valid);
  duplicate.journeys.push(structuredClone(duplicate.journeys[0]));
  assert.throws(() => validateJourneyManifest(duplicate), /duplicate journey id/);
});

test('normalizes common descriptor identity fields without inventing them', () => {
  assert.deepEqual(
    descriptorIdentity({
      schema: 'okf-explorer-large-corpus.v1',
      bundle_id: 'urn:example',
      version: '0.2.0',
      snapshot_id: 'snapshot-1'
    }),
    {
      schema: 'okf-explorer-large-corpus.v1',
      id: 'urn:example',
      version: '0.2.0',
      snapshot: 'snapshot-1'
    }
  );
  assert.equal(safeRelativePath('data/records.json'), 'data/records.json');
  assert.deepEqual(
    identityErrors(
      { schema: 'okf-explorer-bundle.v0', id: 'wrong', version: '1.0.0', snapshot: 'snapshot-1' },
      valid.expected_identity
    ),
    ['descriptor identity id was "wrong", expected "urn:example"']
  );
});
