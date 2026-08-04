/**
 * `attempt-result.types.ts` — Story 4.15 attempt-result types and
 * deterministic SWR cache keys.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.2.
 *
 * ## Purpose
 *
 * Single source of truth for the result-page types every Story 4.15
 * hook and component shares:
 *
 *   - `AttemptResultDto` — feature-level alias for the verified
 *     completed-attempt review projection (`AttemptReviewResponseDto`).
 *     The result page and detail page read quiz identity, score,
 *     per-question debrief, and feedback text from this shape without
 *     inspecting the wire envelope.
 *   - `AttemptScoreSummaryDto` — the headline-score projection
 *     (correct count, percent, completion timestamp, quiz identity).
 *   - `AttemptQuestionScoreDto` — the per-question projection
 *     (question id, kind, score, optional correct-answer key, and
 *     feedback text). Mirrors the verified `AttemptReviewQuestionDto`
 *     shape so the breakdown component never has to duplicate backend
 *     DTO fields.
 *   - Cache-key factories — deterministic SWR keys for the
 *     `useAttemptResult` hook (T-4.15.6) and the result-page
 *     revalidation that follows a successful `useCompleteAttempt`
 *     call (T-4.15.5).
 *
 * ## Player DTO invariant (Story 4.10)
 *
 * The types below extend the verified generated review DTO; they
 * never redefine `isCorrect` / `correctAnswer` fields. The
 * `correctOptionIds` field is a feature-level alias of the
 * backend-provided correct-answer key (master plan line 336) so the
 * result page can render the correct-answer key per backend
 * convention. Components consume only the verified projection.
 */

import type {
  AttemptReviewResponseDto,
  AttemptReviewQuestionDto,
} from '@/lib/api/generated/schemas';

// ─── Projections ──────────────────────────────────────────────────────────

/**
 * Feature-level alias for the completed-attempt review projection.
 *
 * Re-exports the verified `AttemptReviewResponseDto` so hooks and
 * components read the canonical projection directly without
 * re-declaring backend fields.
 */
export type AttemptResultDto = AttemptReviewResponseDto;

/**
 * Per-question review projection.
 *
 * Mirrors the verified `AttemptReviewQuestionDto` so the breakdown
 * component never re-declares backend fields. The component projects
 * each row to the UI shape (correct / incorrect / partial marker,
 * score value, optional correct-answer key, feedback text).
 */
export type AttemptQuestionScoreDto = AttemptReviewQuestionDto;

/**
 * Headline-score projection consumed by `AttemptScoreHero` (T-4.15.8).
 *
 * Sourced exclusively from the verified `AttemptResultDto` so the
 * hero block cannot drift from the server projection.
 */
export interface AttemptScoreSummaryDto {
  /** Attempt identifier. */
  attemptId: string;
  /** Quiz identifier. */
  quizId: string;
  /** Quiz title (server-provided, no client-side inference). */
  quizTitle: string;
  /** Quiz slug. */
  quizSlug: string;
  /** Total questions in the quiz version. */
  totalQuestions: number;
  /** Number of correctly answered questions. `null` when not yet scored. */
  correctCount: number | null;
  /** Final score percent (0–100). `null` when not yet scored. */
  scorePercent: number | null;
  /** Total XP earned. */
  xpEarned: number;
  /** Completion timestamp (ISO 8601). */
  finishedAt: string;
}

/**
 * Project the verified review DTO down to the headline-score shape
 * `AttemptScoreHero` renders.
 *
 * Pure derivation — no client-side scoring, no `isCorrect` import.
 * The optional fields stay `null` so the hero can render the
 * "score pending" fallback when the backend has not yet scored the
 * attempt.
 */
export function scoreSummaryFromResult(
  result: AttemptResultDto,
): AttemptScoreSummaryDto {
  return {
    attemptId: result.attemptId,
    quizId: result.quizId,
    quizTitle: result.quizTitle,
    quizSlug: result.quizSlug,
    totalQuestions: result.totalQuestions,
    correctCount: result.correctCount ?? null,
    scorePercent: result.scorePercent ?? null,
    xpEarned: result.xpEarned,
    finishedAt: result.finishedAt,
  };
}

// ─── SWR cache keys ──────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 4.15 reads.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are
 * safe to call inside `useMemo` and `useEffect` dependency arrays.
 */
export const ATTEMPT_RESULT_CACHE_KEYS = {
  /**
   * SWR key for the canonical attempt-result read (`useAttemptResult`).
   * Scoped by the authenticated user and the attempt id so a tab swap
   * or attempt change invalidates the cached entry.
   */
  result(attemptId: string, sessionId: string) {
    return ['attempts', 'result', sessionId, attemptId] as const;
  },
} as const;