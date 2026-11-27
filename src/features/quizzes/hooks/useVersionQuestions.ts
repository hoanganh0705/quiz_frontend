"use client";

import { useMemo } from "react";

import { useQuizVersion } from "./useQuizVersion";

import type { QuizAuthorQuestionDto } from "@/features/quizzes/types/author-dtos";
import type { ApiError } from "@/lib/api";

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

/**
 * Derives version questions from the canonical `useQuizVersion` query cache,
 * preventing duplicate concurrent `GET /quizzes/:id/versions/:versionId` calls.
 */
export function useVersionQuestions(
  options: UseVersionQuestionsOptions,
): UseVersionQuestionsResult {
  const { quizId, versionId } = options;

  const { data, isLoading, error, notFound, retry } = useQuizVersion(
    quizId,
    versionId,
  );

  const questions = useMemo<QuizAuthorQuestionDto[]>(
    () => (data?.questions ?? []) as unknown as QuizAuthorQuestionDto[],
    [data?.questions],
  );

  const skeletonData = useMemo<QuizAuthorQuestionDto[]>(() => {
    return Array.from({ length: INITIAL_SKELETON_COUNT }, (_, i) => ({
      questionId: `skeleton-${i}`,
      quizVersionId: versionId ?? quizId ?? "",
      position: i + 1,
      questionText: "",
      imageUrl: null,
      createdAt: "",
      updatedAt: "",
      answerOptions: [],
    }));
  }, [quizId, versionId]);

  return {
    questions,
    totalCount: questions.length,
    isLoading,
    isEmpty: !isLoading && questions.length === 0,
    error,
    notFound,
    refresh: retry,
    skeletonData,
  };
}
