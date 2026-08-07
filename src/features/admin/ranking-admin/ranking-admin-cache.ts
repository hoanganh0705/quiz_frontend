/**
 * `features/admin/ranking-admin/ranking-admin-cache.ts`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.B3.
 *
 * ## What this module owns
 *
 * The SWR cache key constants and invalidation helpers for the ranking admin
 * feature. This module:
 *
 *   1. Defines the Phase 5 ranking SWR cache keys (from `RANKING_CACHE_KEYS`).
 *   2. Provides an `invalidateRankingCaches` helper that invalidates all
 *      Phase 5 ranking caches when a ranking admin operation completes.
 *
 * ## Shape pinned from A1 evidence
 *
 * Phase 5 SWR cache keys confirmed from `quiz_frontend/src/features/rankings/types/ranking.types.ts`:
 *   - `RANKING_CACHE_KEYS.leaderboard(filters)` → `["rankings", "leaderboard", period, cursor, limit]`
 *   - `RANKING_CACHE_KEYS.mySummary()` → `["rankings", "me", "summary"]`
 *   - `RANKING_CACHE_KEYS.myHistory(filters?)` → `["rankings", "me", "history", cursor, limit]`
 *   - `RANKING_CACHE_KEYS.myMilestones()` → `["rankings", "me", "milestones"]`
 *   - `RANKING_CACHE_KEYS.user(userId)` → `["rankings", "user", userId]`
 *
 * ## Phase 5 notification events (A1 §2.9)
 *
 * The source story notes that ranking operations may emit notification events
 * to the Phase 5 notification gateway. This is not yet verified.
 *
 * The `invalidateRankingCaches` helper documents the dual path:
 *   - If events ARE emitted: Phase 5 socket invalidation handles caches
 *     automatically (no extra work needed here).
 *   - If events are NOT emitted: the helper fires SWR revalidation.
 *
 * When the backend team confirms the notification event contract, update
 * the comment above the helper to reflect the chosen path.
 */

import { mutate } from 'swr';

import {
  RANKING_CACHE_KEYS,
  DEFAULT_RANKING_LEADERBOARD_FILTERS,
} from '@/features/rankings/types/ranking.types';

// ─── Phase 5 ranking cache keys (re-exported for convenience) ──────────────────

/**
 * Re-exported from Phase 5 so hooks and components can import from a single
 * module rather than reaching across the feature boundary.
 *
 * Usage:
 *   import { RANKING_LEADERBOARD_KEY, invalidateRankingCaches } from '...'
 */
export {
  RANKING_CACHE_KEYS,
  DEFAULT_RANKING_LEADERBOARD_FILTERS,
} from '@/features/rankings/types/ranking.types';

/**
 * SWR cache key for the global leaderboard (with default filters).
 *
 * Consumed by `invalidateRankingCaches` to invalidate the leaderboard
 * cache after a ranking admin operation completes.
 */
export type RankingLeaderboardKey = ReturnType<
  typeof RANKING_CACHE_KEYS.leaderboard
>;

/**
 * SWR cache key for a single user's ranking.
 */
export type RankingUserKey = ReturnType<typeof RANKING_CACHE_KEYS.user>;

// ─── Invalidation helper ────────────────────────────────────────────────────────

/**
 * Invalidate all Phase 5 ranking caches after a ranking admin operation completes.
 *
 * ## Dual-path design (A1 §2.9)
 *
 * If the backend emits Phase 5 notification events (e.g. `ranking.recalculated`,
 * `ranking.period_reset`, `ranking.consistency_check.completed`), the Phase 5
 * notification socket bridge (`useRankingEventListener` or equivalent) handles
 * the cache invalidation automatically. In that case, this helper is a no-op
 * and can be removed.
 *
 * If the backend does NOT emit notification events, this helper fires SWR
 * revalidation directly.
 *
 * **Open question (A1 §2.9):** verify with the backend team whether ranking
 * admin operations emit notification events. Until confirmed, this helper
 * uses SWR revalidation.
 *
 * @param options - Optional invalidation options.
 * @param options.skipLeaderboard - Skip leaderboard invalidation (e.g. when only
 *   consistency check ran and it returned no changes).
 * @param options.skipUserSummary - Skip user summary invalidation.
 *
 * @example
 *   // After a successful recalculate:
 *   await invalidateRankingCaches()
 *
 *   // After a consistency check (no leaderboard change expected):
 *   await invalidateRankingCaches({ skipLeaderboard: true })
 */
export async function invalidateRankingCaches(options?: {
  /** Skip leaderboard cache invalidation. */
  skipLeaderboard?: boolean;
  /** Skip user summary cache invalidation. */
  skipUserSummary?: boolean;
}): Promise<void> {
  const { skipLeaderboard = false, skipUserSummary = false } = options ?? {};

  await Promise.all([
    // Always invalidate the user's own summary (they may have gained/lost XP)
    skipUserSummary ? Promise.resolve() : mutate(RANKING_CACHE_KEYS.mySummary()),

    // Invalidate the global leaderboard (rankings may have changed)
    skipLeaderboard
      ? Promise.resolve()
      : mutate(RANKING_CACHE_KEYS.leaderboard(DEFAULT_RANKING_LEADERBOARD_FILTERS)),

    // Invalidate the user's history (rank movement)
    skipUserSummary ? Promise.resolve() : mutate(RANKING_CACHE_KEYS.myHistory()),

    // Invalidate the user's milestones (new milestone may have been reached)
    skipUserSummary ? Promise.resolve() : mutate(RANKING_CACHE_KEYS.myMilestones()),
  ]);
}

/**
 * Invalidate the ranking cache for a specific user.
 *
 * Use this when you know the affected user IDs (e.g. from a partial
 * consistency check result). For full invalidation, use
 * `invalidateRankingCaches` instead.
 *
 * @param userId - The user whose ranking cache to invalidate.
 *
 * @example
 *   if (affectedUserIds.length > 0) {
 *     await Promise.all(affectedUserIds.map(invalidateUserRankingCache))
 *   }
 */
export async function invalidateUserRankingCache(userId: string): Promise<void> {
  await mutate(RANKING_CACHE_KEYS.user(userId));
}
