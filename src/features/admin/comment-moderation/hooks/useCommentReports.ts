'use client';

/**
 * `useCommentReports` — queue read hook with cursor pagination and
 * URL-owned `?show=` filter.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C1.
 *
 * ## What this hook owns
 *
 * - Fetches the admin comment-reports queue via the
 *   `listCommentReports` service (TKT-7.1.E4); consumed by
 *   `CommentReportsPage` and `CommentReportsList` (Batch E).
 * - Wraps `useCursorPaginated` (Epic 3.2) for cursor-pagination
 *   mechanics: 429 backoff, 5xx banner, dedup-across-pages,
 *   abort-on-unmount.
 * - Reads the `?show=` URL search param (`'pending' | 'resolved'`,
 *   default `'pending'`) so the queue state is URL-owned and
 *   survives refresh / cross-tab share.
 * - Exposes `setShow(...)` that mutates the URL via
 *   `router.replace`, causing SWR to re-fetch with the new filter
 *   (the key changes, the cache resets).
 *
 * ## Filter mapping
 *
 *   - `show === 'pending'`  → `{ status: 'open' }` (the SDK contract;
 *     the queue's `open` state covers newly filed, awaiting action).
 *   - `show === 'resolved'` → no status filter (the SDK returns
 *     every non-`open` row in a single page; the queue groups them
 *     inline as `'reviewed' | 'dismissed' | 'actioned'`).
 *
 * Invalid `?show=` values fall back to `'pending'`. We use a typed
 * literal set rather than a free-form string so the URL → state
 * mapping is total.
 *
 * ## Return shape
 *
 *   `{ items, isLoading, isLoadingMore, hasMore, loadMore, error,
 *      refresh, show, setShow }` — see `UseCommentReportsResult`.
 *
 * Mutation hooks (TKT-7.6.C2) revalidate the queue's cache via the
 * shared `commentReportsKeyMatcher` so callers do not need to expose
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
 * (mirroring the `useReviewReports` pattern from Epic 7.5).
 */

import { useCallback, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  useCursorPaginated,
  type CursorFetcherArgs,
  type CursorPage,
  type UseCursorPaginatedResult,
} from '@/lib/api';

import { listCommentReports } from '@/features/admin/services/comment-moderation.service';

import {
  COMMENT_REPORTS_PAGE_SIZE,
  type CommentReportDto,
  type CommentReportState,
} from '../admin-comment-report-types';
import {
  DEFAULT_COMMENT_REPORT_SHOW_FILTER,
  isCommentReportShowFilter,
  type CommentReportShowFilter,
} from '../admin-comment-report-types';

// ─── Show-filter vocabulary (re-exported for callers) ────────────────────────

/**
 * URL-owned filter values for the queue. Matches the queue's
 * documented two-state set: `'pending'` (awaiting action) vs
 * `'resolved'` (already actioned). Re-exports the
 * `CommentReportShowFilter` type from `admin-comment-report-types` so
 * the hook's signature stays aligned with the queue's documented
 * filter set.
 */
export type CommentReportsShow = CommentReportShowFilter;

export const COMMENT_REPORTS_SHOW_VALUES: readonly CommentReportsShow[] =
  Object.freeze(['pending', 'resolved'] as const);

export const DEFAULT_COMMENT_REPORTS_SHOW: CommentReportsShow =
  DEFAULT_COMMENT_REPORT_SHOW_FILTER;

// ─── Wire shape (post-unwrap) ───────────────────────────────────────────────

/**
 * Subset of the SDK response shape that the fetcher reads. The
 * runtime data we need is just `data` (the items array) and
 * `meta.pagination` (the cursor envelope) which the service wrapper
 * already normalises (TKT-7.1.E4, see `comment-moderation.service`).
 */
type ListCommentReportsWireResponse = {
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
export interface UseCommentReportsFetcherParams {
  show: CommentReportsShow;
}

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseCommentReportsParams {
  /** When `false`, the hook is disabled and no fetcher fires. */
  enabled?: boolean;
}

export interface UseCommentReportsResult extends Omit<
  UseCursorPaginatedResult<CommentReportDto & { id: string }>,
  'refresh'
> {
  /** Active filter (URL-owned). */
  show: CommentReportsShow;
  /** Update the URL to change the filter. */
  setShow: (next: CommentReportsShow) => void;
  /**
   * Manual revalidation across every loaded page. Returns a promise
   * that resolves once SWR has completed the refetch.
   */
  refresh: () => Promise<void>;
}

// ─── SWR key factories ──────────────────────────────────────────────────────

/**
 * SWR key for the admin comment-reports list, scoped by the active
 * `show` filter. The leading `['admin', 'comment-reports', 'list']`
 * namespace isolates the queue from public comment caches
 * (`['comments', ...]` from Phase 4) and from the related review
 * queue (`['admin', 'review-reports', ...]` from Epic 7.5).
 *
 * The trailing `[show]` element is the filter tuple; two calls with
 * the same `show` produce the same cache key, matching the
 * `useReviewReports` convention from Epic 7.5.
 */
export function commentReportsKey(
  show: CommentReportsShow,
): readonly unknown[] {
  return ['admin', 'comment-reports', 'list', show];
}

/**
 * SWR-cache predicate filter covering every variant of the queue's
 * SWR key, independent of `show`. Mutation hooks call this via
 * `globalMutate` so a resolve invalidates both `'pending'` and
 * `'resolved'` pages regardless of which view rendered the queue.
 */
export function commentReportsKeyMatcher(key: unknown): boolean {
  return (
    Array.isArray(key) &&
    key[0] === 'admin' &&
    key[1] === 'comment-reports' &&
    key[2] === 'list'
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Type guard. Narrows an unknown URL value to the documented
 * `CommentReportsShow` set. Re-exported as an alias for the type
 * guard already exported by `admin-comment-report-types` so callers
 * can import everything from the hook module.
 */
export function isCommentReportsShow(value: unknown): value is CommentReportsShow {
  return isCommentReportShowFilter(value);
}

/**
 * Normalise an arbitrary input into a valid `CommentReportsShow`,
 * falling back to the documented default.
 */
export function normalizeCommentReportsShow(
  value: unknown,
): CommentReportsShow {
  return isCommentReportsShow(value) ? value : DEFAULT_COMMENT_REPORTS_SHOW;
}

/**
 * Translate the URL-owned `show` value into the SDK-level status
 * filter expected by `listCommentReports`. The function is total and
 * deterministic — invalid inputs (which the hook rejects upstream)
 * still resolve to a typed result.
 */
function buildServiceFilter(
  show: CommentReportsShow,
): { status?: CommentReportState } {
  if (show === 'pending') {
    return { status: 'open' };
  }
  return {};
}

function readShowFromSearchParams(
  searchParams: ReadonlyURLSearchParams | null,
): CommentReportsShow {
  if (searchParams === null) {
    return DEFAULT_COMMENT_REPORTS_SHOW;
  }
  return normalizeCommentReportsShow(searchParams.get('show'));
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
 * Cursor-paginated read hook for the admin comment-reports queue.
 *
 * @example
 *   const {
 *     items, isLoading, hasMore, loadMore,
 *     show, setShow,
 *   } = useCommentReports();
 *
 *   <CommentReportsList
 *     items={items}
 *     isLoading={isLoading}
 *     hasMore={hasMore}
 *     onLoadMore={loadMore}
 *     show={show}
 *     onShowChange={setShow}
 *   />
 */
export function useCommentReports(
  params: UseCommentReportsParams = {},
): UseCommentReportsResult {
  const { enabled = true } = params;
  const router = useRouter();
  const searchParams = useSearchParams();

  const show = useMemo<CommentReportsShow>(
    () => readShowFromSearchParams(searchParams),
    [searchParams],
  );

  const key = useMemo(
    () =>
      enabled
        ? commentReportsKey(show)
        : ['admin', 'comment-reports', 'disabled'],
    [enabled, show],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<UseCommentReportsFetcherParams>): Promise<
        CursorPage<CommentReportDto & { id: string }>
      > => {
        // The hook always sends the active `show` through the
        // fetcher params. The service wrapper only requires the
        // resolved status filter; pass the inbound cursor through so
        // the primitive's pagination cycle requests the next page.
        const wire = (await listCommentReports({
          ...buildServiceFilter(show),
          limit: COMMENT_REPORTS_PAGE_SIZE,
          ...(cursor !== null ? { cursor } : {}),
        })) as unknown as ListCommentReportsWireResponse | undefined;

        // The service wrapper (TKT-7.1.E4) has already normalised
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
          ? (wire!.data as CommentReportDto[])
          : [];
        const items = rawItems.map((item) => ({
          ...item,
          id: item.reportId,
        }));

        const pagination = wire?.meta?.pagination;
        const page: CursorPage<CommentReportDto & { id: string }> = {
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
    (next: CommentReportsShow): void => {
      const target = normalizeCommentReportsShow(next);
      const url = new URL(window.location.href);
      if (target === DEFAULT_COMMENT_REPORTS_SHOW) {
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
    CommentReportDto & { id: string },
    UseCommentReportsFetcherParams
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
