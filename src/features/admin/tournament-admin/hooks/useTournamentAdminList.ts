/**
 * `useTournamentAdminList` — admin tournament list read hook.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C1.
 *
 * ## What this hook owns
 *
 * - Fetches the admin tournament list via the Phase 5
 *   `listTournaments` service wrapper (TKT-5.1.F1) and the
 *   `tournamentControllerListTournaments` SDK call.
 * - Wraps `useCursorPaginated` (Epic 3.2) so the page
 *     - inherits the documented 429 backoff, 5xx banner, dedup
 *       across pages, and abort-on-unmount behavior;
 *     - exposes `loadMore` (`setSize` under the hood) and
 *       `hasMore` exactly like the public tournament list.
 * - Reads the URL-owned `?status=` search param so the active
 *   filter survives refresh and cross-tab sharing.
 * - Reads the URL-owned `?q=` search param and applies it as a
 *   client-side filter on the already-paginated items (the
 *   backend SDK does not currently expose a free-text search
 *   parameter for `listTournaments` — see "Search filter"
 *   below for the documented deviation).
 * - Exposes `setFilter({ status, search })` that mutates the URL
 *   via `router.replace` (no history churn) and resets the
 *   cursor via the `useCursorPaginated` key change.
 *
 * ## Search filter
 *
 * The Phase 5 SDK's `TournamentControllerListTournamentsParams`
 * does not declare a `search` parameter; the backend list endpoint
 * therefore does not support free-text search. Per the Epic 7.7
 * plan (TKT-7.7.A1 §2.9), the admin list UX shares the URL contract
 * with the page header so the `?q=` param is honored here even when
 * the backend cannot filter by it: the hook stores the term in the
 * URL and applies a case-insensitive substring match against
 * `title` client-side after the page loads.
 *
 * When the backend later adds a `search` parameter, the
 * implementation can flip to a server-side filter by passing
 * `q` through `params` to the service; the URL contract here stays
 * the same.
 *
 * ## Status filter
 *
 * The status union is the documented `TournamentResponseDtoStatus`
 * enum (`upcoming | registration | ongoing | finished | cancelled`).
 * The hook maps an invalid `?status=` value to `''` (all) so the
 * URL contract is total.
 *
 * ## Return shape
 *
 *   `{ items, isLoading, isLoadingMore, error, mutate, loadMore,
 *      setFilter, filter }`.
 *
 *   - `items` is the **server-fetched** list, post-`status`
 *     filter (server-side when present) and post-`q` filter
 *     (client-side substring match on `title`).
 *   - `mutate` is the SWR `mutate` handle from
 *     `useCursorPaginated`; mutation hooks (C2 / C3 / C4) and the
 *     page header use this to revalidate the list after a
 *     destructive action.
 *   - `error` is the typed `ApiError<ErrorCode> | null`.
 *
 * ## SWR cache key
 *
 * The hook namespaces the SWR key as
 * `['admin', 'tournaments', 'list', status]`. Mutation hooks
 * (TKT-7.7.C2 / C3 / C4) use `globalMutate` with a matcher that
 * matches the `['admin', 'tournaments', ...]` prefix.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  useCursorPaginated,
  type CursorFetcherArgs,
  type CursorPage,
  type UseCursorPaginatedResult,
} from '@/lib/api';
import { ApiError } from '@/lib/api/core/ApiError';

import { listTournaments } from '@/features/tournaments/services/tournaments.service';

import {
  DEFAULT_TOURNAMENT_ADMIN_FILTERS,
  TOURNAMENT_ADMIN_PAGE_SIZE,
  type TournamentAdminFilters,
  type TournamentDto,
} from '../admin-tournament-types';

// ─── Status vocabulary ────────────────────────────────────────────────────

/**
 * The documented status values accepted by the admin list filter.
 * Mirrors the backend enum (TKT-7.7.A1 §2.2):
 * `upcoming | registration | ongoing | finished | cancelled`.
 * `''` (empty string) represents the "all statuses" choice.
 */
export type TournamentAdminStatusFilter =
  | ''
  | 'upcoming'
  | 'registration'
  | 'ongoing'
  | 'finished'
  | 'cancelled';

export const TOURNAMENT_ADMIN_STATUS_VALUES: readonly TournamentAdminStatusFilter[] =
  Object.freeze([
    '',
    'upcoming',
    'registration',
    'ongoing',
    'finished',
    'cancelled',
  ] as const);

export const DEFAULT_TOURNAMENT_ADMIN_STATUS: TournamentAdminStatusFilter = '';

/**
 * Type guard that narrows an arbitrary URL value to the documented
 * `TournamentAdminStatusFilter` set. Invalid values fall back to the
 * documented default (`''` = all).
 */
export function isTournamentAdminStatusFilter(
  value: unknown,
): value is TournamentAdminStatusFilter {
  return (
    value === '' ||
    value === 'upcoming' ||
    value === 'registration' ||
    value === 'ongoing' ||
    value === 'finished' ||
    value === 'cancelled'
  );
}

export function normalizeTournamentAdminStatusFilter(
  value: unknown,
): TournamentAdminStatusFilter {
  return isTournamentAdminStatusFilter(value)
    ? value
    : DEFAULT_TOURNAMENT_ADMIN_STATUS;
}

// ─── SWR cache keys ────────────────────────────────────────────────────────

/**
 * SWR key for the admin tournament list. Namespaced so mutation
 * hooks can invalidate every `['admin', 'tournaments', ...]` key
 * via the matcher below.
 */
export function tournamentAdminListKey(
  status: TournamentAdminStatusFilter,
): readonly unknown[] {
  return ['admin', 'tournaments', 'list', status];
}

/**
 * SWR-cache predicate covering every variant of the admin list,
 * independent of `status`. Mutation hooks call this via
 * `globalMutate` so a create / update / delete invalidates every
 * page variant regardless of which filter rendered the list.
 */
export function tournamentAdminListKeyMatcher(key: unknown): boolean {
  return (
    Array.isArray(key) &&
    key[0] === 'admin' &&
    key[1] === 'tournaments'
  );
}

// ─── Wire shape ────────────────────────────────────────────────────────────

/**
 * Subset of the SDK response that the fetcher reads. The service
 * wrapper returns the full `WrappedPaginatedDto` envelope; we only
 * need the items and the pagination metadata.
 */
type ListTournamentsWireResponse = {
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

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseTournamentAdminListResult {
  /** The list items (post server-side status filter and post client-side `q` filter). */
  items: (TournamentDto & { id: string })[];
  /** `true` while the first page is loading. */
  isLoading: boolean;
  /** `true` while a subsequent page (`loadMore`) is loading. */
  isLoadingMore: boolean;
  /** The typed API error from the most recent fetch. `null` until a failure occurs. */
  error: ApiError | null;
  /** Manual revalidation (delegates to `useCursorPaginated.refresh`). */
  mutate: () => Promise<void>;
  /** Increments the cursor and appends the next page (deduped by `tournamentId`). */
  loadMore: () => void;
  /** Update the URL-owned filter (`status` / `q`). */
  setFilter: (next: Pick<TournamentAdminFilters, 'status' | 'search'>) => void;
  /** The active filter (URL-owned). */
  filter: Pick<TournamentAdminFilters, 'status' | 'search'>;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

function readStatusFromSearchParams(
  searchParams: ReadonlyURLSearchParams | null,
): TournamentAdminStatusFilter {
  if (searchParams === null) return DEFAULT_TOURNAMENT_ADMIN_STATUS;
  return normalizeTournamentAdminStatusFilter(searchParams.get('status'));
}

function readQueryFromSearchParams(
  searchParams: ReadonlyURLSearchParams | null,
): string {
  if (searchParams === null) return '';
  const raw = searchParams.get('q');
  return typeof raw === 'string' ? raw : '';
}

/**
 * Client-side search filter. Matches the `q` term (case-insensitive
 * substring) against the tournament's `title`. Empty `q` returns the
 * input unchanged. This compensates the absence of a backend `search`
 * parameter on `listTournaments` (TKT-7.7.A1 §2.9).
 */
function applyClientSearch(
  items: (TournamentDto & { id: string })[],
  query: string,
): (TournamentDto & { id: string })[] {
  if (query.length === 0) return items;
  const needle = query.toLowerCase();
  return items.filter((item) => item.title.toLowerCase().includes(needle));
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useTournamentAdminList(): UseTournamentAdminListResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = useMemo<TournamentAdminStatusFilter>(
    () => readStatusFromSearchParams(searchParams),
    [searchParams],
  );

  const query = useMemo<string>(
    () => readQueryFromSearchParams(searchParams),
    [searchParams],
  );

  const filter = useMemo<
    Pick<TournamentAdminFilters, 'status' | 'search'>
  >(
    () => ({
      // Map the URL-owned status to the documented filter shape. The
    // hook's URL contract is `''` for "all"; the filter shape uses
    // `undefined` for "all" (matches `TournamentAdminFilters.status`).
      status: status === '' ? undefined : status,
      search: query,
    }),
    [status, query],
  );

  const key = useMemo(
    () => tournamentAdminListKey(status),
    [status],
  );

  const fetcher = useCallback(
    async ({
      cursor,
    }: CursorFetcherArgs<Record<string, never>>): Promise<
      CursorPage<TournamentDto & { id: string }>
    > => {
      const wire = (await listTournaments({
        ...(cursor !== null ? { cursor } : {}),
        ...(status === '' ? {} : { status }),
        limit: TOURNAMENT_ADMIN_PAGE_SIZE,
      })) as unknown as ListTournamentsWireResponse | undefined;

      const rawItems = Array.isArray(wire?.data)
        ? (wire!.data as TournamentDto[])
        : [];
      const items = rawItems.map((item) => ({
        ...item,
        id: item.tournamentId,
      }));

      const pagination = wire?.meta?.pagination;
      const page: CursorPage<TournamentDto & { id: string }> = {
        items,
        nextCursor: pagination?.nextCursor ?? null,
        hasNextPage: pagination?.hasNextPage ?? false,
        limit: pagination?.limit ?? items.length,
      };
      return page;
    },
    [status],
  );

  const paginated = useCursorPaginated<
    TournamentDto & { id: string },
    Record<string, never>
  >({
    key,
    fetcher,
    params: {},
    paginationKind: 'cursor',
  });

  const setFilter = useCallback(
    (next: Pick<TournamentAdminFilters, 'status' | 'search'>) => {
      const nextStatus = normalizeTournamentAdminStatusFilter(
        next.status === undefined || next.status === ('' as unknown as typeof next.status)
          ? ''
          : next.status,
      );
      const nextQuery = next.search;

      // Build the next URL using `window.location` so we only mutate
      // the `?status=` and `?q=` params — every other query param
      // survives the update.
      const url = new URL(window.location.href);

      if (nextStatus === DEFAULT_TOURNAMENT_ADMIN_STATUS) {
        url.searchParams.delete('status');
      } else {
        url.searchParams.set('status', nextStatus);
      }

      if (nextQuery.length === 0) {
        url.searchParams.delete('q');
      } else {
        url.searchParams.set('q', nextQuery);
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

  const items = useMemo(
    () => applyClientSearch([...paginated.items], query),
    [paginated.items, query],
  );

  return {
    items,
    isLoading: paginated.isLoading,
    isLoadingMore: paginated.isLoadingMore,
    error: paginated.error,
    mutate: paginated.refresh,
    loadMore: paginated.loadMore,
    setFilter,
    filter,
  };
}

/**
 * Re-export `UseCursorPaginatedResult` for test files so the test
 * file does not need to reach into `@/lib/api` directly.
 */
export type { UseCursorPaginatedResult };

/**
 * Re-export the default filter constants for tests so consumers can
 * reset the URL between tests via a single import.
 */
export { DEFAULT_TOURNAMENT_ADMIN_FILTERS };