<script lang="ts">
  import type { FederationChild, FederationOverview } from '$lib/types';

  let {
    overview,
    oninspect,
    onloadchild
  }: {
    overview: FederationOverview;
    oninspect: (id: string) => void;
    onloadchild: (child: FederationChild) => void;
  } = $props();

  let descriptor = $derived(overview.descriptor);
  let relationshipSummary = $derived(descriptor.relationship_summary);
  let statusCounts = $derived(Object.fromEntries(
    ['available', 'partial', 'restricted', 'unavailable', 'planned'].map((status) => [
      status,
      descriptor.children.filter((child) => child.status === status).length
    ])
  ));

  function childLoadable(child: FederationChild): boolean {
    return Boolean(
      child.descriptor ||
      child.discovery.routes.some((route) =>
        route.purpose === 'descriptor' ||
        (!route.purpose && ['published', 'raw'].includes(route.kind))
      )
    );
  }

  function coverageLabel(child: FederationChild): string {
    if (child.coverage.applicable !== undefined && child.coverage.represented !== undefined) {
      return `${child.coverage.represented.toLocaleString()} of ${child.coverage.applicable.toLocaleString()} represented`;
    }
    if (child.coverage.percent !== undefined) return `${child.coverage.percent.toLocaleString()}% represented`;
    return child.coverage.status;
  }
</script>

<section class="federation-overview" data-federation-overview={descriptor.schema}>
  <header>
    <div>
      <span class="federation-kicker">Federation overview · OKF {descriptor.okf_version}</span>
      <h2>{descriptor.title}</h2>
      <p>{descriptor.description}</p>
    </div>
    <div class="federation-state">
      <span data-federation-status={descriptor.status}>{descriptor.status}</span>
      <small>Snapshot {descriptor.snapshot}</small>
    </div>
  </header>

  <div class="federation-metrics" aria-label="Federation summary">
    <article>
      <strong>{descriptor.children.length.toLocaleString()}</strong>
      <span>child bundles</span>
    </article>
    <article>
      <strong>{statusCounts.available.toLocaleString()}</strong>
      <span>available</span>
    </article>
    <article>
      <strong>{statusCounts.partial.toLocaleString()}</strong>
      <span>partial</span>
    </article>
    <article>
      <strong>{relationshipSummary.total.toLocaleString()}</strong>
      <span>declared data-plane relationships</span>
    </article>
  </div>

  <section class="federation-authority-summary" aria-label="Relationship authority and freshness">
    <div>
      <h3>Relationship authority</h3>
      <span data-relationship-authority="official">
        Official <strong>{relationshipSummary.by_authority.official.toLocaleString()}</strong>
      </span>
      <span data-relationship-authority="derived">
        Derived <strong>{relationshipSummary.by_authority.derived.toLocaleString()}</strong>
      </span>
      <span data-relationship-authority="model-assisted">
        Model-assisted <strong>{relationshipSummary.by_authority['model-assisted'].toLocaleString()}</strong>
      </span>
      {#if relationshipSummary.by_authority.unclassified}
        <span data-relationship-authority="unclassified">
          Unclassified <strong>{relationshipSummary.by_authority.unclassified.toLocaleString()}</strong>
        </span>
      {/if}
    </div>
    <div>
      <h3>Freshness</h3>
      <span>Current <strong>{relationshipSummary.by_freshness.current.toLocaleString()}</strong></span>
      <span>Stale <strong>{relationshipSummary.by_freshness.stale.toLocaleString()}</strong></span>
      <span>Unknown <strong>{relationshipSummary.by_freshness.unknown.toLocaleString()}</strong></span>
    </div>
  </section>

  <section class="federation-discovery" aria-label="Canonical and alternate publication routes">
    <h3>Canonical and recovery routes</h3>
    <div>
      <a href={descriptor.discovery.repository} target="_blank" rel="noopener noreferrer">Repository</a>
      <a href={descriptor.discovery.documentation} target="_blank" rel="noopener noreferrer">Documentation</a>
      <a href={descriptor.discovery.release_archive} target="_blank" rel="noopener noreferrer">Release archive</a>
      {#if descriptor.discovery.semantic_descriptor}
        <a href={descriptor.discovery.semantic_descriptor} target="_blank" rel="noopener noreferrer">YAML-LD</a>
      {/if}
    </div>
    <p>
      Repository subpath <code>{descriptor.discovery.raw_subpath}</code>.
      {#if overview.attemptedUrls.length > 1}
        Loaded through declared fallback {overview.resolvedUrl}.
      {:else}
        Loaded from the requested descriptor route.
      {/if}
    </p>
  </section>

  {#if descriptor.notices?.length}
    <aside class="federation-notices" aria-label="Federation notices">
      {#each descriptor.notices as notice}<p>{notice}</p>{/each}
    </aside>
  {/if}

  <section class="federation-children" aria-label="Federated child bundles">
    {#each descriptor.children as child}
      <article data-child-status={child.status}>
        <header>
          <div>
            <span>{child.role}</span>
            <h3>{child.title}</h3>
          </div>
          <span class="federation-child-status">{child.status}</span>
        </header>
        <p>{child.description || coverageLabel(child)}</p>
        <dl>
          <dt>Authority</dt><dd data-relationship-authority={child.authority.class}>{child.authority.label || child.authority.class}</dd>
          <dt>Coverage</dt><dd>{coverageLabel(child)}</dd>
          <dt>Freshness</dt><dd>{child.freshness.state || 'unknown'}{child.freshness.observed_at ? ` · ${child.freshness.observed_at}` : ''}</dd>
        </dl>
        <div class="federation-child-actions">
          <button type="button" onclick={() => oninspect(child.id)}>Inspect metadata</button>
          {#if childLoadable(child)}
            <button type="button" class="primary" onclick={() => onloadchild(child)}>Load child bundle</button>
          {/if}
          <a href={child.discovery.documentation} target="_blank" rel="noopener noreferrer">Docs</a>
          <a href={child.discovery.repository} target="_blank" rel="noopener noreferrer">Source</a>
        </div>
      </article>
    {/each}
  </section>
</section>
