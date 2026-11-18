import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

import {
  isCredentialFreeAbsoluteHttpUrl, waitForRankedResult
} from '../apps/okf-explorer/scripts/external_bundle_acceptance_contract.mjs';

const require = createRequire(new URL('../apps/okf-explorer/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const { values } = parseArgs({ options: {
  app: { type: 'string' }, bundle: { type: 'string' }, query: { type: 'string' },
  expected: { type: 'string' }, output: { type: 'string' }
} });
for (const key of ['app', 'bundle', 'expected']) {
  if (!isCredentialFreeAbsoluteHttpUrl(values[key])) throw new Error(`--${key} requires an absolute URL`);
}
if (!values.query?.trim() || !values.output) throw new Error('--query and --output are required');

const app = new URL(values.app);
const bundle = new URL(values.bundle);
const appRoot = new URL('../', app);
const bundleRoot = new URL('.', bundle);
const pageUrl = new URL(app);
pageUrl.searchParams.set('bundle', bundle.href);
pageUrl.searchParams.set('q', values.query);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

const browser = await chromium.launch({ channel: 'chrome' });
const runs = [];
try {
  for (let index = 0; index < 3; index += 1) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const responses = [];
    context.on('response', response => {
      if (!response.ok()) return;
      const url = new URL(response.url());
      if (url.href.startsWith(appRoot.href) || url.href.startsWith(bundleRoot.href)) {
        responses.push(response.body()
          .then(body => ({ url: url.href, sha256: digest(body) }))
          .catch(() => ({ url: url.href, sha256: null })));
      }
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      await page.goto(pageUrl.href);
      const first = await waitForRankedResult(page, values.expected, { includeOrderedUrls: true });
      // Observe two rendered frames after settlement to detect an intervening
      // rerender without extending the app's search timeout.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const final = await waitForRankedResult(page, values.expected, { includeOrderedUrls: true });
      const inputs = (await Promise.all(responses))
        .sort((left, right) => left.url.localeCompare(right.url) || String(left.sha256).localeCompare(String(right.sha256)));
      runs.push({ first: first.ordered_canonical_urls, final: final.ordered_canonical_urls, inputs });
    } finally {
      await context.close();
    }
  }
  const identical = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const sameInputs = runs.every(run =>
    run.inputs.length > 0 && run.inputs.every(input => input.sha256) && identical(run.inputs, runs[0].inputs));
  const stable = runs.every(run => identical(run.first, run.final) && identical(run.final, runs[0].final));
  const result = {
    browser: browser.version(), query: values.query, expected: values.expected,
    same_inputs: sameInputs, stable_order_in_observed_runs: sameInputs ? stable : null,
    observed_ranks: runs.map(run => run.final.indexOf(values.expected) + 1), runs
  };
  await writeFile(values.output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ sameInputs, stable, ranks: result.observed_ranks }));
  if (!sameInputs || !stable) process.exitCode = 1;
} finally {
  await browser.close();
}
