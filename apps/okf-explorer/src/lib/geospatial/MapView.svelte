<script lang="ts">
  import {
    GEOSPATIAL_SIGNAL_LABELS,
    geospatialFilterLabel,
    geospatialFilterMatches,
    matchUkPlaces,
    type GeospatialRecord,
    type GeospatialResource,
    type GeospatialSignalKind
  } from './geospatial';
  import {
    buildPreviewDrawing,
    loadGeospatialPreview,
    previewPath,
    type GeospatialPreview,
    type PreviewDrawing
  } from './preview';

  interface Props {
    records: GeospatialRecord[];
    filter: string;
    selectedRoute: string;
    loading?: boolean;
    onselect: (route: string) => void;
    onfilter: (filter: string) => void;
  }

  type CountRow = { id: string; label: string; count: number };
  type MarkerGroup = {
    key: string;
    x: number;
    y: number;
    explicit: boolean;
    records: GeospatialRecord[];
  };

  let { records, filter, selectedRoute, loading = false, onselect, onfilter }: Props = $props();
  let preview = $state<GeospatialPreview | null>(null);
  let previewDrawing = $state<PreviewDrawing | null>(null);
  let previewLoading = $state(false);
  let previewError = $state('');
  let previewResource = $state<GeospatialResource | null>(null);

  const visibleRecords = $derived(records.filter((record) => geospatialFilterMatches(record, filter)));
  const selectedRecord = $derived(records.find((record) => record.route === selectedRoute) || visibleRecords[0]);
  const signalCounts = $derived.by(() => countSignals(records));
  const placeCounts = $derived.by(() => countPlaces(records));
  const coverageCounts = $derived.by(() => countCoverage(records));
  const markers = $derived.by(() => markerGroups(visibleRecords));
  const unlocatedCount = $derived(visibleRecords.filter((record) => !record.point).length);

  const MAP_WIDTH = 620;
  const MAP_HEIGHT = 720;
  const UK_BOUNDS = { west: -9.2, east: 2.4, south: 49.7, north: 60.9 };
  const GREAT_BRITAIN = [
    [-5.8, 50.0], [-4.2, 50.1], [-3.2, 50.3], [-1.5, 50.6], [0.9, 50.8], [1.7, 51.3], [1.3, 52.1], [0.4, 52.8],
    [0.1, 53.7], [-0.5, 54.5], [-1.1, 55.0], [-2.0, 55.8], [-1.8, 57.0], [-2.3, 58.5], [-3.2, 58.7], [-4.5, 58.5],
    [-5.4, 57.9], [-5.8, 56.9], [-5.1, 55.8], [-4.9, 54.8], [-4.1, 54.4], [-3.1, 54.0], [-3.0, 53.3], [-4.1, 52.9],
    [-4.8, 52.0], [-5.2, 51.6], [-5.8, 50.8], [-5.8, 50.0]
  ];
  const NORTHERN_IRELAND = [
    [-8.2, 54.1], [-7.2, 54.0], [-6.0, 54.1], [-5.4, 54.6], [-5.6, 55.2], [-6.6, 55.4], [-7.5, 55.2], [-8.2, 54.7], [-8.2, 54.1]
  ];

  function countSignals(values: GeospatialRecord[]): CountRow[] {
    const counts = new Map<GeospatialSignalKind, number>();
    for (const record of values) {
      for (const kind of new Set(record.signals.map((signal) => signal.kind))) counts.set(kind, (counts.get(kind) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: GEOSPATIAL_SIGNAL_LABELS[id], count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }

  function countPlaces(values: GeospatialRecord[]): CountRow[] {
    const counts = new Map<string, CountRow>();
    for (const record of values) {
      for (const place of record.places) {
        const row = counts.get(place.id) || { id: place.id, label: place.label, count: 0 };
        row.count += 1;
        counts.set(place.id, row);
      }
    }
    return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }

  function countCoverage(values: GeospatialRecord[]): CountRow[] {
    const counts = new Map<string, CountRow>();
    for (const record of values) {
      for (const label of record.coverage) {
        if (matchUkPlaces([label], 'declared').length) continue;
        const id = encodeURIComponent(label);
        const row = counts.get(id) || { id, label, count: 0 };
        row.count += 1;
        counts.set(id, row);
      }
    }
    return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }

  function mapPoint(longitude: number, latitude: number) {
    return {
      x: ((longitude - UK_BOUNDS.west) / (UK_BOUNDS.east - UK_BOUNDS.west)) * MAP_WIDTH,
      y: ((UK_BOUNDS.north - latitude) / (UK_BOUNDS.north - UK_BOUNDS.south)) * MAP_HEIGHT
    };
  }

  function locatorPath(points: number[][]): string {
    return points.map(([longitude, latitude], index) => {
      const point = mapPoint(longitude, latitude);
      return `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }

  function markerGroups(values: GeospatialRecord[]): MarkerGroup[] {
    const groups = new Map<string, MarkerGroup>();
    for (const record of values) {
      if (!record.point) continue;
      const point = mapPoint(record.point.longitude, record.point.latitude);
      const key = `${Math.round(point.x / 8)}:${Math.round(point.y / 8)}:${record.point.precision}`;
      const group = groups.get(key) || { key, x: point.x, y: point.y, explicit: record.point.precision === 'explicit', records: [] };
      group.records.push(record);
      groups.set(key, group);
    }
    return [...groups.values()].sort((left, right) => right.records.length - left.records.length || left.key.localeCompare(right.key));
  }

  function markerLabel(marker: MarkerGroup): string {
    if (marker.records.length === 1) return marker.records[0].title;
    const place = marker.records.flatMap((record) => record.places)[0]?.label;
    return `${marker.records.length.toLocaleString()} records${place ? ` near ${place}` : ''}`;
  }

  function activateFilter(value: string) {
    onfilter(filter === value ? '' : value);
  }

  function chooseRecord(record: GeospatialRecord) {
    preview = null;
    previewDrawing = null;
    previewError = '';
    previewResource = null;
    onselect(record.route);
  }

  function keyboardActivate(event: KeyboardEvent, action: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  async function showPreview(resource: GeospatialResource) {
    previewLoading = true;
    previewError = '';
    preview = null;
    previewDrawing = null;
    previewResource = resource;
    try {
      const result = await loadGeospatialPreview(resource);
      preview = result;
      previewDrawing = buildPreviewDrawing(result);
    } catch (error) {
      previewError = error instanceof Error ? error.message : String(error);
    } finally {
      previewLoading = false;
    }
  }

  function formatBytes(value: number): string {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
    return `${(value / 1024 / 1024).toFixed(1)} MiB`;
  }
</script>

<section class="map-view" aria-labelledby="map-view-title">
  <header class="map-heading">
    <div>
      <p class="eyebrow">Deterministic spatial discovery</p>
      <h2 id="map-view-title">Map &amp; geography</h2>
      <p>
        {records.length.toLocaleString()} records in the current search/facet context have spatial evidence.
        {#if filter}<strong>{visibleRecords.length.toLocaleString()}</strong> match {geospatialFilterLabel(filter)}.{/if}
      </p>
    </div>
    {#if filter}<button type="button" onclick={() => onfilter('')}>Clear map reduction</button>{/if}
  </header>

  {#if loading && !records.length}
    <div class="map-empty" role="status">Loading the record and resource index for deterministic spatial classification…</div>
  {:else if !records.length}
    <div class="map-empty">
      <h3>No spatial evidence in this context</h3>
      <p>Clear or widen the current search/facet reduction, or add explicit coverage, geometry, geospatial formats or service links to the pack.</p>
    </div>
  {:else}
    <div class="map-filter-grid" aria-label="Map reductions">
      <section>
        <h3>Evidence</h3>
        <div class="map-chips">
          {#each signalCounts as row}
            <button class:active={filter === `signal:${row.id}`} type="button" onclick={() => activateFilter(`signal:${row.id}`)}>
              {row.label}<span>{row.count.toLocaleString()}</span>
            </button>
          {/each}
        </div>
      </section>
      {#if placeCounts.length}
        <section>
          <h3>Recognised UK coverage</h3>
          <div class="map-chips">
            {#each placeCounts.slice(0, 15) as row}
              <button class:active={filter === `area:${row.id}`} type="button" onclick={() => activateFilter(`area:${row.id}`)}>
                {row.label}<span>{row.count.toLocaleString()}</span>
              </button>
            {/each}
          </div>
        </section>
      {/if}
      {#if coverageCounts.length}
        <section>
          <h3>Other declared coverage</h3>
          <div class="map-chips">
            {#each coverageCounts.slice(0, 8) as row}
              <button class:active={filter === `coverage:${row.id}`} type="button" onclick={() => activateFilter(`coverage:${row.id}`)} title={row.label}>
                {row.label}<span>{row.count.toLocaleString()}</span>
              </button>
            {/each}
          </div>
        </section>
      {/if}
    </div>

    <div class="map-workspace">
      <section class="locator-card">
        <div class="locator-note">
          <strong>Schematic UK locator</strong>
          <span>Solid markers are source coordinates; rings are representative centroids, not boundaries.</span>
        </div>
        <svg class="locator-map" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label="Schematic UK locator with spatial record markers">
          <path class="locator-land" d={locatorPath(GREAT_BRITAIN)}></path>
          <path class="locator-land" d={locatorPath(NORTHERN_IRELAND)}></path>
          <g class="locator-grid" aria-hidden="true">
            {#each [52, 54, 56, 58] as latitude}
              {@const start = mapPoint(UK_BOUNDS.west, latitude)}
              {@const end = mapPoint(UK_BOUNDS.east, latitude)}
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y}></line>
            {/each}
          </g>
          {#each markers as marker, index}
            <g
              class="locator-marker"
              class:representative={!marker.explicit}
              class:selected={marker.records.some((record) => record.route === selectedRoute)}
              data-route={marker.records[0].route}
              role="button"
              tabindex="0"
              aria-label={markerLabel(marker)}
              onclick={() => chooseRecord(marker.records[0])}
              onkeydown={(event) => keyboardActivate(event, () => chooseRecord(marker.records[0]))}
            >
              <circle cx={marker.x} cy={marker.y} r={marker.records.length > 1 ? Math.min(20, 8 + Math.log2(marker.records.length) * 2.2) : 7}></circle>
              {#if marker.records.length > 1}<text x={marker.x} y={marker.y + 4}>{marker.records.length > 999 ? '999+' : marker.records.length}</text>{/if}
              {#if index < 12}<title>{markerLabel(marker)}</title>{/if}
            </g>
          {/each}
        </svg>
        <p class="locator-summary">
          {markers.reduce((total, marker) => total + marker.records.length, 0).toLocaleString()} located records in {markers.length.toLocaleString()} marker groups.
          {#if unlocatedCount}{unlocatedCount.toLocaleString()} spatial records have no locatable coordinate or recognised UK area and remain in the list.{/if}
        </p>
      </section>

      <section class="map-results" aria-label="Spatial records">
        <div class="map-results-heading">
          <h3>Spatial records</h3><span>{visibleRecords.length.toLocaleString()} in this map reduction</span>
        </div>
        <div class="map-record-list">
          {#each visibleRecords.slice(0, 160) as record}
            <button class:active={record.route === selectedRoute} type="button" onclick={() => chooseRecord(record)}>
              <strong>{record.title}</strong>
              <span>{record.publisher || 'Publisher not specified'}</span>
              <small>{record.signals.map((signal) => signal.label).join(' · ')}</small>
            </button>
          {/each}
        </div>
        {#if visibleRecords.length > 160}<p>Showing the first 160 records; use another map reduction to narrow the set.</p>{/if}
      </section>
    </div>

    {#if selectedRecord}
      <section class="map-evidence" aria-label="Selected spatial evidence">
        <header>
          <div><p class="eyebrow">Selected spatial evidence</p><h3>{selectedRecord.title}</h3></div>
          <button type="button" onclick={() => onselect(selectedRecord.route)}>Inspect full record</button>
        </header>
        <div class="map-evidence-grid">
          <div>
            <h4>Why Explorer classified this record</h4>
            <ul>
              {#each selectedRecord.signals as signal}
                <li><strong>{signal.label}</strong><span>{signal.detail}</span><small>{signal.source}</small></li>
              {/each}
            </ul>
            {#if selectedRecord.point?.precision === 'representative'}
              <p class="map-caveat">The locator marker is a representative centroid for navigation. The source did not supply a boundary or exact coordinate.</p>
            {/if}
          </div>
          <div>
            <h4>External spatial data</h4>
            {#each selectedRecord.resources as resource}
              <article class="map-resource">
                <div><strong>{resource.label}</strong><span>{resource.kind.toUpperCase()}{resource.format ? ` · ${resource.format}` : ''}</span></div>
                <div class="map-resource-actions">
                  {#if resource.previewable}<button type="button" disabled={previewLoading} onclick={() => void showPreview(resource)}>{previewLoading && previewResource?.url === resource.url ? 'Loading…' : 'Preview on demand'}</button>{/if}
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">Open source ↗</a>
                </div>
              </article>
            {:else}
              <p>No machine-readable spatial resource URL was supplied. The record remains discoverable from its coverage/text evidence.</p>
            {/each}
          </div>
        </div>
      </section>
    {/if}

    {#if previewLoading || previewError || previewDrawing}
      <section class="geo-preview" aria-label="On-demand spatial preview">
        <header>
          <div><p class="eyebrow">External data loaded on demand</p><h3>{previewResource?.label || 'Spatial preview'}</h3></div>
          {#if previewResource}<a href={previewResource.url} target="_blank" rel="noopener noreferrer">Open source ↗</a>{/if}
        </header>
        {#if previewLoading}
          <div class="map-empty" role="status">Discovering a bounded feature preview…</div>
        {:else if previewError}
          <div class="preview-error" role="alert">
            <strong>Preview unavailable</strong><p>{previewError}</p>
            <p>The source may block browser requests, require a layer choice, use an unsupported format, or exceed Explorer’s 10 MiB response limit. The source link remains available.</p>
          </div>
        {:else if previewDrawing && preview}
          <svg class="preview-map" viewBox="0 0 640 420" role="img" aria-label={`Preview of ${preview.features.length} external spatial features`}>
            {#each previewDrawing.shapes as shape}
              {#if shape.kind === 'point'}
                <circle cx={shape.points[0].x} cy={shape.points[0].y} r="4"></circle>
              {:else}
                <path class:polygon={shape.kind === 'polygon'} d={previewPath(shape)}></path>
              {/if}
            {/each}
          </svg>
          <dl class="preview-meta">
            <div><dt>Features shown</dt><dd>{preview.features.length.toLocaleString()}{preview.truncated ? ' (capped)' : ''}</dd></div>
            <div><dt>Coordinates drawn</dt><dd>{previewDrawing.coordinateCount.toLocaleString()}{previewDrawing.truncated ? ' (capped)' : ''}</dd></div>
            <div><dt>Response</dt><dd>{formatBytes(preview.bytes)}</dd></div>
            <div><dt>Retrieved</dt><dd>{new Date(preview.retrievedAt).toLocaleString()}</dd></div>
            {#if preview.layer}<div><dt>Layer</dt><dd>{preview.layer}</dd></div>{/if}
            <div><dt>WGS84 bounds</dt><dd>{previewDrawing.bounds.map((value) => value.toFixed(4)).join(', ')}</dd></div>
          </dl>
        {/if}
      </section>
    {/if}
  {/if}
</section>

<style>
  .map-view { padding: 18px; display: grid; gap: 18px; color: #16324a; }
  .map-heading, .map-evidence > header, .geo-preview > header, .map-results-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .map-heading h2, .map-evidence h3, .geo-preview h3, .map-results h3 { margin: 0; }
  .map-heading p { margin: 5px 0 0; max-width: 760px; }
  .eyebrow { margin: 0 0 4px; color: #526b80; font-size: 0.76rem; font-weight: 750; letter-spacing: 0.08em; text-transform: uppercase; }
  .map-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
  .map-filter-grid section, .locator-card, .map-results, .map-evidence, .geo-preview { border: 1px solid #c8d4df; border-radius: 9px; background: #fff; box-shadow: 0 1px 2px rgb(15 42 64 / 7%); }
  .map-filter-grid section { padding: 12px; }
  .map-filter-grid h3, .map-evidence h4 { margin: 0 0 9px; font-size: 0.9rem; }
  .map-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .map-chips button { display: inline-flex; gap: 7px; align-items: center; max-width: 100%; border: 1px solid #9eb3c5; border-radius: 999px; background: #f7fafc; padding: 5px 9px; color: #16324a; }
  .map-chips button span { border-radius: 999px; background: #dce8f2; padding: 1px 6px; font-size: 0.72rem; }
  .map-chips button.active { border-color: #1d70b8; background: #e6f2fb; box-shadow: inset 0 0 0 1px #1d70b8; }
  .map-workspace { display: grid; grid-template-columns: minmax(320px, 1.15fr) minmax(280px, 0.85fr); gap: 14px; min-height: 610px; }
  .locator-card { display: grid; grid-template-rows: auto minmax(420px, 1fr) auto; min-width: 0; overflow: hidden; background: linear-gradient(#f6fbff, #eaf4f9); }
  .locator-note { display: grid; gap: 2px; padding: 12px 14px; border-bottom: 1px solid #c8d4df; background: rgb(255 255 255 / 88%); }
  .locator-note span, .locator-summary { color: #526b80; font-size: 0.78rem; }
  .locator-map { width: 100%; height: 100%; min-height: 460px; }
  .locator-land { fill: #d9e5d2; stroke: #78916d; stroke-width: 2; vector-effect: non-scaling-stroke; }
  .locator-grid line { stroke: #c6d9e5; stroke-width: 1; stroke-dasharray: 4 7; vector-effect: non-scaling-stroke; }
  .locator-marker { cursor: pointer; color: #d4351c; }
  .locator-marker circle { fill: currentColor; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }
  .locator-marker.representative { color: #1d70b8; }
  .locator-marker.representative circle { fill: #fff; stroke: currentColor; stroke-width: 4; }
  .locator-marker.selected circle { stroke: #ffdd00; stroke-width: 5; }
  .locator-marker text { pointer-events: none; fill: #fff; font-size: 10px; font-weight: 800; text-anchor: middle; }
  .locator-marker.representative text { fill: #1d70b8; }
  .locator-summary { margin: 0; padding: 10px 14px; border-top: 1px solid #c8d4df; background: rgb(255 255 255 / 88%); }
  .map-results { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; }
  .map-results-heading { padding: 12px; border-bottom: 1px solid #d6e0e8; }
  .map-results-heading span { color: #526b80; font-size: 0.78rem; }
  .map-record-list { overflow: auto; }
  .map-record-list button { display: grid; gap: 3px; width: 100%; border: 0; border-bottom: 1px solid #e2e9ef; background: #fff; padding: 10px 12px; color: #16324a; text-align: left; }
  .map-record-list button:hover, .map-record-list button.active { background: #eaf4fb; }
  .map-record-list span, .map-record-list small { color: #526b80; }
  .map-record-list small { font-size: 0.72rem; }
  .map-results > p { margin: 0; padding: 9px 12px; background: #f4f7f9; color: #526b80; font-size: 0.78rem; }
  .map-evidence, .geo-preview { padding: 15px; }
  .map-evidence-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; margin-top: 14px; }
  .map-evidence ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .map-evidence li { display: grid; gap: 2px; border-left: 3px solid #1d70b8; padding-left: 9px; }
  .map-evidence li span, .map-evidence li small, .map-resource span { color: #526b80; overflow-wrap: anywhere; }
  .map-evidence li small { font-size: 0.72rem; }
  .map-caveat, .preview-error { border-left: 4px solid #f47738; background: #fff5ec; padding: 10px 12px; }
  .map-resource { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid #e2e9ef; }
  .map-resource > div:first-child { display: grid; gap: 2px; min-width: 0; }
  .map-resource-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
  .map-resource-actions a, .geo-preview header a { display: inline-flex; align-items: center; border: 1px solid #8ca5b9; border-radius: 4px; padding: 5px 8px; color: #005ea5; text-decoration: none; }
  .map-empty { border: 1px dashed #9eb3c5; border-radius: 8px; padding: 28px; background: #f7fafc; text-align: center; }
  .preview-map { display: block; width: 100%; max-height: 520px; margin-top: 14px; border: 1px solid #c8d4df; background: #eff6f9; }
  .preview-map path { fill: none; stroke: #1d70b8; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .preview-map path.polygon { fill: rgb(29 112 184 / 18%); }
  .preview-map circle { fill: #d4351c; stroke: #fff; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .preview-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0; }
  .preview-meta div { min-width: 140px; border-left: 2px solid #9eb3c5; padding-left: 8px; }
  .preview-meta dt { color: #526b80; font-size: 0.7rem; text-transform: uppercase; }
  .preview-meta dd { margin: 2px 0 0; }
  .preview-error { margin-top: 12px; }
  .preview-error p { margin: 5px 0 0; }
  button, a { font: inherit; }
  button { cursor: pointer; }
  button:disabled { cursor: progress; opacity: 0.65; }
  @media (max-width: 1000px) {
    .map-workspace, .map-evidence-grid { grid-template-columns: 1fr; }
    .map-results { max-height: 520px; }
  }
</style>
