import assert from 'node:assert/strict';
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { connect } from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  canonicalPublicationInventory,
  EXPLORER_RELEASE_TAG,
  EXPLORER_RELEASE_VERSION,
  publishWriteOnce,
  RUNTIME_GATE_IDS,
  verifyFrozenReleaseBinding
} from './runtime_acceptance_contract.mjs';
import {
  ACCEPTANCE_LIMITS,
  assertAcceptanceServerHealthy,
  assertNoSensitiveRuntimeData,
  boundedJsonByteLength,
  createAcceptanceServer,
  prepareEvidenceLayout,
  removePrivateSnapshot,
  sameTreeIdentity,
  scanTree
} from './run_legislation_runtime_acceptance.mjs';

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

function freshServerState() {
  return {
    failure: null,
    pending_rows: 0,
    pending_wire_bytes: 0,
    pending_decoded_bytes: 0,
    inflight_requests: 0,
    inflight_decoded_bytes: 0,
    peak_inflight_requests: 0,
    peak_inflight_decoded_bytes: 0
  };
}

async function listenEphemeral(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function waitForCondition(predicate, label) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
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

test('diagnostic evidence cannot satisfy the release gate', () => {
  const evidence = passingEvidence();
  evidence.inputs.bundle_root = '../okf-uk-legislation/bundle';

  const localReceipt = buildRuntimeAcceptanceProjections({
    ...evidence,
    canonicalEvidence: false
  });
  const releaseReceipt = buildRuntimeAcceptanceProjections(evidence);

  assert.equal(localReceipt.integrity.status, 'passed');
  assert.equal(localReceipt.status, 'failed');
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
    explorerTag: 'v0.6.2'
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
      tag: 'v0.6.2',
      commit: 'd'.repeat(40)
    }
  });
  assert.equal(EXPLORER_RELEASE_VERSION, '0.6.2');
  assert.equal(EXPLORER_RELEASE_TAG, 'v0.6.2');
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
        explorerTag: 'v0.6.0'
      }),
    /requires Explorer v0\.6\.2/
  );
});

test('rejects any caller binding that differs from derived repository evidence', () => {
  const expected = buildFrozenReleaseBinding({
    candidateCommit: GIT_SHA,
    candidateTree: 'c'.repeat(40),
    candidateBundleTree: SHA,
    explorerCommit: 'd'.repeat(40),
    explorerTag: EXPLORER_RELEASE_TAG
  });
  assert.deepEqual(verifyFrozenReleaseBinding(expected, structuredClone(expected)), expected);

  for (const mutate of [
    (value) => { value.candidate.commit = 'e'.repeat(40); },
    (value) => { value.candidate.tree = 'e'.repeat(40); },
    (value) => { value.candidate.bundle_tree_sha256 = 'e'.repeat(64); },
    (value) => { value.explorer.commit = 'e'.repeat(40); },
    (value) => { value.explorer.tag = 'v0.6.0'; }
  ]) {
    const observed = structuredClone(expected);
    mutate(observed);
    assert.throws(
      () => verifyFrozenReleaseBinding(expected, observed),
      /differs from the requested frozen release binding/
    );
  }
});

test('reproduces the producer publication inventory and rejects mutations', () => {
  const materials = [
    { path: 'a.json', bytes: 10, sha256: 'a'.repeat(64) },
    { path: 'nested/b.json', bytes: 20, sha256: 'b'.repeat(64) }
  ];
  const expectedBytes = Buffer.from(
    `${JSON.stringify([
      { bytes: 10, path: 'a.json', sha256: 'a'.repeat(64) },
      { bytes: 20, path: 'nested/b.json', sha256: 'b'.repeat(64) }
    ])}\n`
  );
  assert.deepEqual(canonicalPublicationInventory(materials), {
    algorithm: 'sha256-canonical-json-inventory-v1',
    files: 2,
    bytes: 30,
    sha256: sha256(expectedBytes)
  });
  assert.throws(
    () => canonicalPublicationInventory([...materials].reverse()),
    /strict code-point order/
  );
  assert.throws(
    () => canonicalPublicationInventory([materials[0], { ...materials[0] }]),
    /strict code-point order/
  );
  assert.throws(
    () => canonicalPublicationInventory([{ ...materials[0], path: '../escape' }]),
    /unsafe path/
  );
  assert.throws(
    () => canonicalPublicationInventory([{ ...materials[0], sha256: 'wrong' }]),
    /invalid SHA-256/
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
  assert.equal(
    (await readdir(directory)).some((name) => name.includes('.tmp-')),
    false
  );

  const expiredDestination = path.join(directory, 'expired.json');
  await assert.rejects(
    publishWriteOnce(expiredDestination, expected, {
      deadline: Date.now() - 1,
      maxBytes: expected.length
    }),
    /publication exceeded its deadline/
  );
  await assert.rejects(lstat(expiredDestination), { code: 'ENOENT' });
});

test('write-once publication is physically contained and rejects linked output', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-contained-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const evidenceRoot = path.join(directory, 'evidence');
  const outsideRoot = path.join(directory, 'outside');
  await mkdir(path.join(evidenceRoot, 'nested'), { recursive: true });
  await mkdir(outsideRoot);

  const contained = path.join(evidenceRoot, 'nested', 'receipt.json');
  assert.equal(
    await publishWriteOnce(contained, Buffer.from('contained\n'), { containmentRoot: evidenceRoot }),
    'created'
  );
  await assert.rejects(
    publishWriteOnce(path.join(outsideRoot, 'escape.json'), Buffer.from('escape\n'), {
      containmentRoot: evidenceRoot
    }),
    /not physically contained/
  );

  const linkedSource = path.join(outsideRoot, 'linked-source.json');
  const linkedDestination = path.join(evidenceRoot, 'nested', 'linked.json');
  await writeFile(linkedSource, 'linked\n');
  await link(linkedSource, linkedDestination);
  await assert.rejects(
    publishWriteOnce(linkedDestination, Buffer.from('linked\n'), { containmentRoot: evidenceRoot }),
    /not an independent regular file/
  );

  const symlinkedParent = path.join(evidenceRoot, 'redirect');
  await symlink(outsideRoot, symlinkedParent);
  await assert.rejects(
    publishWriteOnce(path.join(symlinkedParent, 'redirected.json'), Buffer.from('redirected\n'), {
      containmentRoot: evidenceRoot
    }),
    /not a real directory|not physically contained/
  );
});

test('private tree snapshots detect mutation and reject linked inputs', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-snapshot-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const source = path.join(directory, 'source');
  const snapshot = path.join(directory, 'snapshot');
  await mkdir(path.join(source, 'nested'), { recursive: true });
  await writeFile(path.join(source, 'a.json'), '{"value":1}\n');
  await writeFile(path.join(source, 'nested', 'b.json'), '{"value":2}\n');
  const deadline = Date.now() + 10_000;

  const initial = await scanTree({
    root: source,
    snapshotRoot: snapshot,
    kind: 'build',
    deadline
  });
  const snapshotCheck = await scanTree({
    root: snapshot,
    kind: 'build',
    deadline
  });
  assert.equal(sameTreeIdentity(initial, snapshotCheck), true);
  assert.equal((await lstat(path.join(snapshot, 'a.json'))).mode & 0o777, 0o400);

  await writeFile(path.join(source, 'a.json'), '{"value":9}\n');
  const mutated = await scanTree({ root: source, kind: 'build', deadline });
  assert.equal(sameTreeIdentity(initial, mutated), false);

  await symlink(path.join(source, 'a.json'), path.join(source, 'linked.json'));
  await assert.rejects(
    scanTree({ root: source, kind: 'build', deadline }),
    /symbolic link/
  );
  await rm(path.join(source, 'linked.json'));
  await link(path.join(source, 'a.json'), path.join(source, 'hard-linked.json'));
  await assert.rejects(
    scanTree({ root: source, kind: 'build', deadline }),
    /linked, symbolic or non-regular file/
  );
});

test('bounded tree enumeration rejects max plus one entries', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-entry-bound-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  for (let index = 0; index <= ACCEPTANCE_LIMITS.max_build_entries; index += 1) {
    await writeFile(
      path.join(directory, `entry-${String(index).padStart(5, '0')}.txt`),
      'bounded\n'
    );
  }
  await assert.rejects(
    scanTree({
      root: directory,
      kind: 'build',
      deadline: Date.now() + 10_000
    }),
    /entry-count bound/
  );
});

test('release evidence requires a fresh root disjoint from both sources', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-layout-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const sourceA = path.join(directory, 'source-a');
  const sourceB = path.join(directory, 'source-b');
  const evidence = path.join(directory, 'evidence');
  await mkdir(sourceA);
  await mkdir(sourceB);
  const options = {
    releaseMode: true,
    protectedSourceRoots: [sourceA, sourceB],
    requestedScreenshotRoot: path.join(evidence, 'output', 'playwright')
  };

  const layout = await prepareEvidenceLayout(evidence, options);
  assert.equal(layout.evidenceRoot, evidence);
  assert.equal(layout.screenshotRoot, path.join(evidence, 'output', 'playwright'));
  await assert.rejects(
    prepareEvidenceLayout(evidence, options),
    /new, absent directory/
  );
  await assert.rejects(
    prepareEvidenceLayout(directory, {
      ...options,
      requestedScreenshotRoot: path.join(directory, 'output', 'playwright')
    }),
    /disjoint external directory/
  );
});

test('snapshot cleanup failure cannot progress to receipt publication', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-cleanup-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const snapshot = await mkdtemp(
    path.join(directory, 'okf-legislation-acceptance-')
  );
  const receipt = path.join(directory, 'explorer-runtime-acceptance.json');
  await writeFile(path.join(snapshot, 'material.json'), '{}\n');

  await assert.rejects(
    removePrivateSnapshot(snapshot, {
      deadline: Date.now() + 10_000,
      temporaryRoot: directory,
      removeTree: async () => {
        throw new Error('injected cleanup failure');
      }
    }),
    /injected cleanup failure/
  );
  await assert.rejects(lstat(receipt), { code: 'ENOENT' });
  assert.equal((await lstat(snapshot)).isDirectory(), true);

  await removePrivateSnapshot(snapshot, {
    deadline: Date.now() + 10_000,
    temporaryRoot: directory
  });
  await assert.rejects(lstat(snapshot), { code: 'ENOENT' });
});

test('server limit failures are sticky and range and gzip paths remain distinct', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-server-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const body = Buffer.from('<!doctype html><p>bounded acceptance</p>\n');
  await writeFile(path.join(directory, 'index.html'), body);
  const tree = {
    root: directory,
    materialByPath: new Map([
      ['index.html', {
        path: 'index.html',
        bytes: body.length,
        sha256: sha256(body)
      }]
    ])
  };

  const failedTransfers = [];
  const failedTelemetry = {
    telemetry_bytes: 0,
    transfer_wire_bytes: 0,
    transfer_decoded_bytes: 0
  };
  const failedState = freshServerState();
  const failedServer = createAcceptanceServer(
    failedTransfers,
    { browser: 'test', phase: 'optional-resource' },
    { build: tree, bundle: tree },
    failedTelemetry,
    Date.now() + 10_000,
    failedState,
    {
      ...ACCEPTANCE_LIMITS,
      max_transfer_decoded_bytes: body.length - 1
    }
  );
  const failedUrl = await listenEphemeral(failedServer);
  const failedResponse = await fetch(`${failedUrl}/optional-resource`, {
    headers: { 'accept-encoding': 'identity' }
  });
  assert.equal(failedResponse.status, 500);
  const rejectedAfterFailure = await fetch(`${failedUrl}/index.html`, {
    headers: { 'accept-encoding': 'identity' }
  });
  assert.equal(rejectedAfterFailure.status, 500);
  assert.equal(failedTransfers.length, 0);
  await closeServer(failedServer);
  assert.throws(
    () => assertAcceptanceServerHealthy(failedState),
    /governed failure/
  );

  const transfers = [];
  const telemetry = {
    telemetry_bytes: 0,
    transfer_wire_bytes: 0,
    transfer_decoded_bytes: 0
  };
  const state = freshServerState();
  const server = createAcceptanceServer(
    transfers,
    { browser: 'test', phase: 'range-and-gzip' },
    { build: tree, bundle: tree },
    telemetry,
    Date.now() + 10_000,
    state
  );
  const base = await listenEphemeral(server);
  const rangeResponse = await fetch(`${base}/index.html`, {
    headers: {
      'accept-encoding': 'gzip',
      range: 'bytes=0-3'
    }
  });
  assert.equal(rangeResponse.status, 206);
  assert.equal(rangeResponse.headers.get('content-encoding'), null);
  assert.equal(Buffer.from(await rangeResponse.arrayBuffer()).toString(), '<!do');

  const gzipResponse = await fetch(`${base}/index.html`, {
    headers: { 'accept-encoding': 'gzip' }
  });
  assert.equal(gzipResponse.status, 200);
  assert.equal(gzipResponse.headers.get('content-encoding'), 'gzip');
  assert.deepEqual(Buffer.from(await gzipResponse.arrayBuffer()), body);
  const missingResponse = await fetch(`${base}/missing.json`, {
    headers: { 'accept-encoding': 'identity' }
  });
  assert.equal(missingResponse.status, 404);
  assert.equal(await missingResponse.text(), 'Not found');
  await closeServer(server);
  assert.doesNotThrow(() => assertAcceptanceServerHealthy(state));
  assert.equal(transfers[0].range, '0-3');
  assert.equal(transfers[0].content_encoding, 'identity');
  assert.equal(transfers[1].range, null);
  assert.equal(transfers[1].content_encoding, 'gzip');
  assert.equal(transfers[2].status, 404);
  assert.equal(transfers[2].wire_bytes, Buffer.byteLength('Not found'));
});

test('holds the request reservation until a queued response finishes', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'okf-runtime-server-inflight-'));
  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const body = Buffer.alloc(32 * 1024 * 1024, 0x61);
  await writeFile(path.join(directory, 'large.bin'), body);
  const tree = {
    root: directory,
    materialByPath: new Map([
      ['large.bin', {
        path: 'large.bin',
        bytes: body.length,
        sha256: sha256(body)
      }]
    ])
  };
  const transfers = [];
  const telemetry = {
    telemetry_bytes: 0,
    transfer_wire_bytes: 0,
    transfer_decoded_bytes: 0
  };
  const state = freshServerState();
  const server = createAcceptanceServer(
    transfers,
    { browser: 'test', phase: 'slow-client' },
    { build: tree, bundle: tree },
    telemetry,
    Date.now() + 10_000,
    state,
    { ...ACCEPTANCE_LIMITS, max_inflight_requests: 1 }
  );
  const base = await listenEphemeral(server);
  const address = new URL(base);
  const socket = connect(Number(address.port), address.hostname);
  context.after(() => socket.destroy());
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  socket.pause();
  socket.write(
    'GET /large.bin HTTP/1.1\r\n' +
    `Host: ${address.host}\r\n` +
    'Accept-Encoding: identity\r\n' +
    'Connection: close\r\n\r\n'
  );
  await waitForCondition(
    () => state.inflight_requests === 1 && state.inflight_decoded_bytes === body.length,
    'the slow response reservation'
  );

  const refused = await fetch(`${base}/large.bin`, {
    headers: { 'accept-encoding': 'identity' }
  });
  assert.equal(refused.status, 500);
  assert.notEqual(state.failure, null);
  socket.resume();
  await new Promise((resolve) => socket.once('close', resolve));
  await waitForCondition(
    () => state.inflight_requests === 0 && state.inflight_decoded_bytes === 0,
    'the slow response reservation release'
  );
  await closeServer(server);
  assert.throws(
    () => assertAcceptanceServerHealthy(state),
    /governed failure/
  );
});

test('JSON evidence is measured before complete serialisation', () => {
  const evidence = {
    nested: ['one', { two: true }],
    omitted: undefined
  };
  assert.equal(
    boundedJsonByteLength(evidence, 1024),
    Buffer.byteLength(JSON.stringify(evidence), 'utf8')
  );
  assert.equal(
    boundedJsonByteLength(evidence, 1024, { indent: 2 }),
    Buffer.byteLength(JSON.stringify(evidence, null, 2), 'utf8')
  );
  assert.throws(
    () => boundedJsonByteLength(evidence, 5),
    /exceeds its byte bound/
  );
  assert.throws(
    () => boundedJsonByteLength(
      'x'.repeat(ACCEPTANCE_LIMITS.max_retained_string_bytes + 1),
      ACCEPTANCE_LIMITS.max_receipt_bytes
    ),
    /retained-string byte bound/
  );
  assert.throws(
    () => boundedJsonByteLength(evidence, 1024, {
      deadline: Date.now() - 1
    }),
    /governed acceptance deadline/
  );
});

test('release resource limits are finite and sensitive receipt material is rejected', () => {
  for (const [name, value] of Object.entries(ACCEPTANCE_LIMITS)) {
    assert.equal(Number.isSafeInteger(value), true, `${name} must be a safe integer`);
    assert.equal(value > 0, true, `${name} must be positive`);
  }
  assert.doesNotThrow(() => assertNoSensitiveRuntimeData(
    { repository: 'https://github.com/chris-page-gov/okf-explorer', path: 'bundle/index.json' },
    ['/private/source']
  ));
  assert.throws(
    () => assertNoSensitiveRuntimeData({ path: '/private/source/file.json' }, ['/private/source']),
    /forbidden absolute path or runtime secret/
  );
  assert.throws(
    () => assertNoSensitiveRuntimeData({ url: 'https://example.test/file?token=secret' }, []),
    /query string/
  );
  assert.throws(
    () => assertNoSensitiveRuntimeData({ error: '?api_key=secret' }, []),
    /query credential/
  );
});

test('runner rejects a non-canonical external receipt basename before execution', () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./run_legislation_runtime_acceptance.mjs', import.meta.url)),
      '--output',
      path.join(tmpdir(), 'not-the-runtime-receipt.json')
    ],
    { encoding: 'utf8' }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /canonical basename explorer-runtime-acceptance\.json/);
});
