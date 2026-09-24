import { describe, expect, it, vi } from 'vitest';
import { loadManifest, loadPackage, manifestUrl, packageUrl, parseManifest, parsePackage, reviewDownload, sourcePageUrl, unitSpanText } from './workbench';
import { sha256Hex } from '$lib/sources/releaseDataPlane';

const url = new URL('https://example.test/review/manifest.json');
const hash = 'a'.repeat(64);
const entry = { id: 'question-01', label: 'Question 1', question: 'What applies?', package: { url: 'packages/question-01.json', sha256: hash } };
const manifest = { schema: 'okf-evidence-workbench.v1', title: 'Review', publication: { label: 'Experimental publication' }, questions: [entry] };

describe('evidence workbench manifest', () => {
  it('accepts a bounded relative package and rejects traversal, credentials and unsafe schemes', () => {
    expect(parseManifest(manifest, url).questions).toHaveLength(1);
    expect(packageUrl(entry.package.url, url).href).toBe('https://example.test/review/packages/question-01.json');
    for (const bad of ['../private.json', 'packages/%2e%2e/private.json', '//elsewhere.test/file.json', 'https://elsewhere.test/file.json', 'packages/a.json?token=secret', 'packages\\file.json']) {
      expect(() => packageUrl(bad, url)).toThrow();
    }
    expect(() => manifestUrl('javascript:alert(1)', url.href)).toThrow();
    expect(() => manifestUrl('https://user:pass@example.test/manifest.json', url.href)).toThrow();
    expect(() => manifestUrl('http://example.test/manifest.json', url.href)).toThrow();
  });

  it('rejects duplicate IDs, malformed hashes and excessive case lists', () => {
    expect(() => parseManifest({ ...manifest, questions: [entry, entry] }, url)).toThrow();
    expect(() => parseManifest({ ...manifest, questions: [{ ...entry, package: { ...entry.package, sha256: 'bad' } }] }, url)).toThrow();
    expect(() => parseManifest({ ...manifest, questions: Array.from({ length: 101 }, (_, i) => ({ ...entry, id: `q-${i}` })) }, url)).toThrow();
  });

  it('requires the selected question to match its package', () => {
    const value = { schema: 'okf-governed-context.v1', question: entry.question, context_id: 'urn:sha256:' + hash, scope: 'Review', bundle: { snapshot: 'one' }, binding: { index_sha256: hash }, selected: [], relationships: [], requirements: [], missing_evidence: [], conflicts: [], resolved_concepts: [], ambiguities: [], unresolved_terms: [], limitations: [], budget: { omissions: [], max_nodes: 10, max_relationships: 10, max_bytes: 8192, used_nodes: 0, used_relationships: 0, used_bytes: 1000 }, evidence_status: 'insufficient' };
    expect(parsePackage(value, entry).question).toBe(entry.question);
    expect(() => parsePackage({ ...value, question: 'Different question' }, entry)).toThrow();
    expect(() => parsePackage({ ...value, resolved_concepts: [{ label: 'Concept', matched: 'not an array', method: 'declared-phrase' }] }, entry)).toThrow('invalid concept');
    expect(() => parsePackage({ ...value, budget: { ...value.budget, omissions: 'not an array' } }, entry)).toThrow();
  });

  it('opens only safe HTTPS source links and uses a declared PDF page locator', () => {
    const record = { provenance: [{ url: 'https://assets.publishing.service.gov.uk/manual.pdf', locator: 'page 12', source_sha256: hash }] };
    expect(sourcePageUrl(record as never)).toBe('https://assets.publishing.service.gov.uk/manual.pdf#page=12');
    expect(sourcePageUrl({ provenance: [{ ...record.provenance[0], url: 'javascript:alert(1)' }] } as never)).toBeNull();
  });

  it('reads complete UTF-8 span boundaries without splitting a character', () => {
    const record = { text: 'A £5 limit' };
    expect(unitSpanText(record as never, 2, 5)).toBe('£5');
    expect(unitSpanText(record as never, 3, 5)).toBeNull();
  });

  it('exports an unreviewed proposal bound to the selected context and record', () => {
    const payload = JSON.parse(reviewDownload({ context_id: 'urn:sha256:' + hash, bundle: { snapshot: 'snapshot-1' }, binding: { index_sha256: hash } } as never, entry.id, 'record-1', '<script>text</script>', 'source-check'));
    expect(payload).toMatchObject({ schema: 'okf-evidence-review-proposal.v1', question_id: entry.id, record_id: 'record-1', authority: 'local-unreviewed-proposal', proposal: { status: 'source-check', comment: '<script>text</script>' } });
  });

  it('cancels the response stream when the byte ceiling is exceeded', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(256 * 1024 + 1)); },
      cancel() { cancelled = true; }
    });
    const response = { ok: true, url: url.href, headers: new Headers(), body: stream } as Response;
    const mocked = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    try {
      await expect(loadManifest(url)).rejects.toThrow('byte limit');
      expect(cancelled).toBe(true);
    } finally { mocked.mockRestore(); }
  });

  it('rejects a raw package with a matching file hash but false context digest', async () => {
    const raw = JSON.stringify({ schema: 'okf-governed-context.v1', ai_answer: null, context_id: 'urn:sha256:' + '0'.repeat(64), budget: {}, question: entry.question });
    const caseEntry = { ...entry, package: { ...entry.package, sha256: await sha256Hex(raw) } };
    const target = packageUrl(caseEntry.package.url, url);
    const mocked = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, url: target.href, headers: new Headers(), body: new Response(raw).body } as Response);
    try { await expect(loadPackage(caseEntry, url)).rejects.toThrow('decoded package identity differs'); }
    finally { mocked.mockRestore(); }
  });
});
