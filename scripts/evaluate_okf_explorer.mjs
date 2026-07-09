#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const require = createRequire(import.meta.url);

const DEFAULT_SUITE = 'evaluation/okf-explorer/questions.json';
const DEFAULT_VISUALS = 'evaluation/okf-explorer/visual-regressions.json';
const DEFAULT_OUT = 'evaluation/okf-explorer/results/latest';
const DEFAULT_BASE_URL = 'http://127.0.0.1:8002/next/';
const DEFAULT_BUNDLE = '/uk-government-apis/okf-explorer.json';
const SECRET_PATTERN = /\b(api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd|bearer)\s*[=:]\s*[^&\s]+/i;
const RAW_GAP_PATTERN = /\b(None|null|undefined)\b/;

function parseArgs(argv) {
  const options = {
    suite: DEFAULT_SUITE,
    visual: DEFAULT_VISUALS,
    out: DEFAULT_OUT,
    baseUrl: DEFAULT_BASE_URL,
    bundle: DEFAULT_BUNDLE,
    limit: 100,
    noBrowser: false,
    headed: false,
    bundleExplicit: false,
    outExplicit: false,
    visualExplicit: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--suite') options.suite = argv[++index];
    else if (arg === '--visual') {
      options.visual = argv[++index];
      options.visualExplicit = true;
    }
    else if (arg === '--out') {
      options.out = argv[++index];
      options.outExplicit = true;
    }
    else if (arg === '--base-url') options.baseUrl = argv[++index];
    else if (arg === '--bundle') {
      options.bundle = argv[++index];
      options.bundleExplicit = true;
    }
    else if (arg === '--limit') options.limit = Number(argv[++index]);
    else if (arg === '--no-browser') options.noBrowser = true;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(options.limit) || options.limit < 1) options.limit = 100;
  options.suite = resolveRepoPath(options.suite);
  options.visual = resolveRepoPath(options.visual);
  options.out = resolveRepoPath(options.out);
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/evaluate_okf_explorer.mjs [options]

Options:
  --base-url <url>   OKF Explorer URL, default ${DEFAULT_BASE_URL}
  --bundle <path>    Bundle URL/path to pass to the Explorer, default ${DEFAULT_BUNDLE}
  --suite <path>     Question suite JSON, default ${DEFAULT_SUITE}
  --visual <path>    Visual regression manifest, default ${DEFAULT_VISUALS}
  --limit <n>        Number of questions to run, default 100
  --out <path>       Output directory, default ${DEFAULT_OUT}
  --no-browser       Validate suite/manifests without launching Playwright
  --headed           Run browser headed
`);
}

function resolveRepoPath(value) {
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateSuite(suite) {
  if (suite.schema !== 'okf-explorer-evaluation-suite.v1') throw new Error(`Unexpected suite schema: ${suite.schema}`);
  if (!Array.isArray(suite.questions) || suite.questions.length !== 100) throw new Error('Evaluation suite must contain exactly 100 questions.');
  const ids = new Set();
  for (const question of suite.questions) {
    if (!question.id || ids.has(question.id)) throw new Error(`Duplicate or missing question id: ${question.id}`);
    ids.add(question.id);
    if (!question.query || !question.intent) throw new Error(`Question ${question.id} must have query and intent.`);
    if (!Array.isArray(question.expected_terms) || !question.expected_terms.length) {
      throw new Error(`Question ${question.id} must have expected_terms.`);
    }
  }
  const total = Object.values(suite.rubric || {}).reduce((sum, part) => sum + Number(part.points || 0), 0);
  if (total !== 100) throw new Error(`Rubric must total 100 points, found ${total}.`);
}

function validateVisuals(visuals, visualPath) {
  if (visuals.schema !== 'okf-explorer-visual-regressions.v1') throw new Error(`Unexpected visual schema: ${visuals.schema}`);
  if (!Array.isArray(visuals.items)) throw new Error('Visual regression manifest must contain items.');
  const baseDir = path.dirname(visualPath);
  for (const item of visuals.items) {
    if (!item.id || !item.image || !item.comment) throw new Error('Every visual regression item needs id, image and comment.');
    const imagePath = path.join(baseDir, item.image);
    if (!fs.existsSync(imagePath)) throw new Error(`Visual regression image missing: ${imagePath}`);
  }
}

function loadPlaywright() {
  const moduleName = process.env.PLAYWRIGHT_PACKAGE || 'playwright';
  try {
    return require(moduleName);
  } catch (error) {
    throw new Error(`Playwright is not available as "${moduleName}". Install it or set PLAYWRIGHT_PACKAGE to an installed playwright module path. Original error: ${error.message}`);
  }
}

function buildUrl(baseUrl, bundle, query) {
  const url = new URL(baseUrl);
  url.searchParams.set('bundle', bundle);
  url.searchParams.set('q', query);
  return url.toString();
}

function includesAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(String(term).toLowerCase()));
}

function countTerms(text, terms) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(String(term).toLowerCase())).length;
}

function scoreQuestion(question, observation) {
  const text = `${observation.mainText}\n${observation.detailText}\n${observation.bodyText}`;
  const expectedMatches = countTerms(text, question.expected_terms);
  const expectedRatio = expectedMatches / Math.max(question.expected_terms.length, 1);
  const expectedMin = Number(question.expected_min_results ?? 1);
  const hasExpectedResults = expectedMin === 0 ? observation.resultCount >= 0 : observation.resultCount >= expectedMin;
  const hasRoute = Boolean(observation.hash || observation.detailText.match(/\bRoute\b/i));
  const metadataTerms = ['Provider', 'Record type', 'Source', 'Protocol'].filter((term) => text.includes(term)).length;
  const hasSearchStatus = /Search Results|shown|No results|Searching static index|Preparing static search index/i.test(observation.mainText);
  const hasDetailBasics = Boolean(observation.detailTitle) && observation.detailText.length > 80;
  const hasLicenceAccess = /Licence|License|Access model|Contract status|Confidence/i.test(observation.detailText);
  const noRawGaps = !RAW_GAP_PATTERN.test(observation.detailText);
  const hasFollowOn = observation.chipCount > 0 || /Copy route|Graph|Pin|Load full relationships/i.test(observation.detailText);
  const notLoadingStuck = !/Loading bundle|Searching static index|Preparing static search index/i.test(observation.bodyText) || observation.resultCount > 0 || hasDetailBasics;
  const namedControls = observation.emptyButtonCount === 0 && observation.emptyLinkCount === 0;
  const hasLandmarks = observation.landmarkCount >= 3;
  const hasLiveStatus = observation.liveRegionCount >= 1;
  const hasFocusableControls = observation.focusableCount >= 8;
  const noOverlapFlag = !observation.visualWarnings.length;
  const plainLanguage = /Licence|Access model|Metadata quality|Confidence|Source|Record type/i.test(observation.detailText);
  const provenance = /Source|source_|source url|Documentation|Endpoint URL|Provider/i.test(observation.detailText);
  const qualityExplained = /Explain metadata quality|Explain confidence|Explain licence|Explain evidence count/i.test(observation.bodyText);
  const noSecrets = !SECRET_PATTERN.test(observation.bodyText);

  const score = {
    retrieval: 0,
    display: 0,
    accessibility: 0,
    govuk: 0
  };
  score.retrieval += hasExpectedResults ? 10 : 0;
  score.retrieval += Math.round(expectedRatio * 10);
  score.retrieval += hasSearchStatus ? 5 : 0;
  score.retrieval += hasRoute ? 5 : 0;
  score.retrieval += Math.min(metadataTerms, 4) >= 3 ? 5 : Math.min(metadataTerms, 4);

  score.display += hasDetailBasics ? 5 : 0;
  score.display += hasLicenceAccess ? 5 : 0;
  score.display += noRawGaps ? 5 : 0;
  score.display += hasFollowOn ? 5 : 0;
  score.display += notLoadingStuck ? 5 : 0;

  score.accessibility += namedControls ? 5 : 0;
  score.accessibility += hasLiveStatus ? 5 : 0;
  score.accessibility += hasFocusableControls ? 5 : 0;
  score.accessibility += hasLandmarks && noOverlapFlag ? 5 : Math.min(hasLandmarks ? 3 : 0, 3);

  score.govuk += plainLanguage ? 5 : 0;
  score.govuk += provenance ? 5 : 0;
  score.govuk += /Copy route|Clear search|Load full relationships|Reduce context/i.test(observation.bodyText) ? 5 : 0;
  score.govuk += qualityExplained && noSecrets ? 5 : noSecrets ? 3 : 0;

  const total = score.retrieval + score.display + score.accessibility + score.govuk;
  return {
    ...score,
    total,
    checks: {
      resultCount: observation.resultCount,
      expectedMatches,
      expectedTerms: question.expected_terms,
      hasExpectedResults,
      hasRoute,
      hasDetailBasics,
      noRawGaps,
      namedControls,
      hasLiveStatus,
      hasLandmarks,
      noSecrets,
      visualWarnings: observation.visualWarnings
    }
  };
}

async function observeQuestion(page, options, question) {
  await page.goto(buildUrl(options.baseUrl, options.bundle, question.query), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main', { timeout: 20000 });
  await page.waitForTimeout(500);
  await waitForSettledSearch(page);
  const results = await page.locator('.result-list button, .record-list button, .large-card, [data-route]').count().catch(() => 0);
  const resultButtons = page.locator('.result-list button, .record-list button');
  const firstResultCount = await resultButtons.count().catch(() => 0);
  if (firstResultCount > 0) {
    await resultButtons.first().click();
    await page.waitForTimeout(350);
  }
  await waitForSettledSearch(page);

  return page.evaluate(() => {
    const textOf = (selector) => Array.from(document.querySelectorAll(selector)).map((node) => node.textContent || '').join('\n').trim();
    const accessibleName = (element) => (element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '').trim();
    const buttons = Array.from(document.querySelectorAll('button'));
    const links = Array.from(document.querySelectorAll('a'));
    const blankButtons = buttons.filter((button) => !accessibleName(button));
    const blankLinks = links.filter((link) => !accessibleName(link));
    const detailRoot = document.querySelector('.right-panel') || document.querySelector('aside:last-of-type') || document.body;
    const main = document.querySelector('main') || document.body;
    const detailTitle = detailRoot.querySelector('h1, h2, h3')?.textContent?.trim() || '';
    const graph = document.querySelector('svg.graph');
    const visualWarnings = [];
    if (graph) {
      const labels = Array.from(graph.querySelectorAll('text')).map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
      const nodes = Array.from(graph.querySelectorAll('.node-hit')).map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
      const overlapCount = labels.reduce((count, label) => count + nodes.filter((node) => intersects(label, node)).length, 0);
      if (overlapCount > 12) visualWarnings.push(`high graph label/node overlap count: ${overlapCount}`);
    }
    function intersects(a, b) {
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }
    return {
      bodyText: document.body.innerText,
      mainText: main.innerText,
      detailText: detailRoot.innerText,
      detailTitle,
      resultCount: Math.max(
        document.querySelectorAll('.result-list button, .record-list button').length,
        document.querySelectorAll('.api-card, .dataset-card-ui, .large-card').length
      ),
      chipCount: document.querySelectorAll('.metadata-chip, .chip, .tag-chip').length,
      emptyButtonCount: blankButtons.length,
      emptyLinkCount: blankLinks.length,
      landmarkCount: document.querySelectorAll('header, main, nav, aside, footer, [role="banner"], [role="main"], [role="navigation"], [role="complementary"]').length,
      liveRegionCount: document.querySelectorAll('[aria-live]').length,
      focusableCount: document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length,
      hash: window.location.hash,
      visualWarnings
    };
  });
}

async function waitForSettledSearch(page) {
  await page.waitForFunction(() => {
    const bodyText = document.body.innerText || '';
    return !bodyText.includes('Loading bundle...') && !bodyText.includes('Searching static index...');
  }, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

async function runBrowserEvaluation(options, suite) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: !options.headed });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const questions = suite.questions.slice(0, options.limit);
  const records = [];
  for (const question of questions) {
    const started = Date.now();
    try {
      const observation = await observeQuestion(page, options, question);
      const score = scoreQuestion(question, observation);
      records.push({
        id: question.id,
        query: question.query,
        intent: question.intent,
        tags: question.tags || [],
        score,
        elapsed_ms: Date.now() - started,
        evidence: {
          result_count: observation.resultCount,
          detail_title: observation.detailTitle,
          hash: observation.hash,
          warnings: observation.visualWarnings
        }
      });
      process.stdout.write(`${question.id} ${score.total}/100 ${question.query}\n`);
    } catch (error) {
      records.push({
        id: question.id,
        query: question.query,
        intent: question.intent,
        tags: question.tags || [],
        score: { retrieval: 0, display: 0, accessibility: 0, govuk: 0, total: 0, checks: { error: error.message } },
        elapsed_ms: Date.now() - started,
        evidence: { error: error.message }
      });
      process.stdout.write(`${question.id} 0/100 ${question.query} (${error.message})\n`);
    }
  }
  await browser.close();
  return records;
}

function buildValidationOnlyRecords(options, suite) {
  return suite.questions.slice(0, options.limit).map((question) => ({
    id: question.id,
    query: question.query,
    intent: question.intent,
    tags: question.tags || [],
    score: {
      retrieval: null,
      display: null,
      accessibility: null,
      govuk: null,
      total: null,
      scored: false,
      checks: {
        validation_only: true,
        expected_terms: question.expected_terms,
        expected_min_results: question.expected_min_results ?? 1
      }
    },
    elapsed_ms: 0,
    evidence: {
      validation_only: true,
      expected_terms: question.expected_terms
    }
  }));
}

function summarise(records) {
  const summary = {
    questions_run: records.length,
    questions_scored: 0,
    average_total: 0,
    average_retrieval: 0,
    average_display: 0,
    average_accessibility: 0,
    average_govuk: 0,
    pass_count_80: 0,
    fail_count_below_60: 0
  };
  if (!records.length) return summary;
  for (const record of records) {
    if (!Number.isFinite(record.score.total)) continue;
    summary.questions_scored += 1;
    summary.average_total += record.score.total;
    summary.average_retrieval += record.score.retrieval;
    summary.average_display += record.score.display;
    summary.average_accessibility += record.score.accessibility;
    summary.average_govuk += record.score.govuk;
    if (record.score.total >= 80) summary.pass_count_80 += 1;
    if (record.score.total < 60) summary.fail_count_below_60 += 1;
  }
  if (!summary.questions_scored) {
    summary.average_total = null;
    summary.average_retrieval = null;
    summary.average_display = null;
    summary.average_accessibility = null;
    summary.average_govuk = null;
    return summary;
  }
  for (const key of ['average_total', 'average_retrieval', 'average_display', 'average_accessibility', 'average_govuk']) {
    summary[key] = Number((summary[key] / summary.questions_scored).toFixed(1));
  }
  return summary;
}

function writeReports(options, suite, visuals, records, metadata) {
  fs.mkdirSync(options.out, { recursive: true });
  const summary = summarise(records);
  const payload = {
    schema: 'okf-explorer-evaluation-results.v1',
    generated_at: new Date().toISOString(),
    base_url: options.baseUrl,
    bundle: options.bundle,
    suite: path.relative(repoRoot, options.suite),
    visual_regressions: visuals,
    summary,
    metadata,
    records
  };
  fs.writeFileSync(path.join(options.out, 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(options.out, 'results.md'), renderMarkdown(payload, suite));
  return { summary, files: [path.join(options.out, 'results.json'), path.join(options.out, 'results.md')] };
}

function renderMarkdown(payload, suite) {
  const lines = [];
  lines.push('# OKF Explorer Evaluation Results');
  lines.push('');
  lines.push(`Generated: ${payload.generated_at}`);
  lines.push(`Base URL: ${payload.base_url}`);
  lines.push(`Bundle: ${payload.bundle}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Questions run: ${payload.summary.questions_run}`);
  lines.push(`- Questions scored: ${payload.summary.questions_scored}`);
  lines.push(`- Average total: ${formatScore(payload.summary.average_total, 100)}`);
  lines.push(`- Retrieval: ${formatScore(payload.summary.average_retrieval, 35)}`);
  lines.push(`- Display: ${formatScore(payload.summary.average_display, 25)}`);
  lines.push(`- Accessibility: ${formatScore(payload.summary.average_accessibility, 20)}`);
  lines.push(`- GOV.UK-aligned publication quality: ${formatScore(payload.summary.average_govuk, 20)}`);
  lines.push(`- Questions at or above 80: ${payload.summary.pass_count_80}`);
  lines.push(`- Questions below 60: ${payload.summary.fail_count_below_60}`);
  lines.push('');
  lines.push('## Rubric');
  lines.push('');
  for (const [name, part] of Object.entries(suite.rubric)) {
    lines.push(`### ${name} (${part.points} points)`);
    for (const check of part.checks) lines.push(`- ${check}`);
    lines.push('');
  }
  lines.push('## Visual Regression Evidence');
  lines.push('');
  for (const item of payload.visual_regressions.items) {
    lines.push(`### ${item.id}: ${item.view}`);
    lines.push('');
    lines.push(item.comment);
    lines.push('');
    lines.push(`Image: ${item.image}`);
    lines.push('');
    for (const check of item.checks) lines.push(`- ${check}`);
    lines.push('');
  }
  lines.push('## Question Scores');
  lines.push('');
  lines.push('| ID | Score | Retrieval | Display | Accessibility | GOV.UK | Query | Evidence |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |');
  for (const record of payload.records) {
    const evidence = record.evidence.validation_only
      ? `validation-only; expected terms: ${(record.evidence.expected_terms || []).join(', ')}`
      : record.evidence.error || `${record.evidence.result_count} results; ${record.evidence.detail_title || 'no detail title'}`;
    lines.push(`| ${record.id} | ${formatScore(record.score.total, 100)} | ${formatScore(record.score.retrieval, 35)} | ${formatScore(record.score.display, 25)} | ${formatScore(record.score.accessibility, 20)} | ${formatScore(record.score.govuk, 20)} | ${escapePipe(record.query)} | ${escapePipe(evidence)} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function formatScore(value, max) {
  return Number.isFinite(value) ? `${value}/${max}` : 'not scored';
}

function escapePipe(value) {
  return String(value).replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const suite = readJson(options.suite);
  if (!options.bundleExplicit && typeof suite.target_bundle === 'string' && suite.target_bundle.trim()) {
    options.bundle = suite.target_bundle.trim();
  }
  if (!options.outExplicit && options.suite !== resolveRepoPath(DEFAULT_SUITE)) {
    options.out = path.join(path.dirname(options.suite), 'results', 'latest');
  }
  if (!options.visualExplicit && options.suite !== resolveRepoPath(DEFAULT_SUITE)) {
    options.visual = path.join(path.dirname(options.suite), 'visual-regressions.json');
  }
  const visuals = readJson(options.visual);
  validateSuite(suite);
  validateVisuals(visuals, options.visual);
  const metadata = {
    browser: options.noBrowser ? 'not-run' : 'playwright',
    mode: options.noBrowser ? 'validation-only' : 'browser-scored',
    limit: options.limit
  };
  const records = options.noBrowser
    ? buildValidationOnlyRecords(options, suite)
    : await runBrowserEvaluation(options, suite);
  const { summary, files } = writeReports(options, suite, visuals, records, metadata);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${files.map((file) => path.relative(repoRoot, file)).join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
