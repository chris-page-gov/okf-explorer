<script lang="ts">
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { webIri } from '$lib/sources/governedDescriptor';
  import { sourceRecordLink, validationLink } from '$lib/validation/findings';
  import {
    isMappingStrength, isTermKind, kindLabels, loadOntology, mappingStrengths, termKinds, termLabel
  } from '$lib/ontology/ontologyIndex';

  const size = 30;
  const bundle = $derived(page.url.searchParams.get('bundle') || '');
  const path = $derived(new URL('../ontology/', page.url.href).pathname);
  const kindParam = $derived(page.url.searchParams.get('kind'));
  const kind = $derived(isTermKind(kindParam) ? kindParam : '');
  const query = $derived((page.url.searchParams.get('q') || '').trim().slice(0, 160));
  const lowerQuery = $derived(query.toLocaleLowerCase('en-GB'));
  const termId = $derived((page.url.searchParams.get('term') || '').slice(0, 2048));
  const parentId = $derived((page.url.searchParams.get('within') || '').slice(0, 2048));
  const mappingParam = $derived(page.url.searchParams.get('mapping'));
  const mapping = $derived(isMappingStrength(mappingParam) ? mappingParam : '');
  const requestedPage = $derived(Number(page.url.searchParams.get('page') || '1'));
  let loaded = $state<Awaited<ReturnType<typeof loadOntology>> | null>(null);
  let pending = $state(false);
  let failure = $state('');
  const selected = $derived(loaded?.byId.get(termId));
  const parent = $derived(loaded?.byId.get(parentId));
  const childrenInScope = $derived(new Set(parent ? loaded?.children.get(parent.id)?.map(edge => edge.from) : []));
  const filtered = $derived(loaded?.terms.filter(term =>
    (!kind || term.kinds.includes(kind))
    && (!parent || childrenInScope.has(term.id))
    && (!query || [term.id, ...term.labels.map(label => label.value)].some(value => value.toLocaleLowerCase('en-GB').includes(lowerQuery)))
  ) || []);
  const pages = $derived(Math.max(1, Math.ceil(filtered.length / size)));
  const position = $derived(Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= pages ? requestedPage : 1);
  const visible = $derived(filtered.slice((position - 1) * size, position * size));
  const mappings = $derived((selected ? loaded?.mappings.get(selected.id) || [] : []).filter(row => !mapping || row.strength === mapping));

  $effect(() => {
    const input = bundle;
    let active = true;
    loaded = null;
    failure = '';
    pending = Boolean(input);
    if (input) {
      void loadOntology(input, untrack(() => page.url.origin)).then(index => {
        if (active) loaded = index;
      }).catch((cause: unknown) => {
        if (active) failure = cause instanceof Error ? cause.message : 'Try opening this descriptor again.';
      }).finally(() => {
        if (active) pending = false;
      });
    }
    return () => { active = false; };
  });

  function link(overrides: Partial<{ kind: string; term: string; within: string; mapping: string; page: string }> = {}) {
    const params = new URLSearchParams();
    const state = { bundle, kind, q: query, term: termId, within: parentId, mapping, page: position > 1 ? String(position) : '', ...overrides };
    for (const [key, value] of Object.entries(state)) if (value) params.set(key, value);
    return path + '?' + params.toString();
  }

  function label(id: string) {
    const term = loaded?.byId.get(id);
    return term ? termLabel(term) : id;
  }
</script>

<svelte:head>
  <title>Ontology | OKF Explorer</title>
  <meta name="description" content="Browse declared class and property hierarchies, concept schemes and mappings with their exact source identity." />
</svelte:head>

{#snippet iri(value: string)}
  {#if webIri(value)}<a href={webIri(value)} rel="noreferrer">{value}</a>{:else}<code>{value}</code>{/if}
{/snippet}

<main>
  <p><a href={loaded ? sourceRecordLink(loaded.descriptor.url) : '../explore/'}>Open bundle in Explorer</a></p>
  <h1>Ontology</h1>
  <p>Browse declared class and property hierarchies, concept schemes and mappings.</p>
  <form method="get" action={path}>
    <label for="bundle">Bundle descriptor URL</label>
    <div class="controls"><input id="bundle" name="bundle" type="url" value={bundle} maxlength="2048" required /><button>Load ontology</button></div>
  </form>
  {#if pending}<p role="status">Checking the descriptor and ontology index…</p>{/if}
  {#if failure}<p class="error" role="alert"><strong>Could not open the ontology index.</strong> {failure}</p>{/if}
  {#if loaded}
    <section aria-labelledby="bundle-title">
      <h2 id="bundle-title">{loaded.descriptor.title}</h2>
      <nav aria-label="Related evidence">
        <ul class="inline-list">
          <li><a href={'../explore/?' + new URLSearchParams({ bundle: loaded.descriptor.url, view: 'links' })}>Compare assertion statuses in Links</a></li>
          {#if loaded.descriptor.entrypoints.shacl_findings}
            <li><a href={validationLink(loaded.descriptor.url)}>Inspect validation findings</a></li>
          {/if}
        </ul>
      </nav>
      <details>
        <summary>Source and index identity</summary>
        <dl>
          <dt>Declared source graph</dt><dd>{@render iri(loaded.descriptor.bundle)}</dd>
          <dt>Declared graph SHA-256</dt><dd><code>{loaded.graphDigest}</code></dd>
          <dt>Verified index SHA-256</dt><dd><code>{loaded.resource.sha256}</code></dd>
        </dl>
        <p><a href={loaded.resource.url} rel="noreferrer">Open machine-readable ontology index</a></p>
      </details>
      <form method="get" action={path}>
        <input type="hidden" name="bundle" value={bundle} />
        {#if kind}<input type="hidden" name="kind" value={kind} />{/if}
        {#if parent}<input type="hidden" name="within" value={parent.id} />{/if}
        <label for="search-terms">Search by term label or identifier</label>
        <div class="controls"><input id="search-terms" name="q" type="search" value={query} maxlength="160" /><button>Search terms</button></div>
      </form>
      <nav aria-label="Term kinds">
        <ul class="inline-list">
          <li><a aria-current={kind ? undefined : 'page'} href={link({ kind: '', page: '' })}>All terms</a></li>
          {#each termKinds as type (type)}
            <li><a aria-current={kind === type ? 'page' : undefined} href={link({ kind: type, page: '' })}>{kindLabels[type]}</a></li>
          {/each}
        </ul>
      </nav>
      {#if parent}<p>Showing direct children of <strong>{termLabel(parent)}</strong>. <a href={link({ within: '', page: '' })}>Clear hierarchy filter</a></p>{/if}
      {#if termId && !selected}<p role="status">This term is unavailable in the published index.</p>{/if}
      {#if parentId && !parent}<p role="status">The requested hierarchy filter is unavailable.</p>{/if}
      <div class="results">
        <section aria-label="Matching ontology terms">
          <p role="status">{filtered.length.toLocaleString('en-GB')} matching {filtered.length === 1 ? 'term' : 'terms'}</p>
          <ul>
            {#each visible as term (term.id)}
              <li><a href={link({ term: term.id, mapping: '' })} aria-current={term.id === selected?.id ? 'page' : undefined}>{termLabel(term)}</a></li>
            {/each}
          </ul>
          {#if pages > 1}
            <nav aria-label="Term pages">
              <ul class="inline-list">
                {#if position > 1}<li><a href={link({ page: String(position - 1) })}>Previous terms</a></li>{/if}
                {#if position < pages}<li><a href={link({ page: String(position + 1) })}>Next terms</a></li>{/if}
              </ul>
            </nav>
          {/if}
        </section>
        {#if selected}
          {@const parents = loaded.parents.get(selected.id) || []}
          {@const children = loaded.children.get(selected.id) || []}
          <article aria-labelledby="term-heading">
            <h3 id="term-heading">{termLabel(selected)}</h3>
            <p>{@render iri(selected.id)}</p>
            <p>{selected.kinds.map(type => kindLabels[type]).join(' · ')}</p>
            {#if parents.length || children.length}
              <h4>Declared hierarchy</h4>
              <ul>
                {#each parents.slice(0, size) as edge}
                  <li>{edge.names.up} · <a href={link({ term: edge.to, mapping: '' })}>{label(edge.to)}</a></li>
                {/each}
                {#each children.slice(0, size) as edge}
                  <li>{edge.names.down} · <a href={link({ term: edge.from, mapping: '' })}>{label(edge.from)}</a></li>
                {/each}
              </ul>
              {#if parents.length > size}<p>Showing {size} of {parents.length} parent statements.</p>{/if}
              {#if children.length}
                <p><a href={link({ within: selected.id, kind: '', page: '' })}>Filter results to all direct children</a></p>
              {/if}
            {/if}
            {#if loaded.mappings.has(selected.id)}
              <h4>Declared mappings</h4>
              <nav aria-label="Mapping strength">
                <ul class="inline-list">
                  <li><a aria-current={mapping ? undefined : 'page'} href={link({ mapping: '' })}>All strengths</a></li>
                  {#each mappingStrengths as strength (strength)}
                    <li><a aria-current={mapping === strength ? 'page' : undefined} href={link({ mapping: strength })}>{strength}</a></li>
                  {/each}
                </ul>
              </nav>
              <ul>
                {#each mappings.slice(0, size) as relationship}
                  <li><strong>{relationship.strength} mapping</strong> · {@render iri(relationship.to)}<br /><code>{relationship.predicate}</code></li>
                {:else}<li>There are no declared mappings with this strength.</li>{/each}
              </ul>
              {#if mappings.length > size}<p>Showing {size} of {mappings.length} mappings.</p>{/if}
            {/if}
          </article>
        {/if}
      </div>
    </section>
  {/if}
</main>

<style>
  :global(html[data-explorer-theme='light']) { color-scheme: light; }
  :global(html[data-explorer-theme='dark']) { color-scheme: dark; }
  :global(html[data-explorer-theme='system']) { color-scheme: light dark; }
  :global(body) { margin: 0; font-family: system-ui, sans-serif; background: light-dark(#f0f4f8, #131b25); color: light-dark(#17202a, #f1f5fb); }
  main { box-sizing: border-box; max-width: 74rem; padding: 1.25rem clamp(1rem, 4vw, 3rem) 3rem; margin: auto; line-height: 1.5; overflow-wrap: anywhere; }
  h1, h2, h3, h4 { line-height: 1.2; }
  a { color: light-dark(#005a9c, #a8d0ff); text-underline-offset: .13em; }
  a[aria-current] { color: inherit; font-weight: 700; }
  :is(a, input, button, summary):focus-visible { outline: 3px solid light-dark(#17202a, #f1f5fb); outline-offset: 2px; box-shadow: 0 0 0 4px #ffdd00; }
  form { margin: 1.25rem 0; }
  label, dt { font-weight: 700; }
  .controls { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .25rem; }
  input, button { box-sizing: border-box; border: 1px solid #60798f; border-radius: .25rem; min-height: 44px; padding: .4rem .65rem; font: inherit; }
  input { flex: 1 1 21rem; min-width: 0; max-width: 37rem; }
  button { background: light-dark(#005a9c, #a8d0ff); color: light-dark(#ffffff, #132237); }
  section, article, .error { border: 1px solid light-dark(#b9c9d6, #506781); background: light-dark(#ffffff, #1b2634); padding: 1rem; margin-block-start: 1rem; }
  section > h2, article > h3 { margin-top: 0; }
  .inline-list { display: flex; flex-wrap: wrap; gap: .5rem 1.45rem; padding: 0; list-style: none; }
  .results { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,2fr); gap: 1rem; align-items: start; }
  .results li { padding-block: .2rem; }
  dd { margin: .25rem 0 .75rem; }
  .error { border-inline-start: .35rem solid #a83026; }
  @media (max-width: 52rem) { .results { grid-template-columns: 1fr; } }
</style>
