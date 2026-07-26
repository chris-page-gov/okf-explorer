import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRuntimeAcceptanceProjections,
  RUNTIME_GATE_IDS
} from './runtime_acceptance_contract.mjs';

const SHA = 'a'.repeat(64);
const REQUIRED_REPRODUCTION_ASSERTIONS = [
  { pointer: '/status', equals: 'passed' },
  { pointer: '/runtime/status', equals: 'passed' },
  { pointer: '/runtime/summary/all_passed', equals: true },
  { pointer: '/runtime/summary/checks_failed', equals: 0 },
  {
    pointer: '/runtime/summary/checks_passed',
    equals_pointer: '/runtime/summary/checks_total'
  },
  { pointer: '/cross_engine/status', equals: 'passed' },
  { pointer: '/accessibility/status', equals: 'passed' },
  { pointer: '/performance/status', equals: 'passed' },
  { pointer: '/integrity/status', equals: 'passed' }
];

function pointer(document, jsonPointer) {
  return jsonPointer
    .split('/')
    .slice(1)
    .reduce((value, token) => value[token.replaceAll('~1', '/').replaceAll('~0', '~')], document);
}

function passingEvidence() {
  const gates = Object.fromEntries(RUNTIME_GATE_IDS.map((id) => [id, { status: 'passed' }]));
  gates.cross_browser = {
    status: 'passed',
    required: ['chrome', 'firefox', 'webkit'],
    completed: ['chrome', 'firefox', 'webkit']
  };
  return {
    gates,
    failures: [],
    browsers: [
      {
        browser: 'chrome',
        status: 'passed',
        accessibility: { serious_or_critical: [] }
      },
      {
        browser: 'firefox',
        status: 'passed',
        accessibility: { serious_or_critical: [] }
      },
      {
        browser: 'webkit',
        status: 'passed',
        accessibility: { serious_or_critical: [] }
      }
    ],
    inputs: {
      federation_descriptor: {
        path: 'whole-law/okf-explorer.json',
        bytes: 100,
        sha256: SHA
      },
      legislation_descriptor: {
        path: 'okf-explorer.json',
        bytes: 100,
        sha256: SHA
      },
      explorer_build: {
        index_sha256: SHA,
        files: 5,
        sha256: SHA
      }
    },
    outputs: {
      screenshots: [
        {
          path: 'output/playwright/legislation-runtime-graph-chrome.png',
          bytes: 100,
          sha256: SHA
        },
        {
          path: 'output/playwright/legislation-runtime-chrome.png',
          bytes: 100,
          sha256: SHA
        }
      ]
    }
  };
}

test('emits every release reproduction pointer with its required value', () => {
  const receipt = buildRuntimeAcceptanceProjections(passingEvidence());

  for (const assertion of REQUIRED_REPRODUCTION_ASSERTIONS) {
    const actual = pointer(receipt, assertion.pointer);
    if ('equals_pointer' in assertion) {
      assert.equal(actual, pointer(receipt, assertion.equals_pointer));
    } else {
      assert.equal(actual, assertion.equals);
    }
  }
  assert.equal(receipt.runtime.summary.checks_total, RUNTIME_GATE_IDS.length);
  assert.deepEqual(
    receipt.cross_engine,
    {
      status: 'passed',
      required: ['chrome', 'firefox', 'webkit'],
      completed: ['chrome', 'firefox', 'webkit']
    },
    'the projection preserves the detailed engine evidence'
  );
});

test('fails closed and counts a missing or failed runtime gate', () => {
  const evidence = passingEvidence();
  evidence.gates.warm_search.status = 'failed';
  delete evidence.gates.keyboard;

  const receipt = buildRuntimeAcceptanceProjections(evidence);

  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.runtime.status, 'failed');
  assert.equal(receipt.runtime.summary.all_passed, false);
  assert.equal(receipt.runtime.summary.checks_failed, 2);
  assert.equal(receipt.runtime.summary.checks_passed, RUNTIME_GATE_IDS.length - 2);
  assert.equal(receipt.performance.status, 'failed');
});

test('does not report integrity when a current Chrome screenshot is absent', () => {
  const evidence = passingEvidence();
  evidence.outputs.screenshots.pop();

  const receipt = buildRuntimeAcceptanceProjections(evidence);

  assert.equal(receipt.runtime.status, 'passed');
  assert.equal(receipt.integrity.status, 'failed');
  assert.equal(receipt.integrity.summary.checks_failed, 1);
  assert.equal(receipt.status, 'failed');
});

test('does not treat stale screenshots as current evidence after Chrome fails', () => {
  const evidence = passingEvidence();
  evidence.browsers[0].status = 'failed';

  const receipt = buildRuntimeAcceptanceProjections(evidence);

  assert.equal(receipt.integrity.status, 'failed');
  assert.equal(
    receipt.integrity.checks.filter((check) => check.id.startsWith('screenshot:') && check.status === 'failed').length,
    2
  );
  assert.equal(receipt.status, 'failed');
});
