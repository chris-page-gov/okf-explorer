import { describe, expect, test, vi } from 'vitest';
import { loadPassageCase, loadPassageManifest, loadVerifiedPdf, MAX_PDF_BYTES, parsePassageCase, parsePassageManifest, previewCorrection, proposedAddedSpans, type Correction, type PassageCase } from './passages';

const DIGESTS: Record<string, string> = {
  Alpha: 'b1a96dd646bccaa24cef7a3db22a6f995f05658f4f1c3272913e258c03e6fb24',
  Beta: '703390318bd55aef50b7823d2b90a846debff99e6e3d401a24a921b733912a6d',
  'Alpha\nBeta': 'c4457665fd3e62b0c9fc21865ea17bb837f9b86b2c2fa353f693eda8c9e97760',
  pdf: 'c35b21d6ca39aa7cc3b79a705d989f1a6e88b99ab43988d74048799e3db926a3',
  baseline: '8ba8496a2525ae171ffd104d632dede6ef418d9b95962a9d88e2fcdbc8d48d24',
  settings: 'cde0fb0dec1400c54a0f7e7eafa73624c53e4da258bbd34b3380a0defeba95c1',
  wrong: '8810ad581e59f2bc3928b261707a71308f7e139eb04820366dc4d5c18d980225',
  stale: 'a03f2386ae06b21109577020844df367857b72c2fcce384c1896fed98a89c82b'
};
const sha = (value: string) => DIGESTS[value] ?? DIGESTS['Alpha\nBeta'];
const source = 'Alpha\nBeta';
const base = new URL('https://example.test/review/manifest.json');
function unit(id: string, spans: PassageCase['before'][number]['spans'], text: string, role = 'paragraph') {
  return { id, role, paragraph_labels: [], spans: spans.map(span => ({ ...span, literal_sha256: sha(source.slice(span.start_utf8, span.end_utf8)) })), joiner: '\n', text, text_bytes: new TextEncoder().encode(text).length, text_sha256: sha(text) };
}
function fixture(): PassageCase {
  return {
    id: 'case-001', label: '<img src=x onerror=alert(1)>',
    document: { id: 'source-1', version: 'v1', pdf: { url: 'https://example.test/source.pdf', sha256: sha('pdf') }, extraction: { url: 'extractions/source.txt', sha256: sha(source) }, baseline_sha256: sha('baseline'), parser: { version: 'v1', ruleset_version: 'r1', settings_sha256: sha('settings'), settings_text: 'settings', applied_rules: ['rule-1'] } },
    pages: [{ number: 1, start_utf8: 0, end_utf8: 5 }, { number: 2, start_utf8: 6, end_utf8: 10 }],
    before: [unit('old', [{ page: 1, start_utf8: 0, end_utf8: 5 }, { page: 2, start_utf8: 6, end_utf8: 10 }], source)],
    after: [unit('new-a', [{ page: 1, start_utf8: 0, end_utf8: 5 }], 'Alpha'), unit('new-b', [{ page: 2, start_utf8: 6, end_utf8: 10 }], 'Beta')],
    observation: { method: 'source review', classification: 'split', rationale: 'Separate pages by role.', uncertainty: 'Review pending', source_links: [] },
    review: { status: 'pending-independent-review' },
    coverage: { candidate_bytes_outside_old_passage: 0, covered_once_bytes: 9, old_passage_bytes: 9, scope: 'Affected passage only' }
  };
}
function correction(item: PassageCase): Correction {
  return { schema: 'okf-passage-correction.v1', id: 'suggestion-1', version: '1', case_id: item.id, source_sha256: item.document.extraction.sha256, baseline_sha256: item.document.baseline_sha256, operation: 'split', rationale: 'Separate pages by role.', uncertainty: '', added_spans: proposedAddedSpans(item), units: item.after };
}
async function loaded(item: PassageCase) {
  vi.stubGlobal('fetch', async (input: URL) => {
    const response = new Response(source, { status: 200 });
    Object.defineProperty(response, 'url', { value: input.href });
    return response;
  });
  try { return await loadPassageCase(item, base); } finally { vi.unstubAllGlobals(); }
}

describe('passage boundary review', () => {
  test('reconstructs a true cross-page passage and previews an exact split', async () => {
    const item = fixture(), data = await loaded(item);
    expect(data.before[0].text).toBe('Alpha\nBeta');
    const result = await previewCorrection(item, data, correction(item));
    expect(result.accepted).toBe(true);
    expect(result.migration).toEqual([{ from: 'old', to: ['new-a', 'new-b'], status: 'mapped' }]);
  });
  test('rejects stale source or baseline and undeclared added bytes', async () => {
    const item = fixture(), data = await loaded(item);
    expect((await previewCorrection(item, data, { ...correction(item), source_sha256: sha('stale') })).error).toMatch(/Stale source/);
    expect((await previewCorrection(item, data, { ...correction(item), baseline_sha256: sha('stale') })).error).toMatch(/Stale source/);
    const extended = { ...correction(item), units: [item.after[0], unit('new-b', [{ page: 2, start_utf8: 6, end_utf8: 10 }], 'Beta')], added_spans: [{ page: 1, start_utf8: 0, end_utf8: 1 }] };
    expect((await previewCorrection(item, data, extended)).error).toMatch(/Undeclared added/);
  });
  test('allows a role-only alternative without the original candidate added bytes', async () => {
    const item = fixture();
    item.before = [unit('old', [{ page: 1, start_utf8: 0, end_utf8: 5 }], 'Alpha')];
    item.coverage = { candidate_bytes_outside_old_passage: 4, covered_once_bytes: 5, old_passage_bytes: 5, scope: 'Original candidate included page 2' };
    const data = await loaded(item);
    const proposed = { ...item.before[0], id: 'role-only', role: 'heading' };
    const result = await previewCorrection(item, data, { ...correction(item), operation: 'role-change', units: [proposed], added_spans: [] });
    expect(result.accepted).toBe(true);
  });
  test('keeps full counts and ad-hoc downstream effects unknown when added spans may overlap untouched units', async () => {
    const item = fixture();
    item.before = [unit('old', [{ page: 1, start_utf8: 0, end_utf8: 5 }], 'Alpha')];
    item.coverage = { candidate_bytes_outside_old_passage: 4, covered_once_bytes: 5, old_passage_bytes: 5, scope: 'Affected passage only' };
    item.impact = { document_unit_count_before: 10, corpus_unit_count_before: 100, dependencies: ['producer-dependency'], discovery_records: ['producer-discovery'], question_packages: ['producer-question'], budget_omissions: ['producer-omission'] };
    const data = await loaded(item);
    const result = await previewCorrection(item, data, correction(item));
    expect(result.accepted).toBe(true);
    const impact = result.impact as { document: Record<string, unknown>; corpus: Record<string, unknown>; downstream: Record<string, Record<string, unknown>> };
    expect(impact.document).toMatchObject({ affected_unit_delta: 1, full_units_before: 10, full_units_after: 'unknown', explicitly_added_source_bytes: 4 });
    expect(impact.document.full_units_after_reason).toMatch(/overlap units outside/);
    expect(impact.corpus).toMatchObject({ affected_unit_delta: 1, isolated_projection_units_before: 100, isolated_projection_units_after: 'unknown' });
    expect(impact.downstream.correction_effects).toEqual({ dependencies: 'unknown', discovery_records: 'unknown', question_packages: 'unknown', budget_omissions: 'unknown' });
    expect(impact.downstream.supplied_producer_case_evidence).toEqual({ dependencies: ['producer-dependency'], discovery_records: ['producer-discovery'], question_packages: ['producer-question'], budget_omissions: ['producer-omission'] });
  });
  test('keeps full counts unknown even without added spans because outside IDs are not checked', async () => {
    const item = fixture();
    item.impact = { document_unit_count_before: 10, corpus_unit_count_before: 100 };
    const data = await loaded(item);
    const result = await previewCorrection(item, data, correction(item));
    expect(result.accepted).toBe(true);
    const impact = result.impact as { document: Record<string, unknown>; corpus: Record<string, unknown> };
    expect(impact.document.full_units_after).toBe('unknown');
    expect(impact.corpus.isolated_projection_units_after).toBe('unknown');
    expect(impact.document.affected_unit_delta).toBe(1);
    expect(impact.document.full_units_after_reason).toMatch(/IDs outside this case were not validated/);
  });
  test('rejects lost, overlapping and invalid source spans', async () => {
    const item = fixture(), data = await loaded(item);
    expect((await previewCorrection(item, data, { ...correction(item), units: [{ ...item.after[0], id: 'old' }, item.after[1]] })).error).toMatch(/existing unit ID/i);
    expect((await previewCorrection(item, data, { ...correction(item), units: [item.after[0]] })).accepted).toBe(false);
    const overlap = unit('overlap', [{ page: 1, start_utf8: 0, end_utf8: 5 }], 'Alpha');
    expect((await previewCorrection(item, data, { ...correction(item), units: [item.after[0], overlap] })).error).toMatch(/Overlapping/);
    const bad = unit('bad', [{ page: 2, start_utf8: 4, end_utf8: 10 }], 'a\nBeta');
    expect((await previewCorrection(item, data, { ...correction(item), units: [item.after[0], bad] })).error).toMatch(/Invalid source byte span/);
  });
  test('rejects corrupted extraction and unsafe source observation links', async () => {
    const item = fixture();
    await expect(loaded({ ...item, document: { ...item.document, extraction: { ...item.document.extraction, sha256: sha('wrong') } } })).rejects.toThrow(/SHA-256/);
    const bad = structuredClone(item) as PassageCase;
    bad.observation.source_links = [{ page: 1, start_utf8: 0, end_utf8: 5, literal: 'Alpha', literal_sha256: sha('Alpha'), pdf_url: 'javascript:alert(1)' }];
    expect(() => parsePassageCase({ schema: 'okf-passage-boundary-review.v1', ...bad }, base)).toThrow(/source observation/);
  });
  test('checks producer coverage against exact source ranges', async () => {
    const item = fixture();
    item.coverage = { candidate_bytes_outside_old_passage: 1, covered_once_bytes: 8, old_passage_bytes: 9, scope: 'Claimed coverage' };
    await expect(loaded(item)).rejects.toThrow(/coverage/);
  });
  test('rejects parser settings text whose bytes differ from the declared digest', async () => {
    const item = fixture();
    item.document.parser.settings_text = 'changed settings';
    await expect(loaded(item)).rejects.toThrow(/settings text SHA-256/);
  });
  test('rejects successor settings text whose bytes differ from its digest', async () => {
    const item = fixture();
    const manifest = { schema: 'okf-passage-boundary-review-manifest.v1', title: 'Review', status: 'pending', baseline_commit: 'abc', source: { baseline_manifest_sha256: sha('baseline') }, impact: {}, limits: [], cases: [{ id: item.id, label: item.label, url: 'cases/case-001.json', sha256: sha('settings'), bytes: 100, document_id: item.document.id, classification: item.observation.classification, review_status: item.review.status }], candidate_comparison: { settings_text: 'changed settings', settings_sha256: sha('settings') } };
    vi.stubGlobal('fetch', async (input: URL) => { const response = new Response(JSON.stringify(manifest)); Object.defineProperty(response, 'url', { value: input.href }); return response; });
    try { await expect(loadPassageManifest(base.href, base.href)).rejects.toThrow(/Successor parser settings text SHA-256/); }
    finally { vi.unstubAllGlobals(); }
  });
  test('accepts only bounded PDF bytes with the frozen PDF hash', async () => {
    const item = fixture();
    item.document.pdf.delivery_url = 'https://example.test/frozen.pdf';
    const bytes = new TextEncoder().encode('%PDF-1.4\n');
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    item.document.pdf.sha256 = digest;
    vi.stubGlobal('fetch', async (input: URL) => { const response = new Response(bytes); Object.defineProperty(response, 'url', { value: input.href }); return response; });
    try { expect((await loadVerifiedPdf(item, base)).size).toBe(bytes.length); } finally { vi.unstubAllGlobals(); }
    vi.stubGlobal('fetch', async (input: URL) => { const response = new Response('%PDF-1.5\n'); Object.defineProperty(response, 'url', { value: input.href }); return response; });
    try { await expect(loadVerifiedPdf(item, base)).rejects.toThrow(/SHA-256/); } finally { vi.unstubAllGlobals(); }
    vi.stubGlobal('fetch', async (input: URL) => { const response = new Response('%PDF-1.4\n', { headers: { 'content-length': String(MAX_PDF_BYTES + 1) } }); Object.defineProperty(response, 'url', { value: input.href }); return response; });
    try { await expect(loadVerifiedPdf(item, base)).rejects.toThrow(/byte limit/); } finally { vi.unstubAllGlobals(); }
  });
  test('rejects malformed optional source and impact metadata', () => {
    const item = fixture();
    const invalid = (mutate: (copy: PassageCase) => void) => { const copy = structuredClone(item); mutate(copy); expect(() => parsePassageCase(copy, base)).toThrow(); };
    invalid(copy => { copy.document.pdf.repository_path = '../private.pdf'; });
    invalid(copy => { copy.document.extraction.source_sha256 = 'invalid'; });
    invalid(copy => { copy.document.parser.implementation_bindings = { 'parser.py': 'invalid' }; });
    invalid(copy => { copy.document.parser.implementation_bindings = { '../parser.py': sha('settings') }; });
    invalid(copy => { copy.impact = { document_unit_count_after: -1 }; });
    invalid(copy => { copy.technical_outcome = { status: 'corrected', target_boundary: 'corrected', rationale: 'Reviewed', residual_structural_findings: ['valid'], legal_answerability: '' }; });
    const manifest = { schema: 'okf-passage-boundary-review-manifest.v1', title: 'Review', status: 'pending', baseline_commit: 'abc', source: { baseline_manifest_sha256: sha('baseline') }, impact: { candidate_units: 10 }, limits: [], cases: [{ id: item.id, label: item.label, url: 'cases/case-001.json', sha256: sha('settings'), bytes: 100, document_id: item.document.id, classification: item.observation.classification, review_status: item.review.status }] };
    expect(() => parsePassageManifest({ ...manifest, impact: { candidate_units: 'ten' } }, base)).toThrow();
    expect(() => parsePassageManifest({ ...manifest, candidate_comparison: { status: 2 } }, base)).toThrow();
    expect(() => parsePassageManifest({ ...manifest, source: { baseline_manifest_sha256: 'bad' } }, base)).toThrow();
    expect(() => parsePassageManifest({ ...manifest, successor_case_differences: ['case-unknown'] }, base)).toThrow();
  });
  test('rejects overlong correction uncertainty', async () => {
    const item = fixture(), data = await loaded(item);
    expect((await previewCorrection(item, data, { ...correction(item), uncertainty: 'x'.repeat(2001) })).accepted).toBe(false);
  });
});
