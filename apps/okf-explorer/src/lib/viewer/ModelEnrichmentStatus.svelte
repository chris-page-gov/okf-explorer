<script lang="ts">
  import type { LargeModelEnrichmentState } from '$lib/types';

  let { enrichment }: { enrichment: LargeModelEnrichmentState } = $props();
</script>

<section
  class="model-enrichment-status"
  class:unavailable={enrichment.status === 'unavailable'}
  aria-label="Model-assisted enrichment provenance"
  data-model-enrichment-mode={enrichment.mode}
  data-model-enrichment-status={enrichment.status}
>
  <header>
    <div>
      <span>Model-assisted discovery metadata</span>
      <h3>{enrichment.label}</h3>
    </div>
    <small>Not official effects</small>
  </header>

  {#if enrichment.counts}
    <div class="enrichment-counts">
      <article>
        <strong>{enrichment.counts.assertions.toLocaleString()}</strong>
        <span>accepted assertions</span>
      </article>
      {#if enrichment.counts.byKind}
        <article>
          <strong>{enrichment.counts.byKind.topic.toLocaleString()}</strong>
          <span>topics</span>
        </article>
        <article>
          <strong>{enrichment.counts.byKind.concept.toLocaleString()}</strong>
          <span>concepts</span>
        </article>
        <article>
          <strong>{enrichment.counts.byKind.entity.toLocaleString()}</strong>
          <span>entities</span>
        </article>
      {/if}
    </div>
  {/if}

  <p
    class="enrichment-message"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >{enrichment.message}</p>
  {#if enrichment.mode === 'governed-v3'}
    <p class="provenance-note">
      Only independently accepted v3 assertion chunks are graph inputs. Candidate and
      review-verdict material is not loaded.
    </p>
  {:else}
    <p class="provenance-note">
      Historical compatibility fallback: this plane is used only when v3 is not declared,
      and the two versions are never merged or double-counted.
    </p>
  {/if}
</section>

<style>
  .model-enrichment-status {
    display: grid;
    gap: 10px;
    margin: 12px 0 18px;
    border: 1px solid var(--line);
    border-left: 4px solid #7b61a8;
    border-radius: 7px;
    padding: 12px;
    background: var(--surface);
  }

  .model-enrichment-status.unavailable {
    border-left-color: #b85c49;
    background: #fff8f6;
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

  .enrichment-counts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  article {
    display: grid;
    gap: 2px;
    min-width: 0;
    border-top: 4px solid #7b61a8;
    border-radius: 5px;
    padding: 9px;
    background: var(--surface-2);
  }

  article strong {
    font-size: clamp(18px, 2vw, 26px);
    line-height: 1;
  }

  article span {
    font-size: 12px;
    font-weight: 800;
  }

  p {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .provenance-note {
    border-radius: 5px;
    padding: 8px;
    background: color-mix(in srgb, #7b61a8 9%, var(--surface));
  }

  @media (max-width: 760px) {
    .enrichment-counts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
