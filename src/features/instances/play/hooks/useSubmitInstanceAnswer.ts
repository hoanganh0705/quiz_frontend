"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";

import {
  type AnswerSubmissionDto,
  type AnswerSubmissionState,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useQuestionTimer } from "./useQuestionTimer";
import {
  useInstanceGameplayStore,
  selectGameplayTiming,
} from "../stores/instanceGameplay.store";

export interface UseSubmitInstanceAnswerResult {
  submit: (optionId: string) => Promise<void>;
  state: AnswerSubmissionState;
  lastError: ApiError | null;
  submission: {
    questionId: string;
    submittedAt: string;
    accepted: boolean;
  } | null;
  selectedOptionId: string | null;
  canSubmit: boolean;
  reset: () => void;
}

export function useSubmitInstanceAnswer(
  instanceId: string | null,
  currentQuestionId: string | null,
): UseSubmitInstanceAnswerResult {
  const { emitAnswer } = useInstanceGameSocket(instanceId);

  const timing = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayTiming(s, instanceId) : null,
  );

  const { isWindowOpen } = useQuestionTimer(instanceId);
  const windowOpen = timing ? isWindowOpen : true;

  const [state, setState] = useState<AnswerSubmissionState>("idle");
  const [lastError, setLastError] = useState<ApiError | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [acceptedAck, setAcceptedAck] = useState<{
    questionId: string;
    submittedAt: string;
    accepted: boolean;
  } | null>(null);

  const pendingRef = useRef(false);
  const submittedQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentQuestionId !== submittedQuestionRef.current) {
      setState("idle");
      setLastError(null);
      setAcceptedAck(null);
      setSelectedOptionId(null);
      pendingRef.current = false;
    }
  }, [currentQuestionId]);

  const canSubmit =
    currentQuestionId !== null &&
    windowOpen &&
    submittedQuestionRef.current !== currentQuestionId &&
    !pendingRef.current;

  const submit = useCallback(
    async (optionId: string): Promise<void> => {
      if (currentQuestionId === null) return;
      if (pendingRef.current) return;
      if (submittedQuestionRef.current === currentQuestionId) return;

      pendingRef.current = true;
      setState("pending");
      setLastError(null);
      setSelectedOptionId(optionId);

      const submission: AnswerSubmissionDto = {
        questionId: currentQuestionId,
        optionId,
        submittedAt: new Date().toISOString(),
        clientToken: crypto.randomUUID(),
      };

      try {
        const ack = await emitAnswer(submission);

        submittedQuestionRef.current = currentQuestionId;
        setAcceptedAck({
          questionId: ack.questionId,
          submittedAt: ack.submittedAt,
          accepted: ack.accepted,
        });
        setState("accepted");
        setLastError(null);

        useInstanceGameplayStore
          .getState()
          .applySubmission(ack.questionId, ack.submittedAt, optionId);
      } catch (cause: unknown) {
        pendingRef.current = false;
        setState("rejected");

        if (isApiError(cause)) {
          setLastError(cause as ApiError);
        } else {
          setLastError(
            new ApiError({
              status: 0,
              code: "UNKNOWN",
              message: "Submission failed",
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
        }
      } finally {
        pendingRef.current = false;
      }
    },
    [currentQuestionId, emitAnswer],
  );

  const reset = useCallback((): void => {
    if (submittedQuestionRef.current !== currentQuestionId) return;
    submittedQuestionRef.current = null;
    setState("idle");
    setLastError(null);
    setAcceptedAck(null);
    setSelectedOptionId(null);
  }, [currentQuestionId]);

  return {
    submit,
    state,
    lastError,
    submission: acceptedAck,
    selectedOptionId,
    canSubmit,
    reset,
  };
}
