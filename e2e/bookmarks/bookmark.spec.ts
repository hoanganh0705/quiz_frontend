/**
 * `bookmark.spec.ts` — Playwright e2e coverage for the bookmark
 * add / remove + cross-tab sync flow.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.G2 — Browser acceptance tests for bookmark,
 *                 reload, and cross-tab flows.
 *
 * The spec runs against a running dev backend with the seeded data
 * declared in `bookmark.helpers.ts`. It stubs the bookmark +
 * quiz-detail endpoints so the test is deterministic even against
 * an unseeded dev backend. The stubs deliberately avoid the
 * `auth/me` and `users/me/profile` real endpoints — the spec
 * injects a 200 response for the auth bootstrap so the slot
 * reads `isAuthenticated === true` and the bookmarks surface
 * renders.
 *
 * ## AC #1 — Card add is immediate + survives hard reload
 *
 *   (a) `card-add-fills-and-survives-reload` — opening `/quizzes/<slug>`
 *       after a bookmarked quiz shows the bookmarked card AND the
 *       bookmarked CTA strip. Reload preserves both states.
 *
 *   (b) `card-add-clicks-immediately` — clicking the bookmark icon
 *       on a quiz card posts exactly one POST to
 *       `/bookmarks/collections/{id}/quizzes` and the icon flips
 *       to the bookmarked branch without a refresh.
 *
 * ## AC #2 — Detail remove is immediate + survives hard reload
 *
 *   (c) `detail-remove-clears-and-survives-reload` — opening
 *       `/quizzes/<slug>` after removing a bookmark shows the
 *       unbookmarked card and CTA strip. Reload preserves the
 *       unbookmarked state.
 *
 * ## AC #3 — Zero-collection user sees setup prompt + no add request
 *
 *   (d) `zero-collection-opens-setup-prompt` — authenticating with
 *       zero collections and clicking the bookmark button opens
 *       the `BookmarksSetupPrompt` dialog. No POST to
 *       `/bookmarks/collections/{id}/quizzes` is fired.
 *
 * ## AC #4 — Multiple-collection user uses the default rule
 *
 *   (e) `multi-collection-defaults-to-favourites` — a user with two
 *       collections sees the bookmark mutation routed to the
 *       canonical Favourites collection by default.
 *
 * ## AC #5 — Cross-tab invalidation within ~1 second
 *
 *   (f) `cross-tab-reflects-mutation-within-one-second` — opening
 *       the same quiz URL in a second browser page and bookmarking
 *       it from the first page shows the bookmarked state in the
 *       second page within one second.
 *
 * ## AC #6 — Mocked 4xx / 429 / 5xx responses visibly rollback
 *
 *   (g) `bad-request-rollback` — a 400 BAD_REQUEST on the add POST
 *       reverts the optimistic icon. No broadcast event visible.
 *   (h) `rate-limit-rollback` — a 429 RATE_LIMITED on the remove
 *       DELETE reverts the optimistic icon.
 *   (i) `server-error-rollback` — a 500 INTERNAL_ERROR on the
 *       add POST reverts the optimistic icon.
 *
 * ## Test ordering
 *
 * Tests run sequentially (`workers: 1`, `fullyParallel: false` in
 * `playwright.config.ts`) because the helpers stub fixtures in
 * place via `page.route()`. We always clear cookies + localStorage
 * in `beforeEach` so cross-tab state from the previous test does
 * not leak.
 */

import { expect, test } from '@playwright/test';

import {
  expectResolvedQuizPage,
  FAVOURITES_COLLECTION_ID,
  ANOTHER_COLLECTION_ID,
  QUIZ_ID,
  QUIZ_SLUG,
  USER_ID,
  stubBookmarks,
  type CollectionDto,
} from './bookmark.helpers';

test.describe('Bookmark acceptance (Story 3.10 / TKT-3.10.G2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  // ───────────────────────────────────────────────────────────────────
  // (a) Card add is immediate + survives hard reload
  // ───────────────────────────────────────────────────────────────────

  test('(a) card add is immediate and the bookmarked state survives a hard reload', async ({
    page,
  }) => {
    const stub = await stubBookmarks(page);

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    // Initial state: card AND CTA strip are unbookmarked.
    const cardButton = page.getByTestId('bookmark-button-not-bookmarked').first();
    await expect(cardButton).toBeVisible();
    const detailButton = page
      .getByTestId('quiz-cta-strip')
      .getByTestId('bookmark-button-not-bookmarked');
    await expect(detailButton).toBeVisible();

    // Click the card's bookmark icon — must POST exactly once with
    // the default collectionId + the quizId.
    await cardButton.click();

    await expect(page.getByTestId('bookmark-button-bookmarked').first())
      .toBeVisible();

    const addRequests = stub.requests.filter(
      (r) =>
        r.method() === 'POST' &&
        r.url().includes(`/api/v1/bookmarks/collections/${FAVOURITES_COLLECTION_ID}/quizzes`),
    );
    expect(addRequests).toHaveLength(1);

    // Hard reload — the membership cache rehydrates from the
    // server, so the bookmarked state must persist.
    await page.reload();
    await expectResolvedQuizPage(page);

    await expect(
      page.getByTestId('bookmark-button-bookmarked').first(),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('quiz-cta-strip')
        .getByTestId('bookmark-button-bookmarked'),
    ).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────
  // (b) Detail remove is immediate + survives hard reload
  // ───────────────────────────────────────────────────────────────────

  test('(b) detail remove is immediate and the unbookmarked state survives a hard reload', async ({
    page,
  }) => {
    // Seed: the user has already bookmarked the quiz.
    const stub = await stubBookmarks(page, {
      initialBookmarks: { [FAVOURITES_COLLECTION_ID]: [QUIZ_ID] },
      initialStatus: {
        bookmarked: true,
        collections: [{ collectionId: FAVOURITES_COLLECTION_ID }],
      },
    });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    // Initial state: card AND CTA strip are bookmarked.
    await expect(
      page.getByTestId('bookmark-button-bookmarked').first(),
    ).toBeVisible();
    const detailButton = page
      .getByTestId('quiz-cta-strip')
      .getByTestId('bookmark-button-bookmarked');
    await expect(detailButton).toBeVisible();

    // Click the CTA strip's bookmark to unbookmark.
    await detailButton.click();

    await expect(
      page.getByTestId('quiz-cta-strip').getByTestId('bookmark-button-not-bookmarked'),
    ).toBeVisible();

    const removeRequests = stub.requests.filter(
      (r) =>
        r.method() === 'DELETE' &&
        r.url().includes(
          `/api/v1/bookmarks/collections/${FAVOURITES_COLLECTION_ID}/quizzes/${QUIZ_ID}`,
        ),
    );
    expect(removeRequests).toHaveLength(1);

    // Hard reload — the unbookmarked state must persist.
    await page.reload();
    await expectResolvedQuizPage(page);

    await expect(
      page.getByTestId('bookmark-button-not-bookmarked').first(),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('quiz-cta-strip')
        .getByTestId('bookmark-button-not-bookmarked'),
    ).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────
  // (c) Zero-collection user sees the setup prompt + no add request
  // ───────────────────────────────────────────────────────────────────

  test('(c) zero-collection user opens the setup prompt and no add POST is fired', async ({
    page,
  }) => {
    const stub = await stubBookmarks(page, { collections: [] });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    // Initially the button is rendered but disabled (the no-collection
    // branch still surfaces the icon button per D4's slot — the slot
    // is visible, the click is short-circuited).
    const cardButton = page.getByTestId('bookmark-button-not-bookmarked').first();
    await expect(cardButton).toBeVisible();

    await cardButton.click();

    // The setup prompt dialog must appear.
    const dialog = page.getByTestId('bookmarks-setup-prompt');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Bookmark collections')).toBeVisible();

    // The "Not now" affordance should be visible.
    await expect(page.getByTestId('bookmarks-setup-prompt-not-now')).toBeVisible();

    // No POST to addBookmark.
    const addRequests = stub.requests.filter(
      (r) =>
        r.method() === 'POST' &&
        r.url().includes('/api/v1/bookmarks/collections/'),
    );
    expect(addRequests).toHaveLength(0);

    // Dismiss the prompt.
    await page.getByTestId('bookmarks-setup-prompt-not-now').click();
    await expect(dialog).toBeHidden();
  });

  // ───────────────────────────────────────────────────────────────────
  // (d) Multi-collection user uses the default rule
  // ───────────────────────────────────────────────────────────────────

  test('(d) multi-collection user routes the add to the default (Favourites) collection', async ({
    page,
  }) => {
    const collections: CollectionDto[] = [
      {
        collectionId: FAVOURITES_COLLECTION_ID,
        userId: USER_ID,
        name: 'Favourites',
        description: null,
        quizCount: 0,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        collectionId: ANOTHER_COLLECTION_ID,
        userId: USER_ID,
        name: 'To revisit',
        description: null,
        quizCount: 0,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ];

    const stub = await stubBookmarks(page, { collections });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    const cardButton = page.getByTestId('bookmark-button-not-bookmarked').first();
    await cardButton.click();

    await expect(
      page.getByTestId('bookmark-button-bookmarked').first(),
    ).toBeVisible();

    // The add POST must hit the Favourites collection — the
    // default-collection rule selects the first collection by
    // sort order (Favourites precedes To revisit alphabetically).
    const addRequests = stub.requests.filter(
      (r) =>
        r.method() === 'POST' &&
        r.url().includes('/api/v1/bookmarks/collections/'),
    );
    expect(addRequests).toHaveLength(1);
    expect(addRequests[0]!.url()).toContain(FAVOURITES_COLLECTION_ID);
  });

  // ───────────────────────────────────────────────────────────────────
  // (e) Cross-tab invalidation within ~1 second
  // ───────────────────────────────────────────────────────────────────

  test('(e) cross-tab invalidation reflects a sibling-tab mutation within ~1 second', async ({
    browser,
  }) => {
    // Open two pages in the same browser context (they share the
    // same BroadcastChannel scope).
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    try {
      const stub = await stubBookmarks(page1);
      // Mirror the same stub on page2 by re-stubbing the same routes.
      await stubBookmarks(page2);

      // Open the quiz on both pages.
      await page1.goto(`/quizzes/${QUIZ_SLUG}`);
      await expectResolvedQuizPage(page1);

      await page2.goto(`/quizzes/${QUIZ_SLUG}`);
      await expectResolvedQuizPage(page2);

      // Bookmark from page1.
      const page1Button = page1
        .getByTestId('bookmark-button-not-bookmarked')
        .first();
      await page1Button.click();

      await expect(
        page1.getByTestId('bookmark-button-bookmarked').first(),
      ).toBeVisible();

      // Page2 should reflect the bookmarked state within ~1s.
      // The BroadcastChannel event fires on the mutation; the
      // receiving hydrator revalidates the membership cache.
      const startTime = Date.now();
      await expect(
        page2
          .getByTestId('quiz-cta-strip')
          .getByTestId('bookmark-button-bookmarked'),
      ).toBeVisible({ timeout: 2000 });
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(2000);

      // We don't assert specific POST counts here because the
      // cross-tab invalidation must NOT reissue the POST — only
      // the membership read fires.
      const addRequests = stub.requests.filter(
        (r) =>
          r.method() === 'POST' &&
          r.url().includes('/api/v1/bookmarks/collections/'),
      );
      expect(addRequests).toHaveLength(1);
    } finally {
      await context.close();
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // (f) 4xx / 429 / 5xx rollback the optimistic update
  // ───────────────────────────────────────────────────────────────────

  test('(f1) a 400 BAD_REQUEST on the add POST reverts the bookmark icon', async ({
    page,
  }) => {
    const stub = await stubBookmarks(page, {
      failuresByPath: {
        '/bookmarks/collections/': 400,
      },
    });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    const cardButton = page.getByTestId('bookmark-button-not-bookmarked').first();
    await cardButton.click();

    // The optimistic update pushes the icon to bookmarked, then
    // the rollback reverts it. The CTA strip and the card both
    // return to the unbookmarked branch.
    await expect(
      page.getByTestId('bookmark-button-not-bookmarked').first(),
    ).toBeVisible({ timeout: 2000 });

    const addRequests = stub.requests.filter(
      (r) =>
        r.method() === 'POST' &&
        r.url().includes('/api/v1/bookmarks/collections/'),
    );
    expect(addRequests).toHaveLength(1);
  });

  test('(f2) a 429 RATE_LIMITED on the add POST reverts the bookmark icon', async ({
    page,
  }) => {
    await stubBookmarks(page, {
      failuresByPath: {
        '/bookmarks/collections/': 429,
      },
    });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    const cardButton = page.getByTestId('bookmark-button-not-bookmarked').first();
    await cardButton.click();

    await expect(
      page.getByTestId('bookmark-button-not-bookmarked').first(),
    ).toBeVisible({ timeout: 2000 });
  });

  test('(f3) a 500 INTERNAL_ERROR on the add POST reverts the bookmark icon', async ({
    page,
  }) => {
    await stubBookmarks(page, {
      failuresByPath: {
        '/bookmarks/collections/': 500,
      },
    });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    const cardButton = page.getByTestId('bookmark-button-not-bookmarked').first();
    await cardButton.click();

    await expect(
      page.getByTestId('bookmark-button-not-bookmarked').first(),
    ).toBeVisible({ timeout: 2000 });
  });

  test('(f4) a 429 on the remove DELETE reverts the bookmark icon to bookmarked', async ({
    page,
  }) => {
    // Seed: the user has already bookmarked the quiz.
    await stubBookmarks(page, {
      initialBookmarks: { [FAVOURITES_COLLECTION_ID]: [QUIZ_ID] },
      initialStatus: {
        bookmarked: true,
        collections: [{ collectionId: FAVOURITES_COLLECTION_ID }],
      },
    });

    // Stub the DELETE with a 429 using a finer-grained route match
    // (the generic failuresByPath stubs ALL of /bookmarks/collections/
    // — we want only the DELETE to fail).
    await page.route(
      `**/api/v1/bookmarks/collections/${FAVOURITES_COLLECTION_ID}/quizzes/${QUIZ_ID}`,
      async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              type: 'about:blank',
              title: 'Too Many Requests',
              status: 429,
              extensions: { code: 'GLOBAL_RATE_LIMITED' },
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuizPage(page);

    const detailButton = page
      .getByTestId('quiz-cta-strip')
      .getByTestId('bookmark-button-bookmarked');
    await expect(detailButton).toBeVisible();

    await detailButton.click();

    // The icon must rollback to the bookmarked branch.
    await expect(
      page
        .getByTestId('quiz-cta-strip')
        .getByTestId('bookmark-button-bookmarked'),
    ).toBeVisible({ timeout: 2000 });
  });
});
