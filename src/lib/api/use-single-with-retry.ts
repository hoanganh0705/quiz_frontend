/**
 * `useSingleWithRetry` — the single-resource read primitive.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B1.
 *
 * Companion to `useCursorPaginated` (Epic 3.2). Where the cursor
 * primitive fetches a paginated list, this primitive fetches a single
 * resource with the same retry policy the cursor primitive uses for
 * 429 responses. It is the substrate for:
 *
 *   - `useQuizByIdOrSlug` (TKT-3.6.B2) — quiz detail.
 *   - `useQuizStatsByIdOrSlug` (TKT-3.6.B3) — quiz stats.
 *
 * ## Behavior contract
 *
 *   1. Returns `{ data, isLoading, error, retry, isRetrying }` with
 *      `error: ApiError | null` (B1 AC #1).
 *   2. A stable key deduplicates identical reads; a key change
 *      prevents the previous request from overwriting the latest
 *      result (B1 AC #2).
 *   3. `429` uses the established bounded delays of 250 ms, 500 ms,
 *      and 1 000 ms, then surfaces the final typed error (B1 AC #3).
 *   4. Non-429 4xx errors are not retried automatically (B1 AC #4).
 *   5. 5xx errors are exposed immediately for the UI's toast-style
 *      notice and explicit Retry action; no infinite retry loop
 *      occurs (B1 AC #5).
 *   6. `retry()` revalidates the same key and clears stale error
 *      state on success (B1 AC #6).
 *   7. The primitive contains no quiz-specific 404 mapping (B1 AC #7).
 *
 * ## Error coercion
 *
 *   - `ApiError` is passed through.
 *   - Axios-shaped errors are wrapped via `ApiError.fromAxios`.
 *   - Any other thrown value is re-thrown — the hook does not paper
 *     over unknown error shapes.
 *
 * ## Race handling
 *
 *   - Stale-request protection: each new manual `retry()` call takes
 *     a monotonically increasing epoch; resolutions from older
 *     epochs are dropped before they reach `data` / `error`.
 *   - AbortController: each request is aborted when a new request
 *     fires (key change or manual retry). The hook does not surface
 *     abort errors to the UI.
 *
 * ## Aborts and unmount
 *
 *   - The in-flight `AbortController` is aborted on unmount.
 *   - The in-flight `AbortController` is aborted when a new request
 *     starts (key change or manual retry).
 *   - The hook never updates `data` / `error` after unmount; tests
 *     assert no React state-update warning is emitted.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, isApiError } from '@/lib/api';

const BACKOFF_DELAYS_MS = [250, 500, 1000] as const;

const DEFAULT_REVALIDATE_ON_FOCUS = false;

export interface SingleFetcher<T> {
  (args: { signal: AbortSignal }): Promise<T>;
}

export interface UseSingleWithRetryParams<T> {
  /**
   * The cache key. A change to the key invalidates the previous
   * result and triggers a new fetch. `null` disables the fetch.
   */
  key: readonly unknown[] | null;
  /**
   * The fetcher. Called with `{ signal }` so the hook can cancel an
   * in-flight request when a new one starts.
   */
  fetcher: SingleFetcher<T>;
  /**
   * Override the 429 backoff schedule. Defaults to the Story 3.2
   * `[250, 500, 1000]` policy.
   */
  backoffDelaysMs?: readonly number[];
  /**
   * Override the `revalidateOnFocus` SWR default. Defaults to
   * `false` to match the global `SwrProvider` (Phase 3 lists refresh
   * on route entry, not on focus). Reserved for future callers; the
   * current implementation does not use SWR's `revalidateOnFocus`
   * because the fetch is performed by the hook itself.
   */
  revalidateOnFocus?: boolean;
  /**
   * Override the sleep function. Tests inject a fake-timer sleep so
   * the 429 backoff assertions can run synchronously.
   */
  sleep?: (ms: number) => Promise<void>;
}

export interface UseSingleWithRetryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

function coerceToApiError(err: unknown): ApiError {
  if (isApiError(err)) return err;
  if (
    typeof err === 'object' &&
    err !== null &&
    ('isAxiosError' in err || (err as { response?: unknown }).response)
  ) {
    return ApiError.fromAxios(
      err as Parameters<typeof ApiError.fromAxios>[0],
    );
  }
  throw err;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Hook implementation.
 *
 * Implementation note: this hook does NOT use the `useSWR` hook at
 * all. The primitive owns the request lifecycle, the 429 retry
 * budget, and the abort controller explicitly. SWR's built-in retry
 * is opaque and could not enforce the bounded 250/500/1000 ms policy
 * or expose `isRetrying`. Hooks B2 / B3 still funnel through
 * `useSWR` for cross-component cache sharing; this primitive is the
 * loader side of that bridge.
 */
export function useSingleWithRetry<T>(
  params: UseSingleWithRetryParams<T>,
): UseSingleWithRetryResult<T> {
  const {
    key,
    fetcher,
    backoffDelaysMs = BACKOFF_DELAYS_MS,
    // revalidateOnFocus is accepted for future compatibility; the
    // current implementation does not consume it because the hook
    // owns the fetch loop.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    revalidateOnFocus: _revalidateOnFocus = DEFAULT_REVALIDATE_ON_FOCUS,
    sleep = defaultSleep,
  } = params;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(key !== null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const epochRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);
  const keyRef = useRef<readonly unknown[] | null>(key);

  const runOnce = useCallback(
    async (signal: AbortSignal): Promise<T> => {
      return await fetcher({ signal });
    },
    [fetcher],
  );

  const runWithRetry = useCallback(
    async (signal: AbortSignal): Promise<T> => {
      let attempt = 0;
      let lastError: unknown = null;
      while (attempt <= backoffDelaysMs.length) {
        if (signal.aborted) {
          throw new DOMException('aborted', 'AbortError');
        }
        try {
          return await runOnce(signal);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            throw err;
          }
          lastError = err;
          const apiErr = coerceToApiError(err);
          if (apiErr.status === 429) {
            if (attempt < backoffDelaysMs.length) {
              const delayMs = backoffDelaysMs[attempt] ?? 0;
              await sleep(delayMs);
              attempt += 1;
              continue;
            }
            throw apiErr;
          }
          // 4xx (non-429) and 5xx surface immediately. No infinite
          // retry loop; the UI is responsible for the manual retry.
          throw apiErr;
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error('[useSingleWithRetry] retry loop fell through');
    },
    [backoffDelaysMs, runOnce, sleep],
  );

  const execute = useCallback(
    async (bumpEpoch: boolean): Promise<void> => {
      if (key === null) {
        setData(undefined);
        setError(null);
        setIsLoading(false);
        return;
      }

      const epoch = bumpEpoch ? epochRef.current + 1 : epochRef.current;
      epochRef.current = epoch;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setIsRetrying(true);

      try {
        const result = await runWithRetry(controller.signal);
        if (!mountedRef.current) return;
        if (epochRef.current !== epoch) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        if (epochRef.current !== epoch) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(coerceToApiError(err));
      } finally {
        if (mountedRef.current && epochRef.current === epoch) {
          setIsLoading(false);
          setIsRetrying(false);
        }
      }
    },
    [key, runWithRetry],
  );

  // Trigger the initial fetch when the key changes. The key is
  // captured into a ref so the `useEffect` dependency can be the
  // stringified key without forcing consumers to memoize the array.
  const keyJson = JSON.stringify(key);
  useEffect(() => {
    keyRef.current = key;
    setData(undefined);
    setError(null);
    void execute(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyJson]);

  // Manual retry — revalidates the same key and clears stale error
  // state on success.
  const retry = useCallback(async (): Promise<void> => {
    setError(null);
    await execute(true);
  }, [execute]);

  // Unmount cleanup.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    retry,
    isRetrying,
  };
}
