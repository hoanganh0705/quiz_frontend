

"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
OffsetFetcherArgs,
} from "@/lib/api/use-cursor-paginated.types";

export const FEED_DEFAULT_LIMIT = 20;

export const FEED_MAX_LIMIT = 50;

export type OffsetPaginatedFetcher<T extends { id: string }, P> = (
args: { readonly offset: number; readonly limit: number; readonly params: P },
) => Promise<{
readonly items: readonly T[];
readonly offset: number;
readonly limit: number;
readonly hasMore: boolean;
}>;

export interface UseOffsetPaginatedParams<
T extends { id: string },
P,
> {

readonly key: readonly unknown[];

readonly fetcher: OffsetPaginatedFetcher<T, P>;

readonly limit: number;

readonly params: P;

readonly revalidateOnFocus?: boolean;
}

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

function clampLimit(input: number | undefined): number {
if (typeof input !== "number" || !Number.isFinite(input)) {
return FEED_DEFAULT_LIMIT;
  }
if (input <= 0) return FEED_DEFAULT_LIMIT;
if (input > FEED_MAX_LIMIT) return FEED_MAX_LIMIT;
return Math.floor(input);
}

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

const limit = clampLimit(callerLimit);

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