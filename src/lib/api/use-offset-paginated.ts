/**
 * `useOffsetPaginated` — The offset-aware pagination primitive that
 * wraps `useCursorPaginated` with `paginationKind: 'offset'`.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.D1.
 *
 * ## Purpose
 *
 * The Story 6.9 hook layer (`useFeed`, TKT-6.9.D2) consumes an
 * offset-shaped API surface — `{ offset, limit, hasMore, loadMore }`
 * — even though the Story 6.9 backend (`/api/v1/social/feed`)
 * cursor-paginates internally. `useOffsetPaginated` is the thin
 * facade that exposes that offset-shaped surface on top of the
 * Phase 3 / TKT-3.2.D1–D7 `useCursorPaginated` primitive.
 *
 * The primitive:
 *
 *   - Delegates to `useCursorPaginated` with `paginationKind:
 *     'offset'` and a fetcher that adapts the caller's offset-shaped
 *     request to the SDK's cursor-paginated interface. The cursor
 *     is provided by the previous page's `nextCursor`; the facade
 *     never constructs a cursor from a numeric offset.
 *   - Returns the documented `{ items, isLoading, isLoadingMore,
 *     hasMore, loadMore, offset, limit, error, refresh }` shape so
 *     consumers do not need to know which pagination kind the
 *     backend uses.
 *   - Clamps `limit` to `[1, FEED_MAX_LIMIT]` (default 50) and
 *     falls back to `FEED_DEFAULT_LIMIT` (default 20) when the
 *     caller passes a non-positive or non-finite value. The clamp
 *     is enforced in the fetcher rather than the hook surface so
 *     the caller's UX (e.g. an off-by-one in a slider) does not
 *     silently degrade.
 *   - Never persists the offset to `localStorage`,
 *     `sessionStorage`, `window.history`, or any SWR cache key —
 *     the SWR cache key is the caller's key, and the offset is a
 *     derived value (`items.length` already paginated) inside the
 *     facet.
 *
 * ## Why a separate primitive from `useCursorPaginated`
 *
 * Story 6.9 documents offset-aware semantics (the user-facing
 * pagination contract for the global feed is offset-numbered),
 * but the backend offset→cursor mapping is owned by the service
 * wrapper (`feed.service.ts`, TKT-6.9.C1). Hook consumers should
 * not have to reach across to two primitives to express a
 * "load next page" affordance. `useOffsetPaginated` consolidates
 * the offset-exposed contract into a single typed surface so the
 * Story 6.9 hook layer (`useFeed`) and any future offset-paginated
 * social surface can share the same primitive.
 *
 * ## SSR-safety
 *
 * The primitive is `"use client"` because SWR is client-only.
 * Server-rendered shells receive a `Placeholder` component until
 * the client takes over (TKT-6.9.G1 `SocialFeedPage`).
 */

"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
  OffsetFetcherArgs,
} from "@/lib/api/use-cursor-paginated.types";

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * Default page size for the offset-aware primitive. The value
 * matches `ACTIVITY_PAGE_SIZE` (TKT-6.4.D2) and the documented
 * feed page size in the Story 6.9 phase plan.
 */
export const FEED_DEFAULT_LIMIT = 20;

/**
 * Maximum page size accepted by the primitive. The value matches
 * the documented SDK bound (`SocialControllerGetFeedParams.limit`
 * has `@maximum 100`); the primitive clamps at 50 to keep the
 * per-page payload bounded.
 */
export const FEED_MAX_LIMIT = 50;

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * The fetcher signature consumed by `useOffsetPaginated`. The
 * fetcher receives an offset-numbered surface
 * (`{ offset, limit, params }`) and returns the documented
 * `OffsetPage<T>` shape.
 */
export type OffsetPaginatedFetcher<T extends { id: string }, P> = (
  args: { readonly offset: number; readonly limit: number; readonly params: P },
) => Promise<{
  readonly items: readonly T[];
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
}>;

/**
 * The params shape accepted by `useOffsetPaginated`. The
 * `paginationKind` literal discriminator is locked to `'offset'`
 * so future consumers can import the type and rely on a single
 * branching point.
 */
export interface UseOffsetPaginatedParams<
  T extends { id: string },
  P,
> {
  /**
   * The SWR cache key. The primitive does NOT append `offset`,
   * `cursor`, or `page` to this key — the offset is a derived
   * value inside the facet.
   */
  readonly key: readonly unknown[];
  /**
   * The fetcher that resolves the page. The fetcher receives
   * `{ offset, limit, params }` (the offset-shaped surface) and
   * returns a `Promise<OffsetPage<T>>`. The primitive adapts the
   * offset request to the underlying `useCursorPaginated` cursor
   * transaction.
   */
  readonly fetcher: OffsetPaginatedFetcher<T, P>;
  /**
   * The per-page size. The primitive clamps the value to
   * `[1, FEED_MAX_LIMIT]` and forwards the clamped value to
   * every fetcher call.
   */
  readonly limit: number;
  /**
   * The params forwarded to the fetcher. The primitive does
   * NOT interpret this value.
   */
  readonly params: P;
  /**
   * Optional. When `true`, SWR will revalidate the cache on
   * `window` focus. Defaults to `false`.
   */
  readonly revalidateOnFocus?: boolean;
}

/**
 * The result shape returned by `useOffsetPaginated`. The field
 * set is the offset-shaped mirror of `UseCursorPaginatedResult<T>`,
 * minus the cursor-management fields (which the primitive owns).
 */
export interface UseOffsetPaginatedResult<T extends { id: string }> {
  readonly items: readonly T[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly offset: number;
  readonly limit: number;
  readonly error: ApiError | null;
  readonly loadMore: () => void;
  readonly refresh: () => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Clamp `limit` against the documented `[1, FEED_MAX_LIMIT]` band.
 * Returns `FEED_DEFAULT_LIMIT` when the input is non-positive or
 * non-finite. The function is pure — no IO, no clock.
 */
function clampLimit(input: number | undefined): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return FEED_DEFAULT_LIMIT;
  }
  if (input <= 0) return FEED_DEFAULT_LIMIT;
  if (input > FEED_MAX_LIMIT) return FEED_MAX_LIMIT;
  return Math.floor(input);
}

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Read a paginated list with an offset-numbered surface. The
 * primitive delegates to `useCursorPaginated` and threads the
 * SDK's opaque cursor through; the consumer never deals with
 * cursors.
 */
export function useOffsetPaginated<
  T extends { id: string },
  P,
>(
  params: UseOffsetPaginatedParams<T, P>,
): UseOffsetPaginatedResult<T> {
  const {
    key,
    fetcher,
    params: passthroughParams,
    limit: callerLimit,
    revalidateOnFocus,
  } = params;

  // The caller's intended per-page size is clamped once per
  // render and forwarded to every subsequent fetcher call.
  const limit = clampLimit(callerLimit);

  // The offset fetcher delegates to the caller's `fetcher` and
  // adapts the underlying `useCursorPaginated` offset branch.
  // `useCursorPaginated` (with `paginationKind: 'offset'`)
  // supplies a 1-indexed `page`; we expose a 0-indexed
  // `offset = (page - 1) * limit` to the consumer.
  const adapter = useMemo(
    () =>
      async ({
        page,
      }: OffsetFetcherArgs<P>): Promise<{
        items: readonly T[];
        page: number;
        total: number;
        hasMore: boolean;
        limit: number;
      }> => {
        const offset = (page - 1) * limit;
        const result = await fetcher({
          offset,
          limit,
          params: passthroughParams,
        });
        return {
          items: result.items,
          page,
          total: result.items.length,
          hasMore: result.hasMore,
          limit: result.limit,
        };
      },
    [fetcher, limit, passthroughParams],
  );

  const swr = useCursorPaginated<T, P>({
    key,
    fetcher: adapter,
    params: passthroughParams,
    paginationKind: "offset",
    ...(revalidateOnFocus === true ? { revalidateOnFocus: true } : {}),
  });

  // The exposed offset is the count of items already in the
  // cache; the underlying SWR-infinite page index is internal.
  const offset = useMemo(() => swr.items.length, [swr.items.length]);

  const stableLoadMore = useCallback(() => {
    if (!swr.hasMore) return;
    swr.loadMore();
  }, [swr]);

  return {
    items: swr.items,
    isLoading: swr.isLoading,
    isLoadingMore: swr.isLoadingMore,
    hasMore: swr.hasMore,
    offset,
    limit,
    error: swr.error,
    loadMore: stableLoadMore,
    refresh: swr.refresh,
  };
}