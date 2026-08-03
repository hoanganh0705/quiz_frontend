/**
 * `attempts.service.ts` — Phase 4 attempt write-path service.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.F5.
 *
 * The single import surface for every Phase 4 attempt lifecycle
 * mutation consumed by stories 4.11 / 4.14 / 4.15 (AttemptRunner,
 * the question-answer flow, submit-and-complete). This is the
 * highest-stakes service because AttemptRunner consumes every
 * function and uses the cross-tab `attempts/changed` envelope.
 *
 * ## SDK drift (TKT-4.1.A1)
 *
 * The SDK regenerates as `attemptController*` (singular prefix). This
 * service uses the planning-intent names per master plan lines
 * 309–312. No drift in the function shape; only in the prefix.
 *
 * ## Code exposure (master plan / cross-story contract rule)
 *
 * The attempt mutations may surface:
 *
 *   - `ATTEMPT_ALREADY_STARTED` (409)   — quiz already has an
 *                                         in-progress attempt for the
 *                                         user. `startAttempt` only.
 *   - `ATTEMPT_NOT_ACTIVE`              — submit/withdraw on a
 *                                         completed / abandoned / not-
 *                                         yet-started attempt.
 *   - `ATTEMPT_QUIZ_NOT_PUBLISHED`      — start on a non-published
 *                                         quiz version.
 *   - `ATTEMPT_QUESTION_INVALID`        — submit answer for a question
 *                                         not in this attempt.
 *   - `ATTEMPT_NOT_COMPLETED`           — review fetch on a still-
 *                                         active attempt.
 *   - `ATTEMPT_FORBIDDEN`               — cross-user attempt access.
 *
 * These surface through the `ApiError.code` thrown from the service.
 *
 * ## Cross-tab broadcasts
 *
 * `startAttempt` and `completeAttempt` are the cross-tab invalidation
 * sources the per-feature mutation hooks (story 4.14) emit on
 * success. The hook layer (TKT-4.1.E2) owns the actual broadcast call;
 * the service is the typed pass-through to the SDK.
 *
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see attempts-broadcast-channel — the cross-tab channel.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
 */

import { getAttempts } from '@/lib/api';

import type {
  StartAttemptDto,
  SubmitAnswerDto,
} from '@/lib/api/generated/schemas';

export type {
  AttemptControllerStartAttemptResult,
  AttemptControllerGetAttemptByIdResult,
  AttemptControllerSubmitAnswerResult,
  AttemptControllerGetAttemptAnswersResult,
  AttemptControllerWithdrawAnswerResult,
  AttemptControllerAbandonAttemptResult,
  AttemptControllerCompleteAttemptResult,
  AttemptControllerListMyAttemptsResult,
  AttemptControllerGetMyAttemptStatsResult,
  AttemptControllerGetAttemptAnalyticsResult,
  AttemptControllerGetAttemptReviewResult,
} from '@/lib/api/generated/attempts/attempts';

export interface ListMyAttemptsParams {
  cursor?: string;
  limit?: number;
}

// ─── Attempt lifecycle ──────────────────────────────────────────────────

export async function startAttempt(quizId: string, payload: StartAttemptDto) {
  const sdk = getAttempts();
  return sdk.attemptControllerStartAttempt(quizId, payload);
}

export async function getAttempt(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptById(attemptId);
}

export async function submitAnswer(
  attemptId: string,
  payload: SubmitAnswerDto,
) {
  const sdk = getAttempts();
  return sdk.attemptControllerSubmitAnswer(attemptId, payload);
}

export async function withdrawAnswer(attemptId: string, questionId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerWithdrawAnswer(attemptId, questionId);
}

export async function abandonAttempt(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerAbandonAttempt(attemptId);
}

export async function completeAttempt(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerCompleteAttempt(attemptId);
}

export async function listMyAttempts(params?: ListMyAttemptsParams) {
  const sdk = getAttempts();
  return sdk.attemptControllerListMyAttempts(params);
}

export async function getMyAttemptStats() {
  const sdk = getAttempts();
  return sdk.attemptControllerGetMyAttemptStats();
}

export async function getAttemptReview(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptReview(attemptId);
}

export async function getAttemptAnswers(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptAnswers(attemptId);
}

export async function getAttemptAnalytics(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptAnalytics(attemptId);
}