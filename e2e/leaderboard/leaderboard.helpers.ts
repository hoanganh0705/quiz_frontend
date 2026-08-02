/**
 * `leaderboard.helpers.ts` — shared stubbing + fixture helpers for the
 * leaderboard acceptance suite (Story 3.11 / TKT-3.11.F2).
 *
 * Source epic:   Story 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.F2.
 *
 * The helpers centralise the leaderboard endpoint so the acceptance
 * spec stays focused on assertions instead of boilerplate. All
 * shapes mirror the orval-generated wire output (TKT-3.11.A1 §1 +
 * §2). The endpoint stubbed here is the one Story 3.11 actually
 * hits — `GET /api/v1/leaderboard`. The endpoint is offset-paginated
 * (drift A1 #1) — the SWR key includes the period, the hook
 * advances the offset on load-more.
 *
 * ## Endpoints stubbed
 *
 * | Endpoint                                                | Verb | Purpose                                          |
 * |---------------------------------------------------------|------|--------------------------------------------------|
 * | `/api/v1/leaderboard?period=...&offset=...&limit=...`   | GET  | The global leaderboard (offset-paginated).       |
 *
 * Both authenticated and unauthenticated modes are supported. The
 * self-entry highlight requires the request to be authenticated —
 * when authenticated, the stub sets `isCurrentUser: true` on the
 * entry whose `userId` matches `SELF_USER_ID`. The membership
 * signal is the canonical source of the highlight (drift A1 #3 —
 * `userPosition` is always `null` on the public variant).
 */

import type { Page } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────────
// Seed fixtures
// ──────────────────────────────────────────────────────────────────────

export const SELF_USER_ID = '0192f4d8-cccc-7000-8000-000000000001';

const RAW_USER_IDS = [
  '0192f4d8-aaaa-7000-8000-000000000001',
  '0192f4d8-aaaa-7000-8000-000000000002',
  '0192f4d8-aaaa-7000-8000-000000000003',
  '0192f4d8-aaaa-7000-8000-000000000004',
  '0192f4d8-aaaa-7000-8000-000000000005',
  '0192f4d8-aaaa-7000-8000-000000000006',
  '0192f4d8-aaaa-7000-8000-000000000007',
  '0192f4d8-aaaa-7000-8000-000000000008',
];

export const RAW_TOP_USER_IDS = RAW_USER_IDS.slice(0, 8);
export const RAW_NEXT_PAGE_USER_IDS = [
  '0192f4d8-aaaa-7000-8000-000000000009',
  '0192f4d8-aaaa-7000-8000-000000000010',
  '0192f4d8-aaaa-7000-8000-000000000011',
  '0192f4d8-aaaa-7000-8000-000000000012',
];

// ──────────────────────────────────────────────────────────────────────
// DTO factories — wire-shape parity per TKT-3.11.A1 §6
// ──────────────────────────────────────────────────────────────────────

export interface LeaderboardEntryDto {
  rank: number;
  denseRank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  isTied: boolean;
  isCurrentUser: boolean;
}

export interface PeriodInfoDto {
  type: 'weekly' | 'monthly' | 'all_time';
  start: string;
  end: string | null;
  resetInSeconds: number;
}

export interface PaginationDto {
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface LeaderboardResponseDto {
  entries: LeaderboardEntryDto[];
  totalParticipants: number;
  userPosition: null | Record<string, never>;
  period: PeriodInfoDto;
  pagination: PaginationDto;
}

export interface StubLeaderboardOptions {
  /**
   * Default page size the stub returns. Matches the LEADERBOARD_PAGE_LIMIT
   * in `useLeaderboard` (TKT-3.11.B1).
   */
  pageLimit?: number;
  /**
   * Whether to seed the self entry at rank 2 with `isCurrentUser: true`.
   * When `false` (or when the stub is unauthenticated), no entry carries
   * the flag — the live composition renders no `aria-current="true"` row.
   */
  authenticate?: boolean;
}

/**
 * Build a single `LeaderboardEntryDto` at a given rank with a
 * deterministic display name + XP.
 */
export function makeEntry(
  rank: number,
  userId: string,
  isSelf = false,
): LeaderboardEntryDto {
  return {
    rank,
    denseRank: rank,
    userId,
    displayName: isSelf ? 'You' : `Player ${rank}`,
    avatarUrl: null,
    xp: 10_000 - rank * 50,
    isTied: false,
    isCurrentUser: isSelf,
  };
}

/**
 * Wrap a list of entries in the `LeaderboardResponseDto` envelope
 * the SDK unwraps. The optional `hasMore` flag drives whether the
 * load-more button renders.
 */
export function makeResponse(
  entries: LeaderboardEntryDto[],
  period: PeriodInfoDto['type'],
  options: { hasMore: boolean; offset: number; limit: number },
): LeaderboardResponseDto {
  return {
    entries,
    totalParticipants: 500,
    userPosition: null,
    period: {
      type: period,
      start: '2026-07-27T00:00:00.000Z',
      end: period === 'all_time' ? null : '2026-08-03T00:00:00.000Z',
      resetInSeconds: period === 'all_time' ? 0 : 86400,
    },
    pagination: {
      limit: options.limit,
      offset: options.offset,
      hasMore: options.hasMore,
    },
  };
}

/**
 * Stub the global leaderboard endpoint with deterministic entries.
 *
 * The stub supports three modes:
 *
 *  1. `authenticate: false` — All entries have `isCurrentUser: false`.
 *  2. `authenticate: true` (default) — The entry whose `userId` is
 *     `SELF_USER_ID` (if present) has `isCurrentUser: true`. When
 *     the test seeds `makeEntry(N, SELF_USER_ID, true)`, the stub
 *     honors the explicit flag.
 *
 * The stub honors the `offset` + `limit` query parameters, returning
 * the relevant slice of the seed list. This is required because the
 * hook (B1) advances `offset` on each `loadMore()` call.
 */
export async function stubLeaderboard(
  page: Page,
  options: StubLeaderboardOptions & { authenticate?: boolean } = {},
): Promise<void> {
  const {
    pageLimit = 20,
    authenticate = true,
  } = options;

  // The mutable in-memory state — the stub holds the seed list so
  // pagination is reproducible without re-stubbing.
  const allUserIds = [...RAW_TOP_USER_IDS, ...RAW_NEXT_PAGE_USER_IDS];

  await page.route('**/api/v1/leaderboard**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname !== '/api/v1/leaderboard') {
      // Any sibling path (`/me`, `/me/rank`, `/me/movement`,
      // etc.) returns 404 — the production surface never reads
      // them in Story 3.11.
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

    const period = (url.searchParams.get('period') ?? 'weekly') as
      | 'weekly'
      | 'monthly'
      | 'all_time';
    const offset = Number.parseInt(
      url.searchParams.get('offset') ?? '0',
      10,
    );
    const limit = Number.parseInt(
      url.searchParams.get('limit') ?? `${pageLimit}`,
      10,
    );

    const slice = allUserIds.slice(offset, offset + limit);
    const entries: LeaderboardEntryDto[] = slice.map((userId, index) => {
      // The first 8 entries are seeded from RAW_TOP_USER_IDS. The
      // self-entry lives in the second position (rank 2) when
      // `authenticate` is true. Tests that want a self entry at
      // a different rank use `makeEntry()` directly.
      const rank = offset + index + 1;
      const isSelf =
        authenticate && (userId === SELF_USER_ID || rank === 2)
          ? true
          : userId === SELF_USER_ID;
      return makeEntry(rank, userId, isSelf);
    });

    const hasMore = offset + limit < allUserIds.length;

    // Mimic the current backend so the period enum is wire-side
    // (snake_case). The default period is `weekly` per master plan
    // open decision #3 from `PHASE_3_EPICS.md` line 1325.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: makeResponse(entries, period, {
        hasMore,
        offset,
        limit,
      }) }),
    });
  });
}
