

'use client';

import { useMemo } from 'react';

import { useCursorPaginated } from '@/lib/api';
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import { listQuizReviews } from '@/features/reviews/services/reviews.service';
import {
REVIEWS_DEFAULT_LIMIT,
quizReviewsKey,
type ReviewDto,
type ReviewFilters,
type ReviewPage,
} from '@/features/reviews/types';

type ListQuizReviewsResponse = {
data?: ReviewDto[];
meta?: {
pagination?: {
kind: string;
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export type UseQuizReviewsResult = UseCursorPaginatedResult<ReviewDto>;

export interface UseQuizReviewsParams {

quizId: string | null;

filters?: ReviewFilters;
}

export function useQuizReviews(
params: UseQuizReviewsParams,
): UseQuizReviewsResult {
const { quizId, filters } = params;

const key = useMemo(
() => (quizId === null ? null : quizReviewsKey(quizId, filters)),
[quizId, filters],
  );

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<UseQuizReviewsParams>): Promise<
CursorPage<ReviewDto>
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

const result = (await listQuizReviews(
quizId,
{
cursor: effectiveCursor,
limit: filters?.limit ?? REVIEWS_DEFAULT_LIMIT,
          },
        )) as unknown as ListQuizReviewsResponse;

const items: readonly ReviewDto[] = (result.data ?? []).map(
(item) => ({ ...item, id: item.reviewId }) as ReviewDto,
        );

const pagination = result.meta?.pagination;
const page: ReviewPage = {
items,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? items.length,
        };
return page;
      },
[quizId, filters],
  );

return useCursorPaginated<ReviewDto, UseQuizReviewsParams>({
key: key ?? ['reviews', 'disabled'],
fetcher,
params,
paginationKind: 'cursor',
  });
}
