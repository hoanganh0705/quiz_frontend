"use client";

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { getTagQuizzes } from "@/features/tags/services/tags.service";

import type { QuizListItemDto } from "@/lib/api/generated/schemas";
import type { CursorPage } from "@/lib/api/use-cursor-paginated.types";
import type { TagQuizzesResponse } from "@/features/tags/types";

export type { TagQuizzesResponse };

export interface UseTagQuizzesParams {
  limit?: number;
}

type TagQuizItem = QuizListItemDto & { id: string };

export function useTagQuizzes(slug: string, params: UseTagQuizzesParams = {}) {
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: {
        cursor: string | null;
        params: UseTagQuizzesParams;
        signal?: AbortSignal;
      }): Promise<CursorPage<TagQuizItem>> => {
        try {
          const result = await getTagQuizzes(slug, {
            cursor: cursor ?? undefined,
            limit: params.limit,
          });
          const rawItems = result.data ?? [];
          const pagination = result.meta?.pagination;
          const itemsWithId = projectWithId(rawItems, "quizId");

          return {
            items: itemsWithId,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? itemsWithId.length,
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
    [slug, params.limit],
  );

  return useCursorPaginated<
    QuizListItemDto & { id: string },
    UseTagQuizzesParams
  >({
    key: TAG_KEYS.quizzes(slug, params),
    fetcher,
    params,
    paginationKind: "cursor",
  });
}
