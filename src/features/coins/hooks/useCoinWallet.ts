"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

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
const flagValue = getFeatureFlagValue("coin_economy_live");
const isPlaceholder = flagValue === "placeholder";

const key = useMemo(
() => (isPlaceholder ? (["coins", "wallet", "disabled"] as const) : COIN_CACHE_KEYS.wallet()),
[isPlaceholder],
  );

const swr = useSWR<CoinWallet>(key, {
fetcher: isPlaceholder
? undefined
: async () => getCoinWallet(),
revalidateOnFocus: !isPlaceholder,
revalidateOnReconnect: !isPlaceholder,
dedupingInterval: 5_000,
keepPreviousData: true,
  });

const refresh = useCallback(async () => {
if (isPlaceholder) return;
await swr.mutate();
  }, [isPlaceholder, swr]);

const error =
swr.error instanceof ApiError
? swr.error
: swr.error
? ApiError.fromInput({
code: "GLOBAL_INTERNAL_ERROR",
status: 0,
message: (swr.error as Error)?.message ?? "Unknown coin-wallet error",
          })
: null;

return {
wallet: isPlaceholder ? PLACEHOLDER_WALLET : swr.data ?? null,
balance: isPlaceholder ? 0 : swr.data?.balance ?? null,
isLoading: !isPlaceholder && swr.isLoading,
isStale: !isPlaceholder && swr.isValidating && Boolean(swr.data),
isPlaceholder,
error,
refresh,
  };
}