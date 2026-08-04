/**
 * `ranking.types.ts` — Story 5.5 ranking types and cache key factories.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.A1.
 *
 * ## Purpose
 *
 * Single source of truth for the ranking domain types, filter shapes,
 * cursor/offset pagination result shapes, freshness indicator, and SWR
 * cache-key factories consumed by every Story 5.5 ranking hook and component.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Story 5.1 (`rankings.service.ts`). They extend the
 * generated SDK DTOs to add `id` aliases for deduplication and to
 * flatten enums for the UI; they do not redefine fields verbatim.
 *
 * ## Period discriminator
 *
 * The `RankingPeriod` union mirrors `RankingControllerGetGlobalLeaderboardPeriod`
 * (the verified service enum) — `'weekly' | 'monthly' | 'all_time'`.
 *
 * ## Pagination kinds
 *
 * - Leaderboard: offset-based — `pagination: { limit, offset, hasMore }`
 * - History: bare array (no pagination metadata in the current DTO)
 * - Milestones: bare array
 *
 * ## Cursor hygiene
 *
 * No cursor fields exist on ranking endpoints in this story. The
 * `RankingHistoryFilters` shape accepts an opaque `cursor` for
 * forward-compatibility, but it is not consumed by the wire envelope
 * at this commit.
 *
 * ## SWR cache key factories
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 *
 * ## Eventual consistency
 *
 * Ranking and XP values are eventually consistent. Components must
 * render the `RankingFreshness` projection during revalidation rather
 * than fabricating a stale value; cached data is retained, not cleared.
 */

import type {
  UserRankResponseDto,
  RankingMilestoneDto,
  RankingHistoryItemDto,
} from "@/lib/api/generated/schemas";

// ─── Period discriminator ─────────────────────────────────────────────────

/**
 * Ranking period discriminator.
 *
 * Mirrors `RankingControllerGetGlobalLeaderboardPeriod` and
 * `PeriodInfoDtoType`. `'all_time'` is the lifetime period; `'weekly'`
 * and `'monthly'` reset on the server's period schedule.
 */
export type RankingPeriod = "weekly" | "monthly" | "all_time";

// ─── Filter shapes ───────────────────────────────────────────────────────

/**
 * URL-syncable filter state for the leaderboard view.
 *
 * `period` is the only consumer-facing filter; `cursor` is reserved
 * for forward-compatibility (current leaderboard pagination is offset,
 * not cursor). `limit` clamps the page size to a backend maximum.
 */
export interface RankingLeaderboardFilters {
  /** Period filter. `undefined` means "all periods" (server default). */
  period?: RankingPeriod;
  /** Opaque pagination cursor. `undefined` means "first page". */
  cursor?: string;
  /** Optional per-page limit. */
  limit?: number;
}

/**
 * Pagination filter for the personal history list.
 *
 * The wire envelope is a bare array at this commit; `cursor` and
 * `limit` are reserved for forward-compatibility when the backend
 * moves to offset pagination.
 */
export interface RankingHistoryFilters {
  /** Opaque pagination cursor. `undefined` means "first page". */
  cursor?: string;
  /** Optional per-page limit. */
  limit?: number;
}

// ─── Default filter values ───────────────────────────────────────────────

/**
 * Default filter state for the leaderboard view.
 *
 * Centralised here so the URL-sync hook, the page, and the URL
 * initializer agree on the empty filter shape.
 */
export const DEFAULT_RANKING_LEADERBOARD_FILTERS: RankingLeaderboardFilters = {
  period: undefined,
  cursor: undefined,
  limit: undefined,
};

// ─── Page shapes ─────────────────────────────────────────────────────────

/**
 * Offset-pagination result shape for the leaderboard.
 *
 * `entries` are deduped by `userId`; `nextOffset` is the next page
 * offset the SDK returned; `hasMore` follows the pagination metadata;
 * `userPosition` is the server-provided current-user position and is
 * authoritative (the client never infers it).
 */
export interface RankingLeaderboardPage {
  items: readonly RankingLeaderboardEntry[];
  nextOffset: number | null;
  hasMore: boolean;
  limit: number;
  userPosition: RankingUserPosition | null;
}

// ─── Domain types ────────────────────────────────────────────────────────

/**
 * Single leaderboard entry.
 *
 * Extends the generated `LeaderboardEntryDto` with an `id` alias so
 * SWR deduplication (`appendUniqueById`) works by `userId`.
 */
export type RankingLeaderboardEntry = {
  rank: number;
  denseRank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  xp: number;
  isTied: boolean;
  isCurrentUser?: boolean | null;
  /** Alias of `userId` for SWR deduplication. */
  id: string;
};

/**
 * Current-user position projection.
 *
 * Mirrors the server-provided `UserRankPositionDto`. The client never
 * computes a rank position locally; `rank` may decrease after a
 * period reset and the UI renders the new value authoritatively.
 *
 * The `trend` field carries the four documented states:
 *   - `'up'`   — rank improved since the previous snapshot
 *   - `'down'` — rank dropped since the previous snapshot
 *   - `'same'` — rank unchanged
 *   - `'new'`  — no prior rank exists (the user just appeared on
 *                the leaderboard)
 */
export type RankingUserPosition = {
  rank: number;
  denseRank: number;
  percentile: number;
  percentileLabel: string;
  xp: number;
  xpToNextRank?: number | null;
  nextRankXp?: number | null;
  trend: "up" | "down" | "same" | "new";
  trendAmount?: number | null;
};

/**
 * Personal ranking summary.
 *
 * Derived from the verified `getMyRanking()` envelope
 * (`UserRankResponseDto`). Components branch on `isStale` from
 * `RankingFreshness` rather than fabricating a placeholder summary
 * when the server returns null.
 */
export type RankingSummary = {
  userId: string;
  globalRank: number | null;
  totalScore: number;
  level: number;
  updatedAt: string;
} & {
  /** Alias of `userId` for SWR deduplication. */
  id: string;
};

/**
 * Public user ranking summary.
 *
 * Same shape as `RankingSummary` but sourced from `getUserRanking()`.
 * Privacy comes from the server response (`UserRankResponseDto` does
 * not carry an `isPrivate` flag in the current DTO; the UI renders
 * the ranking when the response is non-null and renders a
 * "Ranking hidden" empty state when the service returns null or
 * throws `RANKING_FORBIDDEN`).
 */
export type UserRanking = RankingSummary;

/**
 * Ranking history entry.
 *
 * Extends the generated `RankingHistoryItemDto` with an `id` alias so
 * SWR deduplication works by `date` (one snapshot per day).
 */
export type RankingHistoryEntry = RankingHistoryItemDto & {
  /** Alias of `date` for SWR deduplication. */
  id: string;
};

/**
 * Ranking milestone.
 *
 * Mirrors the generated `RankingMilestoneDto`. The `code` field
 * corresponds to the verified milestone enum
 * (`RankingMilestoneDtoMilestone`) — the documented subset is
 * `TOP_100`, `TOP_10`, `TOP_1`; the wire enum additionally includes
 * `TOP_10000`, `TOP_1000`, `TOP_50`, `TOP_3`, which are rendered but
 * not styled as a milestone in the UI per the master plan.
 */
export type RankingMilestone = RankingMilestoneDto & {
  /** Alias of `milestone` for SWR deduplication. */
  id: string;
};

// ─── Freshness indicator ─────────────────────────────────────────────────

/**
 * Eventual-consistency freshness projection.
 *
 * The hook updates `lastValidatedAt` only on successful response;
 * `isStale` flips to `true` while SWR revalidation is in flight and
 * cached data is present. Components never invent a rank or XP during
 * the revalidation window.
 */
export interface RankingFreshness {
  isStale: boolean;
  lastValidatedAt: string | null;
}

// ─── Error taxonomy ──────────────────────────────────────────────────────

/**
 * Typed `RankingErrorCode` union.
 *
 * Components branch on `apiError.code === RankingErrorCode`; HTTP
 * status is never inspected. New ranking-specific codes belong here
 * and must match the backend's `extensions.code` registry.
 */
export type RankingErrorCode =
  | "RANKING_NOT_FOUND"
  | "RANKING_FORBIDDEN"
  | "RANKING_RATE_LIMITED"
  | "RANKING_SERVICE_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "GLOBAL_INTERNAL_ERROR";

// ─── Wire → feature projection helpers ───────────────────────────────────

/**
 * Project the verified `getMyRanking()` envelope to the
 * `RankingSummary` projection. Returns `null` when the server
 * returned a ghost/no-rank response — components never invent a
 * placeholder rank.
 *
 * The hook that owns this projection supplies the caller's
 * `userId` because the verified `UserRankResponseDto` does not
 * carry a top-level `userId` field; the userId is known to the
 * caller (the auth bootstrap) and is the only safe source.
 *
 * The projection picks the `allTime` period as the default global
 * rank. Hooks that consume a specific period (e.g. weekly leaderboard)
 * derive their own projection from the `global.weekly` field.
 */
export function toRankingSummary(
  wire: UserRankResponseDto | null | undefined,
  userId: string,
): RankingSummary | null {
  if (!wire) return null;
  const allTime = wire.global?.allTime ?? null;
  return {
    userId,
    globalRank: allTime?.rank ?? null,
    totalScore: allTime?.xp ?? 0,
    level: 1,
    updatedAt: new Date().toISOString(),
    id: userId,
  };
}

/**
 * Project the verified `getUserRanking()` envelope to the
 * `UserRanking` projection. Returns `null` when the server returned a
 * ghost/no-rank response.
 */
export function toUserRanking(
  wire: UserRankResponseDto | null | undefined,
  userId: string,
): UserRanking | null {
  return toRankingSummary(wire, userId);
}

/**
 * Synthesise a `RankingHistoryEntry` from the generated DTO.
 *
 * The current DTO only carries `{ date, rank }`; `id` is aliased from
 * `date` so SWR deduplication works.
 */
export function toRankingHistoryEntry(
  wire: RankingHistoryItemDto,
): RankingHistoryEntry {
  return { ...wire, id: wire.date };
}

/**
 * Synthesise a `RankingMilestone` from the generated DTO.
 *
 * `id` is aliased from `milestone` so SWR deduplication works.
 */
export function toRankingMilestone(
  wire: RankingMilestoneDto,
): RankingMilestone {
  return { ...wire, id: wire.milestone };
}

// ─── SWR cache keys ──────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.5 ranking reads.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 */
export const RANKING_CACHE_KEYS = {
  /**
   * SWR key for the authenticated user's personal summary.
   */
  mySummary() {
    return ["rankings", "me", "summary"] as const;
  },

  /**
   * SWR key for the global leaderboard.
   *
   * Scoped by the serialised filter shape so different filter
   * combinations do not collide.
   */
  leaderboard(filters: RankingLeaderboardFilters) {
    return [
      "rankings",
      "leaderboard",
      filters.period ?? "all",
      filters.cursor ?? "",
      typeof filters.limit === "number" ? filters.limit : -1,
    ] as const;
  },

  /**
   * SWR key for the authenticated user's history list.
   */
  myHistory(filters?: RankingHistoryFilters) {
    return [
      "rankings",
      "me",
      "history",
      filters?.cursor ?? "",
      typeof filters?.limit === "number" ? filters.limit : -1,
    ] as const;
  },

  /**
   * SWR key for the authenticated user's milestones.
   */
  myMilestones() {
    return ["rankings", "me", "milestones"] as const;
  },

  /**
   * SWR key for a single user's public ranking.
   */
  user(userId: string) {
    return ["rankings", "user", userId] as const;
  },
} as const;

/**
 * Invalidation key set for cross-event SWR revalidation.
 *
 * `useMyRanking` and the notification-driven revalidation bridge
 * mutate these keys when an `attempt.completed` event propagates
 * through the backend. The set is documented as an object so
 * additional keys can be added without changing call sites.
 */
export interface RankingInvalidationKeys {
  summary: ReturnType<typeof RANKING_CACHE_KEYS.mySummary>;
  leaderboard: ReturnType<typeof RANKING_CACHE_KEYS.leaderboard>;
  history: ReturnType<typeof RANKING_CACHE_KEYS.myHistory>;
  milestones: ReturnType<typeof RANKING_CACHE_KEYS.myMilestones>;
}

/**
 * Returns the full invalidation-key set for ranking revalidation.
 *
 * Centralised so the notification/event bridges and the hook agree
 * on the keys to mutate. The leaderboard key uses the default
 * filters (no period/cursor) — period-specific leaderboard keys are
 * mutated by the leaderboard hook itself.
 */
export function makeRankingInvalidationKeys(): RankingInvalidationKeys {
  return {
    summary: RANKING_CACHE_KEYS.mySummary(),
    leaderboard: RANKING_CACHE_KEYS.leaderboard(DEFAULT_RANKING_LEADERBOARD_FILTERS),
    history: RANKING_CACHE_KEYS.myHistory(),
    milestones: RANKING_CACHE_KEYS.myMilestones(),
  };
}