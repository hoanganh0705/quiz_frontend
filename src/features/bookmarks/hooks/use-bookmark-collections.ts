"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";
import type { BookmarkCollectionResponseDto } from "@/lib/api/generated/schemas";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { listCollections } from "@/features/bookmarks/api";

export const bookmarkCollectionsKey = () => ["bookmark-collections"] as const;

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
    : ["bookmark-collections", "disabled"];

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

  const error: ApiError | null = (() => {
    const first = query.error;
    if (!first) return null;
    if (isApiError(first)) return first;

    if (first && typeof first === "object" && "status" in first) {
      return first as unknown as ApiError;
    }
    return {
      status: 0,
      message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

  return {
    collections,
    isLoading: query.isLoading && !query.error,
    error,
    mutate: query.refetch,
  };
}
