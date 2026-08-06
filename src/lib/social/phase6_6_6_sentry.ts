/**
 * `phase6_6_6_sentry.ts` — Phase 6.6 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.G1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `phase6:6.6` Sentry breadcrumb category
 * that every Story 6.6 mutation service call emits. The helpers are the
 * **only** functions `follow-mutation.service.ts` uses to emit breadcrumbs;
 * the lint invariants script asserts no caller bypasses them.
 *
 * The breadcrumb payload shape is locked by the Phase 6.6 telemetry
 * contract:
 *
 * ```ts
 * {
 *   category: "phase6:6.6",
 *   data: {
 *     route:   "social.followUser" | "social.unfollowUser",
 *     method:  "POST" | "DELETE",
 *     status:  number | undefined,
 *     durationMs: number | undefined,
 *     code?:   string,       // ApiError.code
 *     epic:    "1.0.0",
 *   }
 * }
 * ```
 *
 * The `targetUserId` is included in the breadcrumb data. Tokens,
 * relationship bodies, `followId`, and `friendshipId` are never logged.
 */

import * as Sentry from "@sentry/nextjs";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.6 telemetry. Distinct from
 * the Epic 6.1 / 6.2 / 6.3 / 6.4 / 6.5 categories so the
 * Sentry dashboard can split the six epics' events.
 */
export const EPIC_6_6_BREADCRUMB_CATEGORY = "phase6:6.6" as const;

/**
 * The Epic 6.6 version. Emitted as a breadcrumb data field so
 * the dashboard can split event volumes by Phase 6 release-train.
 */
export const EPIC_6_6_VERSION = "1.0.0" as const;

// ─── Stable route names ────────────────────────────────────────────────────

export const SOCIAL_6_6_ROUTES = {
  followUser: "social.followUser",
  unfollowUser: "social.unfollowUser",
} as const;

export type Social66Route = (typeof SOCIAL_6_6_ROUTES)[keyof typeof SOCIAL_6_6_ROUTES];

// ─── Payload type ─────────────────────────────────────────────────────────

export interface FollowMutationBreadcrumbData {
  /**
   * The stable SDK function name. One of:
   *   - `social.followUser`   (POST)
   *   - `social.unfollowUser`  (DELETE)
   */
  route: Social66Route;
  /** `"POST"` for follow, `"DELETE"` for unfollow. */
  method: "POST" | "DELETE";
  /** The HTTP status code. `undefined` for network failures (non-HTTP). */
  status?: number;
  /** The measured call duration in milliseconds. */
  durationMs: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
  /**
   * The target user's public identifier. NOT an internal ID.
   * Included for correlation with user-facing traces.
   */
  targetUserId: string;
}

// ─── Helper ────────────────────────────────────────────────────────────────

/**
 * Emit a `phase6:6.6` breadcrumb for a follow / unfollow mutation.
 *
 * @example
 *   // Successful follow
 *   addFollowMutationBreadcrumb({
 *     route: "social.followUser",
 *     method: "POST",
 *     status: 204,
 *     durationMs: 43,
 *     targetUserId: "user-abc",
 *   });
 *
 * @example
 *   // Failed follow
 *   addFollowMutationBreadcrumb({
 *     route: "social.followUser",
 *     method: "POST",
 *     status: 409,
 *     durationMs: 61,
 *     code: "SOCIAL_ALREADY_FOLLOWING",
 *     targetUserId: "user-abc",
 *   });
 *
 * @example
 *   // Network failure (non-HTTP)
 *   addFollowMutationBreadcrumb({
 *     route: "social.followUser",
 *     method: "POST",
 *     status: undefined,
 *     durationMs: 5000,
 *     targetUserId: "user-abc",
 *   });
 */
export function addFollowMutationBreadcrumb(
  data: FollowMutationBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    method: data.method,
    epic: EPIC_6_6_VERSION,
  };

  if (data.status !== undefined) payload.status = data.status;
  payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;
  // targetUserId is the public user identifier, NOT an internal ID.
  payload.targetUserId = data.targetUserId;

  Sentry.addBreadcrumb({
    category: EPIC_6_6_BREADCRUMB_CATEGORY,
    data: payload,
  });
}
