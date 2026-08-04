import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import {
  JOURNEY_GROUP_SUITES,
  PLAN_SCHEMA,
  TEST_TAG_SUITES,
  buildBrowserPlan,
  parseJsonStringList
} from './run_impacted_browser_tests.mjs';

test('every declared Foundry selector has an executable browser mapping', () => {
  const profile = YAML.parse(
    readFileSync(
      new URL(
        '../../../evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml',
        import.meta.url
      ),
      'utf8'
    )
  );
  const rules = profile.impact_policy.path_rules;
  const declaredGroups = [
    ...new Set(rules.flatMap((rule) => rule.journey_groups ?? []))
  ].sort();
  const declaredTags = [
    ...new Set(rules.flatMap((rule) => rule.test_tags ?? []))
  ].sort();
  assert.deepEqual(Object.keys(JOURNEY_GROUP_SUITES).sort(), declaredGroups);
  assert.deepEqual(Object.keys(TEST_TAG_SUITES).sort(), declaredTags);
  for (const suites of [
    ...Object.values(JOURNEY_GROUP_SUITES),
    ...Object.values(TEST_TAG_SUITES)
  ]) {
    assert.ok(suites.length > 0);
  }
});

test('search selectors resolve only the relevant Chromium UI suites', () => {
  const plan = buildBrowserPlan({
    testTags: ['alias'],
    journeyGroups: ['search']
  });
  assert.equal(plan.schema, PLAN_SCHEMA);
  assert.equal(plan.mode, 'targeted');
  assert.equal(plan.requires_site, false);
  assert.deepEqual(plan.engines, ['chrome']);
  assert.deepEqual(
    plan.suites.map((suite) => suite.id),
    ['facets', 'small_bundle', 'large_corpus']
  );
  assert.equal(plan.commands.length, 1);
  assert.equal(plan.commands[0].family, 'ui');
  assert.ok(plan.commands[0].args.includes('--project=chrome'));
});

test('publication selectors include rendered Foundry pages and request Site assembly', () => {
  const plan = buildBrowserPlan({
    testTags: ['markdown'],
    journeyGroups: ['publication']
  });
  assert.equal(plan.requires_site, true);
  assert.deepEqual(
    plan.suites.map((suite) => suite.id),
    ['accessibility', 'foundry_pages']
  );
  assert.deepEqual(plan.commands.map((command) => command.family), ['ui', 'foundry']);
  assert.ok(
    plan.commands[1].args.includes('--config=playwright.foundry.config.ts')
  );
});

test('full terminal assurance covers both suite families in all three engines', () => {
  const plan = buildBrowserPlan({
    full: true,
    engines: ['chrome', 'firefox', 'webkit']
  });
  assert.equal(plan.mode, 'full');
  assert.equal(plan.requires_site, true);
  assert.equal(plan.suites.length, 7);
  assert.deepEqual(plan.commands.map((command) => command.family), ['ui', 'foundry']);
  for (const command of plan.commands) {
    for (const engine of ['chrome', 'firefox', 'webkit']) {
      assert.ok(command.args.includes(`--project=${engine}`));
    }
  }
});

test('empty and unknown selectors fail closed instead of silently skipping', () => {
  const empty = buildBrowserPlan();
  assert.equal(empty.mode, 'fail-closed-full');
  assert.equal(empty.suites.length, 7);
  assert.throws(
    () => buildBrowserPlan({ testTags: ['new-unmapped-tag'] }),
    /unknown test tag/
  );
  assert.throws(
    () => buildBrowserPlan({ journeyGroups: ['new-unmapped-group'] }),
    /unknown journey group/
  );
});

test('selector JSON must be an array of strings', () => {
  assert.deepEqual(parseJsonStringList('["search","search"]', 'tags'), ['search']);
  assert.throws(() => parseJsonStringList('{', 'tags'), /must be a JSON array/);
  assert.throws(() => parseJsonStringList('[1]', 'tags'), /array of strings/);
});

test('plan-only CLI publishes the conditional Site decision for CI', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'okf-browser-plan-'));
  try {
    const output = path.join(temporary, 'github-output.txt');
    const script = fileURLToPath(
      new URL('./run_impacted_browser_tests.mjs', import.meta.url)
    );
    const result = spawnSync(
      process.execPath,
      [script, '--plan', '--github-output', output],
      {
        env: {
          ...process.env,
          IMPACT_TEST_TAGS: '["markdown"]',
          IMPACT_JOURNEY_GROUPS: '["publication"]'
        },
        encoding: 'utf8'
      }
    );
    assert.equal(result.status, 0, result.stderr);
    const githubOutput = readFileSync(output, 'utf8');
    assert.match(githubOutput, /^requires_site=true$/m);
    assert.match(githubOutput, /^mode=targeted$/m);
    assert.match(githubOutput, /foundry_pages/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
