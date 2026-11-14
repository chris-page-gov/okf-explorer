<script lang="ts">
  import { onMount } from 'svelte';
  import { LIMITS, parseManifest, inspectCsv, type Manifest, type Inspection } from '$lib/analytical/preview';
  let ready = $state(false);
  onMount(() => { ready = true; });
  let manifest = $state<Manifest | null>(null);
  let selected = $state(0);
  let csv = $state<File | null>(null);
  let result = $state<Inspection | null>(null);
  let error = $state('');
  let busy = $state(false);
  let manifestInput = $state<HTMLInputElement>();
  let csvInput = $state<HTMLInputElement>();
  let generation = 0;
  const table = $derived(manifest?.tables[selected] ?? null);
  async function chooseManifest(file?: File) {
    const request = ++generation; manifest = null; result = null; csv = null; error = ''; busy = false; selected = 0;
    if (csvInput) csvInput.value = '';
    if (!file) return;
    try {
      if (file.size > LIMITS.manifestBytes) throw new Error('The manifest exceeds 256 KiB. Use the local validator.');
      const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
      const value = parseManifest(raw); if (request === generation) manifest = value;
    } catch (cause) { if (request === generation) error = cause instanceof Error ? cause.message : 'The manifest could not be read.'; }
  }
  function changeTable(value: string) { generation++; selected = Number(value); result = null; csv = null; error = ''; busy = false; if (csvInput) csvInput.value = ''; }
  function chooseCsv(file?: File) { generation++; csv = file ?? null; result = null; error = ''; busy = false; }
  function clear() { generation++; manifest = null; csv = null; result = null; error = ''; busy = false; if (manifestInput) manifestInput.value = ''; if (csvInput) csvInput.value = ''; }
  async function inspect() {
    if (!table || !csv) return;
    const request = ++generation, declaration = table, file = csv; busy = true; error = ''; result = null;
    try {
      if (file.name !== declaration.path.split('/').at(-1)) throw new Error('Choose the CSV named by the selected table declaration.');
      if (file.size > LIMITS.csvBytes) throw new Error('The CSV exceeds 8 MiB. Use the local validator.');
      const checked = await inspectCsv(declaration, new Uint8Array(await file.arrayBuffer()));
      if (request === generation) result = checked;
    } catch (cause) { if (request === generation) error = cause instanceof Error ? cause.message : 'The table could not be inspected.'; }
    finally { if (request === generation) busy = false; }
  }
  function stateLabel(value: string, index: number): string { const state = table?.fields[index].valueStates?.find(s => s.token === value); return state ? `${value || '(blank)'} · ${state.state}` : value; }
</script>

<svelte:head><title>Inspect a local data table · OKF Explorer</title></svelte:head>
<main>
  <nav aria-label="Table inspection navigation"><a href="../">Learning home</a> · <a href="../explore/">Open Explorer</a> · <a href="../profile/analytical-data/v2/">Candidate profile</a></nav>
  <h1>Inspect a local data table</h1>
  <p>Choose a package manifest and one declared CSV. File contents stay in this tab. This page uploads nothing, saves no file contents and registers no AI tools.</p>
  <p>This is a bounded, read-only preview. It checks the selected table's checksum, headers, declared values and keys, and supported datetime/spatial declarations. Use the local Python validator for full package/schema conformance. Other tables and additional profiles are not validated here.</p>
  <p>Limits: 256 KiB manifest, 8 MiB CSV, 5,000 data rows and 128 columns. The display shows at most 50 rows and 12 columns. Original values, including timestamps, are retained.</p>
  <section aria-labelledby="choose-title">
    <h2 id="choose-title">Choose local files</h2>
    <label for="manifest">Package manifest (okf-analytical-data.json)</label>
    <input id="manifest" disabled={!ready} type="file" accept=".json,application/json" bind:this={manifestInput} onchange={event => chooseManifest(event.currentTarget.files?.[0])} />
    {#if manifest}
      <label for="table">Declared table</label><select id="table" value={selected} onchange={event => changeTable(event.currentTarget.value)}>{#each manifest.tables as item, i}<option value={i}>{item.path}</option>{/each}</select>
      <label for="csv">CSV for the selected table</label><input id="csv" type="file" accept=".csv,text/csv" bind:this={csvInput} onchange={event => chooseCsv(event.currentTarget.files?.[0])} />
    {/if}
    <div class="actions"><button type="button" disabled={!manifest || !csv || busy} onclick={inspect}>Inspect selected table</button><button type="button" disabled={!ready} onclick={clear}>Clear files and preview</button></div>
    {#if busy}<p role="status">Checking the selected table…</p>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </section>
  {#if manifest && table}
    <section aria-labelledby="declaration-title">
      <h2 id="declaration-title">Declared context</h2>
      <p><strong>{manifest.dataset.title}</strong> · {manifest.dataset.scope} · dataset version {manifest.dataset.version}</p>
      <p>Profile {manifest.profileVersion}; rights status: <strong>{manifest.dataset.rights.status}</strong>. Declarations do not establish source truth, reuse permission or service acceptance.</p>
      <p>Source: <a href={table.source.url} rel="noopener noreferrer">{table.source.url}</a> · observed {table.source.observedAt}</p>
      <p>Observation key: {table.observationKey.join(', ')}.</p>
      {#if table.spatial}<p>Declared CRS: <a href={table.spatial.crs} rel="noopener noreferrer">{table.spatial.crs}</a>. Axis order: {table.spatial.axes.join(', ')}; unit: {table.spatial.unit}. Extent: {table.spatial.extent.join(', ')}.</p><p>Declared coverage note: {table.spatial.coverageNote}</p>{/if}
      <p>No reprojection, map, geographic completeness, lending action or referral is performed.</p>
    </section>
  {/if}
  {#if result && table}
    <section aria-labelledby="result-title">
      <h2 id="result-title">Preview checks passed</h2>
      <p role="status">{result.rowCount} data rows checked. {result.zeroes} true numeric measure zeroes; {result.missingCoordinatePairs} missing coordinate pairs. Full schema and analytical usefulness remain unassessed.</p>
      <ul>{#each Object.entries(result.stateCounts) as [state, count]}<li>{state}: {count}</li>{/each}{#each result.gaps as gap}<li class="gap">Gap: {gap}</li>{/each}</ul>
      <p>Showing {result.rows.length} of {result.rowCount} rows and {Math.min(table.fields.length, LIMITS.displayColumns)} of {table.fields.length} columns. Checks covered every row and column in the selected file within the preview limits.</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The named overflow region needs keyboard scrolling across supported engines.) -->
      <div class="table-wrap" tabindex="0" role="region" aria-label="Checked table preview"><table><caption>Original cell values; declared special states are labelled.</caption><thead><tr>{#each table.fields.slice(0, LIMITS.displayColumns) as field}<th scope="col">{field.label}<small>{field.name} · {field.dataType}{field.unit ? ` · ${field.unit}` : ''}</small></th>{/each}</tr></thead><tbody>{#each result.rows as row}<tr>{#each row as value, index}<td>{stateLabel(value, index)}</td>{/each}</tr>{/each}</tbody></table></div>
      <p class="digest">Verified CSV SHA-256: {result.sha256}</p>
    </section>
  {/if}
</main>
<style>
  :global(body) { margin: 0; background: #f7f8fa; color: #172331; font-family: system-ui, sans-serif; }
  main { max-width: 80rem; margin: auto; padding: 1.5rem; line-height: 1.6; }
  section { border: 1px solid #c5ced8; border-radius: .4rem; background: white; padding: 1.2rem; margin-block: 1.3rem; min-width: 0; }
  label { display: block; font-weight: 650; margin-block: 1rem .3rem; }
  input, select, button { font: inherit; max-width: 100%; box-sizing: border-box; }
  select { padding: .4rem; } button { padding: .5rem .8rem; cursor: pointer; }
  button:disabled { cursor: default; } a { color: #075293; overflow-wrap: anywhere; }
  .actions { display: flex; gap: .8rem; flex-wrap: wrap; margin-top: 1rem; }
  .error, .gap { border-left: .3rem solid #b3261e; padding-left: .7rem; }
  .table-wrap { overflow: auto; max-width: 100%; }
  table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #c5ced8; padding: .5rem; text-align: left; max-width: 28ch; overflow-wrap: anywhere; white-space: pre-wrap; }
  small { display: block; font-weight: 400; } caption { text-align: left; padding-bottom: .6rem; }
  .digest { overflow-wrap: anywhere; font-family: monospace; }
  :focus-visible { outline: 3px solid #111; box-shadow: 0 0 0 5px #ffdd00; }
  @media (max-width: 600px) { main { padding: .8rem; } section { padding: .8rem; } }
</style>
