"use client";

/**
 * `useTipAuthor` — mutation hook for the tip action.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.C1.
 *
 * Wraps `coins.service.tipUser` and:
 *
 *   - Coerces the unknown rejection into a `CoinErrorCode` so the
 *     consumer can branch on the typed discriminator (`<TipAuthorButton
 *     />` reads `error` to decide whether to open the
 *     `<InsufficientCoinsNotice />`).
 *   - Triggers SWR cache revalidation for the wallet key on success
 *     (the realtime socket pushes the canonical update, but a refetch
 *     ensures the ledger count is in sync before the next interaction).
 *   - Falls back to a no-op when `coin_spend_live` is
 *     `'placeholder'`.
 *
 * The hook does NOT show a confirmation dialog — that is the caller's
 * responsibility (`<TipAuthorButton />` opens
 * `<PurchaseConfirmDialog />` first).
 */

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError } from "@/lib/api";
import { useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { tipUser } from "@/features/coins/services/coins.service";
import type {
  CoinErrorCode,
  TipAuthorRequest,
} from "@/features/coins/types/coin.types";
import { COIN_CACHE_KEYS } from "@/features/coins/types/coin.types";

export type UseTipAuthorResult = {
  tip: (input: TipAuthorRequest, idempotencyKey?: string) => void;
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

export function useTipAuthor(): UseTipAuthorResult {
  const flagValue = getFeatureFlagValue("coin_spend_live");
  const isPlaceholder = flagValue === "placeholder";

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

  const result = useMemo<UseTipAuthorResult>(() => {
    if (isPlaceholder) {
      return Object.freeze({
        tip: () => {
          /* no-op */
        },
        isPending: false,
        error: null,
      });
    }

    const tip = (input: TipAuthorRequest, idempotencyKey?: string): void => {
      void dispatch({
        key: COIN_CACHE_KEYS.wallet(),
        optimisticData: (current) => current,
        run: async () => {
          await tipUser(input, idempotencyKey);
          await revalidate();
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      tip,
      isPending: isInFlight,
      error,
    });
  }, [isPlaceholder, dispatch, isInFlight, error, revalidate]);

  return result;
}