/**
 * `leaderboard.service.ts` — Leaderboard service (Phase 3 Story 3.11).
 *
 * Source epic:   Story 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-4.1.G-prep.
 *
 * Replaces `features/leaderboard/wrappers/leaderboard.wrapper.ts`
 * (TKT-3.11.A2). The leaderboard is read-only — there are no write
 * paths in this service.
 *
 * ## Drift notes
 *
 * - The SDK exposes `rankingControllerGetGlobalLeaderboard` under
 *   `getLeaderboards()`. The planning-intent function names
 *   (`getLeaderboard`, `getLeaderboardWithPagination`) are preserved
 *   so the drift is invisible to feature hooks.
 * - The endpoint is **offset-paginated**, NOT cursor-paginated.
 *   `getLeaderboardWithPagination` requires `{ limit, offset }`.
 */

import { getLeaderboards } from '@/lib/api';

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