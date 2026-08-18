

'use client';

import { useMemo } from 'react';

import { ApiError, coerceToApiError, isApiError, useSingleWithRetry } from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';

import { getQuizStatsByIdOrSlug } from '@/features/quizzes/services/quizzes.service';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

export interface UseQuizStatsByIdOrSlugResult {
stats: QuizStatsResponseDto | null;
isLoading: boolean;
noStats: boolean;
error: ApiError | null;
retry: () => Promise<void>;
isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
if (!isApiError(err)) return false;
return err.status === 404;
}

export function useQuizStatsByIdOrSlug(
idOrSlug: string | null,
): UseQuizStatsByIdOrSlugResult {
const key = useMemo(
() =>
idOrSlug === null
? null
: (['useQuizStatsByIdOrSlug', idOrSlug] as const),
[idOrSlug],
  );

const fetcher = useMemo<SingleFetcher<QuizStatsResponseDto>>(
() => async ({ signal }) => {
let response: QuizStatsResponseDto | null;
try {
response = await getQuizStatsByIdOrSlug(idOrSlug!);
      } catch (err) {
if (isApiError(err)) {
throw err;
        }
throw coerceToApiError(err);
      }
if (signal.aborted) {
throw new DOMException('aborted', 'AbortError');
      }
if (
response === null ||
typeof response !== 'object' ||
!('quizId' in response)
      ) {
throw coerceToApiError(
new Error('[useQuizStatsByIdOrSlug] malformed stats envelope'),
        );
      }
return response;
    },
[idOrSlug],
  );

const swr = useSingleWithRetry<QuizStatsResponseDto>({ key, fetcher });

const noStats =
!swr.isLoading && swr.error !== null && isNotFoundError(swr.error);

const error = swr.error && !isNotFoundError(swr.error) ? swr.error : null;

return {
stats: swr.data ?? null,
isLoading: swr.isLoading,
noStats,
error,
retry: swr.retry,
isRetrying: swr.isRetrying,
  };
}
