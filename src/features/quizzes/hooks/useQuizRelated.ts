'use client';

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import type { QuizListItemDto } from '@/lib/api/generated/schemas';

import { getQuizzesRelated } from '@/features/quizzes/services/quizzes.service';

export const QUIZ_RELATED_LIMIT = 4 as const;

export interface UseQuizRelatedResult {
items: readonly QuizListItemDto[];
isLoading: boolean;
error: ApiError | null;
notFound: boolean;
}

const DISABLED_RESULT: UseQuizRelatedResult = Object.freeze({
items: Object.freeze([]) as readonly QuizListItemDto[],
isLoading: false,
error: null,
notFound: false,
});

export function useQuizRelated(
idOrSlug: string | null,
): UseQuizRelatedResult {
const key =
idOrSlug === null
? null
: (['useQuizRelated', idOrSlug, { limit: QUIZ_RELATED_LIMIT }] as const);

const { data, error, isLoading } = useSWR<readonly QuizListItemDto[]>(
key,
async () => {
const result = await getQuizzesRelated(idOrSlug as string, {
limit: QUIZ_RELATED_LIMIT,
      });

return (result.data ?? []) as readonly QuizListItemDto[];
    },
{
      // Inherit the global SwrProvider defaults
      // (`revalidateOnFocus: false`, `dedupingInterval: 2_000`,
      // `errorRetryCount: 3`). No per-call overrides — silent
      // failure is the contract.
    },
  );

if (idOrSlug === null) return DISABLED_RESULT;

const notFound = !isLoading && isApiError(error) && error.status === 404;
const surfacedError =
!isLoading && error && !(isApiError(error) && error.status === 404)
? (error as ApiError)
: null;

return {
items: data ?? ([] as readonly QuizListItemDto[]),
isLoading,
error: surfacedError,
notFound,
  };
}
