"use client";

import { useCallback, useMemo } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, useOptimisticMutation } from "@/lib/api";

import { purchaseFlair } from "@/features/coins/services/coins.service";
import type {
  CoinErrorCode,
  PurchaseFlairRequest,
} from "@/features/coins/types/coin.types";
import { COIN_CACHE_KEYS } from "@/features/coins/types/coin.types";

export type UsePurchaseFlairResult = {
  purchaseFlair: (input: PurchaseFlairRequest, idempotencyKey?: string) => void;
  isPending: boolean;
  error: CoinErrorCode | null;
};

function classifyCoinError(cause: unknown): CoinErrorCode {
  if (cause instanceof ApiError) {
    return (cause.code as CoinErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}

const COOLDOWN_MS = 750;

export function usePurchaseFlair(): UsePurchaseFlairResult {
  const isPlaceholder = false;
  const { mutate: dispatch, isInFlight, lastResult } = useOptimisticMutation();

  const revalidate = useCallback(async (): Promise<void> => {
    try {
      const qc = getQueryClient();
      await qc.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "coins" &&
          (query.queryKey[1] === "wallet" ||
            query.queryKey[1] === "transactions"),
      });
    } catch {}
  }, []);

  const error: CoinErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifyCoinError(lastResult.apiError)
      : null;

  const result = useMemo<UsePurchaseFlairResult>(() => {
    if (isPlaceholder) {
      return Object.freeze({
        purchaseFlair: () => {
          /* no-op */
        },
        isPending: false,
        error: null,
      });
    }

    const fn = (input: PurchaseFlairRequest, idempotencyKey?: string): void => {
      void dispatch({
        key: COIN_CACHE_KEYS.wallet(),
        optimisticData: (current) => current,
        run: async () => {
          await purchaseFlair(input, idempotencyKey);
          await revalidate();
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      purchaseFlair: fn,
      isPending: isInFlight,
      error,
    });
  }, [isPlaceholder, dispatch, isInFlight, error, revalidate]);

  return result;
}
