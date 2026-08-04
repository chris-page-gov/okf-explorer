#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PLAN_SCHEMA = 'okf-impacted-browser-plan.v1';

const SUITES = {
  accessibility: {
    family: 'ui',
    file: 'tests/ui/accessibility.spec.ts'
  },
  federation: {
    family: 'ui',
    file: 'tests/ui/federation-overview.spec.ts'
  },
  map: {
    family: 'ui',
    file: 'tests/ui/geospatial-map.spec.ts'
  },
  facets: {
    family: 'ui',
    file: 'tests/ui/large-corpus-facets.spec.ts'
  },
  small_bundle: {
    family: 'ui',
    file: 'tests/ui/small-bundle-content.spec.ts'
  },
  large_corpus: {
    family: 'ui',
    file: 'tests/ui/targeted-large-corpus.spec.ts'
  },
  foundry_pages: {
    family: 'foundry',
    file: 'tests/foundry/foundry-docs.spec.ts'
  }
};

const SUITE_ORDER = Object.freeze(Object.keys(SUITES));
const ALL_UI = Object.freeze(SUITE_ORDER.filter((id) => SUITES[id].family === 'ui'));
const ALL_SUITES = Object.freeze([...SUITE_ORDER]);
const THREE_ENGINES = Object.freeze(['chrome', 'firefox', 'webkit']);

// These selectors are the executable consumer-side interpretation of the
// Evaluation Foundry profile. Additions to that profile intentionally fail
// until they are assigned an assurance surface here.
export const JOURNEY_GROUP_SUITES = Object.freeze({
  control: ['small_bundle', 'foundry_pages'],
  graph: ['small_bundle', 'large_corpus', 'federation'],
  links: ['small_bundle', 'large_corpus', 'federation'],
  map: ['map', 'large_corpus'],
  publication: ['accessibility', 'foundry_pages'],
  reader: ['small_bundle', 'facets', 'large_corpus'],
  search: ['small_bundle', 'facets', 'large_corpus'],
  timeline: ['small_bundle', 'large_corpus']
});

export const TEST_TAG_SUITES = Object.freeze({
  accessibility: ['accessibility', 'small_bundle', 'map', 'foundry_pages'],
  adversarial: ['small_bundle', 'large_corpus', 'foundry_pages'],
  alias: ['large_corpus', 'facets'],
  browser: ALL_SUITES,
  consumer: ALL_UI,
  contract: ['small_bundle', 'foundry_pages'],
  data: ['small_bundle', 'large_corpus', 'map'],
  denominator: ['large_corpus', 'facets'],
  descriptor: ['small_bundle', 'foundry_pages'],
  determinism: ['small_bundle'],
  digest: ['small_bundle'],
  evidence: ['small_bundle', 'foundry_pages'],
  graph: ['small_bundle', 'large_corpus', 'federation'],
  impact: ['foundry_pages'],
  journey: ['large_corpus', 'foundry_pages'],
  'json-ld': ['small_bundle', 'federation'],
  link: ['small_bundle', 'federation', 'foundry_pages'],
  manifest: ['small_bundle'],
  mapping: ['small_bundle', 'large_corpus'],
  markdown: ['foundry_pages'],
  misspelling: ['large_corpus', 'facets'],
  presentation: ['accessibility', 'foundry_pages'],
  producer: ['small_bundle', 'large_corpus'],
  profile: ['foundry_pages'],
  provenance: ['small_bundle', 'large_corpus', 'foundry_pages'],
  python: ['foundry_pages'],
  question: ['large_corpus'],
  registry: ['small_bundle', 'foundry_pages'],
  relationship: ['small_bundle', 'large_corpus', 'federation'],
  release: ['foundry_pages'],
  repository: ['foundry_pages'],
  route: ['foundry_pages'],
  runtime: ALL_UI,
  search: ['small_bundle', 'facets', 'large_corpus'],
  site: ['foundry_pages'],
  source: ['small_bundle', 'large_corpus'],
  validator: ['foundry_pages'],
  workflow: ['foundry_pages'],
  'yaml-ld': ['small_bundle', 'federation', 'foundry_pages']
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseJsonStringList(value, label) {
  let parsed;
  try {
    parsed = JSON.parse(value ?? '[]');
  } catch (error) {
    throw new Error(`${label} must be a JSON array: ${error.message}`);
  }
  invariant(
    Array.isArray(parsed) && parsed.every((item) => typeof item === 'string'),
    `${label} must be a JSON array of strings`
  );
  return [...new Set(parsed)].sort();
}

function selectedSuites(values, mapping, label) {
  const unknown = values.filter((value) => !Object.hasOwn(mapping, value));
  invariant(
    unknown.length === 0,
    `unknown ${label}: ${unknown.join(', ')}`
  );
  const selected = values.flatMap((value) => mapping[value]);
  const unknownSuites = selected.filter((suite) => !Object.hasOwn(SUITES, suite));
  invariant(
    unknownSuites.length === 0,
    `${label} map to unknown suite(s): ${unknownSuites.join(', ')}`
  );
  return selected;
}

function validateEngines(engines) {
  const unknown = engines.filter((engine) => !THREE_ENGINES.includes(engine));
  invariant(unknown.length === 0, `unknown browser engine: ${unknown.join(', ')}`);
  invariant(engines.length > 0, 'at least one browser engine must be selected');
}

function commandForFamily(family, suites, engines) {
  const files = suites
    .filter((suite) => suite.family === family)
    .map((suite) => suite.file);
  if (files.length === 0) return null;
  const args = ['exec', 'playwright', 'test'];
  if (family === 'foundry') {
    args.push('--config=playwright.foundry.config.ts');
  }
  args.push(...files, ...engines.map((engine) => `--project=${engine}`));
  return {
    family,
    executable: 'pnpm',
    args
  };
}

export function buildBrowserPlan({
  testTags = [],
  journeyGroups = [],
  engines = ['chrome'],
  full = false
} = {}) {
  validateEngines(engines);
  const canonicalTags = [...new Set(testTags)].sort();
  const canonicalGroups = [...new Set(journeyGroups)].sort();
  const tagSuites = selectedSuites(
    canonicalTags,
    TEST_TAG_SUITES,
    'test tag(s)'
  );
  const groupSuites = selectedSuites(
    canonicalGroups,
    JOURNEY_GROUP_SUITES,
    'journey group(s)'
  );
  const fallbackFull = !full && canonicalTags.length === 0 && canonicalGroups.length === 0;
  const suiteIds = full || fallbackFull
    ? ALL_SUITES
    : [...tagSuites, ...groupSuites];
  const selectedIds = SUITE_ORDER.filter((id) => new Set(suiteIds).has(id));
  invariant(selectedIds.length > 0, 'browser selectors resolved to no assurance suites');
  const suites = selectedIds.map((id) => ({ id, ...SUITES[id] }));
  const commands = ['ui', 'foundry']
    .map((family) => commandForFamily(family, suites, engines))
    .filter(Boolean);
  return {
    schema: PLAN_SCHEMA,
    mode: full ? 'full' : fallbackFull ? 'fail-closed-full' : 'targeted',
    selectors: {
      test_tags: canonicalTags,
      journey_groups: canonicalGroups
    },
    engines: [...engines],
    requires_site: suites.some((suite) => suite.family === 'foundry'),
    suites,
    commands
  };
}

function parseArgs(argv, env) {
  const options = {
    testTagsJson: env.IMPACT_TEST_TAGS ?? '[]',
    journeyGroupsJson: env.IMPACT_JOURNEY_GROUPS ?? '[]',
    enginesJson: null,
    full: false,
    planOnly: false,
    githubOutput: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--test-tags-json') options.testTagsJson = argv[++index];
    else if (argument === '--journey-groups-json') options.journeyGroupsJson = argv[++index];
    else if (argument === '--engines-json') options.enginesJson = argv[++index];
    else if (argument === '--full') options.full = true;
    else if (argument === '--plan') options.planOnly = true;
    else if (argument === '--github-output') options.githubOutput = argv[++index];
    else if (argument === '--help' || argument === '-h') {
      process.stdout.write(
        'Usage: node scripts/run_impacted_browser_tests.mjs [--full] [--plan] ' +
        '[--test-tags-json JSON] [--journey-groups-json JSON] [--engines-json JSON] ' +
        '[--github-output PATH]\n'
      );
      return null;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function writeGitHubOutput(outputPath, plan) {
  if (!outputPath) return;
  appendFileSync(
    outputPath,
    [
      `requires_site=${String(plan.requires_site)}`,
      `mode=${plan.mode}`,
      `suite_ids=${JSON.stringify(plan.suites.map((suite) => suite.id))}`
    ].join('\n') + '\n',
    'utf8'
  );
}

export function runPlan(plan, { cwd = process.cwd(), env = process.env } = {}) {
  for (const command of plan.commands) {
    process.stdout.write(
      `running ${command.family} browser assurance: ${command.executable} ${command.args.join(' ')}\n`
    );
    const result = spawnSync(command.executable, command.args, {
      cwd,
      env,
      stdio: 'inherit'
    });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv, env);
  if (!options) return 0;
  const testTags = parseJsonStringList(options.testTagsJson, 'test tags');
  const journeyGroups = parseJsonStringList(
    options.journeyGroupsJson,
    'journey groups'
  );
  const engines = options.enginesJson
    ? parseJsonStringList(options.enginesJson, 'browser engines')
    : options.full
      ? [...THREE_ENGINES]
      : ['chrome'];
  const plan = buildBrowserPlan({
    testTags,
    journeyGroups,
    engines,
    full: options.full
  });
  process.stdout.write(`${JSON.stringify(plan)}\n`);
  writeGitHubOutput(options.githubOutput, plan);
  return options.planOnly ? 0 : runPlan(plan);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
