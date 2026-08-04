import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertReceiptContract,
  buildReceipt,
  main,
  protectedActions
} from './observe_protected_links.mjs';

const browser = {
  channel: 'google-chrome-cdp',
  user_agent: 'Mozilla/5.0 Chrome/150.0.0.0',
  webdriver: false,
  languages: ['en-GB', 'en']
};

function action(sequence, value, expectedText) {
  return {
    sequence,
    action: 'verify_url',
    value,
    expected_text: expectedText,
    verification_channel: 'genuine-browser-receipt'
  };
}

function observation(requestedUrl, observedAt, expectedText) {
  return {
    observed_at: observedAt,
    requested_url: requestedUrl,
    final_url: requestedUrl,
    title: `${expectedText} | Historic England`,
    response_status: 200,
    identity_matched: true,
    identity_excerpt: `Official page identity: ${expectedText}`,
    browser
  };
}

test('sorts the protected publication actions by declared sequence', () => {
  const payload = {
    journeys: [
      {
        id: 'journey-publication',
        actions: [
          action(14, 'https://example.test/two', 'Two'),
          { ...action(12, 'https://example.test/ignored', 'Ignored'), verification_channel: undefined },
          action(13, 'https://example.test/one', 'One')
        ]
      }
    ]
  };
  assert.deepEqual(
    protectedActions(payload).map((item) => item.sequence),
    [13, 14]
  );
});

test('materializes the exact genuine-browser receipt contract', () => {
  const actions = [
    action(13, 'https://example.test/one', 'One'),
    action(14, 'https://example.test/two', 'Two')
  ];
  const receipt = buildReceipt(
    actions,
    [
      observation(actions[0].value, '2026-08-04T10:00:00.000Z', 'One'),
      observation(actions[1].value, '2026-08-04T10:00:01.000Z', 'Two')
    ],
    browser
  );

  assert.equal(receipt.schema, 'okf-genuine-browser-link-receipt.v1');
  assert.equal(receipt.observed_at, receipt.records.at(-1).observed_at);
  assert.deepEqual(Object.keys(receipt.browser), [
    'channel',
    'user_agent',
    'webdriver',
    'languages'
  ]);
  assert.equal(receipt.browser.webdriver, false);
  assert.deepEqual(receipt.scope.sequences, [13, 14]);
  assert.deepEqual(Object.keys(receipt.records[0]), [
    'observed_at',
    'requested_url',
    'final_url',
    'title',
    'response_status',
    'expected_text',
    'identity_matched',
    'identity_source',
    'identity_excerpt'
  ]);
  assert.equal(receipt.records[0].identity_source, 'document.body.innerText');
  assert.equal(receipt.records[0].expected_text, 'One');
});

test('rejects automation identity and unordered record times', () => {
  const actions = [
    action(13, 'https://example.test/one', 'One'),
    action(14, 'https://example.test/two', 'Two')
  ];
  const receipt = buildReceipt(
    actions,
    [
      observation(actions[0].value, '2026-08-04T10:00:00.000Z', 'One'),
      observation(actions[1].value, '2026-08-04T10:00:01.000Z', 'Two')
    ],
    browser
  );
  receipt.browser.webdriver = true;
  assert.throws(() => assertReceiptContract(receipt), /webdriver=false/);
  receipt.browser.webdriver = false;
  receipt.records[1].observed_at = '2026-08-04T09:59:59.000Z';
  receipt.observed_at = receipt.records[1].observed_at;
  assert.throws(() => assertReceiptContract(receipt), /not ordered/);
});

test(
  'observes localhost through genuine Google Chrome CDP with webdriver false',
  {
    skip: process.env.OKF_GENUINE_CHROME_TEST !== '1',
    timeout: 45_000
  },
  async () => {
    const temporary = await mkdtemp(`${tmpdir()}/okf-chrome-observer-test-`);
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(
        '<!doctype html><title>Genuine Chrome fixture</title>' +
          '<main>Verified genuine browser identity</main>'
      );
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const requestedUrl = `http://127.0.0.1:${address.port}/source`;
    const journeyPath = join(temporary, 'journeys.json');
    const outputPath = join(temporary, 'receipt.json');
    await writeFile(
      journeyPath,
      JSON.stringify({
        journeys: [
          {
            id: 'journey-publication',
            actions: [
              action(1, requestedUrl, 'Verified genuine browser identity')
            ]
          }
        ]
      })
    );
    try {
      await main([
        journeyPath,
        outputPath,
        '--chrome',
        process.env.CHROME_PATH ||
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '--timeout-ms',
        '15000'
      ]);
      const receipt = JSON.parse(await readFile(outputPath, 'utf8'));
      assert.equal(receipt.browser.webdriver, false);
      assert.equal(receipt.records[0].response_status, 200);
      assert.equal(receipt.records[0].final_url, requestedUrl);
      assert.match(
        receipt.records[0].identity_excerpt,
        /Verified genuine browser identity/
      );
    } finally {
      server.close();
      await once(server, 'close');
      await rm(temporary, { recursive: true, force: true });
    }
  }
);
