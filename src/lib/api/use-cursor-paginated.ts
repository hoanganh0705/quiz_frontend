/**
 * `useCursorPaginated` — the Phase-3 cursor-pagination primitive.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive.
 * Source tickets: TKT-3.2.D1 → TKT-3.2.D7 (this file evolves across
 *                 the D-batch — each ticket layers on hardening; see
 *                 the per-section "Source:" comments).
 *
 * Public contract: see `./use-cursor-paginated.types.ts` (C1) and the
 * type-level spec `./use-cursor-paginated.types.spec.ts` (C2). This file
 * is the runtime implementation. Every change to the public signature
 * must update those two files in lockstep.
 *
 * What this hook does (one paragraph version):
 *
 *   1. Calls `useSWRInfinite` with a per-page fetcher shaped by
 *      `paginationKind` (cursor or offset).
 *   2. Collapses the page array into a deduplicated `items` list using
 *      `appendUniqueById` (B1) — needed because cursors can re-yield
 *      an overlapping id on the next page after a cache invalidation.
 *   3. Returns `{ items, isLoading, isLoadingMore, hasMore, loadMore,
 *      error, refresh }` per Story 3.2 line 183.
 *
 * The hook supports two modes via the `paginationKind` discriminator:
 *
 *   - `'cursor'` (default — D1 scope): pages are joined by
 *     `nextCursor`; the fetcher is `CursorFetcher<T, P>` and is
 *     called with `{ cursor, params }`. Pages stop being requested
 *     once the server reports `hasNextPage: false` (D1 AC #2 + #5).
 *   - `'offset'` — added in D3: pages are joined by `(page + 1)`;
 *     the fetcher is `OffsetFetcher<T, P>` and is called with
 *     `{ page, params }`. Pages stop being requested once the server
 *     reports `hasMore: false`.
 *
 * SWR wiring note: SWR-infinite's fetcher is invoked with the return
 * value of `getKey` as its single argument. There is no separate
 * `(pageIndex, previousPageData)` parameter to the fetcher.
 *
 * Pattern: `getKey(index, previousPageData)` returns a tuple where
 * every part contributes to the SWR cache identity AND carries the
 * per-page arguments to the fetcher. The fetcher destructures those
 * arguments from `args`. This is the canonical pattern for passing
 * dynamic-per-page parameters through SWR-infinite.
 *
 * Hardening across the D-ticket sequence:
 *
 *   - D3: offset branch in `getKey` and `callFetcher`.
 *   - D4: race handling + `AbortController`.
 *   - D5: 429 exponential backoff + 5xx retry banner.
 *   - D6: cursor-decode Sentry capture.
 *   - D7: SSR fallbackData + `SwrProvider` `fallback` map.
 *
 * Conventions:
 *
 *   - Errors thrown by the user's `fetcher` are expected to be
 *     `ApiError`. If a non-`ApiError` is thrown and is an `AxiosError`,
 *     we wrap it via `ApiError.fromAxios` (D1 AC #7). Anything else
 *     rethrows — the hook does not paper over unknown error shapes.
 *   - `revalidateOnFocus` defaults to `false` here (matching the
 *     global `SwrProvider` default from A3 — D1 AC #9). Callers may
 *     opt in per-call by passing `revalidateOnFocus: true`.
 *   - `setSize` is used for `loadMore` (D1 AC #6). `mutate` on the
 *     `useSWRInfinite` response is used for `refresh` (D1 AC #8).
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite, { type SWRInfiniteConfiguration } from "swr/infinite";

import { ApiError, appendUniqueById, isApiError } from "@/lib/api";
import {
  CAPTURE_REASONS,
  CAPTURE_SURFACES,
  captureException
} from "@/lib/observability/sentry-capture";

import type {
  CursorPage,
  CursorParams,
  OffsetPage,
  OffsetParams,
  UseCursorPaginatedParams,
  UseCursorPaginatedResult
} from "./use-cursor-paginated.types";
import {
  isCursorPage as isCursorPageStrict,
  isOffsetPage as isOffsetPageStrict,
} from "./is-cursor-page";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function coerceToApiError(err: unknown): ApiError {
  if (isApiError(err)) return err;
  if (
    typeof err === "object" &&
    err !== null &&
    ("isAxiosError" in err || (err as { response?: unknown }).response)
  ) {
    return ApiError.fromAxios(
      err as Parameters<typeof ApiError.fromAxios>[0]
    );
  }
  throw err;
}

/**
 * D5 — backoff delays (ms) for the 429 retry policy. Module-level so
 * the `useCallback` dependency list does not need to enumerate it.
 */
const BACKOFF_DELAYS_MS = [250, 500, 1000] as const;

/**
 * Placeholder default for `revalidateOnFocus`.
 */
const DEFAULT_REVALIDATE_ON_FOCUS = false;

type AnyPage<T extends { id: string }> = CursorPage<T> | OffsetPage<T>;

function asCursorPage<T extends { id: string }>(
  page: AnyPage<T> | null | undefined
): CursorPage<T> | null {
  if (!page) return null;
  return isCursorPageStrict<T>(page) ? page : null;
}

function asOffsetPage<T extends { id: string }>(
  page: AnyPage<T> | null | undefined
): OffsetPage<T> | null {
  if (!page) return null;
  return isOffsetPageStrict<T>(page) ? page : null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCursorPaginated<
  T extends { id: string },
  P
>(params: UseCursorPaginatedParams<T, P>): UseCursorPaginatedResult<T> {
  const { key, paginationKind, enabled = true } = params;

  const [retryBannerVisible, setRetryBannerVisible] = useState(false);

  // D4 — race-handling ref.
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  // D5 — per-page retry counter.
  const retryCountRef = useRef(0);

  const retrySleepRef = useRef<
    (ms: number) => Promise<void>
  >((ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    })
  );

  // ── getKey — (pageIndex, previousPageData) => key tuple | null ──────────
  //
  // SWR-infinite passes `(pageIndex, previousPageData)` only to
  // `getKey`. The fetcher later receives the return value of `getKey`
  // as its single `args` argument. We encode the per-page arg
  // (cursor or page number) into the cache-key tuple so the fetcher
  // can read it back.
  //
  // When `enabled` is `false`, we short-circuit every page to `null`
  // so SWR-infinite never invokes the fetcher. The caller still gets
  // a stable hook result (no re-mounts) — it just reads as
  // "no data yet" until it flips `enabled` back to `true`.

  const getKey = useCallback(
    (
      pageIndex: number,
      previousPageData: AnyPage<T> | null
    ): readonly unknown[] | null => {
      if (!enabled) return null;

      if (previousPageData) {
        if (paginationKind === "offset") {
          const op = asOffsetPage(previousPageData);
          if (op && !op.hasMore) return null;
        } else {
          const cp = asCursorPage(previousPageData);
          if (cp && !cp.hasNextPage) return null;
        }
      }

      let perPageArg: unknown = null;
      if (paginationKind === "offset") {
        const op = asOffsetPage(previousPageData);
        perPageArg = op ? op.page + 1 : 1;
      } else {
        const cp = asCursorPage(previousPageData);
        perPageArg = cp ? cp.nextCursor : null;
      }

      return [
        ...key,
        "useCursorPaginated",
        paginationKind,
        pageIndex,
        perPageArg
      ];
    },
    [enabled, paginationKind, key]
  );

  // ── fetcher — receives the getKey-return tuple as a single arg ──────────

  const callFetcher = useCallback(
    async (args: readonly unknown[] | null): Promise<AnyPage<T>> => {
      if (args === null) {
        throw new Error("[useCursorPaginated] unexpected null args");
      }

      const perPageArg = args.length > 0 ? args[args.length - 1] : null;

      const signal = loadMoreAbortRef.current?.signal;

      const runOnce = async (): Promise<AnyPage<T>> => {
        if (signal?.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        if (paginationKind === "offset") {
          const offsetParams = params as OffsetParams<T, P>;
          return await offsetParams.fetcher({
            page: typeof perPageArg === "number" ? perPageArg : 1,
            params: offsetParams.params,
            signal
          });
        }
        const cursorParams = params as CursorParams<T, P>;
        const cursorDecoder = cursorParams.cursorDecoder;
        const cursorValue =
          typeof perPageArg === "string" ? perPageArg : null;
        // D6 — cursor-decode Sentry capture.
        if (cursorDecoder && cursorValue !== null) {
          try {
            cursorDecoder(cursorValue);
          } catch (decodeErr) {
            captureException(decodeErr, {
              tags: {
                surface: CAPTURE_SURFACES.useCursorPaginated,
                reason: CAPTURE_REASONS.cursorDecode
              }
            });
            return await cursorParams.fetcher({
              cursor: null,
              params: cursorParams.params,
              signal
            });
          }
        }
        return await cursorParams.fetcher({
          cursor: cursorValue,
          params: cursorParams.params,
          signal
        });
      };

      // D5 — retry policy.
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt++) {
        try {
          const page = await runOnce();
          retryCountRef.current = 0;
          return page;
        } catch (err) {
          lastError = err;
          if (err instanceof DOMException && err.name === "AbortError") {
            throw err;
          }
          const apiErr = coerceToApiError(err);
          if (apiErr.status === 429) {
            retryCountRef.current = retryCountRef.current + 1;
            if (retryCountRef.current <= BACKOFF_DELAYS_MS.length) {
              const delayMs =
                BACKOFF_DELAYS_MS[retryCountRef.current - 1] ?? 0;
              if (signal?.aborted) {
                throw new DOMException("aborted", "AbortError");
              }
              await retrySleepRef.current(delayMs);
              continue;
            }
            throw apiErr;
          }
          if (apiErr.status >= 500) {
            setRetryBannerVisible(true);
            throw apiErr;
          }
          throw apiErr;
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("[useCursorPaginated] retry loop fell through");
    },
    [paginationKind, params]
  );

  // ── SWR configuration (D1 AC #8, #9; D7 SSR fallback) ─────────────────

  const swrConfig: SWRInfiniteConfiguration<AnyPage<T>, unknown> = useMemo(
    () => {
      // D7 — SSR fallback data. SWR's `useSWRInfinite` honours
      // `fallbackData` directly; the value must be a one-element
      // array containing the first page so the per-page iteration
      // (lines 298-313 of swr/infinite) finds page 0 already
      // populated and skips the fetcher entirely.
      const fallbackData =
        "fallbackData" in params ? params.fallbackData : undefined;
      let firstPage: AnyPage<T> | undefined;
      if (fallbackData) {
        const fd = fallbackData as
          | import("./use-cursor-paginated.types").CursorPageFallbackData<T>
          | import("./use-cursor-paginated.types").OffsetPageFallbackData<T>;
        if (paginationKind === "offset" && "page" in fd) {
          firstPage = {
            items: fd.items,
            page: fd.page,
            total: fd.total,
            hasMore: fd.hasMore,
            limit: fd.items.length
          } as OffsetPage<T>;
        } else if ("nextCursor" in fd) {
          firstPage = {
            items: fd.items,
            nextCursor: fd.nextCursor,
            hasNextPage: fd.hasNextPage,
            limit: fd.items.length
          } as CursorPage<T>;
        } else {
          firstPage = {} as AnyPage<T>;
        }
      }

      return {
        revalidateOnFocus:
          params.revalidateOnFocus ?? DEFAULT_REVALIDATE_ON_FOCUS,
        revalidateFirstPage: false,
        fallbackData: firstPage ? [firstPage] : undefined
      };
    },
    [paginationKind, params]
  );

  const { data, error, size, setSize, mutate, isValidating, isLoading } =
    useSWRInfinite<AnyPage<T>, unknown>(
      getKey,
      // The fetcher signature is structurally compatible with our tuple.
      callFetcher as never,
      swrConfig
    );

  // ── hasMore (D1 AC #5; D3 AC #2 — offset branch) ────────────────────────

  const hasMore = useMemo<boolean>(() => {
    if (!data || data.length === 0) return true;
    const last = data[data.length - 1];
    if (!last) return true;
    if (paginationKind === "offset") {
      const op = asOffsetPage(last);
      if (op) return op.hasMore;
      return true;
    }
    const cp = asCursorPage(last);
    if (cp) return cp.hasNextPage;
    return true;
  }, [data, paginationKind]);

  // ── items — `appendUniqueById` across all loaded pages (D1 AC #3) ────────

  const items = useMemo<readonly T[]>(() => {
    if (!data || data.length === 0) return [];
    const allItems: T[] = [];
    for (const page of data) {
      if (!page) continue;
      for (const item of page.items) {
        allItems.push(item as T);
      }
    }
    return appendUniqueById([], allItems) as readonly T[];
  }, [data]);

  // ── isLoading / isLoadingMore (D1 AC #4) ────────────────────────────────

  const hasData = data !== undefined && data.length > 0;
  const derivedIsLoading = Boolean(isLoading) || (!hasData && !error);
  const derivedIsLoadingMore =
    Boolean(isValidating) && hasData && size > 1 && !derivedIsLoading;

  // ── error (D1 AC #7) ────────────────────────────────────────────────────

  const coercedError = useMemo<ApiError | null>(() => {
    if (!error) return null;
    return coerceToApiError(error);
  }, [error]);

  // ── loadMore / refresh (D1 AC #6, #8; D4 race handling) ─────────────────

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = new AbortController();
    void setSize((s) => s + 1);
  }, [hasMore, setSize]);

  const refresh = useCallback(async (): Promise<void> => {
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    setRetryBannerVisible(false);
    retryCountRef.current = 0;
    await mutate(undefined, { revalidate: true });
  }, [mutate]);

  // ── D4 unmount cleanup ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      loadMoreAbortRef.current?.abort();
      loadMoreAbortRef.current = null;
    };
  }, []);

  // ── assemble the public result ──────────────────────────────────────────

  return {
    items,
    isLoading: derivedIsLoading,
    isLoadingMore: derivedIsLoadingMore,
    hasMore,
    loadMore,
    error: coercedError,
    refresh,
    retryBannerVisible
  };
}
