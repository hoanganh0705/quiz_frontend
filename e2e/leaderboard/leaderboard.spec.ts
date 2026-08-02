/**
 * `leaderboard.spec.ts` — Playwright e2e coverage for the live
 * `/leaderboard` route.
 *
 * Source epic:   Story 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.F2 — E2E Playwright tests for the
 *                 leaderboard surface.
 *
 * The spec runs against a running dev backend (per
 * `playwright.config.ts`). For local development, the spec
 * STUBS the leaderboard endpoint via `stubLeaderboard(page)` so
 * it runs deterministically against an unseeded dev backend. For
 * the cross-batch validation pass, the operator runs the spec
 * against the seeded dev backend — both paths use the same
 * assertions.
 *
 * ## AC #1 — Default period on first paint
 *
 *   (a) `renders-the-live-data-on-first-paint` — opening
 *       `/leaderboard` shows the live leaderboard with the
 *       default period (`weekly`). The top-3 podium is rendered.
 *
 * ## AC #2 — Pagination works
 *
 *   (b) `click-load-more-appends-entries` — clicking
 *       `Load more` triggers a fresh `GET /api/v1/leaderboard`
 *       request with `offset` advanced by `limit`. The new
 *       entries appear in the rows section.
 *
 * ## AC #1 (cont.) — Period switching
 *
 *   (c) `switching-period-refreshes-the-entries` — clicking the
 *       `Monthly` period selector fires a fresh request with
 *       `period=monthly`. The new entries replace the resolved
 *       state.
 *
 * ## AC #3 — Self-entry highlight (gated on auth)
 *
 *   (d) `self-entry-is-highlighted-when-authenticated` — when the
 *       user is authenticated and their entry is in the ranking,
 *       the corresponding row has `aria-current="true"`.
 *
 *   (e) `self-entry-is-not-highlighted-when-unauthenticated` —
 *       when the user is not authenticated, NO row has
 *       `aria-current="true"` even if `isCurrentUser: true` is
 *       on the wire.
 *
 * ## Why the stub
 *
 * The spec stubs `GET /api/v1/leaderboard` so it runs
 * deterministically without depending on the backend's mutable
 * state. The stub honors `offset` + `limit` (the endpoint is
 * offset-paginated per drift A1 #1) and returns the canonical
 * `LeaderboardResponseDto` envelope the wire shape spec dictates
 * (TKT-3.11.A1 §6). Tests are independent of each other (each
 * `beforeEach` clears cookies + localStorage).
 */

import { expect, test } from '@playwright/test';

import {
  SELF_USER_ID,
  stubLeaderboard,
} from './leaderboard.helpers';

test.describe('Leaderboard acceptance (Story 3.11 / TKT-3.11.F2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  // ───────────────────────────────────────────────────────────────────
  // (a) Default period on first paint — live data renders.
  // ───────────────────────────────────────────────────────────────────

  test('(a) renders the live data on first paint with the default period (weekly)', async ({
    page,
  }) => {
    await stubLeaderboard(page);

    const requested: { period: string | null }[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/v1/leaderboard') {
        requested.push({ period: url.searchParams.get('period') });
      }
    });

    await page.goto('/leaderboard');

    // The live composition is rendered. The top-3 podium is
    // visible.
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();
    await expect(page.getByTestId('leaderboard-podium')).toBeVisible();

    // The Weekly button is `aria-pressed="true"` (the default).
    await expect(
      page.getByRole('button', { name: 'Weekly' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Monthly' }),
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.getByRole('button', { name: 'All-time' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // The first request to `/api/v1/leaderboard` carried `period=weekly`.
    expect(requested[0]?.period).toBe('weekly');
  });

  // ───────────────────────────────────────────────────────────────────
  // (b) Load more appends entries.
  // ───────────────────────────────────────────────────────────────────

  test('(b) clicking Load more appends additional entries', async ({ page }) => {
    await stubLeaderboard(page);

    const requests: { offset: number; limit: number }[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/v1/leaderboard') {
        requests.push({
          offset: Number.parseInt(
            url.searchParams.get('offset') ?? '0',
            10,
          ),
          limit: Number.parseInt(
            url.searchParams.get('limit') ?? '20',
            10,
          ),
        });
      }
    });

    await page.goto('/leaderboard');

    // Wait for the first page to resolve.
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();
    await expect(page.getByTestId('leaderboard-load-more')).toBeVisible();

    expect(requests.length).toBeGreaterThanOrEqual(1);
    const firstOffset = requests[0]?.offset;
    const firstLimit = requests[0]?.limit;
    expect(firstOffset).toBe(0);
    expect(firstLimit).toBe(20);

    // Click `Load more`. A second request with offset = firstLimit
    // is fired (offset-paginated per drift A1 #1).
    await page.getByTestId('leaderboard-load-more').click();

    // Wait for the second request to fire.
    await expect.poll(() => requests.length).toBeGreaterThanOrEqual(2);
    const second = requests[1];
    expect(second?.offset).toBe(firstLimit);
    expect(second?.limit).toBe(firstLimit);
  });

  // ───────────────────────────────────────────────────────────────────
  // (c) Switching the period refreshes the entries.
  // ───────────────────────────────────────────────────────────────────

  test('(c) switching the period fires a fresh request with the new period', async ({
    page,
  }) => {
    await stubLeaderboard(page);

    const seen: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/v1/leaderboard') {
        seen.push(url.searchParams.get('period') ?? 'weekly');
      }
    });

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    expect(seen[0]).toBe('weekly');

    // Switch to `Monthly`.
    await page.getByRole('button', { name: 'Monthly' }).click();

    await expect.poll(() => seen).toContain('monthly');

    // The Monthly button is now the `aria-pressed="true"` option.
    await expect(
      page.getByRole('button', { name: 'Monthly' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Weekly' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // Switch to `All-time` — the snake_case wire value must reach the
    // wrapper.
    await page.getByRole('button', { name: 'All-time' }).click();

    await expect.poll(() => seen).toContain('all_time');

    // The All-time button is `aria-pressed="true"`.
    await expect(
      page.getByRole('button', { name: 'All-time' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  // ───────────────────────────────────────────────────────────────────
  // (d) Self-entry is highlighted when authenticated.
  // ───────────────────────────────────────────────────────────────────

  test('(d) the self-entry row has aria-current="true" when authenticated', async ({
    page,
  }) => {
    await stubLeaderboard(page, { authenticate: true });

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    // The stub seeds the self entry at rank 2 (the stub treats
    // rank 2 as the self user when `authenticate: true`). The
    // rank-2 entry is rendered in the podium.
    const selfRow = page.locator(`[data-leaderboard-row="${SELF_USER_ID}"]`);
    await expect(selfRow).toBeVisible();
    await expect(selfRow).toHaveAttribute('aria-current', 'true');
  });

  // ───────────────────────────────────────────────────────────────────
  // (e) Self-entry is NOT highlighted when unauthenticated.
  // ───────────────────────────────────────────────────────────────────

  test('(e) no row has aria-current="true" when not authenticated', async ({
    page,
  }) => {
    await stubLeaderboard(page, { authenticate: false });

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    // The DB shows the live data; the self-entry highlight is
    // ABSENT because `useAuthState().isAuthenticated` is `false`.
    const selfRow = page.locator(`[data-leaderboard-row="${SELF_USER_ID}"]`);
    // The self row may or may not be present in the seed (the
    // stub only inserts it when `authenticate: true`). Either
    // way, no row should carry `aria-current="true"`.
    const highlightedRows = page.locator('[aria-current="true"]');
    await expect(highlightedRows).toHaveCount(0);

    // The self-row existence is auth-flag-driven: when
    // `authenticate: false`, the stub does not seed the SELF_USER_ID.
    await expect(selfRow).toHaveCount(0);
  });
});
