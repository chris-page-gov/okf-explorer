import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';

import {
  ACCEPTANCE_LIMITS,
  captureAttributeObservation,
  descriptorIdentity,
  descriptorErrors,
  identityErrors,
  inspectSafeOutputDestination,
  isCredentialFreeAbsoluteHttpUrl,
  receiptFailureReference,
  receiptPageState,
  safeRelativePath,
  staticBuildFile,
  validateJourneyManifest,
  verifySafeOutputParent,
  waitForLocator,
  waitForRankedResult
} from './external_bundle_acceptance_contract.mjs';

const execFileAsync = promisify(execFile);
const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const chromiumLaunchOptions = Object.freeze({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL }
    : {})
});

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
        { type: 'press', selector: 'input[type=search]', key: 'Enter' },
        {
          type: 'capture_attributes',
          id: 'ranked-result-urls',
          selector: '[data-okf-ranked-results="primary"] [data-okf-ranked-result]',
          name: 'data-result-canonical-url',
          min_items: 1,
          max_items: 10
        }
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

test('serves only snapshotted static files and directory indexes after the learning-home redirect', () => {
  const materials = new Map([
    ['index.html', {}], ['explore/index.html', {}],
    ['reading-help/corpus/index.html', {}], ['_app/start.js', {}], ['404.html', {}]
  ]);
  assert.equal(staticBuildFile('', materials), 'index.html');
  assert.equal(staticBuildFile('explore/', materials), 'explore/index.html');
  assert.equal(staticBuildFile('explore', materials), 'explore/index.html');
  assert.equal(staticBuildFile('reading-help/corpus/', materials), 'reading-help/corpus/index.html');
  assert.equal(staticBuildFile('_app/start.js', materials), '_app/start.js');
  assert.equal(staticBuildFile('missing/', materials), '404.html');
  assert.equal(staticBuildFile('../private/', materials), '404.html');
  assert.equal(staticBuildFile('explore/private.json', materials), '404.html');
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

test('rejects unsafe or unbounded attribute captures', () => {
  const unsafeAttribute = structuredClone(valid);
  unsafeAttribute.journeys[0].actions[3].name = 'onclick';
  assert.throws(() => validateJourneyManifest(unsafeAttribute), /href or a data-\* attribute/);

  const unbounded = structuredClone(valid);
  unbounded.journeys[0].actions[3].max_items = 101;
  assert.throws(() => validateJourneyManifest(unbounded), /integer from 1 to 100/);

  const duplicate = structuredClone(valid);
  duplicate.journeys[0].actions.push(structuredClone(duplicate.journeys[0].actions[3]));
  assert.throws(() => validateJourneyManifest(duplicate), /duplicate observation id/);
});

test('accepts only exact canonical ranked-result actions and assertions', () => {
  const governed = structuredClone(valid);
  governed.journeys[0].actions.push({
    type: 'wait_for_ranked_result',
    canonical_url: 'https://example.test/result'
  });
  governed.journeys[0].assertions.push({
    type: 'ranked_result',
    canonical_url: 'https://example.test/result'
  });
  assert.equal(validateJourneyManifest(governed), governed);

  for (const canonicalUrl of [
    undefined,
    '/relative',
    'https://user:secret@example.test/result',
    'https://example.test/result?api_key=secret',
    'https://example.test/result?access-token=secret',
    'https://example.test/result?client_secret=secret',
    'https://example.test/result?password=secret'
  ]) {
    const malformed = structuredClone(valid);
    malformed.journeys[0].actions.push({
      type: 'wait_for_ranked_result',
      ...(canonicalUrl === undefined ? {} : { canonical_url: canonicalUrl })
    });
    assert.throws(
      () => validateJourneyManifest(malformed),
      /fields are unsupported or have drifted|canonical_url must be a string|credential-free absolute HTTP\(S\) URL/
    );
  }

  const drifted = structuredClone(valid);
  drifted.journeys[0].assertions.push({
    type: 'ranked_result',
    canonical_url: 'https://example.test/result',
    selector: 'strong:first'
  });
  assert.throws(() => validateJourneyManifest(drifted), /fields are unsupported or have drifted/);
});

test('rejects aggregate and string inputs outside the explicit contract bounds', () => {
  const tooManyJourneys = structuredClone(valid);
  tooManyJourneys.journeys = Array.from(
    { length: ACCEPTANCE_LIMITS.journeys + 1 },
    (_, index) => ({ ...structuredClone(valid.journeys[0]), id: `journey-${index}` })
  );
  assert.throws(() => validateJourneyManifest(tooManyJourneys), /journeys must contain/);

  const longSelector = structuredClone(valid);
  longSelector.journeys[0].actions[1].selector = 'x'.repeat(ACCEPTANCE_LIMITS.selector_chars + 1);
  assert.throws(() => validateJourneyManifest(longSelector), /at most 2048 characters/);

  const longPath = structuredClone(valid);
  longPath.bundle_descriptor = `${'x'.repeat(ACCEPTANCE_LIMITS.path_chars)}.json`;
  assert.throws(() => validateJourneyManifest(longPath), /at most 1024 characters/);

  assert.throws(() => safeRelativePath('data/\u0000.json'), /control character/);
});

test('rejects an output parent symlink that physically enters an input tree', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'okf-output-containment-'));
  try {
    const bundle = path.join(root, 'bundle');
    const safe = path.join(root, 'safe');
    const disguised = path.join(safe, 'publication');
    await mkdir(bundle);
    await mkdir(safe);
    await symlink(bundle, disguised, 'dir');
    await assert.rejects(
      inspectSafeOutputDestination(path.join(disguised, 'receipt.json'), [bundle]),
      /symbolic-link component|inside runtime input root/
    );
    const state = await inspectSafeOutputDestination(path.join(safe, 'receipt.json'), [bundle]);
    await verifySafeOutputParent(state);
    await writeFile(path.join(safe, '.receipt.tmp'), 'complete receipt bytes');
    await verifySafeOutputParent(state);
    await rename(safe, path.join(root, 'displaced-safe'));
    await mkdir(safe);
    await assert.rejects(
      verifySafeOutputParent(state),
      /output parent changed after containment verification/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('projects page state and failures without retaining secrets or local paths', () => {
  const pageState = receiptPageState(
    'https://user.example.test/records?token=do-not-retain&view=reader#secret-fragment'
  );
  assert.deepEqual(pageState, {
    url: 'https://user.example.test/records',
    query_parameters_present: 2,
    fragment_present: true
  });
  assert.deepEqual(receiptPageState('about:blank'), {
    url: 'about:blank',
    query_parameters_present: 0,
    fragment_present: false
  });
  assert.throws(
    () => receiptPageState('https://user:password@example.test/private'),
    /credentials/
  );

  const failure = receiptFailureReference(
    new Error('/Users/example/private.txt?token=do-not-retain')
  );
  assert.equal(failure.name, 'Error');
  assert.equal(failure.detail_bytes, 46);
  assert.match(failure.detail_sha256, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(failure), /Users|private|token|do-not-retain/);
});

function snapshotLocator(values) {
  const calls = [];
  return {
    calls,
    first() {
      calls.push('first');
      return { async waitFor(options) { calls.push(['waitFor', options]); } };
    },
    async evaluateAll(callback, argument) {
      calls.push(['evaluateAll', argument, typeof callback]);
      return { matched_items: values.length, values: values.slice(0, argument.maximum) };
    }
  };
}

test('captures bounded attribute values in rendered rank order', async () => {
  const values = [
    'https://example.test/first',
    'https://example.test/second',
    'https://example.test/third'
  ];
  const locator = snapshotLocator(values);
  const action = {
    type: 'capture_attributes',
    id: 'ranked-result-urls',
    selector: '[data-result-canonical-url]',
    name: 'data-result-canonical-url',
    min_items: 2,
    max_items: 2
  };

  assert.deepEqual(await captureAttributeObservation(locator, action), {
    id: 'ranked-result-urls',
    type: 'ordered_attributes',
    selector: '[data-result-canonical-url]',
    attribute: 'data-result-canonical-url',
    min_items: 2,
    max_items: 2,
    matched_items: 3,
    values: values.slice(0, 2)
  });
  assert.deepEqual(locator.calls, [
    'first',
    ['waitFor', { state: 'attached' }],
    ['evaluateAll', { attribute: 'data-result-canonical-url', maximum: 2 }, 'function']
  ]);
});

test('fails a capture when the governed minimum or attribute is absent', async () => {
  await assert.rejects(
    captureAttributeObservation(
      snapshotLocator([]),
      { selector: '.results', name: 'data-url', min_items: 1, max_items: 10 }
    ),
    /fewer than min_items 1/
  );
  await assert.rejects(
    captureAttributeObservation(
      snapshotLocator([null]),
      { selector: '.results', name: 'data-url', min_items: 1, max_items: 10 }
    ),
    /lacks attribute data-url/
  );
});

test('rejects missing, relative and credential-bearing canonical result URLs', async () => {
  for (const value of [
    '',
    '/relative',
    'https://user:secret@example.test/result',
    'https://example.test/result?api_key=secret',
    'https://example.test/result?token=secret',
    'https://example.test/result?client-secret=secret',
    'https://example.test/result?passwd=secret',
    'javascript:alert(1)',
    'https://./result',
    'https://example.test:0/result',
    'https://example.test/bad path'
  ]) {
    await assert.rejects(
      captureAttributeObservation(
        snapshotLocator([value]),
        {
          id: 'ranked-result-urls',
          selector: '[data-okf-ranked-result]',
          name: 'data-result-canonical-url',
          min_items: 1,
          max_items: 10
        }
      ),
      /lacks attribute|invalid canonical HTTP\(S\) URL/
    );
  }
  assert.equal(isCredentialFreeAbsoluteHttpUrl('https://example.test/result'), true);
  assert.equal(isCredentialFreeAbsoluteHttpUrl('http://example.test/result'), true);
  assert.equal(isCredentialFreeAbsoluteHttpUrl('https://example.test/result?api_key=secret'), false);
  assert.equal(isCredentialFreeAbsoluteHttpUrl('https://example.test/result?access_token=secret'), false);
  assert.equal(isCredentialFreeAbsoluteHttpUrl('https://example.test/result?client_secret=secret'), false);
  assert.equal(isCredentialFreeAbsoluteHttpUrl('https://example.test/result?password=secret'), false);
});

test('captures one coherent rank snapshot while a real page repeatedly rerenders', { timeout: 50_000 }, async (t) => {
  const browser = await chromium.launch({ ...chromiumLaunchOptions, timeout: 30_000 });
  let phase = 'create the page';
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(4_000);
    phase = 'render the fixture';
    await page.setContent(`
      <main data-results></main>
      <script>
        let epoch = 0;
        let scheduled = false;
        const results = document.querySelector('[data-results]');
        const render = () => {
          epoch += 1;
          results.innerHTML = [1, 2, 3]
            .map((rank) => '<a data-okf-ranked-result data-result-canonical-url="https://example.test/result?epoch=' + epoch + '&rank=' + rank + '"></a>')
            .join('');
          for (const row of results.children) {
            const readAttribute = row.getAttribute.bind(row);
            row.getAttribute = (name) => {
              const value = readAttribute(name);
              if (name === 'data-result-canonical-url' && !scheduled) {
                scheduled = true;
                queueMicrotask(() => {
                  render();
                  scheduled = false;
                });
              }
              return value;
            };
          }
        };
        render();
      </script>
    `);
    const action = {
      id: 'ranked-result-urls',
      selector: '[data-okf-ranked-result]',
      name: 'data-result-canonical-url',
      min_items: 3,
      max_items: 3
    };
    for (let epoch = 1; epoch <= 3; epoch += 1) {
      phase = `capture ranking epoch ${epoch}`;
      const observation = await captureAttributeObservation(page.locator(action.selector), action);
      assert.equal(observation.values.length, 3);
      assert.deepEqual(observation.values.map((value) => new URL(value).searchParams.get('epoch')), Array(3).fill(String(epoch)));
      assert.deepEqual(observation.values.map((value) => new URL(value).searchParams.get('rank')), ['1', '2', '3']);
    }
  } catch (error) {
    t.diagnostic(`The rank snapshot fixture could not ${phase}.`);
    throw error;
  } finally {
    await browser.close();
  }
});

test('keeps declarative wait_for strict instead of weakening it to the first match', async () => {
  const calls = [];
  const locator = {
    async waitFor(options) { calls.push(options); }
  };
  await waitForLocator(locator, 'attached');
  assert.deepEqual(calls, [{ state: 'attached' }]);
});

test('waits for the exact query to settle and selects a ranked result by canonical URL', { timeout: 20_000 }, async () => {
  const browser = await chromium.launch(chromiumLaunchOptions);
  try {
    const page = await browser.newPage();
    await page.route('https://explorer.test/**', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<main data-okf-ranked-results="primary" data-okf-query="title plan" data-okf-search-state="searching"></main>'
    }));
    await page.goto('https://explorer.test/?q=title%20plan');
    await page.evaluate(() => {
      setTimeout(() => {
        const results = document.querySelector('[data-okf-ranked-results="primary"]');
        results.setAttribute('data-okf-search-state', 'settled');
        results.innerHTML = '<button data-okf-ranked-result data-result-canonical-url="https://example.test/expected">Expected</button>';
      }, 50);
    });

    assert.deepEqual(await waitForRankedResult(page, 'https://example.test/expected'), {
      query: 'title plan',
      canonical_url: 'https://example.test/expected',
      ranked_result_count: 1,
      matching_result_count: 1
    });
  } finally {
    await browser.close();
  }
});

test('retains one atomic settled result observation across an immediate rerender', { timeout: 20_000 }, async () => {
  const browser = await chromium.launch(chromiumLaunchOptions);
  try {
    const page = await browser.newPage();
    await page.route('https://explorer.test/**', (route) => route.fulfill({
      contentType: 'text/html',
      body: `
        <main data-okf-ranked-results="primary" data-okf-query="atomic" data-okf-search-state="settled">
          <button data-okf-ranked-result data-result-canonical-url="https://example.test/expected">Expected</button>
        </main>
        <script>
          const originalGetAttribute = Element.prototype.getAttribute;
          let rerenderScheduled = false;
          Element.prototype.getAttribute = function (name) {
            const value = originalGetAttribute.call(this, name);
            if (
              !rerenderScheduled &&
              name === 'data-result-canonical-url' &&
              value === 'https://example.test/expected'
            ) {
              rerenderScheduled = true;
              queueMicrotask(() => {
                document.querySelector('[data-okf-ranked-results="primary"]').innerHTML =
                  '<button hidden data-okf-ranked-result data-result-canonical-url="https://example.test/replacement">Replacement</button>';
              });
            }
            return value;
          };
        </script>
      `
    }));
    await page.goto('https://explorer.test/?q=atomic');

    assert.deepEqual(await waitForRankedResult(page, 'https://example.test/expected'), {
      query: 'atomic',
      canonical_url: 'https://example.test/expected',
      ranked_result_count: 1,
      matching_result_count: 1
    });
    await page.waitForFunction(() =>
      document.querySelector('[data-okf-ranked-result]')?.getAttribute('data-result-canonical-url') ===
        'https://example.test/replacement'
    );
  } finally {
    await browser.close();
  }
});

test('fails promptly when a query has settled without its canonical ranked result', { timeout: 20_000 }, async () => {
  const browser = await chromium.launch(chromiumLaunchOptions);
  try {
    const page = await browser.newPage();
    await page.route('https://explorer.test/**', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<main data-okf-ranked-results="primary" data-okf-query="missing" data-okf-search-state="settled"></main>'
    }));
    await page.goto('https://explorer.test/?q=missing');
    const started = Date.now();
    await assert.rejects(
      waitForRankedResult(page, 'https://example.test/expected'),
      /contained 0 ranked results/
    );
    assert.ok(Date.now() - started < 1_000, 'settled absence should not consume the journey timeout');
  } finally {
    await browser.close();
  }
});

test('refuses direct runner invocation without a live wrapper-owned lock', async () => {
  const environment = { ...process.env };
  delete environment.OKF_EXPLORER_ACCEPTANCE_LOCK_PATH;
  delete environment.OKF_EXPLORER_ACCEPTANCE_LOCK_TOKEN;
  delete environment.OKF_EXPLORER_ACCEPTANCE_LOCK_PURPOSE;
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        path.join(SCRIPT_ROOT, 'run_external_bundle_acceptance.mjs'),
        '--bundle-root',
        '/tmp/not-read-before-lock-verification',
        '--journeys',
        '/tmp/not-read-before-lock-verification.json',
        '--output',
        '/tmp/not-written-before-lock-verification.json'
      ],
      { env: environment }
    ),
    (error) => {
      assert.match(error.stderr, /lock attestation is missing/);
      return true;
    }
  );
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [path.join(SCRIPT_ROOT, 'run_legislation_runtime_acceptance.mjs')],
      { env: environment }
    ),
    (error) => {
      assert.match(error.stderr, /lock attestation is missing/);
      return true;
    }
  );
});

test('normalises common descriptor identity fields without inventing them', () => {
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

test('pins a legacy descriptor with explicitly absent identity fields to its exact bytes', () => {
  const descriptor = {schema: 'okf-explorer-large-corpus.v1', title: 'Retained RDF fixture'};
  const bytes = Buffer.from(JSON.stringify(descriptor));
  const manifest = structuredClone(valid);
  manifest.expected_identity = {schema: descriptor.schema, id: null, version: null, snapshot: null};
  manifest.expected_descriptor_sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.doesNotThrow(() => validateJourneyManifest(manifest));
  assert.deepEqual(descriptorErrors(descriptor, manifest, bytes), []);
  assert.deepEqual(descriptorErrors(descriptor, manifest, Buffer.concat([bytes, Buffer.from('\n')])), ['descriptor bytes differ from expected_descriptor_sha256']);
});

test('absent metadata never bypasses the digest or schema requirement', () => {
  const manifest = structuredClone(valid);
  manifest.expected_identity.version = null;
  assert.throws(() => validateJourneyManifest(manifest), /expected_descriptor_sha256/);
  manifest.expected_descriptor_sha256 = 'a'.repeat(63);
  assert.throws(() => validateJourneyManifest(manifest), /expected_descriptor_sha256/);
  manifest.expected_descriptor_sha256 = 'a'.repeat(64);
  manifest.expected_identity.schema = null;
  assert.throws(() => validateJourneyManifest(manifest), /expected_identity.schema/);
});

test('a matching digest preserves the checks on every declared identity field', () => {
  const descriptor = {schema: 'okf-explorer-bundle.v0', '@id': 'urn:changed', version: '1.0.0', snapshot: 'snapshot-1'};
  const bytes = Buffer.from(JSON.stringify(descriptor));
  const manifest = structuredClone(valid);
  manifest.expected_descriptor_sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.deepEqual(descriptorErrors(descriptor, manifest, bytes), ['descriptor identity id was "urn:changed", expected "urn:example"']);
});
