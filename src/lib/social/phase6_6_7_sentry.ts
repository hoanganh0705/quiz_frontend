/**
 * `phase6_6_7_sentry.ts` — Phase 6.7 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.G1 / TKT-6.7.G2.
 *
 * ## Purpose
 *
 * Centralised helpers for the `phase6:6.7` Sentry breadcrumb category that
 * every Story 6.7 mutation service call emits. The helpers are the **only**
 * functions `block-mutation.service.ts` uses to emit breadcrumbs; the lint
 * invariants script asserts no caller bypasses them.
 *
 * The breadcrumb payload shape is locked by the Phase 6.7 telemetry contract:
 *
 * ```ts
 * {
 *   category: "phase6:6.7",
 *   data: {
 *     route:   "social.blockUser" | "social.unblockUser",
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
 * relationship bodies, `followId`, and `friendshipId` are never logged.
 */

import * as Sentry from "@sentry/nextjs";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.7 telemetry. Distinct from the
 * Epic 6.1 / 6.2 / 6.3 / 6.4 / 6.5 / 6.6 categories so the Sentry
 * dashboard can split the seven epics' events.
 */
export const EPIC_6_7_BREADCRUMB_CATEGORY = "phase6:6.7" as const;

/**
 * The Epic 6.7 version. Emitted as a breadcrumb data field so the
 * dashboard can split event volumes by Phase 6 release-train.
 */
export const EPIC_6_7_VERSION = "1.0.0" as const;

// ─── Stable route names ────────────────────────────────────────────────────

export const SOCIAL_6_7_ROUTES = {
  blockUser: "social.blockUser",
  unblockUser: "social.unblockUser",
} as const;

export type Social67Route = (typeof SOCIAL_6_7_ROUTES)[keyof typeof SOCIAL_6_7_ROUTES];

// ─── Payload type ─────────────────────────────────────────────────────────

export interface BlockMutationBreadcrumbData {
  /**
   * The stable SDK function name. One of:
   *   - `social.blockUser`    (POST)
   *   - `social.unblockUser`  (DELETE)
   */
  route: Social67Route;
  /** `"POST"` for block, `"DELETE"` for unblock. */
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
 * Emit a `phase6:6.7` breadcrumb for a block / unblock mutation.
 *
 * @example
 *   // Successful block
 *   addBlockMutationBreadcrumb({
 *     route: "social.blockUser",
 *     method: "POST",
 *     status: 204,
 *     durationMs: 43,
 *     targetUserId: "user-abc",
 *   });
 *
 * @example
 *   // Failed block
 *   addBlockMutationBreadcrumb({
 *     route: "social.blockUser",
 *     method: "POST",
 *     status: 409,
 *     durationMs: 61,
 *     code: "SOCIAL_BLOCKED_USER",
 *     targetUserId: "user-abc",
 *   });
 *
 * @example
 *   // Network failure (non-HTTP)
 *   addBlockMutationBreadcrumb({
 *     route: "social.blockUser",
 *     method: "POST",
 *     status: undefined,
 *     durationMs: 5000,
 *     targetUserId: "user-abc",
 *   });
 */
export function addBlockMutationBreadcrumb(
  data: BlockMutationBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    method: data.method,
    epic: EPIC_6_7_VERSION,
  };

  if (data.status !== undefined) payload.status = data.status;
  payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;
  // targetUserId is the public user identifier, NOT an internal ID.
  payload.targetUserId = data.targetUserId;

  Sentry.addBreadcrumb({
    category: EPIC_6_7_BREADCRUMB_CATEGORY,
    data: payload,
  });
}