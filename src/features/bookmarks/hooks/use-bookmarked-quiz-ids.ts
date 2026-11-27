"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { ApiError, coerceToApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { listBookmarksInCollection } from "@/features/bookmarks/api";
import { useBookmarkCollections } from "@/features/bookmarks/hooks/use-bookmark-collections";

import type { BookmarkedQuizResponseDto } from "@/lib/api/generated/schemas";

export const bookmarkedQuizIdsKey = () => ["bookmarked-quiz-ids"] as const;

export interface UseBookmarkedQuizIdsResult {
  quizIds: ReadonlySet<string>;
  isLoading: boolean;
  error: ApiError | null;
  mutate: () => Promise<unknown>;
}

export function buildBookmarkedQuizIdSet(
  memberLists: ReadonlyArray<ReadonlyArray<BookmarkedQuizResponseDto>>,
): ReadonlySet<string> {
  const union = new Set<string>();
  for (const list of memberLists) {
    for (const bookmark of list) {
      if (typeof bookmark.quizId === "string" && bookmark.quizId.length > 0) {
        union.add(bookmark.quizId);
      }
    }
  }
  return union;
}

const EMPTY_FETCHER = async (): Promise<ReadonlyArray<never>> => [];

export function useBookmarkedQuizIds(): UseBookmarkedQuizIdsResult {
  const { isAuthenticated } = useAuthState();
  const { collections, isLoading: collectionsLoading } =
    useBookmarkCollections();

  const collectionIdsKey = useMemo(
    () =>
      collections
        .map((c) => c.collectionId)
        .sort()
        .join("|"),
    [collections],
  );

  const enabled = Boolean(isAuthenticated && !collectionsLoading);
  const queryKey = enabled
    ? (["bookmarked-quiz-ids", collectionIdsKey] as const)
    : (["bookmarked-quiz-ids", "disabled"] as const);

  const query = useQuery(
    {
      queryKey,
      queryFn: async (): Promise<ReadonlyArray<BookmarkedQuizResponseDto>> => {
        if (collections.length === 0) {
          return EMPTY_FETCHER();
        }
        const perCollection = await Promise.all(
          collections.map((c) =>
            listBookmarksInCollection(c.collectionId).then(
              (page) => page?.data?.items ?? [],
            ),
          ),
        );
        return perCollection.flat();
      },
      enabled,
      refetchOnWindowFocus: false,
    },
    getQueryClient(),
  );

  const quizIds = useMemo<ReadonlySet<string>>(
    () => buildBookmarkedQuizIdSet([query.data ?? []]),
    [query.data],
  );

  const isLoading = !isAuthenticated
    ? false
    : collectionsLoading || (query.isLoading && !query.error && enabled);

  const error: ApiError | null = query.error
    ? coerceToApiError(query.error)
    : null;

  return {
    quizIds,
    isLoading,
    error,
    mutate: query.refetch,
  };
}
