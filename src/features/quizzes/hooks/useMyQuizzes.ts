'use client';

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { getMyQuizzes } from "@/features/quizzes/services/quizzes.service";
import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";
import { myQuizzesKey } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesParams {

limit?: number;
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

export type UseMyQuizzesResult = UseCursorPaginatedResult<MyQuizListItem>;

export function useMyQuizzes(
params?: UseMyQuizzesParams,
): UseMyQuizzesResult {
const fetcher = useMemo(
(): (args: CursorFetcherArgs<UseMyQuizzesParams>) => Promise<CursorPage<MyQuizListItem>> =>
async ({ cursor, signal }) => {
try {
const result = (await getMyQuizzes({
cursor: cursor ?? undefined,
limit: params?.limit,
          })) as unknown as GetMyQuizzesResponse;

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

return useCursorPaginated<MyQuizListItem, UseMyQuizzesParams>({
key: myQuizzesKey("all"),
fetcher,
params: params ?? {},
paginationKind: "cursor",
  });
}
