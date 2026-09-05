<script lang="ts">
  import type { Snippet } from 'svelte';
  let { overview, evidence, data }: { overview: Snippet; evidence: Snippet; data: Snippet } = $props();
  const sections = ['Overview', 'Evidence', 'Data'] as const;
  type Section = typeof sections[number];
  let active = $state<Section>('Overview');
  let pinned = $state<Section[]>([]);
  const id = $props.id();
  function keydown(event: KeyboardEvent, section: Section) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (sections.indexOf(section) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    active = sections[index]; document.getElementById(`${id}-${active}`)?.focus();
  }
</script>

<div class="detail-tabs" role="tablist" aria-label="Data card sections">
  {#each sections as section}<button id={`${id}-${section}`} role="tab" aria-selected={active === section} aria-controls={`${id}-${section}-panel`} tabindex={active === section ? 0 : -1} onclick={() => active = section} onkeydown={(event) => keydown(event, section)}>{section}</button>{/each}
</div>
{#each sections as section}
  <div id={`${id}-${section}-panel`} role="tabpanel" aria-labelledby={`${id}-${section}`} hidden={active !== section && !pinned.includes(section)}>
    <div class="section-heading"><strong>{section}</strong><button aria-pressed={pinned.includes(section)} onclick={() => pinned = pinned.includes(section) ? pinned.filter(item => item !== section) : [...pinned, section]}>{pinned.includes(section) ? 'Unpin' : 'Pin'} section</button></div>
    {#if section === 'Overview'}{@render overview()}{:else if section === 'Evidence'}{@render evidence()}{:else}{@render data()}{/if}
  </div>
{/each}

<style>
  .detail-tabs { display:flex; gap:5px; border-bottom:1px solid #b8c7d8; margin:8px 0 6px; padding:3px; } .detail-tabs button { flex:1; display:flex; align-items:center; justify-content:center; min-height:var(--explorer-control-height,36px); height:var(--explorer-control-height,36px); padding:0 7px; line-height:1.2; }
  [aria-selected=true] { background:#005ea5; color:white; } .section-heading { display:flex; align-items:center; justify-content:space-between; margin:8px 0; font-size:.8rem; } .section-heading button { font-size:.75rem; padding:4px 7px; }
  [role=tabpanel][hidden] { display:none; }
</style>
