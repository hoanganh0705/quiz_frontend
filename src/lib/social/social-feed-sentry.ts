/**
 * `social-feed-sentry.ts` — Phase 6.9 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.9 — Global Social Feed (read-only rendering).
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.H1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `social:6.9` Sentry breadcrumb
 * category that every Story 6.9 service wrapper and read hook
 * emits. The helpers in this file are the **only** functions the
 * Story 6.9 surfaces use to emit breadcrumbs; the
 * `social-lint-invariants` script (TKT-6.9.H2) asserts that no
 * caller bypasses them.
 *
 * The breadcrumb payload shape is locked by the Phase 6 / 6.9
 * telemetry contract:
 *
 * ```ts
 * {
 *   category: "social:6.9",
 *   data: {
 *     route: "social.getFeed",
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     viewerUserId: string,
 *     hasMore: boolean,
 *     total: number,
 *     reason?: string,
 *     epic: "1.0.0",
 *   }
 * }
 * ```
 *
 * ## Why a separate file from `social-sentry.ts`
 *
 * The Epic 6.1 helpers live in `social-sentry.ts` and use the
 * `social:6.1` category. The Epic 6.4 helpers (TKT-6.4.C1 +
 * TKT-6.4.D1) live in `social-mutuals-sentry.ts`. Story 6.9 introduces
 * the feed-surface telemetry with its own breadcrumb payload (the
 * `viewerUserId` + `hasMore` + `total` projection). Keeping the
 * helpers in a separate file makes the contract difference explicit
 * and lets the lint invariant grep for the new helpers without
 * entangling the Epic 6.1 / 6.4 shapes.
 *
 * ## Token / authorization / cookie safety
 *
 * The payload never includes tokens, authorization headers, or
 * cookies. The Epic 6.9 telemetry contract is "route + status +
 * timing + code + non-sensitive metadata". A regression that
 * introduces a token-shaped field is a contract violation; the
 * `social-lint-invariants` script (`TKT-6.9.H2 AC #3`) asserts
 * the property.
 *
 * ## UI-side breadcrumbs
 *
 * UI consumers (e.g. the `FeedItemRenderer` defensive fallback in
 * TKT-6.9.E1) reuse the same helper with the `reason` field
 * populated. The `reason` value is the documented UI-side signal
 * (e.g. `'unknown_discriminator'`).
 */

import * as Sentry from "@sentry/nextjs";

// ─── Constants ───────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.9 telemetry. Distinct from
 * the Epic 6.1 / 6.2 / 6.3 / 6.4 / 6.5 / 6.6 / 6.7 / 6.8
 * categories so the Sentry dashboard can split the Phase 6
 * epics' events.
 */
export const EPIC_6_9_BREADCRUMB_CATEGORY = "social:6.9" as const;

/**
 * The Epic 6.9 breadcrumb-helper version. The epic-version is emitted
 * as a breadcrumb data field so the dashboard can split event volumes
 * by Phase 6 release-train.
 *
 * Renamed from `EPIC_6_9_VERSION` (now `SOCIAL_EPIC_6_9_VERSION` in
 * `@/lib/social/social-sentry`) to disambiguate this module-scoped
 * helper version from the broader epic release-train version. Without
 * the rename, importing both `social-sentry.ts` and `social-feed-sentry.ts`
 * in the same file would surface a `TS2300: Duplicate identifier`
 * error — pre-slice-3, the two modules exported the same name with
 * different values ("6.9.0" vs. "1.0.0"), which is a latent runtime
 * hazard even when no single file imports both (the bundle resolves
 * one or the other depending on import order). Slice 3 fix:
 * `TKT-6.9.H1` doc-pinned.
 */
export const SOCIAL_FEED_BREADCRUMB_VERSION = "1.0.0" as const;

// ─── Stable route names ──────────────────────────────────────────────────

/**
 * The stable SDK function names the Story 6.9 surfaces call. Each
 * value is also the documented Epic 6.9 wiring contract — it MUST
 * match the SDK wrapper name so a future regression that swaps the
 * wrapper for an inline fetch surfaces as a breadcrumb mismatch.
 */
export const SOCIAL_6_9_ROUTES = {
  getFeed: "social.getFeed",
} as const;

export type Social69Route =
  (typeof SOCIAL_6_9_ROUTES)[keyof typeof SOCIAL_6_9_ROUTES];

// ─── Feed breadcrumb ─────────────────────────────────────────────────────

/**
 * The payload shape for a feed-service breadcrumb. The fields are
 * the union of the documented Phase 6.9 telemetry contract for the
 * global feed surface, plus the optional `reason` field for UI-side
 * breadcrumbs (e.g. the `FeedItemRenderer` defensive fallback in
 * TKT-6.9.E1).
 */
export interface SocialFeedBreadcrumbData {
  /** The stable SDK function name the breadcrumb describes. */
  route: typeof SOCIAL_6_9_ROUTES.getFeed;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
  /**
   * The viewer's user id the feed is scoped to. NOT a token or
   * authorization header. UI consumers leave this `undefined`
   * when the breadcrumb is unrelated to a viewer (none today).
   */
  viewerUserId?: string;
  /**
   * `true` when the server reports more pages exist; mirrors the
   * `hasMore` projection in `FeedServiceResult`.
   */
  hasMore?: boolean;
  /**
   * The total number of feed items reported by the surface. Mirrors
   * the `items.length` projection in `FeedServiceResult`.
   */
  total?: number;
  /**
   * Optional UI-side reason code. Carries a discriminator-level
   * signal (e.g. `'unknown_discriminator'` for the
   * `FeedItemRenderer` defensive fallback) so the Sentry dashboard
   * can surface UI drift in production. UI consumers populate this
   * field; service-side consumers leave it `undefined`.
   */
  reason?: string;
  /**
   * Optional discriminator string. UI consumers populate this when
   * reporting an unknown feed-item discriminator; service-side
   * consumers leave it `undefined`.
   */
  discriminator?: string;
}

/**
 * Emit a `social:6.9` breadcrumb for a feed-service data fetch.
 * The shape mirrors the Epic 6.4 / TKT-6.4.D1 service breadcrumb
 * pattern (`route` is a stable SDK function name) and extends it
 * with the feed-specific projection (`viewerUserId`, `hasMore`,
 * `total`). UI-side breadcrumbs (e.g. the `FeedItemRenderer`
 * defensive fallback) use the same helper with `reason` /
 * `discriminator` populated.
 *
 * @example
 *   addSocialFeedBreadcrumb({
 *     route: "social.getFeed",
 *     status: 200,
 *     durationMs: 87,
 *     viewerUserId: "user-42",
 *     hasMore: true,
 *     total: 20,
 *   });
 */
export function addSocialFeedBreadcrumb(
  data: SocialFeedBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    epic: SOCIAL_FEED_BREADCRUMB_VERSION,
  };
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;
  if (data.viewerUserId !== undefined) payload.viewerUserId = data.viewerUserId;
  if (data.hasMore !== undefined) payload.hasMore = data.hasMore ? 1 : 0;
  if (data.total !== undefined) payload.total = data.total;
  if (data.reason !== undefined) payload.reason = data.reason;
  if (data.discriminator !== undefined) {
    payload.discriminator = data.discriminator;
  }

  Sentry.addBreadcrumb({
    category: EPIC_6_9_BREADCRUMB_CATEGORY,
    data: payload,
  });
}
