/**
 * `phase6_6_2_sentry.ts` — Phase 6.2 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.H1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `phase6:6.2` Sentry breadcrumb category
 * that every social list page and the counts badge emit. The helpers
 * in this file are the **only** functions the list pages and badge
 * use to emit breadcrumbs; the `phase6-lint-invariants` script
 * (`scripts/phase6-lint-invariants.mjs`) asserts that no caller
 * bypasses them.
 *
 * The breadcrumb payload shapes are locked by the Phase 6 telemetry
 * contract (`PHASE_6_IMPLEMENTATION_PLAN.md` Exit Criterion #11):
 *
 * ```ts
 * // List breadcrumb (TKT-6.2.H1 — read-side)
 * {
 *   category: "phase6:6.2",
 *   data: {
 *     kind: "followers" | "following" | "friends" | "blocked",
 *     targetUserId: string,
 *     offset: number,
 *     limit: number,
 *     total?: number,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     epic: "1.0.0",
 *   }
 * }
 *
 * // Counts badge breadcrumb
 * {
 *   category: "phase6:6.2",
 *   data: {
 *     route: "social.getCounts",
 *     targetUserId: string,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     epic: "1.0.0",
 *   }
 * }
 * ```
 *
 * ## Why a separate file from `phase6_sentry.ts`
 *
 * The Epic 6.1 helpers live in `phase6_sentry.ts` and use the
 * `phase6:6.1` category. Phase 6.2 introduces read-side list
 * telemetry and badge telemetry with a different breadcrumb
 * payload (kind / targetUserId / offset / limit / total). Keeping
 * the two epics' helpers in separate files makes the contract
 * difference explicit and lets the lint invariant grep for the
 * new helpers without entangling the Epic 6.1 shape.
 */

import * as Sentry from "@sentry/nextjs";

import type { SocialListKind } from "@/features/social/components/SocialListKind";

// ─── Constants ───────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.2 telemetry. Distinct from
 * the Epic 6.1 category so the Sentry dashboard can split the
 * two epics' events.
 */
export const EPIC_6_2_BREADCRUMB_CATEGORY = "phase6:6.2" as const;

/**
 * The Epic 6.2 version. The epic-version is emitted as a breadcrumb
 * data field so the dashboard can split event volumes by Phase 6
 * release-train.
 */
export const EPIC_6_2_VERSION = "1.0.0" as const;

// ─── List breadcrumb ─────────────────────────────────────────────────────

/**
 * The payload shape for a social list breadcrumb. The fields are
 * the union of the documented Phase 6.2 telemetry contract for the
 * list-page surfaces (Followers, Following, Friends, Blocked).
 */
export interface SocialListBreadcrumbData {
  /** The list kind (followers / following / friends / blocked). */
  kind: SocialListKind;
  /** The target user id the list page is for. */
  targetUserId: string;
  /** The offset of the loaded page. */
  offset: number;
  /** The limit of the loaded page. */
  limit: number;
  /** The total number of items reported by the page (when known). */
  total?: number;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
}

/**
 * Emit a `phase6:6.2` breadcrumb for a social list page data fetch.
 *
 * @example
 *   addSocialListBreadcrumb({
 *     kind: "followers",
 *     targetUserId: "user-1",
 *     offset: 0,
 *     limit: 20,
 *     status: 200,
 *     durationMs: 142,
 *   });
 */
export function addSocialListBreadcrumb(
  data: SocialListBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    kind: data.kind,
    targetUserId: data.targetUserId,
    offset: data.offset,
    limit: data.limit,
    epic: EPIC_6_2_VERSION,
  };
  if (data.total !== undefined) payload.total = data.total;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_2_BREADCRUMB_CATEGORY,
    data: payload,
  });
}

// ─── Counts badge breadcrumb ─────────────────────────────────────────────

/**
 * The payload shape for the social counts badge breadcrumb. The
 * shape mirrors the service breadcrumb pattern (`route` is a stable
 * SDK function name) and carries the `targetUserId` for filtering.
 */
export interface SocialCountsBadgeBreadcrumbData {
  /** The target user id the badge is showing counts for. */
  targetUserId: string;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
}

/**
 * Emit a `phase6:6.2` breadcrumb for the social counts badge data
 * fetch. Uses the same shape as the Epic 6.1 service breadcrumb
 * (route: 'social.getCounts') so the dashboard's per-route split
 * works uniformly across the two epics.
 *
 * @example
 *   addSocialCountsBadgeBreadcrumb({
 *     targetUserId: "user-1",
 *     status: 200,
 *     durationMs: 86,
 *   });
 */
export function addSocialCountsBadgeBreadcrumb(
  data: SocialCountsBadgeBreadcrumbData,
): void {
  const payload: Record<string, string | number> = {
    route: "social.getCounts",
    targetUserId: data.targetUserId,
    epic: EPIC_6_2_VERSION,
  };
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_2_BREADCRUMB_CATEGORY,
    data: payload,
  });
}