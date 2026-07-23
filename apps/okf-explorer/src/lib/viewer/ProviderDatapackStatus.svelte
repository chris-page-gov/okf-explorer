<script lang="ts">
  import type { LargeDataset, LargeProviderDatapack, SearchResultDoc } from '$lib/types';
  import {
    providerDatapackRecordContext,
    providerDatapackScopeState,
    resolveProviderDatapackActions
  } from './providerDatapack';

  let {
    pack,
    record,
    scope = 'bundle'
  }: {
    pack: LargeProviderDatapack;
    record?: LargeDataset | SearchResultDoc;
    scope?: 'bundle' | 'record' | 'resource';
  } = $props();

  let recordContext = $derived(providerDatapackRecordContext(pack, record));
  let actions = $derived(resolveProviderDatapackActions(pack, record));
  let comparisonState = $derived(providerDatapackScopeState(pack, record, scope));

  function dateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return value;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  }

  function coverageLabel(value: string | undefined): string {
    if (!value) return 'Not recorded';
    const periodStart = value.split('/')[0];
    const match = periodStart.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (!match) return value;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  }

  function fieldLabel(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replaceAll('.', ' ')
      .replaceAll('_', ' ')
      .toLowerCase();
  }

  function differenceValueLabel(field: string, value: string): string {
    if (field.toLowerCase().includes('timecoverage')) return coverageLabel(value);
    if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return dateLabel(value);
    return value;
  }
</script>

<section
  class="provider-datapack-status"
  class:record-status={scope !== 'bundle'}
  data-provider-datapack={pack.id}
  data-provider-scope={scope}
  data-comparison-status={comparisonState.status}
  data-provider-comparison-status={pack.comparison.status}
  aria-label={`${pack.provider.title} snapshot and reviewed reference`}
>
  <header>
    <div>
      <span class="eyebrow">
        {scope === 'bundle'
          ? 'Provider datapack'
          : scope === 'resource'
            ? 'Provider status inherited from record'
            : 'Provider status'}
      </span>
      <h3>{pack.provider.title}</h3>
    </div>
    <span
      class:drift={comparisonState.isDrift}
      class="comparison-badge"
    >
      {comparisonState.label}
    </span>
  </header>

  <div class="state-grid">
    <div class="state-block snapshot-state">
      <span class="state-label">{pack.presentation.snapshotLabel}</span>
      {#if pack.governedSnapshot.label !== pack.presentation.snapshotLabel}
        <strong>{pack.governedSnapshot.label}</strong>
      {/if}
      <span>
        Source revision <code>{pack.governedSnapshot.sourceCommitShort}</code>
        · as of {dateLabel(pack.governedSnapshot.sourceAsOf)}
      </span>
      {#if recordContext.snapshot}
        <span data-provider-snapshot-coverage>
          Coverage through <strong>{coverageLabel(recordContext.snapshot.timeCoverageEnd)}</strong>
        </span>
      {/if}
    </div>

    <div class="state-block reviewed-state">
      <span class="state-label">{pack.presentation.liveLabel}</span>
      {#if pack.reviewedLiveReference.label !== pack.presentation.liveLabel}
        <strong>{pack.reviewedLiveReference.label}</strong>
      {/if}
      <span>
        Source revision <code>{pack.reviewedLiveReference.sourceCommitShort}</code>
        · revision as of {dateLabel(pack.reviewedLiveReference.sourceCommitAsOf)}
      </span>
      <span>Review checked {dateLabel(pack.reviewedLiveReference.lastChecked)}</span>
      {#if recordContext.reviewedLiveReference}
        <span data-provider-reviewed-coverage>
          Coverage through
          <strong>{coverageLabel(recordContext.reviewedLiveReference.timeCoverageEnd)}</strong>
        </span>
      {/if}
    </div>
  </div>

  <p class="comparison-summary">{comparisonState.summary}</p>
  <p class="live-warning">
    <strong>External, not live-validated here.</strong>
    {pack.presentation.lastCheckedWording} {pack.presentation.notice}
  </p>

  {#if actions.length}
    <div class="provider-actions" aria-label={`${pack.provider.title} external actions`}>
      {#each actions as action, index}
        <a
          class:primary-provider-action={index === 0}
          href={action.url}
          target="_blank"
          rel="noopener noreferrer"
          data-provider-action={action.id}
          aria-label={`${action.label} on ${pack.provider.title} (external)`}
        >{action.label} ↗</a>
      {/each}
    </div>
  {/if}

  <details>
    <summary>Snapshot and review evidence</summary>
    <dl>
      <dt>Bundle snapshot</dt>
      <dd>{pack.governedSnapshot.snapshotId}</dd>
      <dt>Governed records</dt>
      <dd>{pack.governedSnapshot.recordCount.toLocaleString()}</dd>
      <dt>Snapshot scope</dt>
      <dd>
        Metadata only; observations
        {pack.governedSnapshot.observationsIncluded ? 'included' : 'not included'}.
      </dd>
      <dt>Snapshot source basis</dt>
      <dd>{pack.governedSnapshot.sourceAsOfBasis}</dd>
      <dt>Reviewed reference status</dt>
      <dd>{pack.reviewedLiveReference.status.replaceAll('-', ' ')}</dd>
      <dt>Comparison scope</dt>
      <dd>
        Reviewed record examples only; not an exhaustive comparison of all
        {pack.governedSnapshot.recordCount.toLocaleString()} provider records.
      </dd>
      <dt>Comparison as of</dt>
      <dd>{dateLabel(pack.comparison.comparisonAsOf)}</dd>
      <dt>Live execution</dt>
      <dd>
        {pack.comparison.executionRequiresLiveValidation
          ? 'Must be validated by the external provider at the time of use.'
          : 'No additional validation requirement declared.'}
      </dd>
    </dl>

    {#if recordContext.difference}
      <h4>Reviewed difference for {recordContext.difference.title}</h4>
      <dl class="difference-list">
        {#each recordContext.difference.fields as field}
          <dt>{fieldLabel(field.field)}</dt>
          <dd>
            <span>
              {pack.presentation.snapshotLabel}:
              {differenceValueLabel(field.field, field.snapshot)}
            </span>
            <span>
              {pack.presentation.liveLabel}:
              {differenceValueLabel(field.field, field.reviewedLiveReference)}
            </span>
          </dd>
        {/each}
      </dl>
    {/if}
  </details>
</section>

<style>
  .provider-datapack-status {
    display: grid;
    gap: 10px;
    margin: 12px 0;
    padding: 14px;
    border: 1px solid var(--line-strong);
    border-left: 5px solid var(--accent);
    border-radius: 8px;
    background: var(--surface);
  }

  .provider-datapack-status.record-status {
    padding: 12px;
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  h3 {
    margin: 1px 0 0;
    font-size: 17px;
  }

  h4 {
    margin: 12px 0 6px;
  }

  .eyebrow,
  .state-label {
    display: block;
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .02em;
    text-transform: uppercase;
  }

  .comparison-badge {
    flex: 0 0 auto;
    padding: 4px 8px;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: #fff;
    font-size: 12px;
    font-weight: 800;
  }

  .comparison-badge.drift {
    border-color: #b58800;
    background: #fff4cc;
    color: #594300;
  }

  .state-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .state-block {
    display: grid;
    gap: 4px;
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: #fff;
  }

  .state-block > span {
    overflow-wrap: anywhere;
    color: var(--muted);
    font-size: 12px;
  }

  .snapshot-state {
    border-left: 4px solid #1d70b8;
  }

  .reviewed-state {
    border-left: 4px dashed #b58800;
  }

  .comparison-summary,
  .live-warning {
    margin: 0;
  }

  .live-warning {
    padding: 8px 10px;
    border-radius: 5px;
    background: #f3f4f6;
    color: var(--muted);
    font-size: 13px;
  }

  .provider-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .provider-actions a {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 7px 10px;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: #fff;
    color: var(--ink);
    font-weight: 800;
    text-decoration: none;
  }

  .provider-actions a:hover,
  .provider-actions a:focus {
    border-color: var(--accent);
    text-decoration: underline;
  }

  .provider-actions .primary-provider-action {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }

  details {
    border-top: 1px solid var(--line);
    padding-top: 8px;
  }

  summary {
    cursor: pointer;
    font-weight: 800;
  }

  dl {
    display: grid;
    grid-template-columns: minmax(120px, 36%) minmax(0, 1fr);
    gap: 6px 10px;
    margin-bottom: 0;
  }

  dt {
    font-weight: 800;
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .difference-list dd {
    display: grid;
    gap: 3px;
  }

  @media (max-width: 740px) {
    header {
      display: grid;
    }

    .comparison-badge {
      justify-self: start;
    }

    .state-grid {
      grid-template-columns: 1fr;
    }

    dl {
      grid-template-columns: 1fr;
    }
  }
</style>
