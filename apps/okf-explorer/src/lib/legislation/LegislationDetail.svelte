<script lang="ts">
  import type { LargeDataset, SearchResultDoc } from '$lib/types';
  import { parseClml, type LegislationProvision } from './structure';

  let { record }: { record: Partial<LargeDataset & SearchResultDoc> } = $props();
  let provisions = $state<LegislationProvision[]>([]);
  let loading = $state(false);
  let error = $state('');
  let filter = $state('');
  let limit = $state(120);

  const isLegislation = $derived(record.record_type === 'Legislation Work' || Boolean(record.legislation_id_uri));
  const documentUri = $derived(record.document_uri || record.url || '');
  const structureUrl = $derived(record.structure_url || (documentUri ? `${documentUri.replace(/\/$/, '')}/data.xml` : ''));
  const manifestations = $derived(Object.entries(record.manifestations || {}).filter(([, url]) => /^https?:\/\//.test(url)));
  const visibleProvisions = $derived.by(() => {
    const query = filter.trim().toLowerCase();
    const rows = query
      ? provisions.filter((item) => [item.normalizedType, item.number, item.title, item.text, item.id].join(' ').toLowerCase().includes(query))
      : provisions;
    return rows.slice(0, limit);
  });

  async function loadStructure() {
    if (!structureUrl || loading) return;
    loading = true;
    error = '';
    try {
      const response = await fetch(structureUrl, { headers: { Accept: 'application/xml, text/xml;q=0.9' } });
      if (!response.ok) throw new Error(`Official CLML request failed (${response.status})`);
      provisions = parseClml(await response.text(), documentUri);
      if (!provisions.length) throw new Error('No normalized structural elements were found in the official CLML response.');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function copyCitation(item: LegislationProvision) {
    const label = [record.title, `${item.normalizedType} ${item.number}`.trim()].filter(Boolean).join(', ');
    await navigator.clipboard.writeText(`${label} — ${item.officialUrl} (accessed ${new Date().toISOString().slice(0, 10)})`);
  }
</script>

{#if isLegislation}
  <section class="law-panel" aria-label="Official legislation detail">
    <h3>Legal work and official text</h3>
    <p class="warning"><strong>Research aid:</strong> verify current version, commencement, territorial extent and unapplied effects before relying on a provision.</p>
    <dl>
      <dt>ELI class</dt><dd><code>{record.eli_class || 'eli:LegalResource'}</code></dd>
      <dt>Schema.org class</dt><dd><code>{record.schema_org_type || 'schema:Legislation'}</code></dd>
      <dt>Official identifier</dt><dd>{#if record.legislation_id_uri}<a href={record.legislation_id_uri} target="_blank" rel="noopener">{record.legislation_id_uri}</a>{:else}Not supplied{/if}</dd>
      <dt>Document type</dt><dd>{record.document_type || record.type_code || 'Not supplied'}</dd>
      <dt>Category</dt><dd>{record.category || 'Not supplied'}</dd>
      <dt>Year / number</dt><dd>{[record.year, record.number].filter(Boolean).join(' / ') || 'Not supplied'}</dd>
      <dt>Jurisdiction</dt><dd>{record.jurisdiction?.join(', ') || 'Not supplied'}</dd>
      <dt>Legal status note</dt><dd>{record.legal_status || 'Consult the official point-in-time view.'}</dd>
    </dl>

    <div class="law-actions">
      {#if documentUri}<a class="law-button" href={documentUri} target="_blank" rel="noopener">Open official work</a>{/if}
      {#if record.table_of_contents_url}<a class="law-button" href={record.table_of_contents_url} target="_blank" rel="noopener">Official contents</a>{/if}
      {#if record.effects_made_url}<a class="law-button" href={record.effects_made_url} target="_blank" rel="noopener">Changes made</a>{/if}
      {#if record.effects_received_url}<a class="law-button" href={record.effects_received_url} target="_blank" rel="noopener">Changes received</a>{/if}
    </div>

    {#if manifestations.length}
      <details>
        <summary>Official manifestations and data formats ({manifestations.length})</summary>
        <ul>
          {#each manifestations as [format, url]}
            <li><a href={url} target="_blank" rel="noopener">{format.replaceAll('_', ' ')}</a></li>
          {/each}
        </ul>
      </details>
    {/if}

    {#if !provisions.length}
      <button class="load-button" type="button" disabled={loading || !structureUrl} onclick={() => void loadStructure()}>
        {loading ? 'Loading official CLML…' : 'Load every Part, Chapter, section, article and nested provision'}
      </button>
      <p class="progressive-note">Loaded only on demand from legislation.gov.uk, so the catalogue remains fast while the authoritative subdivision tree stays complete.</p>
    {/if}
    {#if error}<p class="error" role="alert">{error} <a href={structureUrl} target="_blank" rel="noopener">Open the official CLML directly</a>.</p>{/if}

    {#if provisions.length}
      <div class="structure-tools">
        <label>Find within this instrument <input bind:value={filter} type="search" placeholder="section, phrase, article…" /></label>
        <span>{visibleProvisions.length.toLocaleString()} of {provisions.length.toLocaleString()} normalized concepts shown</span>
      </div>
      <ol class="provision-tree">
        {#each visibleProvisions as item}
          <li style={`--depth:${Math.min(item.depth, 8)}`}>
            <div class="provision-heading">
              <span class="provision-type">{item.normalizedType}</span>
              {#if item.number}<strong>{item.number}</strong>{/if}
              {#if item.title}<span>{item.title}</span>{/if}
            </div>
            {#if item.text}<p>{item.text}</p>{/if}
            <div class="provision-links">
              <a href={item.officialUrl} target="_blank" rel="noopener">Selected passage</a>
              <button type="button" onclick={() => void copyCitation(item)}>Copy provenance citation</button>
              <code>{item.sourceElement} · {item.id}</code>
              {#if item.extent}<span>Extent {item.extent}</span>{/if}
              {#if item.status}<span>Status {item.status}</span>{/if}
            </div>
          </li>
        {/each}
      </ol>
      {#if visibleProvisions.length < provisions.length}
        <button type="button" onclick={() => limit += 250}>Show 250 more</button>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .law-panel { margin: 1.25rem 0; padding: 1rem; border: 1px solid #b1b4b6; border-left: .35rem solid #1d70b8; background: #f8f8f8; }
  .law-panel h3 { margin-top: 0; }
  .warning { padding: .75rem; background: #fff7bf; border-left: .25rem solid #ffdd00; }
  .law-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin: .75rem 0; }
  .law-button, .load-button { display: inline-block; padding: .55rem .75rem; border: 0; background: #00703c; color: white; text-decoration: none; font: inherit; cursor: pointer; }
  .load-button { margin-top: .75rem; background: #1d70b8; }
  .progressive-note { color: #505a5f; font-size: .9rem; }
  .structure-tools { display: grid; gap: .35rem; margin: 1rem 0; }
  .structure-tools input { display: block; box-sizing: border-box; width: 100%; padding: .5rem; margin-top: .25rem; }
  .provision-tree { padding: 0; list-style: none; }
  .provision-tree li { margin: .55rem 0 .55rem calc(var(--depth) * .75rem); padding: .65rem; border-left: 2px solid #b1b4b6; background: white; }
  .provision-heading { display: flex; flex-wrap: wrap; gap: .4rem; align-items: baseline; }
  .provision-type { padding: .15rem .35rem; background: #e8f1f8; color: #003078; font-size: .78rem; text-transform: uppercase; }
  .provision-tree p { margin: .45rem 0; line-height: 1.45; }
  .provision-links { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; font-size: .78rem; color: #505a5f; }
  .provision-links button { border: 0; padding: 0; background: transparent; color: #1d70b8; text-decoration: underline; cursor: pointer; }
  .provision-links code { overflow-wrap: anywhere; }
  .error { color: #d4351c; }
</style>
