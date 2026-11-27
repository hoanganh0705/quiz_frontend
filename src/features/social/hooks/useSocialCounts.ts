"use client";

import { useCallback, useMemo } from "react";

import { useSingleWithRetry } from "@/lib/api";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { toSocialCounts } from "@/features/social/dto-adapters";
import {
  getSocialCounts,
  getUserSocialStats,
} from "@/features/social/services";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types";

import type {
  SocialCountsDto,
  SocialErrorCode,
} from "@/features/social/types";
import type { ApiError } from "@/lib/api";

export interface UseSocialCountsResult {
  counts: SocialCountsDto | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
}

const PLACEHOLDER_RESULT: UseSocialCountsResult = Object.freeze({
  counts: null,
  isLoading: false,
  isStale: false,
  error: null,
  retry: () => Promise.resolve(),
});

export function useSocialCounts(userId: string | null): UseSocialCountsResult {
  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;
  const currentUserId =
    (auth.currentUser as { id?: string; userId?: string } | null)?.id ??
    (auth.currentUser as { userId?: string } | null)?.userId ??
    null;

  const isSelf =
    userId !== null && (userId === "me" || userId === currentUserId);

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!isAuthenticated) return null;
    if (userId === null) return null;
    return SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId);
  }, [isAuthenticated, userId]);

  const fetcher = useCallback(async (): Promise<SocialCountsDto> => {
    if (!isAuthenticated || userId === null) return toSocialCounts({});
    try {
      if (isSelf) {
        const envelope = await getSocialCounts();
        return toSocialCounts(envelope?.data);
      }
      const envelope = await getUserSocialStats(userId);
      return toSocialCounts(envelope?.data);
    } catch (err) {
      const apiErr = err as Partial<ApiError> | null;
      if (
        apiErr &&
        (apiErr.code === "GLOBAL_NOT_FOUND" || apiErr.status === 404)
      ) {
        return toSocialCounts({});
      }
      throw err;
    }
  }, [isAuthenticated, isSelf, userId]);

  const result = useSingleWithRetry<SocialCountsDto>({ key, fetcher });

  const retry = useCallback(async () => {
    await result.retry();
  }, [result]);

  const mappedError = useMemo<ApiError | null>(() => {
    if (result.error === null) return null;
    return result.error;
  }, [result.error]);

  if (!isAuthenticated) return PLACEHOLDER_RESULT;
  if (userId === null) return PLACEHOLDER_RESULT;

  return {
    counts: result.data ?? null,
    isLoading: result.isLoading,
    isStale: false,
    error: mappedError,
    retry,
  };
}

export type SocialCountsErrorCode = SocialErrorCode;
