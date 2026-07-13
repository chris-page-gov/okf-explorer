#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS_PATH = path.join(ROOT, 'evaluation/search-filtering/corpus.json');
const QUESTIONS_PATH = path.join(ROOT, 'evaluation/search-filtering/questions.json');
const STRATEGIES = ['weighted', 'idf', 'idf-exact'];
const CONTROL = 'weighted';
const RESULT_LIMIT = 20;
const MISSING_FILTER_VALUE = '__missing__';
const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with']);
const WEIGHTS = {
  title: 16,
  publisher: 8,
  context: 6,
  description: 5,
  topics: 4,
  record_type: 4,
  protocol: 4,
  standards: 4,
  source: 3,
  tags: 3,
  url: 2
};

function tokenize(value) {
  const normalized = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const tokens = [];
  const seen = new Set();
  for (const match of normalized.matchAll(/[a-z0-9][a-z0-9._-]*/g)) {
    const token = match[0].replace(/^[._-]+|[._-]+$/g, '');
    if (token.length < 2 || STOP_WORDS.has(token) || seen.has(token)) continue;
    tokens.push(token);
    seen.add(token);
  }
  return tokens;
}

function fieldValues(document) {
  return {
    title: document.title,
    publisher: document.publisher,
    context: document.context || '',
    description: document.description || '',
    topics: (document.topics || []).join(' '),
    record_type: document.record_type || '',
    protocol: (document.protocol || []).join(' '),
    standards: document.standards || '',
    source: document.source || '',
    tags: (document.tags || []).join(' '),
    url: `${document.route} ${document.url || ''}`
  };
}

function buildIndex(documents) {
  const postings = new Map();
  documents.forEach((document, ordinal) => {
    const tokenScores = new Map();
    for (const [field, value] of Object.entries(fieldValues(document))) {
      for (const token of tokenize(value)) {
        const current = tokenScores.get(token) || { base: 0, title: false };
        current.base += WEIGHTS[field];
        current.title ||= field === 'title';
        tokenScores.set(token, current);
      }
    }
    for (const [token, score] of tokenScores) {
      const rows = postings.get(token) || [];
      rows.push({ ordinal, weighted: score.base + (score.title ? 4 : 0) });
      postings.set(token, rows);
    }
  });
  return { documents, postings };
}

function inverseDocumentFrequency(documentCount, frequency) {
  return Math.log(1 + (Math.max(documentCount - frequency, 0) + 0.5) / (frequency + 0.5));
}

function filterValues(document, key) {
  const raw = key === 'license' ? document.license : document[key];
  const values = Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === '' ? [] : [raw];
  return values.length ? values.map(String) : [MISSING_FILTER_VALUE];
}

function matchesFilters(document, filters) {
  return Object.entries(filters).every(([key, selected]) => {
    const values = new Set(filterValues(document, key));
    return selected.some((value) => values.has(value));
  });
}

function exactBoost(document, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;
  const title = document.title.trim().toLowerCase();
  const name = document.name.trim().toLowerCase();
  const route = document.route.toLowerCase();
  if (title === normalized) return 32;
  if (name === normalized || route === normalized) return 24;
  if (title.includes(normalized)) return 12;
  if (name.includes(normalized) || route.includes(normalized)) return 8;
  return 0;
}

function search(index, question, strategy) {
  const queryTokens = tokenize(question.query);
  const scores = new Map();
  const tokenSets = [];
  for (const token of queryTokens) {
    const rows = index.postings.get(token) || [];
    const tokenSet = new Set();
    const idf = inverseDocumentFrequency(index.documents.length, rows.length);
    for (const row of rows) {
      tokenSet.add(row.ordinal);
      const current = scores.get(row.ordinal) || { weighted: 0, idf: 0 };
      current.weighted += row.weighted;
      current.idf += row.weighted * idf;
      scores.set(row.ordinal, current);
    }
    tokenSets.push(tokenSet);
  }

  let candidates;
  if (!queryTokens.length) {
    candidates = new Set(index.documents.map((_document, ordinal) => ordinal));
  } else if (tokenSets.length) {
    candidates = new Set(tokenSets[0]);
    for (const set of tokenSets.slice(1)) candidates = new Set([...candidates].filter((ordinal) => set.has(ordinal)));
    if (!candidates.size && tokenSets.length > 1) candidates = new Set(tokenSets.flatMap((set) => [...set]));
  } else {
    candidates = new Set();
  }

  return [...candidates]
    .filter((ordinal) => matchesFilters(index.documents[ordinal], question.filters))
    .map((ordinal) => {
      const document = index.documents[ordinal];
      const score = scores.get(ordinal) || { weighted: 0, idf: 0 };
      const value = strategy === 'weighted'
        ? score.weighted
        : score.idf + (strategy === 'idf-exact' ? exactBoost(document, question.query) : 0);
      return { ...document, ordinal, score: value };
    })
    .sort((left, right) => right.score - left.score || left.ordinal - right.ordinal)
    .slice(0, RESULT_LIMIT);
}

function discountedGain(grades) {
  return grades.reduce((total, grade, index) => total + (2 ** grade - 1) / Math.log2(index + 2), 0);
}

function queryMetrics(question, results) {
  const routes = results.map((result) => result.route);
  const grades = routes.slice(0, 10).map((route) => question.relevant[route] || 0);
  const ideal = Object.values(question.relevant).sort((left, right) => right - left).slice(0, 10);
  const relevantRoutes = Object.keys(question.relevant);
  const recalled = relevantRoutes.filter((route) => routes.slice(0, 20).includes(route)).length;
  const identifierTarget = Object.entries(question.relevant).sort((left, right) => right[1] - left[1])[0]?.[0];
  return {
    ndcg10: ideal.length ? discountedGain(grades) / discountedGain(ideal) : 1,
    recall20: relevantRoutes.length ? recalled / relevantRoutes.length : 1,
    exactIdentifierSuccess: question.exact_identifier ? Number(routes[0] === identifierTarget) : null,
    prohibitedFailures: question.prohibited_routes.filter((route) => routes.slice(0, 10).includes(route)).length,
    filterViolations: results.filter((result) => !matchesFilters(result, question.filters)).length,
    resultCount: results.length
  };
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] || 0;
}

function round(value, places = 4) {
  return Number(value.toFixed(places));
}

function benchmarkStrategy(index, questions, strategy) {
  for (let pass = 0; pass < 20; pass += 1) {
    for (const question of questions) search(index, question, strategy);
  }
  const timings = [];
  const batches = 40;
  const repetitions = 150;
  for (let batch = 0; batch < batches; batch += 1) {
    const started = performance.now();
    for (let repetition = 0; repetition < repetitions; repetition += 1) {
      search(index, questions[(batch + repetition) % questions.length], strategy);
    }
    timings.push((performance.now() - started) / repetitions);
  }

  const perQuery = questions.map((question) => {
    const results = search(index, question, strategy);
    return { question, results, metrics: queryMetrics(question, results) };
  });
  const identifierRows = perQuery.map((row) => row.metrics.exactIdentifierSuccess).filter((value) => value !== null);
  return {
    strategy,
    macro_ndcg_10: round(perQuery.reduce((total, row) => total + row.metrics.ndcg10, 0) / perQuery.length),
    recall_20: round(perQuery.reduce((total, row) => total + row.metrics.recall20, 0) / perQuery.length),
    exact_identifier_success: round(identifierRows.reduce((total, value) => total + value, 0) / identifierRows.length),
    prohibited_at_10_failures: perQuery.reduce((total, row) => total + row.metrics.prohibitedFailures, 0),
    filter_violations: perQuery.reduce((total, row) => total + row.metrics.filterViolations, 0),
    warm_query_p95_ms: round(percentile(timings, 0.95), 6),
    strategy_asset_delta: 0,
    perQuery
  };
}

function validate(corpus, suite, index) {
  if (corpus.schema !== 'okf-static-search-benchmark-corpus.v1') throw new Error(`Unsupported corpus schema: ${corpus.schema}`);
  if (suite.schema !== 'okf-static-search-ranking-benchmark.v1') throw new Error(`Unsupported suite schema: ${suite.schema}`);
  if (suite.queries.length !== 30) throw new Error(`Benchmark must contain exactly 30 queries; found ${suite.queries.length}`);
  const routes = new Set(corpus.documents.map((document) => document.route));
  if (routes.size !== corpus.documents.length) throw new Error('Benchmark corpus routes must be unique');
  const ids = new Set();
  for (const question of suite.queries) {
    if (ids.has(question.id)) throw new Error(`Duplicate query id: ${question.id}`);
    ids.add(question.id);
    for (const route of [...Object.keys(question.relevant), ...question.prohibited_routes]) {
      if (!routes.has(route)) throw new Error(`${question.id}: unknown route ${route}`);
    }
    const filtered = search(index, question, CONTROL);
    if (question.expected_filter_count !== undefined && filtered.length !== question.expected_filter_count) {
      throw new Error(`${question.id}: expected ${question.expected_filter_count} filtered candidates, found ${filtered.length}`);
    }
  }
}

function gateCandidate(control, candidate) {
  const ndcgImprovement = control.macro_ndcg_10
    ? (candidate.macro_ndcg_10 - control.macro_ndcg_10) / control.macro_ndcg_10
    : 0;
  return {
    selected: ndcgImprovement >= 0.03
      && candidate.recall_20 >= control.recall_20
      && candidate.exact_identifier_success >= control.exact_identifier_success
      && candidate.warm_query_p95_ms <= control.warm_query_p95_ms * 1.2
      && candidate.strategy_asset_delta <= 0.1
      && candidate.prohibited_at_10_failures <= control.prohibited_at_10_failures
      && candidate.filter_violations === 0,
    ndcg_improvement: round(ndcgImprovement)
  };
}

const corpus = JSON.parse(await readFile(CORPUS_PATH, 'utf8'));
const suite = JSON.parse(await readFile(QUESTIONS_PATH, 'utf8'));
const index = buildIndex(corpus.documents);
validate(corpus, suite, index);
const results = STRATEGIES.map((strategy) => benchmarkStrategy(index, suite.queries, strategy));
const control = results.find((result) => result.strategy === CONTROL);
const gates = Object.fromEntries(results.filter((result) => result.strategy !== CONTROL).map((result) => [result.strategy, gateCandidate(control, result)]));
const eligible = results.filter((result) => result.strategy !== CONTROL && gates[result.strategy].selected).sort((left, right) => right.macro_ndcg_10 - left.macro_ndcg_10);
const selectedDefault = eligible[0]?.strategy || CONTROL;
const output = {
  schema: 'okf-static-search-ranking-results.v1',
  corpus_documents: corpus.documents.length,
  queries: suite.queries.length,
  thresholds: {
    minimum_relative_ndcg_10_improvement: 0.03,
    minimum_recall_20_ratio: 1,
    minimum_exact_identifier_ratio: 1,
    maximum_warm_p95_ratio: 1.2,
    maximum_strategy_asset_delta: 0.1
  },
  results: results.map(({ perQuery: _perQuery, ...result }) => result),
  gates,
  expected_default: suite.expected_default,
  selected_default: selectedDefault
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log('Deterministic static search ranking benchmark');
  console.table(output.results);
  for (const [strategy, gate] of Object.entries(gates)) {
    console.log(`${strategy}: ${(gate.ndcg_improvement * 100).toFixed(2)}% nDCG@10 change; ${gate.selected ? 'passes' : 'does not pass'} the default-change gate`);
  }
  console.log(`Selected default: ${selectedDefault}`);
}

if (output.results.some((result) => result.filter_violations > 0)) process.exitCode = 1;
if (suite.expected_default && selectedDefault !== suite.expected_default) {
  console.error(`Expected default ${suite.expected_default}, but the benchmark selected ${selectedDefault}`);
  process.exitCode = 1;
}
