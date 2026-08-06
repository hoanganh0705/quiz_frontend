/**
 * `analytics.ts` — Type-level foundation for the Story 6.3 analytics
 * surface.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.A3 (cross-batch invariant pin).
 *
 * ## Purpose
 *
 * Declares the closed `AnalyticsPeriod` union and the related
 * projection types that the analytics hooks (`useMySocialAnalytics`,
 * `useUserSocialStats`, `useFriendLeaderboard`) and the analytics
 * pages (`MyAnalyticsPage`, `UserStatsCard`, `FriendLeaderboardPage`)
 * consume. The period discriminator lives in `analytics-period-invariants.ts`
 * (TKT-6.3.A3); this module is the type-level companion so a
 * feature-level projection and the runtime constant cannot drift.
 *
 * ## What this file owns
 *
 *   - `AnalyticsPeriod` — the closed union (`'week' | 'month' | 'all'`).
 *   - `AnalyticsPeriodLabel` — the localised label map. Optional;
 *     pages can override per-locale.
 *   - `AnalyticsKind` — the closed union of analytics surfaces
 *     (`'hub' | 'my-analytics' | 'stats' | 'leaderboard'`).
 *
 * ## What this file does NOT own
 *
 *   - The DTO projections for `SocialMyAnalyticsDto` /
 *     `SocialUserStatsDto` / `FriendLeaderboardEntryDto` — those are
 *     introduced by Batch D (`useMySocialAnalytics`,
 *     `useUserSocialStats`, `useFriendLeaderboard`) and live next to
 *     the hooks.
 *   - The analytics-zero widget catalogue — that lives in
 *     `analytics-zero-widget-catalog.ts` (TKT-6.3.A4).
 *
 * ## SSR-safety
 *
 * The module declares types only. It is safe to import from Server
 * Components and from the App Router's route modules.
 */

/**
 * The closed union of valid period values for `/social/me/analytics`.
 *
 * Mirrors `ANALYTICS_VALID_PERIODS` in
 * `analytics-period-invariants.ts`. The two are intentionally a
 * `satisfies` pair so an accidental drift (e.g. adding `'year'` to
 * one but not the other) is a TypeScript error.
 */
export type AnalyticsPeriod = "week" | "month" | "all";

/**
 * Optional human-readable labels for each period. Pages can supply
 * their own locale map; the defaults below match the documented
 * Story 6.3 Exit Criterion #5 copy.
 */
export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

/**
 * The closed union of analytics surfaces Story 6.3 renders.
 *
 * Used by `AnalyticsPlaceholder` (TKT-6.3.C5) and the route gate
 * (TKT-6.3.B4 → `AnalyticsRouteGate`) to select the right kind-specific
 * copy and lifecycle hook.
 */
export type AnalyticsKind = "hub" | "my-analytics" | "stats" | "leaderboard";

/**
 * The supported analytics surface kinds, frozen for iteration.
 * Mirrors `AnalyticsKind`.
 */
export const ANALYTICS_KINDS: readonly AnalyticsKind[] = [
  "hub",
  "my-analytics",
  "stats",
  "leaderboard",
] as const;

// ─── Frontend DTO projections ────────────────────────────────────────────
//
// These are the canonical frontend projections of the SDK wire DTOs
// the analytics hooks consume. They are declared here (rather than
// in `relationship.ts`) because the analytics surface is a separate
// feature slice with its own naming convention.
//
// Each projection:
//   - Strips leaked internal ids (none of the three wire DTOs leak
//     them today, but the projection layer is the documented seam).
//   - Normalises optional fields with stable defaults.
//   - Carries the freshness envelope (`staleAt` / `isStale`) so the
//     `useEventuallyConsistentQuery` primitive (TKT-6.3.D4) can
//     derive `staleness` without re-reading the raw wire DTO.

/**
 * The frontend projection of the per-user social stats.
 *
 * Maps from `UserSocialStatsResponseDto` (Epic 6.1 / TKT-6.1.C1).
 */
export interface SocialUserStatsDto {
  readonly friends: number;
  readonly followers: number;
  readonly following: number;
  /** Optional freshness envelope from the backend. */
  readonly staleAt?: string;
  readonly isStale?: boolean;
}

/**
 * The frontend projection of the viewer's deep analytics.
 *
 * Maps from `MySocialAnalyticsResponseDto` (Epic 6.1 / TKT-6.1.C1).
 */
export interface SocialMyAnalyticsDto {
  readonly friends: number;
  readonly followers: number;
  readonly following: number;
  /** Net follower growth over the last 30 days. */
  readonly growth30Days: number;
  /** Optional freshness envelope from the backend. */
  readonly staleAt?: string;
  readonly isStale?: boolean;
}

/**
 * The frontend projection of a single friend leaderboard row.
 *
 * Maps from `FriendRankingEntryDto` (Epic 6.1 / TKT-6.1.C1).
 */
export interface FriendLeaderboardEntryDto {
  readonly rank: number;
  readonly userId: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly xp: number;
  /** ISO 8601 timestamp when the friendship was established. */
  readonly friendSince: string;
}

/**
 * The closed union of period values the friend leaderboard
 * endpoint accepts. The frontend period (`AnalyticsPeriod`) is
 * mapped to this union by the `useFriendLeaderboard` hook.
 */
export type FriendLeaderboardPeriod = "weekly" | "monthly" | "all_time";

export const FRIEND_LEADERBOARD_PERIODS: readonly FriendLeaderboardPeriod[] = [
  "weekly",
  "monthly",
  "all_time",
] as const;

/**
 * The frontend projection of the full friend leaderboard response.
 *
 * Maps from `FriendLeaderboardDto` (Epic 6.1 / TKT-6.1.C1).
 */
export interface FriendLeaderboardDto {
  readonly period: FriendLeaderboardPeriod;
  readonly entries: readonly FriendLeaderboardEntryDto[];
  /** The viewer's own rank (`null` when unranked). */
  readonly currentUserRank:
    | { rank: number; xp: number }
    | null;
  readonly totalParticipants: number;
  /** Optional freshness envelope from the backend. */
  readonly staleAt?: string;
  readonly isStale?: boolean;
}

/**
 * Map the frontend analytics period (`AnalyticsPeriod`) to the
 * friend leaderboard's backend period (`FriendLeaderboardPeriod`).
 *
 * The mapping is intentionally narrow — adding a new value to
 * `AnalyticsPeriod` is a TypeScript error until this map is
 * updated, so a divergence surfaces in CI.
 */
export function mapAnalyticsPeriodToLeaderboardPeriod(
  period: AnalyticsPeriod,
): FriendLeaderboardPeriod {
  switch (period) {
    case "week":
      return "weekly";
    case "month":
      return "monthly";
    case "all":
      return "all_time";
  }
}
