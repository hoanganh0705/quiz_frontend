/**
 * `social-friend-request-mutation-sentry.ts` — Phase 6.8 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.G1 / TKT-6.8.C1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `social:6.8` Sentry breadcrumb category that
 * every Story 6.8 mutation service call emits. The helpers are the **only**
 * functions `friend-request-mutation.service.ts` uses to emit breadcrumbs;
 * the lint invariants script (extended by TKT-6.8.G2) asserts no caller
 * bypasses them.
 *
 * The breadcrumb payload shape is locked by the Phase 6.8 telemetry contract:
 *
 * ```ts
 * {
 *   category: "social:6.8",
 *   data: {
 *     route:   "social.sendFriendRequest" | "social.respondFriendRequest"
 *            | "social.cancelFriendRequest" | "social.removeFriend",
 *     method:  "POST" | "DELETE",
 *     status:  number | undefined,
 *     durationMs: number | undefined,
 *     code?:   string,         // ApiError.code
 *     epic:    "1.0.0",
 *   }
 * }
 * ```
 *
 * The `targetUserId` is included in the breadcrumb data. Tokens,
 * relationship bodies, and `friendshipId` are never logged.
 */

import * as Sentry from "@sentry/nextjs";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.8 telemetry. Distinct from the
 * Epic 6.1 / 6.2 / 6.3 / 6.4 / 6.5 / 6.6 / 6.7 categories so the Sentry
 * dashboard can split the eight epics' events.
 */
export const EPIC_6_8_BREADCRUMB_CATEGORY = "social:6.8" as const;

/**
 * The Epic 6.8 version. Emitted as a breadcrumb data field so the
 * dashboard can split event volumes by Phase 6 release-train.
 */
export const SOCIAL_EPIC_6_8_VERSION = "1.0.0" as const;

// ─── Stable route names ────────────────────────────────────────────────────

export const SOCIAL_6_8_ROUTES = {
  sendFriendRequest: "social.sendFriendRequest",
  respondFriendRequest: "social.respondFriendRequest",
  cancelFriendRequest: "social.cancelFriendRequest",
  removeFriend: "social.removeFriend",
} as const;

export type Social68Route = (typeof SOCIAL_6_8_ROUTES)[keyof typeof SOCIAL_6_8_ROUTES];

// ─── Payload type ─────────────────────────────────────────────────────────

export interface FriendRequestMutationBreadcrumbData {
  /**
   * The stable SDK function name. One of:
   *   - `social.sendFriendRequest`     (POST)
   *   - `social.respondFriendRequest`  (POST)
   *   - `social.cancelFriendRequest`   (DELETE)
   *   - `social.removeFriend`          (DELETE)
   */
  route: Social68Route;
  /** `"POST"` for send / respond, `"DELETE"` for cancel / unfriend. */
  method: "POST" | "DELETE";
  /** The HTTP status code. `undefined` for network failures (non-HTTP). */
  status?: number;
  /** The measured call duration in milliseconds. */
  durationMs: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
  /**
   * The target user's public identifier. NOT an internal ID. The
   * unstable `friendshipId` is never included — it is consumed only as
   * an in-memory argument to `respondFriendRequest` and
   * `cancelFriendRequest` and is never logged to Sentry.
   */
  targetUserId: string;
}

// ─── Helper ────────────────────────────────────────────────────────────────

/**
 * Emit a `social:6.8` breadcrumb for a friend-request mutation.
 *
 * @example
 *   // Successful send
 *   addFriendRequestMutationBreadcrumb({
 *     route: "social.sendFriendRequest",
 *     method: "POST",
 *     status: 201,
 *     durationMs: 43,
 *     targetUserId: "user-abc",
 *   });
 *
 * @example
 *   // Failed respond (network failure)
 *   addFriendRequestMutationBreadcrumb({
 *     route: "social.respondFriendRequest",
 *     method: "POST",
 *     status: undefined,
 *     durationMs: 5000,
 *     targetUserId: "user-abc",
 *   });
 *
 * @example
 *   // Failed cancel with stable code
 *   addFriendRequestMutationBreadcrumb({
 *     route: "social.cancelFriendRequest",
 *     method: "DELETE",
 *     status: 403,
 *     durationMs: 61,
 *     code: "SOCIAL_FRIEND_REQUEST_FORBIDDEN",
 *     targetUserId: "user-abc",
 *   });
 */
export function addFriendRequestMutationBreadcrumb(
  data: FriendRequestMutationBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    method: data.method,
    epic: SOCIAL_EPIC_6_8_VERSION,
  };

  if (data.status !== undefined) payload.status = data.status;
  payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;
  // targetUserId is the public user identifier, NOT an internal ID.
  payload.targetUserId = data.targetUserId;

  Sentry.addBreadcrumb({
    category: EPIC_6_8_BREADCRUMB_CATEGORY,
    data: payload,
  });
}