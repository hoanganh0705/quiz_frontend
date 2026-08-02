/**
 * `bookmark.helpers.ts` — shared stubbing + fixture helpers for the
 * bookmark acceptance suite (Story 3.10 / TKT-3.10.G2).
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.G2 — Browser acceptance tests for bookmark,
 *                 reload, and cross-tab flows.
 *
 * The helpers centralise the bookmark controller endpoints so the
 * acceptance spec stays focused on assertions instead of boilerplate.
 * All shapes mirror the orval-generated wire output (TKT-3.10.A1 §1 +
 * §2). The endpoints stubbed here are the ones the Story 3.10 hooks
 * actually hit; other endpoints (analytics, recent, search) are NOT
 * stubbed and will 404 against an unseeded dev backend (correct
 * behaviour — the production hooks never read them).
 *
 * ## Endpoints stubbed
 *
 * | Endpoint                                                           | Verb   | Purpose                                            |
 * |--------------------------------------------------------------------|--------|----------------------------------------------------|
 * | `/api/v1/auth/me`                                                  | GET    | Auth bootstrap (401 short-circuits to unauth)      |
 * | `/api/v1/users/me/profile` (or analogous)                          | GET    | User profile (drives the broadcast userId scope)   |
 * | `/api/v1/bookmarks/collections`                                    | GET    | Owned collections list (B1)                        |
 * | `/api/v1/bookmarks/collections/{id}`                              | GET    | Bookmarks in a collection (B3 fan-out)             |
 * | `/api/v1/bookmarks/quizzes/{quizId}/status`                        | GET    | Per-quiz status (C2 preflight)                     |
 * | `/api/v1/bookmarks/collections/{id}/quizzes`                       | POST   | Add bookmark                                       |
 * | `/api/v1/bookmarks/collections/{id}/quizzes/{quizId}`              | DELETE | Remove bookmark                                    |
 * | `/api/v1/quizzes/{idOrSlug}`                                       | GET    | Quiz detail (header data)                          |
 * | `/api/v1/quizzes/{idOrSlug}/stats`                                | GET    | Quiz stats (matters because the CTA strip rerenders) |
 * | `/api/v1/quizzes/{idOrSlug}/related`                              | GET    | Related quizzes                                   |
 *
 * The seed-data fixtures match the dev backend's seed schedule:
 * the canonical bookmarkable quiz is `epic-science-challenge`
 * (UUID `0192f4d8-1111-7000-8000-000000000001`) and the canonical
 * Favourites collection is `0192f4d8-1111-7000-8000-000000000010`.
 * Operators may override these via env if the seed data drifts.
 */

import type { Page, Request } from '@playwright/test';

// ---------------------------------------------------------------------------
// Seed fixtures
// ---------------------------------------------------------------------------

export const QUIZ_ID = '0192f4d8-1111-7000-8000-000000000001';
export const QUIZ_SLUG = 'epic-science-challenge';
export const RELATED_QUIZ_ID = '0192f4d8-2222-7000-8000-000000000002';
export const TITLE = 'Epic Science Challenge';

export const FAVOURITES_COLLECTION_ID = '0192f4d8-1111-7000-8000-000000000010';
export const ANOTHER_COLLECTION_ID = '0192f4d8-1111-7000-8000-000000000011';

export const USER_ID = '0192f4d8-3333-7000-8000-000000000001';

// ---------------------------------------------------------------------------
// DTO factories
// ---------------------------------------------------------------------------

export interface CollectionDto {
  collectionId: string;
  userId: string;
  name: string;
  description: string | null;
  quizCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkedQuizDto {
  bookmarkId: string;
  quizId: string;
  quizTitle: string;
  quizSlug: string;
  quizImageUrl: string | null;
  quizIsFeatured: boolean;
  notes: string | null;
  bookmarkedAt: string;
}

export interface QuizListItemDto {
  quizId: string;
  creatorId: string | null;
  title: string;
  description: string | null;
  slug: string;
  requirements: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  isFeatured: boolean;
  isHidden: boolean;
  isVerified: boolean;
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function makeQuizListItem(
  overrides: Partial<QuizListItemDto> = {},
): QuizListItemDto {
  return {
    quizId: QUIZ_ID,
    creatorId: null,
    title: TITLE,
    description: 'Explore the science of everyday life.',
    slug: QUIZ_SLUG,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: true,
    publishedVersionId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeCollection(
  overrides: Partial<CollectionDto> = {},
): CollectionDto {
  return {
    collectionId: FAVOURITES_COLLECTION_ID,
    userId: USER_ID,
    name: 'Favourites',
    description: null,
    quizCount: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeBookmark(
  quizId: string,
  overrides: Partial<BookmarkedQuizDto> = {},
): BookmarkedQuizDto {
  return {
    bookmarkId: `bm-${quizId}`,
    quizId,
    quizTitle: TITLE,
    quizSlug: QUIZ_SLUG,
    quizImageUrl: null,
    quizIsFeatured: false,
    notes: null,
    bookmarkedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Quiz detail stub + collection helpers (mirrors `quiz-detail.spec.ts`)
// ---------------------------------------------------------------------------

const answerOptions = [
  {
    optionId: 'option-1',
    position: 1,
    value: 'First option',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    optionId: 'option-2',
    position: 2,
    value: 'Second option',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
];

function makeQuizDetail() {
  return {
    quizId: QUIZ_ID,
    creatorId: null,
    title: TITLE,
    description: 'A short description.',
    slug: QUIZ_SLUG,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: true,
    publishedVersionId: 'version-1',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    tags: [],
    publishedVersion: {
      quizVersionId: 'version-1',
      quizId: QUIZ_ID,
      versionNumber: 1,
      status: 'published',
      difficulty: 'medium',
      durationMs: 900_000,
      passingScorePercent: 70,
      rewardXp: 50,
      creatorId: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      publishedAt: '2026-07-02T00:00:00.000Z',
      archivedAt: null,
      updatedAt: '2026-07-02T00:00:00.000Z',
      questions: [
        {
          questionId: 'question-1',
          quizVersionId: 'version-1',
          position: 1,
          questionText: 'First question',
          imageUrl: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          answerOptions,
        },
      ],
    },
  };
}

const stats = {
  quizId: QUIZ_ID,
  totalAttempts: 120,
  uniquePlayers: 95,
  averageScore: 76.5,
  averageRating: 4.4,
  bookmarkCount: 28,
  completionRate: 88,
  popularityScore: 67.2,
  trendingScore: 13.4,
};

// ---------------------------------------------------------------------------
// Stubbing options
// ---------------------------------------------------------------------------

export interface StubBookmarksOptions {
  /**
   * Initial collection list. Defaults to one Favourites collection.
   * Pass `[]` to simulate a zero-collection user (the setup prompt
   * should open).
   */
  collections?: CollectionDto[];
  /**
   * Initial membership within each collection. The map's keys are
   * `collectionId`s; the values are the lists of bookmarked quiz IDs.
   * Defaults to empty membership (the user has not bookmarked the
   * quiz yet).
   */
  initialBookmarks?: Record<string, string[]>;
  /**
   * Initial per-quiz status. Defaults to `false` / `[]`.
   */
  initialStatus?: {
    bookmarked: boolean;
    collections: Array<{ collectionId: string }>;
  };
  /**
   * Per-route failure injector. The map's keys are partial path
   * snippets (e.g. `'/quizzes'`); the value is the HTTP status to
   * return for the matching route. Non-matching routes use the
   * default happy-path stub.
   */
  failuresByPath?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Stubbing helper
// ---------------------------------------------------------------------------

/**
 * Stub the bookmark + quiz-detail endpoint chain.
 *
 * The stub maintains an in-memory `bookmarked` state per collection so
 * a click in the test produces the same observable behavior the
 * production backend would: the membership SWR cache (B3) and the
 * per-quiz status (C2) reflect the new state on the next revalidation.
 */
export interface StubHandle {
  /**
   * The list of captured `/api/v1/**` requests. Tests use this to
   * assert "no POST was made" or "exactly one POST was made" for
   * specific actions.
   */
  requests: Request[];
  /**
   * Manually mutate the membership for a given collection. Useful
   * for tests that exercise a specific seeded state mid-flight.
   */
  setMembership(collectionId: string, quizIds: string[]): void;
}

export async function stubBookmarks(
  page: Page,
  options: StubBookmarksOptions = {},
): Promise<StubHandle> {
  const requests: Request[] = [];

  const collections = options.collections ?? [makeCollection()];
  // The membership map is keyed by collectionId; the values are the
  // lists of bookmarked quiz IDs.
  const membership: Record<string, string[]> = {};
  for (const collection of collections) {
    membership[collection.collectionId] =
      options.initialBookmarks?.[collection.collectionId] ?? [];
  }

  const status = {
    bookmarked: options.initialStatus?.bookmarked ?? false,
    collections: options.initialStatus?.collections ?? [],
  };

  const failuresByPath = options.failuresByPath ?? {};

  function findFailure(urlPath: string): number | undefined {
    for (const [snippet, status] of Object.entries(failuresByPath)) {
      if (urlPath.includes(snippet)) {
        return status;
      }
    }
    return undefined;
  }

  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) {
      requests.push(request);
    }
  });

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    const failureStatus = findFailure(pathname);
    if (failureStatus !== undefined) {
      await route.fulfill({
        status: failureStatus,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: `Error ${failureStatus}`,
          status: failureStatus,
          extensions: {
            code:
              failureStatus === 429
                ? 'GLOBAL_RATE_LIMITED'
                : failureStatus === 404
                  ? 'GLOBAL_NOT_FOUND'
                  : failureStatus >= 500
                    ? 'GLOBAL_INTERNAL_ERROR'
                    : 'GLOBAL_BAD_REQUEST',
          },
        }),
      });
      return;
    }

    // /auth/me — bootstrap the auth state.
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { userId: USER_ID, username: 'acceptance', email: 'a@example.com' },
        }),
      });
      return;
    }

    // /users/me/profile (or profile-shape endpoint) — Stage 2 returned
    // shape varies; the bookmark broadcasts consume the `userId` only.
    if (pathname.includes('/users/me/profile')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { userId: USER_ID, username: 'acceptance' },
        }),
      });
      return;
    }

    // /bookmarks/collections — collections list.
    if (pathname === '/api/v1/bookmarks/collections' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: collections } }),
      });
      return;
    }

    // /bookmarks/collections/{id} — bookmarks in a collection.
    const collectionMatch = pathname.match(
      /^\/api\/v1\/bookmarks\/collections\/([^/]+)$/,
    );
    if (collectionMatch && method === 'GET') {
      const collectionId = collectionMatch[1];
      const items = (membership[collectionId] ?? []).map((quizId) =>
        makeBookmark(quizId),
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items } }),
      });
      return;
    }

    // /bookmarks/quizzes/{quizId}/status — per-quiz status.
    const statusMatch = pathname.match(
      /^\/api\/v1\/bookmarks\/quizzes\/([^/]+)\/status$/,
    );
    if (statusMatch && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: status }),
      });
      return;
    }

    // /bookmarks/collections/{id}/quizzes — POST add.
    const addMatch = pathname.match(
      /^\/api\/v1\/bookmarks\/collections\/([^/]+)\/quizzes$/,
    );
    if (addMatch && method === 'POST') {
      const collectionId = addMatch[1];
      const body = JSON.parse(route.request().postData() ?? '{}') as {
        quizId?: string;
      };
      const quizId = body.quizId ?? '';
      if (quizId) {
        const list = membership[collectionId] ?? [];
        if (!list.includes(quizId)) {
          list.push(quizId);
          membership[collectionId] = list;
        }
      }
      // Refresh the status — the quiz is now bookmarked in the
      // matched collection.
      status.bookmarked = true;
      if (!status.collections.some((c) => c.collectionId === collectionId)) {
        status.collections.push({ collectionId });
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { bookmarkId: `bm-${quizId}` } }),
      });
      return;
    }

    // /bookmarks/collections/{id}/quizzes/{quizId} — DELETE remove.
    const removeMatch = pathname.match(
      /^\/api\/v1\/bookmarks\/collections\/([^/]+)\/quizzes\/([^/]+)$/,
    );
    if (removeMatch && method === 'DELETE') {
      const collectionId = removeMatch[1];
      const quizId = removeMatch[2];
      const list = membership[collectionId] ?? [];
      const next = list.filter((id) => id !== quizId);
      membership[collectionId] = next;
      // If the quiz is no longer in ANY collection, update status.
      const stillInAny = Object.values(membership).some((ids) =>
        ids.includes(quizId),
      );
      if (!stillInAny) {
        status.bookmarked = false;
        status.collections = status.collections.filter(
          (c) => c.collectionId !== collectionId,
        );
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    // /quizzes/{idOrSlug}/related — empty related set.
    if (pathname.endsWith('/related') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }

    // /quizzes/{idOrSlug}/stats — at-least stat for the CTA strip.
    if (pathname.endsWith('/stats') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: stats }),
      });
      return;
    }

    // /quizzes/{idOrSlug} — quiz detail.
    if (pathname.startsWith('/api/v1/quizzes/') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: makeQuizDetail() }),
      });
      return;
    }

    // /quizzes/{idOrSlug}/questions — seeded question set.
    if (pathname.endsWith('/questions') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: makeQuizDetail().publishedVersion.questions }),
      });
      return;
    }

    // /quizzes (list) — empty result for the related-strip no-op.
    if (pathname.endsWith('/quizzes') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }

    // Catch-all → 404 (the production server returns 404 for any
    // unknown path; we mirror that here so the test catches a typo).
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        extensions: { code: 'GLOBAL_NOT_FOUND' },
      }),
    });
  });

  return {
    requests,
    setMembership(collectionId, quizIds) {
      membership[collectionId] = [...quizIds];
    },
  };
}

// ---------------------------------------------------------------------------
// Page-state assertions
// ---------------------------------------------------------------------------

/**
 * Wait for the quiz-detail page to render its resolved player view.
 * Mirrors `expectResolvedQuiz` in `quiz-detail.spec.ts` so the bookmark
 * tests stay isolated from quiz-detail changes.
 */
export async function expectResolvedQuizPage(page: Page) {
  await page.getByRole('heading', { level: 1, name: TITLE }).waitFor();
  await page.getByTestId('quiz-question-card').first().waitFor();
}
