import { expect, test } from '@playwright/test';

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
  const links = page.getByRole('region', { name: 'Source and resource links' });
  await expect(links.getByRole('link', { name: 'Source ↗', exact: true })).toHaveAttribute(
    'href',
    'https://small.fixture.test/records/alpha.md'
  );
  await expect(links.getByRole('link', { name: 'Boundary CSV ↗' })).toHaveAttribute(
    'href',
    'https://data.fixture.test/alpha.csv?download=1'
  );
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

  const graph = page.getByRole('img', { name: 'OKF graph' });
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
  await expect(railLabel).toContainText('Alpha compatibility record');
  expect(await railLabel.evaluate((element) => getComputedStyle(element).writingMode)).toBe('vertical-rl');

  await page.setViewportSize({ width: 412, height: 820 });
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
