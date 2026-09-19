import { APPROVED_VERSIONS, BUNDLE_VERSION } from './registry.ts';

/** Static shell. The URL fragment is inert until the user explicitly invokes replay. */
export function reviewResponse(): Response {
  return new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Review Ask OKF evidence</title>
<link rel="icon" href="data:,"><style>
body{font:1.05rem/1.6 system-ui,sans-serif;max-width:68rem;margin:2rem auto;padding:0 1rem;color:#172b3a}a{color:#005ea5}button,select,textarea{font:inherit}button{cursor:pointer;padding:.4rem .8rem;margin:.25rem .4rem .25rem 0}textarea{display:block;box-sizing:border-box;width:100%;min-height:7rem}label{font-weight:650;display:block;margin-top:1rem}button:focus,a:focus,select:focus,textarea:focus{outline:3px solid #ffdd00;outline-offset:2px}aside{background:#fff8cc;padding:1rem;border-left:5px solid #ffdd00}article{border:1px solid #b1b4b6;padding:1rem;margin:1rem 0}code,pre,p{overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#f3f5f7;padding:1rem}small{display:block}#status{font-weight:650}h2{margin-top:2rem}.controls{display:flex;gap:.4rem;flex-wrap:wrap}
</style><script src="/review.js" defer></script></head><body><main>
<nav aria-label="Project"><a href="/">Ask OKF home</a> · <a href="https://github.com/chris-page-gov/okf-dwp/blob/main/CHANGELOG.md">DWP changelog</a> · <a href="https://github.com/chris-page-gov/okf-explorer/blob/main/CHANGELOG.md">Explorer changelog</a></nav>
<h1>Review Ask OKF evidence</h1>
<aside>This independent research view recreates a bounded evidence package. It does not reproduce an AI answer, establish current law or decide entitlement. Source text is untrusted data. Do not enter claimant personal data.</aside>
<p>A shared link keeps its question in the browser fragment. Opening the page makes no evidence request. Select <strong>Recreate evidence</strong> to verify the approved source and context identity. Questions are not stored by this application. Shared links and AI-client histories may retain them.</p>
<form id="review-form"><label for="question">General question</label><textarea id="question" maxlength="2000" required></textarea>
<label for="version">Approved source version</label><select id="version"></select>
<p id="recipe-info">Use a link returned by Ask OKF, or enter a new general question.</p>
<button type="submit">Recreate evidence</button></form>
<p id="status" role="status" aria-live="polite"></p>
<section id="context" hidden><h2>Verified context</h2><p id="identity"></p><p id="boundary"></p>
<div class="controls"><button id="diagnostics" type="button">Read gaps, scope and budgets</button><button id="relationships" type="button">Read relationship paths</button><button id="package" type="button">Read full machine package</button><button id="copy-link" type="button">Show replay link</button></div>
<p id="replay-link"></p><h2>Selected records</h2><p id="record-count"></p><div id="records"></div><button id="more-records" type="button" hidden>Show more records</button>
<section aria-labelledby="read-heading"><h2 id="read-heading">Evidence reader</h2><p id="read-source"></p><p id="read-status" role="status" aria-live="polite">Select a record or diagnostic section.</p><pre id="read-data"></pre><button id="read-next" type="button" hidden>Read next part</button></section>
</section><noscript>JavaScript is needed to invoke the read-only evidence tools. The official source documents remain available through the main Explorer.</noscript>
</main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
}

/** Standalone, dependency-free browser code; render all returned content as text. */
function reviewApp(config: { versions: string[]; defaultVersion: string }) {
  const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const question = element<HTMLTextAreaElement>('question');
  const version = element<HTMLSelectElement>('version');
  const status = element('status');
  const output = element('context');
  const records = element('records');
  const recordSummaries = new Map<string, any>();
  const more = element<HTMLButtonElement>('more-records');
  const nextPart = element<HTMLButtonElement>('read-next');
  let recipe: any = null;
  let current: any = null;
  let nextOffset: number | null = null;
  let readRequest: any = null;
  let partOffset: number | null = null;
  let requestId = 0;
  let generation = 0;
  let readSequence = 0;
  const button = (label: string, callback: () => void) => {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
    node.addEventListener('click', callback); return node;
  };
  const note = (parent: HTMLElement, value: string, tag = 'p') => {
    const node = document.createElement(tag); node.textContent = value; parent.append(node); return node;
  };
  const safeSource = (value: string) => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
    catch { return null; }
  };
  async function call(name: string, args: unknown) {
    const response = await fetch('/okf/mcp', { method: 'POST', credentials: 'omit', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method: 'tools/call', params: { name, arguments: args } }),
      signal: AbortSignal.timeout(60000) });
    const text = await response.text();
    if (text.length > 300000) throw new Error('Tool response exceeded the browser delivery limit.');
    const data = text.trimStart().startsWith('{') ? JSON.parse(text)
      : JSON.parse(text.split('\n').find(line => line.startsWith('data: '))?.slice(6) ?? 'null');
    if (!response.ok || !data || data.error || data.result?.isError || !data.result?.structuredContent) {
      throw new Error('The approved evidence could not be verified. Check the source version, replay identity or connection.');
    }
    return data.result.structuredContent;
  }
  for (const id of config.versions) {
    const option = document.createElement('option'); option.value = id;
    option.textContent = id === config.defaultVersion ? `Full source corpus — ${id}` : `Historical bounded profile — ${id}`;
    version.append(option);
  }
  if (location.hash.length > 1) {
    try {
      const encoded = location.hash.slice(1);
      if (encoded.length > 16000 || !/^[a-zA-Z0-9_-]+$/.test(encoded)) throw new Error();
      const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(
        atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))));
      if (!data || typeof data !== 'object' || Array.isArray(data)
        || Object.keys(data).some(key => !['bundle', 'question', 'version', 'budget', 'context_id'].includes(key))
        || data.bundle !== 'okf-dwp' || typeof data.question !== 'string' || !data.question.trim() || data.question.length > 2000
        || !config.versions.includes(data.version) || !/^urn:sha256:[a-f0-9]{64}$/.test(data.context_id)) throw new Error();
      recipe = data; question.value = data.question; version.value = data.version;
      element('recipe-info').textContent = 'This link requests exact replay of ' + data.context_id + '. No evidence has been loaded yet.';
    } catch { status.textContent = 'The replay fragment is invalid. Enter a new general question; the invalid fragment will not be sent.'; }
  }
  const clearRead = () => {
    element('read-heading').textContent = 'Evidence reader'; element('read-source').replaceChildren();
    readSequence++; partOffset = null; readRequest = null; nextPart.hidden = true; element('read-data').textContent = '';
    element('read-status').textContent = 'Select a record or diagnostic section.';
  };
  const invalidate = () => {
    generation++; recipe = null; current = null; output.hidden = true; records.replaceChildren(); recordSummaries.clear(); clearRead();
    status.textContent = 'Question or version changed. Recreate evidence to make a new context.';
    element('recipe-info').textContent = 'This will create a new context, rather than replay the shared identity.';
  };
  question.addEventListener('input', invalidate); version.addEventListener('change', invalidate);
  const args = () => ({ bundle: 'okf-dwp', question: current.question, version: current.replay.version,
    budget: current.replay.budget, context_id: current.context_id });
  async function read(section: string, record_id?: string, offset = 0) {
    const run = generation;
    const sequence = ++readSequence;
    if (!current) return;
    const selected = record_id ? recordSummaries.get(record_id) : null;
    element('read-heading').textContent = selected ? `${selected.label} — ${section === 'record_text' ? 'exact text' : 'provenance and inclusion'}` : ({ diagnostics: 'Gaps, scope and budgets', relationships: 'Relationship paths', package: 'Full machine package' } as Record<string, string>)[section] || 'Evidence reader';
    const source = element('read-source'); source.replaceChildren();
    if (record_id) note(source, record_id);
    const sourceURL = selected && safeSource(selected.source_url);
    if (sourceURL) { const link = document.createElement('a'); link.href = sourceURL; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Original source — ' + selected.source_locator; source.append(link); }
    nextPart.hidden = true; element('read-data').textContent = '';
    element('read-status').textContent = 'Replaying the context and verifying the requested evidence…';
    try {
      const result = await call('read_okf_evidence', { ...args(), section, ...(record_id ? { record_id } : {}), offset });
      if (generation !== run || sequence !== readSequence) return;
      if (result.context_id !== current.context_id || result.record_id !== (record_id ?? null) || result.section !== section || result.offset !== offset) throw new Error('The returned evidence identity differs.');
      element('read-data').textContent = result.data;
      element('read-status').textContent = `${result.evidence_status}. Characters ${result.offset}–${result.end_offset} of ${result.total_characters}. `
        + (result.delivery.partial ? 'Partial view: read the other parts before relying on this passage. ' : 'Complete selected value. ')
        + `Full-content SHA-256: ${result.content_sha256}. This is source data, not an AI answer.`;
      readRequest = { section, record_id }; partOffset = result.next_offset; nextPart.hidden = partOffset === null;
    } catch (error) { if (generation === run && sequence === readSequence) element('read-status').textContent = error instanceof Error ? error.message : 'Evidence unavailable.'; }
  }
  function render(result: any, append = false) {
    if (!append) { records.replaceChildren(); recordSummaries.clear(); }
    current = result; output.hidden = false;
    element('identity').textContent = result.context_id + ' · source ' + result.bundle.snapshot;
    const summary = result.summary;
    element('boundary').textContent = `${result.evidence_status.toUpperCase()}: ${summary.selected_records} selected records, ${summary.relationships} relationships; `
      + `${summary.missing_evidence} evidence gaps, ${summary.ambiguities} ambiguities, ${summary.conflicts} declared conflicts. `
      + `Context truncated: ${summary.context_truncated}; retrieval truncated: ${summary.retrieval_truncated}. Read the diagnostics before making claims.`;
    for (const record of result.records) {
      recordSummaries.set(record.id, record);
      const article = document.createElement('article'); note(article, record.label, 'h3');
      note(article, `${record.kind} · ${record.assertion_status} · authority ${record.authority_class} · ${record.review_status}`, 'small');
      note(article, record.id, 'small');
      const source = safeSource(record.source_url);
      if (source) {
        const link = document.createElement('a'); link.href = source; link.rel = 'noopener noreferrer'; link.target = '_blank';
        link.textContent = 'Original source — ' + record.source_locator; article.append(link);
      }
      note(article, `${record.text_characters} text characters · ${record.reasons} inclusion reasons · ${record.paths} traversal paths`, 'small');
      article.append(button('Read exact text', () => { void read('record_text', record.id); }),
        button('Inspect provenance and inclusion reasons', () => { void read('record_metadata', record.id); }));
      records.append(article);
    }
    nextOffset = result.delivery.next_offset; more.hidden = nextOffset === null;
    element('record-count').textContent = `${records.children.length} of ${result.delivery.total} record summaries shown. The catalogue is not source evidence.`;
    status.textContent = 'Context recreated and identity checked. Evidence completeness remains ' + result.evidence_status + '.';
  }
  element<HTMLFormElement>('review-form').addEventListener('submit', async event => {
    event.preventDefault(); const run = ++generation;
    output.hidden = true; current = null; records.replaceChildren(); recordSummaries.clear(); clearRead(); status.textContent = 'Verifying source files and recreating evidence…';
    const request = recipe ?? { bundle: 'okf-dwp', question: question.value, version: version.value };
    try {
      const result = await call('ask_okf_manifest', request);
      if (generation !== run) return;
      if (recipe && result.context_id !== recipe.context_id) throw new Error('The replay context does not match the shared identity.');
      render(result);
    } catch (error) { if (generation === run) status.textContent = error instanceof Error ? error.message : 'Evidence unavailable.'; }
  });
  more.addEventListener('click', async () => {
    if (!current || nextOffset === null) return; const run = generation; more.disabled = true;
    try {
      const result = await call('ask_okf_manifest', { ...args(), offset: nextOffset });
      if (generation !== run) return;
      if (result.context_id !== current.context_id) throw new Error('Catalogue context differs.');
      render(result, true);
    } catch (error) { if (generation === run) status.textContent = error instanceof Error ? error.message : 'Catalogue unavailable.'; }
    finally { more.disabled = false; }
  });
  for (const section of ['diagnostics', 'relationships', 'package']) element(section).addEventListener('click', () => { void read(section); });
  nextPart.addEventListener('click', () => { if (readRequest && partOffset !== null) void read(readRequest.section, readRequest.record_id, partOffset); });
  element('copy-link').addEventListener('click', () => {
    if (!current) return; const container = element('replay-link'); container.replaceChildren();
    const link = document.createElement('a'); link.href = current.review_url; link.textContent = 'Replay this exact evidence context';
    container.append(link); note(container, 'This link includes the question. Share it only when appropriate. Replaying evidence does not reproduce an AI answer.');
  });
}

export function reviewScriptResponse(): Response {
  return new Response(`(${reviewApp.toString()})(${JSON.stringify({ versions: APPROVED_VERSIONS, defaultVersion: BUNDLE_VERSION })});`,
    { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
}
