import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

test('built learner hub is static, small and split from Explorer', async () => {
  const root = await readFile(new URL('../build/index.html', import.meta.url), 'utf8');
  const explorer = await stat(new URL('../build/explore/index.html', import.meta.url));
  const explorerHtml = await readFile(new URL('../build/explore/index.html', import.meta.url), 'utf8');

  assert.match(root, /Use knowledge you can inspect <em>with your AI<\/em>/);
  assert.match(root, /docs\/project-studio\/index\.html/);
  assert.match(root, /Open worked example/);
  assert.match(root, /DWP learning paths/);
  assert.match(root, /okf-dwp%2Fmain%2Fcombined%2Fokf-explorer/);
  assert.match(root, /docs\/onboarding\/try-a-bundle\.html/);
  assert.match(root, /docs\/onboarding\/first-bundle\.html/);
  assert.match(root, /okf-heritage-coventry-warwickshire%2Ftiny%2Fokf-explorer\.json/);
  assert.match(root, /#asset%2F1342941/);
  assert.match(root, /application\/ld\+json/);
  assert.match(root, /"learningResourceType"/);
  assert.ok(Buffer.byteLength(root) < 40_000, 'root HTML must remain below 40 KB');
  assert.ok(explorer.isFile(), 'Explorer must be emitted as /explore/index.html');
  // Router indexes change when routes are added. Inspect the emitted page's
  // final node preload (after its layouts), rather than assuming a node number.
  const explorerPageModule = [...explorerHtml.matchAll(/nodes\/\d+\.[A-Za-z0-9_-]+\.js/g)].at(-1)?.[0];
  assert.ok(explorerPageModule, 'Explorer must declare a page module');
  assert.ok(!root.includes(explorerPageModule), 'learner hub must not preload the Explorer page module');
});

test('landing-page bundle projection matches the governed registry', async () => {
  const governed = JSON.parse(await readFile(new URL('../static/okf-registry.json', import.meta.url), 'utf8'));
  const source = await readFile(new URL('../src/lib/learning-registry.ts', import.meta.url), 'utf8');
  const projection = JSON.parse(source.split('export const learningRegistry: BundleRegistryEntry[] = ')[1].replace(/;\s*$/, ''));
  const fields = ['id', 'title', 'description', 'kind', 'status', 'version', 'url', 'home_url'];
  assert.deepEqual(projection, governed.bundles.map(bundle => Object.fromEntries(
    fields.filter(key => key in bundle).map(key => [key, bundle[key]])
  )));
  const catalogue = JSON.parse(await readFile(new URL('../src/lib/learning-catalogue.json', import.meta.url), 'utf8'));
  assert.equal(catalogue.filter(entry => entry.featured).length, 4);
  assert.equal(catalogue.find(entry => entry.id === 'government-evidence').kind, 'application');
  assert.deepEqual(catalogue.filter(entry => entry.kind === 'bundle').map(entry => entry.bundle_id).sort(),
    governed.bundles.map(bundle => bundle.id.split('/').at(-1)).sort());
});
