/**
 * `category-follow.spec.ts` — Playwright e2e coverage for the
 * follow / unfollow surface on `/categories/[idOrSlug]`.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.F2 — E2E Playwright tests for the follow
 *                 surface (category + tag detail pages).
 *
 * The spec runs against a running dev backend (per
 * `playwright.config.ts` — the config does NOT spin up its own
 * backend). The end-to-end backend is seeded with a category whose
 * slug is `epic-mathematics` and whose entity UUID is
 * `0192f4d8-aaaa-7000-8000-000000000001`. If the seed data drifts,
 * the fixture constants in `follow.helpers.ts` can be overridden.
 *
 * ## AC #1 — Follow / unfollow happy path
 *
 *   (a) Open `/categories/<slug>` for a seeded category. Verify the
 *       follow button renders in the not-following state
 *       (`data-testid='follow-button-not-following'`).
 *   (b) Click the button. Verify the text flips to `Following`
 *       (`data-testid='follow-button-following'`).
 *   (c) Verify the `<span data-testid='follow-count'>` increments.
 *   (d) Click again to unfollow. Verify the button text reverts to
 *       `Follow` (`data-testid='follow-button-not-following'`).
 *   (e) Verify the follow-count span decrements.
 *
 * ## AC #2 — Unauthenticated state
 *
 *   (f) On a fresh page load (no auth_token cookie), the button
 *       renders with `aria-disabled='true'` and the
 *       `title='Sign in to follow'` attribute.
 *   (g) Clicking the disabled button is a no-op — no POST to
 *       `/categories/{id}/follow`.
 *
 * ## Why the stub
 *
 * The spec stubs the four backend endpoints (header detail, quiz
 * grid, follow action, membership lookup) so it runs deterministically
 * without depending on the backend's mutable state. The
 * `/users/me/followed-categories` endpoint is the canonical source
 * for both the button text and the follow-count span (D1) — toggling
 * the in-memory set on follow / unfollow POSTs lets the SWR
 * `useFollowedLookup` hook refetch and surface the new size.
 */

import { expect, test } from '@playwright/test';

import {
  CATEGORY_ID,
  CATEGORY_SLUG,
  stubCategoryFollow,
} from '../follow.helpers';

test.describe('Category follow surface (Story 3.9 / TKT-3.9.F2)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and localStorage to start from a clean state.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('(a) renders the not-following state on a fresh page load', async ({
    page,
  }) => {
    await stubCategoryFollow(page);

    await page.goto(`/categories/${CATEGORY_SLUG}`);

    // The follow button renders in the not-following state.
    const button = page.getByTestId('follow-button-not-following');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveText(/^follow$/i);
  });

  test('(b) clicking Follow flips the button to Following', async ({
    page,
  }) => {
    await stubCategoryFollow(page);

    await page.goto(`/categories/${CATEGORY_SLUG}`);

    const notFollowing = page.getByTestId('follow-button-not-following');
    await expect(notFollowing).toBeVisible();

    await notFollowing.click();

    // After the click, the button re-renders in the following state.
    const following = page.getByTestId('follow-button-following');
    await expect(following).toBeVisible();
    await expect(following).toHaveAttribute('aria-pressed', 'true');
    await expect(following).toHaveText(/^following$/i);
  });

  test('(c) clicking Follow increments the follow-count span', async ({
    page,
  }) => {
    await stubCategoryFollow(page, { initialFollowedIds: [], initialFollowCount: 0 });

    await page.goto(`/categories/${CATEGORY_SLUG}`);

    // Initial count: 0 (no followed categories seeded).
    const count = page.getByTestId('follow-count');
    await expect(count).toHaveAttribute('data-count', '0');
    await expect(count).toHaveText(/^0 followers$/);

    await page.getByTestId('follow-button-not-following').click();

    // After the click, the lookup refetches and the size increments
    // to 1.
    await expect(count).toHaveAttribute('data-count', '1');
    await expect(count).toHaveText(/^1 follower$/);
  });

  test('(d) clicking Following flips the button back to Follow', async ({
    page,
  }) => {
    await stubCategoryFollow(page, {
      initialFollowedIds: [CATEGORY_ID],
    });

    await page.goto(`/categories/${CATEGORY_SLUG}`);

    const following = page.getByTestId('follow-button-following');
    await expect(following).toBeVisible();

    await following.click();

    // After the click, the button re-renders in the not-following
    // state.
    const notFollowing = page.getByTestId('follow-button-not-following');
    await expect(notFollowing).toBeVisible();
    await expect(notFollowing).toHaveAttribute('aria-pressed', 'false');
    await expect(notFollowing).toHaveText(/^follow$/i);
  });

  test('(e) clicking Following decrements the follow-count span', async ({
    page,
  }) => {
    await stubCategoryFollow(page, {
      initialFollowedIds: [CATEGORY_ID],
      initialFollowCount: 1,
    });

    await page.goto(`/categories/${CATEGORY_SLUG}`);

    // Initial count: 1.
    const count = page.getByTestId('follow-count');
    await expect(count).toHaveAttribute('data-count', '1');
    await expect(count).toHaveText(/^1 follower$/);

    await page.getByTestId('follow-button-following').click();

    // After the click, the lookup refetches and the size decrements
    // to 0.
    await expect(count).toHaveAttribute('data-count', '0');
    await expect(count).toHaveText(/^0 followers$/);
  });

  test('(f) unauthenticated state: button is disabled with the sign-in tooltip', async ({
    page,
  }) => {
    // Stub the follow surface WITHOUT seeding an auth_token cookie.
    // The unauthenticated branch of the slot renders the disabled
    // sign-in tooltip variant.
    await stubCategoryFollow(page);

    // Block the auth bootstrap so the auth state stays
    // unauthenticated across the page load.
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          extensions: { code: 'GLOBAL_UNAUTHENTICATED' },
        }),
      });
    });
    // The membership lookup fires only when authenticated; for the
    // unauthenticated test we make it 401 too so the SWR fetch
    // fails fast (the hook short-circuits to the empty-set default
    // regardless).
    await page.route('**/api/v1/users/me/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          extensions: { code: 'GLOBAL_UNAUTHENTICATED' },
        }),
      });
    });

    await page.goto(`/categories/${CATEGORY_SLUG}`);

    // The slot renders the disabled sign-in tooltip variant.
    const button = page.getByTestId('follow-button-signin-tooltip');
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveAttribute('title', 'Sign in to follow');
  });

  test('(g) clicking the disabled sign-in button is a no-op', async ({
    page,
  }) => {
    let followPostCount = 0;

    await stubCategoryFollow(page);
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          extensions: { code: 'GLOBAL_UNAUTHENTICATED' },
        }),
      });
    });
    await page.route('**/api/v1/users/me/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          extensions: { code: 'GLOBAL_UNAUTHENTICATED' },
        }),
      });
    });
    // Track follow POSTs to verify no-op.
    await page.route('**/api/v1/categories/*/follow', async (route) => {
      if (route.request().method() === 'POST') followPostCount += 1;
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(`/categories/${CATEGORY_SLUG}`);

    const button = page.getByTestId('follow-button-signin-tooltip');
    await expect(button).toBeDisabled();
    await button.click({ force: true }); // `force: true` bypasses
    // Playwright's actionability check so we can confirm the
    // button's own disabled-state guard, not Playwright's.

    // The B2 primitive short-circuits to a no-op on click — no
    // POST hits the network.
    expect(followPostCount).toBe(0);
  });
});
