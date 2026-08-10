import assert from 'node:assert/strict';
import { lstat, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  BUILD_MANIFEST_FILENAME,
  BUILD_MANIFEST_SCHEMA,
  BUILD_TREE_ALGORITHM,
  canonicalBuildTreeBytes,
  renderBuildManifest,
  sha256
} from './app_build_manifest.mjs';
import {
  buildFrozenReleaseBinding,
  buildRuntimeAcceptanceProjections,
  publishWriteOnce,
  RUNTIME_GATE_IDS
} from './runtime_acceptance_contract.mjs';

const SHA = 'a'.repeat(64);
const GIT_SHA = 'b'.repeat(40);
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

function passingExplorerBuild() {
  const sourceMaterials = [
    {
      path: '404.html',
      bytes: 80,
      sha256: SHA
    },
    {
      path: 'index.html',
      bytes: 100,
      sha256: SHA
    }
  ];
  const materials = sourceMaterials.map((material) => ({
    ...material,
    path: `explorer-build/${material.path}`
  }));
  const treeSha256 = sha256(canonicalBuildTreeBytes(sourceMaterials));
  const manifestBytes = renderBuildManifest({
    schema: BUILD_MANIFEST_SCHEMA,
    algorithm: BUILD_TREE_ALGORITHM,
    file_count: sourceMaterials.length,
    tree_sha256: treeSha256,
    materials: sourceMaterials
  });
  return {
    root: 'explorer-build',
    manifest: {
      path: `explorer-build/${BUILD_MANIFEST_FILENAME}`,
      bytes: manifestBytes.length,
      sha256: sha256(manifestBytes)
    },
    index: { ...materials[1] },
    files: materials.length,
    sha256: treeSha256,
    algorithm: BUILD_TREE_ALGORITHM,
    materials
  };
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
      bundle_root: 'bundle',
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
      explorer_build: passingExplorerBuild()
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
  assert.equal(receipt.integrity.summary.checks_failed, 2);
  assert.equal(receipt.status, 'failed');
});

test('rejects non-canonical or incomplete material identities', () => {
  const evidence = passingEvidence();
  evidence.inputs.bundle_root = '../okf-uk-legislation/bundle';
  evidence.inputs.federation_descriptor.path = '../whole-law/okf-explorer.json';
  delete evidence.inputs.explorer_build.index.bytes;
  evidence.outputs.screenshots[0].extra = 'self-attested';

  const receipt = buildRuntimeAcceptanceProjections(evidence);
  const failed = receipt.integrity.checks
    .filter((check) => check.status === 'failed')
    .map((check) => check.id);

  assert.deepEqual(failed, [
    'federation_descriptor',
    'legislation_descriptor',
    'explorer_build_index',
    'screenshot:output/playwright/legislation-runtime-graph-chrome.png'
  ]);
  assert.equal(receipt.status, 'failed');
});

test('retains mutable local-v1 provenance without relaxing release evidence', () => {
  const evidence = passingEvidence();
  evidence.inputs.bundle_root = '../okf-uk-legislation/bundle';

  const localReceipt = buildRuntimeAcceptanceProjections({
    ...evidence,
    canonicalEvidence: false
  });
  const releaseReceipt = buildRuntimeAcceptanceProjections(evidence);

  assert.equal(localReceipt.integrity.status, 'passed');
  assert.equal(localReceipt.status, 'passed');
  assert.equal(releaseReceipt.integrity.status, 'failed');
  assert.equal(releaseReceipt.status, 'failed');
});

test('rejects duplicate or unexpected screenshot material sets', () => {
  const evidence = passingEvidence();
  evidence.outputs.screenshots[1] = { ...evidence.outputs.screenshots[0] };

  const receipt = buildRuntimeAcceptanceProjections(evidence);

  assert.equal(receipt.integrity.status, 'failed');
  assert.equal(
    receipt.integrity.checks.filter((check) => check.id.startsWith('screenshot:') && check.status === 'failed').length,
    2
  );
});

test('rejects incomplete, duplicated, unsafe or tampered build evidence', () => {
  const cases = [
    (build) => {
      build.materials.pop();
    },
    (build) => {
      build.materials[1] = { ...build.materials[0] };
    },
    (build) => {
      build.materials[0].path = 'explorer-build/../escape.js';
    },
    (build) => {
      build.sha256 = SHA;
    },
    (build) => {
      build.index = { ...build.materials[0] };
    },
    (build) => {
      delete build.manifest.bytes;
    },
    (build) => {
      build.manifest.sha256 = SHA;
    },
    (build) => {
      build.unexpected = 'self-attested';
    }
  ];
  for (const mutate of cases) {
    const evidence = passingEvidence();
    mutate(evidence.inputs.explorer_build);

    const receipt = buildRuntimeAcceptanceProjections(evidence);

    assert.equal(receipt.integrity.status, 'failed');
    assert.equal(receipt.status, 'failed');
  }
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

test('binds a release receipt to exact candidate and Explorer revisions', () => {
  const binding = buildFrozenReleaseBinding({
    candidateCommit: GIT_SHA,
    candidateTree: 'c'.repeat(40),
    candidateBundleTree: SHA,
    explorerCommit: 'd'.repeat(40),
    explorerTag: 'v0.6.0'
  });

  assert.deepEqual(binding, {
    candidate: {
      repository: 'https://github.com/chris-page-gov/okf-uk-legislation',
      commit: GIT_SHA,
      tree: 'c'.repeat(40),
      bundle_tree_sha256: SHA
    },
    explorer: {
      repository: 'https://github.com/chris-page-gov/okf-explorer',
      tag: 'v0.6.0',
      commit: 'd'.repeat(40)
    }
  });
});

test('rejects partial or malformed release bindings', () => {
  assert.equal(buildFrozenReleaseBinding(), null);
  assert.throws(
    () => buildFrozenReleaseBinding({ candidateCommit: GIT_SHA }),
    /requires candidate commit/
  );
  assert.throws(
    () =>
      buildFrozenReleaseBinding({
        candidateCommit: GIT_SHA,
        candidateTree: 'c'.repeat(40),
        candidateBundleTree: SHA,
        explorerCommit: 'd'.repeat(40),
        explorerTag: 'v0.4.0'
      }),
    /requires Explorer v0\.6\.0/
  );
});

test('publishes write-once evidence without replacing divergent output', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-write-once-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const destination = path.join(directory, 'explorer-runtime-acceptance.json');
  const expected = Buffer.from('canonical receipt\n');

  assert.equal(await publishWriteOnce(destination, expected), 'created');
  assert.equal((await lstat(destination)).nlink, 1);
  assert.equal(await publishWriteOnce(destination, expected), 'existing-identical');
  await assert.rejects(
    publishWriteOnce(destination, Buffer.from('divergent receipt\n')),
    /different bytes/
  );
  assert.deepEqual(await readFile(destination), expected);
  assert.equal((await lstat(destination)).nlink, 1);
});

test('runner rejects a non-canonical external receipt basename before execution', () => {
  const result = spawnSync(
    process.execPath,
    [
      path.resolve('scripts/run_legislation_runtime_acceptance.mjs'),
      '--output',
      path.join(tmpdir(), 'not-the-runtime-receipt.json')
    ],
    { encoding: 'utf8' }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /canonical basename explorer-runtime-acceptance\.json/);
});
