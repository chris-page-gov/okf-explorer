import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore -- JavaScript verification helper, independent of production runtime.
import { createPacedFetch } from '../scripts/paced-fetch.mjs';

test('verification pacing spaces concurrent starts and preserves exact responses', async () => {
  let time = 0;
  const starts: number[] = [];
  const responses = [new Response('first'), new Response('rate limited', { status: 429 }), new Response('last')];
  const paced = createPacedFetch(async () => { starts.push(time); return responses[starts.length - 1]; }, {
    now: () => time, sleep: async (ms: number) => { time += ms; }
  });
  const results = await Promise.all([paced.fetch('one'), paced.fetch('two'), paced.fetch('three')]);
  assert.deepEqual(starts, [0, 750, 1500]);
  results.forEach((result: Response, i: number) => assert.strictEqual(result, responses[i]));
  assert.deepEqual(paced.receipt, { interval_ms: 750, request_count: 3, minimum_observed_interval_ms: 750,
    automatic_retries: 0, network_failures: 0, response_status_counts: { 200: 2, 429: 1 } });
});

test('verification pacing preserves a network failure without retry or raw error logging', async () => {
  const error = new Error('private detail');
  let calls = 0;
  const paced = createPacedFetch(async () => { calls++; throw error; });
  await assert.rejects(paced.fetch('private input'), (caught: unknown) => caught === error);
  assert.equal(calls, 1);
  assert.equal(paced.receipt.network_failures, 1);
  assert.ok(!JSON.stringify(paced.receipt).includes('private'));
  for (const interval_ms of [0, 749, 750.5, 60001, NaN]) {
    assert.throws(() => createPacedFetch(fetch, { interval_ms }), /Verification pacing/);
  }
});
