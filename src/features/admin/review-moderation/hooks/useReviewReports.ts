'use client';

/**
 * `useReviewReports` — queue read hook with cursor pagination and
 * URL-owned `?show=` filter.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.C1.
 *
 * ## What this hook owns
 *
 * - Fetches the admin review-reports queue via the
 *   `listReviewReports` service (TKT-7.1.E3); consumed by
 *   `ReviewReportsPage` and `ReviewReportsList`.
 * - Wraps `useCursorPaginated` (Epic 3.2) for cursor-pagination
 *   mechanics: 429 backoff, 5xx banner, dedup-across-pages,
 *   abort-on-unmount.
 * - Reads the `?show=` URL search param (`'pending' | 'resolved'`,
 *   default `'pending'`) so the queue state is URL-owned and survives
 *   refresh / cross-tab share.
 * - Exposes `setShow(...)` that mutates the URL, causing SWR to
 *   re-fetch with the new filter (the key changes, the cache resets).
 *
 * ## Filter mapping
 *
 *   - `show === 'pending'`  → `{ status: 'open' }` (the SDK contract;
 *     the queue's `open` state covers newly filed, awaiting action).
 *   - `show === 'resolved'` → no status filter (the SDK returns
 *     every non-`open` row in a single page; the queue groups them
 *     inline as `'reviewed' | 'dismissed' | 'actioned'` per
 *     `PlatformReportItemDtoStatus`).
 *
 * Invalid `?show=` values fall back to `'pending'`. We use a typed
 * literal set rather than a free-form string so the URL → state
 * mapping is total.
 *
 * ## Return shape
 *
 *   `{ items, isLoading, isLoadingMore, hasMore, loadMore, error,
 *      refresh, show, setShow }` — see `UseReviewReports`.
 *
 * Mutation hooks (TKT-7.5.C2) revalidate the queue's cache via the
 * shared `reviewReportsKeyMatcher` so callers do not need to expose
 * an extra `mutate` handle from this read hook.
 *
 * ## URL-owned state
 *
 * The hook reads `useSearchParams` from Next.js. When `?show=` is
 * absent, the default (`'pending'`) is used. `setShow` mutates the
 * URL via `useRouter().replace(...)` so navigation history is NOT
 * polluted (no back-button churn on filter swaps).
 *
 * ## Items shape
 *
 * Each item carries an `id` alias (`reportId`) so the items satisfy
 * the `useCursorPaginated<T extends { id: string }>` constraint
 * (mirroring the `useQuizReviews` pattern from Phase 4).
 */

import { useCallback, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  useCursorPaginated,
  type CursorFetcherArgs,
  type CursorPage,
  type UseCursorPaginatedResult,
} from '@/lib/api';

import { listReviewReports } from '@/features/admin/services/review-moderation.service';

import {
  REVIEW_REPORTS_PAGE_SIZE,
  type AdminReportDto,
  type ReportState,
} from '../admin-report-types';

// ─── Show-filter vocabulary ────────────────────────────────────────────────

/**
 * URL-owned filter values for the queue. Matches the queue's
 * documented two-state set: `'pending'` (awaiting action) vs
 * `'resolved'` (already actioned).
 */
export type ReviewReportsShow = 'pending' | 'resolved';

export const REVIEW_REPORTS_SHOW_VALUES: readonly ReviewReportsShow[] =
  Object.freeze(['pending', 'resolved'] as const);

export const DEFAULT_REVIEW_REPORTS_SHOW: ReviewReportsShow = 'pending';

/**
 * Type guard. Narrows an unknown URL value to the documented
 * `ReviewReportsShow` set. Used by the hook and by callers
 * deserializing search params.
 */
export function isReviewReportsShow(value: unknown): value is ReviewReportsShow {
  return (
    value === 'pending' || value === 'resolved'
  );
}

/**
 * Normalise an arbitrary input into a valid `ReviewReportsShow`,
 * falling back to the documented default.
 */
export function normalizeReviewReportsShow(
  value: unknown,
): ReviewReportsShow {
  return isReviewReportsShow(value) ? value : DEFAULT_REVIEW_REPORTS_SHOW;
}

// ─── Wire shape (post-unwrap) ───────────────────────────────────────────────

/**
 * Subset of the SDK response shape that the fetcher reads. We do not
 * import the generated `AdminReviewControllerListPlatformReports`
 * result type directly because the SDK's `WrappedPaginatedDto` types
 * it generically; the runtime data we need is just the items and the
 * `nextCursor` / `hasNextPage` envelope which the service wrapper
 * already normalises (TKT-7.1.E3, see `ReviewReportsPage`).
 */
type ListReviewReportsWireResponse = {
  data?: unknown;
  meta?: {
    pagination?: {
      kind?: string;
      limit?: number;
      nextCursor?: string | null;
      hasNextPage?: boolean;
    };
  };
};

// ─── Fetcher context ────────────────────────────────────────────────────────

/**
 * Per-call context forwarded from the hook to the fetcher. The
 * `params.key` pair carries the active filter (`show`) so the
 * fetcher can map URL-owned state → service-level filter args.
 */
export interface UseReviewReportsFetcherParams {
  show: ReviewReportsShow;
}

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseReviewReportsParams {
  /** When `false`, the hook is disabled and no fetcher fires. */
  enabled?: boolean;
}

export interface UseReviewReportsResult extends Omit<
  UseCursorPaginatedResult<AdminReportDto & { id: string }>,
  'refresh'
> {
  /** Active filter (URL-owned). */
  show: ReviewReportsShow;
  /** Update the URL to change the filter. */
  setShow: (next: ReviewReportsShow) => void;
  /**
   * Manual revalidation across every loaded page. Returns a promise
   * that resolves once SWR has completed the refetch.
   */
  refresh: () => Promise<void>;
}

// ─── SWR key factories ──────────────────────────────────────────────────────

/**
 * SWR key for the admin review-reports list, scoped by the active
 * `show` filter. The leading `['admin', 'review-reports', 'list']`
 * namespace isolates the queue from public review caches
 * (`['reviews', ...]` from Phase 4) and from other admin surfaces.
 *
 * The trailing `[show]` element is the filter tuple; two calls with
 * the same `show` produce the same cache key, matching the
 * `quizReviewsKey` convention (Epic 4.13).
 */
export function reviewReportsKey(
  show: ReviewReportsShow,
): readonly unknown[] {
  return ['admin', 'review-reports', 'list', show];
}

/**
 * SWR-cache predicate filter covering every variant of the queue's
 * SWR key, independent of `show`. Mutation hooks call this via
 * `globalMutate` so a resolve invalidates both `'pending'` and
 * `'resolved'` pages regardless of which view rendered the queue.
 */
export function reviewReportsKeyMatcher(
  key: unknown,
): boolean {
  return (
    Array.isArray(key) &&
    key[0] === 'admin' &&
    key[1] === 'review-reports' &&
    key[2] === 'list'
  );
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Translate the URL-owned `show` value into the SDK-level status
 * filter expected by `listReviewReports`. The function is total and
 * deterministic — invalid inputs (which the hook rejects upstream)
 * still resolve to a typed result.
 */
function buildServiceFilter(
  show: ReviewReportsShow,
): { status?: ReportState } {
  if (show === 'pending') {
    return { status: 'open' };
  }
  return {};
}

function readShowFromSearchParams(
  searchParams: ReadonlyURLSearchParams | null,
): ReviewReportsShow {
  if (searchParams === null) {
    return DEFAULT_REVIEW_REPORTS_SHOW;
  }
  return normalizeReviewReportsShow(searchParams.get('show'));
}

/**
 * Read-only URL search params (Next.js's `useSearchParams()` return
 * type). Re-exported here so the typing stays self-contained for
 * tests and downstream consumers (no import into `@/lib/next/...`
 * needed).
 */
type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Cursor-paginated read hook for the admin review-reports queue.
 *
 * @example
 *   const {
 *     items, isLoading, hasMore, loadMore,
 *     show, setShow,
 *   } = useReviewReports();
 *
 *   <ReviewReportsList
 *     items={items}
 *     isLoading={isLoading}
 *     hasMore={hasMore}
 *     onLoadMore={loadMore}
 *     show={show}
 *     onShowChange={setShow}
 *   />
 */
export function useReviewReports(
  params: UseReviewReportsParams = {},
): UseReviewReportsResult {
  const { enabled = true } = params;
  const router = useRouter();
  const searchParams = useSearchParams();

  const show = useMemo<ReviewReportsShow>(
    () => readShowFromSearchParams(searchParams),
    [searchParams],
  );

  const key = useMemo(
    () => (enabled ? reviewReportsKey(show) : ['admin', 'review-reports', 'disabled']),
    [enabled, show],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<UseReviewReportsFetcherParams>): Promise<
        CursorPage<AdminReportDto & { id: string }>
      > => {
        // The hook always sends the active `show` through the
        // fetcher params. The service wrapper only requires the
        // resolved status filter; pass the inbound cursor through so
        // the primitive's pagination cycle requests the next page.
        const wire = (await listReviewReports({
          ...buildServiceFilter(show),
          limit: REVIEW_REPORTS_PAGE_SIZE,
          ...(cursor !== null ? { cursor } : {}),
        })) as unknown as ListReviewReportsWireResponse | undefined;

        // The service wrapper (TKT-7.1.E3) has already normalised
        // the envelope; the cast here keeps the fetcher-aligned
        // shape tightly scoped. The `WireResponse` type above
        // documents the service contract for readers.
        //
        // Defensive default: when the service returns no payload
        // (e.g. a revalidation cycle after `setShow(...)` clears the
        // mock queue, or a transient undefined result), fall back to
        // an empty page so the primitive's pagination cycle
        // terminates cleanly with `hasNextPage: false`.
        const rawItems = Array.isArray(wire?.data)
          ? (wire!.data as AdminReportDto[])
          : [];
        const items = rawItems.map((item) => ({
          ...item,
          id: item.reportId,
        }));

        const pagination = wire?.meta?.pagination;
        const page: CursorPage<AdminReportDto & { id: string }> = {
          items,
          nextCursor: pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit: pagination?.limit ?? items.length,
        };
        return page;
      },
    [show],
  );

  const setShow = useCallback(
    (next: ReviewReportsShow): void => {
      const target = normalizeReviewReportsShow(next);
      const url = new URL(window.location.href);
      if (target === DEFAULT_REVIEW_REPORTS_SHOW) {
        url.searchParams.delete('show');
      } else {
        url.searchParams.set('show', target);
      }
      const nextSearch = url.searchParams.toString();
      router.replace(
        nextSearch.length === 0
          ? url.pathname
          : `${url.pathname}?${nextSearch}`,
        { scroll: false },
      );
    },
    [router],
  );

  const paginated = useCursorPaginated<
    AdminReportDto & { id: string },
    UseReviewReportsFetcherParams
  >({
    key,
    fetcher,
    params: { show },
    paginationKind: 'cursor',
  });

  return {
    items: paginated.items,
    isLoading: paginated.isLoading,
    isLoadingMore: paginated.isLoadingMore,
    hasMore: paginated.hasMore,
    loadMore: paginated.loadMore,
    error: paginated.error,
    refresh: paginated.refresh,
    retryBannerVisible: paginated.retryBannerVisible,
    show,
    setShow,
  };
}
