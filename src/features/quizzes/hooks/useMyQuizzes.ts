"use client";

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import {
  getMyQuizzes,
  getMyQuizzesDrafts,
  getMyQuizzesPublished,
} from "@/features/quizzes/services/quizzes.service";

import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";
import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";

export type MyQuizzesListTab = "all" | "drafts" | "published";

export interface UseMyQuizzesParams {
  tab?: MyQuizzesListTab;
  limit?: number;
  enabled?: boolean;
}

type GetMyQuizzesResponse = {
  data?: Array<MyQuizListItem & { [k: string]: unknown }>;
  meta?: {
    pagination?: {
      kind: "cursor";
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

const TAB_SERVICE = {
  all: getMyQuizzes,
  drafts: getMyQuizzesDrafts,
  published: getMyQuizzesPublished,
} as const;

export type UseMyQuizzesResult = UseCursorPaginatedResult<MyQuizListItem>;

export function useMyQuizzes(params?: UseMyQuizzesParams): UseMyQuizzesResult {
  const tab: MyQuizzesListTab = params?.tab ?? "all";

  const fetcher = useMemo(
    (): ((
      args: CursorFetcherArgs<UseMyQuizzesParams>,
    ) => Promise<CursorPage<MyQuizListItem>>) =>
      async ({ cursor }) => {
        try {
          const result = (await TAB_SERVICE[tab]({
            cursor: cursor ?? undefined,
            limit: params?.limit,
          })) as unknown as GetMyQuizzesResponse;

          const items = (result.data ?? []) as MyQuizListItem[];
          const itemsWithId = projectWithId(items, "quizId");

          const pagination = result.meta?.pagination;
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
    [tab, params?.limit],
  );

  return useCursorPaginated<MyQuizListItem, UseMyQuizzesParams>({
    key: QUIZ_KEYS.mine(tab),
    fetcher,
    params: params ?? {},
    paginationKind: "cursor",
    enabled: params?.enabled ?? true,
  });
}
