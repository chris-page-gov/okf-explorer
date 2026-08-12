import AxeBuilder from '@axe-core/playwright';
import { type BrowserContext } from '@playwright/test';

import { expect, test } from '../browserDiagnostics';

const BUNDLE_URL = 'https://exploratory.fixture.test/okf-bundle.json';
const FEEDBACK_URL = 'https://feedback.fixture.test/issues/new?template=explore.yml';
const SNAPSHOT = 'coventry-everyday-services-2026-08-12';
const PLANE_ROOT = 'a'.repeat(64);
const GOVERNED_MESSAGE =
  'This is an incomplete research view, not an authoritative service or released data product. Content and links may change. Check the cited official source before making a decision.';

function publication(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 'okf-exploratory-publication.v1',
    publication_state: 'exploratory',
    snapshot_id: SNAPSHOT,
    generated_at: '2026-08-12T09:30:00Z',
    applicable_plane_roots: { semantic: PLANE_ROOT },
    publisher: {
      name: 'Independent Coventry research project',
      url: 'https://publisher.fixture.test/',
      authority_status: 'independent-research'
    },
    banner: {
      label: 'Exploratory',
      message: GOVERNED_MESSAGE,
      feedback_url: FEEDBACK_URL,
      preserve_route: true
    },
    indexing_policy: 'noindex',
    limitations: ['Coverage and semantic mappings remain under review.'],
    permitted_claims: ['This named snapshot is available for research and feedback.'],
    prohibited_claims: ['Do not claim official endorsement, completeness or release approval.'],
    promotion_rule: 'Owner review creates a fresh candidate; exploratory bytes are never relabelled.',
    ...overrides
  };
}

function bundle(block: unknown = publication()): Record<string, unknown> {
  return {
    okf_version: '0.2',
    snapshot: SNAPSHOT,
    generated_at: '2026-08-12T09:30:00Z',
    plane_roots: { semantic: PLANE_ROOT },
    exploratory_publication: block,
    meta: { title: 'Coventry everyday-services exploration' },
    nodes: {
      bins: {
        id: 'bins',
        title: 'Household rubbish collection',
        type: 'Public service',
        description: 'A bounded service record for reviewing navigation.'
      },
      council: {
        id: 'council',
        title: 'Coventry City Council',
        type: 'Organisation'
      }
    },
    relationships: [{ source: 'bins', target: 'council', kind: 'provided by' }]
  };
}

async function installBundle(context: BrowserContext, body: Record<string, unknown>): Promise<void> {
  await context.route(BUNDLE_URL, async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body)
  }));
}

async function installClipboard(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => { copied = String(value); },
        readText: async () => copied
      }
    });
  });
}

test.describe('Explore OKF exploratory publication', () => {
  test('keeps the governed banner visible in every view and emits noindex metadata', async ({ context, page }) => {
    await installBundle(context, bundle());
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&q=rubbish&filter.type=Public%20service#bins`);

    const banner = page.getByRole('note', { name: 'Exploratory publication notice' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(GOVERNED_MESSAGE);
    await expect(banner).toHaveAttribute('data-release-approved', 'false');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

    for (const view of ['Reader', 'Graph', 'Links', 'Timeline', 'Type', 'Resources', 'Map', 'Narrative']) {
      await page.getByLabel('Views').getByRole('button', { name: view, exact: true }).click();
      await expect(banner).toBeVisible();
      await expect(banner).toHaveAttribute('data-exploratory-contract', 'valid');
    }
  });

  test('feedback preserves bundle, view, query, filters, record route and complete review URL', async ({ context, page }) => {
    await installBundle(context, bundle());
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=graph&q=rubbish&filter.type=Public%20service#bins`);

    const feedback = page.getByRole('link', { name: 'Give feedback about this exact view' });
    const href = await feedback.getAttribute('href');
    const url = new URL(href!);
    expect(url.origin + url.pathname).toBe('https://feedback.fixture.test/issues/new');
    expect(url.searchParams.get('template')).toBe('explore.yml');
    expect(url.searchParams.get('okf_bundle')).toBe(BUNDLE_URL);
    expect(url.searchParams.get('okf_view')).toBe('graph');
    expect(url.searchParams.get('okf_query')).toBe('rubbish');
    expect(url.searchParams.getAll('okf_filter')).toEqual(['type=Public service']);
    expect(url.searchParams.get('okf_route')).toBe('bins');
    const restored = new URL(url.searchParams.get('okf_review_url')!);
    expect(restored.searchParams.get('bundle')).toBe(BUNDLE_URL);
    expect(restored.searchParams.get('view')).toBe('graph');
    expect(restored.searchParams.get('q')).toBe('rubbish');
    expect(restored.searchParams.getAll('filter.type')).toEqual(['Public service']);
    expect(restored.hash).toBe('#bins');

    await page.reload();
    await expect(page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true })).toHaveClass(/active/);
    await expect(page.getByRole('note', { name: 'Exploratory publication notice' })).toBeVisible();
  });

  test('copied routes, inspection and browser history restore the exact review state', async ({ context, page }) => {
    await installClipboard(context);
    await installBundle(context, bundle());
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=graph#bins`);

    await page.locator('[data-route="council"]').click();
    await expect(page).toHaveURL(/inspect\.node=council/);
    let feedback = new URL(
      (await page.getByRole('link', { name: 'Give feedback about this exact view' }).getAttribute('href'))!
    );
    expect(feedback.searchParams.get('okf_route')).toBe('node/council');
    let restored = new URL(feedback.searchParams.get('okf_review_url')!);
    expect(restored.searchParams.get('inspect.node')).toBe('council');
    expect(restored.hash).toBe('#bins');

    await page.getByRole('button', { name: 'Copy route', exact: true }).click();
    const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    expect(copied.searchParams.get('inspect.node')).toBe('council');

    await page.goBack();
    await expect(page).not.toHaveURL(/inspect\.node=/);
    await page.goForward();
    await expect(page).toHaveURL(/inspect\.node=council/);
    await page.reload();
    await expect(page.locator('.right-panel').getByRole('heading', {
      name: 'Coventry City Council'
    })).toBeVisible();

    await page.getByLabel('Views').getByRole('button', { name: 'Links', exact: true }).click();
    await page.getByRole('button', { name: /Household rubbish collection.*Coventry City Council/ }).click();
    await expect(page).toHaveURL(/inspect\.relationship=index%3A0/);
    feedback = new URL(
      (await page.getByRole('link', { name: 'Give feedback about this exact view' }).getAttribute('href'))!
    );
    expect(feedback.searchParams.get('okf_route')).toBe('relationship/index:0');
    restored = new URL(feedback.searchParams.get('okf_review_url')!);
    expect(restored.searchParams.get('inspect.relationship')).toBe('index:0');

    await page.locator('.right-panel').getByRole('button', { name: 'Clear relationship' }).click();
    await expect(page).not.toHaveURL(/inspect\.relationship=/);
    await expect(page.locator('.right-panel').getByRole('heading', {
      name: 'Household rubbish collection → Coventry City Council'
    })).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/inspect\.relationship=index%3A0/);
    await expect(page.locator('.right-panel').getByRole('heading', {
      name: 'Household rubbish collection → Coventry City Council'
    })).toBeVisible();
  });

  test('keeps exploratory noindex fail-safe when subordinate bundle loading fails', async ({ context, page }) => {
    const failingUrl = 'https://exploratory.fixture.test/failing-large.json';
    await installBundle(context, bundle());
    await context.route(failingUrl, async (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus',
        title: 'Failing exploratory corpus',
        snapshot: SNAPSHOT,
        generated_at: '2026-08-12T09:30:00Z',
        plane_roots: { semantic: PLANE_ROOT },
        exploratory_publication: publication(),
        entrypoints: { data_manifest: 'missing-manifest.json' },
        counts: { records: 1 }
      })
    }));
    await context.route('https://exploratory.fixture.test/missing-manifest.json', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
    );
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#bins`);

    // Public Pages can hydrate and finish the initial fixture load after the
    // input has appeared. Wait for that load to commit before replacing its
    // URL, otherwise it can restore BUNDLE_URL between fill() and submit.
    await expect(page.locator('.title-block').getByText(
      'Coventry everyday-services exploration',
      { exact: true }
    )).toBeVisible();
    const input = page.getByRole('textbox', { name: 'Bundle or descriptor URL' });
    await input.fill(failingUrl);
    await page.getByRole('button', { name: 'Load', exact: true }).click();

    await expect(page.getByText('No bundle loaded')).toBeVisible();
    await expect(page.getByRole('note', { name: 'Exploratory publication notice' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.getByRole('alert').filter({ hasText: /missing-manifest|json/i })).toBeVisible();
  });

  test('is accessible at a narrow viewport and 200% browser zoom', async ({ context, page }) => {
    await installBundle(context, bundle());
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#bins`);
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });

    const banner = page.getByRole('note', { name: 'Exploratory publication notice' });
    await expect(banner).toBeVisible();
    await banner.getByText('Review boundaries').click();
    await expect(banner).toContainText('Independent Coventry research project');
    await expect(banner).toContainText('Do not claim official endorsement');
    expect(await banner.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

    const analysis = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(analysis.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  });

  for (const [name, body, expected] of [
    ['missing', { ...bundle(undefined), status: 'exploratory', exploratory_publication: undefined }, 'is missing'],
    ['malformed', bundle([]), 'is not an object'],
    ['unsupported', bundle(publication({ schema: 'okf-exploratory-publication.v2' })), 'unsupported exploratory publication schema'],
    ['integrity-mismatched', { ...bundle(), plane_roots: { semantic: 'b'.repeat(64) } }, 'integrity root'],
    ['publication-state-conflicting', { ...bundle(), publication_state: 'released' }, 'publication_state must be exploratory'],
    ['release-status-conflicting', { ...bundle(), status: 'Release approved' }, 'release-like claim'],
    ['authority-status-conflicting', { ...bundle(), status: 'Official and complete' }, 'release-like claim'],
    ['general-availability-conflicting', { ...bundle(), status: 'Generally available' }, 'release-like claim']
  ] as const) {
    test(`fails closed with an explicit warning for a ${name} block`, async ({ context, page }) => {
      await installBundle(context, body as Record<string, unknown>);
      await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#bins`);
      const banner = page.getByRole('alert', { name: 'Exploratory publication notice' });
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(expected);
      await expect(banner).toHaveAttribute('data-exploratory-contract', 'invalid');
      await expect(banner).toHaveAttribute('data-release-approved', 'false');
      await expect(banner.getByRole('link', { name: /feedback/i })).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    });
  }
});
