"use client";

import { useCallback, useRef, useState } from "react";

import { isApiError, type ApiError } from "@/lib/api";

import { useCooldownTimer } from "@/shared/hooks/use-cooldown-timer";

import { bulkCreateVersionQuestions } from "@/features/quizzes/services/quizzes.service";

import type {
  BulkCreateQuestionsDto,
  BulkQuestionResultItem,
  QuizAuthorQuestionDto,
} from "@/features/quizzes/types/author-dtos";

export interface BulkProgress {
  current: number;
  total: number;
  label: string;
}

export interface BulkCreateResult {
  ok: boolean;
  questions: QuizAuthorQuestionDto[];
  results: BulkQuestionResultItem[];
}

export interface UseBulkCreateVersionQuestionsOptions {
  onComplete?: (result: BulkCreateResult) => void;
  onError?: (error: ApiError) => void;
  onRateLimit?: (seconds: number) => void;
}

export interface UseBulkCreateVersionQuestionsReturn {
  bulkCreate: (
    quizId: string,
    versionId: string,
    payload: BulkCreateQuestionsDto,
  ) => Promise<BulkCreateResult>;
  isLoading: boolean;
  progress: BulkProgress | null;
  result: BulkCreateResult | null;
  cooldownSeconds: number | null;
  clearResult: () => void;
}

const RATE_LIMIT_SECONDS = 60;

export function useBulkCreateVersionQuestions(
  options: UseBulkCreateVersionQuestionsOptions = {},
): UseBulkCreateVersionQuestionsReturn {
  const { onComplete, onError, onRateLimit } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);

  const cooldown = useCooldownTimer();
  const inFlightRef = useRef<Promise<BulkCreateResult> | null>(null);

  const cooldownSeconds = cooldown.isActive ? cooldown.remainingSeconds : null;

  const bulkCreate = useCallback(
    async (
      quizId: string,
      versionId: string,
      payload: BulkCreateQuestionsDto,
    ): Promise<BulkCreateResult> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      if (cooldown.isActive) {
        return {
          ok: false,
          questions: [],
          results: payload.questions.map((_, i) => ({
            index: i,
            status: 429,
            code: "GLOBAL_RATE_LIMITED",
            message: "Rate limited. Please wait before trying again.",
          })),
        };
      }

      const total = payload.questions.length;
      setIsLoading(true);
      setProgress({
        current: 0,
        total,
        label: `Adding 0 of ${total}...`,
      });

      const core = (async (): Promise<BulkCreateResult> => {
        try {
          const response = await bulkCreateVersionQuestions(
            quizId,
            versionId,
            payload,
          );

          const successCount = response.questions.length;
          const failedCount = total - successCount;

          const bulkResult: BulkCreateResult = {
            ok: failedCount === 0,
            questions: response.questions,
            results: response.results,
          };

          setProgress({
            current: total,
            total,
            label: `Added ${successCount} of ${total} questions`,
          });

          setResult(bulkResult);
          onComplete?.(bulkResult);
          return bulkResult;
        } catch (err) {
          if (isApiError(err)) {
            if (err.status === 429) {
              cooldown.start(RATE_LIMIT_SECONDS * 1000);
              onRateLimit?.(RATE_LIMIT_SECONDS);

              const rateLimitResult: BulkCreateResult = {
                ok: false,
                questions: [],
                results: payload.questions.map((_, i) => ({
                  index: i,
                  status: 429,
                  code: "GLOBAL_RATE_LIMITED",
                  message: `Rate limited. Please wait ${RATE_LIMIT_SECONDS} seconds.`,
                })),
              };

              setResult(rateLimitResult);
              onComplete?.(rateLimitResult);
              return rateLimitResult;
            }

            const errorResult: BulkCreateResult = {
              ok: false,
              questions: [],
              results: payload.questions.map((_, i) => ({
                index: i,
                status: err.status,
                code: err.code,
                message: err.detail ?? err.message,
              })),
            };

            setResult(errorResult);
            onError?.(err);
            onComplete?.(errorResult);
            return errorResult;
          }

          const errorResult: BulkCreateResult = {
            ok: false,
            questions: [],
            results: payload.questions.map((_, i) => ({
              index: i,
              status: 0,
              code: "GLOBAL_UNKNOWN",
              message: err instanceof Error ? err.message : "Unknown error",
            })),
          };

          setResult(errorResult);
          onComplete?.(errorResult);
          return errorResult;
        }
      })();

      inFlightRef.current = core;

      try {
        return await core;
      } finally {
        inFlightRef.current = null;
        setIsLoading(false);
        setProgress(null);
      }
    },
    [cooldown, onComplete, onError, onRateLimit],
  );

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    bulkCreate,
    isLoading,
    progress,
    result,
    cooldownSeconds,
    clearResult,
  };
}
