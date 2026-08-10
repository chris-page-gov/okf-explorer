<script lang="ts">
  import type {
    GovernedTerm,
    GovernedTermRegistry,
    GovernedTermValidation
  } from '$lib/types';

  let {
    registry,
    validation,
    baseUrl,
    termIds = [],
    open = false
  }: {
    registry: GovernedTermRegistry;
    validation?: GovernedTermValidation;
    baseUrl: string;
    termIds?: string[];
    open?: boolean;
  } = $props();

  let query = $state('');
  const selectedIds = $derived(new Set(termIds));
  const scopedTerms = $derived(
    selectedIds.size
      ? registry.terms.filter((term) => selectedIds.has(term.id))
      : registry.terms
  );
  const filteredTerms = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return scopedTerms;
    return scopedTerms.filter((term) =>
      [
        term.id,
        term.label,
        term.kind,
        term.definition,
        term.application,
        term.vocabulary,
        term.helpKey
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  });
  const vocabularyById = $derived(
    new Map(registry.vocabularies.map((vocabulary) => [vocabulary.id, vocabulary]))
  );
  const occurrenceCount = $derived(
    scopedTerms.reduce(
      (total, term) =>
        total + (term.usage || []).reduce((subtotal, usage) => subtotal + usage.occurrences, 0),
      0
    )
  );

  function bundleUrl(reference: string): string {
    if (/^https?:\/\//i.test(reference)) return reference;
    const bundleRelative = reference.startsWith('/') ? reference.slice(1) : reference;
    return new URL(bundleRelative, baseUrl).href;
  }

  function termAnchor(term: GovernedTerm): string {
    return `governed-term-${term.id.replace(/[^A-Za-z0-9_-]+/g, '-')}`;
  }
</script>

<details
  class="governed-terms"
  {open}
  data-governed-term-count={scopedTerms.length}
  data-validation-status={validation?.status || 'not-supplied'}
>
  <summary>
    {selectedIds.size ? 'Terms used by this record' : 'Governed metadata terms'}
    <span>{scopedTerms.length.toLocaleString()}</span>
  </summary>

  <div class="term-panel">
    <p class="term-intro">
      Inspect the declared meaning, authoritative provenance and the bundle’s bounded use of
      each term. “Validated” applies only to the recorded use; it is not a general certification.
    </p>

    <div class="term-status">
      <span class:passed={validation?.status === 'conformant'}>
        Validation: {validation?.status || 'not supplied'}
      </span>
      <span>{occurrenceCount.toLocaleString()} emitted occurrences in this scope</span>
      {#if registry.review?.method}<span>{registry.review.method.replaceAll('-', ' ')}</span>{/if}
      {#if registry.review?.liveLookupPerformed === false}<span>No live vocabulary lookup</span>{/if}
    </div>

    {#if !selectedIds.size || scopedTerms.length > 8}
      <label class="term-search">
        Find a term
        <input
          type="search"
          bind:value={query}
          placeholder="DCAT, Hydra, provenance, access model…"
        />
      </label>
    {/if}

    {#if filteredTerms.length}
      <div class="term-list">
        {#each filteredTerms as term}
          {@const vocabulary = vocabularyById.get(term.vocabulary)}
          <details class="term-card" id={termAnchor(term)}>
            <summary>
              <code>{term.id}</code>
              <strong>{term.label}</strong>
              <span class:validated={term.status === 'validated'}>{term.status}</span>
            </summary>
            <dl>
              <dt>Meaning</dt>
              <dd>{term.definition}</dd>
              <dt>Bounded use here</dt>
              <dd>{term.application}</dd>
              <dt>Kind</dt>
              <dd>{term.kind}</dd>
              <dt>Full IRI</dt>
              <dd><a href={term.iri} target="_blank" rel="noopener noreferrer">{term.iri}</a></dd>
              <dt>Vocabulary</dt>
              <dd>{vocabulary?.title || term.vocabulary}{#if vocabulary?.version}<small>{vocabulary.version}</small>{/if}</dd>
              <dt>Specification</dt>
              <dd>
                <a href={bundleUrl(term.provenance.resource)} target="_blank" rel="noopener noreferrer">
                  {term.provenance.resource}
                </a>
              </dd>
              {#if term.sourceLocator}
                <dt>Specification locator</dt>
                <dd><code>#{term.sourceLocator}</code></dd>
              {/if}
              <dt>Review status</dt>
              <dd>
                Recognition: {term.validation.recognition};
                meaning: {term.validation.meaning};
                application: {term.validation.application}.
                <small>
                  {term.validation.method.replaceAll('-', ' ')} ·
                  {term.validation.checkedBy} · {term.validation.checkedAt}
                </small>
              </dd>
              {#if term.helpKey}
                <dt>Explorer help key</dt>
                <dd><code>{term.helpKey}</code></dd>
              {/if}
              <dt>Published use</dt>
              <dd>
                {#if term.usage?.length}
                  <ul>
                    {#each term.usage as usage}
                      <li>
                        <code>{usage.artifact}</code> — {usage.occurrences.toLocaleString()}
                        {usage.occurrences === 1 ? 'occurrence' : 'occurrences'}
                        {#if usage.samplePaths?.length}<small>Examples: {usage.samplePaths.join(', ')}</small>{/if}
                      </li>
                    {/each}
                  </ul>
                {:else}
                  UI explanation; no serialised metadata occurrence is expected.
                {/if}
              </dd>
            </dl>
          </details>
        {/each}
      </div>
    {:else}
      <p class="empty">No governed terms match “{query}”.</p>
    {/if}

    {#if validation?.limitations?.length}
      <details class="limitations">
        <summary>Validation boundaries</summary>
        <ul>
          {#each validation.limitations as limitation}<li>{limitation}</li>{/each}
        </ul>
      </details>
    {/if}
  </div>
</details>

<style>
  .governed-terms {
    margin: 12px 0;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
  }

  .governed-terms > summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    cursor: pointer;
    font-weight: 800;
  }

  .governed-terms > summary span {
    margin-left: auto;
    border-radius: 999px;
    background: var(--surface-muted, #edf3f8);
    padding: 2px 8px;
    font-size: 12px;
  }

  .term-panel {
    display: grid;
    gap: 12px;
    border-top: 1px solid var(--line);
    padding: 14px;
  }

  .term-intro {
    margin: 0;
    color: var(--muted);
    line-height: 1.45;
  }

  .term-status {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .term-status span,
  .term-card > summary > span {
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: #fff;
    padding: 3px 7px;
    font-size: 12px;
  }

  .term-status span.passed,
  .term-card > summary > span.validated {
    border-color: #58936b;
    background: #ecf8ef;
    color: #245c36;
  }

  .term-search {
    display: grid;
    gap: 5px;
    font-size: 13px;
    font-weight: 800;
  }

  .term-search input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    padding: 8px 10px;
    background: #fff;
    color: inherit;
    font: inherit;
  }

  .term-list {
    display: grid;
    gap: 7px;
  }

  .term-card {
    border: 1px solid var(--line);
    border-radius: 7px;
    background: #fff;
  }

  .term-card > summary {
    display: grid;
    grid-template-columns: minmax(9rem, auto) minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    padding: 9px 10px;
    cursor: pointer;
  }

  .term-card > summary code {
    overflow-wrap: anywhere;
  }

  .term-card > summary strong {
    min-width: 0;
  }

  .term-card dl {
    display: grid;
    grid-template-columns: minmax(8rem, 11rem) minmax(0, 1fr);
    gap: 8px 12px;
    margin: 0;
    border-top: 1px solid var(--line);
    padding: 12px;
  }

  .term-card dt {
    font-weight: 800;
  }

  .term-card dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .term-card dd small {
    display: block;
    margin-top: 3px;
    color: var(--muted);
  }

  .term-card ul,
  .limitations ul {
    margin: 0;
    padding-left: 18px;
  }

  .limitations > summary {
    cursor: pointer;
    font-weight: 800;
  }

  .empty {
    margin: 0;
    color: var(--muted);
  }

  @media (max-width: 700px) {
    .term-card > summary {
      grid-template-columns: 1fr auto;
    }

    .term-card > summary strong {
      grid-column: 1 / -1;
      grid-row: 2;
    }

    .term-card dl {
      grid-template-columns: 1fr;
    }
  }
</style>
