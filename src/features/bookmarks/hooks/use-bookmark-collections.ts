"use client";

import { useQuery } from "@tanstack/react-query";

import { coerceToApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { listCollections } from "@/features/bookmarks/api";
import { BOOKMARK_KEYS } from "@/features/bookmarks/query-keys";

import type { ApiError } from "@/lib/api";
import type { BookmarkCollectionResponseDto } from "@/lib/api/generated/schemas";

export const bookmarkCollectionsKey = () => BOOKMARK_KEYS.all;

export interface UseBookmarkCollectionsResult {
  collections: ReadonlyArray<BookmarkCollectionResponseDto>;
  isLoading: boolean;
  error: ApiError | null;
  mutate: () => Promise<unknown>;
}

function extractCollections(
  page: Awaited<ReturnType<typeof listCollections>> | undefined,
): ReadonlyArray<BookmarkCollectionResponseDto> {
  return page?.data?.items ?? [];
}

export function useBookmarkCollections(): UseBookmarkCollectionsResult {
  const { isAuthenticated } = useAuthState();

  const queryKey = isAuthenticated
    ? bookmarkCollectionsKey()
    : (["bookmark-collections", "disabled"] as const);

  const query = useQuery(
    {
      queryKey,
      queryFn: () => listCollections(),
      enabled: Boolean(isAuthenticated),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  const collections = extractCollections(query.data);
  const error: ApiError | null = query.error
    ? coerceToApiError(query.error)
    : null;

  return {
    collections,
    isLoading: query.isLoading && !query.error,
    error,
    mutate: query.refetch,
  };
}
