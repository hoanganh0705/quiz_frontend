"use client";

/**
 * `useBlockedUsers` — cursor-paginated hook for the viewer's blocked-users
 * list.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.D3.
 *
 * The endpoint is viewer-only — there is no `userId` argument. The cache
 * key is the viewer's blocked-list key.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { toBlockedUser } from "@/features/social/dto-adapters";
import { getBlockedUsers } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialBlockedUserDto,
} from "@/features/social/types";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

export interface UseBlockedUsersResult {
  users: readonly SocialBlockedUserDto[];
  isLoading: boolean;
  isStale: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  retry: () => Promise<void>;
}

const EMPTY_PAGE = Object.freeze({
  items: [] as readonly SocialBlockedUserDto[],
  nextCursor: null as string | null,
  hasNextPage: false,
  limit: 0,
});

const PLACEHOLDER_RESULT: UseBlockedUsersResult = Object.freeze({
  users: [],
  isLoading: false,
  isStale: false,
  hasMore: false,
  loadMore: () => undefined,
  error: null,
  retry: () => Promise.resolve(),
});

export function useBlockedUsers(): UseBlockedUsersResult {
  const flagValue = getFeatureFlagValue("phase6_social_relationship");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthBootstrap();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    return SOCIAL_CACHE_KEYS.makeBlockedKey();
  }, [isFlagPlaceholder, isAuthenticated]);

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<Record<string, never>>): Promise<{
        items: readonly SocialBlockedUserDto[];
        nextCursor: string | null;
        hasNextPage: boolean;
        limit: number;
      }> => {
        if (isFlagPlaceholder || !isAuthenticated) {
          return EMPTY_PAGE;
        }
        try {
          const wire = await getBlockedUsers();
          const items = (wire.data ?? []).map((row) => toBlockedUser(row));
          // The blocked-users endpoint is not paginated (the viewer
          // has bounded lists). We synthesize a single-page cursor page
          // so the primitive treats the response as "no more pages".
          const limit = items.length;
          return {
            items,
            nextCursor: null,
            hasNextPage: false,
            limit,
          };
        } catch (err) {
          const apiErr = err as Partial<ApiError> | null;
          if (
            apiErr &&
            (apiErr.code === "GLOBAL_NOT_FOUND" ||
              apiErr.status === 404)
          ) {
            return EMPTY_PAGE;
          }
          throw err;
        }
        // `cursor` is accepted to satisfy the fetcher signature; the
        // backend's blocked-list endpoint ignores it on this read.
        void cursor;
      },
    [isFlagPlaceholder, isAuthenticated],
  );

  const result = useCursorPaginated<SocialBlockedUserDto, Record<string, never>>({
    key: key ?? [],
    fetcher,
    params: {},
    paginationKind: "cursor",
  });

  if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
  if (!isAuthenticated) return PLACEHOLDER_RESULT;

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
