<script lang="ts">
  import { onMount } from 'svelte';

  // Preserve previously shared root URLs while keeping the plain learning home.
  onMount(() => {
    const current = new URL(window.location.href);
    if (!current.searchParams.has('bundle')) return;
    const target = new URL('./explore/', current);
    target.search = current.search;
    target.hash = current.hash;
    window.location.replace(target.href);
  });

  import learningCatalogue from '$lib/learning-catalogue.json';
  import './landing.css';

  const featuredExamples = learningCatalogue.filter((entry) => entry.featured);
  const workedExampleHref = explorerHref(
    'https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/okf-explorer.json',
    'asset/1342941',
    'Coventry Cathedral'
  );
  const stages = [
    { number: '01', title: 'Choose', text: 'Pick a subject small enough to finish and name who it should help.', output: 'Project brief', time: '30–45 min', href: './docs/project-studio/01-choose.html' },
    { number: '02', title: 'Question', text: 'Write the questions your bundle and app must answer before collecting data.', output: 'Question set', time: '45 min', href: './docs/project-studio/02-question.html' },
    { number: '03', title: 'Research', text: 'Find sources and decide authority, rights, privacy, freshness and gaps.', output: 'Source ledger', time: '1–3 hours', href: './docs/project-studio/03-research.html' },
    { number: '04', title: 'Model', text: 'Give things stable identities and add only relationships you can explain and evidence.', output: 'Concept map', time: '1–2 hours', href: './docs/project-studio/04-model.html' },
    { number: '05', title: 'Build', text: 'Author a small OKF 0.2 bundle, then use exact checks instead of guesswork.', output: 'Valid bundle', time: '1–3 hours', href: './docs/project-studio/05-build.html' },
    { number: '06', title: 'Explore', text: 'Use Reader, Search, Links, Graph, Timeline and Inspect to find defects.', output: 'Journey receipt', time: '45–90 min', href: './docs/project-studio/06-explore.html' },
    { number: '07', title: 'Ground', text: 'Connect your AI and compare its answers with questions you held back.', output: 'Evaluation results', time: '1–2 hours', href: './docs/project-studio/07-ground.html' },
    { number: '08', title: 'Create', text: 'Predict, run, inspect and modify working code before making your own learning UI.', output: 'Tested app', time: '2–6 hours', href: './docs/project-studio/08-create.html' }
  ];

  const subjects = [
    ['Local life', 'Public services, transport, planning, heritage or local history'],
    ['Culture', 'Music, films, books, games, sport, art or a personal collection'],
    ['Study', 'A course topic, scientific field, historical period or reading list'],
    ['Work', 'Policies, APIs, guidance, research papers or organisational knowledge'],
    ['Private', 'Your own notes or records — kept local unless you have a safe sharing decision']
  ];

  const people = [
    ['Data journalist', 'Find the exact ONS product, geography and vintage without confusing near-neighbours.'],
    ['Open-data analyst', 'Inspect CKAN publishers, licences and resources without assuming catalogue quality.'],
    ['Integration developer', 'Discover government APIs, then verify the real contract and access model.'],
    ['Legal or policy researcher', 'Trace works, versions, jurisdictions and official provisions without turning discovery into advice.'],
    ['Heritage educator', 'Create a source-backed local trail while keeping synthetic examples visibly separate.'],
    ['Service designer', 'Connect guidance, life events and organisations without inventing eligibility or authority.']
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': ['WebSite', 'LearningResource'],
    name: 'Use knowledge you can inspect with your AI',
    description: 'A practical path from a first sourced answer to a small, inspectable knowledge bundle, with optional deeper study.',
    inLanguage: 'en-GB',
    educationalLevel: 'Beginner',
    learningResourceType: ['Project-based learning', 'Technical guide', 'Interactive explorer'],
    isAccessibleForFree: true
  };
  const structuredDataScript = '<script type="application/ld+json">' +
    JSON.stringify(structuredData).replaceAll('<', '\\u003c') + '<' + '/script>';

  function explorerHref(bundleUrl: string, route = 'overview', query = ''): string {
    const search = new URLSearchParams({ bundle: bundleUrl });
    if (query) search.set('q', query);
    return `./explore/?${search.toString()}#${encodeURIComponent(route)}`;
  }



</script>

<svelte:head>
  <title>Use knowledge you can inspect with your AI</title>
  <meta name="description" content="Try bundled evidence with your AI, inspect the sources and make a small collection of your own." />
  <meta property="og:title" content="Use knowledge you can inspect with your AI" />
  <meta property="og:description" content="Task guides for consumers, domain experts, students and knowledge workers." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <link rel="canonical" href="https://chris-page-gov.github.io/okf-explorer/" />
  {@html structuredDataScript}
</svelte:head>

<a class="skip-link" href="#start">Skip to getting started</a>

<div class="learning-site">
  <header class="learning-header">
    <a class="brand" href="./" aria-label="OKF learning hub home">
      <span class="brand-mark" aria-hidden="true">OKF</span>
      <span>Learning hub</span>
    </a>
    <nav aria-label="Learning hub">
      <a href="./docs/onboarding/index.html">Start here</a>
      <a href="#bundles">Examples</a>
      <a href="#people">People</a>
      <a href="./docs/beginners/index.html">Reference guide</a>
    </nav>
    <a class="header-action" href={workedExampleHref}>Open worked example</a>
  </header>

  <main>
    <section class="hero" id="start" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">A practical project for curious people</p>
        <h1 id="hero-title">Use knowledge you can inspect <em>with your AI</em></h1>
        <p class="hero-lead">Ask a useful question of an existing bundle. Check its evidence and limits. Then make a small collection about something you know. Explorer helps you inspect knowledge; your chosen AI uses the material it can actually access.</p>
        <div class="hero-actions">
          <a class="button primary" href="./docs/onboarding/try-a-bundle.html">Try a bundle with AI</a>
          <a class="button secondary" href="./docs/onboarding/first-bundle.html">Make your first bundle</a>
        </div>
        <ul class="hero-promises" aria-label="Project promises">
          <li>No prior coding or linked-data knowledge assumed</li>
          <li>Human browser route and host-specific AI guidance</li>
          <li>Privacy and evidence decisions before upload</li>
        </ul>
      </div>
      <aside class="project-card" aria-label="Your finished project">
        <p class="card-kicker">Choose a useful result</p>
        <ol>
          <li><span>01</span><strong>A sourced answer</strong><small>understand what the evidence supports</small></li>
          <li><span>02</span><strong>A checked correction</strong><small>preserve the distinctions in your subject</small></li>
          <li><span>03</span><strong>A reusable bundle</strong><small>keep a small collection for recurring questions</small></li>
          <li><span>04</span><strong>An optional learning app</strong><small>continue when an interface serves your purpose</small></li>
        </ol>
      </aside>
    </section>

    <section class="definition-strip" id="concepts" aria-label="Four ideas in plain language">
      <div><strong>OKF</strong><span>Open Knowledge Format: small Markdown files with machine-readable facts.</span></div>
      <div><strong>Semantic link</strong><span>A named, directed connection with evidence — not just a clickable link.</span></div>
      <div><strong>Grounding</strong><span>Giving an AI the relevant evidence and checking that its answer stays inside it.</span></div>
      <div><strong>MCP</strong><span>Model Context Protocol: an optional way for an AI to request bounded context.</span></div>
    </section>

    <section class="section bundle-section" id="bundles" aria-labelledby="bundle-title">
      <div class="section-heading">
        <p class="eyebrow">Try, inspect, adapt</p>
        <h2 id="bundle-title">Start with an existing example</h2>
        <p>These featured experiences and the complete catalogue share one maintained editorial source. Applications, bundles and teaching fixtures have different limits.</p>
      </div>
      <div class="bundle-grid">
        {#each featuredExamples as example}
          <article class="bundle-card">
            <div class="bundle-meta"><span>{example.kind}</span><small>{example.audience}</small></div>
            <h3>{example.title}</h3>
            <p>{example.question}</p>
            <p>{example.limit}</p>
            <div class="card-actions">
              <a href={`./${example.guide.replace(/\.md$/, '.html')}`}>Try {example.title}</a>
            </div>
          </article>
        {/each}
      </div>
      <p class="lineage-link"><a href="./docs/onboarding/examples.html">Browse the complete example catalogue, including specialist and conditional collections</a>.</p>
    </section>

    <section class="section journey-section" id="journey" aria-labelledby="journey-title">
      <div class="section-heading">
        <p class="eyebrow">Learn by making</p>
        <h2 id="journey-title">An optional project course</h2>
        <p>Start with the short guides above, or continue through the full course. App creation is optional. Each stage repeats the same rhythm: explain, inspect a worked example, do one task, check it, then recall what mattered. You can stop after any checkpoint and return later.</p>
      </div>
      <ol class="journey-grid">
        {#each stages as stage}
          <li>
            <a href={stage.href}>
              <span class="stage-number">{stage.number}</span>
              <h3>{stage.title}</h3>
              <p>{stage.text}</p>
              <footer><span>{stage.output}</span><small>{stage.time}</small></footer>
            </a>
          </li>
        {/each}
      </ol>
    </section>

    <section class="section subject-section" id="subjects" aria-labelledby="subject-title">
      <div class="section-heading compact">
        <p class="eyebrow">Your subject, not ours</p>
        <h2 id="subject-title">Start with something you care about</h2>
        <p>A useful first bundle is narrow enough to review yourself: roughly 15–60 concepts and 5–15 questions.</p>
      </div>
      <div class="subject-grid">
        {#each subjects as subject}
          <article><h3>{subject[0]}</h3><p>{subject[1]}</p></article>
        {/each}
      </div>
      <aside class="privacy-note">
        <strong>Private does not mean unusable.</strong>
        <p>You can keep an OKF bundle on your own device. Do not send personal, confidential, copyrighted or credential-bearing material to an AI until you have decided who may access it and why.</p>
      </aside>
    </section>

    <section class="section persona-section" id="people" aria-labelledby="people-title">
      <div class="sam-card">
        <p class="eyebrow">Choose your own stopping point</p>
        <h2 id="people-title">Different people, useful outcomes</h2>
        <p>Consumers can finish with a sourced answer. Domain experts can check a distinction. Knowledge workers can prepare a reusable collection. Students can learn by changing a working example.</p>
        <blockquote>“Show me why this idea helps my subject, let me try it on a real example, and give me a check I can trust.”</blockquote>
        <a href="./docs/onboarding/audience-journeys.html">Choose your audience journey</a>
      </div>
      <div class="worker-stories">
        <h2>One format, many kinds of work</h2>
        <p>The same Explorer must expose both value and limits for different domains.</p>
        <div>
          {#each people as person}
            <article><h3>{person[0]}</h3><p>{person[1]}</p></article>
          {/each}
        </div>
      </div>
    </section>

    <section class="section responsible-section" id="responsible" aria-labelledby="responsible-title">
      <div class="section-heading compact">
        <p class="eyebrow">Your AI is a collaborator, not your evidence</p>
        <h2 id="responsible-title">Understand, apply, create — then verify</h2>
      </div>
      <div class="responsible-grid">
        <article><span>Understand</span><h3>Ask where an answer came from</h3><p>Learn identities, sources, dates, rights and uncertainty before asking the AI to make anything.</p></article>
        <article><span>Apply</span><h3>Compare expected and observed answers</h3><p>Hold questions back, require record citations and count unsupported or near-neighbour answers.</p></article>
        <article><span>Create</span><h3>Read and change working code</h3><p>Predict, run, investigate and modify a starter before using AI to create your personal interface.</p></article>
      </div>
    </section>

    <section class="section next-section" id="help" aria-labelledby="next-title">
      <div>
        <p class="eyebrow">Ready when you are</p>
        <h2 id="next-title">Choose your next useful action</h2>
      </div>
      <div class="next-actions">
        <a href="./docs/project-studio/index.html"><strong>Start the project studio</strong><span>An optional course from subject to checked bundle</span></a>
        <a href="./docs/beginners/index.html"><strong>Use the beginner reference</strong><span>Look up concepts and advanced detail</span></a>
        <a href="./docs/index.html"><strong>Find a task guide</strong><span>AI access, Explorer, authoring and reference</span></a>
        <a href="https://github.com/chris-page-gov/okf-explorer"><strong>Inspect the source</strong><span>Repository, tests and publication history</span></a>
      </div>
    </section>
  </main>

  <footer class="learning-footer">
    <div><strong>OKF learning hub</strong><p>Open, static learning materials and an inspectable Explorer.</p></div>
    <nav aria-label="Footer">
      <a href="./docs/index.html">Documentation</a>
      <a href="./profile/bundle-wiki/v1/">Bundle Wiki profile</a>
      <a href="./docs/okf-conformance.html">Conformance</a>
      <a href="https://github.com/chris-page-gov/okf-explorer/issues">Feedback</a>
    </nav>
  </footer>
</div>
