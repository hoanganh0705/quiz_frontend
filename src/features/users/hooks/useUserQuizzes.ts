

'use client';

import { useMemo } from 'react';

import { ApiError, projectWithId, useCursorPaginated, type ProjectWithId } from '@/lib/api';
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import {
listUserQuizzes,
type ListUserQuizzesParams,
} from '@/features/users/services/users.profile.service';
import type { QuizListItemDto } from '@/lib/api/generated/schemas';

export type UseUserQuizzesParams = Pick<ListUserQuizzesParams, 'status' | 'limit'>;

type ListUserQuizzesResponse = {
data?: QuizListItemDto[];
meta?: {
pagination?: {
kind: 'cursor';
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

type QuizListItemWithId = ProjectWithId<QuizListItemDto, 'quizId'>;

export type UseUserQuizzesResult = UseCursorPaginatedResult<QuizListItemWithId>;

const EMPTY_PAGE: CursorPage<QuizListItemWithId> = Object.freeze({
items: [] as readonly QuizListItemWithId[],
nextCursor: null as string | null,
hasNextPage: false,
limit: 0,
});

export function useUserQuizzes(
userId: string | null,
params?: UseUserQuizzesParams,
): UseUserQuizzesResult {
const fetcher = useMemo(
() =>
async ({
cursor,
signal: _signal,
      }: CursorFetcherArgs<UseUserQuizzesParams>): Promise<CursorPage<QuizListItemWithId>> => {
if (userId === null) {
return EMPTY_PAGE;
        }
try {
const result = (await listUserQuizzes(userId, {
...(cursor ? { cursor } : {}),
...(params?.limit ? { limit: params.limit } : {}),
...(params?.status ? { status: params.status } : {}),
          })) as ListUserQuizzesResponse;

const items = (result.data ?? []) as QuizListItemDto[];
const visibleItems = items.filter((item) => item.isHidden !== true);
const itemsWithId = projectWithId(visibleItems as unknown as readonly Record<string, unknown>[], 'quizId') as unknown as QuizListItemWithId[];

const pagination = result.meta?.pagination;
return {
items: itemsWithId,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? itemsWithId.length,
          };
        } catch (err) {
if (err instanceof ApiError && err.status === 404) {
return EMPTY_PAGE;
          }
throw err;
        }
      },
[userId, params?.limit, params?.status],
  );

return useCursorPaginated<QuizListItemWithId, UseUserQuizzesParams>({
key: userId
? (['users', userId, 'quizzes', params?.status ?? 'all', params?.limit ?? null] as const)
: (['users', '__no_user__', 'quizzes'] as const),
fetcher,
params: params ?? {},
paginationKind: 'cursor',
  });
}
