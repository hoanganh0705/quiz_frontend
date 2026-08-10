"use client";

/**
 * `useFollowing` — cursor-paginated hook for a user's following list.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.D3.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { toSocialUserSummaryFromFollowRow } from "@/features/social/dto-adapters";
import { getUserFollowing } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialUserSummaryDto,
} from "@/features/social/types";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseFollowingResult {
  users: readonly SocialUserSummaryDto[];
  isLoading: boolean;
  isStale: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  retry: () => Promise<void>;
}

const EMPTY_PAGE = Object.freeze({
  items: [] as readonly SocialUserSummaryDto[],
  nextCursor: null as string | null,
  hasNextPage: false,
  limit: 0,
});

const PLACEHOLDER_RESULT: UseFollowingResult = Object.freeze({
  users: [],
  isLoading: false,
  isStale: false,
  hasMore: false,
  loadMore: () => undefined,
  error: null,
  retry: () => Promise.resolve(),
});

export function useFollowing(userId: string | null): UseFollowingResult {
  const flagValue = getFeatureFlagValue("social_relationship_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    if (userId === null) return null;
    return SOCIAL_CACHE_KEYS.makeFollowingKey(userId);
  }, [isFlagPlaceholder, isAuthenticated, userId]);

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<Record<string, never>>): Promise<{
        items: readonly SocialUserSummaryDto[];
        nextCursor: string | null;
        hasNextPage: boolean;
        limit: number;
      }> => {
        if (isFlagPlaceholder || !isAuthenticated || userId === null) {
          return EMPTY_PAGE;
        }
        try {
          const wire = await getUserFollowing(userId, {
            ...(cursor ? { cursor } : {}),
          });
          const items = (wire.data ?? []).map((row) =>
            toSocialUserSummaryFromFollowRow(row),
          );
          const pagination = wire.meta?.pagination;
          const limit = pagination?.limit ?? items.length;
          return {
            items,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit,
          };
        } catch (err) {
          const apiErr = err as Partial<ApiError> | null;
          if (
            apiErr &&
            (apiErr.code === "GLOBAL_NOT_FOUND" ||
              apiErr.code === "USER_NOT_FOUND" ||
              apiErr.status === 404)
          ) {
            return EMPTY_PAGE;
          }
          throw err;
        }
      },
    [isFlagPlaceholder, isAuthenticated, userId],
  );

  const result = useCursorPaginated<SocialUserSummaryDto, Record<string, never>>({
    key: key ?? [],
    fetcher,
    params: {},
    paginationKind: "cursor",
  });

  if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
  if (!isAuthenticated) return PLACEHOLDER_RESULT;
  if (userId === null) return PLACEHOLDER_RESULT;

  return {
    users: result.items,
    isLoading: result.isLoading,
    isStale: false,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error,
    retry: result.refresh,
  };
}
