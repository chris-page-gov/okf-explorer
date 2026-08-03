<script lang="ts">
  import type { LargeDataset } from '$lib/types';
  import { heritageDetailSections } from './heritagePresentation';

  let { record }: { record: LargeDataset } = $props();
  let sections = $derived(heritageDetailSections(record));

  function valueText(value: unknown): string {
    if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(' · ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return String(value ?? '');
  }

  function isUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }
</script>

{#if sections.length}
  <section class="heritage-detail" aria-label="Heritage record summary">
    <header>
      <strong>Heritage evaluation fields</strong>
      <span>Source fields and visibly labelled YAML-LD projections</span>
    </header>
    {#each sections as section}
      <details open={section.id === 'designation' || section.id === 'risk'}>
        <summary>{section.title}</summary>
        <p>{section.description}</p>
        <dl>
          {#each section.fields as item}
            <dt>
              {item.label}
              {#if item.help}<small>{item.help}</small>{/if}
            </dt>
            <dd>
              {#if item.href}
                <a href={item.href} target="_blank" rel="noopener noreferrer">{valueText(item.value)}</a>
              {:else if isUrl(item.value)}
                <a href={item.value} target="_blank" rel="noopener noreferrer">{item.value}</a>
              {:else}
                {valueText(item.value)}
              {/if}
            </dd>
          {/each}
        </dl>
      </details>
    {/each}
  </section>
{/if}

<style>
  .heritage-detail {
    display: grid;
    gap: 0.7rem;
    margin: 0.9rem 0;
    padding: 0.8rem;
    border: 1px solid var(--border, #cbd5e1);
    border-radius: 0.7rem;
    background: color-mix(in srgb, var(--panel, #fff) 92%, #eff6ff);
  }

  header {
    display: grid;
    gap: 0.15rem;
  }

  header span,
  details > p,
  dt small {
    color: var(--muted, #475569);
    font-size: 0.82rem;
  }

  details > p {
    margin: 0.45rem 0;
  }

  dl {
    display: grid;
    grid-template-columns: minmax(9rem, 0.8fr) minmax(0, 1.5fr);
    gap: 0.35rem 0.8rem;
    margin: 0.6rem 0 0;
  }

  dt {
    font-weight: 650;
  }

  dt small {
    display: block;
    font-weight: 400;
    margin-top: 0.1rem;
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    dl {
      grid-template-columns: 1fr;
    }
  }
</style>
