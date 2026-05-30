/**
 * Attempts wrapper — wraps API calls for quiz attempts.
 * Uses the generated SDK from orval.
 */

import { getAttempts } from '@/lib/api/generated/attempts/attempts';
import type {
  StartAttemptDto,
  SubmitAnswerDto,
} from '@/lib/api/generated/schemas';

export type {
  AttemptControllerStartAttemptResult,
  AttemptControllerGetAttemptByIdResult,
  AttemptControllerSubmitAnswerResult,
  AttemptControllerAbandonAttemptResult,
  AttemptControllerCompleteAttemptResult,
  AttemptControllerListMyAttemptsResult,
} from '@/lib/api/generated/attempts/attempts';

export interface ListMyAttemptsParams {
  cursor?: string
  limit?: number
}

export async function startAttempt(quizId: string, params?: StartAttemptDto) {
  const sdk = getAttempts();
  return sdk.attemptControllerStartAttempt(quizId, params);
}

export async function getAttempt(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptById(attemptId);
}

export async function submitAnswer(
  attemptId: string,
  params: SubmitAnswerDto
) {
  const sdk = getAttempts();
  return sdk.attemptControllerSubmitAnswer(attemptId, params);
}

export async function abandonAttempt(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerAbandonAttempt(attemptId);
}

export async function completeAttempt(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerCompleteAttempt(attemptId);
}

export async function getMyAttempts(params?: ListMyAttemptsParams) {
  const sdk = getAttempts();
  return sdk.attemptControllerListMyAttempts(params);
}
