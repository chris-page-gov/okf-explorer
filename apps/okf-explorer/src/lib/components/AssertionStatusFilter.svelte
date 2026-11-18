<script lang="ts">
  import { assertionFilter, assertionLabels, assertionStatuses, type AssertionFilter, type AssertionStatus } from '$lib/viewer/assertionStatus';

  let { counts, scope, selected, onselect }: {
    counts: Readonly<Record<AssertionStatus, number>>;
    scope: string;
    selected: AssertionFilter;
    onselect: (status: AssertionFilter) => void;
  } = $props();

  const total = $derived(Object.values(counts).reduce((sum, value) => sum + value, 0));
</script>

{#if total > counts.unclassified || selected !== 'all'}
  <section aria-label="Assertion status comparison">
    <h3>Compare assertion status</h3>
    <p>{scope}</p>
    <dl>
      {#each assertionStatuses as status (status)}
        <div><dt>{assertionLabels[status]}</dt><dd>{counts[status].toLocaleString('en-GB')}</dd></div>
      {/each}
    </dl>
    <label>
      Show links by assertion status
      <select value={selected} onchange={event => onselect(assertionFilter(event.currentTarget.value))}>
        <option value="all">All statuses</option>
        {#each assertionStatuses as status (status)}
          <option value={status}>{assertionLabels[status]}</option>
        {/each}
      </select>
    </label>
    <span role="status">{(selected === 'all' ? total : counts[selected]).toLocaleString('en-GB')} shown</span>
  </section>
{/if}

<style>
  section { display: grid; gap: .5rem; padding: .75rem; margin-block: .5rem; border: 1px solid var(--line); background: var(--surface); }
  h3, p, dl, dd { margin: 0; }
  dl { display: flex; flex-wrap: wrap; gap: .35rem 1rem; }
  dl div { display: flex; gap: .25rem; }
  dd { font-weight: 700; }
  label { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }
  select { font: inherit; min-height: 36px; color: var(--ink); background: var(--surface); border: 1px solid var(--line-strong); border-radius: .25rem; }
</style>
