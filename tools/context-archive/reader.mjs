import { LIMITS, canonical, strictJson, sha256, checkedRef, requireValue, joinEvidence, safeWebUrl } from './shared.mjs';

/** Only a fixed same-origin archive path is admitted; no URL from source text is fetched. */
export function archiveUrl(root, path) {
  requireValue(/^(?:index\.json|[a-f0-9]{64}\/(?:descriptor\.json|package\.json|data\/[a-f0-9]{64}\.json))$/.test(path), 'unsafe archive path');
  const base = new URL(root), url = new URL(path, base);
  requireValue(url.origin === base.origin && url.pathname.startsWith(base.pathname) && !url.search && !url.hash, 'resource escaped archive'); return url;
}
export function makeLoader(root, signal, fetcher = fetch) {
  let requests = 0, bytes = 0;
  const seen = new Map();
  return async function load(path, ref, ceiling = LIMITS.resource_bytes) {
    checkedRef(ref, ceiling); const url = archiveUrl(root, path);
    const key = `${path}:${ref.sha256}`;
    if (seen.has(key)) return seen.get(key);
    requireValue(++requests <= LIMITS.requests, 'request count exhausted');
    const result = (async () => {
      const response = await fetcher(url, { credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
        signal: AbortSignal.any([signal, AbortSignal.timeout(LIMITS.request_ms)]) });
      requireValue(response.ok && !response.redirected && (!response.url || response.url === url.href), 'resource request failed or redirected');
      const announced = response.headers.get('content-length');
      requireValue(announced === null || /^\d+$/.test(announced) && Number(announced) <= ceiling, 'response announces excessive bytes');
      requireValue(response.body, 'response has no body'); const reader = response.body.getReader();
      let length = 0; const chunks = [];
      try {
        while (true) { const { done, value } = await reader.read(); if (done) break;
          length += value.length; bytes += value.length;
          requireValue(!signal.aborted && length <= ref.bytes && length <= ceiling && bytes <= LIMITS.archive_bytes, 'response or aggregate byte limit'); chunks.push(value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      requireValue(!signal.aborted && length === ref.bytes, 'incomplete or cancelled response');
      const raw = new Uint8Array(length); let at = 0; for (const chunk of chunks) { raw.set(chunk, at); at += chunk.length; }
      requireValue(await sha256(raw) === ref.sha256 && !signal.aborted, 'resource hash differs');
      return strictJson(new TextDecoder('utf-8', { fatal: true }).decode(raw), true);
    })();
    seen.set(key, result); return result;
  };
}

export function validateDescriptor(d, entry) {
  requireValue(d.schema === 'okf-context-archive.v1' && d.id === entry.id && d.package_sha256 === entry.package_sha256
    && d.evidence_status === entry.evidence_status && d.ai_answer === null
    && /^urn:sha256:[a-f0-9]{64}$/.test(d.context_id) && d.package_bytes <= LIMITS.package_bytes
    && d.counts.records <= LIMITS.records && d.counts.relationships <= LIMITS.relationships,
  'descriptor identity or limits differ');
  requireValue(Array.isArray(d.catalogues) && d.catalogues.length > 0 && d.catalogues.length <= LIMITS.files
    && Array.isArray(d.record_indexes) && d.record_indexes.length <= LIMITS.records, 'invalid catalogue list');
  for (const name of ['package', 'relationships', 'diagnostics']) requireValue(Array.isArray(d.sections[name]) && d.sections[name].length > 0 && d.sections[name].length <= LIMITS.files, 'invalid evidence section');
  return d;
}

export async function readStream(load, folder, descriptor, section, refs, record_id) {
  requireValue(Array.isArray(refs) && refs.length > 0 && refs.length <= LIMITS.files, 'invalid stream resource list');
  const parts = []; for (const ref of refs) parts.push(await load(`${folder}/data/${checkedRef(ref).sha256}.json`, ref));
  const text = await joinEvidence(parts, { context_id: descriptor.context_id, evidence_status: descriptor.evidence_status, section, record_id });
  if (section === 'package') requireValue(await sha256(text) === descriptor.package_sha256 && new TextEncoder().encode(text).length === descriptor.package_bytes, 'whole package identity differs');
  return text;
}

export async function startReader(document, location, fetcher = fetch) {
  const status = document.getElementById('status'), examples = document.getElementById('examples'), host = document.getElementById('example');
  const root = new URL('./', location.href); let controller = new AbortController(), generation = 0;
  const el = (tag, text, parent) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = String(text); if (parent) parent.append(node); return node; };
  const link = (parent, label, href) => { const safe = safeWebUrl(href); if (!safe) return el('span', `${label}: URL unavailable`, parent); const a = el('a', label, parent); a.href = safe; a.rel = 'noopener noreferrer'; return a; };
  const fail = error => { status.textContent = `Evidence unavailable: ${error.message}`; status.className = 'error'; };
  try {
    const [hash, size] = document.querySelector('meta[name="okf-archive-index"]').content.split(':');
    const index = await makeLoader(root, controller.signal, fetcher)('index.json', { sha256: hash, bytes: Number(size) }, LIMITS.catalogue_bytes);
    requireValue(index.schema === 'okf-context-archive-index.v1' && Array.isArray(index.cases) && index.cases.length > 0 && index.cases.length <= LIMITS.cases, 'invalid published index');
    requireValue(new Set(index.cases.map(x => x.id)).size === index.cases.length, 'duplicate example ID');
    for (const entry of index.cases) {
      requireValue(/^[a-z0-9][a-z0-9-]{0,63}$/.test(entry.id) && /^[a-f0-9]{64}$/.test(entry.package_sha256)
        && entry.path === `${entry.package_sha256}/descriptor.json`, 'invalid fixed example path');
      const a = el('a', entry.title, examples); a.href = `#${entry.id}`;
    }
    async function select() {
      controller.abort(); controller = new AbortController(); const current = ++generation;
      host.replaceChildren(); host.hidden = true; status.className = ''; status.textContent = 'Choose a published example.';
      const id = location.hash.slice(1); if (!id) return;
      const entry = index.cases.find(x => x.id === id); if (!entry) { fail(new Error('example is not in the reviewed publication')); return; }
      const active = () => current === generation && !controller.signal.aborted;
      const load = makeLoader(root, controller.signal, fetcher), folder = entry.package_sha256;
      try {
        status.textContent = 'Verifying recorded example…';
        const d = validateDescriptor(await load(entry.path, entry.descriptor), entry);
        if (!active()) return;
        const section = document.createElement('div'); el('h2', d.title, section).id = 'example-heading';
        el('p', d.question, section);
        el('aside', `Recorded ${d.observation_kind} observation. Evidence ${d.evidence_status}. ${d.notice}`, section);
        el('p', d.publication_note, section);
        const identity = el('dl', undefined, section); identity.className = 'identity';
        for (const [name, value] of [['Source version', d.source_version], ['Bundle snapshot', d.bundle.snapshot], ['Context identifier', d.context_id], ['Whole-package SHA-256', d.package_sha256], ['Recorded assembler', d.engine_id || 'Unknown'], ['Original assembler', d.original_engine_id || 'Unknown; a compatible reconstruction does not establish the original engine']]) { el('dt', name, identity); el('dd', value, identity); }
        const diagnostics = strictJson(await readStream(load, folder, d, 'diagnostics', d.sections.diagnostics), true);
        requireValue(diagnostics.context_id === d.context_id && diagnostics.evidence_status === d.evidence_status && diagnostics.ai_answer === null, 'diagnostic identity changed');
        if (!active()) return;
        el('h3', 'Gaps, ambiguity and scope', section);
        const issues = el('ul', undefined, section);
        for (const item of [...diagnostics.missing_evidence, ...diagnostics.conflicts, ...diagnostics.budget.omissions]) el('li', `${item.code}: ${item.message}`, issues);
        for (const item of diagnostics.ambiguities) el('li', `Unresolved alternative: ${item.phrase} — ${item.candidates.join(' or ')}`, issues);
        for (const term of diagnostics.unresolved_terms) el('li', `Unresolved term: ${term}`, issues);
        for (const item of diagnostics.requirements) if (item.status === 'insufficient') el('li', `Unmet requirement ${item.id}: ${item.missing.join(', ')}`, issues);
        el('p', `Context limited: ${diagnostics.budget.truncated}. Retrieval limited: ${diagnostics.retrieval?.truncated ?? false}. No AI answer is included.`, section);
        el('h3', 'Resolved concepts', section); const concepts = el('ul', undefined, section);
        for (const item of diagnostics.resolved_concepts) el('li', `${item.label} (${item.id}); matched ${item.matched.join(', ')}`, concepts);
        el('p', diagnostics.scope, section); for (const note of diagnostics.limitations) el('p', note, section);
        const recordRefs = new Map();
        for (const ref of d.record_indexes) for (const row of await load(`${folder}/data/${checkedRef(ref, LIMITS.catalogue_bytes).sha256}.json`, ref, LIMITS.catalogue_bytes)) {
          requireValue(!recordRefs.has(row.id) && recordRefs.size < LIMITS.records, 'duplicate or excessive record index'); recordRefs.set(row.id, row);
        }
        const records = []; let offset = 0;
        for (const [i, ref] of d.catalogues.entries()) {
          const page = await load(`${folder}/data/${checkedRef(ref, LIMITS.catalogue_bytes).sha256}.json`, ref, LIMITS.catalogue_bytes);
          requireValue(page.schema === 'okf-context-manifest.v1' && page.context_id === d.context_id && page.evidence_status === d.evidence_status
            && page.delivery.offset === offset && page.delivery.total === d.counts.records && page.delivery.returned === page.records.length, 'catalogue identity or offsets changed');
          records.push(...page.records); offset += page.records.length;
          requireValue(page.delivery.next_offset === (i === d.catalogues.length - 1 ? null : offset), 'catalogue gap');
        }
        requireValue(records.length === d.counts.records && new Set(records.map(x => x.id)).size === records.length && recordRefs.size === records.length && records.every(x => recordRefs.has(x.id)), 'selected catalogue differs');
        if (!active()) return;
        const controls = el('div', undefined, section);
        const output = el('section', undefined, section); output.setAttribute('aria-label', 'Verified evidence detail');
        let readGeneration = 0;
        const button = (parent, label, action) => {
          const b = el('button', label, parent); b.type = 'button'; b.addEventListener('click', async () => {
            const read = ++readGeneration; output.replaceChildren(); status.textContent = 'Reading and verifying every part…'; b.disabled = true;
            try { const show = await action(); if (active() && read === readGeneration) { output.replaceChildren(show); status.textContent = 'Complete selected value verified against its retained hash.'; output.querySelector('h3')?.focus(); } }
            catch (error) { if (active() && read === readGeneration) { output.replaceChildren(); fail(error); } }
            finally { if (active()) b.disabled = false; }
          }); return b;
        };
        const heading = (text, parent) => { const h = el('h3', text, parent); h.tabIndex = -1; };
        button(controls, 'Read directed relationships', async () => {
          const rows = strictJson(await readStream(load, folder, d, 'relationships', d.sections.relationships), true);
          requireValue(rows.length === d.counts.relationships, 'relationship census differs');
          const box = document.createElement('div'); heading('Directed relationships', box); const ul = el('ul', undefined, box);
          const names = new Map(records.map(x => [x.id, x.label]));
          for (const row of rows) { el('li', `${names.get(row.source) || row.source} → ${row.label} → ${names.get(row.target) || row.target}; ${row.predicate}; ${row.assertion_status}; ${row.authority.label}`, ul); }
          el('p', 'Unselected endpoints are references only. This view does not fetch additional corpus evidence.', box); return box;
        });
        button(controls, 'Verify complete machine package', async () => { const text = await readStream(load, folder, d, 'package', d.sections.package); const box = document.createElement('div'); heading('Complete machine package', box); el('pre', text, box); link(box, 'Download retained canonical JSON', new URL(`${folder}/package.json`, root).href); return box; });
        el('h3', `Selected records (${records.length})`, section);
        if (!records.length) el('p', 'No records selected. This empty result does not answer the question.', section);
        for (const row of records) {
          const article = el('article', undefined, section); el('h4', row.label, article);
          el('p', `${row.kind}; ${row.assertion_status}; ${row.authority_class}; review: ${row.review_status}`, article);
          link(article, row.source_locator || 'Source reference', row.source_url);
          const machine = el('p', 'Small machine-readable resources: ', article), refs = recordRefs.get(row.id);
          link(machine, 'Text (first exact part)', new URL(`${folder}/data/${refs.text[0].sha256}.json`, root).href);
          el('span', ' · ', machine); link(machine, 'Metadata (first exact part)', new URL(`${folder}/data/${refs.metadata[0].sha256}.json`, root).href);
          el('span', ' — parts alone may be incomplete; use the verified reader for the whole value.', machine);
          button(article, `Read evidence: ${row.label}`, async () => {
            const refs = recordRefs.get(row.id);
            const metadata = strictJson(await readStream(load, folder, d, 'record_metadata', refs.metadata, row.id), true);
            const text = await readStream(load, folder, d, 'record_text', refs.text, row.id);
            requireValue(metadata.record.id === row.id && await sha256(text) === row.text_sha256 && metadata.record.text_reference.sha256 === row.text_sha256, 'record metadata or catalogue text hash differs');
            const box = document.createElement('div'); heading(row.label, box); el('pre', text, box);
            el('h4', 'Why included and traversal', box); const reasons = el('ul', undefined, box);
            for (const reason of metadata.reasons) el('li', reason, reasons);
            for (const path of metadata.paths) el('li', `${path.records.join(' → ')}; assertion IDs: ${path.assertions.join(', ') || 'Starting record'}`, reasons);
            el('h4', 'Provenance, authority and dates', box);
            el('p', `${metadata.record.authority.label}; ${metadata.record.assertion_status}; scope: ${metadata.record.scope}; rights: ${metadata.record.rights}`, box);
            for (const source of metadata.record.provenance) { link(box, source.locator || 'Official/reference source', source.url); el('p', `Captured: ${source.captured_at}; ${source.source_date_kind || 'Source date'}: ${source.source_date || 'Not declared'}; source SHA-256: ${source.source_sha256}`, box); }
            const details = el('details', undefined, box); el('summary', 'All retained metadata and hash references', details); el('pre', canonical(metadata), details); return box;
          });
        }
        host.replaceChildren(section); host.hidden = false; status.textContent = 'Recorded index, gaps and catalogue verified. Select evidence to verify and read its complete value.';
      } catch (error) { if (active()) { host.replaceChildren(); host.hidden = true; fail(error); } }
    }
    globalThis.addEventListener('hashchange', select); await select();
  } catch (error) { fail(error); }
}
if (typeof document !== 'undefined') void startReader(document, location);
