<script lang="ts">
  import type { NormalizedCorpus } from '$lib/types';
  import type { LearningPresentation } from '$lib/viewer/smallPresentation';
  let { corpus, presentation, selected, onselect }: { corpus: NormalizedCorpus; presentation: LearningPresentation; selected: string; onselect: (id: string) => void } = $props();
  let node = $derived(corpus.nodes[selected] || corpus.nodes[presentation.start_route]);
  let home = $derived(node.id === presentation.start_route);
  let connections = $derived(corpus.relationships.filter(e => Object.hasOwn(corpus.nodes, e.source) && Object.hasOwn(corpus.nodes, e.target) && (e.source === node.id || e.target === node.id) && !['organises', 'catalogues', 'mentions', 'is grounded in'].includes(e.kind || '')).slice(0, 60));
  let evidence = $derived(Array.isArray(node.evidence) ? node.evidence.filter(value => value && typeof value === 'object' && !Array.isArray(value)) as Array<{ source?: string; heading?: string; quote?: string }> : []);
</script>

<section class="learning-reader" aria-label="Learning path">
  {#if home}
    <p class="eyebrow">Start with what you want to learn</p>
    <h2>{presentation.title}</h2>
    <p class="introduction">{presentation.introduction}</p>
    {#each presentation.groups as group}
      <section class="journey-group" aria-label={group.title}>
        <h3>{group.title}</h3><p>{group.description}</p>
        <div class="journey-cards">
          {#each group.routes as route}
            {@const item = corpus.nodes[route]}
            <button type="button" onclick={() => onselect(route)}><span>{item.type}</span><strong>{item.title}</strong><p>{item.description}</p><span class="action">Explore →</span></button>
          {/each}
        </div>
      </section>
    {/each}
  {:else}
    <button class="back" type="button" onclick={() => onselect(presentation.start_route)}>← Learning path</button>
    <p class="eyebrow">{node.section} · {node.type}</p><h2>{node.title}</h2>
    <p class="introduction">{node.description}</p>
    {#if connections.length}
      <h3>How this connects</h3>
      <ul class="connections">{#each connections as edge}
        {@const outgoing = edge.source === node.id}
        {@const target = corpus.nodes[outgoing ? edge.target : edge.source]}
        {#if target}<li><span>{outgoing ? edge.kind : `${target.title} ${edge.kind}`}</span><button type="button" onclick={() => onselect(target.id)}>{outgoing ? target.title : `Explore ${target.title}`}</button></li>{/if}
      {/each}</ul>
    {/if}
    {#if evidence.length}
      <h3>Read the evidence</h3>
      <p>These passages support the interpretation. Check their context before applying them.</p>
      {#each evidence as item}
        <details><summary>{item.heading || 'Source passage'}</summary><blockquote>{item.quote || ''}</blockquote>
          {#if item.source && Object.hasOwn(corpus.nodes, item.source)}<button type="button" onclick={() => onselect(item.source!)}>Open {corpus.nodes[item.source].title}</button>{/if}
        </details>
      {/each}
    {:else if node.body}
      <details><summary>Read the full record</summary><pre>{node.body}</pre></details>
    {/if}
  {/if}
</section>

<style>
  .learning-reader{max-width:70rem;padding:1rem 1.4rem 2rem;color:var(--text,#183342)}
  h2{font-size:clamp(1.6rem,3vw,2.4rem);line-height:1.2;margin:.4rem 0 1rem}
  h3{font-size:1.25rem;margin:1.6rem 0 .5rem}.eyebrow{font-size:.85rem;font-weight:700;color:#476273}.introduction{font-size:1.08rem;max-width:65ch;line-height:1.65}
  .journey-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:1rem}
  .journey-cards button{display:flex;flex-direction:column;text-align:left;border:1px solid #b6c9d5;border-top:5px solid #087f83;border-radius:8px;background:white;padding:1.2rem;color:#183342;cursor:pointer;font:inherit}
  button:focus-visible,summary:focus-visible{outline:3px solid #ffdd00;outline-offset:3px}.journey-cards button:hover{border-color:#005ea5;background:#f1f8fc}.journey-cards strong{font-size:1.2rem;margin:.5rem 0}.journey-cards span{font-size:.85rem}.journey-cards p{line-height:1.55}.journey-cards .action{margin-top:auto;color:#005ea5;font-weight:700}
  .back,.connections button,details button{font:inherit;color:#005ea5;background:white;border:1px solid #b6c9d5;border-radius:4px;padding:.5rem;cursor:pointer}
  .connections{padding:0;list-style:none}.connections li{display:flex;flex-wrap:wrap;align-items:center;gap:.7rem;margin:.6rem 0}.connections span{max-width:45ch}details{border-top:1px solid #c7d4dc;padding:1rem 0}summary{cursor:pointer;font-weight:600}blockquote,pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;font:inherit}blockquote{margin:1rem 0;padding-left:1rem;border-left:4px solid #087f83}
</style>
