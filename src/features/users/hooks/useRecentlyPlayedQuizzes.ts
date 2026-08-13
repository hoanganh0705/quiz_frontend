"use client";

/**
 * `useRecentlyPlayedQuizzes()` — read-side hook for the
 * recently-played-quizzes panel on `/` (home page).
 * Phase 3 (S-16). Replaces the legacy client-side
 * recently-played-quizzes cache that the section used to render.
 *
 * Phase 3 (S-16): the regenerated SDK exposes
 * `userControllerGetRecentlyPlayedQuizzes()` under
 * `getUsers()`. The hook uses the contract directly and
 * narrows the wire DTO into the local row shape with an
 * `id` (the `useCursorPaginated` primitive requires
 * `T extends { id: string }`).
 */

import { useCallback, useMemo } from "react";
import {
  useCursorPaginated,
  getUsers,
  type CursorFetcherArgs,
} from "@/lib/api";

interface RecentlyPlayedQuiz {
  id: string;
  quizId: string;
  quizTitle: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  imageUrl: string | null;
  playedAt: string;
  scorePercent: number;
}

interface RecentlyPlayedQuizzesPage {
  items: readonly RecentlyPlayedQuiz[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

const RECENT_LIMIT = 4;

export function useRecentlyPlayedQuizzes() {
  const key = useMemo<readonly unknown[]>(
    () =>
      [
        "users",
        "me",
        "recently-played-quizzes",
        { limit: RECENT_LIMIT },
      ] as const,
    [],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<{
        limit: number;
      }>): Promise<RecentlyPlayedQuizzesPage> => {
        try {
          const envelope =
            await getUsers().userControllerGetRecentlyPlayedQuizzes({
              ...(cursor ? { cursor } : {}),
              limit: RECENT_LIMIT,
            });

          // The SDK wraps the response in `{ data: RecentlyPlayedQuizzesResponseDto[], meta }`;
          // each `RecentlyPlayedQuizzesResponseDto` carries its own `items` + `pagination`.
          const pages = (envelope?.data ?? []) as unknown as Array<{
            items: Array<{
              quizId: string;
              quizTitle: string;
              slug: string;
              difficulty: 'easy' | 'medium' | 'hard';
              imageUrl: string | null;
              playedAt: string;
              scorePercent: number;
            }>;
            pagination?: {
              kind: string;
              limit: number;
              hasNextPage: boolean;
              nextCursor: string | null;
            };
          }>;
          const firstPage = pages[0];
          const items = firstPage?.items ?? [];
          const pagination = firstPage?.pagination;

          return {
            items: items.map((item) => ({
              id: item.quizId,
              quizId: item.quizId,
              quizTitle: item.quizTitle,
              slug: item.slug,
              difficulty: item.difficulty,
              imageUrl: item.imageUrl,
              playedAt: item.playedAt,
              scorePercent: item.scorePercent,
            })),
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? RECENT_LIMIT,
          };
        } catch {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: RECENT_LIMIT,
          };
        }
      },
    [],
  );

  const result = useCursorPaginated<RecentlyPlayedQuiz, { limit: number }>({
    key,
    fetcher,
    params: { limit: RECENT_LIMIT },
    paginationKind: "cursor",
  });

  const refresh = useCallback(async (): Promise<void> => {
    await result.refresh();
  }, [result]);

  return {
    items: result.items,
    isLoading: result.isLoading,
    hasMore: result.hasMore,
    refresh,
    loadMore: result.loadMore,
  };
}
