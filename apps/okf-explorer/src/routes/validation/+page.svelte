<script lang="ts">
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import {
    isFindingId, isSeverity, loadValidation, severities, sourceRecordLink, webIri, type Severity
  } from '$lib/validation/findings';

  const severityLabels = { violation: 'Violation', warning: 'Warning', info: 'Information' };
  const pageSize = 24;
  const bundle = $derived(page.url.searchParams.get('bundle') || '');
  const requestedSeverity = $derived(page.url.searchParams.get('severity') || '');
  const severity = $derived(isSeverity(requestedSeverity) ? requestedSeverity : '');
  const requestedFinding = $derived(page.url.searchParams.get('finding') || '');
  const pageNumber = $derived(Number(page.url.searchParams.get('page') || '1'));
  const routePath = $derived(new URL('../validation/', page.url.href).pathname);
  let loaded = $state<Awaited<ReturnType<typeof loadValidation>> | null>(null);
  let loading = $state(false);
  let error = $state('');
  const visibleFindings = $derived(loaded?.findings.filter(finding => !severity || finding.severity === severity) || []);
  const pages = $derived(Math.max(1, Math.ceil(visibleFindings.length / pageSize)));
  const currentPage = $derived(Number.isSafeInteger(pageNumber) && pageNumber >= 1 && pageNumber <= pages ? pageNumber : 1);
  const selected = $derived(isFindingId(requestedFinding) ? visibleFindings.find(finding => finding.id === requestedFinding) : undefined);
  const review = $derived(selected ? loaded?.review.get(selected.id) : undefined);
  const rangeStart = $derived((currentPage - 1) * pageSize);
  const displayFindings = $derived(visibleFindings.slice(rangeStart, rangeStart + pageSize));
  const counts = $derived(loaded?.findings.reduce((total, finding) => {
    total[finding.severity] += finding.occurrences;
    return total;
  }, { violation: 0, warning: 0, info: 0 }));

  $effect(() => {
    const descriptor = bundle;
    let current = true;
    loaded = null;
    error = '';
    loading = Boolean(descriptor);
    if (descriptor) {
      void loadValidation(descriptor, untrack(() => page.url.origin)).then(report => {
        if (current) loaded = report;
      }).catch((cause: unknown) => {
        if (current) error = cause instanceof Error ? cause.message : 'Try opening the descriptor again.';
      }).finally(() => {
        if (current) loading = false;
      });
    }
    return () => { current = false; };
  });

  function viewLink(filter: Severity | '' = '', finding = '', number = 1): string {
    const params = new URLSearchParams({ bundle });
    if (filter) params.set('severity', filter);
    if (finding) params.set('finding', finding);
    if (number > 1) params.set('page', String(number));
    return routePath + '?' + params.toString();
  }
</script>

<svelte:head>
  <title>Validation | OKF Explorer</title>
  <meta name="description" content="Inspect published SHACL findings and follow them to the affected source records." />
</svelte:head>

{#snippet identifier(value: string)}
  {#if webIri(value)}
    <a href={webIri(value)} rel="noreferrer">{value}</a>
  {:else}
    <code>{value}</code>
  {/if}
{/snippet}

<main class="shell">
  <p><a href={loaded ? sourceRecordLink(loaded.descriptor) : '../explore/'}>Open bundle in Explorer</a></p>
  <h1>Validation</h1>
  <p>Inspect published SHACL Core findings. Ontology consistency and runtime availability have their own checks.</p>
  <form method="get" action={routePath}>
    <label for="bundle">Bundle descriptor URL</label>
    <div class="form-controls">
      <input type="url" id="bundle" name="bundle" value={bundle} maxlength="2048" required />
      <button type="submit">Load report</button>
    </div>
  </form>
  {#if loading}<p role="status">Checking the descriptor and report…</p>{/if}
  {#if error}<p role="alert" class="error"><strong>Could not open validation evidence.</strong> {error}</p>{/if}
  {#if loaded && counts}
    <section aria-labelledby="report-title">
      <h2 id="report-title">{loaded.title}</h2>
      <p><strong>Reported SHACL outcome</strong> · {loaded.conforms ? 'Conforms' : 'Does not conform'}</p>
      <dl class="summary">
        <div><dt>Violations</dt><dd>{counts.violation.toLocaleString('en-GB')}</dd></div>
        <div><dt>Warnings</dt><dd>{counts.warning.toLocaleString('en-GB')}</dd></div>
        <div><dt>Information results</dt><dd>{counts.info.toLocaleString('en-GB')}</dd></div>
      </dl>
      <details>
        <summary>Report identity</summary>
        <dl>
          <dt>Reported bundle</dt><dd>{@render identifier(loaded.bundle)}</dd>
          <dt>Source SHACL report SHA-256</dt><dd><code>{loaded.reportSha256}</code></dd>
          <dt>Verified findings SHA-256</dt><dd><code>{loaded.projectionSha256}</code></dd>
          {#if loaded.execution}
            <dt>Validation profile</dt><dd>{loaded.execution.profile}</dd>
            <dt>Validator</dt><dd>{loaded.execution.validator} {loaded.execution.validatorVersion}</dd>
            <dt>Declared graph SHA-256</dt><dd><code>{loaded.execution.graphSha256}</code></dd>
            <dt>Declared shapes SHA-256</dt><dd><code>{loaded.execution.shapesSha256}</code></dd>
          {/if}
        </dl>
        <p><a href={loaded.projectionUrl} rel="noreferrer">Open machine-readable findings</a></p>
      </details>
    </section>
    {#if loaded.findings.length}
      <section aria-labelledby="findings-title">
        <h2 id="findings-title">Findings</h2>
        <nav aria-label="Filter by severity">
          <ul class="links">
            <li><a href={viewLink()} aria-current={!severity ? 'page' : undefined}>All</a></li>
            {#each severities as filter (filter)}
              <li><a href={viewLink(filter)} aria-current={severity === filter ? 'page' : undefined}>{severityLabels[filter]}</a></li>
            {/each}
          </ul>
        </nav>
        {#if requestedSeverity && !severity}<p role="status">This severity filter is unavailable. Showing all findings.</p>{/if}
        {#if requestedFinding && !selected}<p role="status">This finding is unavailable in the current report and filter.</p>{/if}
        {#if selected}
          <article class="finding" aria-labelledby="finding-title">
            <h3 id="finding-title">{severityLabels[selected.severity]} finding</h3>
            <dl>
              <dt>Focus node</dt><dd>{@render identifier(selected.focus)}</dd>
              <dt>Predicate path</dt><dd>{#if selected.path}{@render identifier(selected.path)}{:else}Applies to the focus node as a whole{/if}</dd>
              <dt>Source shape</dt><dd>{@render identifier(selected.shape)}</dd>
              <dt>Constraint</dt><dd>{@render identifier(selected.constraint)}</dd>
              <dt>Report occurrences</dt><dd>{selected.occurrences}</dd>
              <dt>Stable finding ID</dt><dd><code>{selected.id}</code></dd>
            </dl>
            {#if review}
              <h4>Publisher’s remediation guidance</h4>
              <p>{review.remediation}</p>
              <h4>Participating sources declared by the publisher</h4>
              <ul>
                {#each review.sources as source}
                  <li>
                    <code>{source.bundle}</code><br />
                    <a href={sourceRecordLink(source.descriptor, source.route)}>Inspect {source.route} in Explorer</a>
                    · <a href={source.evidence} rel="noreferrer">Open source evidence</a>
                  </li>
                {/each}
              </ul>
            {:else}
              <h4>How to investigate</h4>
              <p>Compare the focus node with the source shape and constraint. Check the named path when one is available.</p>
              <p><a href={sourceRecordLink(loaded.descriptor)}>Open the reported bundle in Explorer</a></p>
            {/if}
          </article>
        {/if}
        {#if displayFindings.length}
          <p>Showing {rangeStart + 1} to {rangeStart + displayFindings.length} of {visibleFindings.length.toLocaleString('en-GB')} distinct findings.</p>
          <ul class="finding-list">
            {#each displayFindings as finding (finding.id)}
              <li>
                <a href={viewLink(severity, finding.id, currentPage)} aria-current={finding.id === selected?.id ? 'page' : undefined}>
                  <strong>{severityLabels[finding.severity]}</strong> · {finding.focus}{finding.path ? ' · ' + finding.path : ''}
                </a>
              </li>
            {/each}
          </ul>
          {#if pages > 1}
            <nav aria-label="Findings pages">
              <ul class="links">
                {#if currentPage > 1}<li><a href={viewLink(severity, '', currentPage - 1)}>Previous findings</a></li>{/if}
                {#if currentPage < pages}<li><a href={viewLink(severity, '', currentPage + 1)}>Next findings</a></li>{/if}
              </ul>
            </nav>
          {/if}
        {:else}<p>There are no findings for this severity.</p>{/if}
      </section>
    {:else}<p>The report contains no findings.</p>{/if}
  {/if}
</main>

<style>
  :global(html[data-explorer-theme='light']) { color-scheme: light; }
  :global(html[data-explorer-theme='dark']) { color-scheme: dark; }
  :global(html[data-explorer-theme='system']) { color-scheme: light dark; }
  :global(body) { margin: 0; background: light-dark(#f0f4f8, #131b25); color: light-dark(#17202a, #f1f5fb); font-family: system-ui, sans-serif; }
  .shell { box-sizing: border-box; max-width: 72rem; margin: auto; padding: 1.25rem clamp(1rem, 4vw, 3rem) 3rem; overflow-wrap: anywhere; line-height: 1.5; }
  h1, h2, h3, h4 { line-height: 1.2; }
  a { color: light-dark(#005a9c, #a8d0ff); text-underline-offset: .13em; }
  a[aria-current] { color: inherit; font-weight: 700; }
  :is(a, button, input, summary):focus-visible { outline: 3px solid light-dark(#17202a, #f1f5fb); outline-offset: 2px; box-shadow: 0 0 0 4px #ffdd00; }
  form { margin: 1.25rem 0; }
  label, dt { font-weight: 700; }
  .form-controls { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .25rem; }
  input, button { box-sizing: border-box; min-height: 44px; border: 1px solid #60798f; border-radius: .25rem; padding: .4rem .65rem; font: inherit; }
  input { flex: 1 1 21rem; min-width: 0; max-width: 37rem; }
  button { background: light-dark(#005a9c, #a8d0ff); color: light-dark(#ffffff, #132237); }
  section, .finding, .error { background: light-dark(#ffffff, #1b2634); border: 1px solid light-dark(#b9c9d6, #506781); padding: 1rem; margin-top: 1rem; }
  section > h2, .finding > h3 { margin-top: 0; }
  .summary, .links { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; }
  .links { padding: 0; list-style: none; }
  .summary dd { margin: .15rem 0 0; }
  .finding dd, details dd { margin: .2rem 0 .75rem; }
  .finding-list li { margin: .375rem 0; }
  .error { border-inline-start: .35rem solid #a83026; }
</style>
