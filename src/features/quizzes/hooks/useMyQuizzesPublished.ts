'use client';

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { getMyQuizzesPublished } from "@/features/quizzes/services/quizzes.service";
import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";
import { myQuizzesKey } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesPublishedParams {

limit?: number;
}

type GetMyQuizzesPublishedResponse = {
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

export type UseMyQuizzesPublishedResult = UseCursorPaginatedResult<MyQuizListItem>;

export function useMyQuizzesPublished(
params?: UseMyQuizzesPublishedParams,
): UseMyQuizzesPublishedResult {
const fetcher = useMemo(
(): (args: CursorFetcherArgs<UseMyQuizzesPublishedParams>) => Promise<CursorPage<MyQuizListItem>> =>
async ({ cursor, signal }) => {
try {
const result = (await getMyQuizzesPublished({
cursor: cursor ?? undefined,
limit: params?.limit,
          })) as unknown as GetMyQuizzesPublishedResponse;

const items = (result.data ?? []) as MyQuizListItem[];
const itemsWithId = projectWithId(items as unknown as readonly Record<string, unknown>[], 'quizId') as unknown as MyQuizListItem[];

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
[params?.limit],
  );

return useCursorPaginated<MyQuizListItem, UseMyQuizzesPublishedParams>({
key: myQuizzesKey("published"),
fetcher,
params: params ?? {},
paginationKind: "cursor",
  });
}
