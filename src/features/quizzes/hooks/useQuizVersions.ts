"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import { getQuizVersions } from "@/features/quizzes/services/quizzes.service";

import type { QuizVersionSummary } from "@/features/quizzes/types/quiz-version.types";

export interface UseQuizVersionsParams {
  quizId: string;

  limit?: number;
}

export interface UseQuizVersionsFilters {
  status?: "draft" | "published";
}

type GetQuizVersionsResponse = {
  data?: Array<
    { quizVersionId: string } & Omit<QuizVersionSummary, "quizVersionId">
  >;
  meta?: {
    pagination?: {
      kind: "cursor";
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

export type UseQuizVersionsResult =
  UseCursorPaginatedResult<QuizVersionSummary>;

export function useQuizVersions(
  params: UseQuizVersionsParams,
): UseCursorPaginatedResult<QuizVersionSummary> {
  const fetcher = useMemo(
    (): ((
      args: CursorFetcherArgs<UseQuizVersionsParams>,
    ) => Promise<CursorPage<QuizVersionSummary>>) =>
      async ({ cursor }) => {
        try {
          const result = (await getQuizVersions(params.quizId, {
            cursor: cursor ?? undefined,
            limit: params.limit,
          })) as unknown as GetQuizVersionsResponse;

          const items: readonly QuizVersionSummary[] = (result.data ?? []).map(
            (item) =>
              ({ ...item, id: item.quizVersionId }) as QuizVersionSummary,
          );

          const pagination = result.meta?.pagination;

          return {
            items,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? items.length,
          };
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            };
          }
          throw err;
        }
      },
    [params.quizId, params.limit],
  );

  return useCursorPaginated<QuizVersionSummary, UseQuizVersionsParams>({
    key: QUIZ_KEYS.versions(params.quizId),
    fetcher,
    params,
    paginationKind: "cursor",
  });
}
