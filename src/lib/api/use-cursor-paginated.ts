

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

const BACKOFF_DELAYS_MS = [250, 500, 1000] as const;

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

export function useCursorPaginated<
T extends { id: string },
P
>(params: UseCursorPaginatedParams<T, P>): UseCursorPaginatedResult<T> {
const { key, paginationKind, enabled = true } = params;

const [retryBannerVisible, setRetryBannerVisible] = useState(false);

const loadMoreAbortRef = useRef<AbortController | null>(null);

const retryCountRef = useRef(0);

const retrySleepRef = useRef<
(ms: number) => Promise<void>
  >((ms: number) =>
new Promise<void>((resolve) => {
setTimeout(resolve, ms);
    })
  );

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

const swrConfig: SWRInfiniteConfiguration<AnyPage<T>, unknown> = useMemo(
() => {

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

callFetcher as never,
swrConfig
    );

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

const hasData = data !== undefined && data.length > 0;
const derivedIsLoading = Boolean(isLoading) || (!hasData && !error);
const derivedIsLoadingMore =
Boolean(isValidating) && hasData && size > 1 && !derivedIsLoading;

const coercedError = useMemo<ApiError | null>(() => {
if (!error) return null;
return coerceToApiError(error);
  }, [error]);

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

useEffect(() => {
return () => {
loadMoreAbortRef.current?.abort();
loadMoreAbortRef.current = null;
    };
  }, []);

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
