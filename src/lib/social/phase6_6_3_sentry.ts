/**
 * `phase6_6_3_sentry.ts` — Phase 6.3 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.H1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `phase6:6.3` Sentry breadcrumb
 * category that every analytics hook and page emits. The helpers
 * in this file are the **only** functions the analytics surfaces
 * use to emit breadcrumbs; the `phase-lint-invariants` script
 * asserts that no caller bypasses them.
 *
 * The breadcrumb payload shapes are locked by the Phase 6 / 6.3
 * telemetry contract (`PHASE_6_IMPLEMENTATION_PLAN.md` Exit
 * Criterion #11 + `EPIC_6_3_TICKETS.md` Cross-Batch Validation
 * Checklist #11):
 *
 * ```ts
 * // Analytics surface breadcrumb (TKT-6.3.H1 — read-side)
 * {
 *   category: "phase6:6.3",
 *   data: {
 *     route: "social.getUserSocialStats" |
 *            "social.getMySocialAnalytics" |
 *            "social.getFriendLeaderboard",
 *     kind: "my-analytics" | "stats" | "leaderboard",
 *     targetUserId?: string,
 *     period?: "week" | "month" | "all",
 *     offset?: number,
 *     limit?: number,
 *     total?: number,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     epic: "1.0.0",
 *   }
 * }
 *
 * // Leaderboard breadcrumb
 * {
 *   category: "phase6:6.3",
 *   data: {
 *     route: "social.getFriendLeaderboard",
 *     period: "weekly" | "monthly" | "all_time",
 *     offset: number,
 *     limit: number,
 *     total?: number,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     epic: "1.0.0",
 *   }
 * }
 * ```
 *
 * ## Why a separate file from `phase6_6_2_sentry.ts`
 *
 * The Epic 6.2 helpers live in `phase6_6_2_sentry.ts` and use the
 * `phase6:6.2` category. Phase 6.3 introduces analytics-surface
 * telemetry with a different breadcrumb payload (route / kind /
 * period). Keeping the two epics' helpers in separate files
 * makes the contract difference explicit and lets the lint
 * invariant grep for the new helpers without entangling the
 * Epic 6.2 shape.
 */

import * as Sentry from "@sentry/nextjs";

import type { AnalyticsKind } from "@/features/social/types/analytics";
import type { FriendLeaderboardPeriod } from "@/features/social/types/analytics";

// ─── Constants ───────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.3 telemetry. Distinct from
 * the Epic 6.1 / 6.2 categories so the Sentry dashboard can
 * split the three epics' events.
 */
export const EPIC_6_3_BREADCRUMB_CATEGORY = "phase6:6.3" as const;

/**
 * The Epic 6.3 version. The epic-version is emitted as a
 * breadcrumb data field so the dashboard can split event
 * volumes by Phase 6 release-train.
 */
export const EPIC_6_3_VERSION = "1.0.0" as const;

// ─── Stable route names ──────────────────────────────────────────────────

/**
 * The stable SDK function names the analytics surfaces call.
 * Each value is also the documented Epic 6.3 wiring contract —
 * it MUST match the SDK wrapper name so a future regression
 * that swaps the wrapper for an inline fetch surfaces as a
 * breadcrumb mismatch.
 */
export const SOCIAL_ANALYTICS_ROUTES = {
  getUserSocialStats: "social.getUserSocialStats",
  getMySocialAnalytics: "social.getMySocialAnalytics",
  getFriendLeaderboard: "social.getFriendLeaderboard",
} as const;

export type SocialAnalyticsRoute =
  (typeof SOCIAL_ANALYTICS_ROUTES)[keyof typeof SOCIAL_ANALYTICS_ROUTES];

// ─── Analytics breadcrumb ────────────────────────────────────────────────

/**
 * The payload shape for an analytics-surface breadcrumb. The
 * fields are the union of the documented Phase 6.3 telemetry
 * contract for the analytics surfaces (UserStatsCard, MyAnalytics,
 * FriendLeaderboard). The `kind` discriminates the surface; the
 * `period` is only meaningful for time-windowed surfaces.
 */
export interface SocialAnalyticsBreadcrumbData {
  /** The stable SDK function name the breadcrumb describes. */
  route: SocialAnalyticsRoute;
  /** The analytics surface the breadcrumb describes. */
  kind: AnalyticsKind;
  /** The target user id (optional; only the `stats` surface has one). */
  targetUserId?: string;
  /** The analytics period (optional; only the `my-analytics` and `leaderboard` surfaces have one). */
  period?: "week" | "month" | "all";
  /** The offset of the loaded page (optional; only the leaderboard surface has one). */
  offset?: number;
  /** The limit of the loaded page (optional; only the leaderboard surface has one). */
  limit?: number;
  /** The total number of items reported by the surface (when known). */
  total?: number;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
}

/**
 * Emit a `phase6:6.3` breadcrumb for an analytics surface data
 * fetch. The shape mirrors the Epic 6.2 service breadcrumb
 * pattern (`route` is a stable SDK function name) and extends
 * it with the analytics-specific fields (`kind`, `period`,
 * `targetUserId`, `offset`, `limit`, `total`).
 *
 * @example
 *   addSocialAnalyticsBreadcrumb({
 *     route: SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics,
 *     kind: "my-analytics",
 *     period: "week",
 *     status: 200,
 *     durationMs: 142,
 *   });
 */
export function addSocialAnalyticsBreadcrumb(
  data: SocialAnalyticsBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    kind: data.kind,
    epic: EPIC_6_3_VERSION,
  };
  if (data.targetUserId !== undefined) payload.targetUserId = data.targetUserId;
  if (data.period !== undefined) payload.period = data.period;
  if (data.offset !== undefined) payload.offset = data.offset;
  if (data.limit !== undefined) payload.limit = data.limit;
  if (data.total !== undefined) payload.total = data.total;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_3_BREADCRUMB_CATEGORY,
    data: payload,
  });
}

// ─── Leaderboard breadcrumb ──────────────────────────────────────────────

/**
 * The payload shape for the Friend Leaderboard breadcrumb. The
 * shape is a focused variant of the analytics breadcrumb —
 * only `kind: 'leaderboard'` is valid, and `period` is the
 * backend period (`'weekly' | 'monthly' | 'all_time'`) rather
 * than the frontend analytics period.
 *
 * The dedicated helper exists so the leaderboard payload is
 * stable across future visual additions (e.g. an avatar column
 * that does not affect the telemetry contract).
 */
export interface SocialLeaderboardBreadcrumbData {
  /** The offset of the loaded page. */
  offset: number;
  /** The limit of the loaded page. */
  limit: number;
  /** The total number of leaderboard participants. */
  total?: number;
  /** The backend period the page was loaded for. */
  period?: FriendLeaderboardPeriod;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
}

/**
 * Emit a `phase6:6.3` breadcrumb for the Friend Leaderboard page
 * data fetch. The breadcrumb always carries the `leaderboard`
 * route discriminator so a future regression that swaps the
 * route for a different endpoint surfaces as a breadcrumb
 * mismatch.
 *
 * @example
 *   addSocialLeaderboardBreadcrumb({
 *     offset: 20,
 *     limit: 20,
 *     total: 142,
 *     period: "weekly",
 *     status: 200,
 *     durationMs: 86,
 *   });
 */
export function addSocialLeaderboardBreadcrumb(
  data: SocialLeaderboardBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: SOCIAL_ANALYTICS_ROUTES.getFriendLeaderboard,
    period: data.period ?? "weekly",
    offset: data.offset,
    limit: data.limit,
    epic: EPIC_6_3_VERSION,
  };
  if (data.total !== undefined) payload.total = data.total;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_3_BREADCRUMB_CATEGORY,
    data: payload,
  });
}