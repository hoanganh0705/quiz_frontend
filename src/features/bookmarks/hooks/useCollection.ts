"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getCollection } from "@/features/bookmarks/api";
import type {
  BookmarkCollection,
  BookmarkCollectionResponseDto,
} from "@/features/bookmarks/types";
import { toBookmarkCollection } from "@/features/bookmarks/types";

export function bookmarkCollectionKey(collectionId: string) {
  return ["bookmark-collections", "detail", collectionId] as const;
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

  const collection: BookmarkCollection | null = (() => {
    if (!query.data) return null;
    const items = (
      query.data as unknown as {
        data?: { items?: Array<Record<string, unknown>> };
      }
    )?.data?.items;
    if (!items || items.length === 0) return null;
    const first = items[0];
    return toBookmarkCollection(
      first as unknown as BookmarkCollectionResponseDto,
    );
  })();

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
    collection,
    isLoading: query.isLoading && !query.error && enabled,
    error,
    mutate: query.refetch,
  };
}
