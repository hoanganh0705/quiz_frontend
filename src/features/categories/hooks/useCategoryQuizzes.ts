"use client";

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";
import type { CursorPage } from "@/lib/api/use-cursor-paginated.types";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";

import { CATEGORY_KEYS } from "@/features/categories/query-keys";
import { getCategoryQuizzes } from "@/features/categories/services/categories.service";

export interface UseCategoryQuizzesParams {
  limit?: number;
}

export function useCategoryQuizzes(
  idOrSlug: string,
  params: UseCategoryQuizzesParams = {},
) {
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: {
        cursor: string | null;
        params: UseCategoryQuizzesParams;
        signal?: AbortSignal;
      }): Promise<CursorPage<QuizListItemDto & { id: string }>> => {
        try {
          const result = await getCategoryQuizzes(idOrSlug, {
            cursor: cursor ?? undefined,
            limit: params.limit,
          });
          const rawItems = Array.isArray(result.data) ? result.data : [];
          const projected = projectWithId(rawItems, "quizId");

          const pagination = result.meta?.pagination;

          const ret: CursorPage<QuizListItemDto & { id: string }> = {
            items: projected,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? projected.length,
          };
          return ret;
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            } as CursorPage<QuizListItemDto & { id: string }>;
          }
          throw err;
        }
      },
    [idOrSlug, params.limit],
  );

  return useCursorPaginated<
    QuizListItemDto & { id: string },
    UseCategoryQuizzesParams
  >({
    key: CATEGORY_KEYS.quizzes(idOrSlug, params),
    fetcher,
    params,
    paginationKind: "cursor",
  });
}
