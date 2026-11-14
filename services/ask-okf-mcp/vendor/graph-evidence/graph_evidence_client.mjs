/** Bounded, lossless graph-plan collection. It prints nothing and performs no I/O. */
import { graphBytes, graphCanonical, graphSha } from './graph_evidence_runtime.mjs';
const check = (value, message) => { if (!value) throw new Error('Invalid graph evidence delivery: ' + message); };
const HASH = /^[a-f0-9]{64}$/;
const equal = (a, b, message) => check(graphCanonical(a) === graphCanonical(b), message);
const limits = Object.freeze({ calls: 4096, bytes: 32 * 1024 * 1024, valueCharacters: 16 * 1024 * 1024,
  responseBytes: 16384, deadlineMs: 600000, callMs: 30000 });

function unwrap(response) {
  check(response && typeof response === 'object' && response.isError !== true, 'tool failed');
  if ('jsonrpc' in response) { check(!response.error && response.result, 'JSON-RPC failure'); return unwrap(response.result); }
  if (response.content) {
    const blocks = response.content.filter(x => x.type === 'text');
    check(blocks.length === 1, 'exactly one JSON text copy required');
    const text = JSON.parse(blocks[0].text);
    if (response.structuredContent) equal(response.structuredContent, text, 'MCP copies differ');
    return response.structuredContent ?? text;
  }
  return response;
}

export async function collectGraphEvidence({ transport, question, expectedGraphSha256, expectedEngineId, deliveryBytes = 8192 }) {
  check(transport && typeof transport.manifest === 'function' && typeof transport.read === 'function', 'read-only transport required');
  check(typeof question === 'string' && question.trim() && question.length <= 2000, 'public research question required');
  check(HASH.test(expectedGraphSha256) && /^urn:okf:graph-engine:sha256:[a-f0-9]{64}$/.test(expectedEngineId), 'pinned graph and engine identities required');
  check(Number.isSafeInteger(deliveryBytes) && deliveryBytes >= 2048 && deliveryBytes <= 16384, 'delivery bound');
  const started = performance.now(), receipt = { calls: [], source_instructions: 'inert-data' };
  const stats = { calls: 0, response_bytes: 0, max_response_bytes: 0, manifest_pages: 0, slices: 0 };
  const invoke = async (method, args) => {
    check(stats.calls < limits.calls && performance.now() - started < limits.deadlineMs, 'session work ceiling');
    stats.calls++;
    const controller = new AbortController(); let timer;
    const pending = Promise.resolve().then(() => transport[method](structuredClone(args), controller.signal));
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Graph evidence transport deadline')); }, Math.min(limits.callMs, limits.deadlineMs - (performance.now() - started))); });
    let response;
    try { response = await Promise.race([pending, deadline]); } finally { clearTimeout(timer); }
    const bytes = graphBytes(response);
    check(bytes <= deliveryBytes && bytes <= limits.responseBytes, 'response exceeds complete-envelope limit');
    stats.response_bytes += bytes; stats.max_response_bytes = Math.max(stats.max_response_bytes, bytes);
    check(stats.response_bytes <= limits.bytes && performance.now() - started < limits.deadlineMs, 'session byte/deadline ceiling');
    const value = unwrap(response);
    check(value.graph_sha256 === expectedGraphSha256 && value.engine_id === expectedEngineId, 'source or engine drift');
    check(value.evidence_status === 'insufficient' && value.ai_answer === null, 'evidence boundary changed');
    check(value.delivery?.used_bytes === graphBytes(value) && value.delivery.max_bytes === deliveryBytes, 'byte accounting differs');
    receipt.calls.push({ method, section: args.section ?? null, offset: args.offset, response_bytes: bytes, value_sha256: await graphSha(graphCanonical(value)) });
    return value;
  };
  let offset = 0, first;
  const cards = [];
  do {
    const page = await invoke('manifest', { question, graph_sha256: expectedGraphSha256, engine_id: expectedEngineId,
      ...(first ? { plan_id: first.plan_id } : {}), offset, delivery_bytes: deliveryBytes });
    check(page.schema === 'okf-graph-evidence-manifest.v1' && /^urn:sha256:[a-f0-9]{64}$/.test(page.plan_id), 'catalogue identity');
    check(HASH.test(page.package_sha256) && Array.isArray(page.records), 'catalogue fields');
    if (!first) first = structuredClone(page);
    else for (const field of ['plan_id', 'counts', 'package_sha256', 'retrieval_complete', 'assembly_truncated']) equal(page[field], first[field], 'catalogue drift: ' + field);
    check(Number.isSafeInteger(page.counts.records) && page.counts.records >= 0 && page.counts.records <= 5000
      && page.delivery.total === page.counts.records && page.delivery.offset === offset, 'catalogue counts/offset');
    for (const card of page.records) {
      check(typeof card.id === 'string' && !cards.some(x => x.id === card.id) && HASH.test(card.text_sha256)
        && Number.isSafeInteger(card.text_characters) && card.text_characters >= 0 && card.text_characters <= limits.valueCharacters, 'invalid or duplicate catalogue record');
      cards.push(structuredClone(card));
    }
    const next = offset + page.records.length;
    check(next <= page.counts.records && page.delivery.next_offset === (next < page.counts.records ? next : null)
      && (next > offset || next === page.counts.records), 'catalogue continuation');
    offset = page.delivery.next_offset; stats.manifest_pages++;
  } while (offset !== null);
  check(cards.length === first.counts.records, 'incomplete catalogue');
  offset = 0; let identity;
  const parts = [];
  do {
    const part = await invoke('read', { question, graph_sha256: expectedGraphSha256, engine_id: expectedEngineId,
      plan_id: first.plan_id, section: 'package', offset, delivery_bytes: deliveryBytes });
    check(part.schema === 'okf-graph-evidence-read.v1' && part.plan_id === first.plan_id && part.section === 'package'
      && part.record_id === null && part.character_unit === 'utf-16-code-units', 'read identity');
    check(Number.isSafeInteger(part.total_characters) && part.total_characters >= 0 && part.total_characters <= limits.valueCharacters
      && HASH.test(part.content_sha256) && typeof part.data === 'string', 'read fields');
    const current = { characters: part.total_characters, sha256: part.content_sha256 };
    if (!identity) identity = current; else equal(identity, current, 'read value drift');
    check(part.offset === offset && part.end_offset === offset + part.data.length && part.end_offset <= identity.characters
      && (part.data.length > 0 || offset === identity.characters), 'read skipped or repeated bytes');
    check(!/^[\uDC00-\uDFFF]/.test(part.data) && !/[\uD800-\uDBFF]$/.test(part.data), 'Unicode split');
    check(part.next_offset === (part.end_offset < identity.characters ? part.end_offset : null), 'read continuation');
    parts.push(part.data); offset = part.next_offset; stats.slices++;
  } while (offset !== null);
  const text = parts.join('');
  check(text.length === identity.characters && await graphSha(text) === identity.sha256 && identity.sha256 === first.package_sha256, 'package hash differs');
  const plan = JSON.parse(text);
  check(graphCanonical(plan) === text && plan.schema === 'okf-graph-evidence-package.v1'
    && plan.plan_id === first.plan_id && plan.question === question && plan.graph_sha256 === expectedGraphSha256
    && plan.engine_id === expectedEngineId && plan.evidence_status === 'insufficient' && plan.ai_answer === null,
  'reconstructed package identity/boundary');
  const { plan_id, ...identityInput } = plan;
  check('urn:sha256:' + await graphSha(graphCanonical(identityInput)) === plan_id, 'reconstructed plan digest differs');
  check(Array.isArray(plan.selected) && plan.selected.length === cards.length, 'reconstructed selection differs');
  for (const [n, row] of plan.selected.entries()) {
    const card = cards[n]; check(row.record.id === card.id && row.record.kind === card.kind && row.record.label === card.label
      && row.record.text.length === card.text_characters && await graphSha(row.record.text) === card.text_sha256, 'record differs from catalogue');
  }
  check(plan.relationships.length === first.counts.relationships && plan.requirements.length === first.counts.requirements
    && plan.diagnostics.length === first.counts.diagnostics && plan.retrieval_complete === first.retrieval_complete
    && plan.assembly_truncated === false && first.assembly_truncated === false, 'package diagnostics or completeness differs');
  return { schema: 'okf-graph-evidence-collection.v1', summary: { plan_id, graph_sha256: expectedGraphSha256,
    engine_id: expectedEngineId, package_sha256: identity.sha256, delivery_complete: true, package_complete: true,
    retrieval_complete: plan.retrieval_complete, records: cards.length, source_records: plan.selected.filter(x => x.record.kind === 'evidence').length,
    evidence_status: plan.evidence_status, ai_answer: null, delivery: stats }, package: plan, catalogue: cards, receipt };
}
