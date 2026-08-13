"use client";

/**
 * `useAdminAdjustCoins` — admin mutation hook for credit / debit.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.C4.
 *
 * Admin-only. Wraps `coins.service.adminAdjustCoins` with the
 * canonical Phase 4 mutation primitive (cooldown + snapshot + revert
 * + cross-tab invalidation). The mutation sends an explicit
 * `Idempotency-Key` header so the audit log is exactly one row per
 * call even on retry.
 *
 * Falls back to a no-op when either `coin_economy_live` or
 * `admin_live` is `'placeholder'`.
 */

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { adminAdjustCoins } from "@/features/coins/services/coins.service";
import type {
  AdminAdjustRequest,
  CoinErrorCode,
} from "@/features/coins/types/coin.types";
import { COIN_CACHE_KEYS } from "@/features/coins/types/coin.types";

export type UseAdminAdjustCoinsResult = {
  adjust: (input: AdminAdjustRequest, idempotencyKey: string) => void;
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

export function useAdminAdjustCoins(): UseAdminAdjustCoinsResult {
  const coinFlag = getFeatureFlagValue("coin_economy_live");
  const adminFlag = getFeatureFlagValue("admin_live");
  const isPlaceholder = coinFlag === "placeholder" || adminFlag === "placeholder";

  const { mutate } = useSWRConfig();
  const {
    mutate: dispatch,
    isInFlight,
    lastResult,
  } = useOptimisticMutation();

  const revalidate = useCallback(async (): Promise<void> => {
    await mutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === "coins" &&
        (key[1] === "wallet" || key[1] === "transactions"),
      undefined,
      { revalidate: true },
    );
  }, [mutate]);

  const error: CoinErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifyCoinError(lastResult.apiError)
      : null;

  const result = useMemo<UseAdminAdjustCoinsResult>(() => {
    if (isPlaceholder) {
      return Object.freeze({
        adjust: () => {
          /* no-op */
        },
        isPending: false,
        error: null,
      });
    }

    const adjust = (
      input: AdminAdjustRequest,
      idempotencyKey: string,
    ): void => {
      void dispatch({
        key: COIN_CACHE_KEYS.wallet(),
        optimisticData: (current) => current,
        run: async () => {
          await adminAdjustCoins(input, idempotencyKey);
          await revalidate();
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      adjust,
      isPending: isInFlight,
      error,
    });
  }, [isPlaceholder, dispatch, isInFlight, error, revalidate]);

  return result;
}