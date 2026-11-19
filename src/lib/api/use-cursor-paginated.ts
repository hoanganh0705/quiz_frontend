"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, appendUniqueById, isApiError } from "@/lib/api";
import {
  CAPTURE_REASONS,
  CAPTURE_SURFACES,
  captureException,
} from "@/lib/observability/sentry-capture";

import type {
  CursorPage,
  CursorParams,
  OffsetPage,
  OffsetParams,
  UseCursorPaginatedParams,
  UseCursorPaginatedResult,
} from "./use-cursor-paginated.types";
import {
  isCursorPage as isCursorPageStrict,
  isOffsetPage as isOffsetPageStrict,
} from "./is-cursor-page";

function coerceToApiError(err: unknown): ApiError {
  if (isApiError(err)) return err;
  if (
    typeof err === "object" &&
    err !== null &&
    ("isAxiosError" in err || (err as { response?: unknown }).response)
  ) {
    return ApiError.fromAxios(err as Parameters<typeof ApiError.fromAxios>[0]);
  }
  throw err;
}

const BACKOFF_DELAYS_MS = [250, 500, 1000] as const;
const DEFAULT_REVALIDATE_ON_FOCUS = false;

type AnyPage<T extends { id: string }> = CursorPage<T> | OffsetPage<T>;

function asCursorPage<T extends { id: string }>(
  page: AnyPage<T> | null | undefined,
): CursorPage<T> | null {
  if (!page) return null;
  return isCursorPageStrict<T>(page) ? page : null;
}

function asOffsetPage<T extends { id: string }>(
  page: AnyPage<T> | null | undefined,
): OffsetPage<T> | null {
  if (!page) return null;
  return isOffsetPageStrict<T>(page) ? page : null;
}

export function useCursorPaginated<T extends { id: string }, P>(
  params: UseCursorPaginatedParams<T, P>,
): UseCursorPaginatedResult<T> {
  const { key, paginationKind, enabled = true } = params;

  const [retryBannerVisible, setRetryBannerVisible] = useState(false);
  const retryCountRef = useRef(0);
  const retrySleepRef = useRef<(ms: number) => Promise<void>>(
    (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }),
  );

  const fallbackData =
    "fallbackData" in params ? params.fallbackData : undefined;
  const firstPage = useMemo<AnyPage<T> | undefined>(() => {
    if (!fallbackData) return undefined;
    const fd = fallbackData as
      | import("./use-cursor-paginated.types").CursorPageFallbackData<T>
      | import("./use-cursor-paginated.types").OffsetPageFallbackData<T>;
    if (paginationKind === "offset" && "page" in fd) {
      return {
        items: fd.items,
        page: fd.page,
        total: fd.total,
        hasMore: fd.hasMore,
        limit: fd.items.length,
      } as OffsetPage<T>;
    } else if ("nextCursor" in fd) {
      return {
        items: fd.items,
        nextCursor: fd.nextCursor,
        hasNextPage: fd.hasNextPage,
        limit: fd.items.length,
      } as CursorPage<T>;
    }
    return undefined;
  }, [fallbackData, paginationKind]);

  const initialPageParam = paginationKind === "offset" ? 1 : null;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery<AnyPage<T>, unknown>(
    {
      queryKey: [...key, "useCursorPaginated", paginationKind, params.params],
      queryFn: async ({ pageParam, signal }) => {
        const perPageArg = pageParam;

        const runOnce = async (): Promise<AnyPage<T>> => {
          if (signal?.aborted) {
            throw new DOMException("aborted", "AbortError");
          }
          if (paginationKind === "offset") {
            const offsetParams = params as OffsetParams<T, P>;
            return await offsetParams.fetcher({
              page: typeof perPageArg === "number" ? perPageArg : 1,
              params: offsetParams.params,
              signal,
            });
          }
          const cursorParams = params as CursorParams<T, P>;
          const cursorDecoder = cursorParams.cursorDecoder;
          const cursorValue =
            typeof perPageArg === "string" ? perPageArg : null;

          if (cursorDecoder && cursorValue !== null) {
            try {
              cursorDecoder(cursorValue);
            } catch (decodeErr) {
              captureException(decodeErr, {
                tags: {
                  surface: CAPTURE_SURFACES.useCursorPaginated,
                  reason: CAPTURE_REASONS.cursorDecode,
                },
              });
              return await cursorParams.fetcher({
                cursor: null,
                params: cursorParams.params,
                signal,
              });
            }
          }
          return await cursorParams.fetcher({
            cursor: cursorValue,
            params: cursorParams.params,
            signal,
          });
        };

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
      initialPageParam,
      getNextPageParam: (lastPage) => {
        if (!lastPage) return undefined;
        if (paginationKind === "offset") {
          const op = asOffsetPage(lastPage);
          return op && op.hasMore ? op.page + 1 : undefined;
        }
        const cp = asCursorPage(lastPage);
        return cp && cp.hasNextPage && cp.nextCursor !== null
          ? cp.nextCursor
          : undefined;
      },
      enabled,
      retry: false,
      refetchOnWindowFocus:
        params.revalidateOnFocus ?? DEFAULT_REVALIDATE_ON_FOCUS,
      initialData: firstPage
        ? {
            pages: [firstPage],
            pageParams: [initialPageParam],
          }
        : undefined,
    },
    getQueryClient(),
  );

  const hasMore = Boolean(hasNextPage);

  const items = useMemo<readonly T[]>(() => {
    if (!data?.pages || data.pages.length === 0) return [];
    const allItems: T[] = [];
    for (const page of data.pages) {
      if (!page) continue;
      for (const item of page.items) {
        allItems.push(item as T);
      }
    }
    return appendUniqueById([], allItems) as readonly T[];
  }, [data?.pages]);

  const coercedError = useMemo<ApiError | null>(() => {
    if (!error) return null;
    return coerceToApiError(error);
  }, [error]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) return;
    void fetchNextPage();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  const refresh = useCallback(async (): Promise<void> => {
    setRetryBannerVisible(false);
    retryCountRef.current = 0;
    await refetch();
  }, [refetch]);

  return {
    items,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore,
    loadMore,
    error: coercedError,
    refresh,
    retryBannerVisible,
  };
}
