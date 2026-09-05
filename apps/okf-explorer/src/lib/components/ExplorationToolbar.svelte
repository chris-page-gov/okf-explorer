<script lang="ts">
  import { HIGHLIGHT_COLOUR, TRACK_COLOUR } from '$lib/viewer/facetColours';
  import { hasSelection, selectionLabel, type Exploration, type FoldedSet } from '$lib/viewer/facetSelection';
  let { exploration, highlighted, total, compact = false, scopeKnown = true, approximate = false, busy = false, canFold = true, folds = [], foldCounts = {}, onkeep, onfold, onunfold, onclear, onundo, onreset, label = (key: string) => key }:
    { exploration: Exploration; highlighted: number; total: number; compact?: boolean; scopeKnown?: boolean; approximate?: boolean; busy?: boolean; canFold?: boolean; folds?: FoldedSet[]; foldCounts?: Record<string, { highlighted: number; inScope: number }>;
      onkeep: (mode: 'keep' | 'remove') => void; onfold: (highlighted: boolean) => void; onunfold: (id: string) => void;
      onclear: () => void; onundo: () => void; onreset: () => void; label?: (key: string) => string } = $props();
  let selected = $derived(hasSelection(exploration.preview));
  let actionsExpanded = $state(false);
</script>

<section class="exploration-toolbar" class:compact aria-label="Explore current set">
  <div class="toolbar-summary"><p aria-live="polite" title={compact && approximate ? 'Counts describe the bounded candidate set; full totals are uncertain.' : undefined}><strong>{!scopeKnown ? 'Choose a facet value' : busy ? 'Updating…' : `${compact && approximate ? 'Partial: ' : ''}${highlighted.toLocaleString('en-GB')} highlighted / ${total.toLocaleString('en-GB')} in scope`}</strong>{#if approximate && !compact}<span>Counts describe the bounded candidate set; full totals are uncertain.</span>{/if}{#if selected && !compact}<span>{selectionLabel(exploration.preview, label)}</span>{/if}</p>
  {#if compact}<button class="actions-toggle" aria-label="Selection actions" aria-expanded={actionsExpanded} aria-controls="exploration-actions" onclick={() => actionsExpanded = !actionsExpanded}>Actions {actionsExpanded ? '▴' : '▾'}</button>{/if}</div>
  <div id="exploration-actions" class="exploration-actions" hidden={compact && !actionsExpanded}>
    <button disabled={!selected || busy} onclick={() => onkeep('keep')}>Keep highlighted</button>
    <button disabled={!selected || busy} onclick={() => onkeep('remove')}>Keep unhighlighted</button>
    <button disabled={!selected || busy || !canFold || !highlighted} onclick={() => onfold(true)}>Fold highlighted</button>
    <button disabled={!selected || busy || !canFold || highlighted === total} onclick={() => onfold(false)}>Fold unhighlighted</button>
    <button disabled={!selected || busy} onclick={onclear}>Clear highlight</button>
    <button disabled={!exploration.reductions.length || busy} onclick={onundo}>Undo keep ({exploration.reductions.length})</button>
    <button disabled={busy} onclick={onreset}>Reset view</button>
  </div>
  {#if selected && !canFold}<small>Folding needs complete membership within the 50,000-record local limit. Narrow this set first.</small>{/if}
  {#each folds as fold (fold.id)}
    {@const count = foldCounts[fold.id]}
    <div class="folded-set">{#if count}<span class="folded-bar" style={`--highlight-colour:${HIGHLIGHT_COLOUR};--track-colour:${TRACK_COLOUR};--highlight-share:${count.inScope ? count.highlighted / count.inScope * 100 : 0}%`} aria-hidden="true"></span>{/if}<span>{fold.label} · {count ? `${count.highlighted} highlighted / ${count.inScope} in scope` : 'Current membership counts unavailable'} · {fold.members.length.toLocaleString('en-GB')} saved</span><button aria-label={`Unfold ${fold.label}`} onclick={() => onunfold(fold.id)}>Unfold</button></div>
  {/each}
</section>

<style>
  .exploration-toolbar { padding:10px 14px; background:#f7faff; border-bottom:1px solid #b8c7d8; flex:none; }
  p { margin:0 0 8px; font-size:.85rem; } p span { display:block; margin-top:3px; }
  .exploration-actions { display:flex; flex-wrap:wrap; gap:5px; } button { font-size:.78rem; min-height:32px; padding:4px 8px; }
  .exploration-toolbar .exploration-actions[hidden] { display:none; }
  .toolbar-summary { display:flex; align-items:flex-start; gap:5px; } .toolbar-summary p { flex:1; min-width:0; }
  .compact { padding:5px 7px; } .compact .toolbar-summary { align-items:center; } .compact .toolbar-summary p { margin:0; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .compact .actions-toggle { min-height:30px; padding:3px 6px; flex:none; font-size:12px; }
  .compact .exploration-actions { margin-top:5px; display:grid; grid-template-columns:1fr 1fr; gap:3px; }
  .compact .exploration-actions button { padding:3px 5px; font-size:12px; min-height:30px; }
  .folded-set { display:flex; align-items:center; gap:8px; font-size:.75rem; margin-top:6px; border:1px solid #b8c7d8; padding:3px 6px; }
  .folded-bar { width:48px; height:9px; border:1px solid #0b0c0c; background:linear-gradient(90deg,var(--highlight-colour) var(--highlight-share),var(--track-colour) var(--highlight-share)); flex:none; }
  .folded-set button { margin-left:auto; } @media(max-width:620px) { .exploration-toolbar { padding:6px; } .exploration-actions button { min-height:36px; } }
</style>
