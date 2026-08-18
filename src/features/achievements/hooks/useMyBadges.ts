"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyBadges } from "@/features/achievements/services/achievements.service";
import {
ACHIEVEMENT_CACHE_KEYS,
toEarnedBadge,
type AchievementErrorCode,
type EarnedBadge,
} from "@/features/achievements/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { MyBadgeItemDto } from "@/lib/api/generated/schemas";
import type { NormalizedBadge } from "@/lib/realtime/dto-adapters";

export interface UseMyBadgesResult {
badges: readonly EarnedBadge[];
isLoading: boolean;
error: ApiError | null;
retry: () => Promise<void>;

isStale: boolean;
}

export function useMyBadges(): UseMyBadgesResult {
const flagValue = getFeatureFlagValue("achievements_live");
const isFlagPlaceholder = flagValue === "placeholder";

const { bootstrapState } = useAuthSession();
const isAuthenticated = bootstrapState === "authenticated";

const key = useMemo(
() =>
isFlagPlaceholder || !isAuthenticated
? null
: ACHIEVEMENT_CACHE_KEYS.myBadges(),
[isFlagPlaceholder, isAuthenticated],
  );

const fetcher = useCallback(
async () => {
if (isFlagPlaceholder || !isAuthenticated) {
return [] as EarnedBadge[];
      }

const wire =
(await getMyBadges()) as unknown as Array<MyBadgeItemDto | NormalizedBadge>;
return wire
        .map((entry) => toEarnedBadge(entry))
        .filter((entry): entry is EarnedBadge => entry !== null);
    },
[isFlagPlaceholder, isAuthenticated],
  );

const result = useSingleWithRetry<EarnedBadge[]>({
key,
fetcher,
  });

const isStale = result.data !== undefined && result.isRetrying;

if (isFlagPlaceholder || !isAuthenticated) {
return {
badges: [],
isLoading: false,
error: null,
retry: async () => {
        /* no-op */
      },
isStale: false,
    };
  }

return {
badges: result.data ?? [],
isLoading: result.isLoading,
error: result.error as ApiError | null,
retry: result.retry,
isStale,
  };
}

export type { EarnedBadge, AchievementErrorCode };