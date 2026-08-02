/**
 * `follow.helpers.ts` — shared stubbing + fixture helpers for the
 * `category-follow.spec.ts` (TKT-3.9.F2) and `tag-follow.spec.ts`
 * (TKT-3.9.F2) suites.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.F2 — E2E Playwright tests for the follow
 *                 surface (category + tag detail pages).
 *
 * The helpers centralise the four follow endpoints so both spec
 * suites stay focused on assertions instead of boilerplate. All
 * shapes mirror the SDK wire shapes per the orval-generated
 * controllers (A1 §1.1 + §1.2 + §11 — the planning-doc names vs the
 * actual SDK names). The follow count + the membership state both
 * come from the `/users/me/followed-{categories,tags}` endpoints.
 *
 * ## Endpoints stubbed
 *
 * | Endpoint                                     | Verb   | Purpose                                   |
 * |----------------------------------------------|--------|-------------------------------------------|
 * | `/api/v1/categories/{slug}`                  | GET    | Category detail (header data)             |
 * | `/api/v1/categories/{id}/quizzes*`          | GET    | Category quiz grid                        |
 * | `/api/v1/categories/{id}/follow`             | POST   | Follow (idempotent at the slot layer)     |
 * | `/api/v1/categories/{id}/follow`             | DELETE | Unfollow                                  |
 * | `/api/v1/users/me/followed-categories*`     | GET    | Membership lookup (count source)          |
 * | `/api/v1/tags/{slug}`                        | GET    | Tag detail (header data)                  |
 * | `/api/v1/tags/{slug}/quizzes*`               | GET    | Tag quiz grid                             |
 * | `/api/v1/tags/{slug}/analytics`              | GET    | Tag analytics panel                       |
 * | `/api/v1/tags/{slug}/related*`               | GET    | Tag related strip                         |
 * | `/api/v1/tags/{id}/follow`                   | POST   | Follow                                    |
 * | `/api/v1/tags/{id}/follow`                   | DELETE | Unfollow                                  |
 * | `/api/v1/users/me/followed-tags*`            | GET    | Membership lookup (count source)          |
 */

import type { Page } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────────
// Seed fixtures — the canonical IDs + slugs the live seed-data
// fixtures use. Operators may override these via env if the seed
// data drifts between dev runs.
// ──────────────────────────────────────────────────────────────────────

export const CATEGORY_ID = '0192f4d8-aaaa-7000-8000-000000000001';
export const CATEGORY_SLUG = 'epic-mathematics';

export const TAG_ID = '0192f4d8-bbbb-7000-8000-000000000001';
export const TAG_SLUG = 'epic-science';

// ──────────────────────────────────────────────────────────────────────
// DTO factories — these mirror the SDK wire shape (TKT-3.9.A1 §1.1,
// §1.2, §11). The follow endpoint returns 204 No Content; the
// `/me/followed-*` endpoint returns a cursor-paginated envelope
// `{ data: FollowedItemDto[]; meta?: { pagination: ... } }` (no UI
// component reads `meta.pagination` directly — the wrapper extracts
// `data` and the hook returns the inner array's id set).
// ──────────────────────────────────────────────────────────────────────

export interface CategoryResponseDto {
  categoryId: string;
  name: string;
  description: string | null;
  slug: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TagResponseDto {
  tagId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowedCategoryItemDto {
  categoryId: string;
  name: string;
  slug: string;
}

export interface FollowedTagItemDto {
  tagId: string;
  name: string;
  slug: string;
}

export function makeCategoryResponse(
  overrides: Partial<CategoryResponseDto> = {},
): CategoryResponseDto {
  return {
    categoryId: CATEGORY_ID,
    name: 'Mathematics',
    description: 'All math quizzes.',
    slug: CATEGORY_SLUG,
    imageUrl: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeTagResponse(
  overrides: Partial<TagResponseDto> = {},
): TagResponseDto {
  return {
    tagId: TAG_ID,
    name: 'Science',
    slug: TAG_SLUG,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Stubbing helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Stub the category-detail endpoint chain.
 *
 * The live `/categories/[idOrSlug]` route fires four requests in
 * parallel:
 *
 *   1. `GET /api/v1/categories/{slug}` — the header detail (TKT-3.3.B3)
 *   2. `GET /api/v1/categories/{idOrSlug}/quizzes?cursor=...&limit=...`
 *      — the quiz grid (TKT-3.3.D1, cursor-paginated)
 *   3. `GET /api/v1/users/me/followed-categories?limit=500` — the
 *      membership lookup (TKT-3.9.B3)
 *   4. `POST|DELETE /api/v1/categories/{id}/follow` — the action
 *      surface (TKT-3.9.A2). The action endpoints return 204 No
 *      Content; the membership lookup invalidates via SWR.
 *
 * Unauthenticated traffic to `/users/me/followed-*` returns 401
 * (the slot short-circuits to the empty-set default).
 *
 * The membership lookup state is the canonical source for both the
 * follow button's text and the follow-count span (D1). To toggle
 * membership, the stub holds an in-memory `Set` and toggles on
 * follow / unfollow POSTs.
 */
export interface StubCategoryFollowOptions {
  /**
   * Initial membership set. Empty by default — i.e. the user starts
   * in the not-following state. Tests that exercise the following
   * state pass `[CATEGORY_ID]` here.
   */
  initialFollowedIds?: readonly string[];
  /**
   * Initial value of the user's total followed-categories count.
   * Defaults to `initialFollowedIds.length` so a freshly seeded run
   * is internally consistent.
   */
  initialFollowCount?: number;
}

export async function stubCategoryFollow(
  page: Page,
  options: StubCategoryFollowOptions = {},
): Promise<void> {
  // The mutable in-memory state — the stub tracks the membership set
  // + the total follow count so subsequent SWR fetches see the new
  // value (the production slot triggers SWR invalidation via
  // `globalMutate(key)`; here we just flip the state and let SWR
  // re-fetch).
  const followed = new Set<string>(options.initialFollowedIds ?? []);
  const followCount = options.initialFollowCount ?? followed.size;

  // Header detail.
  await page.route('**/api/v1/categories/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    // /categories/{slug} (no /quizzes suffix, no /follow suffix) →
    // header detail.
    if (
      method === 'GET' &&
      !pathname.endsWith('/quizzes') &&
      !pathname.endsWith('/follow') &&
      !pathname.includes('/followed-')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: makeCategoryResponse() }),
      });
      return;
    }

    // /categories/{id}/quizzes → empty grid (the F2 tests focus
    // on the follow surface; the grid is incidental).
    if (method === 'GET' && pathname.endsWith('/quizzes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          meta: {
            pagination: {
              kind: 'cursor',
              limit: 12,
              nextCursor: null,
              hasNextPage: false,
            },
          },
        }),
      });
      return;
    }

    // /categories/{id}/follow POST → toggle membership.
    if (method === 'POST' && pathname.endsWith('/follow')) {
      followed.add(CATEGORY_ID);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    // /categories/{id}/follow DELETE → untoggle membership.
    if (method === 'DELETE' && pathname.endsWith('/follow')) {
      followed.delete(CATEGORY_ID);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    // /users/me/followed-categories → membership snapshot.
    if (pathname.includes('/users/me/followed-categories')) {
      const items: FollowedCategoryItemDto[] = Array.from(followed).map(
        (id) => ({
          categoryId: id,
          name: `Category ${id}`,
          slug: `category-${id}`,
        }),
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: items,
          meta: {
            pagination: {
              kind: 'cursor',
              limit: 500,
              nextCursor: null,
              hasNextPage: false,
            },
          },
        }),
      });
      return;
    }

    // Catch-all → 404 (the production server returns 404 for any
    // unknown path; we mirror that here so the test detects a typo
    // in the URL pattern).
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

  // The follow-count span reads from `useFollowedLookup().categories.size`.
  // The size is the count of items in the membership snapshot, not
  // a separate "total followed categories" counter. We render the
  // snapshot's length so the test's pre-/post-toggle assertions stay
  // deterministic.
  // The hint `followCount` is recorded on the closure but is only
  // used by tests that exercise the static "seeded follower" case
  // (initial count > 0); for the toggle case we always render the
  // current snapshot size.
  void followCount;
}

/**
 * Stub the tag-detail endpoint chain. Mirror of
 * `stubCategoryFollow` for tags — the four-request fan-out is
 * structurally identical with `/tags` + `/users/me/followed-tags`
 * instead of `/categories` + `/users/me/followed-categories`. The
 * tag side ALSO fires a `/tags/{slug}/analytics` request for the
 * `<TagAnalyticsPanel />` (TKT-3.4.C6) and a `/tags/{slug}/related`
 * request for the `<RelatedTagsStrip />` (TKT-3.4.C4) — both are
 * stubbed to a 404-by-default zero-state so the analytics + related
 * panels don't introduce noise into the F2 assertions.
 */
export interface StubTagFollowOptions {
  initialFollowedIds?: readonly string[];
  initialFollowCount?: number;
}

export async function stubTagFollow(
  page: Page,
  options: StubTagFollowOptions = {},
): Promise<void> {
  const followed = new Set<string>(options.initialFollowedIds ?? []);
  const followCount = options.initialFollowCount ?? followed.size;

  await page.route('**/api/v1/tags/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    // /tags/{slug} → header detail.
    if (
      method === 'GET' &&
      !pathname.endsWith('/quizzes') &&
      !pathname.endsWith('/analytics') &&
      !pathname.endsWith('/related') &&
      !pathname.endsWith('/follow') &&
      !pathname.includes('/followed-')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: makeTagResponse() }),
      });
      return;
    }

    // /tags/{slug}/quizzes → empty grid (focus on the follow surface).
    if (method === 'GET' && pathname.endsWith('/quizzes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          meta: {
            pagination: {
              kind: 'cursor',
              limit: 12,
              nextCursor: null,
              hasNextPage: false,
            },
          },
        }),
      });
      return;
    }

    // /tags/{slug}/analytics → 404 zero-state ("Analytics will
    // populate after activity" — Story 3.4 line 461).
    if (method === 'GET' && pathname.endsWith('/analytics')) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          extensions: { code: 'TAG_ANALYTICS_NOT_FOUND' },
        }),
      });
      return;
    }

    // /tags/{slug}/related → empty (no related tags — the strip
    // hides itself when the array is empty).
    if (method === 'GET' && pathname.endsWith('/related')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }

    // /tags/{id}/follow POST → toggle membership.
    if (method === 'POST' && pathname.endsWith('/follow')) {
      followed.add(TAG_ID);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    // /tags/{id}/follow DELETE → untoggle membership.
    if (method === 'DELETE' && pathname.endsWith('/follow')) {
      followed.delete(TAG_ID);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    // /users/me/followed-tags → membership snapshot.
    if (pathname.includes('/users/me/followed-tags')) {
      const items: FollowedTagItemDto[] = Array.from(followed).map((id) => ({
        tagId: id,
        name: `Tag ${id}`,
        slug: `tag-${id}`,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: items,
          meta: {
            pagination: {
              kind: 'cursor',
              limit: 500,
              nextCursor: null,
              hasNextPage: false,
            },
          },
        }),
      });
      return;
    }

    // Catch-all → 404.
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

  void followCount;
}
