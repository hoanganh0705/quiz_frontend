/**
 * `activity.service.ts` — Story 6.4 service wrapper for the user
 * activity endpoint.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.D1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for the Story 6.4 activity read
 * endpoint:
 *
 *   - `GET /api/v1/social/users/:userId/activity` — `getUserActivity`
 *
 * The wrapper decodes RFC 7807 errors, emits `social:6.4` Sentry
 * breadcrumbs, strips any leaked `followId` / `friendshipId`
 * through the Epic 6.1 DTO adapter, decodes the rate-limit
 * header, and returns normalised domain objects
 * (`SocialActivityItemDto[]`).
 *
 * ## Why a separate file from `social-graph.service.ts`
 *
 * The existing `social-graph.service.ts` (TKT-6.1.E2) exposes
 * `getUserActivity` as a thin SDK pass-through for the Epic 6.1
 * callers (Story 6.3 analytics, Story 6.7 search, etc.). The
 * Story 6.4 activity wrapper adds the additional behaviour the
 * Story 6.4 read hook requires:
 *
 *   - Story-6.4-specific Sentry breadcrumbs via `social-mutuals-sentry.ts`.
 *   - Rate-limit header decoding — the cooldown is surfaced via
 *     the `cooldownSeconds` field so the
 *     `ActivityRateLimitNotice` (TKT-6.4.B3) can render the
 *     countdown.
 *   - The Story 6.4 hook-specific shape — `{ items, total,
 *     visibility, cooldownSeconds? }` instead of the Epic 6.1
 *     `SocialPage<SocialActivityItemDto>`.
 *
 * ## Rate-limit decoding
 *
 * The activity endpoint emits `429` with `code:
 * 'ACTIVITY_RATE_LIMITED'` and an `extensions.retryAfterMs`
 * payload. The wrapper decodes the cooldown via
 * `decodeRateLimit` (TKT-6.4.D1) and surfaces it via
 * `cooldownSeconds`. When no rate-limit signal is present,
 * `cooldownSeconds` is `undefined` so the consumer hook can
 * detect the absence cleanly.
 *
 * ## Pattern
 *
 * Mirrors the Epic 6.1 / 6.3 service-wrapper convention:
 *
 *   - `ApiError` is propagated unchanged so callers can branch
 *     on `apiError.code`.
 *   - One `social:6.4` Sentry breadcrumb per call (via the
 *     helpers in `@/lib/social/social-mutuals-sentry`).
 *   - Paginated endpoints return the documented
 *     `{ items, total, visibility, cooldownSeconds? }` shape.
 *   - Items are defensively re-projected through `toActivityItem`
 *     (TKT-6.1.C2) so unknown `type` discriminators are dropped
 *     before the wrapper returns.
 *   - Internal-id leakage defence: `toActivityItem` strips any
 *     leaked `followId` / `friendshipId` from the wire body
 *     (the `actorUser` field is a placeholder — the activity
 *     endpoint never surfaces the actor because the target
 *     user is implicit).
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetUserActivityResult,
} from "@/lib/api/generated/social/social";

import { addSocialActivityBreadcrumb } from "@/lib/social/social-mutuals-sentry";

import { toActivityItem } from "@/features/social/dto-adapters";
import { decodeRateLimit } from "@/features/social/rate-limit-decoder";
import { isActivityRateLimitCode } from "@/features/social/activity-discriminator";
import type { SocialActivityItemDto } from "@/features/social/types";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * The normalised response shape every Story 6.4 activity hook
 * consumes. The shape mirrors the documented TKT-6.4.D1
 * contract.
 */
export interface ActivityServiceResult {
  readonly items: readonly SocialActivityItemDto[];
  readonly total: number;
  readonly visibility: SocialListVisibility;
  /**
   * The decoded cooldown in seconds when the backend signalled
   * a rate limit; `undefined` when no rate-limit signal was
   * present. The hook consumes this to drive
   * `ActivityRateLimitNotice`.
   */
  readonly cooldownSeconds?: number;
}

/**
 * Pagination params accepted by the Story 6.4 activity wrapper.
 * The cursor / limit shape mirrors the Epic 6.1 wrapper
 * signature (TKT-6.1.E2).
 */
export interface ActivityServicePagination {
  readonly cursor?: string;
  readonly limit?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Throw a `GLOBAL_INTERNAL_ERROR` `ApiError` when the SDK envelope
 * is missing entirely. Mirrors the convention established by
 * `social.service.ts` (TKT-6.1.E1).
 */
function requireEnvelope<T>(wire: T | null | undefined, message: string): T {
  if (wire === null || wire === undefined) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return wire;
}

/**
 * Clamp `total` against a non-negative integer. The helper is a
 * pure function — no clock, no random.
 */
function clampTotal(total: number): number {
  if (!Number.isFinite(total) || total < 0) return 0;
  return Math.floor(total);
}

/**
 * Map the SDK envelope to the Story 6.4 activity shape. Items are
 * defensively re-projected through `toActivityItem` (TKT-6.1.C2)
 * which strips unknown `type` discriminators and any leaked
 * internal ids.
 */
function projectActivityPage(envelope: SocialControllerGetUserActivityResult): {
  items: SocialActivityItemDto[];
  total: number;
} {
  const rows = envelope?.data ?? [];
  const items: SocialActivityItemDto[] = [];
  for (const row of rows) {
    const projected = toActivityItem(row);
    if (projected !== null) items.push(projected);
  }
  // The activity endpoint is cursor-paginated
  // (`SocialControllerGetUserActivity200AllOfMeta.pagination:
  // PaginationMetaDto`) — the metadata does not carry a `total`
  // count. The projection falls back to the items length so the
  // consumer hook always receives a non-negative integer.
  const total = clampTotal(items.length);
  return { items, total };
}

// ─── `getUserActivity` ───────────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/activity`
 *
 * Cursor-paginated list of public activity events for the target
 * user. Items with unknown `type` discriminators are dropped by
 * `toActivityItem` (TKT-6.1.C2) so the read hook always
 * receives a clean array of canonical `SocialActivityItemDto`
 * projections.
 *
 * The wrapper:
 *
 *   - Emits a `social:6.4` Sentry breadcrumb via
 *     `addSocialActivityBreadcrumb`.
 *   - Decodes the rate-limit header (when present) via
 *     `decodeRateLimit` and surfaces it via `cooldownSeconds`.
 *   - Propagates `ApiError` unchanged so the consumer hook can
 *     branch on `error.code`.
 *
 * @param targetUserId The target user id whose activity stream is queried.
 * @param pagination Optional cursor / limit pagination params.
 * @returns An `ActivityServiceResult` containing the projected
 *          items, the clamped total, the default visibility
 *          (`'visible'`), and an optional `cooldownSeconds`.
 */
export async function getUserActivity(
  targetUserId: string,
  pagination?: ActivityServicePagination,
): Promise<ActivityServiceResult> {
  addSocialActivityBreadcrumb({
    route: "social.getUserActivity",
    targetUserId,
    surface: "user-activity",
  });

  let wire: SocialControllerGetUserActivityResult;
  try {
    wire = await getSocial().socialControllerGetUserActivity(
      targetUserId,
      pagination,
    );
  } catch (err) {
    // Rate-limit path: decode the cooldown from the ApiError and
    // rethrow with the documented payload so the consumer hook
    // can map the error code to `cooldownSeconds`.
    const apiErr = err as Partial<ApiError> | null;
    if (apiErr !== null && isActivityRateLimitCode(apiErr.code)) {
      const { cooldownSeconds } = decodeRateLimit(
        apiErr as unknown as ApiError | null,
      );
      addSocialActivityBreadcrumb({
        route: "social.getUserActivity",
        targetUserId,
        surface: "user-activity",
        rateLimited: true,
        cooldownSeconds: cooldownSeconds ?? undefined,
        code: apiErr.code,
      });
    } else if (apiErr !== null) {
      addSocialActivityBreadcrumb({
        route: "social.getUserActivity",
        targetUserId,
        surface: "user-activity",
        code: apiErr.code,
      });
    }
    throw err;
  }

  const envelope = requireEnvelope(
    wire,
    "Get user activity response missing envelope",
  );
  const projected = projectActivityPage(envelope);
  addSocialActivityBreadcrumb({
    route: "social.getUserActivity",
    targetUserId,
    surface: "user-activity",
    total: projected.total,
  });
  return {
    items: projected.items,
    total: projected.total,
    visibility: "visible",
  };
}
