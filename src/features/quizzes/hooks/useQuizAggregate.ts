'use client'

import { useMemo } from 'react';

import { ApiError, coerceToApiError, isApiError, useSingleWithRetry } from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';
import { getQuizzes } from '@/lib/api';
import type {
QuizAggregateResponseDto,
QuizQuestionPlayerDto,
QuizResponseDto,
QuizStatsHistoryPointDto,
QuizStatsResponseDto,
} from '@/lib/api/generated/schemas';
import {
projectQuizToPlayerView,
type PlayerQuizDetail,
} from '@/features/quizzes/lib/quiz-player-view';

export interface UseQuizAggregateResult {
quiz: QuizResponseDto | null;
playerQuiz: PlayerQuizDetail | null;
stats: QuizStatsResponseDto | null;
statsHistory: QuizStatsHistoryPointDto[];
previewQuestions: QuizQuestionPlayerDto[];
notFound: boolean;
isLoading: boolean;
error: ApiError | null;
retry: () => Promise<void>;
isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
if (!isApiError(err)) return false;
return err.status === 404;
}

export function useQuizAggregate(
idOrSlug: string | null,
): UseQuizAggregateResult {
const key = useMemo(
() =>
idOrSlug === null
? null
: (['useQuizAggregate', idOrSlug] as const),
[idOrSlug],
  );

const fetcher = useMemo<SingleFetcher<QuizAggregateResponseDto>>(
() => async ({ signal }) => {
let response: QuizAggregateResponseDto | null;
try {
const envelope = await getQuizzes().quizControllerGetQuizAggregate(idOrSlug!);
const payload = (envelope?.data as QuizAggregateResponseDto | undefined) ?? null;
response = payload;
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
!('quiz' in response)
      ) {
throw coerceToApiError(
new Error(
'[useQuizAggregate] malformed quiz aggregate envelope',
          ),
        );
      }
return response;
    },
[idOrSlug],
  );

const swr = useSingleWithRetry<QuizAggregateResponseDto>({ key, fetcher });

const notFound =
!swr.isLoading && swr.error !== null && isNotFoundError(swr.error);

const error = swr.error && !isNotFoundError(swr.error) ? swr.error : null;

const data = swr.data ?? null;

return {
quiz: data?.quiz ?? null,
playerQuiz: data?.quiz ? projectQuizToPlayerView(data.quiz) : null,
stats: data?.stats ?? null,
statsHistory: data?.statsHistory?.points ?? [],
previewQuestions: data?.previewQuestions ?? [],
notFound,
isLoading: swr.isLoading,
error,
retry: swr.retry,
isRetrying: swr.isRetrying,
  };
}