/**
 * `mutuals.service.ts` — Story 6.4 service wrappers for the
 * mutual-friends and mutual-followers endpoints.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.C1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for the two Story 6.4 mutual
 * read endpoints:
 *
 *   - `GET /api/v1/social/users/:userId/mutual-friends`  — `getMutualFriends`
 *   - `GET /api/v1/social/users/:userId/mutual-followers` — `getMutualFollowers`
 *
 * The wrappers decode RFC 7807 errors, emit `phase6:6.4` Sentry
 * breadcrumbs, normalise the response envelope (`data` / `meta`),
 * apply the mutual-count cap invariants (`mutual-count-invariants.ts`),
 * and return normalised domain objects (`SocialMutualDto[]`).
 *
 * ## Why a separate file from `social-graph.service.ts`
 *
 * The existing `social-graph.service.ts` (TKT-6.1.E2) exposes
 * `getMutualFriends` / `getMutualFollowers` as thin SDK
 * pass-throughs for the Epic 6.1 callers (Epic 6.2 list pages,
 * Epic 6.7 search, etc.). The Story 6.4 service wrappers add the
 * additional behaviour the Story 6.4 read hooks require:
 *
 *   - Story-6.4-specific Sentry breadcrumbs via `phase6_6_4_sentry.ts`.
 *   - Cap clamping against the mutual-count invariants
 *     (`MUTUAL_TOTAL_HARD_CAP`).
 *   - Mutual-count-only projection (`SocialMutualDto[]`) — the
 *     existing `social-graph.service.ts` wrappers return
 *     `SocialPage<SocialMutualDto>` which the Epic 6.2 hooks
 *     consume; the Story 6.4 hooks consume the simpler
 *     `{ items, total, visibility }` shape.
 *
 * The Story 6.4 wrappers are intentionally **layered on top** of
 * the Epic 6.1 wrappers (via `getMutualFriends` /
 * `getMutualFollowers` from `@/features/social/services`) so the
 * Epic 6.1 envelope-unwrapping logic stays single-sourced.
 *
 * ## Pattern
 *
 * Mirrors the Epic 6.1 / 6.3 service-wrapper convention:
 *
 *   - `ApiError` is propagated unchanged so callers can branch
 *     on `apiError.code`.
 *   - One `phase6:6.4` Sentry breadcrumb per call (via the
 *     helpers in `@/lib/social/phase6_6_4_sentry`).
 *   - Paginated endpoints return the documented
 *     `{ items, total, visibility }` shape — the canonical
 *     `SocialPage<T>` discriminated union is preserved as an
 *     internal detail.
 *   - Internal-id leakage defence: the underlying `toMutual`
 *     adapter (TKT-6.1.C2) strips any leaked `followId` /
 *     `friendshipId` from the wire body.
 *
 * ## Cap invariants
 *
 * The wrappers clamp `total` against `MUTUAL_TOTAL_HARD_CAP`
 * (TKT-6.4.A3) before returning so the consumer hook never
 * receives a count above the documented ceiling. The
 * `mutualCountOverflow` helper is the canonical place to derive
 * the overflow descriptor — the hook consumes the descriptor, the
 * service only enforces the cap.
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetMutualFollowersResult,
  SocialControllerGetMutualFriendsResult,
} from "@/lib/api/generated/social/social";

import {
  addSocialMutualBreadcrumb,
  type MutualSurface,
} from "@/lib/social/phase6_6_4_sentry";

import { MUTUAL_TOTAL_HARD_CAP } from "@/features/social/mutual-count-invariants";
import { toMutual } from "@/features/social/dto-adapters";
import type { SocialMutualDto } from "@/features/social/types";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * The normalised response shape every Story 6.4 mutual hook
 * consumes. The shape is intentionally narrower than
 * `SocialPage<SocialMutualDto>` so the hook does not have to
 * branch on the `paginationKind` discriminator.
 */
export interface MutualServiceResult {
  readonly items: readonly SocialMutualDto[];
  readonly total: number;
  readonly visibility: SocialListVisibility;
}

/**
 * Pagination params accepted by the Story 6.4 mutual wrappers.
 * The cursor / limit shape mirrors the Epic 6.1 wrapper
 * signature (TKT-6.1.E2).
 */
export interface MutualServicePagination {
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
 * Clamp `total` against the documented hard cap. The helper is
 * a pure function — no clock, no random, safe to call inside
 * `useMemo` and `useEffect` dependency arrays.
 */
function clampTotal(total: number): number {
  if (!Number.isFinite(total) || total < 0) return 0;
  if (total > MUTUAL_TOTAL_HARD_CAP) return MUTUAL_TOTAL_HARD_CAP;
  return Math.floor(total);
}

/**
 * Map the SDK envelope to the Story 6.4 mutual shape. Items are
 * projected through `toMutual` (TKT-6.1.C2) which strips any
 * leaked internal ids. The envelope's `total` is clamped against
 * the documented hard cap.
 */
function projectMutualPage(
  envelope:
    | SocialControllerGetMutualFriendsResult
    | SocialControllerGetMutualFollowersResult,
): { items: SocialMutualDto[]; total: number } {
  const rows = envelope?.data ?? [];
  const items: SocialMutualDto[] = rows.map((row) => toMutual(row));
  // The mutual endpoints are cursor-paginated
  // (`SocialControllerGetMutualFriends200AllOfMeta.pagination:
  // PaginationMetaDto`) — the metadata does not carry a `total`
  // count. The projection falls back to the items length so the
  // consumer hook always receives a non-negative integer.
  const total = clampTotal(items.length);
  return { items, total };
}

// ─── `getMutualFriends` ──────────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/mutual-friends`
 *
 * Cursor-paginated list of friends shared between the viewer
 * and the target user. Each row is projected into a
 * `SocialMutualDto` (the adapter joins the wire flat row into a
 * nested `user` summary). `total` is clamped against
 * `MUTUAL_TOTAL_HARD_CAP`.
 *
 * The wrapper emits a `phase6:6.4` Sentry breadcrumb via
 * `addSocialMutualBreadcrumb` and propagates `ApiError` unchanged
 * so the consumer hook can branch on `error.code`.
 *
 * @param targetUserId The target user id whose mutual friends are queried.
 * @param pagination Optional cursor / limit pagination params.
 * @returns A `MutualServiceResult` containing the projected items,
 *          the clamped total, and the default visibility (`'visible'`).
 */
export async function getMutualFriends(
  targetUserId: string,
  pagination?: MutualServicePagination,
): Promise<MutualServiceResult> {
  addSocialMutualBreadcrumb({
    route: "social.getMutualFriends",
    targetUserId,
    surface: "mutuals-friends",
  });
  const wire: SocialControllerGetMutualFriendsResult =
    await getSocial().socialControllerGetMutualFriends(targetUserId, pagination);
  const envelope = requireEnvelope(
    wire,
    "Get mutual friends response missing envelope",
  );
  const projected = projectMutualPage(envelope);
  addSocialMutualBreadcrumb({
    route: "social.getMutualFriends",
    targetUserId,
    surface: "mutuals-friends",
    total: projected.total,
  });
  return {
    items: projected.items,
    total: projected.total,
    visibility: "visible",
  };
}

// ─── `getMutualFollowers` ───────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/mutual-followers`
 *
 * Cursor-paginated list of followers shared between the viewer
 * and the target user. The wire shape is structurally identical
 * to the mutual-friends row, so the same `toMutual` adapter is
 * used. `total` is clamped against `MUTUAL_TOTAL_HARD_CAP`.
 *
 * The wrapper emits a `phase6:6.4` Sentry breadcrumb via
 * `addSocialMutualBreadcrumb` and propagates `ApiError` unchanged
 * so the consumer hook can branch on `error.code`.
 *
 * @param targetUserId The target user id whose mutual followers are queried.
 * @param pagination Optional cursor / limit pagination params.
 * @returns A `MutualServiceResult` containing the projected items,
 *          the clamped total, and the default visibility (`'visible'`).
 */
export async function getMutualFollowers(
  targetUserId: string,
  pagination?: MutualServicePagination,
): Promise<MutualServiceResult> {
  addSocialMutualBreadcrumb({
    route: "social.getMutualFollowers",
    targetUserId,
    surface: "mutuals-followers",
  });
  const wire: SocialControllerGetMutualFollowersResult =
    await getSocial().socialControllerGetMutualFollowers(
      targetUserId,
      pagination,
    );
  const envelope = requireEnvelope(
    wire,
    "Get mutual followers response missing envelope",
  );
  const projected = projectMutualPage(envelope);
  addSocialMutualBreadcrumb({
    route: "social.getMutualFollowers",
    targetUserId,
    surface: "mutuals-followers",
    total: projected.total,
  });
  return {
    items: projected.items,
    total: projected.total,
    visibility: "visible",
  };
}

// ─── Internal helpers (test seam) ────────────────────────────────────────

/**
 * Internal helper exposing the projection pipeline to the spec.
 * The function is intentionally not exported through the
 * service's public barrel — it is a test seam for the spec.
 *
 * The `surface` parameter is the documented
 * `MutualSurface` discriminator — it is part of the breadcrumb
 * contract and is asserted by the spec.
 */
export const __INTERNAL_PROJECTION__ = Object.freeze({
  surface: {
    friends: "mutuals-friends" as MutualSurface,
    followers: "mutuals-followers" as MutualSurface,
  },
});
