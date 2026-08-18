

'use client';

import { useMemo } from 'react';

import { ApiError, useCursorPaginated } from '@/lib/api';
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import { listQuizComments } from '@/features/comments/services/comments.service';
import { useCommentThreadLookup } from '@/features/comments/stores/useCommentThreadLookup';
import {
REPLY_DEFAULT_LIMIT,
TOP_LEVEL_DEFAULT_LIMIT,
commentsKey,
type CommentFilters,
type CommentThreadItem,
} from '@/features/comments/types';

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

const lookup = useCommentThreadLookup(quizId);

const key = useMemo(
() => (quizId === null ? null : commentsKey(quizId, filters)),
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

const startedAt = Date.now();

const effectiveCursor = cursor ?? filters?.cursor ?? undefined;

try {
const result = (await listQuizComments(
quizId,
{
cursor: effectiveCursor,
limit: filters?.limit ?? defaultLimitFor(filters),

parentId: filters?.parentId,
            } as unknown as Parameters<typeof listQuizComments>[1],
          )) as unknown as ListQuizCommentsResponse;

const items: readonly CommentThreadItem[] = (result.data ?? []).map(
(item) => ({ ...item, id: item.id }) as CommentThreadItem,
          );

for (const item of items) {
lookup.setRepliesCount(item.id, item.repliesCount);
          }

const pagination = result.meta?.pagination;
return {
items,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? items.length,
          };
        } catch (err) {
if (err instanceof Error && err.name === 'AbortError') {
throw err;
          }

emitBreadcrumb('phase4:4.12:comments-list', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err instanceof ApiError ? err.code : 'GLOBAL_UNKNOWN',
          });
throw err;
        }
      },
[quizId, filters, lookup],
  );

return useCursorPaginated<CommentThreadItem, UseQuizCommentsParams>({
key: key ?? ['comments', 'disabled'],
fetcher,
params,
paginationKind: 'cursor',
  });
}

function defaultLimitFor(filters: CommentFilters | undefined): number {
if (filters?.limit !== undefined) return filters.limit;
if (filters?.parentId !== undefined) return REPLY_DEFAULT_LIMIT;
return TOP_LEVEL_DEFAULT_LIMIT;
}

function emitBreadcrumb(
category: string,
data: { status: string; durationMs: number; code?: string },
): void {

void category;
void data;
}
