<script lang="ts">
  import type { LargeEffectsReconciliation } from '$lib/types';

  let {
    reconciliation,
    error = ''
  }: {
    reconciliation?: LargeEffectsReconciliation;
    error?: string;
  } = $props();
</script>

<section class="effects-reconciliation" aria-label="Official effects live reconciliation">
  <header>
    <div>
      <span>Official amendment/effect evidence</span>
      <h3>Static snapshot and reviewed live result</h3>
    </div>
    {#if reconciliation?.observedAt}
      <small>Reviewed {reconciliation.observedAt}</small>
    {/if}
  </header>

  {#if reconciliation}
    <div class="reconciliation-states">
      {#each reconciliation.states as state}
        <article data-reconciliation-state={state.id}>
          <strong>{state.count.toLocaleString()}</strong>
          <span>{state.label}</span>
          <p>{state.description}</p>
        </article>
      {/each}
    </div>
    <p class="reconciliation-scope">
      Frozen snapshot <strong>{reconciliation.snapshotId}</strong>.
      {reconciliation.scope || 'This is a bounded live reconciliation, not a complete live recrawl.'}
    </p>
    {#if reconciliation.notice}<p class="muted">{reconciliation.notice}</p>{/if}
  {:else if error}
    <p class="reconciliation-error">The declared reconciliation evidence could not be loaded: {error}</p>
  {/if}
</section>

<style>
  .effects-reconciliation {
    display: grid;
    gap: 10px;
    margin: 12px 0 18px;
    border: 1px solid var(--line);
    border-left: 4px solid #2d7d4d;
    border-radius: 7px;
    padding: 12px;
    background: var(--surface);
  }

  header {
    display: flex;
    gap: 12px;
    align-items: start;
    justify-content: space-between;
  }

  header div {
    display: grid;
    gap: 2px;
  }

  header span,
  header small {
    color: var(--muted);
    font-size: 11px;
    font-weight: 750;
    letter-spacing: .03em;
    text-transform: uppercase;
  }

  h3,
  p {
    margin: 0;
  }

  .reconciliation-states {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  article {
    display: grid;
    gap: 2px;
    min-width: 0;
    border-top: 4px solid #2d7d4d;
    border-radius: 5px;
    padding: 9px;
    background: var(--surface-2);
  }

  article[data-reconciliation-state="live-addition"] {
    border-top-color: #1d70b8;
  }

  article[data-reconciliation-state="superseded"] {
    border-top-color: #b58800;
  }

  article[data-reconciliation-state="inaccessible"] {
    border-top-color: #b85c49;
  }

  article strong {
    font-size: clamp(20px, 2.3vw, 30px);
    line-height: 1;
  }

  article span {
    font-weight: 800;
  }

  article p,
  .reconciliation-scope,
  .muted,
  .reconciliation-error {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .reconciliation-error {
    border-radius: 5px;
    padding: 9px;
    background: #fff2ef;
    color: #7a2e20;
  }

  @media (max-width: 760px) {
    .reconciliation-states {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
