/**
 * `useVersionQuestions` — fetch questions for a quiz version (author view).
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.5.
 *
 * ## What this hook owns
 *
 * - Fetches questions for a quiz version using the author view (includes `isCorrect`).
 * - Returns questions in position order.
 * - Provides loading, error, and retry states.
 * - Returns skeleton data (10 empty items) for initial loading state.
 *
 * ## SWR Key
 *
 * `['quiz', 'version', quizId, versionId, 'questions']`
 *
 * ## Error handling
 *
 * - Network errors → `error` is set; `retry()` available
 * - 404 → `notFound` is `true`
 *
 * @see `listVersionQuestions` — service layer function
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, isApiError } from '@/lib/api';

import { listVersionQuestions } from '@/features/quizzes/services/question-service';
import type { QuizAuthorQuestionDto } from '@/features/quizzes/types/author-dtos';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseVersionQuestionsOptions {
  /** Quiz UUID. Pass `null` to skip the fetch. */
  quizId: string | null;
  /** Quiz version UUID. Pass `null` to skip the fetch. */
  versionId: string | null;
}

export interface UseVersionQuestionsResult {
  /** Array of questions in position order. Empty array when loading or error. */
  questions: QuizAuthorQuestionDto[];
  /** Total count of questions. */
  totalCount: number;
  /** `true` while the initial fetch is in flight. */
  isLoading: boolean;
  /** `true` when no questions exist and not loading. */
  isEmpty: boolean;
  /** Current error, if any. */
  error: ApiError | null;
  /** `true` if the version was not found. */
  notFound: boolean;
  /** Refresh the questions list. */
  refresh: () => Promise<void>;
  /** Skeleton data for initial loading (10 empty items). */
  skeletonData: QuizAuthorQuestionDto[];
}

// ─── Constants ───────────────────────────────────────────────────────────

const INITIAL_SKELETON_COUNT = 10;

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Fetch questions for a quiz version (author view).
 *
 * @example
 * ```tsx
 * const { questions, isLoading, isEmpty, error, refresh } = useVersionQuestions({
 *   quizId: 'uuid',
 *   versionId: 'uuid',
 * });
 *
 * if (isLoading) return <Skeleton />;
 * if (isEmpty) return <EmptyState />;
 *
 * return (
 *   <>
 *     {questions.map(q => <QuestionItem key={q.questionId} question={q} />)}
 *   </>
 * );
 * ```
 */
export function useVersionQuestions(
  options: UseVersionQuestionsOptions,
): UseVersionQuestionsResult {
  const { quizId, versionId } = options;

  const [questions, setQuestions] = useState<QuizAuthorQuestionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  // Build the SWR key for cache invalidation
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

  // Fetch on mount and when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    void fetchQuestions();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchQuestions]);

  // Refresh function for manual revalidation
  const refresh = useCallback(async () => {
    await fetchQuestions();
  }, [fetchQuestions]);

  // Build skeleton data
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
