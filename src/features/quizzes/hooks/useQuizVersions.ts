

'use client';

import { useMemo } from 'react';

import { ApiError, useCursorPaginated } from '@/lib/api';
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import { getQuizVersions } from '@/features/quizzes/services/quizzes.service';
import {
quizVersionsKey,
type QuizVersionSummary,
} from '@/features/quizzes/types/quiz-version.types';

export interface UseQuizVersionsParams {

quizId: string;

limit?: number;
}

export interface UseQuizVersionsFilters {
status?: 'draft' | 'published';
}

type GetQuizVersionsResponse = {
data?: Array<{ quizVersionId: string } & Omit<QuizVersionSummary, 'quizVersionId'>>;
meta?: {
pagination?: {
kind: 'cursor';
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export type UseQuizVersionsResult = UseCursorPaginatedResult<QuizVersionSummary>;

function buildFilters(): UseQuizVersionsFilters {
return {};
}

export function useQuizVersions(
params: UseQuizVersionsParams,
): UseCursorPaginatedResult<QuizVersionSummary> {
const filters = useMemo(() => buildFilters(), []);

const fetcher = useMemo(
(): (args: CursorFetcherArgs<UseQuizVersionsParams>) => Promise<CursorPage<QuizVersionSummary>> =>
async ({ cursor, signal: _signal }) => {
const startedAt = Date.now();

try {
const result = (await getQuizVersions(params.quizId, {
cursor: cursor ?? undefined,
limit: params.limit,
          })) as unknown as GetQuizVersionsResponse;

emitBreadcrumb('phase4:4.9:versions-list', {
status: 'success',
durationMs: Date.now() - startedAt,
          });

const items: readonly QuizVersionSummary[] = (result.data ?? []).map(
(item) => ({ ...item, id: item.quizVersionId }) as QuizVersionSummary,
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
if (err instanceof Error && err.name === 'AbortError') {
throw err;
          }
emitBreadcrumb('phase4:4.9:versions-list', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err instanceof ApiError ? err.code : 'GLOBAL_UNKNOWN',
          });
throw err;
        }
      },
[params.quizId, params.limit],
  );

const key: readonly unknown[] = ['quiz', 'versions', params.quizId];

return useCursorPaginated<QuizVersionSummary, UseQuizVersionsParams>({
key,
fetcher,
params: params,
paginationKind: 'cursor',
  });
}

function emitBreadcrumb(
category: string,
data: { status: string; durationMs: number; code?: string },
): void {

void category;
void data;
}
