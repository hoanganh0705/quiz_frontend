

import type { ApiError } from "@/lib/api/core/ApiError";

export type PaginationKind = "cursor" | "offset";

export interface CursorPage<T extends { id: string }> {
items: readonly T[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
}

export interface OffsetPage<T extends { id: string }> {
items: readonly T[];
page: number;
total: number;
hasMore: boolean;
limit: number;
}

export interface CursorFetcherArgs<P> {
cursor: string | null;
params: P;
signal?: AbortSignal;
}

export interface OffsetFetcherArgs<P> {
page: number;
params: P;
signal?: AbortSignal;
}

export type CursorFetcher<T extends { id: string }, P> = (
args: CursorFetcherArgs<P>,
) => Promise<CursorPage<T>>;

export type OffsetFetcher<T extends { id: string }, P> = (
args: OffsetFetcherArgs<P>,
) => Promise<OffsetPage<T>>;

interface BaseParams<T extends { id: string }> {
key: readonly unknown[];
paginationKind: PaginationKind;

enabled?: boolean;
revalidateOnFocus?: boolean;
fallbackData?: CursorPageFallbackData<T> | OffsetPageFallbackData<T>;
}

export interface CursorParams<
T extends { id: string },
P,
> extends BaseParams<T> {
paginationKind: "cursor";
fetcher: CursorFetcher<T, P>;
params: P;

cursorDecoder?: (cursor: string) => void;
}

export interface OffsetParams<
T extends { id: string },
P,
> extends BaseParams<T> {
paginationKind: "offset";
fetcher: OffsetFetcher<T, P>;
params: P;
}

export type UseCursorPaginatedParams<
T extends { id: string },
P,
> =
| CursorParams<T, P>
  | OffsetParams<T, P>;

export type UseCursorPaginatedDefaultParams<
T extends { id: string },
P,
> =
| Omit<CursorParams<T, P>, "paginationKind">
  | OffsetParams<T, P>;

export interface CursorPageFallbackData<T extends { id: string }> {
items: readonly T[];
nextCursor: string | null;
hasNextPage: boolean;
}

export interface OffsetPageFallbackData<T extends { id: string }> {
items: readonly T[];
page: number;
total: number;
hasMore: boolean;
}

export interface UseCursorPaginatedResult<T extends { id: string }> {
items: readonly T[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
refresh: () => Promise<void>;

retryBannerVisible?: boolean;
}
