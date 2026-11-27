"use client";

import { useMemo } from "react";

import { useCursorPaginated } from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { COMMENT_KEYS } from "@/features/comments/query-keys";
import { listQuizComments } from "@/features/comments/services/comments.service";
import {
  REPLY_DEFAULT_LIMIT,
  TOP_LEVEL_DEFAULT_LIMIT,
  type CommentFilters,
  type CommentThreadItem,
} from "@/features/comments/types";

type ListQuizCommentsResponse = {
  data?: Array<CommentThreadItem>;
  meta?: {
    pagination?: {
      kind: string;
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

export type UseQuizCommentsResult = UseCursorPaginatedResult<CommentThreadItem>;

export interface UseQuizCommentsParams {
  quizId: string | null;

  filters?: CommentFilters;
}

export function useQuizComments(
  params: UseQuizCommentsParams,
): UseQuizCommentsResult {
  const { quizId, filters } = params;

  const key = useMemo(
    () => (quizId === null ? null : COMMENT_KEYS.list(quizId, filters)),
    [quizId, filters],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<UseQuizCommentsParams>): Promise<
        CursorPage<CommentThreadItem>
      > => {
        if (quizId === null) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const effectiveCursor = cursor ?? filters?.cursor ?? undefined;

        const result = (await listQuizComments(quizId, {
          cursor: effectiveCursor,
          limit: filters?.limit ?? defaultLimitFor(filters),
          parentId: filters?.parentId,
        })) as unknown as ListQuizCommentsResponse;

        const items: readonly CommentThreadItem[] = (result.data ?? []).map(
          (item) => ({ ...item, id: item.id }) as CommentThreadItem,
        );

        const pagination = result.meta?.pagination;
        return {
          items,
          nextCursor: pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit: pagination?.limit ?? items.length,
        };
      },
    [quizId, filters],
  );

  return useCursorPaginated<CommentThreadItem, UseQuizCommentsParams>({
    key: key ?? ["comments", "disabled"],
    fetcher,
    params,
    paginationKind: "cursor",
    enabled: quizId !== null,
  });
}

function defaultLimitFor(filters: CommentFilters | undefined): number {
  if (filters?.limit !== undefined) return filters.limit;
  if (filters?.parentId !== undefined) return REPLY_DEFAULT_LIMIT;
  return TOP_LEVEL_DEFAULT_LIMIT;
}
