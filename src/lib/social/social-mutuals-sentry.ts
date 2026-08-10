/**
 * `social-mutuals-sentry.ts` — Phase 6.4 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4.
 * Source ticket: TKT-6.4.C1 (initial), TKT-6.4.D1 (extension).
 *
 * ## Purpose
 *
 * Centralised helpers for the `social:6.4` Sentry breadcrumb
 * category that every Story 6.4 service wrapper and read hook
 * emits. The helpers in this file are the **only** functions the
 * Story 6.4 surfaces use to emit breadcrumbs; the
 * `social-lint-invariants` script asserts that no caller bypasses
 * them.
 *
 * The breadcrumb payload shapes are locked by the Phase 6 / 6.4
 * telemetry contract:
 *
 * ```ts
 * // Mutual service breadcrumb (TKT-6.4.C1)
 * {
 *   category: "social:6.4",
 *   data: {
 *     route: "social.getMutualFriends" | "social.getMutualFollowers",
 *     targetUserId: string,
 *     surface: "mutuals-friends" | "mutuals-followers",
 *     total?: number,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     epic: "1.0.0",
 *   }
 * }
 *
 * // Activity service breadcrumb (TKT-6.4.D1)
 * {
 *   category: "social:6.4",
 *   data: {
 *     route: "social.getUserActivity",
 *     targetUserId: string,
 *     surface: "user-activity",
 *     rateLimited?: boolean,
 *     cooldownSeconds?: number,
 *     total?: number,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     epic: "1.0.0",
 *   }
 * }
 * ```
 *
 * ## Why a separate file from `social-sentry.ts`
 *
 * The Epic 6.1 helpers live in `social-sentry.ts` and use the
 * `social:6.1` category. Story 6.4 introduces the mutual- and
 * activity-surface telemetry with its own breadcrumb payload
 * (the `surface` discriminator + rate-limit signalling). Keeping
 * the two epics' helpers in separate files makes the contract
 * difference explicit and lets the lint invariant grep for the new
 * helpers without entangling the Epic 6.1 shape.
 */

import * as Sentry from "@sentry/nextjs";

// ─── Constants ───────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.4 telemetry. Distinct from
 * the Epic 6.1 / 6.2 / 6.3 categories so the Sentry dashboard can
 * split the four epics' events.
 */
export const EPIC_6_4_BREADCRUMB_CATEGORY = "social:6.4" as const;

/**
 * The Epic 6.4 version. The epic-version is emitted as a
 * breadcrumb data field so the dashboard can split event
 * volumes by Phase 6 release-train.
 */
export const SOCIAL_EPIC_6_4_VERSION = "1.0.0" as const;

// ─── Stable route names ──────────────────────────────────────────────────

/**
 * The stable SDK function names the Story 6.4 surfaces call. Each
 * value is also the documented Epic 6.4 wiring contract — it MUST
 * match the SDK wrapper name so a future regression that swaps the
 * wrapper for an inline fetch surfaces as a breadcrumb mismatch.
 */
export const SOCIAL_6_4_ROUTES = {
  getMutualFriends: "social.getMutualFriends",
  getMutualFollowers: "social.getMutualFollowers",
  getUserActivity: "social.getUserActivity",
} as const;

export type Social64Route =
  (typeof SOCIAL_6_4_ROUTES)[keyof typeof SOCIAL_6_4_ROUTES];

/**
 * The mutual-surface discriminator. `mutuals-friends` represents
 * the `/social/users/:id/mutual-friends` endpoint; `mutuals-followers`
 * represents `/social/users/:id/mutual-followers`.
 */
export type MutualSurface = "mutuals-friends" | "mutuals-followers";

// ─── Mutual breadcrumb ───────────────────────────────────────────────────

/**
 * The payload shape for a mutual-service breadcrumb. The fields are
 * the union of the documented Phase 6.4 telemetry contract for the
 * mutual surfaces.
 */
export interface SocialMutualBreadcrumbData {
  /** The stable SDK function name the breadcrumb describes. */
  route:
    | typeof SOCIAL_6_4_ROUTES.getMutualFriends
    | typeof SOCIAL_6_4_ROUTES.getMutualFollowers;
  /** The target user id the mutual is scoped to. */
  targetUserId: string;
  /** The mutual surface the breadcrumb describes. */
  surface: MutualSurface;
  /** The total number of mutual entries reported by the surface. */
  total?: number;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
}

/**
 * Emit a `social:6.4` breadcrumb for a mutual-service data fetch.
 * The shape mirrors the Epic 6.2 service breadcrumb pattern
 * (`route` is a stable SDK function name) and extends it with the
 * mutual-specific `surface` discriminator.
 *
 * @example
 *   addSocialMutualBreadcrumb({
 *     route: "social.getMutualFriends",
 *     targetUserId: "user-42",
 *     surface: "mutuals-friends",
 *     total: 12,
 *   });
 */
export function addSocialMutualBreadcrumb(
  data: SocialMutualBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    targetUserId: data.targetUserId,
    surface: data.surface,
    epic: SOCIAL_EPIC_6_4_VERSION,
  };
  if (data.total !== undefined) payload.total = data.total;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_4_BREADCRUMB_CATEGORY,
    data: payload,
  });
}

// ─── Activity breadcrumb ─────────────────────────────────────────────────

/**
 * The payload shape for an activity-service breadcrumb. The fields
 * are the union of the documented Phase 6.4 telemetry contract for
 * the activity surface, plus the rate-limit signals the consumer
 * renders through `ActivityRateLimitNotice`. UI-side telemetry
 * (e.g. the `ActivityStreamItem` defensive fallback's
 * `unknown_discriminator` breadcrumb) reuses the same helper with
 * the `reason` field populated.
 */
export interface SocialActivityBreadcrumbData {
  /** The stable SDK function name the breadcrumb describes. */
  route: typeof SOCIAL_6_4_ROUTES.getUserActivity;
  /** The target user id the activity stream is scoped to. */
  targetUserId: string;
  /** The activity surface (always `'user-activity'` for Story 6.4). */
  surface: "user-activity";
  /**
   * `true` when the response carried a rate-limit signal
   * (`cooldownSeconds > 0` or `code` in the documented rate-limit set).
   */
  rateLimited?: boolean;
  /** The decoded cooldown, in seconds. `undefined` when not rate-limited. */
  cooldownSeconds?: number;
  /** The total number of activity entries reported by the surface. */
  total?: number;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
  /**
   * Optional UI-side reason code. Carries a discriminator-level
   * signal (e.g. `'unknown_discriminator'` for the
   * `ActivityStreamItem` defensive fallback) so the Sentry dashboard
   * can surface UI drift in production. UI consumers populate this
   * field; service-side consumers leave it `undefined`.
   */
  reason?: string;
  /**
   * Optional discriminator string. UI consumers populate this when
   * reporting an unknown activity-item discriminator; service-side
   * consumers leave it `undefined`.
   */
  discriminator?: string;
}

/**
 * Emit a `social:6.4` breadcrumb for an activity-service data fetch.
 * The shape mirrors the Epic 6.2 service breadcrumb pattern
 * (`route` is a stable SDK function name) and extends it with the
 * rate-limit fields (`rateLimited`, `cooldownSeconds`). UI-side
 * breadcrumbs (e.g. the `ActivityStreamItem` defensive fallback)
 * use the same helper with `reason` / `discriminator` populated.
 *
 * @example
 *   addSocialActivityBreadcrumb({
 *     route: "social.getUserActivity",
 *     targetUserId: "user-42",
 *     surface: "user-activity",
 *     rateLimited: true,
 *     cooldownSeconds: 30,
 *   });
 */
export function addSocialActivityBreadcrumb(
  data: SocialActivityBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    targetUserId: data.targetUserId,
    surface: data.surface,
    epic: SOCIAL_EPIC_6_4_VERSION,
  };
  if (data.rateLimited !== undefined) payload.rateLimited = data.rateLimited ? 1 : 0;
  if (data.cooldownSeconds !== undefined) payload.cooldownSeconds = data.cooldownSeconds;
  if (data.total !== undefined) payload.total = data.total;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;
  if (data.reason !== undefined) payload.reason = data.reason;
  if (data.discriminator !== undefined) payload.discriminator = data.discriminator;

  Sentry.addBreadcrumb({
    category: EPIC_6_4_BREADCRUMB_CATEGORY,
    data: payload,
  });
}
