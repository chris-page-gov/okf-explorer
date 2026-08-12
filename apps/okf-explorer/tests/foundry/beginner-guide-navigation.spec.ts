import AxeBuilder from '@axe-core/playwright';

import { expect, test } from '../browserDiagnostics';

const indexRoute = 'docs/beginners/index.html';
const firstChapterRoute = 'docs/beginners/01-product-in-plain-language.html';
const deepSectionId = 'e8-validate-links-rendering-and-accessibility';
const deepSectionRoute =
  `docs/beginners/22-evaluation-foundry-and-yaml-ld.html#${deepSectionId}`;
const pinnedKey = 'okf-beginner-guide-sidebar-pinned-v1';
const collapsedKey = 'okf-beginner-guide-sidebar-collapsed-v1';

async function resetGuideState(page: import('@playwright/test').Page) {
  await page.goto(indexRoute);
  await page.evaluate(
    ({ pinned, collapsed }) => {
      window.localStorage.removeItem(pinned);
      window.sessionStorage.removeItem(collapsed);
    },
    { pinned: pinnedKey, collapsed: collapsedKey }
  );
  await page.reload();
}

test('the full chapter list scrolls independently to its final item', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await resetGuideState(page);

  const sidebar = page.locator('[data-guide-sidebar]');
  const main = page.locator('#main-content');
  const dimensions = await sidebar.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    bottom: element.getBoundingClientRect().bottom,
    viewport: window.innerHeight
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  expect(dimensions.bottom).toBeLessThanOrEqual(dimensions.viewport + 1);

  const mainScrollBefore = await main.evaluate((element) => element.scrollTop);
  await sidebar.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const reachedEnd = await sidebar.evaluate(
    (element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1
  );
  expect(reachedEnd).toBe(true);
  await expect(sidebar.locator('li').last().getByRole('link')).toBeInViewport();
  expect(await main.evaluate((element) => element.scrollTop)).toBe(mainScrollBefore);
});

test('a shared deep section fragment survives reload and restores the exact section', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(deepSectionRoute);

  const section = page.locator(`#${deepSectionId}`);
  await expect(page).toHaveURL(new RegExp(`#${deepSectionId}$`));
  await expect(section).toHaveText('E8 — Validate Links, Rendering And Accessibility');
  await expect(section).toBeInViewport();
  expect(await page.evaluate(() => document.querySelector(':target')?.id)).toBe(
    deepSectionId
  );

  await page.reload();

  await expect(page).toHaveURL(new RegExp(`#${deepSectionId}$`));
  await expect(section).toBeInViewport();
  expect(await page.evaluate(() => document.querySelector(':target')?.id)).toBe(
    deepSectionId
  );
});

test('chapter navigation forms a keyboard-accessible persistent rail', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await resetGuideState(page);

  const sidebar = page.locator('[data-guide-sidebar]');
  const pinButton = page.locator('[data-guide-sidebar-pin]');
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'false');
  await expect(pinButton).toHaveAccessibleName('Pin learning path open');
  await expect(pinButton).toHaveAttribute('aria-pressed', 'false');
  expect((await sidebar.boundingBox())!.width).toBeGreaterThan(200);

  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith(firstChapterRoute)),
    page.getByRole('link', { name: 'The Product In Plain Language', exact: true }).click()
  ]);
  await page.mouse.move(700, 300);
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'true');
  expect((await sidebar.boundingBox())!.width).toBeLessThan(70);
  await expect(sidebar.locator('li:not(.is-current)').first()).toBeHidden();
  await expect(sidebar.locator('.is-current a')).toHaveCSS('writing-mode', 'vertical-rl');

  await sidebar.hover();
  await expect(sidebar.locator('li').last().getByRole('link')).toBeVisible();
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBeGreaterThan(200);

  await page.mouse.move(700, 300);
  await page.locator('#main-content').focus();
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? Number.POSITIVE_INFINITY)
    .toBeLessThan(70);
  await pinButton.focus();
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBeGreaterThan(200);
  await page.keyboard.press('Enter');
  await expect(pinButton).toHaveAttribute('aria-pressed', 'true');
  await expect(pinButton).toHaveAccessibleName('Unpin learning path');
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'false');
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), pinnedKey)
  ).toBe('true');

  await Promise.all([
    page.waitForURL(/02-web-and-browser-foundations\.html$/),
    page.getByRole('link', { name: 'Web And Browser Foundations', exact: true }).click()
  ]);
  await page.mouse.move(700, 300);
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-pinned', 'true');
  expect((await sidebar.boundingBox())!.width).toBeGreaterThan(200);

  await pinButton.click();
  await page.locator('#main-content').focus();
  await page.mouse.move(700, 300);
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'true');
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? Number.POSITIVE_INFINITY)
    .toBeLessThan(70);
  await page.reload();
  await page.mouse.move(700, 300);
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'true');

  const analysis = await new AxeBuilder({ page }).analyze();
  const serious = analysis.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical'
  );
  expect(serious).toEqual([]);
});

test('narrow and touch layouts keep every chapter available without the rail', async ({
  browser,
  browserDiagnostics
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 800 }
  });
  const page = await context.newPage();
  browserDiagnostics.watch(page);
  await page.goto(indexRoute);
  await page.evaluate(
    ({ pinned, collapsed }) => {
      window.localStorage.setItem(pinned, 'false');
      window.sessionStorage.setItem(collapsed, 'true');
    },
    { pinned: pinnedKey, collapsed: collapsedKey }
  );
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'false');
  await expect(page.locator('[data-guide-sidebar-pin]')).toBeHidden();
  await expect(page.locator('.guide-sidebar li').last()).toBeVisible();
  const pageWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);

  const firstChapter = page.getByRole('link', {
    name: 'The Product In Plain Language',
    exact: true
  });
  await firstChapter.scrollIntoViewIfNeeded();
  const box = await firstChapter.boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(page).toHaveURL(new RegExp(`${firstChapterRoute}$`));
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'false');

  await context.close();
});

test('a 200 per cent reflow viewport and reduced motion remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto(indexRoute);
  await page.evaluate((key) => window.sessionStorage.setItem(key, 'true'), collapsedKey);
  await page.reload();
  await page.mouse.move(700, 300);
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'true');
  expect(
    await page
      .locator('[data-guide-sidebar]')
      .evaluate((element) => getComputedStyle(element).transitionDuration)
  ).toBe('0s');

  await page.setViewportSize({ width: 640, height: 700 });
  await expect(page.locator('html')).toHaveAttribute('data-guide-sidebar-collapsed', 'false');

  const layout = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    scrollBehaviour: getComputedStyle(document.documentElement).scrollBehavior,
    pinDisplay: getComputedStyle(
      document.querySelector('.guide-sidebar__toolbar') as HTMLElement
    ).display
  }));
  expect(layout.scroll).toBeLessThanOrEqual(layout.client);
  expect(layout.scrollBehaviour).toBe('auto');
  expect(layout.pinDisplay).toBe('none');
  await expect(page.locator('.guide-sidebar li').last()).toBeVisible();
});
