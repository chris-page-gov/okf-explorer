<script lang="ts">
  import { tick } from 'svelte';
  import type { LoadedSource } from '$lib/types';
  import { assembleContext, DEFAULT_CONTEXT_BUDGET, MAX_CONTEXT_BUDGET } from '$lib/context/index';
  import { assembleCorpusContext } from '$lib/context/corpus';
  import type { ContextBudget, ContextPackage } from '$lib/context/types';
  import { documentContextRegistry, registerContextTools } from '$lib/context/webmcp';
  import { isHttpUrl } from '$lib/viewer/helpers';

  let { source, onOpenRecord }: {
    source: LoadedSource;
    onOpenRecord: (route: string) => void;
  } = $props();

  let question = $state('');
  let result = $state<ContextPackage | null>(null);
  let error = $state('');
  let busy = $state(false);
  let copied = $state('');
  let jsonOpen = $state(false);
  let jsonDetails = $state<HTMLDetailsElement>();
  let toolMessage = $state('Checking optional page tools…');
  let budget = $state<ContextBudget>({ ...DEFAULT_CONTEXT_BUDGET });
  let requestNumber = 0;
  let sourceGeneration = 0;
  let uiController: AbortController | undefined;
  const retained = new Map<string, ContextPackage>();
  const supported = $derived('loadContextAssembly' in source && typeof source.loadContextAssembly === 'function');
  const sourceTitle = $derived(source.kind === 'large' ? source.descriptor.title : source.title);
  const rawPackage = $derived(result ? JSON.stringify(result, null, 2) : '');

  function checkCurrent(expected: LoadedSource, generation: number, signal: AbortSignal) {
    if (signal.aborted || expected !== source || generation !== sourceGeneration) {
      throw new DOMException('The context request was cancelled or its source changed.', 'AbortError');
    }
  }

  async function build(
    expected: LoadedSource,
    generation: number,
    value: string,
    limits: Partial<ContextBudget> | undefined,
    signal: AbortSignal
  ): Promise<ContextPackage> {
    checkCurrent(expected, generation, signal);
    if (!('loadContextAssembly' in expected) || typeof expected.loadContextAssembly !== 'function') {
      throw new Error('This bundle has no governed context index. Search and the evidence views remain available.');
    }
    const request = ++requestNumber;
    const bound = await expected.loadContextAssembly();
    checkCurrent(expected, generation, signal);
    const assembled = 'corpus' in bound
      ? await assembleCorpusContext(bound.corpus, bound.binding, value, limits, (input, init) => {
          checkCurrent(expected, generation, signal);
          return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal });
        })
      : await assembleContext(bound.index, value, limits, bound.binding);
    checkCurrent(expected, generation, signal);
    retained.set(assembled.context_id, assembled);
    while (retained.size > 4) retained.delete(retained.keys().next().value!);
    if (request === requestNumber) {
      result = assembled;
      error = '';
      copied = '';
      jsonOpen = false;
    }
    return assembled;
  }

  $effect(() => {
    const expected = source;
    const generation = ++sourceGeneration;
    retained.clear();
    result = null;
    error = '';
    copied = '';
    jsonOpen = false;
    busy = false;
    uiController?.abort();
    const tools = registerContextTools(documentContextRegistry(document), {
      build: (value, limits, signal) => build(expected, generation, value, limits, signal),
      explain: async (id, signal) => {
        checkCurrent(expected, generation, signal);
        const context = retained.get(id);
        if (!context) throw new Error('This context is not retained for the loaded bundle. Build it again to inspect it.');
        return context;
      }
    });
    void tools.ready.then((status) => {
      if (expected === source && generation === sourceGeneration) toolMessage = status.message;
    });
    return () => {
      tools.dispose();
      uiController?.abort();
      retained.clear();
    };
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    uiController?.abort();
    const controller = new AbortController();
    uiController = controller;
    const expected = source;
    const generation = sourceGeneration;
    error = '';
    result = null;
    copied = '';
    busy = true;
    try {
      await build(expected, generation, question, { ...budget }, controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted && expected === source && generation === sourceGeneration) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
    } finally {
      if (uiController === controller) busy = false;
    }
  }

  async function copyPackage() {
    const context = result;
    if (!context) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
      if (result === context) copied = 'Evidence package copied.';
    } catch {
      if (result === context) copied = 'Copy is unavailable. Select the JSON below to copy it.';
    }
  }

  async function showPackageJson() {
    jsonOpen = true;
    await tick();
    jsonDetails?.scrollIntoView({ block: 'start' });
    jsonDetails?.querySelector('summary')?.focus({ preventScroll: true });
  }

  function safeRoute(route: string): boolean {
    return /^[a-z][a-z0-9-]*(?:\/[A-Za-z0-9._~%-]+)+$/.test(route) && !/%(?![0-9a-fA-F]{2})/.test(route);
  }

  function canOpenRecord(route: string): boolean {
    return safeRoute(route) && (source.kind !== 'large' || !source.endpointLabels || source.endpointLabels.byRoute.has(route));
  }

  function recordLabel(id: string): string {
    return result?.selected.find((item) => item.record.id === id)?.record.label || id;
  }
</script>

<section class="ask-okf" aria-labelledby="ask-okf-title">
  <header>
    <h2 id="ask-okf-title">Ask OKF</h2>
    <p>Build an evidence package for a question about <strong>{sourceTitle}</strong>. The bundle declares the concepts, relationships and evidence requirements. This tool does not generate an AI answer.</p>
  </header>
  <p class="scope-note">The package uses the loaded bundle, independently of Search and its filters. Keep questions general; do not enter personal or confidential information.</p>
  {#if !supported}
    <p class="unsupported" role="status">This bundle has no governed context index. Search and the evidence views remain available.</p>
  {/if}
  <form onsubmit={submit}>
    <label for="ask-okf-question">Question</label>
    <textarea id="ask-okf-question" bind:value={question} rows="4" maxlength="2000" required placeholder="Which evidence and qualifications are needed to investigate this question?"></textarea>
    <details class="budget-controls">
      <summary>Evidence limits</summary>
      <p>Whole evidence items are retained or omitted. A smaller limit can leave required evidence out of the package.</p>
      <div class="budget-grid">
        <label>Records <input type="number" min="1" max={MAX_CONTEXT_BUDGET.max_nodes} bind:value={budget.max_nodes} required /></label>
        <label>Relationships <input type="number" min="1" max={MAX_CONTEXT_BUDGET.max_relationships} bind:value={budget.max_relationships} required /></label>
        <label>Traversal depth <input type="number" min="0" max={MAX_CONTEXT_BUDGET.max_depth} bind:value={budget.max_depth} required /></label>
        <label>Package bytes <input type="number" min="8192" max={MAX_CONTEXT_BUDGET.max_bytes} bind:value={budget.max_bytes} required /></label>
      </div>
    </details>
    <div class="actions">
      <button class="primary" type="submit" disabled={!supported || busy || !question.trim()}>Build evidence package</button>
      {#if busy}<button type="button" onclick={() => { uiController?.abort(); busy = false; }}>Cancel</button>{/if}
    </div>
  </form>
  <p class="tool-status">{toolMessage}</p>
  {#if busy}<p role="status">Assembling evidence from the declared bundle sources…</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if result}
    <section class="context-package" aria-labelledby="context-package-title" data-context-id={result.context_id}>
      <h3 id="context-package-title">Evidence package</h3>
      <div class="actions">
        <button type="button" onclick={() => void copyPackage()}>Copy evidence package</button>
        <button type="button" aria-controls="ask-context-json" aria-expanded={jsonOpen} onclick={() => void showPackageJson()}>Inspect package JSON</button>
      </div>
      {#if copied}<p role="status">{copied}</p>{/if}
      <p class="question"><strong>Question:</strong> {result.question}</p>
      <p class="evidence-status" data-evidence-status={result.evidence_status}>
        <strong>{result.evidence_status === 'sufficient' ? 'Declared evidence requirements met' : result.evidence_status === 'conflicting' ? 'Conflicting evidence' : 'Insufficient evidence'}</strong>
      </p>
      <p>{result.scope}</p>
      <p>This status applies only to the bundle’s declared requirements and scope. It does not establish a complete answer, current legal applicability or specialist approval.</p>
      <dl class="identity">
        <div><dt>Bundle snapshot</dt><dd>{result.bundle.snapshot}</dd></div>
        <div><dt>Context ID</dt><dd>{result.context_id}</dd></div>
        <div><dt>{result.retrieval ? 'Corpus manifest SHA-256' : 'Index SHA-256'}</dt><dd>{result.binding.index_sha256 || 'Not supplied'}</dd></div>
      </dl>
      {#if result.retrieval}
        <section class="corpus-retrieval" aria-labelledby="corpus-retrieval-title">
          <h4 id="corpus-retrieval-title">Corpus evidence discovery</h4>
          <p>Deterministic lexical discovery over {result.retrieval.corpus_records.toLocaleString('en-GB')} records and {result.retrieval.corpus_pages.toLocaleString('en-GB')} source pages. {result.retrieval.empty_pages.toLocaleString('en-GB')} pages have no extracted text. Matching words identify candidates; they do not establish a concept, authority or a complete answer.</p>
          <p>{result.retrieval.candidate_count.toLocaleString('en-GB')} candidates found. Tokens used: {result.retrieval.query_tokens.join(', ') || 'none'}.</p>
          {#if result.retrieval.omitted_query_tokens.length}<p>Tokens omitted by the retrieval limit: {result.retrieval.omitted_query_tokens.join(', ')}.</p>{/if}
          <p>{result.retrieval.fetched_files} of {result.retrieval.limits.files} files fetched; {result.retrieval.fetched_bytes.toLocaleString('en-GB')} of {result.retrieval.limits.fetched_bytes.toLocaleString('en-GB')} transfer bytes; {result.retrieval.decoded_bytes.toLocaleString('en-GB')} of {result.retrieval.limits.decoded_bytes.toLocaleString('en-GB')} decoded bytes. Candidate limit: {result.retrieval.limits.candidates}; query-token limit: {result.retrieval.limits.query_tokens}.</p>
          {#if result.retrieval.truncated}<p><strong>Discovery was bounded. Further evidence may exist outside these candidates.</strong></p>{/if}
          {#if result.retrieval.omissions.length}<ul>{#each result.retrieval.omissions as issue}<li><strong>{issue.code}</strong>: {issue.message}</li>{/each}</ul>{/if}
          <details><summary>Ranked candidates ({result.retrieval.candidates.length})</summary>
            <ul>{#each result.retrieval.candidates as candidate}<li><strong>{recordLabel(candidate.id)}</strong> — matched {candidate.matched.join(', ')}; lexical score {candidate.score}.<br /><code>{candidate.id}</code></li>{/each}</ul>
          </details>
        </section>
      {/if}
      <h4>Concepts resolved</h4>
      <ul>{#each result.resolved_concepts as concept}<li><strong>{concept.label}</strong> — matched {concept.matched.join(', ')} (declared phrase)</li>{:else}<li>No declared concepts were resolved.</li>{/each}</ul>
      {#if result.unresolved_terms.length}<p><strong>Unresolved terms:</strong> {result.unresolved_terms.join(', ')}</p>{/if}
      {#if result.ambiguities.length}
        <h4>Ambiguous terms</h4>
        <ul>{#each result.ambiguities as ambiguity}<li>{ambiguity.phrase}: {ambiguity.candidates.map(recordLabel).join('; ')}</li>{/each}</ul>
        <p>Evidence for each alternative meaning is labelled below. No meaning has been selected; do not combine the alternatives into one interpretation.</p>
      {/if}
      {#if result.missing_evidence.length || result.conflicts.length || result.budget.omissions.length}
        <h4>Gaps, conflicts and omissions</h4>
        <ul>{#each [...result.missing_evidence, ...result.conflicts, ...result.budget.omissions] as issue}<li><strong>{issue.code}</strong>: {issue.message}</li>{/each}</ul>
      {/if}
      <h4>Declared requirements</h4>
      <ul>
        {#each result.requirements as requirement}
          <li><strong>{requirement.label}</strong> — {requirement.status === 'supported-within-declared-scope' ? 'met within declared scope' : 'insufficient'}. {requirement.scope}
            {#if requirement.missing.length}<p>Missing: {requirement.missing.map(recordLabel).join('; ')}</p>{/if}
          </li>
        {:else}<li>No applicable requirement was declared.</li>{/each}
      </ul>
      <details class="relationship-summary">
        <summary>Directed relationships ({result.relationships.length})</summary>
        <ul>{#each result.relationships as relationship}<li>{recordLabel(relationship.source)} → {relationship.label} → {recordLabel(relationship.target)}<br /><code>{relationship.predicate}</code><br />{relationship.authority.label} · {relationship.assertion_status}</li>{/each}</ul>
      </details>
      <details class="traversal-summary">
        <summary>How the evidence was reached</summary>
        <ul>{#each result.selected as item}<li><strong>{item.record.label}</strong><ul>{#each item.paths as path}<li>{path.records.map(recordLabel).join(' → ')}</li>{/each}</ul></li>{/each}</ul>
      </details>
      <h4>Selected evidence and interpretation</h4>
      {#each result.selected as item}
        {@const citedSource = item.record.provenance.find((evidence) => isHttpUrl(evidence.url))}
        {@const alternativeSeeds = [...new Set(item.paths.map(path => path.seed).filter(seed => result?.ambiguities.some(ambiguity => ambiguity.candidates.includes(seed))))]}
        <article class="evidence-item">
          <h5>{item.record.label}</h5>
          {#if alternativeSeeds.length}<p class="alternative-meaning"><strong>Alternative meaning:</strong> {alternativeSeeds.map(recordLabel).join('; ')}. This meaning remains unresolved.</p>{/if}
          <p class="authority">{item.record.authority.label} · {item.record.assertion_status} · {item.record.review_status || 'Review status not supplied'}</p>
          <p>{item.record.scope}</p>
          {#if canOpenRecord(item.record.route)}<button type="button" onclick={() => onOpenRecord(item.record.route)}>Open record in new tab: {item.record.label}</button>{/if}
          {#if citedSource}<p><a href={citedSource.url} target="_blank" rel="noopener noreferrer">View cited source: {item.record.label}</a></p>{/if}
          <details class="source-passage">
            <summary>{item.record.kind === 'evidence' ? 'Read whole source passage' : 'Read project-authored context'}</summary>
            <pre class="evidence-text">{item.record.text}</pre>
          </details>
          {#if item.record.evidence_unit}
            {@const unit = item.record.evidence_unit}
            <details class="unit-provenance">
              <summary>Logical unit and exact source spans</summary>
              <p>{unit.kind} · {unit.boundary_status} · {unit.completeness}</p>
              <p>A detected or declared boundary is not specialist acceptance. The unit retains whole passages; its producer checks inclusion in the original source.</p>
              <p>Offsets count UTF-8 bytes from zero, including the start and excluding the end. These differ from the text positions used for delivery slices.</p>
              <ol>{#each unit.spans as span}<li>
                <p><a href={span.source_url} target="_blank" rel="noopener noreferrer">{span.locator}</a> · <a href={span.extraction_url} target="_blank" rel="noopener noreferrer">Captured extraction</a></p>
                <p>Source bytes {span.source_start}–{span.source_end}; unit bytes {span.unit_start}–{span.unit_end}.</p>
                <p>Fragment SHA-256: <code>{span.literal_sha256}</code></p>
                <p>Source SHA-256: <code>{span.source_sha256}</code>; extraction SHA-256: <code>{span.extraction_sha256}</code>.</p>
                <p>Source text SHA-256: <code>{span.source_text_sha256}</code> ({span.source_text_bytes} bytes).</p>
              </li>{/each}</ol>
            </details>
          {/if}
          <details>
            <summary>Selection reasons and provenance</summary>
            <ul>{#each item.reasons as reason}<li>{reason}</li>{/each}</ul>
            {#each item.record.provenance as evidence}
              <div class="provenance">
                {#if isHttpUrl(evidence.url)}<a href={evidence.url} target="_blank" rel="noopener noreferrer">{evidence.locator || 'Source evidence'}</a>{:else}<span>{evidence.locator || 'Source locator not supplied'}</span>{/if}
                <p>Source SHA-256: <code>{evidence.source_sha256}</code></p>
                <p>Captured: {evidence.captured_at}</p>
                {#if evidence.source_date}<p>{evidence.source_date_kind || 'Source date'}: {evidence.source_date}</p>{/if}
              </div>
            {/each}
            <p>Rights: {item.record.rights}</p>
            <h6>Traversal paths</h6>
            <ul>{#each item.paths as path}<li>{path.records.map(recordLabel).join(' → ')}<br />Assertion IDs: {path.assertions.join(', ') || 'Starting record'}</li>{/each}</ul>
          </details>
        </article>
      {:else}<p>No whole evidence items were selected.</p>{/each}
      <h4>Package limits</h4>
      <p>{result.budget.used_nodes} of {result.budget.max_nodes} records; {result.budget.used_relationships} of {result.budget.max_relationships} relationships; depth {result.budget.reached_depth} of {result.budget.max_depth}; {result.budget.used_bytes.toLocaleString('en-GB')} of {result.budget.max_bytes.toLocaleString('en-GB')} bytes.</p>
      {#if result.budget.truncated}<p><strong>The package was limited. Review the omissions above.</strong></p>{/if}
      <h4>Limitations</h4>
      <ul>{#each result.limitations as limitation}<li>{limitation}</li>{/each}</ul>
      <details id="ask-context-json" bind:this={jsonDetails} bind:open={jsonOpen}><summary>Machine-readable package</summary><textarea class="package-json" readonly aria-label="Evidence package JSON" value={rawPackage} rows="16"></textarea></details>
    </section>
  {/if}
</section>

<style>
  .ask-okf { max-width: 72rem; margin: 0 auto; padding: 1.2rem; overflow-wrap: anywhere; }
  h2 { margin: 0; font-size: 1.6rem; } h3 { font-size: 1.4rem; } h4 { margin-bottom: .5rem; font-size: 1.1rem; } h5 { margin: 0; font-size: 1rem; } h6 { font-size: .95rem; margin-bottom: .4rem; }
  p, li { line-height: 1.55; } li + li { margin-top: .4rem; }
  .scope-note, .unsupported, .error, .evidence-status { padding: .8rem; border-left: .3rem solid var(--accent); background: var(--surface-2); }
  .unsupported, .error, [data-evidence-status="insufficient"], [data-evidence-status="conflicting"] { border-color: #a65b00; }
  form > label { display: block; font-weight: 700; margin-bottom: .4rem; }
  textarea { display: block; width: 100%; resize: vertical; min-height: 6rem; border: 1px solid var(--line-strong); border-radius: .3rem; padding: .7rem; font: inherit; color: var(--ink); background: var(--surface); }
  textarea:focus-visible, input:focus-visible, button:focus-visible, a:focus-visible, summary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
  button { min-height: 2.5rem; } button.primary { background: var(--accent); color: white; font-weight: 700; } button:disabled { opacity: .55; cursor: default; }
  .actions { display: flex; flex-wrap: wrap; gap: .6rem; margin: .9rem 0; }
  details { margin: .8rem 0; } summary { cursor: pointer; font-weight: 600; }
  .budget-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; }
  .budget-grid label { display: grid; gap: .3rem; } input { min-width: 0; padding: .5rem; }
  .tool-status, .authority { color: var(--muted); font-size: .9rem; }
  .identity { display: grid; gap: .6rem; padding: .8rem; background: var(--surface-2); } dt { font-weight: 700; } dd { margin: .2rem 0 0; font-family: monospace; }
  .evidence-item { border: 1px solid var(--line); background: var(--surface); padding: 1rem; margin: .8rem 0; border-radius: .4rem; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-size: .9rem; line-height: 1.5; }
  .evidence-text { font-family: inherit; padding: .8rem; background: var(--surface-2); border-left: .2rem solid var(--line-strong); }
  .provenance { border-top: 1px solid var(--line); margin-top: .7rem; padding-top: .7rem; } .provenance p { margin: .3rem 0; }
  .package-json { max-height: 28rem; overflow: auto; padding: .7rem; background: var(--surface-2); }
  @media (max-width: 599px) { .ask-okf { padding: .8rem; } .budget-grid { grid-template-columns: 1fr; } }
</style>
