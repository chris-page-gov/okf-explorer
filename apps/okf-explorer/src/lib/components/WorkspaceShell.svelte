<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import { swipePanel, type WorkspacePanel } from '$lib/viewer/workspaceNavigation';

  let { navigation, content, details, actions, activePanel = $bindable('content'),
    leftCollapsed = $bindable(false), rightCollapsed = $bindable(false),
    leftWidth = $bindable(320), rightWidth = $bindable(420),
    navigationSummary = 'Search and facets', detailSummary = 'Details', resultSummary = ''
  }: { navigation: Snippet; content: Snippet<[Snippet<[boolean]> | undefined]>; details: Snippet; actions?: Snippet<[boolean]>; activePanel?: WorkspacePanel;
    leftCollapsed?: boolean; rightCollapsed?: boolean; leftWidth?: number; rightWidth?: number;
    navigationSummary?: string; detailSummary?: string; resultSummary?: string } = $props();

  let viewportWidth = $state(1280);
  let paired = $derived(viewportWidth >= 600 && viewportWidth <= 1099);
  let showingPair = $derived(paired && activePanel !== 'content');
  let touch: { x: number; y: number; at: number } | null = null;
  let shell = $state<HTMLElement>();
  let previousPanel: WorkspacePanel | undefined;
  let lastPaneFocus: HTMLElement | null = null;
  function rememberFocus(event: FocusEvent) {
    const target = event.target;
    lastPaneFocus = target instanceof HTMLElement && target.closest('.workspace-pane') ? target : null;
  }
  $effect(() => {
    const panel = activePanel;
    const width = viewportWidth;
    const panelChanged = previousPanel !== undefined && previousPanel !== panel;
    previousPanel = panel;
    // Chrome may blur a control as soon as a media query hides its pane,
    // before the resize effect runs. Retain that focus context across the blur.
    const focused = document.activeElement === document.body ? lastPaneFocus : document.activeElement;
    const focusedPane = focused?.closest('.workspace-pane');
    if (!shell || width > 1099 || !focusedPane) return;
    void tick().then(() => {
      // Resizing within one layout must not interrupt typing in a visible control.
      const current = document.activeElement;
      if ((current !== focused && current !== document.body) || (!panelChanged && focusedPane.getClientRects().length)) return;
      shell?.querySelector<HTMLElement>(`[data-panel="${panel}"]`)?.focus({ preventScroll: true });
    });
  });

  function startSwipe(event: TouchEvent) {
    if (viewportWidth > 1099) return;
    // Charts, controls and text selection keep their own gestures.
    if ((event.target as Element).closest('input, select, textarea, svg, canvas, [data-no-panel-swipe]')) return;
    const point = event.touches[0];
    touch = point ? { x: point.clientX, y: point.clientY, at: Date.now() } : null;
  }
  function endSwipe(event: TouchEvent) {
    const point = event.changedTouches[0];
    if (touch && point && !window.getSelection()?.toString()) {
      activePanel = swipePanel(activePanel, point.clientX - touch.x, point.clientY - touch.y, Date.now() - touch.at, paired);
    }
    touch = null;
  }
  function resize(side: 'left' | 'right', delta: number) {
    if (side === 'left') leftWidth = Math.max(240, Math.min(520, leftWidth + delta));
    else rightWidth = Math.max(280, Math.min(640, rightWidth + delta));
  }
  function resizeKey(side: 'left' | 'right', event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') {
      if (side === 'left') leftWidth = event.key === 'Home' ? 240 : 520;
      else rightWidth = event.key === 'Home' ? 280 : 640;
    } else resize(side, (event.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1) * (event.shiftKey ? 40 : 10));
  }
  function startResize(side: 'left' | 'right', event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    let x = event.clientX;
    target.onpointermove = (move) => { resize(side, (move.clientX - x) * (side === 'left' ? 1 : -1)); x = move.clientX; };
    target.onlostpointercapture = () => { target.onpointermove = null; };
  }
</script>

<svelte:window bind:innerWidth={viewportWidth} onfocusin={rememberFocus} />

<main bind:this={shell} class="workspace workspace-shell" class:showing-pair={showingPair} style={`--navigation-width:${leftCollapsed ? 44 : leftWidth}px;--details-width:${rightCollapsed ? 44 : rightWidth}px`} ontouchstart={startSwipe} ontouchend={endSwipe} ontouchcancel={() => touch = null}>
  <aside tabindex="-1" data-panel="navigation" class="left-panel workspace-pane" class:mobile-active={activePanel === 'navigation'} class:rail={leftCollapsed} aria-label="Search and facets">
    <div class="panel-bar"><button aria-label="Toggle navigation" aria-expanded={!leftCollapsed} onclick={() => leftCollapsed = !leftCollapsed}>{leftCollapsed ? '›' : '‹'}</button><span class="panel-rail-label" title={navigationSummary}>{navigationSummary}</span></div>
    <div class="left-content panel-scroll">{#if showingPair}{@render actions?.(true)}{/if}{@render navigation()}</div>
  </aside>
  <!-- A focusable separator is the WAI-ARIA window splitter pattern. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div class="splitter" role="separator" tabindex={leftCollapsed ? -1 : 0} aria-label="Resize navigation" aria-orientation="vertical" aria-valuemin="240" aria-valuemax="520" aria-valuenow={leftWidth} onkeydown={(event) => resizeKey('left', event)} onpointerdown={(event) => startResize('left', event)}></div>
  <section tabindex="-1" data-panel="content" class="stage workspace-pane" class:mobile-active={activePanel === 'content'} aria-label="Explorer content">{@render content(showingPair ? undefined : actions)}</section>
  <!-- A focusable separator is the WAI-ARIA window splitter pattern. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div class="splitter" role="separator" tabindex={rightCollapsed ? -1 : 0} aria-label="Resize details" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="640" aria-valuenow={rightWidth} onkeydown={(event) => resizeKey('right', event)} onpointerdown={(event) => startResize('right', event)}></div>
  <aside tabindex="-1" data-panel="details" class="right-panel workspace-pane" class:mobile-active={activePanel === 'details'} class:rail={rightCollapsed} aria-label="Record details">
    <div class="panel-bar"><button aria-label="Toggle details" aria-expanded={!rightCollapsed} onclick={() => rightCollapsed = !rightCollapsed}>{rightCollapsed ? '‹' : '›'}</button><span class="panel-rail-label" title={detailSummary}>{detailSummary}</span></div>
    <div class="detail panel-scroll">{@render details()}</div>
  </aside>
  <nav class="panel-footer" class:paired aria-label="Workspace panels">
    {#if paired}
      <button aria-current={showingPair ? 'page' : undefined} onclick={() => activePanel = 'navigation'}><span aria-hidden="true">☷</span><span>Search & details</span></button>
    {:else}
      <button aria-current={activePanel === 'navigation' ? 'page' : undefined} onclick={() => activePanel = 'navigation'}><span aria-hidden="true">☷</span><span>Search & facets</span></button>
    {/if}
    <button aria-current={activePanel === 'content' ? 'page' : undefined} title={resultSummary ? `Results: ${resultSummary}` : 'Results'} onclick={() => activePanel = 'content'}><span aria-hidden="true">▦</span><span>Results</span></button>
    {#if !paired}<button aria-current={activePanel === 'details' ? 'page' : undefined} onclick={() => activePanel = 'details'}><span aria-hidden="true">ⓘ</span><span>Details</span></button>{/if}
  </nav>
</main>

<style>
  .workspace-shell { display:grid; grid-template-columns:var(--navigation-width) 6px minmax(260px,1fr) 6px var(--details-width); min-height:0; height:100%; overflow:hidden; }
  .workspace-shell .workspace-pane { min-height:0; min-width:0; height:100%; overflow:hidden; grid-row:1; }
  .left-panel { grid-column:1; } .workspace-shell .stage { grid-column:3; display:block; overflow:auto; overscroll-behavior:contain; } .right-panel { grid-column:5; }
  .left-panel, .right-panel { display:flex; flex-direction:column; }
  .panel-scroll { min-height:0; overflow:auto; flex:1; overscroll-behavior:contain; }
  .panel-bar { flex:none; min-height:42px; display:flex; align-items:center; gap:8px; padding:4px; }
  .panel-rail-label { display:none; }
  .rail .panel-bar { height:100%; flex-direction:column; }
  .rail .panel-rail-label { display:block; writing-mode:vertical-rl; text-orientation:mixed; overflow:hidden; max-height:calc(100% - 48px); }
  .rail .panel-scroll { display:none; }
  .splitter { grid-row:1; cursor:col-resize; touch-action:none; background:#e3eaf1; }
  .splitter:focus-visible { outline:3px solid #ffdd00; background:#005ea5; z-index:2; }
  .panel-footer { display:none; }
  @media (max-width:1099px) {
    .workspace-shell { grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr) auto; }
    .workspace-shell .workspace-pane { display:none; grid-column:1; grid-row:1; border:0; width:auto; }
    .workspace-shell .workspace-pane.mobile-active { display:flex; }
    .workspace-shell .stage.mobile-active { display:block; overflow:auto; }
    .workspace-shell .splitter, .workspace-shell .panel-bar { display:none; }
    .workspace-shell .panel-scroll { display:block; }
    .workspace-shell .panel-footer { display:grid; grid-template-columns:1.5fr 1fr 1fr; grid-column:1; grid-row:2; gap:4px; padding:2px 4px max(2px,env(safe-area-inset-bottom)); background:white; border-top:1px solid #a9b7c7; }
    .panel-footer button { height:var(--explorer-control-height,36px); min-height:var(--explorer-control-height,36px); padding:3px 4px; gap:5px; font-size:.8rem; display:flex; flex-direction:row; white-space:nowrap; align-items:center; justify-content:center; }
    .panel-footer [aria-current] { background:#005ea5; color:white; }
    .workspace-shell .panel-footer.paired { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
  @media (min-width:600px) and (max-width:1099px) {
    .workspace-shell.showing-pair { grid-template-columns:minmax(240px,0.42fr) minmax(280px,0.58fr); }
    .workspace-shell.showing-pair .left-panel { display:flex; grid-column:1; }
    .workspace-shell.showing-pair .right-panel { display:flex; grid-column:2; border-left:1px solid #a9b7c7; }
    .workspace-shell .panel-footer { grid-column:1/-1; }
  }
</style>
