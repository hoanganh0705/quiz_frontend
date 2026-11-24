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
  const key = useMemo(
    () =>
      userId === null
        ? null
        : ACHIEVEMENT_CACHE_KEYS.userBadges(userId),
    [userId],
  );

  const fetcher = useCallback(async () => {
    if (userId === null) {
      return null;
    }
    const wire = (await getUserBadges(
      userId,
    )) as PublicAchievementProfileResponseDto | null;
    return toUserBadgeProfile(wire);
  }, [userId]);

  const result = useSingleWithRetry<UserBadgeProfile | null>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  const isPrivate =
    String(result.error?.code ?? "") === "ACHIEVEMENT_FORBIDDEN";

  if (userId === null) {
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
