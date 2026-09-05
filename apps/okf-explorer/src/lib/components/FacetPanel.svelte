<script lang="ts">
  import { facetColour, HIGHLIGHT_COLOUR, TRACK_COLOUR } from '$lib/viewer/facetColours';
  export type FacetModel = { key: string; label: string; description?: string; pinned?: boolean; open?: boolean;
    rows: { value: string; label: string; count: number; highlighted?: number }[]; exact?: boolean };
  let { facets, selection, multiple = $bindable(false), busy = false, onopen, onpin, onpreview, onpreviewsummary, onkeep, onmove, onhide }:
    { facets: FacetModel[]; selection: Record<string, string[]>; multiple?: boolean; busy?: boolean;
      onopen: (key: string) => void; onpin: (key: string) => void;
      onpreview: (key: string, value: string, additive: boolean) => void;
      onpreviewsummary: (key: string, value: string, additive: boolean) => void;
      onkeep: (key: string, value: string, restoreSelection?: boolean) => void; onmove?: (key: string, direction: -1 | 1) => void;
      onhide?: (key: string) => void } = $props();
  let searches = $state<Record<string, string>>({});
  let limits = $state<Record<string, number>>({});
  function segments(rows: FacetModel['rows']) {
    const positive = rows.filter(row => row.count);
    const tail = positive.slice(16);
    return tail.length ? [...positive.slice(0, 16), { other: true, value: '__other', label: `${tail.length} other values`, count: tail.reduce((sum, row) => sum + row.count, 0), highlighted: tail.every(row => row.highlighted !== undefined) ? tail.reduce((sum, row) => sum + (row.highlighted || 0), 0) : undefined }] : positive;
  }
  function choose(event: MouseEvent, key: string, value: string) {
    // The second click of a double click must not toggle an additive value again.
    if (event.detail < 2) onpreview(key, value, multiple || event.ctrlKey || event.metaKey || event.shiftKey);
  }
</script>

<div class="facet-instructions">
  <label><input type="checkbox" bind:checked={multiple} /> Select multiple values</label>
  <details><summary>How selection works</summary><p>Click to highlight and bring matches to the top. Click a selected value again to remove it. An unselected value replaces the selection in that facet. Hold Ctrl or Command, or enable multiple selection, to select values joined by “or”. Different facets are joined by “and”. Double-click to keep highlighted records. Keyboard: Enter highlights; Alt+Enter keeps.</p></details>
</div>
<p class="bar-legend">Click a colour to toggle its value while keeping the facet folded. Colours separate values. The lower black track shows highlighted matches. Open a facet for labelled counts; values can overlap.</p>
<div class="facet-sections" aria-label="Facet filters">
  {#each facets as facet (facet.key)}
    {@const chosen = selection[facet.key] || []}
    {@const total = facet.rows.reduce((sum, row) => sum + row.count, 0)}
    {@const rows = facet.rows.filter(row => row.label.toLocaleLowerCase('en-GB').includes((searches[facet.key] || '').toLocaleLowerCase('en-GB')))}
    <section class="facet-section" class:open={facet.open} class:pinned={facet.pinned} data-facet-key={facet.key} aria-label={`${facet.label} facet`}>
      <div class="facet-header">
        <button class="facet-toggle" aria-expanded={facet.open} aria-controls={`facet-values-${facet.key}`} onclick={() => onopen(facet.key)}><span class="facet-heading-label"><strong>{facet.label}</strong><span class="selection-summary" title={chosen.map(value => facet.rows.find(row => row.value === value)?.label || value).join(' or ')}>{chosen.map(value => facet.rows.find(row => row.value === value)?.label || value).join(' or ') || '\u00a0'}</span></span><small>{facet.rows.length} values</small></button>
        <button aria-label={`${facet.pinned ? 'Unpin' : 'Pin'} ${facet.label}`} aria-pressed={facet.pinned || false} onclick={() => onpin(facet.key)}>{facet.pinned ? '★' : '☆'}</button>
        {#if onmove || onhide}<details class="facet-options"><summary aria-label={`Options for ${facet.label}`}>⋯</summary><div>
          {#if onmove}<button onclick={() => onmove?.(facet.key, -1)}>Move up</button><button onclick={() => onmove?.(facet.key, 1)}>Move down</button>{/if}
          {#if onhide}<button onclick={() => onhide?.(facet.key)}>Hide facet</button>{/if}
        </div></details>{/if}
      </div>
      <div class="facet-distribution" role="group" aria-label={`${facet.label} colour selections${facet.exact === false ? ' (partial counts)' : ''}`}>
        {#each segments(facet.rows) as row, index}
          {@const other = 'other' in row && row.other}
          <button type="button" class="bar-segment" data-facet-colour={other ? undefined : row.value}
            aria-label={`${row.label}: ${row.highlighted ?? 'unknown'} highlighted / ${row.count} in scope${facet.exact === false ? ' (partial counts)' : ''}${other ? '; open facet to select these values' : ''}`}
            aria-pressed={other ? undefined : chosen.includes(row.value)}
            style={`flex-grow:${row.count};--bar-colour:${facetColour(index)};--highlight-colour:${HIGHLIGHT_COLOUR};--track-colour:${TRACK_COLOUR}`}
            title={`${row.label}: ${row.highlighted ?? '—'} highlighted / ${row.count} in scope`}
            onclick={(event) => { if (other) { if (!facet.open) onopen(facet.key); } else if (event.detail < 2) onpreviewsummary(facet.key, row.value, multiple || event.ctrlKey || event.metaKey || event.shiftKey); }}
            ondblclick={() => { if (!other) onkeep(facet.key, row.value, true); }}
            onkeydown={(event) => { if (!other && event.key === 'Enter') { event.preventDefault(); if (event.altKey) onkeep(facet.key, row.value); else onpreviewsummary(facet.key, row.value, multiple || event.ctrlKey || event.metaKey || event.shiftKey); } }}>
            {#if !other && chosen.includes(row.value)}<span class="bar-selected" aria-hidden="true">✓</span>{/if}
            <span class="highlight-track" class:unknown={row.highlighted === undefined} aria-hidden="true">{#if row.highlighted === undefined}<span class="unknown-count">?</span>{:else}<span class="highlight-share" style={`width:${row.count ? row.highlighted / row.count * 100 : 0}%`}></span>{/if}</span>
          </button>
        {/each}
        {#if !total}<span class="zero-bar">No members in this scope</span>{/if}
      </div>
      {#if facet.open}
        <div id={`facet-values-${facet.key}`} class="facet-values">
          {#if facet.description}<p>{facet.description}</p>{/if}
          {#if facet.rows.length > 12}<input aria-label={`Find values in ${facet.label}`} placeholder="Find a value" value={searches[facet.key] || ''} oninput={(event) => searches = { ...searches, [facet.key]: event.currentTarget.value }} />{/if}
          <small class="count-key">Highlighted / in scope{facet.exact === false ? ' · partial counts' : ''}</small>
          {#each rows.slice(0, limits[facet.key] || 40) as row (row.value)}
            <button class="facet-value" data-facet-value={row.value} class:highlighted={chosen.includes(row.value)} aria-pressed={chosen.includes(row.value)} onclick={(event) => choose(event, facet.key, row.value)} ondblclick={() => onkeep(facet.key, row.value, true)} onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (event.altKey) onkeep(facet.key, row.value); else onpreview(facet.key, row.value, multiple || event.ctrlKey || event.metaKey || event.shiftKey); } }}>
              <span>{#if chosen.includes(row.value)}<span aria-hidden="true">✓ </span>{/if}{row.label}{#if chosen.includes(row.value)}<span class="selection-word"> · Highlighted</span>{/if}</span><small>{row.highlighted ?? '—'} / {row.count.toLocaleString('en-GB')}</small>
            </button>
          {/each}
          {#if rows.length > (limits[facet.key] || 40)}<button onclick={() => limits = { ...limits, [facet.key]: (limits[facet.key] || 40) + 80 }}>Show more values</button>{/if}
          {#if !rows.length}<p>No values match.</p>{/if}
        </div>
      {/if}
    </section>
  {/each}
</div>

<style>
  .facet-instructions { font-size:.8rem; margin:8px 0; } .facet-instructions label { display:flex; gap:8px; align-items:center; } .facet-instructions details { margin-top:8px; }
  .facet-section { margin:8px 0; border:1px solid #9fb4ca; border-left:4px solid #0068bc; border-radius:6px; background:white; overflow:visible; }
  .facet-header { display:flex; align-items:center; gap:3px; padding:3px; } .facet-header button { min-height:36px; padding:5px; }
  .facet-toggle { flex:1; display:flex; gap:6px; align-items:center; justify-content:space-between; min-width:0; border:0; text-align:left; } .facet-toggle strong { overflow:hidden; text-overflow:ellipsis; }
  .facet-toggle small { font-size:.7rem; white-space:nowrap; }
  .facet-heading-label { display:grid; grid-template-rows:18px 12px; min-width:0; }
  .facet-heading-label strong { line-height:18px; }
  .facet-heading-label .selection-summary { display:block; min-width:0; height:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; line-height:12px; font-weight:600; }
  .facet-header .facet-toggle { padding:3px 5px; }
  .bar-legend { font-size:.75rem; line-height:1.4; color:#243746; } .selection-word { font-size:.75rem; }
  .facet-distribution { display:flex; width:calc(100% - 12px); margin:6px; height:32px; background:#ffffff; overflow:visible; }
  .bar-segment { flex-basis:0; min-width:0; padding:0; border:0; border-radius:0; background:var(--bar-colour); position:relative; height:32px; }
  .bar-segment:focus-visible { outline:3px solid #0b0c0c; outline-offset:2px; z-index:1; box-shadow:0 0 0 2px white; }
  .bar-selected { position:absolute; top:1px; left:50%; transform:translateX(-50%); background:white; color:#0b0c0c; border:1px solid #0b0c0c; font-size:10px; line-height:12px; }
  .highlight-track { position:absolute; left:0; bottom:0; width:100%; height:8px; background:var(--track-colour); border-top:1px solid var(--highlight-colour); }
  .highlight-share { display:block; height:100%; background:var(--highlight-colour); }
  .unknown-count { display:block; text-align:center; font-size:8px; line-height:8px; color:#0b0c0c; }
  .highlight-track.unknown { border-top-style:dashed; }
  @media (forced-colors: active) { .bar-segment { border:1px solid CanvasText; } .highlight-track { background:Canvas; } .highlight-share { background:Highlight; forced-color-adjust:none; } }
  .zero-bar { font-size:.65rem; } .facet-values { padding:6px; display:grid; gap:5px; }
  .facet-values p { margin:0 0 5px; font-size:.8rem; } .facet-values input { width:100%; min-width:0; }
  .facet-value { display:flex; justify-content:space-between; align-items:center; gap:8px; text-align:left; min-height:40px; padding:6px 8px; }
  .facet-value small { white-space:nowrap; font-variant-numeric:tabular-nums; }
  .facet-value.highlighted { background:#fff4b8; border-color:#665400; box-shadow:inset 4px 0 #665400; }
  .count-key { text-align:right; font-size:.72rem; color:#43566a; }
  .facet-options { position:relative; } .facet-options summary { cursor:pointer; padding:8px; list-style:none; }
  .facet-options div { position:absolute; right:0; z-index:5; background:white; border:1px solid #9fb4ca; box-shadow:0 3px 10px #0002; min-width:140px; display:grid; }
</style>
