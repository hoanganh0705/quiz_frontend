"use client";

import { useCallback, useMemo, useState } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyRanking } from "@/features/rankings/services/rankings.service";
import {
RANKING_CACHE_KEYS,
toRankingSummary,
type RankingErrorCode,
type RankingFreshness,
type RankingSummary,
} from "@/features/rankings/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { UserRankResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyRankingResult {

summary: RankingSummary | null;
isLoading: boolean;
error: ApiError | null;

retry: () => Promise<void>;

isStale: boolean;

lastValidatedAt: string | null;
}

export function useMyRanking(): UseMyRankingResult {
const flagValue = getFeatureFlagValue("rankings_live");
const isFlagPlaceholder = flagValue === "placeholder";

const { bootstrapState, currentUser } = useAuthSession();
const isAuthenticated = bootstrapState === "authenticated";
const userId =
typeof currentUser?.userId === "string" ? currentUser.userId : "";

const key = useMemo(
() =>
isFlagPlaceholder || !isAuthenticated
? null
: RANKING_CACHE_KEYS.mySummary(),
[isFlagPlaceholder, isAuthenticated],
  );

const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

const fetcher = useCallback(
async () => {
if (isFlagPlaceholder || !isAuthenticated) {
return null;
      }
const wire = (await getMyRanking()) as UserRankResponseDto | null;
const summary = toRankingSummary(wire, userId);
if (summary) {
setLastValidatedAt(new Date().toISOString());
      }
return summary;
    },
[isFlagPlaceholder, isAuthenticated, userId],
  );

const result = useSingleWithRetry<RankingSummary | null>({
key,
fetcher,
  });

const isStale = result.data !== undefined && result.isRetrying;

if (isFlagPlaceholder || !isAuthenticated) {
return {
summary: null,
isLoading: false,
error: null,
retry: async () => {
        /* no-op */
      },
isStale: false,
lastValidatedAt: null,
    };
  }

return {
summary: result.data ?? null,
isLoading: result.isLoading,
error: result.error as ApiError | null,
retry: result.retry,
isStale,
lastValidatedAt,
  };
}

export type { RankingFreshness, RankingSummary, RankingErrorCode };