'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
submitAnswer,
} from '@/features/attempts/services/attempts.service';
import {
validateAndBuildSubmitPayload,
} from '@/features/attempts/lib/attempt-answer-validation';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
ATTEMPT_CACHE_KEYS,
type AnswerSelection,
type AttemptRunnerStatus,
} from '@/features/attempts/types/attempt-runner.types';
import {
beginSubmit,
recordMutationFailure,
recordSubmitSuccess,
} from '@/features/attempts/stores/useAttemptsStore';
import {
broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

export interface UseSubmitAnswerParams {

attemptId: string | null;

quizVersionId: string | null;
}

export type SubmitAnswerOutcome =
| { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; questionId: string; submittedAt: string }
  | { kind: 'invalid'; field: 'questionId' | 'selection'; reason: string }
  | { kind: 'already_answered' }
  | { kind: 'question_invalid' }
  | { kind: 'forbidden' }
  | { kind: 'not_active' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseSubmitAnswerResult {

isPending: boolean;

isCoolingDown: boolean;

outcome: SubmitAnswerOutcome | null;

error: ApiError | null;

submit: (
question: QuizQuestionPlayerDto,
selection: AnswerSelection,
timeTakenMs?: number | null,
  ) => Promise<SubmitAnswerOutcome>;

reset: () => void;
}

const DEFAULT_COOLDOWN_MS = 500;

export function useSubmitAnswer(
params: UseSubmitAnswerParams,
): UseSubmitAnswerResult {
const { attemptId, quizVersionId } = params;

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const [outcome, setOutcome] = useState<SubmitAnswerOutcome | null>(null);
const [error, setError] = useState<ApiError | null>(null);
const [isPending, setIsPending] = useState<boolean>(false);
const [isCoolingDown, setIsCoolingDown] = useState<boolean>(false);

const lastInvocationRef = useRef<number>(0);
const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const reset = useCallback(() => {
setOutcome(null);
setError(null);
setIsPending(false);
setIsCoolingDown(false);
  }, []);

const submit = useCallback(
async (
question: QuizQuestionPlayerDto,
selection: AnswerSelection,
timeTakenMs?: number | null,
    ): Promise<SubmitAnswerOutcome> => {
if (
sessionId === null
|| attemptId === null
|| quizVersionId === null
      ) {
return { kind: 'idle' };
      }

const now = Date.now();
if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
const dropped: SubmitAnswerOutcome = { kind: 'cooldown' };
setOutcome(dropped);
return dropped;
      }
lastInvocationRef.current = now;

const validation = validateAndBuildSubmitPayload(
question,
selection,
timeTakenMs,
      );
if (validation.kind === 'invalid') {
const invalidOutcome: SubmitAnswerOutcome = {
kind: 'invalid',
field: validation.field,
reason: validation.reason,
        };
setOutcome(invalidOutcome);
return invalidOutcome;
      }
if (validation.kind === 'blocked') {
const blockedOutcome: SubmitAnswerOutcome = {
kind: 'question_invalid',
        };
setOutcome(blockedOutcome);
return blockedOutcome;
      }

setIsPending(true);
setError(null);
setOutcome({ kind: 'submitting' });
beginSubmit(attemptId, quizVersionId, sessionId, DEFAULT_COOLDOWN_MS);

try {
const wire = (await submitAnswer(attemptId, validation.payload)) as unknown as {
data?: { questionId?: string; submittedAt?: string };
        };
const submittedAt = wire?.data?.submittedAt ?? new Date().toISOString();
const questionId = wire?.data?.questionId ?? selection.questionId;

recordSubmitSuccess(attemptId, quizVersionId, sessionId, {
questionId,
submittedAt,
        } as never);

await globalMutate(
ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
        );

broadcastAttemptsChanged({
userId: sessionId,
attemptId,
kind: 'submit',
        });

const successOutcome: SubmitAnswerOutcome = {
kind: 'success',
questionId,
submittedAt,
        };
setOutcome(successOutcome);
setIsPending(false);
setIsCoolingDown(true);
if (cooldownTimerRef.current !== null) {
clearTimeout(cooldownTimerRef.current);
        }
cooldownTimerRef.current = setTimeout(() => {
setIsCoolingDown(false);
        }, DEFAULT_COOLDOWN_MS);
return successOutcome;
      } catch (cause: unknown) {

if (
isApiError(cause)
&& cause.status === 409
&& cause.code === 'ATTEMPT_QUESTION_ALREADY_ANSWERED'
        ) {
await globalMutate(
ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
          );
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
cause,
'in_progress',
          );
const dupOutcome: SubmitAnswerOutcome = {
kind: 'already_answered',
          };
setOutcome(dupOutcome);
setIsPending(false);
return dupOutcome;
        }

if (
isApiError(cause)
&& cause.status === 409
&& cause.code === 'ATTEMPT_NOT_ACTIVE'
        ) {
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
cause,
'in_progress',
          );
const notActiveOutcome: SubmitAnswerOutcome = {
kind: 'not_active',
          };
setOutcome(notActiveOutcome);
setIsPending(false);
return notActiveOutcome;
        }

if (
isApiError(cause)
&& (cause.status === 422 || cause.status === 400)
&& cause.code === 'ATTEMPT_QUESTION_INVALID'
        ) {
const blockedOutcome: SubmitAnswerOutcome = {
kind: 'question_invalid',
          };
setOutcome(blockedOutcome);
setIsPending(false);
return blockedOutcome;
        }

if (isApiError(cause) && cause.status === 403) {
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
cause,
'in_progress',
          );
const forbiddenOutcome: SubmitAnswerOutcome = {
kind: 'forbidden',
          };
setOutcome(forbiddenOutcome);
setIsPending(false);
return forbiddenOutcome;
        }

const apiError = isApiError(cause)
? cause
: new ApiError({ message: 'submit_answer_failed', status: 0 });
setError(apiError);
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
apiError,
'in_progress',
        );
const retryable: SubmitAnswerOutcome = {
kind: 'retryable',
error: apiError,
        };
setOutcome(retryable);
setIsPending(false);
setIsCoolingDown(true);
if (cooldownTimerRef.current !== null) {
clearTimeout(cooldownTimerRef.current);
        }
cooldownTimerRef.current = setTimeout(() => {
setIsCoolingDown(false);
        }, DEFAULT_COOLDOWN_MS);
return retryable;
      }
    },
[sessionId, attemptId, quizVersionId],
  );

void ({} as AttemptRunnerStatus);

return {
isPending,
isCoolingDown,
outcome,
error,
submit,
reset,
  };
}