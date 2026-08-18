"use client";

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { suppressRecommendedQuiz } from "@/features/coins/services/coins.service";
import type {
CoinErrorCode,
SuppressQuizRequest,
} from "@/features/coins/types/coin.types";
import { COIN_CACHE_KEYS } from "@/features/coins/types/coin.types";

export type UseSuppressRecommendedQuizResult = {
suppress: (
input: SuppressQuizRequest,
idempotencyKey?: string,
  ) => void;
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

export function useSuppressRecommendedQuiz(): UseSuppressRecommendedQuizResult {
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

const result = useMemo<UseSuppressRecommendedQuizResult>(() => {
if (isPlaceholder) {
return Object.freeze({
suppress: () => {
          /* no-op */
        },
isPending: false,
error: null,
      });
    }

const fn = (
input: SuppressQuizRequest,
idempotencyKey?: string,
    ): void => {
void dispatch({
key: COIN_CACHE_KEYS.wallet(),
optimisticData: (current) => current,
run: async () => {
await suppressRecommendedQuiz(input, idempotencyKey);
await revalidate();
        },
cooldownMs: COOLDOWN_MS,
      });
    };

return Object.freeze({
suppress: fn,
isPending: isInFlight,
error,
    });
  }, [isPlaceholder, dispatch, isInFlight, error, revalidate]);

return result;
}