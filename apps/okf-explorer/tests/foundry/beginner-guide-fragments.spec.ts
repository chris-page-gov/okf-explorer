import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';

import { expect, test } from '../browserDiagnostics';

test('all beginner guide pages pass fragment and automated accessibility checks', async ({ page, browser, browserName }, info) => {
  const started = new Date().toISOString();
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('docs/beginners/index.html');
  const guideBase = new URL('.', page.url()).href;
  let publication: { commit: string; identity_sha256: string; manifest_sha256: string } | undefined;
  if (process.env.OKF_BEGINNER_RELEASE_AUDIT) {
    const root = new URL('../../', guideBase);
    const [identity, manifest] = await Promise.all([
      page.request.get(new URL('okf-publication-identity.json', root).href),
      page.request.get(new URL('okf-explorer-build-manifest.json', root).href)
    ]);
    expect(identity.ok()).toBe(true);
    expect(manifest.ok()).toBe(true);
    publication = {
      commit: (await identity.json()).commit,
      identity_sha256: createHash('sha256').update(await identity.body()).digest('hex'),
      manifest_sha256: createHash('sha256').update(await manifest.body()).digest('hex')
    };
  }
  const referenceResponse = await page.request.get(new URL('cross-references.json', guideBase).href);
  expect(referenceResponse.ok()).toBe(true);
  const referenceSha = createHash('sha256').update(await referenceResponse.body()).digest('hex');
  const references: { schema: string; pages: Record<string, string[]> } = await referenceResponse.json();
  expect(references.schema).toBe('okf-beginner-guide-cross-references.v1');
  const routes = await page.getByRole('navigation', { name: 'Beginner guide chapters' })
    .getByRole('link').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
  expect(routes.every(route => route.startsWith(guideBase) && route.endsWith('.html'))).toBe(true);
  expect(routes.length).toBeGreaterThanOrEqual(27);
  expect(new Set(routes).size).toBe(routes.length);
  // macOS WebKit uses Option-Tab to include links in sequential keyboard navigation.
  const nextLink = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';

  const chapters: Array<{
    route: string; headings: string[]; narrowWidth: number;
    skipLinkChecked: boolean; manualChecks: string[];
  }> = [];
  for (const route of routes) {
    await page.setViewportSize({ width: 320, height: 720 });
    const response = await page.goto(route);
    expect([200, 304], route).toContain(response?.status());
    const main = page.locator('#main-content');
    const title = main.getByRole('heading', { level: 1 });
    await expect(title).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Beginner guide chapters' })
      .locator('a[aria-current="page"]')).toHaveCount(1);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, route).toBeLessThanOrEqual(320);
    await page.keyboard.press(nextLink);
    const skipLink = page.getByRole('link', { name: 'Skip to the guide' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(main).toBeFocused();

    const headings = await main.locator('h2[id], h3[id], h4[id], h5[id], h6[id]')
      .evaluateAll(elements => elements.map(element => element.id));
    expect(headings.length, route).toBeGreaterThan(0);
    expect(new Set(headings).size, route).toBe(headings.length);
    const titleId = await title.getAttribute('id');
    expect(titleId, route).toBeTruthy();
    const allHeadings = [titleId!, ...headings];
    expect(references.pages[route.slice(guideBase.length)], route).toEqual(allHeadings);

    const unmatched = await page.evaluate(ids => {
      return ids.filter(id => {
        location.replace(`#${encodeURIComponent(id)}`);
        return document.querySelector(':target')?.id !== id;
      });
    }, allHeadings);
    expect(unmatched, route).toEqual([]);

    const last = headings.at(-1)!;
    const deepLink = new URL(`#${encodeURIComponent(last)}`, route);
    await page.goto(deepLink.href);
    await page.reload();
    await expect(main.locator(':target')).toHaveAttribute('id', last);
    const first = headings[0];
    if (first !== last) {
      await page.goto(new URL(`#${encodeURIComponent(first)}`, route).href);
      await expect(main.locator(':target')).toHaveAttribute('id', first);
      await page.goBack();
      await expect(main.locator(':target')).toHaveAttribute('id', last);
      await page.goForward();
      await expect(main.locator(':target')).toHaveAttribute('id', first);
    }

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => node.target) })), route).toEqual([]);
    chapters.push({
      route, headings: allHeadings, narrowWidth: width, skipLinkChecked: true,
      manualChecks: scan.incomplete.map(finding => finding.id)
    });
  }
  await info.attach('observed-guide-fragments', {
    body: JSON.stringify({
      project: info.project.name, engine: browserName, version: browser.version(),
      started_at: started, observed_at: new Date().toISOString(), guide_base: guideBase,
      cross_references_sha256: referenceSha, publication, chapters
    }, null, 2),
    contentType: 'application/json'
  });
});
