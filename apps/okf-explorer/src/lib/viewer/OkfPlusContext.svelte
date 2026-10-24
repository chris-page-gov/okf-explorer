<script lang="ts">
  import { citationUrl, contextValueText, okfPlusContext } from './okfPlusContext';
  let { value, title, onask }: { value: unknown; title: string; onask: (question: string) => void } = $props();
  const context = $derived(okfPlusContext(value));
  let selectedFieldId = $state('');
  $effect(() => { context?.id; selectedFieldId = ''; });
  const selectedField = $derived(context?.nativeFields.find(field => field.id === selectedFieldId));
  const question = $derived(context ? `${selectedField?.name ?? title} ${typeof context.metadata.nativeIdentifier === 'string' ? context.metadata.nativeIdentifier : ''}`.trim().slice(0, 2000) : title);
</script>

{#if value !== undefined}
  <section class="okf-plus-context" aria-label="Record explanation and sources">
    <h3>Record explanation and sources</h3>
    {#if context}
      <p>These are the values retained by the knowledge bundle. Missing information stays explicit. A field name, catalogue entry or documented extent does not establish data availability.</p>
      <p class="identity"><strong>Record:</strong> <code>{context.id}</code></p>
      {#if context.revision}<p class="identity"><strong>Bundle source revision:</strong> <code>{context.revision}</code></p>{/if}
      {#if context.fieldError}<p role="status">{context.fieldError}</p>{/if}
      {#if context.nativeFields.length}
        <label>Choose a native field
          <select aria-label="Choose a native field" bind:value={selectedFieldId}>
            <option value="">Containing record</option>
            {#each context.nativeFields as field}<option value={field.id}>{field.name}</option>{/each}
          </select>
        </label>
      {/if}
      {#if selectedField}
        <section aria-label="Selected native field">
          <h4>Selected field: {selectedField.name}</h4>
          <p><code>{selectedField.id}</code></p>
          <p>The field identity belongs to this containing record. Similar names in another version or collection remain separate.</p>
          <dl>{#each selectedField.fields as field}
            <dt>{field.label}</dt><dd>{contextValueText(field.value)}{#if field.present}<small>Retained field: <code>{field.key}</code></small>{/if}</dd>
          {/each}</dl>
          {#if selectedField.sourceUrl}<a href={selectedField.sourceUrl} target="_blank" rel="noopener noreferrer">Open this field’s schema source</a>{:else}<p>Field-specific source URL is not recorded.</p>{/if}
          <details><summary>Complete selected field and schema</summary><pre>{JSON.stringify(selectedField.metadata, null, 2)}</pre></details>
          <p>Version, temporal context, coverage, qualifications and retrieval authority below describe the containing record. They do not prove observed values or a field-specific measurement method.</p>
          <h4>Containing record context</h4>
        </section>
      {/if}
      <dl>
        {#each context.fields as field}
          <dt>{field.label}</dt>
          <dd><span class:structured={field.value !== null && typeof field.value === 'object'}>{contextValueText(field.value)}</span>{#if field.present}<small>Retained field: <code>{field.key}</code></small>{/if}</dd>
        {/each}
      </dl>
      <details>
        <summary>Source references ({context.sources.length})</summary>
        <p>Capture hashes and pointers identify the retained evidence. They do not establish current service behaviour or independent acceptance.</p>
        <ul>{#each context.sources as source}
          {@const url = citationUrl(source.resource ?? source.url)}
          <li>
            {#if url}<a href={url} target="_blank" rel="noopener noreferrer">{typeof source.referenceTitle === 'string' ? source.referenceTitle : url}</a>{:else}<p>Source URL is not recorded as a safe web reference.</p>{/if}
            <pre>{JSON.stringify(source, null, 2)}</pre>
          </li>
        {:else}<li>No source references are recorded.</li>{/each}</ul>
      </details>
      <details><summary>Complete retained metadata</summary><pre>{context.json}</pre></details>
      <button type="button" onclick={() => onask(question)}>Find supporting evidence</button>
      <p class="hint">Opens Ask OKF with this record’s terms. Review the question, then build a bounded evidence package.</p>
    {:else}
      <p role="status">The record explanation could not be displayed because its identity, schema or size is invalid. No interpretation has been substituted.</p>
    {/if}
  </section>
{/if}

<style>
  .okf-plus-context{margin:1rem 0;padding:.9rem;border:1px solid var(--border,#b6c9d5);border-radius:.4rem;overflow-wrap:anywhere}
  h3{margin-top:0}dt{font-weight:700;margin-top:.8rem}dd{margin:.25rem 0 .7rem}dd small{display:block;margin-top:.25rem;color:var(--muted,#505a5f)}
  .structured,pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem}pre{max-height:28rem;overflow:auto;border:1px solid var(--border,#b6c9d5);padding:.6rem}
  summary{cursor:pointer;font-weight:700;padding:.65rem 0}button{margin-top:.7rem;font:inherit;padding:.55rem .7rem;background:var(--panel,#fff);color:var(--text,#005ea5);border:1px solid var(--border,#b6c9d5);border-radius:.3rem;cursor:pointer}
  button:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #ffdd00;outline-offset:3px}.hint{font-size:.9rem}
  label{display:block;font-weight:700;margin:1rem 0}select{display:block;max-width:100%;font:inherit;padding:.45rem;margin-top:.4rem}select:focus-visible{outline:3px solid #ffdd00;outline-offset:3px}
</style>
