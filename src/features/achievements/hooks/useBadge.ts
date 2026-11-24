"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getBadgeByCode } from "@/features/achievements/services/achievements.service";
import {
  ACHIEVEMENT_CACHE_KEYS,
  toBadgeDetail,
  type AchievementErrorCode,
  type BadgeDetail,
} from "@/features/achievements/types";

import type { BadgeDetailsResponseDto } from "@/lib/api/generated/schemas";

export interface UseBadgeResult {
  badge: BadgeDetail | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;

  isStale: boolean;

  isPrivate: boolean;
}

export function useBadge(code: string | null): UseBadgeResult {
  const key = useMemo(
    () =>
      code === null
        ? null
        : ACHIEVEMENT_CACHE_KEYS.detail(code),
    [code],
  );

  const fetcher = useCallback(async () => {
    if (code === null) {
      return null;
    }
    const wire = (await getBadgeByCode(code)) as BadgeDetailsResponseDto | null;
    return toBadgeDetail(wire);
  }, [code]);

  const result = useSingleWithRetry<BadgeDetail | null>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  const isPrivate = String(result.error?.code ?? "") === "BADGE_HIDDEN";

  if (code === null) {
    return {
      badge: null,
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
    badge: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
    isPrivate,
  };
}

export type { BadgeDetail, AchievementErrorCode };
