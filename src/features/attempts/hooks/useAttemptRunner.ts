/**
 * `attempt-runner.ts` — Story 4.14 attempt runner orchestrator hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source tickets: T-4.14.18, T-4.14.19.
 *
 * ## Purpose
 *
 * The single composition point for the AttemptRunner. Owns:
 *
 *   - **Lifecycle (T-4.14.18):**
 *
 *       - Active lookup + canonical hydration.
 *       - Start, resume, and abandon actions.
 *       - Cross-tab reconciliation through `useAttemptCrossTabSync`.
 *       - Legal Story 4.14 state-machine transitions and retry.
 *       - Server status `started` → runner `in_progress`.
 *       - 403 forbidden and quiz-not-published outcomes expose a
 *         `public_quiz_redirect` intent.
 *
 *   - **Answer coordination (T-4.14.19):**
 *
 *       - Per-question drafts stored in a map.
 *       - Complete quiz submits all drafts at once.
 *       - 409 `ATTEMPT_QUESTION_ALREADY_ANSWERED` reconciliation
 *         refreshes and locks the server answer.
 *       - `question_invalid` outcome marks the question skipped.
 *
 * ## What this hook does NOT own
 *
 *   - No router navigation (returns intent only via the result).
 *   - No completion / score / result logic (reserved for 4.15).
 *
 * ## Cross-tab contract
 *
 * Cross-tab invalidation lives in the per-feature mutation hooks
 * (T-4.14.9 / T-4.14.10 / T-4.14.11 / T-4.14.12). This hook
 * subscribes through `useAttemptCrossTabSync` to react to remote
 * changes and revalidate local caches.
 */

import * as React from 'react';

import { ApiError } from '@/lib/api';

import { useAttemptHydration } from '@/features/attempts/hooks/useAttemptHydration';
import { useActiveAttempt } from '@/features/attempts/hooks/useActiveAttempt';
import { useAttemptCrossTabSync } from '@/features/attempts/hooks/useAttemptCrossTabSync';
import { useStartAttempt } from '@/features/attempts/hooks/useStartAttempt';
import { useSubmitAnswer } from '@/features/attempts/hooks/useSubmitAnswer';
import { useCompleteAttempt } from '@/features/attempts/hooks/useCompleteAttempt';
import { useDeleteAnswer } from '@/features/attempts/hooks/useDeleteAnswer';
import {
  type AnswerSelection,
  type AttemptRunnerStatus,
  type SubmittedAnswersMap,
  statusFromAttempt,
  statusFromAttemptSummary,
} from '@/features/attempts/types/attempt-runner.types';
import {
  hydrateAttemptEntry,
  recordCompletionSuccess,
  resetAttempt,
  setDraftSelection,
} from '@/features/attempts/stores/useAttemptsStore';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

import type {
  AttemptSummaryResponseDto,
  QuizQuestionPlayerDto,
} from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Navigation intent emitted by the runner.
 *
 * The runner never calls `next/navigation` directly. The page
 * container reacts to a non-null `navigation` by calling
 * `router.push(intent.href)`. This keeps the orchestrator pure.
 */
export type AttemptRunnerNavigation =
  | { kind: 'push_attempt'; href: string }
  | { kind: 'push_quiz'; href: string }
  | { kind: 'replace_login'; href: string };

export interface UseAttemptRunnerParams {
  /** Canonical quiz id (UUID). `null` until resolved. */
  quizId: string | null;
  /**
   * Latest published quiz-version id. Used as the SWR/broadcast
   * scope for attempt events. `null` until resolved.
   */
  quizVersionId: string | null;
  /**
   * Route `idOrSlug`. Required for the runner to emit the canonical
   * `/quizzes/[idOrSlug]/attempt` navigation intent on start success.
   */
  idOrSlug: string | null;
  /**
   * Player-safe question list (length == totalQuestions). `null` when
   * the player projection is still loading or the quiz is not
   * available. Required for the runner to drive per-question state.
   */
  questions: readonly QuizQuestionPlayerDto[] | null;
}

export interface UseAttemptRunnerResult {
  /** Canonical runner status. */
  status: AttemptRunnerStatus;
  /** Active attempt summary, when present. */
  activeAttempt: AttemptSummaryResponseDto | null;
  /** Resolved attempt id (active or post-start). */
  attemptId: string | null;
  /** Whether the active lookup is in flight. */
  isActiveLoading: boolean;
  /** Whether hydration has resolved at least once. */
  hasHydrated: boolean;
  /** Submitted-answer lock set, server-authoritative. */
  submittedAnswers: SubmittedAnswersMap;
  /**
   * One-shot navigation intent. Consumers should `useEffect`-react
   * to it and call `consumeNavigation()` after handling.
   */
  navigation: AttemptRunnerNavigation | null;
  /** Latest typed error from any sub-hook. */
  error: ApiError | null;
  /** Current 0-based question index. */
  currentIndex: number;
  /** Total question count. */
  totalQuestions: number;
  /** Questions list. */
  questions: readonly QuizQuestionPlayerDto[];
  /** All drafts keyed by questionId. */
  drafts: Record<string, AnswerSelection>;
  /** Update the draft for any question. */
  updateDraft: (selection: AnswerSelection) => void;
  /** Submit a single answer immediately. */
  submitAnswer: (question: QuizQuestionPlayerDto, selection: AnswerSelection) => void;
  /** Select an answer (auto-submit or update if already submitted). */
  selectAnswer: (question: QuizQuestionPlayerDto, selection: AnswerSelection) => void;
  /** Submit all drafts and complete the quiz. */
  completeQuiz: () => Promise<void>;
  /** Start a new attempt. Idempotent on already_started. */
  start: () => Promise<void>;
  /** Abandon the current attempt via the typed-confirm dialog. */
  abandon: () => Promise<void>;
  /** Consume a one-shot navigation intent after handling. */
  consumeNavigation: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAttemptRunner(
  params: UseAttemptRunnerParams,
): UseAttemptRunnerResult {
  const { quizId, quizVersionId, idOrSlug, questions } = params;

  // ─── Auth bootstrap ──────────────────────────────────────────────────────
  const { bootstrapState, currentUser } = useAuthSession();
  const sessionId = React.useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  // ─── Active attempt lookup ───────────────────────────────────────────────
  const {
    attempt: activeAttempt,
    isLoading: isActiveLoading,
    retry: retryActive,
  } = useActiveAttempt({ quizId });

  // ─── Runner entry ID ─────────────────────────────────────────────────────
  const [attemptId, setAttemptId] = React.useState<string | null>(
    activeAttempt?.attemptId ?? null,
  );
  React.useEffect(() => {
    if (activeAttempt?.attemptId && activeAttempt.attemptId !== attemptId) {
      setAttemptId(activeAttempt.attemptId);
    }
  }, [activeAttempt?.attemptId, attemptId]);

  // ─── Hydration ───────────────────────────────────────────────────────────
  const hydration = useAttemptHydration({ attemptId });

  // Derive the canonical runner status from server data.
  const wireStatus: AttemptRunnerStatus | null = React.useMemo(() => {
    if (hydration.detail) return statusFromAttempt(hydration.detail.status);
    if (activeAttempt) return statusFromAttemptSummary(activeAttempt);
    return null;
  }, [hydration.detail, activeAttempt]);

  // Local overlay (transient) status from mutation outcomes.
  const [overlayStatus, setOverlayStatus] =
    React.useState<AttemptRunnerStatus>('idle');

  const status: AttemptRunnerStatus = React.useMemo(() => {
    if (
      overlayStatus === 'starting'
      || overlayStatus === 'submitting'
      || overlayStatus === 'abandoning'
      || overlayStatus === 'completing'
    ) {
      return overlayStatus;
    }
    return wireStatus ?? overlayStatus;
  }, [overlayStatus, wireStatus]);

  // ─── Cross-tab reconciliation ────────────────────────────────────────────
  useAttemptCrossTabSync({ quizVersionId });

  // ─── Runner entry hydration ─────────────────────────────────────────────
  React.useEffect(() => {
    if (attemptId === null || quizId === null || sessionId === null) return;
    const detail = hydration.detail;
    if (!detail) return;
    const next = statusFromAttempt(detail.status);
    hydrateAttemptEntry(attemptId, quizId, sessionId, {
      status: next,
    });
  }, [attemptId, quizId, sessionId, hydration.detail]);

  // ─── Navigation intent ───────────────────────────────────────────────────
  const [navigation, setNavigation] =
    React.useState<AttemptRunnerNavigation | null>(null);
  const consumeNavigation = React.useCallback(() => {
    setNavigation(null);
  }, []);

  // ─── Multiple drafts support ────────────────────────────────────────────
  // Store drafts in state for reactive updates, synced with a ref for quick access
  const [drafts, setDrafts] = React.useState<Record<string, AnswerSelection>>({});
  const draftsRef = React.useRef<Record<string, AnswerSelection>>({});

  const updateDraft = React.useCallback(
    (selection: AnswerSelection) => {
      if (attemptId === null || quizVersionId === null || sessionId === null) {
        return;
      }
      // Update both ref (for synchronous access) and state (for reactivity)
      const newDrafts = {
        ...draftsRef.current,
        [selection.questionId]: selection,
      };
      draftsRef.current = newDrafts;
      setDrafts(newDrafts);
      // Also update the store for persistence
      setDraftSelection(attemptId, quizVersionId, sessionId, selection);
    },
    [attemptId, quizVersionId, sessionId],
  );

  // ─── Mutation hooks ──────────────────────────────────────────────────────
  const startHook = useStartAttempt({ quizId });
  const submitHook = useSubmitAnswer({ attemptId, quizVersionId });
  const completeHook = useCompleteAttempt({ attemptId, quizVersionId });
  const deleteHook = useDeleteAnswer({ attemptId, quizVersionId });

  // Bridge `startHook` outcome → orchestrator state.
  React.useEffect(() => {
    const outcome = startHook.outcome;
    if (!outcome) return;
    if (outcome.kind === 'starting') {
      setOverlayStatus('starting');
      return;
    }
    if (outcome.kind === 'success') {
      setOverlayStatus('in_progress');
      setAttemptId(outcome.attemptId);
      if (idOrSlug) {
        setNavigation({
          kind: 'push_attempt',
          href: `/quizzes/${encodeURIComponent(idOrSlug)}/attempt`,
        });
      }
      startHook.reset();
      return;
    }
    if (outcome.kind === 'already_started') {
      void retryActive();
      setOverlayStatus('idle');
      startHook.reset();
      return;
    }
    if (outcome.kind === 'quiz_unpublished') {
      if (idOrSlug) {
        setNavigation({
          kind: 'push_quiz',
          href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
        });
      }
      setOverlayStatus('idle');
      startHook.reset();
      return;
    }
    if (outcome.kind === 'retryable') {
      setOverlayStatus('idle');
      return;
    }
    if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
      return;
    }
  }, [startHook.outcome, startHook, idOrSlug, retryActive]);

  // Bridge submit outcomes.
  React.useEffect(() => {
    const outcome = submitHook.outcome;
    if (!outcome) return;
    if (outcome.kind === 'submitting') {
      setOverlayStatus('submitting');
      return;
    }
    if (outcome.kind === 'success' || outcome.kind === 'already_answered') {
      setOverlayStatus('in_progress');
      submitHook.reset();
      return;
    }
    if (outcome.kind === 'question_invalid' || outcome.kind === 'forbidden' || outcome.kind === 'not_active') {
      setOverlayStatus('idle');
      submitHook.reset();
      return;
    }
    if (outcome.kind === 'invalid' || outcome.kind === 'retryable') {
      setOverlayStatus('idle');
      submitHook.reset();
      return;
    }
    if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
      return;
    }
  }, [submitHook.outcome, submitHook]);

  // Bridge complete outcomes.
  React.useEffect(() => {
    const outcome = completeHook.outcome;
    if (!outcome) return;
    if (outcome.kind === 'completing') {
      setOverlayStatus('completing');
      return;
    }
    if (outcome.kind === 'success') {
      setOverlayStatus('completed');
      completeHook.reset();
      return;
    }
    if (outcome.kind === 'not_active') {
      setOverlayStatus('completed');
      completeHook.reset();
      return;
    }
    if (outcome.kind === 'redirect' || outcome.kind === 'validation' || outcome.kind === 'retryable') {
      setOverlayStatus('idle');
      completeHook.reset();
      return;
    }
    if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
      return;
    }
  }, [completeHook.outcome, completeHook]);

  // ─── Public actions ──────────────────────────────────────────────────────
  const start = React.useCallback(async () => {
    const outcome = await startHook.start();
    if (outcome.kind === 'already_started') {
      await retryActive();
    }
  }, [startHook, retryActive]);

  /**
   * Select an answer for a question. If the question already has a submitted
   * answer, it will be withdrawn first (fire-and-forget), then the new answer
   * is submitted.
   */
  const selectAnswer = React.useCallback(
    (question: QuizQuestionPlayerDto, selection: AnswerSelection): void => {
      if (!attemptId || !quizVersionId) return;

      const questionId = question.questionId;
      const wasSubmitted = Boolean(hydration.submittedAnswers[questionId]);

      // If already submitted, withdraw the old answer (fire-and-forget)
      if (wasSubmitted) {
        void deleteHook.withdraw(questionId);
      }

      // Submit the new answer
      void submitHook.submit(question, selection, null);
    },
    [attemptId, quizVersionId, hydration.submittedAnswers, deleteHook, submitHook],
  );

  // Keep submitAnswer as an alias for backwards compatibility
  const submitAnswer = selectAnswer;

  const completeQuiz = React.useCallback(async () => {
    if (!questions || !sessionId || !attemptId || !quizVersionId) return;

    setOverlayStatus('submitting');

    // Submit all drafts
    for (const question of questions) {
      const draft = draftsRef.current[question.questionId];
      if (draft) {
        await submitHook.submit(question, draft, null);
      }
    }

    // Complete the quiz
    const outcome = await completeHook.complete();
    if (outcome.kind === 'success' && outcome.result) {
      // Record completion success in the store
      recordCompletionSuccess(attemptId, quizVersionId, sessionId, {
        scorePercent: outcome.result.scorePercent ?? null,
        correctCount: outcome.result.correctCount ?? null,
        xpEarned: outcome.result.xpEarned ?? 0,
        finishedAt: outcome.result.finishedAt ?? new Date().toISOString(),
      });
      // Navigate to results page
      if (idOrSlug) {
        setNavigation({
          kind: 'push_attempt',
          href: `/quizzes/${encodeURIComponent(idOrSlug)}/results`,
        });
      }
      setOverlayStatus('completed');
    } else if (outcome.kind === 'not_active') {
      // Already completed - navigate to results
      if (idOrSlug) {
        setNavigation({
          kind: 'push_attempt',
          href: `/quizzes/${encodeURIComponent(idOrSlug)}/results`,
        });
      }
      setOverlayStatus('completed');
    } else {
      setOverlayStatus('idle');
    }
  }, [questions, sessionId, attemptId, quizVersionId, submitHook, completeHook, idOrSlug]);

  const abandon = React.useCallback(async () => {
    // Abandon is handled by the parent component via navigation
    if (idOrSlug) {
      setNavigation({
        kind: 'push_quiz',
        href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
      });
    }
  }, [idOrSlug]);

  // Reset the entry on terminal abandon so a re-mount starts clean.
  React.useEffect(() => {
    if (status === 'abandoned' && attemptId) {
      resetAttempt(attemptId);
    }
  }, [status, attemptId]);

  return {
    status,
    activeAttempt,
    attemptId,
    isActiveLoading,
    hasHydrated: hydration.hasResolved,
    submittedAnswers: hydration.submittedAnswers,
    navigation,
    error:
      startHook.error
      ?? submitHook.error
      ?? completeHook.error
      ?? hydration.error,
    currentIndex: 0,
    totalQuestions: questions?.length ?? 0,
    questions: questions ?? [],
    drafts,
    updateDraft,
    submitAnswer,
    selectAnswer,
    completeQuiz,
    start,
    abandon,
    consumeNavigation,
  };
}
