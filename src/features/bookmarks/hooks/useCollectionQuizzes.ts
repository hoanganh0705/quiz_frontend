"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { ApiError, coerceToApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { listBookmarksInCollection } from "@/features/bookmarks/api";
import {
  collectionQuizzesKey,
  toCollectionQuiz,
} from "@/features/bookmarks/types";

import type {
  CursorFetcherArgs,
  CursorPage,
} from "@/lib/api/use-cursor-paginated.types";
import type {
  BookmarkedQuizResponseDto,
  CollectionQuiz,
} from "@/features/bookmarks/types";

export interface UseCollectionQuizzesResult {
  quizzes: readonly CollectionQuiz[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: ApiError | null;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

interface BookmarksListResponse {
  data?: {
    items?: Array<Record<string, unknown>>;
  };
  meta?: {
    pagination?: {
      kind: "cursor";
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
}

export function useCollectionQuizzes(
  collectionId: string | null | undefined,
): UseCollectionQuizzesResult {
  const { isAuthenticated } = useAuthState();

  const fetcher = useMemo(
    (): ((
      args: CursorFetcherArgs<Record<string, never>>,
    ) => Promise<CursorPage<CollectionQuiz>>) =>
      async ({ cursor }) => {
        const result = (await listBookmarksInCollection(
          collectionId!,
        )) as unknown as BookmarksListResponse;

        const items = (result.data?.items ?? []) as Array<
          Record<string, unknown>
        >;
        const quizzes: CollectionQuiz[] = items.map((item) =>
          toCollectionQuiz(item as unknown as BookmarkedQuizResponseDto),
        );

        const itemsWithId = quizzes as unknown as Array<{ id: string }>;

        const pagination = result.meta?.pagination;

        return {
          items: itemsWithId as unknown as CollectionQuiz[] &
            Array<{ id: string }>,
          nextCursor: cursor ?? pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit: pagination?.limit ?? itemsWithId.length,
        };
      },
    [collectionId],
  );

  const enabled = Boolean(collectionId && isAuthenticated);
  const queryKey = enabled
    ? collectionQuizzesKey(collectionId!)
    : (["bookmark-collections", "quizzes", "disabled"] as const);

  const query = useQuery(
    {
      queryKey,
      queryFn: () => fetcher({ cursor: null, params: {}, signal: undefined }),
      enabled,
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  const data = query.data;
  const quizzes: readonly CollectionQuiz[] = data?.items ?? [];

  const cursor = data?.nextCursor ?? null;
  const hasMore = data?.hasNextPage ?? true;

  const error: ApiError | null = query.error
    ? coerceToApiError(query.error)
    : null;

  const loadMore = () => {};

  const refresh = async (): Promise<void> => {
    if (!enabled) return;
    await query.refetch();
  };

  return {
    quizzes,
    cursor,
    hasMore,
    isLoading: query.isLoading && !query.error && enabled,
    isLoadingMore: false,
    error,
    loadMore,
    refresh,
  };
}
