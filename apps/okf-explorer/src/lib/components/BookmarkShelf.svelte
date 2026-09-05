<script lang="ts">
  import type { Bookmark } from '$lib/viewer/bookmarks';
  let { pins, onopen, onremove, oncopy, ondownload }:
    { pins: Bookmark[]; onopen: (pin: Bookmark) => void; onremove: (pin: Bookmark) => void;
      oncopy: () => void; ondownload: () => void } = $props();
</script>

{#if pins.length}
  <details class="pins-bar">
    <summary>{pins.length} saved {pins.length === 1 ? 'pin' : 'pins'}</summary>
    <div class="pin-actions"><button onclick={oncopy}>Copy pins JSON</button><button onclick={ondownload}>Download pins</button></div>
    <div class="pin-list">
      {#each pins as pin (`${pin.bundle}#${pin.route}`)}
        <span><button title={pin.bundle} onclick={() => onopen(pin)}>{pin.label}</button><button aria-label={`Remove pin ${pin.label}`} onclick={() => onremove(pin)}>×</button></span>
      {/each}
    </div>
  </details>
{/if}

<style>
  .pins-bar { padding:8px 12px; background:white; border-top:1px solid #b8c7d8; position:sticky; bottom:0; z-index:2; }
  summary { cursor:pointer; font-size:.85rem; font-weight:600; }
  .pin-actions, .pin-list { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; } .pin-list span { display:inline-flex; gap:2px; }
  button { padding:5px 8px; font-size:.8rem; } .pin-list button:first-child { max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
