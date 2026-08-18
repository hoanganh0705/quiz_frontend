

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, isApiError } from '@/lib/api';

import { listVersionQuestions } from '@/features/quizzes/services/question-service';
import type { QuizAuthorQuestionDto } from '@/features/quizzes/types/author-dtos';

export interface UseVersionQuestionsOptions {

quizId: string | null;

versionId: string | null;
}

export interface UseVersionQuestionsResult {

questions: QuizAuthorQuestionDto[];

totalCount: number;

isLoading: boolean;

isEmpty: boolean;

error: ApiError | null;

notFound: boolean;

refresh: () => Promise<void>;

skeletonData: QuizAuthorQuestionDto[];
}

const INITIAL_SKELETON_COUNT = 10;

export function useVersionQuestions(
options: UseVersionQuestionsOptions,
): UseVersionQuestionsResult {
const { quizId, versionId } = options;

const [questions, setQuestions] = useState<QuizAuthorQuestionDto[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<ApiError | null>(null);
const [notFound, setNotFound] = useState(false);

const mountedRef = useRef(true);

const swrKey = useMemo<readonly unknown[] | null>(() => {
if (!quizId || !versionId) return null;
return ['quiz', 'version', quizId, versionId, 'questions'];
  }, [quizId, versionId]);

const fetchQuestions = useCallback(async () => {
if (!quizId || !versionId) return;

setIsLoading(true);
setError(null);
setNotFound(false);

try {
const result = await listVersionQuestions(quizId, versionId);

if (mountedRef.current) {
setQuestions(result.questions);
setIsLoading(false);
      }
    } catch (err) {
if (!mountedRef.current) return;

if (isApiError(err)) {
if (err.status === 404 || err.code === 'QUIZ_VERSION_NOT_FOUND') {
setNotFound(true);
        } else {
setError(err);
        }
      } else {
setError(new ApiError({
status: 0,
code: 'GLOBAL_UNKNOWN',
message: err instanceof Error ? err.message : 'Unknown error',
        }));
      }

setIsLoading(false);
    }
  }, [quizId, versionId]);

useEffect(() => {
mountedRef.current = true;
void fetchQuestions();

return () => {
mountedRef.current = false;
    };
  }, [fetchQuestions]);

const refresh = useCallback(async () => {
await fetchQuestions();
  }, [fetchQuestions]);

const skeletonData = useMemo<QuizAuthorQuestionDto[]>(() => {
return Array.from({ length: INITIAL_SKELETON_COUNT }, (_, i) => ({
questionId: `skeleton-${i}`,
quizVersionId: quizId ?? '',
position: i + 1,
questionText: '',
imageUrl: null,
createdAt: '',
updatedAt: '',
answerOptions: [],
    }));
  }, [quizId]);

return {
questions,
totalCount: questions.length,
isLoading,
isEmpty: !isLoading && questions.length === 0,
error,
notFound,
refresh,
skeletonData,
  };
}
