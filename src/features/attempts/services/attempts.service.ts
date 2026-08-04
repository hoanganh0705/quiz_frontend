/**
 * `attempts.service.ts` — Phase 4 attempt write-path service.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.F5.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source tickets: T-4.14.1.
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
 *   - `ATTEMPT_VALIDATION_FAILED`       — submit payload validation.
 *
 * These surface through the `ApiError.code` thrown from the service.
 *
 * ## Story 4.14 additions (T-4.14.1)
 *
 * Two helpers are added without breaking the existing surface:
 *
 *   - `getActiveAttempt(quizId)` resolves to either an
 *     `AttemptSummaryResponseDto` for the caller's only `started`
 *     attempt on this published quiz, or `null` when the user has no
 *     active attempt (empty page or 404 from
 *     `attemptControllerListMyAttempts`). The wrapper is the canonical
 *     hook-level input to the runner's start-or-resume decision and
 *     replaces the historical "filter history client-side" path that
 *     could leak abandoned / completed attempts as Continue.
 *   - `getAttemptAnswers(attemptId)` already existed but its return
 *     shape is now narrowed to `AttemptAnswersResponseDto` (the
 *     generated DTO that owns the canonical `answers: AttemptAnswerItemDto[]`
 *     projection the runner hydrates against).
 *
 * The active-attempt lookup is intentionally implemented via the
 * generated `attemptControllerListMyAttempts({ quizId, status: 'started', limit: 1 })`
 * endpoint because the deployed OpenAPI does not expose a dedicated
 * `getActiveAttempt` controller. The wrapper is the only place that
 * owns the empty-page / 404 normalisation — hooks must never inspect
 * the wire envelope directly.
 *
 * ## Cross-tab broadcasts
 *
 * `startAttempt`, `submitAnswer`, `withdrawAnswer`, and `abandonAttempt`
 * are the cross-tab invalidation sources the per-feature mutation
 * hooks (story 4.14) emit on success. The hook layer (TKT-4.1.E2 /
 * T-4.14.8) owns the actual broadcast call; the service is the typed
 * pass-through to the SDK.
 *
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see attempts-broadcast-channel — the cross-tab channel.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
 */

import { ApiError, getAttempts } from '@/lib/api';

import type {
  StartAttemptDto,
  SubmitAnswerDto,
  AttemptSummaryResponseDto,
  AttemptAnswersResponseDto,
  AttemptControllerListMyAttemptsParams,
} from '@/lib/api/generated/schemas';

import type {
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

/**
 * Feature-level argument type for `listMyAttempts`.
 *
 * The generated `AttemptControllerListMyAttemptsParams` already
 * supports the status, quizId, limit, and cursor filters the
 * Story 4.13 eligibility check (T-4.13.6) and the Story 4.14 active
 * lookup (T-4.14.1) need. Aliasing the SDK type keeps the wire
 * contract single-sourced while still exposing a stable
 * feature-level name to consumers.
 */
export type ListMyAttemptsParams = AttemptControllerListMyAttemptsParams;

/**
 * Feature-level alias for an attempt-detail projection.
 *
 * Unwraps the generated `WrappedDto<AttemptResponseDto>` envelope to
 * the canonical `AttemptResponseDto` shape so hooks can read
 * `attemptId` / `status` / `answers` without double-destructuring.
 */
export type AttemptDto = AttemptControllerGetAttemptByIdResult;

/**
 * Feature-level alias for a single submitted answer projection as
 * returned by `attemptControllerGetAttemptAnswers`. The alias mirrors
 * the generated `WrappedDto<AttemptAnswersResponseDto>` envelope
 * (the `AttemptControllerGetAttemptAnswersResult` shape) so hooks
 * can iterate `result.data?.answers` without inspecting the
 * envelope.
 */
export type AttemptAnswersDto = AttemptControllerGetAttemptAnswersResult;

/**
 * Feature-level alias for the abandon-attempt result.
 *
 * Unwraps the generated `WrappedDto<AbandonAttemptResponseDto>`
 * envelope to the canonical `AbandonAttemptResponseDto` shape so
 * hooks can read the terminal `status: 'abandoned'` projection.
 */
export type AbandonAttemptDto = AttemptControllerAbandonAttemptResult;

/**
 * Feature-level alias for the submit-answer result.
 *
 * Unwraps the generated `WrappedDto<SubmitAnswerResponseDto>` envelope
 * to the canonical `SubmitAnswerResponseDto` shape so hooks can
 * project the new answer record into the runner's submitted-lock set.
 */
export type SubmitAnswerResultDto = AttemptControllerSubmitAnswerResult;

/**
 * Feature-level alias for the withdraw-answer result.
 *
 * Unwraps the generated `WrappedDto<WithdrawAnswerResponseDto>`
 * envelope to the canonical `WithdrawAnswerResponseDto` shape so
 * hooks can drop the corresponding question from the submitted-lock
 * set without inspecting the envelope.
 */
export type WithdrawAnswerResultDto = AttemptControllerWithdrawAnswerResult;

// ─── Attempt lifecycle ──────────────────────────────────────────────────

export async function startAttempt(quizId: string, payload: StartAttemptDto) {
  const sdk = getAttempts();
  return sdk.attemptControllerStartAttempt(quizId, payload);
}

export async function getAttempt(attemptId: string): Promise<AttemptDto> {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptById(attemptId);
}

export async function submitAnswer(
  attemptId: string,
  payload: SubmitAnswerDto,
): Promise<SubmitAnswerResultDto> {
  const sdk = getAttempts();
  return sdk.attemptControllerSubmitAnswer(attemptId, payload);
}

export async function withdrawAnswer(
  attemptId: string,
  questionId: string,
): Promise<WithdrawAnswerResultDto> {
  const sdk = getAttempts();
  return sdk.attemptControllerWithdrawAnswer(attemptId, questionId);
}

export async function abandonAttempt(
  attemptId: string,
): Promise<AbandonAttemptDto> {
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

/**
 * Fetch every submitted answer for the given attempt.
 *
 * Returns the wrapped envelope (`{ data?: AttemptAnswersResponseDto }`)
 * — the alias is `AttemptAnswersDto`. The runner hydrates
 * `result.data?.answers` into its `Record<questionId, AttemptAnswerItemDto>`
 * lock map. All errors propagate as typed `ApiError`; the hook layer
 * is responsible for the 404 / 403 branching.
 */
export async function getAttemptAnswers(
  attemptId: string,
): Promise<AttemptAnswersDto> {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptAnswers(attemptId);
}

export async function getAttemptAnalytics(attemptId: string) {
  const sdk = getAttempts();
  return sdk.attemptControllerGetAttemptAnalytics(attemptId);
}

// ─── Story 4.14 active-attempt lookup (T-4.14.1) ────────────────────────

/**
 * Wire envelope returned by `attemptControllerListMyAttempts` (post-unwrap).
 *
 * The runner never inspects this shape directly; the helper below is
 * the only place that reads `data` to find the caller's sole
 * `started` attempt for the given quiz.
 */
type ListMyAttemptsWireResponse = AttemptControllerListMyAttemptsResult & {
  data?: AttemptSummaryResponseDto[];
};

/**
 * Resolve the caller's active (`status: 'started'`) attempt for the
 * given quiz, or `null` when the user has no in-progress attempt.
 *
 * ## Why this exists
 *
 * The deployed OpenAPI exposes `attemptControllerListMyAttempts` with
 * a `status` filter but does not yet expose a dedicated
 * `getActiveAttempt(quizId)` endpoint. The helper is the canonical
 * hook-level input to the runner's start-or-resume decision; it
 * replaces the historical "filter history client-side" path that
 * could leak abandoned / completed attempts as Continue.
 *
 * ## No-active resolution
 *
 * The helper resolves to `null` when:
 *
 *   - the response body has zero matching summaries (an empty page
 *     for the `quizId + status: 'started' + limit: 1` filter), or
 *   - the service returns HTTP 404 (the backend omits the user-attempt
 *     row entirely when the user has no attempts at all), or
 *   - the response envelope is missing the `data` field (defensive).
 *
 * All other failures — 401 (token expired), 403 (cross-user access),
 * 429 (rate-limit), 5xx — propagate as typed `ApiError` so the hook
 * layer can map them to the start CTA's error branch.
 *
 * ## Authentication
 *
 * The list endpoint requires an authenticated user; the helper does
 * NOT enforce auth itself — the caller (the `useActiveAttempt` hook)
 * gates the call on `useAuthBootstrap` per the cross-story contract
 * rule.
 *
 * @param quizId Quiz identifier for the active-attempt lookup. Must be a
 *               non-empty UUID; the helper forwards the value verbatim
 *               to `attemptControllerListMyAttempts`.
 */
export async function getActiveAttempt(
  quizId: string,
): Promise<AttemptSummaryResponseDto | null> {
  const sdk = getAttempts();
  try {
    const wire = (await sdk.attemptControllerListMyAttempts({
      quizId,
      status: 'started',
      limit: 1,
    })) as unknown as ListMyAttemptsWireResponse;
    const items = wire.data ?? [];
    return items[0] ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

// ─── Re-exported SDK result aliases (locked surface for hooks) ───────────

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
};