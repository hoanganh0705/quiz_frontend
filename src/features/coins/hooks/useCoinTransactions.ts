"use client";

import { useMemo } from "react";

import { ApiError } from "@/lib/api";
import { useCursorPaginated } from "@/lib/api/use-cursor-paginated";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
COIN_CACHE_KEYS,
DEFAULT_COIN_TRANSACTION_FILTERS,
type CoinTransaction,
type CoinTransactionFilters,
type CoinTransactionPage,
} from "@/features/coins/types/coin.types";
import { listCoinTransactions } from "@/features/coins/services/coins.service";

type CoinTransactionWithId = CoinTransaction & { readonly id: string };

export interface UseCoinTransactionsResult {
items: readonly CoinTransaction[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
refresh: () => Promise<void>;
isStale: boolean;
isPlaceholder: boolean;
}

const DEFAULT_LIMIT = 25;

export function useCoinTransactions(
filters: CoinTransactionFilters = DEFAULT_COIN_TRANSACTION_FILTERS,
): UseCoinTransactionsResult {
const flagValue = getFeatureFlagValue("coin_economy_live");
const isPlaceholder = flagValue === "placeholder";

const key = useMemo(
() =>
isPlaceholder
? (["coins", "transactions", "disabled"] as const)
: COIN_CACHE_KEYS.transactions(filters),
[isPlaceholder, filters],
  );

const result = useCursorPaginated<CoinTransactionWithId, CoinTransactionFilters>({
key,
fetcher: useMemo(
() =>
async ({
cursor,
        }: CursorFetcherArgs<CoinTransactionFilters>): Promise<{
items: readonly CoinTransactionWithId[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
        }> => {
if (isPlaceholder) {
return {
items: [],
nextCursor: null,
hasNextPage: false,
limit: 0,
            };
          }

const effectiveCursor = cursor ?? filters.cursor ?? undefined;
const params: Parameters<typeof listCoinTransactions>[0] = {};
if (effectiveCursor !== undefined) params.cursor = effectiveCursor;
if (typeof filters.limit === "number") params.limit = filters.limit;

const page: CoinTransactionPage = await listCoinTransactions(params);
const items: readonly CoinTransactionWithId[] = page.items.map((t) => ({
...t,
id: t.transactionId,
          }));
return {
items,
nextCursor: page.nextCursor,
hasNextPage: page.hasNextPage,
limit: page.limit,
          };
        },
[isPlaceholder, filters],
    ),
params: filters,
paginationKind: "cursor",
  });

return {
items: result.items as readonly CoinTransaction[],
isLoading: result.isLoading,
isLoadingMore: result.isLoadingMore,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
refresh: result.refresh,
isStale: false,
isPlaceholder,
  };
}