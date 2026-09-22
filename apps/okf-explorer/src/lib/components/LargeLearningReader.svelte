<script lang="ts">
  import LearningAssessment from './LearningAssessment.svelte';
  import type { LargeLearning } from '$lib/viewer/largeLearning';
  let { presentation, selected, onselect, snapshot = "" }: { presentation: LargeLearning; snapshot?: string; selected: string; onselect: (route: string) => void } = $props();
  let completed = $state<string[]>([]);
  let persona = $state('');
  const personas = $derived([...new Set(presentation.paths.flatMap(p=>p.personas??[]))]);
  const personaLabel = (value:string) => value.replace(/^persona\//,'').replaceAll('-',' ');
  let current = $derived(presentation.paths.flatMap(path => path.steps).find(step => step.route === selected));
  function toggle(key: string) { completed = completed.includes(key) ? completed.filter(item => item !== key) : [...completed, key]; }
</script>
<section aria-label="Learning paths" class="learning-paths">
  <h2>{presentation.title}</h2><p>{presentation.introduction}</p>
  <p>Choose a path, read the record and its supporting evidence, then try the practice task. Progress is self-reported and lasts for this session.</p>
  {#if personas.length}<label>Choose a role <select bind:value={persona}><option value="">All roles</option>{#each personas as role}<option value={role}>{personaLabel(role)}</option>{/each}</select></label>{/if}
  {#each presentation.paths.filter(p=>!persona||p.personas?.includes(persona)) as path}
    <details open={path.steps.some(step => step.route === selected) || presentation.paths.length === 1}>
      <summary>{path.title} · {path.steps.filter(step => completed.includes(`${path.id}:${step.route}`)).length}/{path.steps.length} complete</summary>
      <p>{path.description}</p>
      <ol>
        {#each path.steps as step}
          {@const key = `${path.id}:${step.route}`}
          <li aria-current={selected === step.route ? 'step' : undefined}>
            <button type="button" onclick={() => onselect(step.route)}>{step.title}</button>
            {#if step.minutes}<span> · {step.minutes} minutes</span>{/if}
            <p><strong>Outcome:</strong> {step.outcome}</p>
            {#if step.evidence_routes?.length}<p>Inspect supporting records:</p><ul>{#each step.evidence_routes as route}<li><button type="button" onclick={() => onselect(route)}>{route}</button></li>{/each}</ul>{/if}
            {#if step.practice}<p><strong>Practise:</strong> {step.practice}</p>{/if}
            <label><input type="checkbox" checked={completed.includes(key)} onchange={() => toggle(key)} /> I have completed {step.title}</label>
          </li>
        {/each}
      </ol>
    </details>
  {/each}
  {#if current}<p role="status">Selected: {current.title}. Read the record and supporting evidence in the inspection panel. A learning step does not certify competence or the authority of its sources.</p>{/if}
  {#if completed.length}<button type="button" onclick={() => completed = []}>Reset learning progress</button>{/if}
  {#if presentation.programme}<LearningAssessment {presentation} {snapshot}/>{/if}
</section>
<style>
  .learning-paths{padding:1.2rem;border:1px solid var(--border,#b6c9d5);border-radius:.5rem;margin-bottom:1rem;max-width:75ch}summary{cursor:pointer;font-weight:700;padding:.7rem 0}li{padding:.8rem;line-height:1.6}li[aria-current]{border-left:4px solid #087f83;background:#eef7f8}button{font:inherit;color:#005ea5;background:white;border:1px solid #b6c9d5;border-radius:4px;padding:.5rem;cursor:pointer}button:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #ffdd00;outline-offset:3px}label{display:block}p{overflow-wrap:anywhere}
</style>
