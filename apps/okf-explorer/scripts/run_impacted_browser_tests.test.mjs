import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
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
    ['ask_okf', 'facets', 'conceptual_navigation', 'small_bundle', 'large_corpus']
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
    [
      'accessibility',
      'ask_okf',
      'evidence_workbench',
      'exploratory_publication',
      'learner_hub',
      'beginner_navigation',
      'foundry_pages'
    ]
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
  assert.equal(plan.suites.length, 18);
  const declaredUiFiles = readdirSync(new URL('../tests/ui/', import.meta.url))
    .filter((name) => name.endsWith('.spec.ts')).map((name) => `tests/ui/${name}`).sort();
  assert.deepEqual(plan.suites.filter((suite) => suite.family === 'ui').map((suite) => suite.file).sort(), declaredUiFiles);
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
  assert.equal(empty.suites.length, 18);
  assert.ok(empty.commands.some((command) => command.args.includes('tests/ui/ask-okf.spec.ts')));
  assert.throws(
    () => buildBrowserPlan({ testTags: ['new-unmapped-tag'] }),
    /unknown test tag/
  );
  assert.throws(
    () => buildBrowserPlan({ journeyGroups: ['new-unmapped-group'] }),
    /unknown journey group/
  );
});

test('Ask OKF is selected for governed evidence and interaction changes', () => {
  for (const tag of ['consumer', 'runtime', 'accessibility', 'adversarial', 'contract', 'digest', 'evidence', 'presentation', 'provenance', 'question']) {
    const plan = buildBrowserPlan({ testTags: [tag] });
    assert.ok(plan.commands.some((command) => command.args.includes('tests/ui/ask-okf.spec.ts')), `${tag} must select Ask OKF`);
  }
  for (const group of ['reader', 'search', 'publication']) {
    const plan = buildBrowserPlan({ journeyGroups: [group] });
    assert.ok(plan.commands.some((command) => command.args.includes('tests/ui/ask-okf.spec.ts')), `${group} must select Ask OKF`);
  }
});

test('Timeline provenance is selected by its temporal and provenance surfaces', () => {
  for (const selectors of [{ journeyGroups: ['timeline'] }, { testTags: ['provenance'] }]) {
    const plan = buildBrowserPlan(selectors);
    assert.ok(plan.commands.some((command) => command.args.includes('tests/ui/timeline-provenance.spec.ts')));
  }
});

test('relationship windows and graph or Links changes select pagination assurance', () => {
  for (const selectors of [
    ...['graph', 'links'].map((group) => ({ journeyGroups: [group] })),
    ...['graph', 'relationship', 'link', 'accessibility', 'presentation', 'runtime', 'consumer']
      .map((tag) => ({ testTags: [tag] }))
  ]) {
    const plan = buildBrowserPlan(selectors);
    assert.ok(plan.commands.some((command) => command.args.includes('tests/ui/relationship-pagination.spec.ts')),
      `${JSON.stringify(selectors)} must select relationship pagination`);
  }

  const profile = YAML.parse(readFileSync(new URL(
    '../../../evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml', import.meta.url), 'utf8'));
  const runtime = profile.impact_policy.path_rules.find((rule) => rule.id === 'IMPACT-EXPLORER-RUNTIME');
  const pathPrefix = 'apps/okf-explorer/src/';
  assert.ok(runtime.patterns.includes(`${pathPrefix}**`));
  for (const filename of [
    'apps/okf-explorer/src/lib/viewer/relationshipWindows.ts',
    'apps/okf-explorer/src/routes/explore/+page.svelte'
  ]) assert.ok(filename.startsWith(pathPrefix), `${filename} must remain in the governed runtime rule`);
  const runtimePlan = buildBrowserPlan({ testTags: runtime.test_tags, journeyGroups: runtime.journey_groups });
  assert.ok(runtimePlan.suites.some((suite) => suite.id === 'relationship_pagination'));
  assert.ok(runtime.jobs.includes('browser_full'));
});

test('learning-path navigation is selected by its publication and quality surfaces', () => {
  const publication = buildBrowserPlan({ journeyGroups: ['publication'] });
  assert.ok(
    publication.suites.some((suite) => suite.id === 'beginner_navigation')
  );

  for (const tag of ['accessibility', 'presentation', 'route', 'site']) {
    const plan = buildBrowserPlan({ testTags: [tag] });
    assert.ok(
      plan.suites.some((suite) => suite.id === 'beginner_navigation'),
      `${tag} must select beginner_navigation`
    );
  }
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

test('Reader changes include learning path assurance', () => {
  assert.ok(buildBrowserPlan({ journeyGroups: ['reader'] }).suites.some(suite => suite.id === 'learning_path'));
});
