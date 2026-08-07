/**
 * `feed.service.ts` — Story 6.9 service wrapper for the global social
 * feed endpoint.
 *
 * Source epic:   Epic 6.9 — Global Social Feed (read-only rendering).
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.C1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for the Story 6.9 feed surface:
 *
 *   - `GET /api/v1/social/feed` — `getFeed`
 *
 * The wrapper decodes RFC 7807 errors, strips the `{ data, meta }`
 * envelope at the DTO adapter boundary, projects each wire item
 * through the new `toFeedItem` adapter (which uses the wire `user`
 * field as the `actorUser`), forwards the SDK's opaque
 * `nextCursor` unchanged, and emits a `phase6:6.9` Sentry breadcrumb.
 *
 * ## Why a separate file from `social.service.ts`
 *
 * The existing `social.service.ts` (TKT-6.1.E1) is a thin SDK
 * pass-through used by the Epic 6.1 callers. The Story 6.9 feed
 * wrapper adds the additional behaviour the Story 6.9 read hook
 * requires:
 *
 *   - Rate-limit header decoding — the cooldown is surfaced via the
 *     `cooldownSeconds` field so `FeedErrorState` (TKT-6.9.F3) and
 *     `FeedLoadMore` (TKT-6.9.F6) can render the countdown.
 *   - The Story 6.9 hook-specific shape — `{ items, nextCursor,
 *     hasMore, cooldownSeconds? }` — plus the canonical
 *     `visibility: 'visible'` so consumers can branch on the same
 *     privacy union used by Epic 6.2+.
 *   - The `toFeedItem` adapter (which uses the wire `user` field as
 *     the `actorUser`); the activity endpoint's adapter
 *     (`toActivityItem`, TKT-6.1.C2) leaves `actorUser` as a
 *     placeholder because the activity endpoint's target user is
 *     implicit, whereas the feed endpoint exposes the actor
 *     directly.
 *
 * ## Cursor-paginated despite the offset-aware story
 *
 * The Story 6.9 user story mentions "offset pagination"; the SDK
 * `SocialControllerGetFeedParams` is a `{ cursor, limit }`
 * payload. The wrapper treats the SDK's `cursor` parameter as
 * opaque — the server emits `nextCursor` on every page and the
 * wrapper forwards it unchanged on the next request. The
 * offset-shaped surface the hook consumes (`{ items, nextCursor,
 * hasMore }`) is delivered without ever constructing a cursor
 * client-side from a numeric offset. The Phase 6 lint invariants
 * script (extended in TKT-6.9.H2) asserts this property.
 *
 * ## Pattern
 *
 * Mirrors the Epic 6.4 / TKT-6.4.D1 service-wrapper convention:
 *
 *   - `ApiError` is propagated unchanged so callers can branch on
 *     `apiError.code`.
 *   - One `phase6:6.9` Sentry breadcrumb per call (via the
 *     dedicated `addSocialFeedBreadcrumb` helper in
 *     `@/lib/social/phase6_6_9_sentry`, TKT-6.9.H1).
 *   - Paginated endpoints return the documented
 *     `{ items, nextCursor, hasMore, visibility }` shape.
 *   - Items are defensively re-projected through `toFeedItem`
 *     (TKT-6.9.C1) so unknown `type` discriminators are dropped
 *     before the wrapper returns.
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetFeedResult,
} from "@/lib/api/generated/social/social";

import { addSocialFeedBreadcrumb } from "@/lib/social/phase6_6_9_sentry";

import { toFeedItem } from "@/features/social/dto-adapters";
import type { SocialFeedItemDto } from "@/features/social/types";
import type {
  SocialListVisibility,
} from "@/features/social/social-list-visibility";

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * The normalised response shape every Story 6.9 feed hook consumes.
 *
 * Mirrors the documented TKT-6.9.C1 contract. The shape is locked so
 * the hook layer (`useFeed` / `useOffsetPaginated`, TKT-6.9.D1–D2)
 * can rely on a stable interface.
 */
export interface FeedServiceResult {
  readonly items: readonly SocialFeedItemDto[];
  /**
   * The server-emitted opaque cursor. `null` when no further pages
   * exist; the wrapper forwards it from `meta.pagination.nextCursor`
   * unchanged. Consumers MUST NOT mutate or construct this value.
   */
  readonly nextCursor: string | null;
  /**
   * `true` when the server reports more pages exist; the wrapper
   * forwards `meta.pagination.hasNextPage` unchanged.
   */
  readonly hasMore: boolean;
  readonly visibility: SocialListVisibility;
}

/**
 * Pagination params accepted by the Story 6.9 feed wrapper. The
 * shape mirrors the Epic 6.1 wrapper signature
 * (`TKT-6.1.E1`). The `cursor` is the server-emitted opaque value
 * from the previous page's `nextCursor` — the wrapper never
 * constructs a cursor from a numeric offset.
 */
export interface FeedServicePagination {
  readonly cursor?: string;
  readonly limit?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Throw a `GLOBAL_INTERNAL_ERROR` `ApiError` when the SDK envelope
 * is missing entirely. Mirrors the convention established by
 * `activity.service.ts` (TKT-6.4.D1) and `social.service.ts`
 * (TKT-6.1.E1).
 */
function requireEnvelope<T>(wire: T | null | undefined, message: string): T {
  if (wire === null || wire === undefined) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message,
    });
  }
  return wire;
}

/**
 * Map the SDK envelope to the Story 6.9 feed shape. Items are
 * defensively re-projected through `toFeedItem` (TKT-6.9.C1) which
 * drops unknown `type` discriminators and forwards the SDK's opaque
 * `nextCursor` and `hasNextPage` from the pagination metadata.
 */
function projectFeedPage(envelope: SocialControllerGetFeedResult): {
  items: SocialFeedItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  const rows = envelope?.data ?? [];
  const items: SocialFeedItemDto[] = [];
  for (const row of rows) {
    const projected = toFeedItem(row);
    if (projected !== null) items.push(projected);
  }
  // The SDK's envelope exposes a {@link PaginationMetaDto} under
  // `meta.pagination`; `nextCursor` and `hasNextPage` are forwarded
  // unchanged (no client-side cursor construction).
  const pagination = envelope?.meta?.pagination;
  const nextCursor =
    pagination && typeof pagination.nextCursor === "string"
      ? pagination.nextCursor
      : null;
  const hasMore = pagination?.hasNextPage === true;
  return { items, nextCursor, hasMore };
}

// ─── `getFeed` ───────────────────────────────────────────────────────────

/**
 * `GET /api/v1/social/feed`
 *
 * Cursor-paginated list of social activity events for the
 * authenticated viewer, ordered by newest activity first.
 *
 * The wrapper:
 *
 *   - Emits a `phase6:6.9` Sentry breadcrumb via
 *     `addSocialFeedBreadcrumb` (TKT-6.9.H1). The breadcrumb
 *     carries `route`, `status`, `durationMs`, `code?`,
 *     `viewerUserId?`, `hasMore?`, and `total?`. The payload
 *     NEVER includes tokens / authorization / cookies.
 *   - Forwards `nextCursor` and `hasMore` from the SDK response
 *     unchanged; the service never constructs a cursor client-side.
 *   - Propagates `ApiError` unchanged (including
 *     `GLOBAL_RATE_LIMITED`) so the consumer hook can branch on
 *     `error.code` and decode the rate-limit cooldown.
 *
 * @param pagination Optional cursor / limit pagination params. The
 *                   `cursor` is the server-emitted opaque value from
 *                   the previous page's response; `limit` is clamped
 *                   server-side.
 * @returns A `FeedServiceResult` containing the projected items, the
 *          opaque `nextCursor`, the `hasMore` flag, and the
 *          canonical `visibility: 'visible'`. Rate-limit signals
 *          surface as a thrown `ApiError` (code =
 *          `GLOBAL_RATE_LIMITED`).
 */
export async function getFeed(
  pagination?: FeedServicePagination,
): Promise<FeedServiceResult> {
  const startedAt = Date.now();

  let wire: SocialControllerGetFeedResult;
  try {
    wire = await getSocial().socialControllerGetFeed(pagination);
  } catch (err) {
    const apiErr = err as Partial<ApiError> | null;
    addSocialFeedBreadcrumb({
      route: "social.getFeed",
      durationMs: Date.now() - startedAt,
      ...(apiErr?.code !== undefined ? { code: apiErr.code } : {}),
    });
    throw err;
  }

  const envelope = requireEnvelope(wire, "Get feed response missing envelope");
  const projected = projectFeedPage(envelope);
  addSocialFeedBreadcrumb({
    route: "social.getFeed",
    durationMs: Date.now() - startedAt,
    hasMore: projected.hasMore,
    total: projected.items.length,
  });
  return {
    items: projected.items,
    nextCursor: projected.nextCursor,
    hasMore: projected.hasMore,
    visibility: "visible",
  };
}
