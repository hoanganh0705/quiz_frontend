/**
 * `attempt-runner.types.ts` — Story 4.14 AttemptRunner shared types and
 * deterministic SWR cache keys.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source tickets: T-4.14.2.
 *
 * ## Purpose
 *
 * Single source of truth for the runner-only types every Story 4.14
 * hook and component shares:
 *
 *   - `AttemptRunnerStatus` — the discriminated union the runner
 *     stores in its Zustand bag. Maps the backend's `started` status
 *     to the frontend's `in_progress` state (see `statusFromAttempt`
 *     below) so the runner state machine does not have to repeat the
 *     wire-to-domain translation in every component.
 *   - `AnswerSelection` — the controlled runner input for the
 *     answer picker. Discriminated by the verified player-DTO
 *     question kind.
 *   - `AttemptMutationOutcome` — typed outcome the mutation hooks
 *     return so the runner can switch exhaustively without inspecting
 *     raw `ApiError.code` values.
 *   - Cache key factories — deterministic SWR keys for the active
 *     attempt, attempt detail, and attempt answers reads. Cross-tab
 *     reconciliation (T-4.14.8) targets these keys.
 *
 * ## Player DTO invariant (Story 4.10)
 *
 * The types below never expose `isCorrect` or any other author-side
 * answer metadata. The active runner is a player surface and the
 * correctness flag is reserved for the post-attempt review endpoint.
 * The compiled type surface refuses to admit a `isCorrect` member so
 * any future edit that tried to leak the flag fails compilation.
 *
 * ## Reserved states
 *
 * `completing` / `completed` exist in the status union for the
 * Story 4.15 handoff. The Story 4.14 code paths MUST NOT introduce a
 * `completeAttempt` mutation hook — completion belongs to Story 4.15
 * where the runner's terminal completion screen is built.
 */

import type {
  AttemptResponseDto,
  AttemptAnswerItemDto,
  AttemptSummaryResponseDto,
  AttemptResponseDtoStatus,
  QuizQuestionPlayerDto,
  QuizAnswerOptionPlayerDto,
  SubmitAnswerDto,
} from '@/lib/api/generated/schemas';

/**
 * Discriminated question kind the answer picker drives off.
 *
 * The Story 4.10 player DTO does not currently expose a
 * `questionType` field, so the runner derives the kind from the
 * verified `answerOptions` cardinality:
 *
 *   - `0–2 options` → `'true_false'`. The option whose `value` matches
 *     `"true"` or `"false"` (case-insensitive) becomes the canonical
 *     `"true"` identifier; the other becomes `"false"`.
 *   - `≥3 options` → `'multiple_choice'`. The selected
 *     `optionId` values map directly to the `SubmitAnswerDto`'s
 *     `selectedOptionId`.
 *
 * The derivation lives in `attempt-answer-validation.ts` (T-4.14.3);
 * this file only declares the union. When the backend grows a
 * `questionType` discriminator this union is the single site to
 * widen.
 */
export type AttemptQuestionKind = 'multiple_choice' | 'true_false';

/**
 * Controlled runner input for the answer picker.
 *
 * Discriminated by `kind` so `switch` statements are exhaustive at
 * compile time. Every branch resolves to the same `SubmitAnswerDto`
 * shape via the validation adapter (T-4.14.3).
 */
export type AnswerSelection =
  | {
      kind: 'multiple_choice';
      questionId: string;
      selectedOptionIds: readonly string[];
    }
  | {
      kind: 'true_false';
      questionId: string;
      /** Canonical boolean value; the adapter maps it to the verified option. */
      value: boolean;
    };

/**
 * Runner-only status machine.
 *
 * Wire-to-domain mapping:
 *
 *   - `started` (backend)        → `in_progress` (frontend)
 *   - `completed` (backend)      → `completed` (frontend; reserved for 4.15)
 *   - `abandoned` (backend)      → `abandoned` (frontend)
 *   - (no wire)                  → `idle`, `starting`, `submitting`,
 *                                  `completing`, `abandoning`, `error`
 *
 * `completing` / `completed` are reserved for the Story 4.15
 * handoff. Story 4.14 code paths can read them but never write them.
 */
export type AttemptRunnerStatus =
  | 'idle'
  | 'starting'
  | 'in_progress'
  | 'submitting'
  | 'completing'
  | 'abandoning'
  | 'completed'
  | 'abandoned'
  | 'error';

/**
 * Typed outcome the Story 4.14 mutation hooks return.
 *
 * Discriminated by `kind` so consumers can switch exhaustively and
 * do not have to branch on raw `ApiError.code`. The runner projects
 * each branch into its `AttemptRunnerStatus` and toast surface.
 */
export type AttemptMutationOutcome =
  | { kind: 'success'; attemptId: string }
  | { kind: 'invalid'; field: 'questionId' | 'selection'; reason: string }
  | { kind: 'retryable'; error: import('@/lib/api').ApiError }
  | { kind: 'terminal'; error: import('@/lib/api').ApiError };

/**
 * Canonical question-to-submitted-answer projection.
 *
 * The runner hydrates this map from `attemptControllerGetAttemptAnswers`
 * (T-4.14.1 / T-4.14.6) and uses it as the authoritative lock set the
 * picker consults before allowing a selection to be submitted.
 */
export type SubmittedAnswersMap = Readonly<Record<string, AttemptAnswerItemDto>>;

/**
 * Player view of a single question, narrowed to the fields the
 * runner renders.
 *
 * Re-uses the verified `QuizQuestionPlayerDto` so the runner cannot
 * drift from the player-DTO invariant. The `kind` discriminator is
 * derived (see `AttemptQuestionKind`); the `correctOptionId` /
 * `isCorrect` fields are intentionally absent.
 */
export type RunnerQuestion = QuizQuestionPlayerDto & {
  kind: AttemptQuestionKind;
};

/**
 * Player view of a single answer option, narrowed to the fields the
 * runner renders. The `isCorrect` field is intentionally absent.
 */
export type RunnerAnswerOption = QuizAnswerOptionPlayerDto;

/**
 * Map the backend's `AttemptResponseDtoStatus` to the runner's
 * `AttemptRunnerStatus`.
 *
 * Backend `started` → frontend `in_progress`. Backend `completed` →
 * frontend `completed`. Backend `abandoned` → frontend `abandoned`.
 *
 * The runner's transient states (`idle`, `starting`, `submitting`,
 * `completing`, `abandoning`, `error`) are written by the runner
 * itself; this helper only normalises a server-derived projection.
 */
export function statusFromAttempt(
  status: AttemptResponseDtoStatus,
): AttemptRunnerStatus {
  switch (status) {
    case 'started':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'abandoned':
      return 'abandoned';
  }
}

/**
 * Map an attempt summary's wire status to the runner status.
 *
 * The summary DTO uses the same status union as the detail DTO, so
 * this helper simply re-uses `statusFromAttempt`.
 */
export function statusFromAttemptSummary(
  summary: AttemptSummaryResponseDto,
): AttemptRunnerStatus {
  return statusFromAttempt(summary.status);
}

/**
 * Companion hook return shape for the active-attempt hook
 * (T-4.14.5). Encodes the three legal terminal states of the active
 * attempt lookup:
 *
 *   - `null` — the user has no in-progress attempt for this quiz.
 *   - a `AttemptSummaryResponseDto` — the user has exactly one
 *     in-progress attempt; the runner should offer Continue.
 *   - undefined / explicit error — see `error` and `isLoading`.
 */
export interface ActiveAttemptView {
  /** The active attempt, or `null` when none exists. Never `undefined` once the first fetch resolves. */
  attempt: AttemptSummaryResponseDto | null;
  /** True only while the first fetch is in flight. */
  isLoading: boolean;
  /** Typed error for retryable / terminal failures; `null` otherwise. */
  error: import('@/lib/api').ApiError | null;
  /** Manual revalidation for the same key. */
  retry: () => Promise<void>;
}

/**
 * Companion hook return shape for the hydration hook (T-4.14.6).
 *
 * Encodes the two server-confirmed projections the runner needs
 * after a reload or remote-tab reconciliation:
 *
 *   - `detail` — the canonical attempt detail.
 *   - `submittedAnswers` — the question-to-answer lock set the
 *     picker consults.
 *
 * `hasResolved` is true once the first fetch settles (success or
 * error) so the runner does not flash open before the first paint.
 */
export interface AttemptHydrationView {
  detail: AttemptResponseDto | null;
  submittedAnswers: SubmittedAnswersMap;
  isLoading: boolean;
  hasResolved: boolean;
  error: import('@/lib/api').ApiError | null;
  refresh: () => Promise<void>;
}

/**
 * SWR cache keys for the Story 4.14 reads.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are
 * safe to call inside `useMemo` and `useEffect` dependency arrays.
 */
export const ATTEMPT_CACHE_KEYS = {
  /**
   * SWR key for the active-attempt lookup (`useActiveAttempt`).
   * Scoped by the authenticated user and the published quiz id so a
   * tab swap or quiz change invalidates the cached entry.
   */
  active(quizId: string, sessionId: string) {
    return ['attempts', 'active', sessionId, quizId] as const;
  },

  /**
   * SWR key for the canonical attempt-detail read (`useAttemptHydration`).
   * Scoped by the authenticated user and the attempt id.
   */
  detail(attemptId: string, sessionId: string) {
    return ['attempts', 'detail', sessionId, attemptId] as const;
  },

  /**
   * SWR key for the submitted-answers read (`useAttemptHydration`).
   * Same identity shape as `detail` so cross-tab reconciliation can
   * revalidate both with a single `mutate([...])` call.
   */
  answers(attemptId: string, sessionId: string) {
    return ['attempts', 'answers', sessionId, attemptId] as const;
  },
} as const;

/**
 * Verified shape of a successful submit payload for the runner's
 * answer-validation adapter (T-4.14.3). Re-exported so the adapter
 * can constrain its output without depending on the SDK directly.
 */
export type VerifiedSubmitAnswerPayload = SubmitAnswerDto;