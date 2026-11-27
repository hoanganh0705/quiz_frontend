"use client";

import { useQuery } from "@tanstack/react-query";

import { coerceToApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getCollection } from "@/features/bookmarks/api";
import { BOOKMARK_KEYS } from "@/features/bookmarks/query-keys";
import { toBookmarkCollection } from "@/features/bookmarks/types";

import type {
  BookmarkCollection,
  BookmarkCollectionResponseDto,
} from "@/features/bookmarks/types";
import type { ApiError } from "@/lib/api";

export function bookmarkCollectionKey(collectionId: string) {
  return BOOKMARK_KEYS.detail(collectionId);
}

export interface UseCollectionResult {
  collection: BookmarkCollection | null;
  isLoading: boolean;
  error: ApiError | null;
  mutate: () => Promise<unknown>;
}

export function useCollection(
  collectionId: string | null | undefined,
): UseCollectionResult {
  const { isAuthenticated } = useAuthState();

  const enabled = Boolean(collectionId && isAuthenticated);
  const queryKey = enabled
    ? bookmarkCollectionKey(collectionId!)
    : (["bookmark-collections", "detail", "disabled"] as const);

  const query = useQuery(
    {
      queryKey,
      queryFn: () => getCollection(collectionId!),
      enabled,
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  const collection: BookmarkCollection | null = query.data
    ? toBookmarkCollection(
        query.data as unknown as BookmarkCollectionResponseDto,
      )
    : null;

  const error: ApiError | null = query.error
    ? coerceToApiError(query.error)
    : null;

  return {
    collection,
    isLoading: query.isLoading && !query.error && enabled,
    error,
    mutate: query.refetch,
  };
}
