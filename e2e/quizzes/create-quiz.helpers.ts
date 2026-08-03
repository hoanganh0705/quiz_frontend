/**
 * `create-quiz.helpers.ts` — shared stubbing + fixture helpers for the
 * quiz creation acceptance suite (Epic 4.8 / TKT-4.8-E3).
 *
 * Stubs the following endpoint chain required by the create-quiz flow:
 *
 * | Endpoint                          | Verb | Purpose                            |
 * |-----------------------------------|------|------------------------------------|
 * | `/api/v1/auth/me`                 | GET  | Auth bootstrap                     |
 * | `/api/v1/categories/popular`      | GET  | Category options for picker         |
 * | `/api/v1/tags/popular`            | GET  | Tag suggestions                     |
 * | `/api/v1/quizzes/:slug`           | GET  | Slug availability (404 = available) |
 * | `/api/v1/quizzes`                 | POST | Quiz creation                      |
 * | `/api/v1/tags/:slug`             | GET  | Tag resolution during submit        |
 */

import type { Page, Request } from '@playwright/test';

// ---------------------------------------------------------------------------
// Seed fixtures
// ---------------------------------------------------------------------------

export const USER_ID = '0192f4d8-4444-7000-8000-000000000001';

export const QUIZ_ID = '0192f4d8-4444-7000-8000-000000000999';
export const QUIZ_SLUG = 'test-quiz-from-e2e';

// ---------------------------------------------------------------------------
// DTO factories
// ---------------------------------------------------------------------------

function makeAuthMe() {
  return {
    data: {
      userId: USER_ID,
      username: 'e2e-creator',
      email: 'e2e@quizhub.test',
    },
  };
}

function makeCategoriesPopular() {
  return {
    data: [
      {
        rank: 1,
        categoryId: 'cat-001',
        name: 'Science',
        slug: 'science',
        imageUrl: null,
        quizCount: 42,
      },
      {
        rank: 2,
        categoryId: 'cat-002',
        name: 'History',
        slug: 'history',
        imageUrl: null,
        quizCount: 38,
      },
      {
        rank: 3,
        categoryId: 'cat-003',
        name: 'Geography',
        slug: 'geography',
        imageUrl: null,
        quizCount: 25,
      },
    ],
  };
}

function makeTagsPopular() {
  return {
    data: [
      { rank: 1, tagId: 'tag-001', name: 'Trivia', slug: 'trivia', totalScore: '100' },
      { rank: 2, tagId: 'tag-002', name: 'Beginner', slug: 'beginner', totalScore: '90' },
      { rank: 3, tagId: 'tag-003', name: 'Multiple Choice', slug: 'multiple-choice', totalScore: '80' },
      { rank: 4, tagId: 'tag-004', name: 'Pop Culture', slug: 'pop-culture', totalScore: '75' },
    ],
  };
}

function makeTag(tagId: string, name: string, slug: string) {
  return {
    data: { tagId, name, slug },
  };
}

// ---------------------------------------------------------------------------
// Stubbing helper
// ---------------------------------------------------------------------------

export interface StubCreateQuizOptions {
  /** Quiz ID returned on successful create. Defaults to `QUIZ_ID`. */
  quizId?: string;
  /** Slug returned on successful create. Defaults to `QUIZ_SLUG`. */
  quizSlug?: string;
  /**
   * Per-route failure injector. Keys are partial URL paths; values are
   * HTTP status codes. Useful for testing error flows.
   */
  failuresByPath?: Record<string, number>;
}

export interface StubHandle {
  requests: Request[];
}

export async function stubCreateQuiz(
  page: Page,
  options: StubCreateQuizOptions = {},
): Promise<StubHandle> {
  const requests: Request[] = [];

  const quizId = options.quizId ?? QUIZ_ID;
  const quizSlug = options.quizSlug ?? QUIZ_SLUG;

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
                : failureStatus === 409
                  ? 'QUIZ_SLUG_CONFLICT'
                  : failureStatus >= 500
                    ? 'GLOBAL_INTERNAL_ERROR'
                    : 'GLOBAL_BAD_REQUEST',
          },
        }),
      });
      return;
    }

    // ── Auth bootstrap ────────────────────────────────────────────────
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeAuthMe()),
      });
      return;
    }

    // ── Category options ──────────────────────────────────────────────
    if (pathname.endsWith('/categories/popular')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeCategoriesPopular()),
      });
      return;
    }

    // ── Tag suggestions ────────────────────────────────────────────────
    if (pathname.endsWith('/tags/popular')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeTagsPopular()),
      });
      return;
    }

    // ── Tag resolution (GET /tags/:slug) ───────────────────────────
    const tagSlugMatch = pathname.match(/^\/api\/v1\/tags\/([^/]+)$/);
    if (tagSlugMatch && method === 'GET') {
      const slug = tagSlugMatch[1]!;
      const tagData = makeTagsPopular().data.find((t) => t.slug === slug);
      if (tagData) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(makeTag(tagData.tagId, tagData.name, tagData.slug)),
        });
      } else {
        // Unknown tag slug → 404 (handled gracefully by useTagSlugsToIds)
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
      }
      return;
    }

    // ── Slug availability check (GET /quizzes/:slug) ───────────────
    const slugCheckMatch = pathname.match(/^\/api\/v1\/quizzes\/([^/]+)$/);
    if (slugCheckMatch && method === 'GET') {
      // 404 = slug is available (not found → no conflict)
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
      return;
    }

    // ── Quiz creation (POST /quizzes) ───────────────────────────────
    if (pathname === '/api/v1/quizzes' && method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { quizId, slug: quizSlug },
        }),
      });
      return;
    }

    // Catch-all → passthrough (let real backend handle or 404).
    await route.continue();
  });

  return { requests };
}
