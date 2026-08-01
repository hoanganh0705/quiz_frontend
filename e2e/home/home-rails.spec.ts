/**
 * `home-rails.spec.ts` — Playwright e2e coverage for the Story 3.7
 * home rails (featured / trending / popular).
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.E1.
 *
 * Seven cases lock the AC #1–AC #4 contracts:
 *
 *   (a) `/` renders all three rails with live data (AC #1).
 *   (b) Featured renders a fixed grid (no scroll) (Story 3.7 line 810).
 *   (c) Trending + popular accept an optional `categoryId` via
 *       `<HomeCategoryFilter />` (AC #1).
 *   (d) Featured does NOT receive a `cursor` parameter
 *       (Story 3.7 line 809 + TKT-3.7.A1 §3).
 *   (e) 5xx on featured does NOT blank trending + popular rails
 *       (AC #2 — per-rail error independence).
 *   (f) Empty featured rail renders the documented "Featured set is
 *       being curated" copy (Story 3.7 line 794).
 *   (g) Empty trending rail with a category filter set renders the
 *       "Show all categories" CTA (Story 3.7 line 795).
 *
 * The stubbing fixtures + endpoint constants live in
 * `home-rails.helpers.ts` so the E2 accessibility spec (E2) can
 * reuse them.
 */

import { expect, test } from '@playwright/test';

import {
  FEATURED_LIMIT,
  POPULAR_LIMIT,
  TRENDING_LIMIT,
  stubHomeRails,
} from './home-rails.helpers';

// ──────────────────────────────────────────────────────────────────────
// Assertion helpers
// ──────────────────────────────────────────────────────────────────────

async function expectAllThreeRailsResolved(page: import('@playwright/test').Page) {
  const featuredSection = page.locator(
    '[data-testid="quiz-rail"][data-layout="grid"]',
  );
  const trendingSection = page
    .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
    .nth(0);
  const popularSection = page
    .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
    .nth(1);

  await expect(featuredSection).toBeVisible();
  await expect(trendingSection).toBeVisible();
  await expect(popularSection).toBeVisible();

  await expect(
    featuredSection.getByRole('heading', { name: 'Featured' }),
  ).toBeVisible();
  await expect(
    trendingSection.getByRole('heading', { name: 'Trending' }),
  ).toBeVisible();
  await expect(
    popularSection.getByRole('heading', { name: 'Popular' }),
  ).toBeVisible();
}

// ──────────────────────────────────────────────────────────────────────
// Specs
// ──────────────────────────────────────────────────────────────────────

test.describe('Home rails (Story 3.7 / TKT-3.7.E1)', () => {
  test('(a) `/` renders all three rails with live data', async ({ page }) => {
    await stubHomeRails(page);
    await page.goto('/');

    await expectAllThreeRailsResolved(page);

    const featuredCards = page.locator(
      '[data-testid="quiz-rail"][data-layout="grid"] [data-testid="quiz-card"]',
    );
    await expect(featuredCards).toHaveCount(FEATURED_LIMIT);

    const trendingCells = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(0)
      .locator('[data-testid="quiz-rail-scroller-cell"]');
    const popularCells = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(1)
      .locator('[data-testid="quiz-rail-scroller-cell"]');
    await expect(trendingCells).toHaveCount(TRENDING_LIMIT);
    await expect(popularCells).toHaveCount(POPULAR_LIMIT);
  });

  test('(b) featured renders a fixed grid (no scroll container)', async ({ page }) => {
    await stubHomeRails(page);
    await page.goto('/');

    const featuredSection = page.locator(
      '[data-testid="quiz-rail"][data-layout="grid"]',
    );
    await expect(featuredSection).toBeVisible();

    const featuredScroller = featuredSection.locator(
      '[data-testid="quiz-rail-scroller"]',
    );
    await expect(featuredScroller).toHaveCount(0);

    await expect(
      featuredSection.getByTestId('quiz-card-grid'),
    ).toBeVisible();
  });

  test('(c) trending + popular accept an optional categoryId via the filter', async ({ page }) => {
    const { requests } = await stubHomeRails(page);
    await page.goto('/');

    const trendingFilter = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(0)
      .getByTestId('home-category-filter-trigger');
    await expect(trendingFilter).toBeVisible();

    await trendingFilter.click();
    const option = page.getByRole('option', { name: 'Category 2' });
    await expect(option).toBeVisible();
    await option.click();

    await page.waitForRequest((req) => {
      const url = new URL(req.url());
      return (
        url.pathname === '/api/v1/quizzes/trending' &&
        url.searchParams.has('categoryId')
      );
    });

    const trendingRequests = requests.filter((request) =>
      request.url().includes('/api/v1/quizzes/trending'),
    );
    expect(trendingRequests.length).toBeGreaterThanOrEqual(2);
    const filteredTrend = trendingRequests.find((req) => {
      const categoryId = new URL(req.url()).searchParams.get('categoryId');
      return categoryId !== null && categoryId !== '';
    });
    expect(filteredTrend).toBeDefined();

    const popularFilter = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(1)
      .getByTestId('home-category-filter-trigger');
    await expect(popularFilter).toBeVisible();
  });

  test('(d) featured requests do NOT include cursor or categoryId', async ({ page }) => {
    const { requests } = await stubHomeRails(page);
    await page.goto('/');

    await expectAllThreeRailsResolved(page);

    const featuredRequests = requests.filter((request) =>
      request.url().includes('/api/v1/quizzes/featured'),
    );
    expect(featuredRequests.length).toBeGreaterThanOrEqual(1);

    for (const request of featuredRequests) {
      const url = new URL(request.url());
      expect(url.searchParams.has('cursor')).toBe(false);
      expect(url.searchParams.has('categoryId')).toBe(false);
      for (const key of url.searchParams.keys()) {
        expect(['limit']).toContain(key);
      }
    }
  });

  test('(e) 5xx on featured does NOT blank trending + popular rails', async ({ page }) => {
    await stubHomeRails(page, {
      featuredStatus: 500,
      trendingStatus: 200,
      popularStatus: 200,
    });
    await page.goto('/');

    const featuredError = page.getByTestId('home-featured-rail-error');
    await expect(featuredError).toBeVisible();
    await expect(featuredError).toContainText(/Retry/i);

    const trendingRail = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(0);
    const popularRail = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(1);

    await expect(
      trendingRail.getByRole('heading', { name: 'Trending' }),
    ).toBeVisible();
    await expect(
      popularRail.getByRole('heading', { name: 'Popular' }),
    ).toBeVisible();

    await expect(
      trendingRail.locator('[data-testid="quiz-rail-scroller-cell"]'),
    ).toHaveCount(TRENDING_LIMIT);
    await expect(
      popularRail.locator('[data-testid="quiz-rail-scroller-cell"]'),
    ).toHaveCount(POPULAR_LIMIT);
  });

  test('(e′) 503 on featured also leaves trending + popular rails alive', async ({ page }) => {
    await stubHomeRails(page, {
      featuredStatus: 503,
      trendingStatus: 200,
      popularStatus: 200,
    });
    await page.goto('/');

    await expect(page.getByTestId('home-featured-rail-error')).toBeVisible();

    const trendingRail = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(0);
    const popularRail = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(1);

    await expect(
      trendingRail.locator('[data-testid="quiz-rail-scroller-cell"]'),
    ).toHaveCount(TRENDING_LIMIT);
    await expect(
      popularRail.locator('[data-testid="quiz-rail-scroller-cell"]'),
    ).toHaveCount(POPULAR_LIMIT);
  });

  test('(f) empty featured rail renders the documented "Featured set is being curated" copy', async ({ page }) => {
    await stubHomeRails(page, { featuredEmpty: true });
    await page.goto('/');

    const featuredSection = page.locator(
      '[data-testid="quiz-rail"][data-layout="grid"]',
    );
    await expect(featuredSection).toBeVisible();

    await expect(
      page.getByText(/Featured set is being curated/i),
    ).toBeVisible();
    await expect(page.getByText(/Check back soon/i)).toBeVisible();

    const trendingRail = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(0);
    const popularRail = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(1);
    await expect(
      trendingRail.locator('[data-testid="quiz-rail-scroller-cell"]'),
    ).toHaveCount(TRENDING_LIMIT);
    await expect(
      popularRail.locator('[data-testid="quiz-rail-scroller-cell"]'),
    ).toHaveCount(POPULAR_LIMIT);
  });

  test('(g) empty trending rail with a category filter set surfaces the "Show all categories" action', async ({ page }) => {
    await stubHomeRails(page, { trendingEmpty: true });
    await page.goto('/');

    const trendingFilter = page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(0)
      .getByTestId('home-category-filter-trigger');
    await expect(trendingFilter).toBeVisible();
    await trendingFilter.click();
    const option = page.getByRole('option', { name: 'Category 1' });
    await expect(option).toBeVisible();
    await option.click();

    const showAll = page.getByRole('button', { name: 'Show all categories' });
    await expect(showAll).toBeVisible();

    await showAll.click();

    await expect(
      page.getByRole('button', { name: 'Show all categories' }),
    ).toHaveCount(0);
  });

  test('only the three rails + categories endpoint are touched', async ({ page }) => {
    const { requests } = await stubHomeRails(page);
    await page.goto('/');
    await expectAllThreeRailsResolved(page);

    const apiPaths = Array.from(
      new Set(
        requests
          .map((request) => new URL(request.url()).pathname)
          .filter((p) => p.startsWith('/api/v1/')),
      ),
    ).sort();

    expect(apiPaths).toEqual([
      '/api/v1/categories/popular',
      '/api/v1/quizzes/featured',
      '/api/v1/quizzes/popular',
      '/api/v1/quizzes/trending',
    ]);
  });
});
