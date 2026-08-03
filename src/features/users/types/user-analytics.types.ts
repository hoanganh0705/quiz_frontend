/**
 * User Analytics Types — aligned with backend DTOs.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-A4.
 *
 * Re-exports and wraps generated DTOs for:
 * - User ranking: `UserRankingResponseDto`
 * - User analytics: `UserControllerGetMyAnalytics200`
 * - Attempt summary: `AttemptSummaryResponseDto`
 *
 * ## XP ranking lag (master plan §1.3 line 69)
 *
 * The `me/ranking` endpoint may lag XP events by up to 60 seconds.
 * Components must never assume monotonic XP within a single request cycle.
 */

import type {
  UserRankingResponseDto,
  UserControllerGetMyAnalytics200,
  UserControllerGetMyAnalytics200AllOf,
  AttemptSummaryResponseDto,
  AttemptControllerListMyAttempts200,
  AttemptControllerListMyAttempts200AllOf,
  AttemptControllerListMyAttempts200AllOfMeta,
} from "@/lib/api/generated/schemas";

// ─── Ranking types ─────────────────────────────────────────────────────────────

export type { UserRankingResponseDto };

/**
 * Simplified ranking data for the RankingPanel display.
 */
export interface UserRankingData {
  userId: string;
  globalRank: number | null;
  totalScore: number;
  level: number;
  updatedAt: string;
  isRanked: boolean;
}

/**
 * Extracts simplified ranking data from the full response.
 * Returns `isRanked: false` if the user has no ranking yet.
 */
export function extractRankingData(
  response: UserRankingResponseDto | undefined
): UserRankingData | null {
  if (!response) return null;

  return {
    userId: response.userId,
    globalRank: response.globalRank ?? null,
    totalScore: response.totalScore ?? 0,
    level: response.level ?? 1,
    updatedAt: response.updatedAt ?? "",
    isRanked: response.globalRank !== null && response.globalRank !== undefined,
  };
}

// ─── Analytics types ───────────────────────────────────────────────────────────

export type GetMyAnalyticsResponse = UserControllerGetMyAnalytics200 &
  UserControllerGetMyAnalytics200AllOf;

/**
 * Wire envelope for attempt list (post-unwrap).
 */
export type ListMyAttemptsResponse = AttemptControllerListMyAttempts200 &
  AttemptControllerListMyAttempts200AllOf & {
    data?: AttemptSummaryResponseDto[];
    meta?: AttemptControllerListMyAttempts200AllOfMeta;
  };

// ─── Attempt with id alias ────────────────────────────────────────────────────

/**
 * `AttemptSummaryResponseDto` with a synthesised `id` field.
 *
 * The `id` field is an alias of `attemptId` so `appendUniqueById`
 * deduplication in `useCursorPaginated` works.
 */
export type UserAttempt = AttemptSummaryResponseDto & { id: string };

// ─── SWR key factories ────────────────────────────────────────────────────────

export function myRankingKey(): readonly ["users", "me", "ranking"] {
  return ["users", "me", "ranking"];
}

export function myAnalyticsKey(): readonly ["users", "me", "analytics"] {
  return ["users", "me", "analytics"];
}

export function myAttemptsKey(): readonly ["attempts", "me"] {
  return ["attempts", "me"];
}
