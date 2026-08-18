'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
completeAttempt as completeAttemptService,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
ATTEMPT_CACHE_KEYS,
} from '@/features/attempts/types/attempt-runner.types';
import {
ATTEMPT_RESULT_CACHE_KEYS,
} from '@/features/attempts/types/attempt-result.types';
import {
hydrateAttemptEntry,
} from '@/features/attempts/stores/useAttemptsStore';
import {
broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

import type {
CompleteAttemptResponseDto,
} from '@/lib/api/generated/schemas';

export interface UseCompleteAttemptParams {

attemptId: string | null;

quizVersionId: string | null;
}

export type CompleteAttemptOutcome =
| { kind: 'idle' }
  | { kind: 'completing' }
  | { kind: 'success'; result: CompleteAttemptResponseDto }
  | { kind: 'not_active' }
  | { kind: 'redirect'; target: '/quizzes'; error: ApiError }
  | { kind: 'validation'; error: ApiError }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseCompleteAttemptResult {

isPending: boolean;

isCoolingDown: boolean;

outcome: CompleteAttemptOutcome | null;

error: ApiError | null;

complete: () => Promise<CompleteAttemptOutcome>;

reset: () => void;
}

const DEFAULT_COOLDOWN_MS = 500;

function revalidateAttemptCaches(
attemptId: string,
quizVersionId: string,
sessionId: string,
): Promise<unknown>[] {
const promises: Promise<unknown>[] = [

globalMutate(ATTEMPT_CACHE_KEYS.active(quizVersionId, sessionId)),
globalMutate(ATTEMPT_CACHE_KEYS.detail(attemptId, sessionId)),
globalMutate(ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId)),

globalMutate(ATTEMPT_RESULT_CACHE_KEYS.result(attemptId, sessionId)),

globalMutate(
(key) =>
Array.isArray(key) &&
key[0] === 'attempts' &&
key[1] === 'history' &&
key[2] === sessionId,
undefined,
{ revalidate: true },
    ),

globalMutate(['attempts', 'history', 'stats', sessionId]),
  ];
return promises;
}

export function useCompleteAttempt(
params: UseCompleteAttemptParams,
): UseCompleteAttemptResult {
const { attemptId, quizVersionId } = params;

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const [outcome, setOutcome] = useState<CompleteAttemptOutcome | null>(null);
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

const complete = useCallback(async (): Promise<CompleteAttemptOutcome> => {

if (sessionId === null || attemptId === null || quizVersionId === null) {
return { kind: 'idle' };
    }

const now = Date.now();
if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
const dropped: CompleteAttemptOutcome = { kind: 'cooldown' };
setOutcome(dropped);
return dropped;
    }
lastInvocationRef.current = now;

setIsPending(true);
setError(null);
setOutcome({ kind: 'completing' });

try {
const result = await completeAttemptService(attemptId);

hydrateAttemptEntry(attemptId, quizVersionId, sessionId, {
error: null,
cooldownUntil: null,
      });

await Promise.all(
revalidateAttemptCaches(attemptId, quizVersionId, sessionId),
      ).catch(() => {
        // Best-effort: swallow so the broadcast still fires.
      });

broadcastAttemptsChanged({
userId: sessionId,
attemptId,
kind: 'complete',
      });

const successOutcome: CompleteAttemptOutcome = {
kind: 'success',
result,
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
isApiError(cause) &&
cause.code === 'ATTEMPT_NOT_ACTIVE' &&
(cause.status === 403 || cause.status === 409)
      ) {
await Promise.all(
revalidateAttemptCaches(attemptId, quizVersionId, sessionId),
        );
const swapped: CompleteAttemptOutcome = { kind: 'not_active' };
setOutcome(swapped);
setIsPending(false);
return swapped;
      }

if (
isApiError(cause) &&
(cause.code === 'ATTEMPT_NOT_FOUND' ||
cause.code === 'ATTEMPT_FORBIDDEN')
      ) {
setError(cause);
const redirect: CompleteAttemptOutcome = {
kind: 'redirect',
target: '/quizzes',
error: cause,
        };
setOutcome(redirect);
setIsPending(false);
return redirect;
      }

if (
isApiError(cause) &&
cause.code === 'ATTEMPT_VALIDATION_FAILED'
      ) {
setError(cause);
const validation: CompleteAttemptOutcome = {
kind: 'validation',
error: cause,
        };
setOutcome(validation);
setIsPending(false);
return validation;
      }

const apiError = isApiError(cause)
? cause
: new ApiError({ message: 'complete_attempt_failed', status: 0 });
setError(apiError);
const retryable: CompleteAttemptOutcome = {
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
  }, [sessionId, attemptId, quizVersionId]);

return {
isPending,
isCoolingDown,
outcome,
error,
complete,
reset,
  };
}