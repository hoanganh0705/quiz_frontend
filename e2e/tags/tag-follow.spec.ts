/**
 * `tag-follow.spec.ts` — Playwright e2e coverage for the
 * follow / unfollow surface on `/tags/[slug]`.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.F2 — E2E Playwright tests for the follow
 *                 surface (category + tag detail pages).
 *
 * Mirror of `category-follow.spec.ts` for tags. The tag detail
 * page renders the same `<TagFollowButtonSlot />` next to the
 * `<TagHeader />` (TKT-3.9.C2). The follow-count span is sourced
 * from `useFollowedLookup().tags.size` (D1).
 *
 * The spec runs against a running dev backend with seeded data.
 * The seeded tag's slug is `epic-science` and its entity UUID is
 * `0192f4d8-bbbb-7000-8000-000000000001`. The fixture constants in
 * `follow.helpers.ts` can be overridden if the seed data drifts.
 *
 * ## AC #1 — Follow / unfollow happy path
 *
 *   (a) Open `/tags/<slug>` for a seeded tag. Verify the follow
 *       button renders in the not-following state
 *       (`data-testid='follow-button-not-following'`).
 *   (b) Click the button. Verify the text flips to `Following`.
 *   (c) Verify the `<span data-testid='follow-count'>` increments.
 *   (d) Click again to unfollow. Verify the button text reverts.
 *   (e) Verify the follow-count span decrements.
 *
 * ## AC #2 — Unauthenticated state
 *
 *   (f) On a fresh page load (no auth_token cookie), the button
 *       renders with `aria-disabled='true'` and the
 *       `title='Sign in to follow'` attribute.
 *   (g) Clicking the disabled button is a no-op — no POST to
 *       `/tags/{id}/follow`.
 */

import { expect, test } from '@playwright/test';

import { TAG_ID, TAG_SLUG, stubTagFollow } from '../follow.helpers';

test.describe('Tag follow surface (Story 3.9 / TKT-3.9.F2)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and localStorage to start from a clean state.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('(a) renders the not-following state on a fresh page load', async ({
    page,
  }) => {
    await stubTagFollow(page);

    await page.goto(`/tags/${TAG_SLUG}`);

    const button = page.getByTestId('follow-button-not-following');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveText(/^follow$/i);
  });

  test('(b) clicking Follow flips the button to Following', async ({
    page,
  }) => {
    await stubTagFollow(page);

    await page.goto(`/tags/${TAG_SLUG}`);

    const notFollowing = page.getByTestId('follow-button-not-following');
    await expect(notFollowing).toBeVisible();

    await notFollowing.click();

    const following = page.getByTestId('follow-button-following');
    await expect(following).toBeVisible();
    await expect(following).toHaveAttribute('aria-pressed', 'true');
    await expect(following).toHaveText(/^following$/i);
  });

  test('(c) clicking Follow increments the follow-count span', async ({
    page,
  }) => {
    await stubTagFollow(page, {
      initialFollowedIds: [],
      initialFollowCount: 0,
    });

    await page.goto(`/tags/${TAG_SLUG}`);

    const count = page.getByTestId('follow-count');
    await expect(count).toHaveAttribute('data-count', '0');
    await expect(count).toHaveText(/^0 followers$/);

    await page.getByTestId('follow-button-not-following').click();

    await expect(count).toHaveAttribute('data-count', '1');
    await expect(count).toHaveText(/^1 follower$/);
  });

  test('(d) clicking Following flips the button back to Follow', async ({
    page,
  }) => {
    await stubTagFollow(page, {
      initialFollowedIds: [TAG_ID],
    });

    await page.goto(`/tags/${TAG_SLUG}`);

    const following = page.getByTestId('follow-button-following');
    await expect(following).toBeVisible();

    await following.click();

    const notFollowing = page.getByTestId('follow-button-not-following');
    await expect(notFollowing).toBeVisible();
    await expect(notFollowing).toHaveAttribute('aria-pressed', 'false');
    await expect(notFollowing).toHaveText(/^follow$/i);
  });

  test('(e) clicking Following decrements the follow-count span', async ({
    page,
  }) => {
    await stubTagFollow(page, {
      initialFollowedIds: [TAG_ID],
      initialFollowCount: 1,
    });

    await page.goto(`/tags/${TAG_SLUG}`);

    const count = page.getByTestId('follow-count');
    await expect(count).toHaveAttribute('data-count', '1');
    await expect(count).toHaveText(/^1 follower$/);

    await page.getByTestId('follow-button-following').click();

    await expect(count).toHaveAttribute('data-count', '0');
    await expect(count).toHaveText(/^0 followers$/);
  });

  test('(f) unauthenticated state: button is disabled with the sign-in tooltip', async ({
    page,
  }) => {
    await stubTagFollow(page);

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

    await page.goto(`/tags/${TAG_SLUG}`);

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

    await stubTagFollow(page);
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
    await page.route('**/api/v1/tags/*/follow', async (route) => {
      if (route.request().method() === 'POST') followPostCount += 1;
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(`/tags/${TAG_SLUG}`);

    const button = page.getByTestId('follow-button-signin-tooltip');
    await expect(button).toBeDisabled();
    await button.click({ force: true });

    expect(followPostCount).toBe(0);
  });
});
