<script lang="ts">
  import type { BundleRegistryEntry } from '$lib/types';
  import { learningRegistry } from '$lib/learning-registry';
  import './landing.css';

  const registry = learningRegistry;
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
    name: 'Build a knowledge base your AI can trust',
    description: 'A free project pathway for researching a subject, creating and validating an Open Knowledge Format bundle, grounding an AI and building a personal learning interface.',
    inLanguage: 'en-GB',
    educationalLevel: 'Beginner',
    learningResourceType: ['Project-based learning', 'Technical guide', 'Interactive explorer'],
    isAccessibleForFree: true
  };
  const structuredDataScript = '<script type="application/ld+json">' +
    JSON.stringify(structuredData).replaceAll('<', '\\u003c') + '<' + '/script>';

  function explorerHref(bundleUrl: string, route = 'overview'): string {
    return `./explore/?bundle=${encodeURIComponent(bundleUrl)}#${encodeURIComponent(route)}`;
  }

  function packTheme(entry: BundleRegistryEntry): string {
    const id = `${entry.id || ''} ${entry.title || ''}`.toLowerCase();
    if (id.includes('ons')) return 'Statistics and geography';
    if (id.includes('ckan')) return 'Open data catalogue';
    if (id.includes('api')) return 'APIs and integration';
    if (id.includes('law') || id.includes('legislation')) return 'Law and policy';
    if (id.includes('heritage')) return 'History and place';
    return 'AI and knowledge systems';
  }

</script>

<svelte:head>
  <title>Build a knowledge base your AI can trust</title>
  <meta name="description" content="Choose a subject, research reliable sources, build and validate an OKF bundle, connect your AI and create a personal learning app." />
  <meta property="og:title" content="Build a knowledge base your AI can trust" />
  <meta property="og:description" content="A free, beginner-first project pathway from research questions to a tested personal knowledge app." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <link rel="canonical" href="https://chris-page-gov.github.io/okf-explorer/" />
  {@html structuredDataScript}
</svelte:head>

<a class="skip-link" href="#start">Skip to the project</a>

<div class="learning-site">
  <header class="learning-header">
    <a class="brand" href="./" aria-label="OKF learning hub home">
      <span class="brand-mark" aria-hidden="true">OKF</span>
      <span>Learning hub</span>
    </a>
    <nav aria-label="Learning hub">
      <a href="#journey">Project path</a>
      <a href="#bundles">Examples</a>
      <a href="#people">People</a>
      <a href="./docs/beginners/index.html">Reference guide</a>
    </nav>
    <a class="header-action" href="./explore/">Open Explorer</a>
  </header>

  <main>
    <section class="hero" id="start" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">A practical project for curious people</p>
        <h1 id="hero-title">Build a knowledge base <em>your AI can trust</em></h1>
        <p class="hero-lead">Choose any subject. Turn reliable sources into a small, linked knowledge bundle. Test what your AI knows. Then build an app that helps somebody else learn.</p>
        <div class="hero-actions">
          <a class="button primary" href="./docs/project-studio/index.html">Start your project</a>
          <a class="button secondary" href={explorerHref('../okf-bundle.json', 'research/okf-evolution-review/index.md')}>Explore the evidence</a>
        </div>
        <ul class="hero-promises" aria-label="Project promises">
          <li>No prior coding or linked-data knowledge assumed</li>
          <li>Free, static and usable with your choice of AI</li>
          <li>Privacy and evidence decisions before upload</li>
        </ul>
      </div>
      <aside class="project-card" aria-label="Your finished project">
        <p class="card-kicker">What you will finish with</p>
        <ol>
          <li><span>01</span><strong>A researched subject</strong><small>questions, users and a source ledger</small></li>
          <li><span>02</span><strong>A validated OKF bundle</strong><small>small files, stable identities and evidenced links</small></li>
          <li><span>03</span><strong>A grounded AI test</strong><small>held-back questions, citations and limitations</small></li>
          <li><span>04</span><strong>Your own learning app</strong><small>built with AI, understood and tested by you</small></li>
        </ol>
      </aside>
    </section>

    <section class="definition-strip" id="concepts" aria-label="Four ideas in plain language">
      <div><strong>OKF</strong><span>Open Knowledge Format: small Markdown files with machine-readable facts.</span></div>
      <div><strong>Semantic link</strong><span>A named, directed connection with evidence — not just a clickable link.</span></div>
      <div><strong>Grounding</strong><span>Giving an AI the relevant evidence and checking that its answer stays inside it.</span></div>
      <div><strong>MCP</strong><span>Model Context Protocol: an optional way for an AI to request bounded context.</span></div>
    </section>

    <section class="section journey-section" id="journey" aria-labelledby="journey-title">
      <div class="section-heading">
        <p class="eyebrow">Learn by making</p>
        <h2 id="journey-title">Eight small stages, one useful result</h2>
        <p>Each stage repeats the same rhythm: explain, inspect a worked example, do one task, check it, then recall what mattered. You can stop after any checkpoint and return later.</p>
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

    <section class="section bundle-section" id="bundles" aria-labelledby="bundle-title">
      <div class="section-heading">
        <p class="eyebrow">Working examples</p>
        <h2 id="bundle-title">Learn from real OKF bundles</h2>
        <p>These entries come from the governed registry. Their labels such as preview, candidate or bounded demonstrator are part of the evidence, not decoration.</p>
      </div>
      <div class="bundle-grid">
        {#each registry as pack}
          <article class="bundle-card">
            <div class="bundle-meta"><span>{packTheme(pack)}</span><small>{pack.status || 'status not declared'}</small></div>
            <h3>{pack.title || pack.label}</h3>
            <p>{pack.description}</p>
            <dl>
              <div><dt>Version</dt><dd>{pack.version ? `v${pack.version}` : 'not declared'}</dd></div>
              <div><dt>Delivery</dt><dd>{pack.kind || 'bundle'}</dd></div>
            </dl>
            <div class="card-actions">
              <a href={explorerHref(pack.url)}>Try in Explorer</a>
              {#if pack.home_url}<a href={pack.home_url}>Pack home <span aria-hidden="true">↗</span></a>{/if}
            </div>
          </article>
        {/each}
      </div>
      <p class="lineage-link"><a href="./docs/okf-evolution-review-2026-08-17.html#the-journey-in-evidence">See the full LLM-Wiki and OKF lineage, including products that are not in the current registry</a>.</p>
    </section>

    <section class="section persona-section" id="people" aria-labelledby="people-title">
      <div class="sam-card">
        <p class="eyebrow">Meet the primary learner</p>
        <h2 id="people-title">Sam is 18, curious and new to this</h2>
        <p>Sam can browse, edit files and ask an AI for help. They do not yet know data modelling, provenance or deployment. They need a visible result early, plain language, low-cost tools, safe choices and a clear definition of “done”.</p>
        <blockquote>“Show me why this idea helps my subject, let me try it on a real example, and give me a check I can trust.”</blockquote>
        <a href="./docs/learner-hub-specification-2026-08-17.html#primary-learner-persona">Read Sam’s complete persona and user stories</a>
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
        <a href="./docs/project-studio/index.html"><strong>Start the project studio</strong><span>Build from subject choice to tested app</span></a>
        <a href="./docs/beginners/index.html"><strong>Open the complete guide</strong><span>Look up concepts and advanced detail</span></a>
        <a href="./docs/okf-evolution-review-2026-08-17.html"><strong>Read the research review</strong><span>See evidence, decisions and limitations</span></a>
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
