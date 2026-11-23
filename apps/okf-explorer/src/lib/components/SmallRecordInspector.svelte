<script lang="ts">
  import type { FederationChild, NormalizedCorpus, OkfNode, OkfRelationship } from '$lib/types';
  import { okfConceptPresentation, trustTierLabel } from '$lib/okfV02';
  import { renderSafeMarkdown, smallNodeLinks, smallNodeMetadataRows } from '$lib/viewer/smallNodePresentation';
  import { relationshipPresentation } from '$lib/viewer/relationshipPresentation';
  import InspectorSections from './InspectorSections.svelte';
  let { detailNode, smallCorpus, detailRelationships, sourceUrl, selectedFederationChild, outsideScope = false, inspectNode, inspectRelationship, loadFederationChild, conceptUrl }:
    { detailNode: OkfNode; smallCorpus: NormalizedCorpus | null; detailRelationships: OkfRelationship[]; sourceUrl: string;
      selectedFederationChild?: FederationChild; outsideScope?: boolean; inspectNode: (id: string) => void; conceptUrl: (id: string) => string; inspectRelationship: (relationship: OkfRelationship) => void; loadFederationChild: (child: FederationChild) => void } = $props();
  let okf = $derived(okfConceptPresentation(detailNode, undefined, smallCorpus?.okfVersion));
  let replacement = $derived(okf.status === 'deprecated' ? detailRelationships.find(relation =>
    relation.source === detailNode.id && smallCorpus?.nodes[relation.target] &&
    Array.isArray(relation.source_fields) && relation.source_fields.includes('superseded_by')) : undefined);
  let backlinks = $derived(detailRelationships.filter(relationship =>
    relationship.target === detailNode.id && relationship.source !== detailNode.id &&
    Array.isArray(relationship.source_fields) && relationship.source_fields.length > 0
  ));
  let backlinkLimit = $state(20);
  $effect.pre(() => {
    detailNode.id;
    backlinkLimit = 20;
  });
  const linkFieldLabel = (field: unknown) => {
    if (field === 'markdown') return 'Markdown link';
    if (field === 'superseded_by') return 'Replacement';
    if (field === 'sources[].resource') return 'Provenance source';
    return String(field);
  };
  function markdownConceptHref(href: string): string {
    const target = detailNode.markdown_links?.[href];
    return typeof target === 'string' && smallCorpus?.nodes[target] ? conceptUrl(target) : '';
  }
  function followMarkdownConcept(element: HTMLElement) {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      const href = link?.dataset.okfMarkdownHref;
      const target = href ? detailNode.markdown_links?.[href] : undefined;
      if (typeof target === 'string' && smallCorpus?.nodes[target]) {
        event.preventDefault();
        inspectNode(target);
      }
    }
    element.addEventListener('click', onClick);
    return { destroy: () => element.removeEventListener('click', onClick) };
  }
  const jsonText = (value: unknown) => JSON.stringify(value, null, 2);
  const metadataDisplayValue = (value: unknown) => value === undefined || value === null || value === '' ? 'Not specified (metadata gap)' : typeof value === 'object' ? JSON.stringify(value) : String(value);
</script>

{#if outsideScope}<p class="scope-context" role="status">This record is outside the current result scope. Its details remain open for reference.</p>{/if}
          <span class="badge">{detailNode.type || 'Node'}</span>
          {#if smallCorpus?.okfVersion}<span class="badge">OKF {smallCorpus.okfVersion}</span>{/if}
          <span class="badge" data-trust-tier={okf.trustTier}>{trustTierLabel(okf.trustTier)}</span>
          <span class="badge" data-lifecycle-status={okf.status}>{okf.status}</span>
          {#if okf.stale}<span class="badge warning" data-stale="true">{okf.malformedStaleAfter ? 'Invalid review date' : 'Stale'}</span>{/if}
          <h2>{detailNode.title}</h2>
          {#if replacement}
            <button type="button" onclick={() => replacement && inspectNode(replacement.target)}>
              Open replacement: {smallCorpus?.nodes[replacement.target]?.title}
            </button>
          {/if}
          <p>{detailNode.description || detailNode.summary || detailNode.source || detailNode.id}</p>
          {#if selectedFederationChild && (selectedFederationChild.descriptor || selectedFederationChild.discovery.routes.some((route) => route.purpose === 'descriptor' || (!route.purpose && ['published', 'raw'].includes(route.kind))))}
            <div class="detail-actions">
              <button type="button" onclick={() => loadFederationChild(selectedFederationChild)}>Load child bundle</button>
            </div>
          {/if}
<InspectorSections>
  {#snippet overview()}
          {#if detailNode.body}
            <section use:followMarkdownConcept class="markdown-body" aria-label="Markdown body">
              {@html renderSafeMarkdown(detailNode.body, sourceUrl, markdownConceptHref)}
            </section>
          {/if}
          {#if backlinks.length}
            <section aria-label="Linked from">
              <h3>Linked from ({backlinks.length})</h3>
              <ul>
                {#each backlinks.slice(0, backlinkLimit) as backlink}
                  <li>
                    <button type="button" onclick={() => inspectNode(backlink.source)}>
                      {smallCorpus?.nodes[backlink.source]?.title || backlink.source}
                    </button>
                    <span> · {Array.isArray(backlink.source_fields) ? backlink.source_fields.map(linkFieldLabel).join(', ') : ''}</span>
                  </li>
                {/each}
              </ul>
              {#if backlinkLimit < backlinks.length}
                <button type="button" onclick={() => backlinkLimit += 20}>Show more backlinks</button>
              {/if}
            </section>
          {/if}
          <h3>Relationships</h3>
          {#if !detailRelationships.length}<p>No relationships supplied for this record.</p>{/if}
          {#each detailRelationships.slice(0, 20) as relationship}
            {@const outgoing = relationship.source === detailNode.id}
            {@const neighbour = outgoing ? relationship.target : relationship.source}
            {@const presentation = relationshipPresentation(relationship)}
            <div class="record-relationship">
              <span>{outgoing ? 'Outgoing' : 'Incoming'} · {outgoing ? relationship.kind || 'related' : presentation.inverseLabel || relationship.kind || 'related'}</span>
              <strong>{smallCorpus?.nodes[relationship.source]?.title || relationship.source} → {smallCorpus?.nodes[relationship.target]?.title || relationship.target}</strong>
              <div><button type="button" onclick={() => inspectRelationship(relationship)}>Inspect relationship</button><button type="button" onclick={() => inspectNode(neighbour)}>Inspect {smallCorpus?.nodes[neighbour]?.title || neighbour}</button></div>
            </div>
          {/each}
          {#if detailRelationships.length > 20}<p>Showing 20 of {detailRelationships.length} relationships. Use Links to browse the current scope.</p>{/if}
  {/snippet}
  {#snippet evidence()}
          <section class="okf-v02-summary" aria-label="OKF trust, lifecycle and provenance">
            <h3>Trust, lifecycle and provenance</h3>
            <p class="muted">The trust tier uses checks made since the last recorded content change.</p>
            <dl>
              <dt>Trust tier</dt><dd>{trustTierLabel(okf.trustTier)}</dd>
              <dt>Lifecycle</dt><dd>{okf.status}{detailNode.status ? '' : ' (default)'}</dd>
              <dt>Generated by</dt><dd>{okf.generated.by || 'Not declared'}</dd>
              <dt>Generated at</dt>
              <dd>
                {okf.generated.at || 'Not declared'}
                {#if okf.generated.basis === 'legacy-v0.1-timestamp'}<small>Legacy OKF v0.1 timestamp fallback</small>{/if}
              </dd>
              {#if okf.verified.length}
                <dt>Verification history</dt>
                <dd>{okf.verified.map((event) => `${event.by || 'Unknown actor'}${event.at ? ` · ${event.at}` : ''}`).join('; ')}</dd>
              {/if}
              {#if okf.staleAfter}
                <dt>Stale after</dt><dd>{okf.staleAfter}{okf.malformedStaleAfter ? ' · invalid date' : okf.stale ? ' · stale now' : ' · currently fresh'}</dd>
              {/if}
              {#if okf.usageWindow}
                <dt>Usage window</dt><dd>{okf.usageWindow.from || '…'} → {okf.usageWindow.to || '…'}</dd>
              {/if}
            </dl>
            {#if okf.sources.length}
              <h4>Provenance sources</h4>
              <div class="okf-source-list">
                {#each okf.sources as provenanceSource, index}
                  <article>
                    <strong>{provenanceSource.title || provenanceSource.id || `Source ${index + 1}`}</strong>
                    <code>{provenanceSource.resource}</code>
                    {#if provenanceSource.author}<span>Author {provenanceSource.author}</span>{/if}
                    {#if provenanceSource.last_modified}<span>Modified {provenanceSource.last_modified}</span>{/if}
                    {#if typeof provenanceSource.usage_count === 'number'}<span>Usage {provenanceSource.usage_count.toLocaleString()}</span>{/if}
                    {#if provenanceSource.legacy}<small>Legacy # Citations fallback</small>{/if}
                  </article>
                {/each}
              </div>
            {/if}
          </section>
          {#if okf.attestedComputation}
            <section class="attestation-contract" aria-label="Attested Computation contract">
              <h3>Attested Computation contract</h3>
              <p><strong>Declared contract only.</strong> Explorer does not execute the computation, executor or attester when a bundle is opened.</p>
              <dl>
                <dt>Runtime</dt><dd>{okf.attestedComputation.runtime || 'Not declared'}</dd>
                <dt>Computation</dt><dd>{okf.attestedComputation.computation || (okf.attestedComputation.inlineComputation ? 'Inline fenced computation' : 'Not declared')}</dd>
                <dt>Parameters</dt><dd>{okf.attestedComputation.parameters.length ? okf.attestedComputation.parameters.map((parameter) => `${parameter.name}: ${parameter.type}${parameter.required ? ' (required)' : ''}`).join('; ') : 'None declared'}</dd>
                <dt>Executor</dt><dd>{okf.attestedComputation.executorResource || 'Not declared'}</dd>
                <dt>Receipt</dt><dd>{okf.attestedComputation.receiptFields.join(', ') || 'Not declared'}</dd>
                <dt>Attester</dt><dd>{okf.attestedComputation.attesterResource || 'Not declared'}</dd>
              </dl>
              {#if okf.attestedComputation.contractWarnings.length}
                <p class="warning-text">{okf.attestedComputation.contractWarnings.join(' ')}</p>
              {/if}
            </section>
          {/if}
          {@const nodeLinks = smallNodeLinks(detailNode, sourceUrl)}
          {#if nodeLinks.length}
            <section class="small-node-links" aria-label="Source and resource links">
              <h3>Source and resources</h3>
              {#each nodeLinks as link}
                <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
              {/each}
            </section>
          {/if}
  {/snippet}
  {#snippet data()}
          <dl>
            <dt>Route</dt><dd>{detailNode.id}</dd>
            <dt>Section</dt><dd>{detailNode.section || 'root'}</dd>
            <dt>Source</dt><dd>{metadataDisplayValue(detailNode.source)}</dd>
            <dt>Links</dt><dd>{detailRelationships.length}</dd>
          </dl>
          {@const metadataRows = smallNodeMetadataRows(detailNode)}
          {#if metadataRows.length}
            <h3>Selected metadata</h3>
            <dl>
              {#each metadataRows as row}
                <dt>{row.label}</dt><dd>{metadataDisplayValue(row.value)}</dd>
              {/each}
            </dl>
          {/if}
          <details class="json-panel">
            <summary>Node JSON and provenance</summary>
            <pre>{jsonText(detailNode)}</pre>
          </details>
  {/snippet}
</InspectorSections>
<style>
  .scope-context { background:#fff4cf; border-left:4px solid #8c7000; padding:10px; font-size:.85rem; }
  .record-relationship { border-top:1px solid #b8c7d8; padding:10px 0; display:grid; gap:6px; font-size:.85rem; }
  .record-relationship div { display:flex; flex-wrap:wrap; gap:5px; }
  .record-relationship button { min-height:36px; }
</style>
