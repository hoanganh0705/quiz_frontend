/**
 * `social-sentry.ts` — Phase 6 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.H1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `social:6.1` Sentry breadcrumb category
 * that every social service wrapper (TKT-6.1.E1–E6) emits. The helpers
 * in this file are the **only** functions the social services use to
 * emit breadcrumbs; the `social-lint-invariants` script
 * (`scripts/social-lint-invariants.mjs`) asserts that no caller
 * bypasses them.
 *
 * The breadcrumb payload shape is locked by the Phase 6 telemetry
 * contract (the Epic 6.1 PHASE_6_IMPLEMENTATION_PLAN.md document,
 * Exit Criterion #11). The shape is:
 *
 * ```ts
 * {
 *   category: "social:6.1",
 *   data: {
 *     route: string,        // e.g. "social.getRelationshipStatus"
 *     status: number | undefined,  // HTTP status; undefined while in-flight
 *     durationMs: number | undefined,
 *     code?: string,        // ApiError.code when an error occurred
 *     targetUserId?: string, // for /social/users/:userId/* routes
 *     epic: "1.0.0",        // SOCIAL_EPIC_6_1_VERSION
 *   }
 * }
 * ```
 *
 * ## Mutating endpoints
 *
 * `addSocialMutationBreadcrumb` is the dedicated helper for the
 * mutation actions (follow, unfollow, block, unblock, friend request,
 * etc.). The shape is identical except the `route` field is replaced
 * with an `action` field — the action verb is the stable identifier
 * for the mutation, and the URL path is captured separately under
 * `route` (a stable path pattern string, e.g. `POST /social/follow`).
 *
 * ## Why this file ships with Batch H
 *
 * The H1 ticket is the canonical location for the breadcrumb contract.
 * Shipping the helpers in H1 (rather than E1) keeps the E-tickets
 * focused on the service-wrapper invariants and lets the H2 wire-up
 * step do a single-shot replacement of every `Sentry.addBreadcrumb`
 * call in the service files.
 */

import * as Sentry from "@sentry/nextjs";

/**
 * The breadcrumb category constant. Every social service / mutation
 * breadcrumb uses this exact category so the Sentry dashboard can
 * filter Phase 6 telemetry by it.
 */
export const EPIC_6_1_BREADCRUMB_CATEGORY = "social:6.1" as const;

/**
 * The Epic 6.1 version. The epic-version is emitted as a breadcrumb
 * data field so the dashboard can split event volumes by Phase 6
 * release-train.
 */
export const SOCIAL_EPIC_6_1_VERSION = "1.0.0" as const;

/**
 * The payload shape for a social service breadcrumb. The fields are
 * the union of the documented Phase 6 telemetry contract.
 */
export interface SocialServiceBreadcrumbData {
  /** The logical service route — e.g. "social.getRelationshipStatus". */
  route: string;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while the request is in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. Omitted on success. */
  code?: string;
  /** The target user id for `/social/users/:userId/*` routes. */
  targetUserId?: string;
}

/**
 * The payload shape for a social mutation breadcrumb. The shape
 * mirrors the service breadcrumb but uses `action` instead of `route`
 * because the mutation's identity is the action verb (follow,
 * unfollow, block, etc.) rather than the SDK function name.
 */
export interface SocialMutationBreadcrumbData {
  /** The mutation action verb — e.g. "follow", "unfollow", "block". */
  action: string;
  /** The target user id the mutation is targeting. */
  targetUserId: string;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The `ApiError.code` when an error occurred. Omitted on success. */
  code?: string;
}

/**
 * The Epic 6.9 breadcrumb category. Emits a `social:6.9` breadcrumb
 * for the global social feed surface (Story 6.9). The category is
 * intentionally separate from `social:6.1` so the Sentry dashboard
 * can split feed-specific telemetry from relationship telemetry.
 */
export const EPIC_6_9_BREADCRUMB_CATEGORY = "social:6.9" as const;

/**
 * The Epic 6.9 version. The epic-version is emitted as a breadcrumb
 * data field so the dashboard can split event volumes by Phase 6
 * release-train.
 */
export const SOCIAL_EPIC_6_9_VERSION = "6.9.0" as const;

/**
 * The payload shape for an Epic 6.9 (feed) breadcrumb. The shape
 * extends the canonical `SocialServiceBreadcrumbData` with feed-
 * specific fields (`reason`, `discriminator`) so the dashboard can
 * triage unknown-discriminator drift in production.
 */
export interface FeedBreadcrumbData {
  /** The logical route — e.g. "feed.item.unknown". */
  route: string;
  /** The breadcrumb reason. Defaults to `"service"` for the
   *  standard service call. Set to `"unknown_discriminator"` for
   *  the defensive fallback renderer. */
  reason?: "service" | "unknown_discriminator" | "rate_limit";
  /** The raw discriminator value (truncated to 64 chars). */
  discriminator?: string;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while the request is in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. Omitted on success. */
  code?: string;
  /** The Epic 6.9 version, defaults to `SOCIAL_EPIC_6_9_VERSION`. */
  epicVersion?: string;
}

/**
 * Emit a `social:6.9` breadcrumb for an Epic 6.9 (feed) event.
 *
 * The breadcrumb is the canonical telemetry surface for the feed
 * dispatcher (TKT-6.9.E1) and the feed service (TKT-6.9.C1). The
 * function is a thin wrapper around `Sentry.addBreadcrumb` so the
 * callers can stay declarative.
 *
 * @example
 *   addFeedBreadcrumb({
 *     route: "feed.item.unknown",
 *     reason: "unknown_discriminator",
 *     discriminator: "quiz_published",
 *   });
 */
export function addFeedBreadcrumb(data: FeedBreadcrumbData): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    epic: data.epicVersion ?? SOCIAL_EPIC_6_9_VERSION,
  };
  if (data.reason !== undefined) payload.reason = data.reason;
  if (data.discriminator !== undefined) payload.discriminator = data.discriminator;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_9_BREADCRUMB_CATEGORY,
    data: payload,
  });
}

/**
 * Emit a `social:6.1` breadcrumb for a social service call.
 *
 * The breadcrumb payload is the canonical Phase 6 telemetry contract.
 * The function is a thin wrapper around `Sentry.addBreadcrumb` so the
 * service files can stay declarative.
 *
 * @example
 *   addSocialServiceBreadcrumb({
 *     route: "social.getRelationshipStatus",
 *     status: 200,
 *     durationMs: 142,
 *   });
 */
export function addSocialServiceBreadcrumb(
  data: SocialServiceBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    epic: SOCIAL_EPIC_6_1_VERSION,
  };
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;
  if (data.targetUserId !== undefined) {
    payload.targetUserId = data.targetUserId;
  }

  Sentry.addBreadcrumb({
    category: EPIC_6_1_BREADCRUMB_CATEGORY,
    data: payload,
  });
}

/**
 * Emit a `social:6.1` breadcrumb for a social mutation call.
 *
 * The mutation breadcrumb is the dedicated shape for follow /
 * unfollow / block / unblock / friend request / friend request
 * accept / friend request decline actions. The shape is the same as
 * the service breadcrumb but uses `action` instead of `route`.
 *
 * @example
 *   addSocialMutationBreadcrumb({
 *     action: "follow",
 *     targetUserId: "user-42",
 *     status: 204,
 *   });
 */
export function addSocialMutationBreadcrumb(
  data: SocialMutationBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    action: data.action,
    targetUserId: data.targetUserId,
    epic: SOCIAL_EPIC_6_1_VERSION,
  };
  if (data.status !== undefined) payload.status = data.status;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_1_BREADCRUMB_CATEGORY,
    data: payload,
  });
}
