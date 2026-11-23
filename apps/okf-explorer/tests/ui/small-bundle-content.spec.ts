import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const BUNDLE_URL = 'https://small.fixture.test/okf-bundle.json';

const bundle = {
  okf_version: '0.1',
  meta: { title: 'Small bundle compatibility fixture' },
  nodes: {
    alpha: {
      id: 'alpha',
      title: 'Alpha compatibility record',
      type: 'Dataset',
      description: 'Short catalogue description.',
      source: 'records/alpha.md',
      body: `# Alpha body

The body-only-term is searchable.

| Field | Value |
|---|---|
| Status | Reviewed |

\`\`\`mermaid
flowchart LR
  Source["Source record"] --> Explorer["OKF Explorer"]
\`\`\`

[Usage guide](guides/use.html?token=secret&view=full)

<script>window.fixtureAttack = true</script> [Unsafe](javascript:alert(1))`,
      resources: [{ title: 'Boundary CSV', url: 'https://data.fixture.test/alpha.csv?api_key=secret&download=1' }],
      schema_org_type: 'Dataset',
      provenance: {
        source_url: 'https://catalogue.fixture.test/alpha',
        retrieved_at: '2026-07-16T00:00:00Z',
        method: 'browser fixture'
      }
    },
    beta: {
      id: 'beta',
      title: 'Beta related record',
      type: 'Report',
      body: 'A related record.'
    },
    exchange: {
      id: 'exchange',
      title: 'Repository status exchange',
      type: 'Exchange',
      section: 'exchanges',
      timestamp: '2026-07-24T09:00:00Z',
      body: `# Repository status exchange

## User Prompt

\`\`\`\`text
Is the repository clean?
\`\`\`\`

## Codex Response

### Response 1 (commentary)

- Timestamp: \`2026-07-24T09:00:01Z\`

\`\`\`\`text
I am checking the worktree.
\`\`\`\`

### Response 2 (final_answer)

- Timestamp: \`2026-07-24T09:00:05Z\`

\`\`\`\`text
Yes. The repository is clean.
\`\`\`\``
    }
  },
  edges: [
    { source: 'alpha', target: 'beta', kind: 'supports' },
    { source: 'beta', target: 'alpha', kind: 'supports' }
  ]
};

const crowdedBundle = {
  okf_version: '0.1',
  meta: { title: 'Crowded graph fixture' },
  nodes: {
    centre: { id: 'centre', title: 'Selected centre', type: 'Dataset' },
    ...Object.fromEntries(Array.from({ length: 32 }, (_, index) => [
      `related-${index}`,
      {
        id: `related-${index}`,
        title: `Related evidence record ${String(index + 1).padStart(2, '0')} with a deliberately long label`,
        type: index % 2 ? 'Source' : 'Report'
      }
    ]))
  },
  edges: Array.from({ length: 32 }, (_, index) => ({
    source: 'centre',
    target: `related-${index}`,
    kind: index % 2 ? 'supports' : 'source evidence'
  }))
};

const v02Bundle = {
  okf_version: '0.2',
  meta: { title: 'OKF v0.2 trust fixture', profile: 'https://example.test/explorer-profile' },
  nodes: {
    computation: {
      id: 'computation',
      title: 'Governed total',
      type: 'Attested Computation',
      description: 'A passive computation contract used to verify the v0.2 presentation.',
      status: 'stable',
      stale_after: '2026-07-20',
      timestamp: '2025-01-01T00:00:00Z',
      generated: { by: 'process:fixture-build', at: '2026-07-25T09:00:00Z' },
      verified: { by: 'human:fixture-reviewer', at: '2026-07-25T10:00:00Z' },
      sources: [{
        id: 'policy',
        resource: 'https://policy.fixture.test/total',
        title: 'Total policy',
        author: 'team:policy',
        usage_count: 1200,
        last_modified: '2026-07-23'
      }],
      usage_window: { from: '2026-07-01', to: '2026-07-24' },
      runtime: 'bigquery',
      parameters: [{ name: 'year', type: 'integer', required: true }],
      executor: { resource: 'references/run.md', receipt: ['job_id', 'executed_sql', 'result'] },
      attester: { resource: 'references/attest.py' },
      body: `# Computation

\`\`\`sql
SELECT @year
\`\`\`

# Citations

- https://legacy.fixture.test/must-not-win`
    }
  },
  edges: []
};

test.beforeEach(async ({ context, page }) => {
  await context.route(BUNDLE_URL, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(bundle)
    });
  });
  const params = new URLSearchParams({ bundle: BUNDLE_URL });
  await page.goto(`?${params.toString()}#alpha`);
  await expect(page.locator('.right-panel').getByRole('heading', { name: 'Alpha compatibility record' })).toBeVisible();
});

test('SMALL-E2E-01 searches Markdown body and renders it without active content', async ({ page }) => {
  const search = page.getByRole('textbox', { name: 'Search nodes' });
  await search.fill('body-only-term');
  await page.getByRole('tab', { name: 'Results', exact: true }).click();
  const results = page.locator('.left-panel .node-list');
  await expect(results.getByRole('button')).toHaveCount(1);
  await expect(results).toContainText('Alpha compatibility record');
  await results.getByRole('button').click();

  const markdown = page.getByRole('region', { name: 'Markdown body' });
  await expect(markdown.getByRole('heading', { name: 'Alpha body' })).toBeVisible();
  await expect(markdown).toContainText('body-only-term');
  await expect(markdown.getByRole('table')).toContainText('Reviewed');
  await expect(markdown.locator('svg.mermaid-lite')).toBeVisible();
  await expect(markdown.locator('svg.mermaid-lite')).toContainText('OKF Explorer');
  await expect(markdown.locator('script')).toHaveCount(0);
  await expect(markdown.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(markdown.getByRole('link', { name: 'Usage guide' })).toHaveAttribute(
    'href',
    'https://small.fixture.test/guides/use.html?view=full'
  );
});

test('SMALL-E2E-02 exposes redacted links, selected metadata and complete node JSON', async ({ page }) => {
  await page.locator('.right-panel').getByRole('tab', { name: 'Evidence', exact: true }).click();
  const links = page.getByRole('region', { name: 'Source and resource links' });
  await expect(links.getByRole('link', { name: 'Source ↗', exact: true })).toHaveAttribute(
    'href',
    'https://small.fixture.test/records/alpha.md'
  );
  await expect(links.getByRole('link', { name: 'Boundary CSV ↗' })).toHaveAttribute(
    'href',
    'https://data.fixture.test/alpha.csv?download=1'
  );
  await page.locator('.right-panel').getByRole('tab', { name: 'Data', exact: true }).click();
  await expect(page.getByText('Schema.org type')).toBeVisible();
  await expect(page.getByText('Provenance source', { exact: true })).toBeVisible();

  const disclosure = page.locator('.json-panel').filter({ hasText: 'Node JSON and provenance' });
  await disclosure.locator('summary').click();
  await expect(disclosure).toContainText('catalogue.fixture.test/alpha');
  await expect(disclosure).toContainText('browser fixture');
});

test('SMALL-E2E-03 projects generated edges into Graph and Links views', async ({ page }) => {
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.locator('svg.graph .edge-hit')).toHaveCount(2);
  await expect(page.locator('svg.graph .edge-label')).toHaveCount(1);
  const reciprocalPaths = await page.locator('svg.graph .graph-edge').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  expect(new Set(reciprocalPaths).size).toBe(2);
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(page.locator('.links-view')).toContainText('supports');
  await expect(page.locator('.links-view')).toContainText('Alpha compatibility record');
  await expect(page.locator('.links-view')).toContainText('Beta related record');
});

test('expanded Graph fits the drawing and restores the layout and keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const graph = page.getByRole('group', { name: 'OKF graph' });
  await expect(graph.locator('.edge-hit')).toHaveCount(2);
  const originalWidth = (await graph.boundingBox())!.width;
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const route = page.url();
  const expand = page.getByRole('button', { name: 'Expand graph', exact: true });
  await expand.focus();
  await expand.press('Enter');
  const exit = page.getByRole('button', { name: 'Exit expanded graph' });
  await expect(exit).toBeFocused();
  await expect(page.getByRole('complementary', { name: 'Search and facets' })).toBeHidden();
  await expect(page.getByRole('complementary', { name: 'Record details' })).toBeHidden();
  await expect.poll(async () => (await graph.boundingBox())!.width).toBeGreaterThan(originalWidth + 400);
  await expect.poll(async () => (await graph.boundingBox())!.height).toBeGreaterThan(650);
  await expect.poll(() => graph.evaluate((svg: SVGSVGElement) => {
    const drawing = svg.getBBox();
    const canvas = svg.viewBox.baseVal;
    return drawing.x > canvas.x && drawing.y > canvas.y
      && drawing.x + drawing.width < canvas.x + canvas.width
      && drawing.y + drawing.height < canvas.y + canvas.height;
  })).toBe(true);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Fit graph', exact: true }).click();
  await expect(page.getByRole('button', { name: '100% — reset graph zoom' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(expand).toBeFocused();
  await expect(page.getByRole('button', { name: 'Toggle navigation' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: '120% — reset graph zoom' })).toBeVisible();
  await expect(page.locator('.right-panel').getByRole('heading', { name: 'Alpha compatibility record' })).toBeVisible();
  await expect(page).toHaveURL(route);
});

test('Reader explains the browse scope and can return to the loaded bundle start', async ({ page }) => {
  let reloads = 0;
  page.on('request', request => { if (request.url() === BUNDLE_URL) reloads += 1; });
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const beta = page.locator('svg.graph [data-route="beta"]');
  await beta.dblclick();
  await page.getByRole('button', { name: 'Reader', exact: true }).click();
  await expect(page.getByText('Current record Beta related record', { exact: true })).toBeVisible();
  await expect(page.getByText('Whole bundle · 3 records', { exact: true })).toBeVisible();

  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (url: string) => { document.body.dataset.copiedView = url; } }
  }));
  await page.getByRole('button', { name: 'Copy link to this view', exact: true }).click();
  await expect(page.getByText('Link to this view copied.', { exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-copied-view', /#beta$/);

  const search = page.getByRole('textbox', { name: 'Search nodes' });
  await search.fill('beta');
  await expect(page.getByText('Current search · 1 record', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await page.getByRole('button', { name: 'Back to start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reader', exact: true })).toHaveClass(/active/);
  await expect(search).toHaveValue('');
  await expect(page).toHaveURL(url => url.searchParams.get('bundle') === BUNDLE_URL
    && !url.searchParams.has('q') && !url.searchParams.has('view') && url.hash === '#alpha');
  await expect(page.getByText('Current record Alpha compatibility record', { exact: true })).toBeVisible();
  expect(reloads).toBe(0);
});

test('keyboard inspection scrolls only the details pane to the new record heading', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 510 });
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const graph = page.locator('svg.graph');
  const beta = graph.locator('[data-route="beta"]');
  const detail = page.locator('.right-panel .panel-scroll');
  const before = await graph.getAttribute('viewBox');
  await beta.focus();
  const scrolled = await detail.evaluate(el => {
    el.scrollTop = el.scrollHeight;
    return el.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(0);
  await beta.press('Enter');
  await expect(detail.getByRole('heading', { name: 'Beta related record', exact: true })).toBeVisible();
  await expect.poll(() => detail.evaluate(el => el.scrollTop)).toBe(0);
  await expect(beta).toBeFocused();
  await expect(graph).toHaveAttribute('viewBox', before!);
});

test('Hansard summaries keep the exact source link and keyboard focus on both sides of the card', async ({ context, page }) => {
  const url = 'https://small.fixture.test/hansard.json';
  const hansard = 'https://hansard.parliament.uk/Commons/2026-11-17/debates/fixture/Palantir#contribution-01';
  const contextData = {
    schema: 'okf-hansard-proceedings.v1', section_id: 'debate/palantir', section_title: 'Palantir',
    sitting_date: '2026-11-17', house: 'Commons'
  };
  await context.route(url, route => route.fulfill({
    contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ okf_version: '0.2', title: 'Hansard summary fixture', nodes: {
      audited: { id: 'audited', type: 'Contribution', title: 'Martin Wrigley · Palantir', url: hansard,
        hansard_proceedings: { ...contextData, source_item: 4, speaker: 'Martin Wrigley' },
        hansard_summary: { source: hansard, text: 'Wrigley asked for an independent audit.' } },
      untitled: { id: 'untitled', type: 'Contribution', title: 'Another contribution', url: hansard.replace(/01$/, '02'),
        hansard_proceedings: { ...contextData, source_item: 5 } }
    }, relationships: [] })
  }));
  await page.goto(`?${new URLSearchParams({ bundle: url })}#audited`);
  const card = page.locator('.stage .result-row').filter({ hasText: 'Martin Wrigley' });
  const source = card.getByRole('link', { name: 'Read in Hansard' });
  await expect(source).toHaveAttribute('href', hansard);
  await expect(card).toContainText('Martin Wrigley · House of Commons · 17 November 2026');
  const show = card.getByRole('button', { name: 'Show summary', exact: true });
  await show.press('Enter');
  await expect(card).toContainText('Wrigley asked for an independent audit.');
  await expect(source).toHaveAttribute('href', hansard);
  const details = card.getByRole('button', { name: 'Show record details', exact: true });
  await expect(details).toBeFocused();
  await details.press('Space');
  await expect(show).toBeFocused();
  const unsummarised = page.locator('.stage .result-row').filter({ hasText: 'Another contribution' });
  await expect(unsummarised.getByRole('link', { name: 'Read in Hansard' })).toBeVisible();
  await expect(unsummarised.getByRole('button', { name: 'Show summary' })).toHaveCount(0);
});

test('SMALL-E2E-04 renders exchange nodes as question-answer narrative and response timeline', async ({ page }) => {
  const params = new URLSearchParams({ bundle: BUNDLE_URL });
  await page.goto(`?${params.toString()}#exchange`);

  await expect(page.getByRole('button', { name: 'Narrative', exact: true })).toHaveClass(/active/);
  const narrative = page.getByRole('region', { name: 'Conversation narrative for Repository status exchange' });
  await expect(narrative.locator('.prompt-card')).toContainText('Is the repository clean?');
  await expect(narrative.locator('.final-card')).toContainText('Yes. The repository is clean.');
  await expect(narrative.locator('.commentary-card')).toContainText('I am checking the worktree.');

  await page.goBack();
  await expect(page.getByRole('button', { name: 'Reader', exact: true })).toHaveClass(/active/);
  await expect(page.locator('.right-panel').getByRole('heading', { name: 'Alpha compatibility record' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('button', { name: 'Narrative', exact: true })).toHaveClass(/active/);

  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  const timeline = page.getByRole('region', { name: 'Conversation timeline for Repository status exchange' });
  await expect(timeline.locator('.conversation-event')).toHaveCount(3);
  await expect(timeline).toContainText('Response 2 (final_answer)');
});

test('SMALL-E2E-05 cycles complete non-overlapping label sets and pans from node surfaces', async ({ context, page }) => {
  const crowdedUrl = 'https://small.fixture.test/crowded-okf-bundle.json';
  await context.route(crowdedUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(crowdedBundle)
    });
  });
  await page.goto(`?${new URLSearchParams({ bundle: crowdedUrl, view: 'graph' }).toString()}#centre`);

  const graph = page.getByRole('group', { name: 'OKF graph' });
  const pause = page.getByRole('button', { name: 'Pause cycling graph labels' });
  await expect(pause).toBeVisible();
  await expect(page.locator('.graph-summary')).toContainText(/label set \d+\/(?:[2-9]|\d{2,})/);

  const labels = graph.locator('g[data-route] > text:not(.stack-count), .edge-label');
  const visibleLabelKeys = () => labels.evaluateAll((elements) => elements.map((element) => (
    element.classList.contains('edge-label')
      ? `edge:${element.getAttribute('data-label-key')}`
      : `node:${element.parentElement?.getAttribute('data-route')}`
  )));
  const firstSet = await visibleLabelKeys();
  await page.waitForTimeout(2100);
  const secondSet = await visibleLabelKeys();
  expect(secondSet).not.toEqual(firstSet);

  const overlapCount = await labels.evaluateAll((elements) => {
    const boxes = elements.map((element) => element.getBoundingClientRect());
    let overlaps = 0;
    for (let left = 0; left < boxes.length; left += 1) {
      for (let right = left + 1; right < boxes.length; right += 1) {
        const a = boxes[left];
        const b = boxes[right];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps += 1;
      }
    }
    return overlaps;
  });
  expect(overlapCount).toBe(0);

  await pause.click();
  const pausedSet = await visibleLabelKeys();
  await page.waitForTimeout(2100);
  expect(await visibleLabelKeys()).toEqual(pausedSet);

  const before = await graph.getAttribute('viewBox');
  const centre = graph.locator('g[data-route="centre"] circle').last();
  const box = await centre.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 90, box!.y + box!.height / 2 + 45, { steps: 5 });
  await page.mouse.up();
  await expect(graph).not.toHaveAttribute('viewBox', before || '');
});

test('SMALL-E2E-06 keeps collapsed context and touch-scrollable mobile details', async ({ page }) => {
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  const railLabel = page.locator('.left-panel .panel-rail-label');
  await expect(railLabel).toContainText('Search and facets');
  expect(await railLabel.evaluate((element) => getComputedStyle(element).writingMode)).toBe('vertical-rl');

  await page.setViewportSize({ width: 412, height: 820 });
  await page.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Details', exact: true }).click();
  const detail = page.locator('.right-panel .detail');
  const dimensions = await detail.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    touchAction: getComputedStyle(element).touchAction
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  expect(dimensions.touchAction).toBe('pan-y');
  await detail.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await detail.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('SMALL-E2E-07 surfaces v0.2 trust, lifecycle, provenance and passive attestation', async ({ context, page }) => {
  const url = 'https://small.fixture.test/okf-v02-bundle.json';
  await context.route(url, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(v02Bundle)
    });
  });
  await page.goto(`?${new URLSearchParams({ bundle: url }).toString()}#computation`);

  const detail = page.locator('.right-panel .detail');
  await expect(detail.getByText('OKF 0.2', { exact: true })).toBeVisible();
  await expect(detail.getByText('Human reviewed', { exact: true }).first()).toBeVisible();
  await expect(detail.getByText('Stale', { exact: true })).toBeVisible();

  await detail.getByRole('tab', { name: 'Evidence', exact: true }).click();
  const trust = detail.getByRole('region', { name: 'OKF trust, lifecycle and provenance' });
  await expect(trust).toContainText('process:fixture-build');
  await expect(trust).toContainText('2026-07-25T09:00:00Z');
  await expect(trust).not.toContainText('Legacy # Citations fallback');
  await expect(trust).toContainText('Total policy');
  await expect(trust).toContainText('Usage 1,200');

  const contract = detail.getByRole('region', { name: 'Attested Computation contract' });
  await expect(contract).toContainText('Declared contract only');
  await expect(contract).toContainText('Explorer does not execute');
  await expect(contract).toContainText('year: integer (required)');
  await expect(contract.getByRole('button')).toHaveCount(0);
});


test('SMALL-E2E-09 starts folded, retains explicit sort, and resets a newly loaded file', async ({ page }) => {
  const facets = page.getByRole('tab', { name: 'Facets', exact: true });
  const results = page.getByRole('tab', { name: 'Results', exact: true });
  await expect(facets).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.facet-toggle[aria-expanded="true"]')).toHaveCount(0);
  await results.click();
  await expect(page.locator('.sort-control select')).toHaveValue('title');
  await facets.click();
  await page.locator('[data-facet-key="type"] .facet-toggle').click();
  await page.getByRole('button', { name: 'Pin Type', exact: true }).click();
  await results.click();
  await page.locator('.sort-control select').selectOption('newest');
  await page.reload();
  await expect(facets).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.facet-toggle[aria-expanded="true"]')).toHaveCount(0);
  await results.click();
  await expect(page.locator('.sort-control select')).toHaveValue('newest');
  await page.getByRole('textbox', { name: 'Search nodes' }).fill('body-only-term');
  await page.locator('input[type="file"]').setInputFiles('tests/ui/fixtures/small-file.fixture.json');
  await expect(facets).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('textbox', { name: 'Search nodes' })).toHaveValue('');
  await expect(page.locator('.facet-toggle[aria-expanded="true"]')).toHaveCount(0);
  await results.click();
  await expect(page.locator('.sort-control select')).toHaveValue('title');
});

test('SMALL-E2E-10 uses distinct adjacent colours and a separate highlight track', async ({ page }) => {
  const sections = page.locator('.facet-distribution');
  const pairs = await sections.evaluateAll(elements => {
    const luminance = (colour: string) => {
      const rgb = colour.match(/[\d.]+/g)!.slice(0,3).map(Number).map(value => value/255)
        .map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    return elements.flatMap(element => {
      const bars = [...element.querySelectorAll('.bar-segment')];
      return bars.slice(1).map((bar,index) => {
        const a=luminance(getComputedStyle(bars[index]).backgroundColor), b=luminance(getComputedStyle(bar).backgroundColor);
        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      });
    });
  });
  expect(pairs.length).toBeGreaterThan(0);
  expect(Math.min(...pairs)).toBeGreaterThanOrEqual(3);
  const help = page.locator('.facet-instructions').getByText(/lower black track shows highlighted matches/);
  await expect(help).toBeHidden();
  await page.locator('.facet-instructions').getByText('How selection works', { exact: true }).click();
  await expect(help).toBeVisible();
  await page.locator('[data-facet-key="type"] .facet-toggle').click();
  await page.locator('[data-facet-key="type"] [data-facet-value="Dataset"]').click();
  await expect(page.locator('[data-facet-key="type"] [data-facet-value="Dataset"]')).toContainText('Highlighted');
});

test('SMALL-E2E-11 pairs facets and details at medium width with compact controls and matching result tabs', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  const footer = page.getByRole('navigation', { name: 'Workspace panels' });
  await footer.getByRole('button', { name: 'Search & details', exact: true }).click();
  const navigation = page.locator('[data-panel="navigation"]');
  const details = page.locator('[data-panel="details"]');
  const content = page.locator('[data-panel="content"]');
  await expect(navigation).toBeVisible(); await expect(details).toBeVisible(); await expect(content).toBeHidden();
  const left = (await navigation.boundingBox())!, right = (await details.boundingBox())!;
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1);
  expect(Math.abs(left.y - right.y)).toBeLessThan(2);
  await expect(navigation.locator('.node-list')).toHaveCount(0);
  await expect(navigation.getByRole('region', { name: 'Explore current set' })).toBeVisible();
  const facets = page.getByRole('tab', { name: 'Facets', exact: true });
  await facets.focus(); await facets.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Results', exact: true })).toBeFocused();
  const sidebarTitles = await navigation.locator('.node-list strong').allTextContents();
  const centralTitles = await content.locator('[data-okf-ranked-result] h2').allTextContents();
  expect(sidebarTitles).toEqual(centralTitles);
  await navigation.locator('.node-list button').filter({ hasText: 'Beta related record' }).click();
  await expect(details.getByRole('heading', { name: 'Beta related record', exact: true })).toBeVisible();
  await footer.getByRole('button', { name: 'Results', exact: true }).click();
  await expect(content).toBeVisible(); await expect(navigation).toBeHidden(); await expect(details).toBeHidden();
  await footer.getByRole('button', { name: 'Search & details', exact: true }).click();
  await expect(details.getByRole('heading', { name: 'Beta related record', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 760 });
  await expect(navigation).toBeVisible(); await expect(details).toBeHidden();
  const buttons = footer.getByRole('button');
  for (const button of await buttons.all()) {
    const inline = await button.evaluate(element => {
      const [icon, label] = Array.from(element.children).map(child => child.getBoundingClientRect());
      return { height: element.getBoundingClientRect().height, iconY: icon.y, labelY: label.y, overflow: element.scrollWidth > element.clientWidth };
    });
    expect(inline.height).toBeLessThanOrEqual(48); expect(Math.abs(inline.iconY-inline.labelY)).toBeLessThan(3); expect(inline.overflow).toBe(false);
  }
});

test('SMALL-E2E-12 toggles colour and row selections, keeps summaries folded and supports keyboard OR', async ({ page }) => {
  const type = page.locator('[data-facet-key="type"]');
  await type.locator('.facet-quick-values summary').click();
  const dataset = type.locator('[data-facet-colour="Dataset"]');
  const report = type.locator('[data-facet-colour="Report"]');
  await dataset.click();
  await expect(dataset).toHaveAttribute('aria-pressed', 'true');
  await expect(type.locator('.facet-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(type.locator('.selection-summary')).toHaveText('Dataset');
  await expect(page.locator('[data-okf-ranked-result][data-highlighted]')).toHaveCount(1);
  await dataset.click();
  await expect(dataset).toHaveAttribute('aria-pressed', 'false');
  await expect(type.locator('.selection-summary')).toHaveText('');
  await dataset.press('Enter');
  await report.press('Control+Enter');
  await expect(dataset).toHaveAttribute('aria-pressed', 'true');
  await expect(report).toHaveAttribute('aria-pressed', 'true');
  await dataset.press('Enter');
  await expect(dataset).toHaveAttribute('aria-pressed', 'false');
  await expect(report).toHaveAttribute('aria-pressed', 'true');
  await type.locator('.facet-toggle').click();
  await type.locator('[data-facet-value="Report"]').click();
  await expect(report).toHaveAttribute('aria-pressed', 'false');
  await dataset.click();
  await report.click({ modifiers: ['ControlOrMeta'] });
  await expect(dataset).toHaveAttribute('aria-pressed', 'true');
  await expect(report).toHaveAttribute('aria-pressed', 'true');
  await dataset.dblclick();
  await expect(page.locator('[data-okf-ranked-results="primary"] [data-okf-ranked-result]')).toHaveCount(2);
  const state = JSON.parse(new URL(page.url()).searchParams.get('explore') || '{}');
  expect(state.reductions[0].selection.type).toEqual(['Dataset', 'Report']);
  await expect(page.getByRole('button', { name: 'Undo keep (1)', exact: true })).toBeEnabled();
});

for (const initiallySelected of [false, true]) {
  test(`SMALL-E2E-13 keeps a ${initiallySelected ? 'selected' : 'clear'} colour without moving its target`, async ({ page }) => {
    await page.setViewportSize({ width: 724, height: 705 });
    await page.getByRole('button', { name: 'Search & details', exact: true }).click();
    await page.locator('[data-facet-key="type"] .facet-quick-values summary').click();
    const colour = page.locator('[data-facet-key="type"] [data-facet-colour="Dataset"]');
    if (initiallySelected) await colour.click();
    await colour.scrollIntoViewIfNeeded();
    const before = (await colour.boundingBox())!;
    await colour.dblclick();
    const state = JSON.parse(new URL(page.url()).searchParams.get('explore') || '{}');
    expect(state.reductions[0].selection.type).toEqual(['Dataset']);
    expect((await colour.boundingBox())!.y).toBeCloseTo(before.y, 0);
    await page.getByRole('button', { name: 'Results', exact: true }).last().click();
    await expect(page.locator('[data-okf-ranked-results="primary"] [data-okf-ranked-result]')).toHaveCount(1);
  });
}

test('SMALL-E2E-14 keeps paired controls compact and aligns typography', async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 705 });
  await page.getByRole('button', { name: 'Search & details', exact: true }).click();
  const toolbar = page.getByRole('region', { name: 'Explore current set' });
  expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(48);
  await expect(toolbar.getByRole('button', { name: 'Keep highlighted', exact: true })).toBeHidden();
  const actions = toolbar.getByRole('button', { name: 'Selection actions', exact: true });
  await actions.press('Enter');
  await expect(toolbar.getByRole('button', { name: 'Keep highlighted', exact: true })).toBeVisible();
  await actions.press('Enter');
  const controls = page.locator('nav.tabs button, .panel-tabs button, .detail-tabs button, .panel-footer button');
  for (const control of await controls.all()) expect((await control.boundingBox())!.height).toBeCloseTo(36, 2);
  const size = await page.locator('.right-panel .detail h2').first().evaluate(node => getComputedStyle(node).fontSize);
  expect(size).toBe('18px');
});

test('SMALL-E2E-15 preserves visible input focus and repairs focus when a pane becomes hidden', async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 705 });
  await page.getByRole('button', { name: 'Search & details', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search nodes' });
  await search.focus();
  await page.setViewportSize({ width: 725, height: 705 });
  await expect(search).toBeFocused();
  await page.getByRole('tab', { name: 'Results', exact: true }).click();
  await page.locator('.left-panel .node-list button').filter({ hasText: 'Beta related record' }).click();
  await search.focus();
  await page.setViewportSize({ width: 320, height: 705 });
  await expect(page.locator('[data-panel="navigation"]')).toBeHidden();
  await expect(page.locator('[data-panel="details"]')).toBeFocused();
});

for (const focus of ['browser-blur', 'outside-control']) {
  test(`SMALL-E2E-16 repairs a hidden pane after ${focus}`, async ({ page }) => {
    await page.setViewportSize({ width: 724, height: 705 });
    await page.getByRole('button', { name: 'Search & details', exact: true }).click();
    await page.getByRole('tab', { name: 'Results', exact: true }).click();
    await page.locator('.left-panel .node-list button').filter({ hasText: 'Beta related record' }).click();
    const search = page.getByRole('textbox', { name: 'Search nodes' });
    const reader = page.getByRole('button', { name: 'Reader', exact: true });
    await search.focus();
    if (focus === 'browser-blur') {
      // Model Chrome clearing activeElement before Svelte receives resize.
      await search.evaluate(node => (node as HTMLInputElement).blur());
    } else await reader.focus();
    await page.setViewportSize({ width: 320, height: 705 });
    await expect(page.locator('[data-panel="navigation"]')).toBeHidden();
    await expect(focus === 'browser-blur' ? page.locator('[data-panel="details"]') : reader).toBeFocused();
  });
}

test('Links compares source assertions and inference with evidence and shareable status', async ({ context, page }) => {
  const url = 'https://inference.fixture.test/okf-bundle.json';
  const rule = 'urn:okf:rule:subclass-transitive:v1';
  const activity = 'urn:okf:inference-activity:fixture';
  const support = 'urn:fixture:assertion:a-to-b';
  const published = 'https://inference.fixture.test/source/a-to-b';
  await context.route(url, route => route.fulfill({
    contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({
      okf_version: '0.2',
      title: 'Comparison fixture',
      nodes: {
        a: { id: 'a', title: 'Class A', type: 'Class' },
        b: { id: 'b', title: 'Class B', type: 'Class' },
        c: { id: 'c', title: 'Class C', type: 'Class' }
      },
      relationships: [
        { id: support, source: 'a', target: 'b', kind: 'subclass of', assertion_status: 'official', evidence: [published] },
        { id: 'urn:fixture:assertion:b-to-c', source: 'b', target: 'c', kind: 'subclass of', assertion_status: 'official' },
        { id: 'urn:fixture:inferred:a-to-c', source: 'a', target: 'c', kind: 'subclass of', assertion_status: 'inferred',
          rule, derivation_activity: activity, supporting_assertions: [support, 'urn:fixture:assertion:b-to-c'] },
        { id: 'urn:fixture:normalised', source: 'c', target: 'b', kind: 'catalogue cross-reference', assertion_status: 'normalized' }
      ]
    })
  }));
  await page.goto('?' + new URLSearchParams({ bundle: url, view: 'links' }));
  const comparison = page.getByRole('region', { name: 'Assertion status comparison' });
  await expect(comparison).toContainText('Source-asserted2');
  await expect(comparison).toContainText('Inferred1');
  const filter = comparison.getByRole('combobox', { name: 'Show links by assertion status' });
  await filter.selectOption('inferred');
  await expect(page).toHaveURL(/links\.assertion=inferred/);
  await expect(comparison.getByRole('status')).toHaveText('1 shown');
  await expect(comparison).toContainText('Source-asserted2');
  await page.reload();
  await expect(filter).toHaveValue('inferred');
  const links = page.locator('.links-view');
  await expect(links.getByRole('button')).toHaveCount(1);
  await links.getByRole('button').click();
  const details = page.getByRole('complementary', { name: 'Record details' });
  await expect(details.getByText(rule, { exact: true })).toBeVisible();
  await expect(details.getByText(activity, { exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Inspect ' + support }).click();
  await expect(details.locator(`a[href="${published}"]`)).toBeVisible();
  await page.goBack();
  await expect(details.getByText(rule, { exact: true })).toBeVisible();
});

test('OKF 0.3 shows verification history and opens the replacement concept', async ({ context, page }) => {
  const url = 'https://small.fixture.test/core-03.json';
  const original = { title: 'Former metric', type: 'Metric', status: 'deprecated',
    generated: { by: 'editor/v1', at: '2026-11-01' },
    verified: [{ by: 'human:earlier', at: '2026-10-31' }, { by: 'team:current', at: '2026-11-01' }],
    stale_after: 'invalid' };
  await context.route(url, route => route.fulfill({
    contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ okf_version: '0.3', nodes: {
      'old.md': original, 'new.md': { title: 'Replacement metric', type: 'Metric' }
    }, edges: [{ source: 'old.md', target: 'new.md', kind: 'references', source_fields: ['superseded_by'] }] })
  }));
  await page.goto('?' + new URLSearchParams({ bundle: url }) + '#old.md');
  const detail = page.locator('.right-panel');
  await expect(detail.getByRole('heading', { name: 'Former metric' })).toBeVisible();
  await expect(detail.locator('[data-trust-tier]')).toHaveText('Machine confirmed');
  await expect(detail.locator('[data-stale]')).toHaveText('Invalid review date');
  await detail.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await expect(detail.getByRole('region', { name: 'OKF trust, lifecycle and provenance' })).toContainText('human:earlier');
  await detail.getByRole('button', { name: 'Open replacement: Replacement metric' }).click();
  await expect(detail.getByRole('heading', { name: 'Replacement metric' })).toBeVisible();
  await detail.getByRole('tab', { name: 'Overview', exact: true }).click();
  const backlinks = detail.getByRole('region', { name: 'Linked from' });
  await expect(backlinks).toContainText('Replacement');
  await backlinks.getByRole('button', { name: 'Former metric' }).click();
  await expect(detail.getByRole('heading', { name: 'Former metric' })).toBeVisible();
});

test('opens the complete reference semantic graph including its declared root routes', async ({ context, page }) => {
  const url = 'https://small.fixture.test/reference.jsonld';
  const body = await readFile(new URL('../../../../okf-bundle.jsonld', import.meta.url), 'utf8');
  await context.route(url, route => route.fulfill({
    contentType: 'application/ld+json', headers: { 'access-control-allow-origin': '*' }, body
  }));
  await page.goto('?' + new URLSearchParams({ bundle: url }) + '#document/index');
  const panel = page.locator('.right-panel');
  await expect(panel.getByRole('heading', { name: 'The reviewed sources', exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Inspect relationship', exact: true }).first().click();
  await expect(panel).toContainText('Deterministic Markdown link projection');
});
