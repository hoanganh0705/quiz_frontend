"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import {
  COIN_CACHE_KEYS,
  type CoinWallet,
} from "@/features/coins/types/coin.types";
import { getCoinWallet } from "@/features/coins/services/coins.service";

export interface UseCoinWalletResult {
  wallet: CoinWallet | null;
  balance: number | null;
  isLoading: boolean;
  isStale: boolean;
  isPlaceholder: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

const PLACEHOLDER_WALLET: CoinWallet = {
  userId: "",
  balance: 0,
  lifetimeEarned: 0,
  lifetimeSpent: 0,
  lastEarnedAt: null,
  lastSpentAt: null,
  updatedAt: new Date(0).toISOString(),
};

export function useCoinWallet(): UseCoinWalletResult {
  const isPlaceholder = false;
  const key = useMemo(
    () =>
      isPlaceholder
        ? (["coins", "wallet", "disabled"] as const)
        : COIN_CACHE_KEYS.wallet(),
    [isPlaceholder],
  );

  const {
    data,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<CoinWallet, Error>(
    {
      queryKey: key,
      queryFn: async () => getCoinWallet(),
      enabled: !isPlaceholder,
      refetchOnWindowFocus: !isPlaceholder,
      refetchOnReconnect: !isPlaceholder,
      staleTime: 5000,
    },
    getQueryClient(),
  );

  const refresh = useCallback(async () => {
    if (isPlaceholder) return;
    await refetch();
  }, [isPlaceholder, refetch]);

  const error =
    queryError instanceof ApiError
      ? queryError
      : queryError
        ? ApiError.fromInput({
            code: "GLOBAL_INTERNAL_ERROR",
            status: 0,
            message: queryError?.message ?? "Unknown coin-wallet error",
          })
        : null;

  return {
    wallet: isPlaceholder ? PLACEHOLDER_WALLET : (data ?? null),
    balance: isPlaceholder ? 0 : (data?.balance ?? null),
    isLoading: !isPlaceholder && isLoading && data === undefined,
    isStale: !isPlaceholder && isFetching && Boolean(data),
    isPlaceholder,
    error,
    refresh,
  };
}
