/**
 * Leaderboard wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 *
 * Source epics:
 *   - Epic 3.11 — Story 3.11 (`/leaderboard` read-only render).
 *     Tickets: TKT-3.11.A2 (this file), TKT-3.11.B1 (the
 *     `useLeaderboard` hook that consumes `getLeaderboardWithPagination`).
 *
 * The wrapper is the ONLY place the leaderboard SDK is imported. Hooks
 * and components in `src/features/leaderboard/**` import from
 * `@/features/leaderboard/wrappers/leaderboard.wrapper` (this file); they
 * MUST NOT import from `@/lib/api/generated/leaderboards/leaderboards`
 * directly. This is the cross-story contract rule (mirrors the
 * bookmarks / quizzes / categories wrappers).
 *
 * ## Drift notes (TKT-3.11.A1)
 *
 * The planning doc (Story 3.11 lines 1167–1173) listed the SDK
 * operations by their planning-intent names (`leaderboardsController*`,
 * `getLeaderboards().leaderboardsControllerGetLeaderboard`). The
 * regenerated SDK exposes singular `rankingControllerGetGlobalLeaderboard`
 * under `getLeaderboards()`. The wrapper preserves the planning-intent
 * camelCase verbs (`getLeaderboard`, `getLeaderboardWithPagination`) so
 * the drift is invisible to feature hooks.
 *
 * The endpoint is **offset-paginated**, NOT cursor-paginated
 * (drift capture #1 in A1). The wrapper exposes two shapes:
 *
 *   - `getLeaderboard(period, params?)` — thin pass-through that
 *     accepts an optional `{ limit?, offset? }` and returns the
 *     inner-unwrapped envelope unchanged.
 *   - `getLeaderboardWithPagination(period, params)` — explicit
 *     `offset` + `limit` parameter shape, used by the B1 hook
 *     (the offset branch of `useCursorPaginated`).
 *
 * The planning-intent period enum (`weekly | monthly | all_time`) is the
 * wire-side enum. The frontend's `LeaderboardPeriodSelector` (B2) maps
 * the human-readable label `All-time` to the wire-side value `all_time`
 * before emission; the wrapper accepts the wire-side enum only.
 *
 * The `LeaderboardEntryDto.isCurrentUser` field is the source of truth
 * for the self-entry highlight (drift capture #3 — `userPosition` is
 * always `null` on the public variant per the SDK comment at
 * `leaderboards.ts` line 47).
 *
 * The `LeaderboardEntryDto` does NOT expose a `rankChange` field
 * (drift capture #2 in A1); the row component (B3) does not render a
 * rank-change indicator.
 */

import { getLeaderboards } from '@/lib/api/generated/leaderboards/leaderboards';
import type {
  RankingControllerGetGlobalLeaderboardPeriod,
} from '@/lib/api/generated/schemas/rankingControllerGetGlobalLeaderboardPeriod';

export type {
  RankingControllerGetGlobalLeaderboardResult,
} from '@/lib/api/generated/leaderboards/leaderboards';

export type LeaderboardPeriod = RankingControllerGetGlobalLeaderboardPeriod;

export interface GetLeaderboardParams {
  limit?: number;
  offset?: number;
}

export interface GetLeaderboardWithPaginationParams {
  limit: number;
  offset: number;
}

// ─── Global Leaderboard Read ────────────────────────────────────────────────

/**
 * `getLeaderboard(period, params?)` — thin pass-through to the
 * generated SDK's `rankingControllerGetGlobalLeaderboard`.
 *
 * The endpoint is **offset-paginated**: `params.offset` advances by
 * `params.limit` per page. NO `cursor` is forwarded (the endpoint does
 * not accept one — drift A1 #1).
 *
 * The wrapper returns the inner-unwrapped
 * `{ data?: LeaderboardResponseDto, meta?: ... }` envelope unchanged.
 * Caller-side hooks (TKT-3.11.B1) read `result.data` at the wrapper
 * boundary only.
 *
 * Source epic:   Story 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.A2.
 *
 * Thin pass-through — no business logic, no error wrapping, no SWR
 * cache invalidation (the hook in B1 owns cache invalidation through
 * SWR's `mutate(...)`).
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  params?: GetLeaderboardParams,
) {
  const sdk = getLeaderboards();
  return sdk.rankingControllerGetGlobalLeaderboard({
    period,
    ...(params?.limit !== undefined ? { limit: params.limit } : {}),
    ...(params?.offset !== undefined ? { offset: params.offset } : {}),
  });
}

/**
 * `getLeaderboardWithPagination(period, params)` — explicit offset +
 * limit parameter shape, used by the B1 hook's offset branch.
 *
 * Both `limit` and `offset` are required. The hook in B1 calls this
 * with `{ limit: 20, offset: 0 }` on the first page and advances
 * `offset` by `limit` on each subsequent page.
 *
 * Source epic:   Story 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.A2.
 *
 * Thin pass-through — no business logic, no error wrapping.
 */
export async function getLeaderboardWithPagination(
  period: LeaderboardPeriod,
  params: GetLeaderboardWithPaginationParams,
) {
  const sdk = getLeaderboards();
  return sdk.rankingControllerGetGlobalLeaderboard({
    period,
    limit: params.limit,
    offset: params.offset,
  });
}
