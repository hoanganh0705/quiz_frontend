'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
startAttempt,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
ATTEMPT_CACHE_KEYS,
type AttemptRunnerStatus,
} from '@/features/attempts/types/attempt-runner.types';
import {
hydrateAttemptEntry,
setAttemptStatus,
} from '@/features/attempts/stores/useAttemptsStore';
import {
broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

import type { StartAttemptDto } from '@/lib/api/generated/schemas';

export interface UseStartAttemptParams {

quizId: string | null;

quizVersionId?: string | null;

payload?: StartAttemptDto;
}

export type StartAttemptOutcome =
| { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'success'; attemptId: string }
  | { kind: 'already_started'; attemptId: string | null }
  | { kind: 'quiz_unpublished' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseStartAttemptResult {

isPending: boolean;

isCoolingDown: boolean;

outcome: StartAttemptOutcome | null;

error: ApiError | null;

start: () => Promise<StartAttemptOutcome>;

reset: () => void;
}

const DEFAULT_COOLDOWN_MS = 500;

export function useStartAttempt(
params: UseStartAttemptParams,
): UseStartAttemptResult {
const { quizId, quizVersionId, payload } = params;

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const [outcome, setOutcome] = useState<StartAttemptOutcome | null>(null);
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

const start = useCallback(async (): Promise<StartAttemptOutcome> => {

if (sessionId === null || quizId === null) {
return { kind: 'idle' };
    }

const now = Date.now();
if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
const dropped: StartAttemptOutcome = { kind: 'cooldown' };
setOutcome(dropped);
return dropped;
    }
lastInvocationRef.current = now;

setIsPending(true);
setError(null);
setOutcome({ kind: 'starting' });

let resultAttemptId: string | null = null;

try {
const wire = (await startAttempt(
quizId,
payload ?? {},
      )) as unknown as { data?: { attemptId?: string } };
resultAttemptId = wire?.data?.attemptId ?? null;

if (resultAttemptId !== null) {
const status: AttemptRunnerStatus = 'in_progress';
const reverseIndexKey = quizVersionId ?? quizId;
setAttemptStatus(
resultAttemptId,
reverseIndexKey,
sessionId,
status,
        );
hydrateAttemptEntry(resultAttemptId, reverseIndexKey, sessionId, { status });
      }

await globalMutate(ATTEMPT_CACHE_KEYS.active(quizId, sessionId));

if (resultAttemptId !== null) {
broadcastAttemptsChanged({
userId: sessionId,
attemptId: resultAttemptId,
kind: 'start',
        });
      }

const successOutcome: StartAttemptOutcome = {
kind: 'success',
attemptId: resultAttemptId ?? '',
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

if (isApiError(cause) && cause.status === 409) {
await globalMutate(ATTEMPT_CACHE_KEYS.active(quizId, sessionId));
const concurrent: StartAttemptOutcome = {
kind: 'already_started',
attemptId: null,
        };
setOutcome(concurrent);
setIsPending(false);
return concurrent;
      }

if (isApiError(cause) && cause.status === 422) {
const blocked: StartAttemptOutcome = { kind: 'quiz_unpublished' };
setOutcome(blocked);
setIsPending(false);
return blocked;
      }

const apiError = isApiError(cause)
? cause
: new ApiError({ message: 'start_attempt_failed', status: 0 });
setError(apiError);
const retryable: StartAttemptOutcome = {
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
  }, [sessionId, quizId, quizVersionId, payload]);

return {
isPending,
isCoolingDown,
outcome,
error,
start,
reset,
  };
}