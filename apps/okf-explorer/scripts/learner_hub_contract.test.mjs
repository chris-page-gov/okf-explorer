import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

test('built learner hub is static, small and split from Explorer', async () => {
  const root = await readFile(new URL('../build/index.html', import.meta.url), 'utf8');
  const explorer = await stat(new URL('../build/explore/index.html', import.meta.url));

  assert.match(root, /Build a knowledge base <em>your AI can trust<\/em>/);
  assert.match(root, /docs\/project-studio\/index\.html/);
  assert.match(root, /Open worked example/);
  assert.match(root, /okf-heritage-coventry-warwickshire%2Ftiny%2Fokf-explorer\.json/);
  assert.match(root, /#asset%2F1342941/);
  assert.match(root, /application\/ld\+json/);
  assert.match(root, /"learningResourceType"/);
  assert.ok(Buffer.byteLength(root) < 40_000, 'root HTML must remain below 40 KB');
  assert.ok(explorer.isFile(), 'Explorer must be emitted as /explore/index.html');
  assert.doesNotMatch(root, /nodes\/4\.[A-Za-z0-9_-]+\.js/);
});

test('landing-page bundle projection matches the governed registry', async () => {
  const governed = JSON.parse(await readFile(new URL('../static/okf-registry.json', import.meta.url), 'utf8'));
  const source = await readFile(new URL('../src/lib/learning-registry.ts', import.meta.url), 'utf8');
  for (const bundle of governed.bundles) {
    for (const key of ['id', 'title', 'description', 'kind', 'version', 'url', 'home_url']) {
      assert.ok(source.includes(bundle[key]), `landing projection must contain ${bundle.id} ${key}`);
    }
    if (bundle.status) assert.ok(source.includes(bundle.status), `landing projection must contain ${bundle.id} status`);
  }
});
