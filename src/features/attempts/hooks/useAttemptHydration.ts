"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import {
  getAttempt,
  getAttemptAnswers,
} from "@/features/attempts/services/attempts.service";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";

import type { SubmittedAnswersMap } from "@/features/attempts/types/attempt-runner.types";

import type {
  AttemptAnswerItemDto,
  AttemptResponseDto,
} from "@/lib/api/generated/schemas";

export interface UseAttemptHydrationParams {
  attemptId: string | null;
}

export interface AttemptHydrationView {
  detail: AttemptResponseDto | null;
  submittedAnswers: SubmittedAnswersMap;
  isLoading: boolean;
  hasResolved: boolean;
  error: import("@/lib/api").ApiError | null;
  refresh: () => Promise<void>;
}

export function buildSubmittedAnswersMap(
  items: readonly AttemptAnswerItemDto[] | undefined,
): SubmittedAnswersMap {
  if (!items || items.length === 0) return {};
  const out: Record<string, AttemptAnswerItemDto> = {};
  for (const item of items) {
    out[item.questionId] = item;
  }
  return out;
}

export function useAttemptHydration(
  params: UseAttemptHydrationParams,
): AttemptHydrationView {
  const { attemptId } = params;

  const sessionId = useAuthSessionId();

  const detailKey = useMemo(
    () =>
      attemptId === null || sessionId === null
        ? null
        : ATTEMPT_KEYS.detail(attemptId, sessionId),
    [attemptId, sessionId],
  );

  const answersKey = useMemo(
    () =>
      attemptId === null || sessionId === null
        ? null
        : ATTEMPT_KEYS.answers(attemptId, sessionId),
    [attemptId, sessionId],
  );

  const detailFetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<AttemptResponseDto | null> => {
        if (attemptId === null) return null;
        const wire = await getAttempt(attemptId);
        const unwrapped = inspectEnvelope<AttemptResponseDto>(wire);
        const data = unwrapped.kind === "envelope" ? unwrapped.value : null;
        if (signal.aborted) return data;
        return data;
      },
    [attemptId],
  );

  const answersFetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<SubmittedAnswersMap> => {
        if (attemptId === null) return {};
        const wire = await getAttemptAnswers(attemptId);
        const unwrapped = inspectEnvelope<{ answers?: AttemptAnswerItemDto[] }>(
          wire,
        );
        const answers =
          unwrapped.kind === "envelope" ? unwrapped.value?.answers : undefined;
        if (signal.aborted) {
          return buildSubmittedAnswersMap(answers);
        }
        return buildSubmittedAnswersMap(answers);
      },
    [attemptId],
  );

  const detail = useSingleWithRetry<AttemptResponseDto | null>({
    key: detailKey,
    fetcher: detailFetcher,
  });

  const answers = useSingleWithRetry<SubmittedAnswersMap>({
    key: answersKey,
    fetcher: answersFetcher,
  });

  const isLoading = detail.isLoading || answers.isLoading;

  const hasResolved =
    !isLoading &&
    (detail.data !== undefined ||
      detail.error !== null ||
      answers.data !== undefined ||
      answers.error !== null);

  const error: ApiError | null = detail.error ?? answers.error;

  const refresh = useCallback(async () => {
    await Promise.all([detail.retry(), answers.retry()]);
  }, [detail, answers]);

  return {
    detail: detail.data ?? null,
    submittedAnswers: answers.data ?? {},
    isLoading,
    hasResolved,
    error,
    refresh,
  };
}

export { buildSubmittedAnswersMap as buildHydrationLockMap };
