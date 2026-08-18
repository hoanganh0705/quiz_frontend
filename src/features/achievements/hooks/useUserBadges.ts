"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getUserBadges } from "@/features/achievements/services/achievements.service";
import {
ACHIEVEMENT_CACHE_KEYS,
toUserBadgeProfile,
type AchievementErrorCode,
type UserBadgeProfile,
} from "@/features/achievements/types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { PublicAchievementProfileResponseDto } from "@/lib/api/generated/schemas";

export interface UseUserBadgesResult {
profile: UserBadgeProfile | null;
isLoading: boolean;
error: ApiError | null;
retry: () => Promise<void>;

isStale: boolean;

isPrivate: boolean;
}

export function useUserBadges(userId: string | null): UseUserBadgesResult {
const flagValue = getFeatureFlagValue("achievements_live");
const isFlagPlaceholder = flagValue === "placeholder";

const key = useMemo(
() =>
isFlagPlaceholder || userId === null
? null
: ACHIEVEMENT_CACHE_KEYS.userBadges(userId),
[isFlagPlaceholder, userId],
  );

const fetcher = useCallback(
async () => {
if (isFlagPlaceholder || userId === null) {
return null;
      }
const wire = (await getUserBadges(userId)) as
| PublicAchievementProfileResponseDto
        | null;
return toUserBadgeProfile(wire);
    },
[isFlagPlaceholder, userId],
  );

const result = useSingleWithRetry<UserBadgeProfile | null>({
key,
fetcher,
  });

const isStale = result.data !== undefined && result.isRetrying;

const isPrivate = String(result.error?.code ?? "") === "ACHIEVEMENT_FORBIDDEN";

if (isFlagPlaceholder || userId === null) {
return {
profile: null,
isLoading: false,
error: null,
retry: async () => {
        /* no-op */
      },
isStale: false,
isPrivate: false,
    };
  }

return {
profile: result.data ?? null,
isLoading: result.isLoading,
error: result.error as ApiError | null,
retry: result.retry,
isStale,
isPrivate,
  };
}

export type { UserBadgeProfile, AchievementErrorCode };