<script lang="ts">
  import { readEesPair, displayValue, filterEesRows, EES_LIMITS, type EesPair } from '$lib/analytical/ees';
  let dataFile: File | null = $state(null);
  let metadataFile: File | null = $state(null);
  let pair: EesPair | null = $state(null);
  let error = $state(''); let busy = $state(false); let generation = 0;
  let formatted = $state(true); let filterName = $state(''); let filterValue = $state('');
  let fileIdentity = $state<{ data: string; metadata: string; data_sha256: string; metadata_sha256: string } | null>(null);
  const filtered = $derived(pair ? filterEesRows(pair, filterName, filterValue) : []);
  function filterOptions(value: EesPair | null, name: string): string[] {
    if (!value || !name) return [];
    const index = value.headers.indexOf(name);
    return [...new Set(value.rows.map(row => row[index]))].sort().slice(0, 500);
  }
  const options = $derived(filterOptions(pair, filterName));
  const digest = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  function clear() { generation++; pair = null; error = ''; fileIdentity = null; filterName = ''; filterValue = ''; busy = false; }
  function choose(event: Event, which: 'data' | 'metadata') {
    clear(); const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (which === 'data') dataFile = file; else metadataFile = file;
  }
  async function inspect(data: File, metadata: File) {
    clear(); const turn = generation; busy = true;
    try {
      if (!/\.csv$/i.test(data.name) || metadata.name !== data.name.replace(/\.csv$/i, '.meta.csv')) throw new Error('Choose the matching filenames: name.csv and name.meta.csv. Confirm both come from the same source and release.');
      if (data.size > EES_LIMITS.bytes || metadata.size > EES_LIMITS.bytes) throw new Error('Choose CSV files no larger than 8 MiB each.');
      const [dataBytes, metaBytes] = await Promise.all([data.arrayBuffer(), metadata.arrayBuffer()]);
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const parsed = readEesPair(decoder.decode(dataBytes), decoder.decode(metaBytes));
      const [dataHash, metadataHash] = await Promise.all([digest(dataBytes), digest(metaBytes)]);
      if (turn !== generation) return;
      pair = parsed; fileIdentity = { data: data.name, metadata: metadata.name, data_sha256: dataHash, metadata_sha256: metadataHash };
    } catch (e) { if (turn === generation) error = e instanceof Error ? e.message : 'The CSV pair could not be read.'; }
    finally { if (turn === generation) busy = false; }
  }
  async function example() {
    clear(); const turn = generation; busy = true;
    try {
      const names = ['ees_demo_datafile.csv', 'ees_demo_datafile.meta.csv'];
      const bodies = await Promise.all(names.map(async name => {
        const response = await fetch(new URL('../examples/dfe-ees/' + name, window.location.href));
        if (!response.ok) throw new Error('The bundled DfE example is unavailable.');
        return new File([await response.arrayBuffer()], name, { type: 'text/csv' });
      }));
      if (turn !== generation) return;
      dataFile = bodies[0]; metadataFile = bodies[1]; await inspect(bodies[0], bodies[1]);
    } catch (e) { if (turn === generation) { error = e instanceof Error ? e.message : 'Example unavailable.'; busy = false; } }
  }
  function downloadReport() {
    if (!pair || !fileIdentity) return;
    const value = { schema: 'okf-dfe-ees-inspection.v1', files: fileIdentity, rows: pair.rows.length, fields: pair.fields,
      metadata: pair.metadata, geography_header: pair.geographyHeader, warnings: pair.warnings,
      scope: 'Local DfE CSV and sidecar inspection; original source values are preserved. No publisher conformance or rights decision.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ees-inspection.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<svelte:head><title>Inspect DfE CSV data and metadata | OKF Explorer</title></svelte:head>

<main>
  <nav aria-label="Data navigation"><a href="../">Learning hub</a> · <a href="../explore/">Knowledge Explorer</a> · <a href="../docs/dfe-ees-reader.html">DfE data guide</a></nav>
  <h1>Inspect DfE CSV data and metadata</h1>
  <p>Open an Explore Education Statistics data CSV with its matching <code>.meta.csv</code> file. Inspect column labels, filters, units, display precision and special values.</p>
  <p>Your selected files are read in this browser and are not uploaded. Limits: 8 MiB per file, 100,000 rows, 256 columns and 500,000 cells.</p>
  <section aria-labelledby="select-heading">
    <h2 id="select-heading">Choose the CSV pair</h2>
    <label>Data CSV <input type="file" accept=".csv,text/csv" onchange={e => choose(e, 'data')} /></label>
    <label>Metadata CSV (.meta.csv) <input type="file" accept=".csv,text/csv" onchange={e => choose(e, 'metadata')} /></label>
    <div class="actions">
      <button disabled={!dataFile || !metadataFile || busy} onclick={() => dataFile && metadataFile && inspect(dataFile, metadataFile)}>Inspect selected files</button>
      <button disabled={busy} onclick={example}>Try the DfE example</button>
      <button onclick={clear}>Clear inspection</button>
    </div>
    <p aria-live="polite">{busy ? 'Reading the CSV pair…' : pair ? `${pair.rows.length} observations and ${pair.metadata.length} exact metadata joins.` : 'Choose both files or try the bundled example.'}</p>
    {#if error}<p role="alert">{error}</p>{/if}
  </section>
  {#if pair}
    <section aria-labelledby="preview-heading">
      <h2 id="preview-heading">Data preview</h2>
      <label><input type="checkbox" bind:checked={formatted} /> Apply sidecar display formatting</label>
      <p>Original values remain unchanged. For example, numeric zero differs from <code>c</code> (suppressed), <code>x</code> (unavailable) and <code>low</code> or <code>k</code> (rounded to zero). Turn formatting off to see exact source values.</p>
      <label>Filter column <select bind:value={filterName} onchange={() => { filterValue = ''; }}><option value="">All rows</option>{#each pair.fields.filter(f => f.role === 'Filter' || f.role === 'Observation') as field}<option value={field.name}>{field.label} ({field.name})</option>{/each}</select></label>
      {#if filterName}<label>Exact filter value <select bind:value={filterValue}><option value="">Empty value</option>{#each options.filter(v => v !== '') as value}<option {value}>{value}</option>{/each}</select></label><p>Up to 500 distinct choices are listed. Matching uses the exact source value.</p>{/if}
      <p>{filtered.length} matching observations. Showing the first {Math.min(100, filtered.length)}.</p>
      <!-- The bounded scroll region needs keyboard focus for horizontal table navigation. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="scroll" tabindex="0" role="region" aria-label="Data table">
        <table><caption>Selected EES observations</caption><thead><tr>{#each pair.fields as field}<th scope="col">{field.label}<small>{field.name}{field.unit ? ` · ${field.unit}` : ''}</small></th>{/each}</tr></thead>
          <tbody>{#each filtered.slice(0, 100) as row}<tr>{#each pair.fields as field, i}<td title={`Source value: ${row[i]}`}>{displayValue(row[i], field, formatted)}</td>{/each}</tr>{/each}</tbody></table>
      </div>
      <h2>Field definitions</h2>
      <ul>{#each pair.fields as field}<li><strong>{field.label}</strong> (<code>{field.name}</code>): {field.role}{field.hint ? ` — ${field.hint}` : ''}{field.indicatorGroup ? ` · Indicator group: ${field.indicatorGroup}` : ''}{field.filterGroupingColumn ? ` · Filter grouping column: ${field.filterGroupingColumn}` : ''}</li>{/each}</ul>
      <h2>Scope and provenance</h2>
      <ul>{#each pair.warnings as warning}<li>{warning}</li>{/each}</ul>
      {#if fileIdentity}<p>Data SHA-256: <code>{fileIdentity.data_sha256}</code><br />Metadata SHA-256: <code>{fileIdentity.metadata_sha256}</code></p>{/if}
      <button onclick={downloadReport}>Download inspection report</button>
    </section>
  {/if}
  <p>The example is from the <a href="https://dfe-analytical-services.github.io/analysts-guide/statistics-production/ud.html">DfE Open Data Standards guide</a>. This Reader preserves the publisher’s column names, including the documented geography spelling difference. It does not replace the DfE screener.</p>
</main>

<style>
  :global(body) { margin: 0; font-family: system-ui, sans-serif; color: #182635; background: #f5f7fa; }
  main { max-width: 78rem; margin: auto; padding: 2rem; } h1 { font-size: clamp(1.7rem, 4vw, 2.5rem); }
  section { background: white; padding: 1.5rem; margin: 1.5rem 0; border: 1px solid #bac7d3; border-radius: .4rem; }
  label { display: block; margin: .8rem 0; } input, select, button { font: inherit; max-width: 100%; }
  button { padding: .6rem 1rem; margin: .3rem; cursor: pointer; } .actions { display: flex; flex-wrap: wrap; }
  .scroll { overflow: auto; max-height: 32rem; } table { border-collapse: collapse; white-space: nowrap; } th, td { padding: .5rem .8rem; border: 1px solid #c8d1da; text-align: left; }
  th { background: #edf3fa; } small { display: block; font-weight: normal; } code { overflow-wrap: anywhere; } [role=alert] { color: #a01818; font-weight: bold; }
  :global(:focus-visible) { outline: 3px solid #c86a00; outline-offset: 3px; }
  @media (max-width: 600px) { main { padding: .8rem; } section { padding: 1rem; } }
</style>
