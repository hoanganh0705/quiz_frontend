"use client";

/**
 * `useEventuallyConsistentQuery` — shared primitive for freshness-aware
 * SWR reads.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.C1.
 *
 * ## What this primitive owns
 *
 * A reusable SWR-based query wrapper that:
 *
 *   1. Tracks the ISO 8601 timestamp of the last successful response.
 *   2. Exposes an `isStale` flag that flips to `true` while SWR
 *      revalidation is in flight and cached `data` is present.
 *   3. Surfaces a typed `ApiError<E>` on failure — callers branch on
 *      `.code`, not on HTTP status.
 *   4. Exposes `retry()`, `mutate()`, and `lastValidatedAt` to consumers
 *      so individual hooks (`useMyRanking`, `useBadges`, …) can
 *      delegate the freshness logic.
 *
 * ## Why a shared primitive
 *
 * The ranking and achievement hooks (Batch B) all need the same
 * freshness discipline: never invent a stale value while a revalidation
 * is in flight, never clear cached data on error, and always
 * communicate lag through `isStale` rather than through contradictory
 * optimistic UI.
 *
 * Centralising the discipline in this primitive keeps each consumer
 * hook focused on data fetching and projection.
 *
 * ## Relationship to `useSingleWithRetry`
 *
 * This primitive wraps SWR's `useSWR` directly (instead of
 * `useSingleWithRetry`) because it needs SWR's own `isValidating`
 * semantics to derive `isStale`. The 429 retry budget is preserved
 * via SWR's `errorRetryCount` global config plus a `shouldRetryOnError`
 * that maps 429 to a retryable error.
 *
 * ## SSR-safety
 *
 * Falls back to `{ data: null, isLoading: false, isStale: false,
 * lastValidatedAt: null }` when `key === null` (disabled sentinel) or
 * during SSR (no `window` access). This matches the safe-fallback
 * pattern used by every Story 5.5 hook.
 */

import { useCallback, useState } from "react";
import useSWR, { type SWRConfiguration } from "swr";

import { ApiError } from "@/lib/api/core/ApiError";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * SWR fetcher contract.
 *
 * The fetcher receives the current SWR key as a `readonly unknown[]`
 * tuple and must return a `Promise<T>`. Errors thrown from the fetcher
 * are surfaced as `error: ApiError<E>` after `coerceError` mapping.
 */
export type EventuallyConsistentFetcher<T> = (
  key: readonly unknown[],
) => Promise<T>;

/**
 * Parameters accepted by `useEventuallyConsistentQuery`.
 *
 * - `key`: the SWR cache key (a frozen tuple). Pass `null` to disable
 *   the query — the hook will return the safe fallback without firing
 *   a fetch.
 * - `fetcher`: the SWR fetcher. Errors thrown here are mapped to
 *   `ApiError<E>` via `coerceError`.
 * - `fallbackData`: optional seed value for the first render
 *   (matches SWR's `fallbackData`).
 * - `swrConfig`: optional SWR configuration overrides (e.g.
 *   `dedupingInterval`, `revalidateOnMount`).
 */
export interface UseEventuallyConsistentQueryParams<T> {
  key: readonly unknown[] | null;
  fetcher: EventuallyConsistentFetcher<T>;
  fallbackData?: T;
  swrConfig?: Omit<
    SWRConfiguration<T, ApiError>,
    "fetcher" | "fallbackData" | "onSuccess" | "onError"
  >;
}

/**
 * Return shape of `useEventuallyConsistentQuery`.
 *
 * - `data`: the cached value, or `null` when not yet fetched.
 * - `isLoading`: `true` on the first render when no cached data is
 *   present and no fetch has completed yet.
 * - `error`: a typed `ApiError<E>` on failure, `null` otherwise.
 * - `retry()`: triggers SWR's `mutate()`, forcing revalidation.
 * - `isStale`: `true` while SWR revalidation is in flight and a
 *   cached value is present. Components use this flag to render the
 *   eventual-consistency notice (TKT-5.5.C3).
 * - `lastValidatedAt`: ISO 8601 timestamp of the last successful
 *   response, or `null`. Updated only on success — never on error.
 * - `mutate()`: SWR's raw mutate function; consumers can use it to
 *   set data without a network call (rare; mainly for tests).
 */
export interface UseEventuallyConsistentQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => void;
  isStale: boolean;
  lastValidatedAt: string | null;
  mutate: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Map a thrown error to `ApiError<E>`.
 *
 * - `ApiError` is passed through.
 * - Anything else is wrapped as `GLOBAL_INTERNAL_ERROR` via
 *   `ApiError` if the value is `Error`-shaped, or re-thrown — the
 *   primitive does not paper over unknown error shapes.
 */
function coerceError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) {
    // Surface non-Axios errors as a generic ApiError with
    // GLOBAL_INTERNAL_ERROR so consumers can still branch on `.code`.
    return new ApiError({
      isAxiosError: true,
      name: "ApiError",
      message: err.message,
      response: {
        status: 500,
        statusText: "Internal Server Error",
        data: {
          status: 500,
          title: "Internal Server Error",
          extensions: { code: "GLOBAL_INTERNAL_ERROR" },
        },
      },
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  throw err;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Use this primitive from any hook that needs to expose a freshness
 * indicator and stale-aware revalidation to its UI consumers.
 *
 * @example
 *   const { data, isLoading, error, retry, isStale, lastValidatedAt } =
 *     useEventuallyConsistentQuery<RankingSummary>({
 *       key,
 *       fetcher: async () => toRankingSummary(await getMyRanking(), userId),
 *     });
 */
export function useEventuallyConsistentQuery<T>({
  key,
  fetcher,
  fallbackData,
  swrConfig,
}: UseEventuallyConsistentQueryParams<T>): UseEventuallyConsistentQueryResult<T> {
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

  // SWR's `onSuccess` fires on every successful response — including
  // the first one and every revalidation. The hook updates
  // `lastValidatedAt` only on success, satisfying AC #6.
  const onSuccess = useCallback(() => {
    setLastValidatedAt(new Date().toISOString());
  }, []);

  const onError = useCallback((err: unknown) => {
    // Errors are surfaced through SWR's `error` field; we map to
    // `ApiError` lazily in the `error` getter below. The onError
    // hook is a no-op here because SWR already retains the cached
    // data when a revalidation fails (TKT-5.5.C1 AC #3/#4).
    void err;
  }, []);

  // SWR's `useSWR(key, ...)` treats `key === null` as the documented
  // disable signal — no fetch is performed and the returned state is
  // `{ data: undefined, isLoading: false, isValidating: false }`. We
  // rely on this so the hook is always called unconditionally and the
  // Rules of Hooks are satisfied even when the consumer disables the
  // query.
  const swr = useSWR<T, ApiError>(key as ReadonlyArray<unknown> | null, fetcher as never, {
    fallbackData: fallbackData as never,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 2_000,
    errorRetryCount: 3,
    shouldRetryOnError: (err: unknown): boolean => {
      if (err instanceof ApiError) {
        return err.status === 429 || err.status >= 500;
      }
      return false;
    },
    onSuccess: onSuccess as never,
    onError: onError as never,
    ...swrConfig,
  });

  // Disabled-sentinel branch: when the consumer disabled the query
  // (`key === null`), return the safe fallback without surfacing any
  // of SWR's loading / error state.
  if (key === null) {
    return {
      data: fallbackData ?? null,
      isLoading: false,
      error: null,
      retry: () => {
        /* no-op */
      },
      isStale: false,
      lastValidatedAt: null,
      mutate: () => {
        /* no-op */
      },
    };
  }

  // `isValidating` is `true` while any fetch is in flight, including
  // the very first fetch. Combine with `data` presence so the very
  // first fetch is NOT reported as stale (TKT-5.5.C1 AC #1).
  const data: T | null = (swr.data ?? fallbackData ?? null) as T | null;
  const isStale = data !== null && swr.isValidating;
  const isLoading = swr.isLoading;

  return {
    data,
    isLoading,
    error: swr.error ? coerceError(swr.error) : null,
    retry: () => {
      void swr.mutate();
    },
    isStale,
    lastValidatedAt,
    mutate: () => {
      void swr.mutate();
    },
  };
}