<script lang="ts">
  import { onMount } from 'svelte';
  import { pushState, replaceState } from '$app/navigation';
  import PdfCanvas from '$lib/evidence/PdfCanvas.svelte';
  import { loadPassageManifest, loadPassageCaseReference, loadPassageCase, loadVerifiedPdf, pdfPageUrl, previewCorrection, proposedAddedSpans, MAX_CORRECTION_BYTES, type PassageManifest, type CaseReference, type PassageCase, type LoadedCase, type Preview, type Correction } from '$lib/evidence/passages';
  import { sha256Hex } from '$lib/sources/releaseDataPlane';

  let input = $state('');
  let manifest = $state<PassageManifest | null>(null);
  let manifestUrl = $state<URL | null>(null);
  let manifestSha = $state('');
  let selected = $state<PassageCase | null>(null);
  let loaded = $state<LoadedCase | null>(null);
  let page = $state(1);
  let filter = $state('');
  let loading = $state(false);
  let error = $state('');
  let correctionText = $state('');
  let preview = $state<Preview | null>(null);
  let previewInput = $state<Correction | null>(null);
  let reviewer = $state('');
  let reviewDate = $state('');
  let decision = $state('needs-independent-review');
  let rationale = $state('');
  let pdfBlobUrl = $state('');
  let pdfBlob = $state<Blob | null>(null);
  let pdfMessage = $state('');
  let previewSource = $state('');
  let previewRevision = 0;
  let loadController: AbortController | null = null;
  let generation = 0;
  const visible = $derived(manifest?.cases.filter(item => `${item.id} ${item.label}`.toLocaleLowerCase('en-GB').includes(filter.toLocaleLowerCase('en-GB'))) ?? []);
  const selectedPage = $derived(selected?.pages.find(item => item.number === page));
  const pdfUrl = $derived(selected && manifestUrl ? pdfPageUrl(selected, manifestUrl, page) : '');
  const inlinePdfUrl = $derived(pdfBlobUrl ? `${pdfBlobUrl}#page=${page}` : '');

  function begin() { loadController?.abort(); const controller = new AbortController(); loadController = controller; const revision = ++generation; return { controller, active: () => loadController === controller && revision === generation && !controller.signal.aborted }; }
  function draft(item: PassageCase): Correction {
    const operation = item.after.length > item.before.length ? 'split' : item.after.length < item.before.length ? 'join' : 'role-change';
    return { schema: 'okf-passage-correction.v1', id: `${item.id}-suggestion`, version: '1', case_id: item.id, source_sha256: item.document.extraction.sha256, baseline_sha256: item.document.baseline_sha256, operation, rationale: item.observation.rationale, uncertainty: item.observation.uncertainty, added_spans: proposedAddedSpans(item), units: item.after };
  }
  function unitHeading(unit: PassageCase['before'][number]) { return `${unit.paragraph_labels.join(', ') || 'Unlabelled passage'} · ${unit.role}`; }
  function address(caseId: string, mode: 'push' | 'replace' = 'push') {
    if (!manifestUrl) return;
    const params = new URLSearchParams({ manifest: manifestUrl.href, case: caseId });
    const next = `${window.location.pathname}?${params}`;
    if (mode === 'push') pushState(next, {}); else replaceState(next, {});
  }
  async function choose(reference: CaseReference, mode: 'push' | 'replace' = 'push') {
    if (!manifestUrl) return;
    const request = begin();
    selected = null; loaded = null; error = ''; loading = true; preview = null; previewInput = null; previewSource = ''; previewRevision++; rationale = '';
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); pdfBlobUrl = ''; pdfBlob = null; pdfMessage = '';
    try {
      const { item } = await loadPassageCaseReference(reference, manifestUrl, request.controller.signal);
      const next = await loadPassageCase(item, manifestUrl, request.controller.signal);
      if (!request.active()) return;
      selected = item;
      loaded = next;
      page = item.before[0]?.spans[0]?.page ?? item.pages[0].number;
      correctionText = JSON.stringify(draft(item), null, 2);
      address(reference.id, mode);
      pdfMessage = 'Checking PDF bytes…';
      void loadVerifiedPdf(item, manifestUrl, request.controller.signal).then(blob => {
        if (!request.active() || selected?.id !== item.id) return;
        pdfBlob = blob;
        pdfBlobUrl = URL.createObjectURL(blob);
        pdfMessage = 'PDF SHA-256 verified against frozen source evidence.';
      }).catch(cause => {
        if (request.active() && selected?.id === item.id) pdfMessage = `Inline PDF unavailable: ${cause instanceof Error ? cause.message : String(cause)} The source-declared PDF link is available separately.`;
      });
    } catch (cause) { if (request.active()) error = cause instanceof Error ? cause.message : String(cause); }
    finally { if (request.active()) loading = false; }
  }
  async function open(raw: string, wanted = '') {
    const request = begin();
    manifest = null; selected = null; loaded = null; error = ''; loading = true; preview = null; manifestUrl = null;
    try {
      const next = await loadPassageManifest(raw, window.location.href, request.controller.signal);
      if (!request.active()) return;
      manifest = next.manifest; manifestUrl = next.url; manifestSha = next.sha256; input = next.url.href;
      const reference = next.manifest.cases.find(row => row.id === wanted) ?? next.manifest.cases[0];
      if (reference) await choose(reference, 'replace');
    } catch (cause) { if (request.active()) error = cause instanceof Error ? cause.message : String(cause); }
    finally { if (request.active()) loading = false; }
  }
  async function runPreview() {
    if (!selected || !loaded) return;
    const caseId = selected.id, data = loaded, sourceText = correctionText, revision = ++previewRevision;
    if (sourceText.length > MAX_CORRECTION_BYTES || new TextEncoder().encode(sourceText).byteLength > MAX_CORRECTION_BYTES) {
      preview = { accepted: false, checks: [], error: 'Correction JSON exceeds the 512 KiB byte limit.', before: selected.before, after: selected.after, migration: [], impact: { passage: 'unknown', document: 'unknown', corpus: 'unknown', downstream: 'unknown' } }; previewInput = null; previewSource = sourceText; return;
    }
    let parsed: unknown;
    try { parsed = JSON.parse(sourceText); }
    catch { preview = { accepted: false, checks: [], error: 'Correction is not valid JSON.', before: selected.before, after: selected.after, migration: [], impact: { passage: 'unknown', document: 'unknown', corpus: 'unknown', downstream: 'unknown' } }; previewInput = null; previewSource = sourceText; return; }
    const result = await previewCorrection(selected, data, parsed, manifest?.impact);
    if (revision !== previewRevision || selected?.id !== caseId || loaded !== data || correctionText !== sourceText) return;
    previewInput = parsed as Correction; preview = result; previewSource = sourceText;
  }
  function download(name: string, value: unknown) {
    const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
    const link = document.createElement('a'); const href = URL.createObjectURL(blob);
    link.href = href; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  async function exportDecision() {
    if (!selected || !preview || previewSource !== correctionText || !reviewer.trim() || !reviewDate || !rationale.trim() || (!preview.accepted && ['suggest-change', 'accept-for-producer-review'].includes(decision))) return;
    const caseId = selected.id, sourceText = correctionText, result = preview, correction = previewInput;
    const decided = decision, reviewerName = reviewer.trim(), date = reviewDate, reason = rationale.trim();
    if (sourceText.length > MAX_CORRECTION_BYTES || new TextEncoder().encode(sourceText).byteLength > MAX_CORRECTION_BYTES) return;
    const correctionTextSha = await sha256Hex(new TextEncoder().encode(sourceText));
    if (selected?.id !== caseId || correctionText !== sourceText || preview !== result || previewInput !== correction || decision !== decided || reviewer.trim() !== reviewerName || reviewDate !== date || rationale.trim() !== reason) return;
    download(`passage-review-${selected.id}.json`, { schema: 'okf-passage-review-decision.v1', case_id: selected.id,
      reviewer: reviewerName, date, decision: decided, rationale: reason, authority: 'local-unreviewed-proposal',
      manifest_sha256: manifestSha, source_sha256: selected.document.extraction.sha256, pdf_sha256: selected.document.pdf.sha256,
      baseline_sha256: selected.document.baseline_sha256, parser: selected.document.parser, correction_text_sha256: correctionTextSha, correction_text: sourceText, correction,
      preview: result });
  }
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('manifest');
    if (raw) void open(raw, params.get('case') ?? '');
    const onPop = () => { const next = new URLSearchParams(window.location.search); const source = next.get('manifest'); if (source) void open(source, next.get('case') ?? ''); else { loadController?.abort(); generation++; manifest = null; manifestUrl = null; selected = null; loaded = null; preview = null; error = ''; input = ''; } };
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('popstate', onPop); loadController?.abort(); if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
  });
</script>

<svelte:head><title>Passage boundaries | Evidence workbench</title><meta name="description" content="Inspect source-bound passage proposals and export local review records." /></svelte:head>
<div class="shell">
  <header><p><a href="../">← Evidence workbench</a></p><h1>Passage boundaries</h1><p>Inspect exact extracted source bytes and proposed structure. This is an experimental review view; preview does not adopt a change.</p></header>
  <form class="loader" onsubmit={(event) => { event.preventDefault(); void open(input); }}>
    <label for="manifest">Passage review manifest URL</label><input id="manifest" type="url" bind:value={input} placeholder="https://…/manifest.json" required /><button type="submit">Load</button>
  </form>
  {#if error}<p role="alert" class="error">{error}</p>{/if}
  {#if loading}<p role="status">Loading and checking source bytes…</p>{/if}
  {#if manifest}<p class="identity">{manifest.title} · {manifest.cases.length} cases · manifest SHA-256 {manifestSha}</p>
    <details><summary>Corpus impact supplied by the producer</summary><p>Parked broad candidate: {manifest.impact.changed_documents ?? 'unknown'} changed documents; {Array.isArray(manifest.impact.substantive_chapters_changed) ? manifest.impact.substantive_chapters_changed.length : 'unknown'} substantive chapters; {manifest.impact.candidate_units ?? 'unknown'} candidate units. This is a producer census, not a review decision.</p>{#if manifest.candidate_comparison}<p>Narrowed successor: {manifest.candidate_comparison.changed_documents ?? 'unknown'} changed documents; {manifest.candidate_comparison.substantive_chapters_changed ?? 'unknown'} substantive chapters; {manifest.candidate_comparison.candidate_units ?? 'unknown'} candidate units. The source-case outputs are separately hash-bound.</p>{#if manifest.candidate_comparison.settings_text}<details><summary>Narrowed successor parser settings</summary><pre>{manifest.candidate_comparison.settings_text}</pre><p>Settings SHA-256: {manifest.candidate_comparison.settings_sha256}</p><p>Implementation bindings SHA-256: {manifest.candidate_comparison.implementation_bindings_sha256 ?? 'Not supplied'}</p></details>{/if}{/if}<p>This isolated browser correction does not run dependency, question or budget analyses. Consult the producer’s separate replay for measured corpus-level effects.</p></details>
  {/if}
  {#if manifest}
    <div class="layout">
      <nav aria-label="Passage cases"><p class="current-case"><strong>Current case:</strong> {selected?.label ?? 'Loading'}</p><label for="case-filter">Filter cases</label><input id="case-filter" bind:value={filter} /><ol>{#each visible as item}<li><button type="button" class:current={item.id === selected?.id} aria-current={item.id === selected?.id ? 'page' : undefined} onclick={() => void choose(item)}>{item.label}</button></li>{/each}</ol></nav>
      <main>
        {#if selected}
        <h2>{selected.label}</h2><p><strong>{selected.observation.classification}</strong> · parked proposal review: {selected.review.status}</p>
        {#if selected.technical_outcome}<p><strong>Successor target boundary:</strong> {selected.technical_outcome.target_boundary}. {selected.technical_outcome.rationale}</p><details><summary>Other technical findings and answerability</summary><p>Legal answerability: {selected.technical_outcome.legal_answerability}</p>{#if selected.technical_outcome.residual_structural_findings.length}<ul>{#each selected.technical_outcome.residual_structural_findings as finding}<li>{finding}</li>{/each}</ul>{:else}<p>No residual structural findings recorded.</p>{/if}</details>{/if}
        <p>{selected.observation.rationale}</p>
        {#if selected.observation.uncertainty}<p><strong>Uncertainty:</strong> {selected.observation.uncertainty}</p>{/if}
        {#if loaded}
          <div class="source-grid">
            <section><h3>Source PDF</h3><label for="source-page">Source page</label><select id="source-page" bind:value={page}>{#each selected.pages as item}<option value={item.number}>Page {item.number}</option>{/each}</select><p><a href={pdfUrl} target="_blank" rel="noopener noreferrer">Open source-declared PDF at page {page}</a></p><p role="status">{pdfMessage}</p>{#if pdfBlob}<PdfCanvas pdf={pdfBlob} {page} />{/if}{#if inlinePdfUrl}<p><a href={inlinePdfUrl} target="_blank" rel="noopener noreferrer">Open verified PDF copy at page {page}</a></p>{/if}<p class="small">PDF SHA-256: {selected.document.pdf.sha256}. The page locator is synchronised; word-level highlighting is unavailable.</p></section>
            <section><h3>Exact extracted text</h3><p>Page {page}, UTF-8 bytes {selectedPage?.start_utf8}–{selectedPage?.end_utf8}</p><pre>{selectedPage ? new TextDecoder('utf-8', { fatal: true }).decode(loaded.source.subarray(selectedPage.start_utf8, selectedPage.end_utf8)) : ''}</pre><p class="small">Verified extraction SHA-256: {selected.document.extraction.sha256}</p></section>
          </div>
          <div class="source-grid passages">
            <section><h3>Before: current units</h3>{#each loaded.before as row}<article><h4>{unitHeading(row.unit)}</h4><details><summary>Full unit ID</summary><code>{row.unit.id}</code></details><p class="small">{row.unit.spans.map(span => `page ${span.page}, bytes ${span.start_utf8}–${span.end_utf8}`).join('; ')}</p><pre>{row.text}</pre></article>{/each}</section>
            <section><h3>After: parked proposal</h3>{#each loaded.after as row}<article><h4>{unitHeading(row.unit)}</h4><details><summary>Full unit ID</summary><code>{row.unit.id}</code></details><p class="small">{row.unit.spans.map(span => `page ${span.page}, bytes ${span.start_utf8}–${span.end_utf8}`).join('; ')}</p><pre>{row.text}</pre></article>{/each}</section>
          </div>
          {#if loaded.successorAfter}<section class="preview"><h3>Narrowed successor units</h3><p>These source-verified units record the later technical correction. The parked proposal above remains the original comparison.</p>{#each loaded.successorAfter as row}<article><h4>{unitHeading(row.unit)}</h4><details><summary>Full unit ID</summary><code>{row.unit.id}</code></details><p class="small">{row.unit.spans.map(span => `page ${span.page}, bytes ${span.start_utf8}–${span.end_utf8}`).join('; ')}</p><pre>{row.text}</pre></article>{/each}</section>{/if}
          <details><summary>How this passage was built</summary><dl><dt>Observation method</dt><dd>{selected.observation.method}</dd><dt>Parser version</dt><dd>{selected.document.parser.version}</dd><dt>Ruleset version</dt><dd>{selected.document.parser.ruleset_version}</dd><dt>Applied rules</dt><dd>{selected.document.parser.applied_rules.join(', ') || 'None declared'}</dd><dt>Implementation bindings</dt><dd><pre>{JSON.stringify(selected.document.parser.implementation_bindings ?? 'Not supplied', null, 2)}</pre></dd><dt>Parser settings</dt><dd><pre>{selected.document.parser.settings_text ?? 'Settings text not supplied'}</pre></dd><dt>Settings SHA-256</dt><dd>{selected.document.parser.settings_sha256}</dd><dt>Baseline SHA-256</dt><dd>{selected.document.baseline_sha256}</dd><dt>Source version</dt><dd>{selected.document.id} · {selected.document.version}</dd><dt>Old passage byte coverage</dt><dd>{selected.coverage ? `${selected.coverage.covered_once_bytes} of ${selected.coverage.old_passage_bytes} bytes; ${selected.coverage.candidate_bytes_outside_old_passage} candidate bytes outside old passage. ${selected.coverage.scope}` : 'Unknown'}</dd><dt>Uncertainty</dt><dd>{selected.observation.uncertainty || 'None recorded'}</dd></dl>{#if selected.observation.source_links.length}<ul>{#each selected.observation.source_links as link}<li><a href={link.pdf_url} target="_blank" rel="noopener noreferrer">Source observation, page {link.page}: {link.literal}</a></li>{/each}</ul>{/if}</details>
          <section class="preview"><h3>Isolated correction preview</h3><p>Edit this closed JSON proposal to split, join or change a role. Preview validates exact source and baseline identities, text hashes and byte coverage.</p><label for="correction">Correction JSON</label><textarea id="correction" rows="14" maxlength={MAX_CORRECTION_BYTES} bind:value={correctionText} oninput={() => { previewRevision++; }}></textarea><button type="button" onclick={() => void runPreview()}>Preview correction</button>
            {#if preview}<div class:failure={!preview.accepted} role="status"><h4>{preview.accepted ? 'Preview passed' : 'Preview rejected'}</h4>{#if previewSource !== correctionText}<p>The correction JSON has changed since this preview. Its result is retained for comparison; run preview again before exporting.</p>{/if}{#if preview.error}<p>{preview.error}</p>{/if}<ul>{#each preview.checks as check}<li>{check}</li>{/each}</ul><h4>Four-scale impact</h4><dl>{#each Object.entries(preview.impact) as [scale, value]}<dt>{scale}</dt><dd><pre>{JSON.stringify(value, null, 2)}</pre></dd>{/each}</dl>{#if preview.migration.length}<h4>ID migration proposal</h4><ul>{#each preview.migration as row}<li>{row.from} → {row.to.join(', ') || 'unresolved'}</li>{/each}</ul>{/if}</div>{/if}
          </section>
          <section class="decision"><h3>Local review record</h3><p>This export records a suggestion or decision for separate producer review. It does not change the corpus or grant legal acceptance.</p><label for="reviewer">Reviewer</label><input id="reviewer" bind:value={reviewer} /><label for="date">Review date</label><input id="date" type="date" bind:value={reviewDate} /><label for="decision">Decision</label><select id="decision" bind:value={decision}><option value="needs-independent-review">Needs independent review</option><option value="suggest-change">Suggest change</option><option value="reject-change">Reject change</option><option value="accept-for-producer-review">Accept for producer review</option></select><label for="rationale">Reason</label><textarea id="rationale" rows="4" bind:value={rationale}></textarea><button type="button" disabled={!preview || previewSource !== correctionText || !reviewer.trim() || !reviewDate || !rationale.trim() || (!preview.accepted && ['suggest-change', 'accept-for-producer-review'].includes(decision))} onclick={() => void exportDecision()}>Download review JSON</button></section>
        {/if}
        {/if}
      </main>
    </div>
  {:else if !loading}<section><h2>Open a passage review</h2><p>Supply a source-bound, versioned manifest URL to begin.</p></section>{/if}
</div>
<style>
  :global(body){margin:0;font-family:system-ui,sans-serif;color:#173047;background:#f7fafc} :global(* ){box-sizing:border-box}
  .shell{max-width:1600px;margin:auto;padding:1rem 1.5rem 4rem} h1{margin:.25rem 0} h2,h3{line-height:1.2} a{color:#145a91} button,input,select,textarea{font:inherit} button{cursor:pointer;border:1px solid #315a72;border-radius:4px;background:#fff;padding:.45rem .7rem;color:#173047} button:hover,.current{background:#d9edf7} button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #e68720;outline-offset:2px} button:disabled{opacity:.55;cursor:default}
  label{display:block;font-weight:700;margin:.6rem 0 .25rem} input,select,textarea{border:1px solid #708b9c;border-radius:3px;padding:.45rem;background:#fff;color:#173047;max-width:100%} textarea{width:100%;font-family:ui-monospace,monospace} .loader{display:flex;align-items:end;gap:.6rem;flex-wrap:wrap;margin:1.2rem 0}.loader label{width:100%;margin:0}.loader input{width:min(100%,45rem)} .layout{display:grid;grid-template-columns:minmax(12rem,16rem) minmax(0,1fr);gap:1.5rem}.layout nav{border:1px solid #ccd7de;padding:.8rem;align-self:start;background:#fff}.layout nav input{width:100%}.layout nav ol{padding-left:1.5rem;max-height:24rem;overflow:auto}.layout nav li{margin:.35rem 0}.layout nav button{text-align:left;width:100%}.current-case{overflow-wrap:anywhere;background:#e8f1f6;padding:.5rem;margin:0} main{min-width:0}.source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.source-grid section,.preview,.decision,details{border:1px solid #ccd7de;background:#fff;padding:1rem;margin:1rem 0;min-width:0}.source-grid pre,.preview pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:30rem;overflow:auto;background:#f0f4f6;padding:.65rem}.passages article{border-top:1px solid #ccd7de}.passages h4{overflow-wrap:anywhere}.small,.identity{font-size:.88rem;overflow-wrap:anywhere}.error,.failure{border-left:4px solid #b12b2b;padding:.8rem;background:#fff1f0} dt{font-weight:700;margin-top:.5rem} dd{margin:.15rem 0 .6rem;overflow-wrap:anywhere} .decision input,.decision select{display:block;width:min(100%,30rem)} .decision button,.preview button{margin-top:.8rem} @media(max-width:900px){.layout,.source-grid{grid-template-columns:1fr}.layout nav ol{max-height:10rem}}
</style>
