// Verify one catalogue entry through ordinary HTTPS navigations in Chrome.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const directory = JSON.parse(readFileSync(new URL('../../../registry/public-bundle-access.json', import.meta.url)));
const repository = process.argv[2] || 'okf-explorer';
const entry = directory.bundles.find(item => item.repository.endsWith('/' + repository));
assert.ok(entry?.agent_graph, 'No graph link recorded for this public repository');
const graphLink = entry.agent_graph;
const rawRoot = 'https://raw.githubusercontent.com/' + new URL(entry.repository).pathname.slice(1) + '/' + graphLink.commit + '/';
assert.match(graphLink.commit, /^[0-9a-f]{40}$/);
assert.ok(graphLink.url.startsWith(rawRoot));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  async function visit(url) {
    const response = await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    assert.equal(response.url(), url);
    return response.body();
  }

  const bytes = await visit(graphLink.url);
  assert.equal(bytes.length, graphLink.bytes);
  assert.equal(sha256(bytes), graphLink.sha256);
  const graph = JSON.parse(bytes);
  assert.equal(graph['@id'], graphLink.bundle_id);
  const rows = graph['@graph'];
  const assertions = rows.filter(row => row['@type']?.includes('RelationshipAssertion'));
  const assertion = assertions.find(row => row.evidence?.some(item => item.source_artifact && item.source_sha256));
  assert.ok(assertion, 'Expected a relationship with source evidence');
  const ids = new Set(rows.map(row => row['@id']));
  for (const key of ['source', 'target']) assert.ok(ids.has(assertion[key]['@id']), 'Unresolved ' + key);
  const evidence = assertion.evidence.find(item => item.source_artifact && item.source_sha256);
  const sourceUrl = new URL(evidence.source_artifact, rawRoot).href;
  assert.ok(sourceUrl.startsWith(rawRoot), 'Evidence must belong to the pinned repository');
  const sourceBytes = await visit(sourceUrl);
  assert.equal(sha256(sourceBytes), evidence.source_sha256);
  console.log(JSON.stringify({ checked_at: new Date().toISOString(), browser: browser.version(),
    graph: graphLink.url, sha256: graphLink.sha256, entities: rows.length - assertions.length,
    assertions: assertions.length, assertion: assertion['@id'], predicate: assertion.predicate['@id'],
    source: sourceUrl, source_sha256: evidence.source_sha256 }, null, 2));
} finally {
  await browser.close();
}
