/** Portable graph-path planning and bounded delivery. No I/O or model calls. */
import { categoriseInsufficiency } from './insufficiency_categories.mjs';
const encoder = new TextEncoder();
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const check = (condition, message) => { if (!condition) throw new Error('Invalid evidence graph: ' + message); };
export function graphCanonical(value) {
  if (Array.isArray(value)) return '[' + value.map(graphCanonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined)
    .map(k => JSON.stringify(k) + ':' + graphCanonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const graphBytes = value => encoder.encode(JSON.stringify(value)).length;
export async function graphSha(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}
const words = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
const phrase = (tokens, text) => { const parts = words(text); return tokens.some((_, n) => parts.every((p, k) => tokens[n + k] === p)); };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

export const GRAPH_HARD_LIMITS = Object.freeze({ records: 5000, assertions: 12000, requirements: 500,
  graphBytes: 32 * 1024 * 1024, packageBytes: 16 * 1024 * 1024, pathDepth: 16, questionCharacters: 2000 });

/** Caller supplies the separately pinned resolver and canonical index validator. */
export async function createGraphEvidenceRuntime({ graphText, graphSha256, engineId, resolveConcepts, validateContextIndex }) {
  check(typeof graphText === 'string' && encoder.encode(graphText).length <= GRAPH_HARD_LIMITS.graphBytes, 'graph byte ceiling');
  check(await graphSha(graphText) === graphSha256, 'graph digest differs');
  const graph = JSON.parse(graphText);
  check(graph.schema === 'okf-dwp-evidence-route-graph.v1' && Array.isArray(graph.source_bindings), 'graph schema');
  check(/^urn:okf:graph-engine:sha256:[a-f0-9]{64}$/.test(engineId), 'immutable engine identity required');
  check(graph.index.records.length <= GRAPH_HARD_LIMITS.records && graph.index.assertions.length <= GRAPH_HARD_LIMITS.assertions
    && graph.index.requirements.length <= GRAPH_HARD_LIMITS.requirements, 'graph work ceiling');
  check(typeof resolveConcepts === 'function' && typeof validateContextIndex === 'function', 'pinned resolver/validator required');
  validateContextIndex(graph.index);
  const records = new Map(graph.index.records.map(r => [r.id, r]));
  const assertions = new Map(graph.index.assertions.map(r => [r.id, r]));
  check(records.size === graph.index.records.length && assertions.size === graph.index.assertions.length, 'duplicate graph identities');
  freeze(graph);

  async function plan(question) {
    check(typeof question === 'string' && question.trim() && question.length <= GRAPH_HARD_LIMITS.questionCharacters, 'question length');
    const resolverIndex = { ...graph.index, records: graph.index.records.filter(row => row.kind === 'concept')
      .map(row => ({ ...row, ...(row.aliases ? { aliases: [...row.aliases] } : {}) })) };
    // A standalone alias is preserved. Hyphen components cannot activate a
    // broad, unrelated concept (for example rate within highest-rate).
    const compounds = question.match(/[\p{L}\p{N}]+(?:[-\u2010-\u2015][\p{L}\p{N}]+)*/gu) ?? [];
    const suppressed = [];
    for (const row of resolverIndex.records) if (row.kind === 'concept' && row.aliases) row.aliases = row.aliases.filter(alias => {
      const label = typeof alias === 'string' ? alias : alias.label;
      if (alias.case_sensitive || !/^[\p{L}\p{N}]+$/u.test(label)) return true;
      const found = compounds.filter(t => t.toLowerCase().split(/[-\u2010-\u2015]/).includes(label.toLowerCase()));
      if (!found.length || found.some(t => t.toLowerCase() === label.toLowerCase())) return true;
      suppressed.push({ concept_id: row.id, alias: label }); return false;
    });
    const resolution = resolveConcepts(resolverIndex, question);
    const seeds = new Set(resolution.resolved.map(r => r.id));
    const alternatives = new Set(resolution.ambiguities.flatMap(row => row.candidates));
    const hypotheses = [];
    for (const rule of graph.routing_rules) {
      const matched = rule.all_of.map(group => group.filter(p => phrase(words(question), p)));
      if (matched.every(group => group.length)) { seeds.add(rule.seed); hypotheses.push({ id: rule.id, seed: rule.seed,
        matched_phrases: matched, assertion_status: 'model-derived', review_status: 'unreviewed', source_support: rule.source_support }); }
    }
    for (const bridge of graph.concept_bridges ?? []) {
      const sensitive = new Set(bridge.case_sensitive_phrases ?? []);
      const exactWords = question.match(/[A-Za-z0-9]+/g) ?? [];
      const matched = bridge.all_of.map(group => group.filter(p => sensitive.has(p) ? exactWords.includes(p) : phrase(words(question), p)));
      if (matched.every(group => group.length)) {
        for (const id of bridge.concepts) { check(records.get(id)?.kind === 'concept', 'bridge concept absent'); seeds.add(id); }
        hypotheses.push({ id: bridge.id, bridged_concepts: bridge.concepts, matched_phrases: matched,
          assertion_status: 'model-derived', review_status: 'unreviewed', source_support: bridge.source_support, scope: bridge.scope });
      }
    }
    const chosen = new Map(), selectedEdges = new Map(), issues = [];
    if (resolution.truncated) issues.push({ code: 'resolution_budget',
      message: 'Concept resolution exhausted its bounded work budget. Selected paths are partial and cannot establish complete retrieval.', ids: [] });
    if (hypotheses.some(row => row.bridged_concepts)) issues.push({ code: 'applicability_unresolved',
      message: 'Composed source branches are navigation hypotheses. Benefit variants, relevant dates, claimant roles and legal applicability remain unresolved.', ids: [] });
    const include = (id, reason, path) => {
      const record = records.get(id);
      if (!record || record.access !== 'public') return false;
      if (!chosen.has(id)) chosen.set(id, { record, reasons: [], paths: [] });
      const row = chosen.get(id);
      if (!row.reasons.includes(reason)) row.reasons.push(reason);
      if (path && !row.paths.some(p => graphCanonical(p) === graphCanonical(path))) row.paths.push(path);
      return true;
    };
    for (const id of [...seeds].sort()) include(id, 'resolved-concept');
    const applicable = graph.index.requirements.filter(r => r.when_all.every(id => seeds.has(id)));
    const outgoing = new Map();
    for (const edge of graph.index.assertions) {
      if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
      outgoing.get(edge.source).push(edge);
    }
    // Both preserved edges and explicitly derived navigation hypotheses are
    // committed by the graph hash. Targets never become retrieval seeds.
    // Reachability stays separate for every root and every requirement.
    const routesByRoot = new Map();
    const targets = new Set(applicable.flatMap(r => r.required));
    const roots = [...new Set(applicable.flatMap(r => [...r.when_all, ...(r.required_paths ?? []).map(p => p.seed)]))].filter(id => seeds.has(id)).sort();
    check(roots.length <= 64, 'resolved root work ceiling');
    for (const root of roots) {
      const routes = new Map(), queue = [{ seed: root, records: [root], assertions: [] }], visited = new Set(), enqueued = new Set([root]);
      let offset = 0;
      while (offset < queue.length) {
        const path = queue[offset++], id = path.records.at(-1);
        if (visited.has(id)) continue;
        visited.add(id);
        if (!records.has(id) || records.get(id).access !== 'public') continue;
        if (targets.has(id)) routes.set(id, path);
        if (path.assertions.length >= GRAPH_HARD_LIMITS.pathDepth) continue;
        for (const edge of outgoing.get(id) ?? []) {
          if (!(edge.context_guard?.when_all ?? []).every(concept => seeds.has(concept))) continue;
          if (!enqueued.has(edge.target)) { enqueued.add(edge.target); queue.push({ seed: root, records: [...path.records, edge.target], assertions: [...path.assertions, edge.id] }); }
        }
        check(visited.size <= GRAPH_HARD_LIMITS.records && queue.length <= GRAPH_HARD_LIMITS.assertions * GRAPH_HARD_LIMITS.pathDepth, 'directed path work ceiling');
      }
      routesByRoot.set(root, routes);
    }
    const requirements = [];
    for (const requirement of applicable) {
      const reached = new Set();
      const allowedRoots = new Set([...requirement.when_all, ...(requirement.required_paths ?? []).map(p => p.seed)].filter(id => seeds.has(id)));
      for (const path of requirement.required_paths ?? []) {
        let valid = allowedRoots.has(path.seed) && path.records[0] === path.seed && path.records.length === path.assertions.length + 1
          && path.assertions.length <= GRAPH_HARD_LIMITS.pathDepth && new Set(path.records).size === path.records.length;
        const edges = path.assertions.map(id => assertions.get(id));
        valid &&= edges.every((edge, n) => edge && edge.source === path.records[n] && edge.target === path.records[n + 1]
          && (edge.context_guard?.when_all ?? []).every(id => seeds.has(id)));
        valid &&= path.records.every(id => records.has(id) && records.get(id).access === 'public');
        if (!valid) { issues.push({ code: 'missing_required_path', message: 'A declared route is not a verified, public directed path from a resolved concept.', ids: [requirement.id, ...path.assertions] }); continue; }
        for (const id of path.records) { include(id, 'declared-directed-path:' + requirement.id, path); reached.add(id); }
        for (const edge of edges) selectedEdges.set(edge.id, edge);
      }
      for (const id of requirement.required) {
        if (reached.has(id) || id.includes('/obligation/')) continue;
        const path = [...allowedRoots].map(root => routesByRoot.get(root)?.get(id)).filter(Boolean)
          .sort((a, b) => a.assertions.length - b.assertions.length || compare(a.seed, b.seed))[0];
        if (!path) continue;
        for (const node of path.records) { include(node, 'verified-directed-route:' + requirement.id, path); reached.add(node); }
        for (const edge of path.assertions) selectedEdges.set(edge, assertions.get(edge));
      }
      const missing = requirement.required.filter(id => !reached.has(id));
      const sourceMissing = missing.filter(id => records.get(id)?.kind === 'evidence');
      if (sourceMissing.length) issues.push({ code: 'missing_required_path', message: 'Declared source evidence has no admitted directed route.', ids: sourceMissing });
      const absent = missing.filter(id => !id.includes('/obligation/') && !records.has(id));
      if (absent.length) issues.push({ code: 'source_absent', message: 'A declared dependency is absent from this bound graph inventory.', ids: absent });
      const open = missing.filter(id => id.includes('/obligation/'));
      for (const limitation of requirement.limitations ?? []) {
        const match = limitation.match(/^([a-z_]+):/);
        if (match) issues.push({ code: match[1], message: limitation, ids: [requirement.id] });
      }
      requirements.push({ ...requirement, status: 'insufficient', missing_record_ids: missing,
        source_records_reached: [...reached].filter(id => records.get(id)?.kind === 'evidence').sort(), open_obligation_ids: open });
    }
    if (!applicable.length) issues.push({ code: 'no_evidence_requirements', message: 'No declared graph evidence profile covers this wording.', ids: [] });
    if (resolution.ambiguities.length) issues.push({ code: 'ambiguous_concepts', message: 'Alternative meanings remain unresolved and do not activate or satisfy evidence requirements.', ids: [...alternatives] });
    if (resolution.unresolved.length) issues.push({ code: 'unresolved_terms', message: 'Some words are outside the declared navigation vocabulary.', ids: [] });
    const selected = [...chosen.values()].sort((a, b) => compare(a.record.id, b.record.id));
    if (!issues.some(i => i.code === 'independent_review_pending')) issues.push({ code: 'independent_review_pending', message: 'This research navigation has no independent specialist acceptance.', ids: [] });
    const original = { schema: 'okf-graph-evidence-package.v1', question, graph_sha256: graphSha256, engine_id: engineId,
      source_bindings: graph.source_bindings, graph_snapshot: graph.snapshot,
      evidence_status: 'insufficient', ai_answer: null, resolved_concepts: resolution.resolved,
      ambiguities: resolution.ambiguities, unresolved_terms: resolution.unresolved, navigation_hypotheses: hypotheses,
      suppressed_compound_aliases: suppressed, selected, relationships: [...selectedEdges.values()].sort((a, b) => compare(a.id, b.id)),
      requirements, diagnostics: issues, insufficiency_categories: categoriseInsufficiency(issues, { availableRecordIds: records.keys() }),
      retrieval_complete: applicable.length > 0 && !issues.some(i => ['missing_required_path', 'source_absent', 'resolution_budget'].includes(i.code)),
      retrieval_status: !applicable.length ? 'no-declared-profile' : issues.some(i => ['missing_required_path', 'source_absent', 'resolution_budget'].includes(i.code)) ? 'incomplete' : 'complete-declared-routes',
      assembly_truncated: false, source_instructions: 'inert-data',
      limitations: ['Complete graph-route retrieval is scoped to declared navigation, not complete law or an individual entitlement decision.',
        'Every original obligation, source classification and review limitation remains open unless separately evidenced.',
        'This additive planner preserves original source text and uses model-derived, unreviewed navigation.'] };
    const result = { ...original, plan_id: 'urn:sha256:' + await graphSha(graphCanonical(original)) };
    check(graphBytes(result) <= GRAPH_HARD_LIMITS.packageBytes, 'planned package exceeds hard ceiling; no partial package returned');
    return structuredClone(result);
  }
  return Object.freeze({ plan, identity: Object.freeze({ graph_sha256: graphSha256, snapshot: graph.snapshot, engine_id: engineId }) });
}

function deliveryArgs(offset, maxBytes) {
  check(Number.isSafeInteger(offset) && offset >= 0, 'offset');
  check(Number.isSafeInteger(maxBytes) && maxBytes >= 2048 && maxBytes <= 16384, 'delivery byte bound');
}
function settle(value) { for (let i = 0; i < 8; i++) value.delivery.used_bytes = graphBytes(value); return value; }

/** sizer may count the complete MCP envelope, including duplicate JSON copies. */
export async function graphEvidenceManifest(plan, { offset = 0, maxBytes = 8192 } = {}, sizer = graphBytes) {
  deliveryArgs(offset, maxBytes); check(offset <= plan.selected.length, 'catalogue offset');
  const cards = [];
  const result = { schema: 'okf-graph-evidence-manifest.v1', plan_id: plan.plan_id, graph_sha256: plan.graph_sha256,
    engine_id: plan.engine_id,
    evidence_status: plan.evidence_status, ai_answer: null, retrieval_complete: plan.retrieval_complete,
    assembly_truncated: false, package_sha256: await graphSha(graphCanonical(plan)),
    counts: { records: plan.selected.length, source_records: plan.selected.filter(x => x.record.kind === 'evidence').length,
      relationships: plan.relationships.length, requirements: plan.requirements.length, diagnostics: plan.diagnostics.length },
    records: cards, delivery: { offset, next_offset: null, total: plan.selected.length, max_bytes: maxBytes, used_bytes: 0 } };
  for (const row of plan.selected.slice(offset)) {
    const record = row.record;
    cards.push({ id: record.id, label: record.label, kind: record.kind, text_sha256: await graphSha(record.text),
      text_characters: record.text.length });
    result.delivery.next_offset = offset + cards.length < plan.selected.length ? offset + cards.length : null;
    settle(result);
    if (sizer(result) > maxBytes) { cards.pop(); break; }
  }
  result.delivery.next_offset = offset + cards.length < plan.selected.length ? offset + cards.length : null;
  settle(result); check(sizer(result) <= maxBytes && (cards.length > 0 || offset === plan.selected.length), 'catalogue cannot fit');
  return result;
}

export async function readGraphEvidence(plan, { plan_id, section, record_id, offset = 0, maxBytes = 8192 }, sizer = graphBytes) {
  deliveryArgs(offset, maxBytes); check(plan_id === plan.plan_id, 'plan identity differs');
  let text;
  if (['record_text', 'record_metadata'].includes(section)) {
    const row = plan.selected.find(x => x.record.id === record_id); check(row, 'record is outside the plan');
    text = section === 'record_text' ? row.record.text : graphCanonical(row);
  } else {
    check(record_id === undefined, 'record ID is only accepted for record sections');
    if (section === 'package') text = graphCanonical(plan);
    else if (section === 'diagnostics') { const { selected, relationships, ...diagnostics } = plan; text = graphCanonical(diagnostics); }
    else if (section === 'relationships') text = graphCanonical(plan.relationships);
    else throw new Error('Invalid evidence graph: unsupported section');
  }
  check(offset <= text.length, 'read offset exceeds value');
  const split = n => n > 0 && n < text.length && /[\uD800-\uDBFF]/.test(text[n - 1]) && /[\uDC00-\uDFFF]/.test(text[n]);
  check(!split(offset), 'read starts inside a Unicode character');
  const result = { schema: 'okf-graph-evidence-read.v1', plan_id, graph_sha256: plan.graph_sha256,
    engine_id: plan.engine_id,
    evidence_status: plan.evidence_status, ai_answer: null, section, record_id: record_id ?? null,
    character_unit: 'utf-16-code-units', total_characters: text.length, content_sha256: await graphSha(text),
    offset, end_offset: offset, next_offset: null, data: '', delivery: { max_bytes: maxBytes, used_bytes: 0 } };
  let lo = offset, hi = Math.min(text.length, offset + maxBytes);
  while (lo < hi) {
    const middle = Math.ceil((lo + hi) / 2); result.data = text.slice(offset, middle);
    result.end_offset = middle; result.next_offset = middle < text.length ? middle : null; settle(result);
    if (sizer(result) <= maxBytes) lo = middle; else hi = middle - 1;
  }
  if (split(lo)) lo--;
  result.data = text.slice(offset, lo); result.end_offset = lo; result.next_offset = lo < text.length ? lo : null; settle(result);
  check(sizer(result) <= maxBytes && (lo > offset || offset === text.length), 'source slice cannot fit');
  return result;
}
