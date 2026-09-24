<script lang="ts">
  import type { ViewCell, ViewPayload } from './toolTypes';
  import { isHttpUrl } from '$lib/viewer/helpers';

  let { payload, onRecord }: { payload: ViewPayload; onRecord: (ref: string) => void } = $props();

  const MAX_NODES = 24;
  const MAX_EDGES = 48;
  const MAX_FIELDS = 24;
  const MAX_ROWS = 100;
  const MAX_PROVENANCE = 100;
  const MAX_LIMITATIONS = 100;
  const WIDTH = 920;
  const NODE_WIDTH = 174;
  const NODE_HEIGHT = 48;
  const COLUMN_GAP = 48;
  const ROW_GAP = 68;

  const titles: Record<ViewPayload['kind'], string> = {
    graph: 'Concept map', interactions: 'Interactions', requirements: 'Evidence requirements',
    rates: 'Rates and readiness', calculation: 'Calculation readiness'
  };
  const fields = $derived(payload.fields.slice(0, MAX_FIELDS));
  const rows = $derived(payload.rows.slice(0, MAX_ROWS));
  const provenance = $derived(payload.provenance.slice(0, MAX_PROVENANCE));
  const limitations = $derived(payload.limitations.slice(0, MAX_LIMITATIONS));
  const graph = $derived(graphLayout(payload.nodes ?? [], payload.edges ?? []));
  const recordRefs = $derived(new Set([
    ...provenance.map(item => item.ref), ...graph.nodes.map(item => item.ref),
    ...graph.edges.map(item => item.ref)
  ]));
  const hasClippedData = $derived(
    payload.fields.length > MAX_FIELDS || payload.rows.length > MAX_ROWS ||
    (payload.nodes?.length ?? 0) > MAX_NODES || (payload.edges?.length ?? 0) > MAX_EDGES ||
    payload.provenance.length > MAX_PROVENANCE || payload.limitations.length > MAX_LIMITATIONS || graph.skippedEdges > 0
  );

  function known(value: string | null | undefined): string {
    return value?.trim() ? value : 'Unknown';
  }

  function display(value: ViewCell | undefined): string {
    if (value === null || value === undefined || value === '') return 'Unknown';
    if (Array.isArray(value)) return value.length ? value.join('; ') : 'Unknown';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('en-GB') : 'Unknown';
    return value;
  }

  function sourceUrl(value: string): string | null {
    if (!isHttpUrl(value)) return null;
    return new URL(value).protocol === 'https:' ? value : null;
  }

  function isRecordCell(key: string, value: ViewCell | undefined): value is string {
    return typeof value === 'string' && value.length > 0 &&
      (recordRefs.has(value) || key === 'ref' || key === 'record_id' || key.endsWith('_ref'));
  }

  function rowReferences(row: Record<string, ViewCell>): string[] {
    if (Array.isArray(row.references)) return row.references.filter((value): value is string => typeof value === 'string' && value.length > 0).slice(0, 24);
    return typeof row.ref === 'string' && row.ref ? [row.ref] : [];
  }

  type GraphNode = { ref: string; label: string; status: string; x: number; y: number };
  type GraphEdge = { ref: string; source: string; target: string; label: string; status: string; path: string };
  function graphLayout(
    inputNodes: NonNullable<ViewPayload['nodes']>, inputEdges: NonNullable<ViewPayload['edges']>
  ): { nodes: GraphNode[]; edges: GraphEdge[]; height: number; skippedEdges: number } {
    const nodes = inputNodes.slice(0, MAX_NODES).map((node, index) => ({
      ...node, x: 22 + (index % 4) * (NODE_WIDTH + COLUMN_GAP),
      y: 28 + Math.floor(index / 4) * (NODE_HEIGHT + ROW_GAP)
    }));
    const positions = new Map(nodes.map(node => [node.ref, node]));
    let skippedEdges = 0;
    const edges: GraphEdge[] = [];
    for (const edge of inputEdges.slice(0, MAX_EDGES)) {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) { skippedEdges++; continue; }
      let path: string;
      if (source.ref === target.ref) {
        path = `M ${source.x + NODE_WIDTH - 18} ${source.y} C ${source.x + NODE_WIDTH + 34} ${source.y - 42}, ${source.x + NODE_WIDTH + 42} ${source.y + 48}, ${source.x + NODE_WIDTH - 8} ${source.y + 26}`;
      } else if (source.x === target.x) {
        const down = source.y < target.y;
        path = `M ${source.x + NODE_WIDTH / 2} ${source.y + (down ? NODE_HEIGHT : 0)} L ${target.x + NODE_WIDTH / 2} ${target.y + (down ? 0 : NODE_HEIGHT)}`;
      } else {
        const right = source.x < target.x;
        path = `M ${source.x + (right ? NODE_WIDTH : 0)} ${source.y + NODE_HEIGHT / 2} L ${target.x + (right ? 0 : NODE_WIDTH)} ${target.y + NODE_HEIGHT / 2}`;
      }
      edges.push({ ...edge, path });
    }
    return { nodes, edges, height: Math.max(120, 28 + Math.ceil(nodes.length / 4) * (NODE_HEIGHT + ROW_GAP)), skippedEdges };
  }
</script>

<section class="workbench-data-view" aria-labelledby="data-view-title">
  <header>
    <p class="eyebrow">{titles[payload.kind]}</p>
    <h3 id="data-view-title">{payload.title}</h3>
    {#if payload.kind === 'rates'}<p>Unknown rates and readiness values are not zero.</p>{/if}
    {#if payload.kind === 'calculation'}<p>This shows proposed inputs and stages for review. It does not calculate an award or decide entitlement.</p>{/if}
    {#if payload.kind === 'graph'}<p>Arrows show the declared direction of a connection. The tables give the same nodes and connections in reading order.</p>{/if}
  </header>

  <dl class="context-facts">
    <div><dt>Authority</dt><dd>{payload.authority === 'authored-unreviewed-proposal' ? 'Authored proposal, not reviewed' : 'Retained evidence projection'}</dd></div>
    <div><dt>Assessment date</dt><dd>{known(payload.time_basis.assessment_date)}</dd></div>
    <div><dt>Effective from</dt><dd>{known(payload.time_basis.effective_from)}</dd></div>
    <div><dt>Effective to</dt><dd>{known(payload.time_basis.effective_to)}</dd></div>
  </dl>
  {#if payload.coverage}
    <p class:partial={!payload.coverage.complete} role="status">Showing rows {payload.coverage.delivered_rows ? payload.coverage.offset + 1 : 0}–{payload.coverage.offset + payload.coverage.delivered_rows} of {payload.coverage.total_rows}. {payload.coverage.complete ? 'This view page is complete.' : 'This is a partial page; further rows are available.'}</p>
  {/if}
  <section aria-label="Limitations" class="limitations">
    <h4>Limitations</h4>
    {#if limitations.length}<ul>{#each limitations as item}<li>{item}</li>{/each}</ul>
    {:else}<p>No limitation statement was supplied.</p>{/if}
  </section>
  {#if hasClippedData}<p class="partial" role="status">This display is limited. Some supplied rows, connections or notes are not shown here.</p>{/if}

  {#if payload.kind === 'graph'}
    <section aria-labelledby="graph-title">
      <h4 id="graph-title">Directed graph</h4>
      {#if graph.nodes.length}
        <!-- Keyboard focus allows horizontal scrolling in Safari. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="graph-scroll" tabindex="0" role="region" aria-label="Scrollable directed graph">
          <svg viewBox={`0 0 ${WIDTH} ${graph.height}`} role="img" aria-label={`Directed graph with ${graph.nodes.length} nodes and ${graph.edges.length} displayed connections. The following tables contain the same information.`}>
            <defs><marker id="workbench-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="arrowhead" /></marker></defs>
            {#each graph.edges as edge}
              <path d={edge.path} class="edge" marker-end="url(#workbench-arrowhead)"><title>{edge.label}: {edge.source} to {edge.target}. {edge.status}</title></path>
            {/each}
            {#each graph.nodes as node}
              <g><title>{node.label}. {node.status}</title><rect x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEIGHT} rx="5" class="node" /><text x={node.x + 8} y={node.y + 29}>{node.label.length > 24 ? `${node.label.slice(0, 21)}…` : node.label}</text></g>
            {/each}
          </svg>
        </div>
      {:else}<p>No graph nodes were supplied.</p>{/if}
      <h5>Nodes</h5>
      <!-- Keyboard focus allows horizontal scrolling in Safari. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable graph nodes"><table><thead><tr><th scope="col">Record</th><th scope="col">Status</th></tr></thead><tbody>
        {#each graph.nodes as node}<tr><th scope="row"><button type="button" onclick={() => onRecord(node.ref)}>{node.label}</button></th><td>{known(node.status)}</td></tr>
        {:else}<tr><td colspan="2">No nodes were supplied.</td></tr>{/each}
      </tbody></table></div>
      <h5>Connections</h5>
      <!-- Keyboard focus allows horizontal scrolling in Safari. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable graph connections"><table><thead><tr><th scope="col">From</th><th scope="col">Connection</th><th scope="col">To</th><th scope="col">Status</th></tr></thead><tbody>
        {#each graph.edges as edge}<tr><td><button type="button" onclick={() => onRecord(edge.source)}>{graph.nodes.find(node => node.ref === edge.source)?.label ?? edge.source}</button></td><th scope="row">{edge.label}</th><td><button type="button" onclick={() => onRecord(edge.target)}>{graph.nodes.find(node => node.ref === edge.target)?.label ?? edge.target}</button></td><td>{known(edge.status)}</td></tr>
        {:else}<tr><td colspan="4">No connections were supplied.</td></tr>{/each}
      </tbody></table></div>
    </section>
  {/if}

  <section aria-labelledby="rows-title">
    <h4 id="rows-title">{payload.kind === 'graph' ? 'Graph records' : titles[payload.kind]}</h4>
    {#if fields.length}
      <!-- Keyboard focus allows horizontal scrolling in Safari. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable view records"><table><thead><tr>{#each fields as field}<th scope="col">{field.label}{#if field.unit} ({field.unit}){/if}</th>{/each}<th scope="col">Evidence sources</th></tr></thead><tbody>
        {#each rows as row}<tr>{#each fields as field}<td>{#if isRecordCell(field.key, row[field.key])}<button type="button" onclick={() => onRecord(String(row[field.key]))}>{display(row[field.key])}</button>{:else}{display(row[field.key])}{/if}</td>{/each}<td>{#each rowReferences(row) as ref, index}<button type="button" onclick={() => onRecord(ref)}>Inspect source {index + 1}</button>{:else}Not supplied{/each}</td></tr>
        {:else}<tr><td colspan={fields.length + 1}>No entries were supplied. Unknown values are not zero.</td></tr>{/each}
      </tbody></table></div>
    {:else}<p>No table fields were supplied.</p>{/if}
  </section>

  <section aria-labelledby="provenance-title">
    <h4 id="provenance-title">Source references</h4>
    {#if provenance.length}<ul>{#each provenance as item}<li>
      <button type="button" onclick={() => onRecord(item.ref)}>Inspect {known(item.locator)}</button>
      {#if sourceUrl(item.url)} · <a href={sourceUrl(item.url) ?? undefined} target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Open cited source ↗</a>{:else} · Source link unavailable{/if}
      <span class="source-date"> · Source date: {known(item.source_date)}</span>
    </li>{/each}</ul>
    {:else}<p>No source references were supplied.</p>{/if}
  </section>
</section>

<style>
  .workbench-data-view { min-width: 0; overflow-wrap: anywhere; }
  h3, h4, h5 { line-height: 1.25; }
  h3 { margin: .2rem 0 .7rem; }
  h4 { margin: 1.4rem 0 .5rem; }
  h5 { margin: 1rem 0 .4rem; }
  .eyebrow { color: #425669; font-size: .8rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  .context-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; margin: 1rem 0; }
  .context-facts div { border: 1px solid #c4d0db; padding: .65rem; background: #f4f7fa; min-width: 0; }
  dt { font-weight: 700; } dd { margin: .2rem 0 0; overflow-wrap: anywhere; }
  .limitations { border-left: 4px solid #6a7e91; padding: .1rem .8rem; background: #f4f7fa; }
  .limitations h4 { margin-top: .6rem; }
  .partial { border-left: 4px solid #a45b00; padding: .7rem; background: #fff8e7; }
  .graph-scroll, .table-scroll { max-width: 100%; overflow-x: auto; }
  svg { display: block; width: 100%; min-width: 46rem; height: auto; background: #f8fafb; border: 1px solid #c4d0db; }
  .node { fill: #eaf4ff; stroke: #075aa6; stroke-width: 1.5; }
  .edge { fill: none; stroke: #335c79; stroke-width: 1.8; }
  .arrowhead { fill: #335c79; }
  svg text { fill: #17212e; font: 14px system-ui, sans-serif; }
  table { border-collapse: collapse; width: 100%; min-width: 34rem; }
  th, td { border: 1px solid #b9c9d6; padding: .55rem; text-align: left; vertical-align: top; }
  thead th { background: #e7f0f7; }
  tbody tr:nth-child(even) { background: #f7f9fb; }
  button { color: #075aa6; border: 0; background: none; padding: 0; font: inherit; text-decoration: underline; text-align: left; cursor: pointer; }
  button:focus-visible, a:focus-visible { outline: 3px solid #ffdd00; outline-offset: 2px; }
  a { color: #075aa6; }
  li { margin-bottom: .5rem; }
  @media (max-width: 650px) { .context-facts { grid-template-columns: 1fr; } }
</style>
