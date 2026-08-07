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
 *       - Per-question draft, submit, lock, withdraw, navigation.
 *       - Submit moves only the target question through
 *         `pending` → `locked`.
 *       - 409 `ATTEMPT_QUESTION_ALREADY_ANSWERED` reconciliation
 *         refreshes and locks the server answer.
 *       - Withdrawal unlocks only after success or silent
 *         `already_missing` convergence.
 *       - Re-submission after withdrawal uses a fresh `POST`.
 *       - 429 cooldown is per-action; navigation stays live.
 *       - `question_invalid` outcome marks the question skipped and
 *         advances to another available question.
 *
 * ## What this hook does NOT own
 *
 *   - No router navigation (returns intent only via the result).
 *   - No completion / score / review / analytics (reserved for 4.15).
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
import { useDeleteAnswer } from '@/features/attempts/hooks/useDeleteAnswer';
import { useAbandonAttempt } from '@/features/attempts/hooks/useAbandonAttempt';
import {
  type AnswerSelection,
  type AttemptRunnerStatus,
  type SubmittedAnswersMap,
  statusFromAttempt,
  statusFromAttemptSummary,
} from '@/features/attempts/types/attempt-runner.types';
import {
  hydrateAttemptEntry,
  recordAbandonSuccess,
  resetAttempt,
  setCurrentQuestion,
  setDraftSelection,
  useAttemptEntry,
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
  /** True iff `status === 'submitting'` and the target question matches. */
  isSubmitting: (questionId: string) => boolean;
  /** Current 0-based question index. */
  currentIndex: number;
  /** Total question count. */
  totalQuestions: number;
  /** Read-only current question. */
  currentQuestion: QuizQuestionPlayerDto | null;
  /** Read-only draft for the current question. */
  draftSelection: AnswerSelection | null;
  /** Update the draft for the current question only. */
  updateDraft: (selection: AnswerSelection) => void;
  /** Submit the draft for the current question. */
  submitCurrent: () => Promise<void>;
  /** Withdraw the submitted answer for the current question. */
  withdrawCurrent: () => Promise<void>;
  /** Navigate to a specific 0-based question index. */
  goTo: (index: number) => void;
  /** Previous / next navigation; no-op at bounds. */
  previous: () => void;
  next: () => void;
  /** Start a new attempt. Idempotent on already_started. */
  start: () => Promise<void>;
  /** Abandon the current attempt via the typed-confirm dialog. */
  abandon: () => Promise<void>;
  /** Consume a one-shot navigation intent after handling. */
  consumeNavigation: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Default sessionId placeholder while auth is bootstrapping. The
 * active lookup and start hook are gated on `bootstrapState === 'authenticated'`,
 * so this value never reaches the wire.
 */
void ('SESSION_PLACEHOLDER is reserved for future cross-tab debug hooks.');

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
  // Hydration only begins once we have either an active attempt or
  // the user has just initiated a start. We model the entry as a
  // single mutable ref so a successful start can hand off the
  // attempt id without a router round-trip.
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
    // Overlay wins only during transient mutations.
    if (
      overlayStatus === 'starting'
      || overlayStatus === 'submitting'
      || overlayStatus === 'abandoning'
    ) {
      return overlayStatus;
    }
    // Otherwise mirror server data; default to 'idle' before first fetch.
    return wireStatus ?? overlayStatus;
  }, [overlayStatus, wireStatus]);

  // ─── Cross-tab reconciliation ────────────────────────────────────────────
  useAttemptCrossTabSync({ quizVersionId });

  // ─── Runner entry hydration ──────────────────────────────────────────────
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

  // ─── Question index ──────────────────────────────────────────────────────
  const totalQuestions = questions?.length ?? 0;
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  React.useEffect(() => {
    // Clamp on questions load.
    if (totalQuestions === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((idx) => Math.min(Math.max(idx, 0), totalQuestions - 1));
  }, [totalQuestions]);

  // Pick the first unanswered question on hydration. Drafts and
  // submitted-answer locks are read from the store entry below.
  const entry = useAttemptEntry(attemptId);

  React.useEffect(() => {
    if (!questions || totalQuestions === 0) return;
    if (!hydration.hasResolved) return;
    const locked = entry?.submittedAnswers ?? {};
    const target = questions.findIndex(
      (q) => !Object.prototype.hasOwnProperty.call(locked, q.questionId),
    );
    if (target >= 0) setCurrentIndex(target);
  }, [
    questions,
    totalQuestions,
    hydration.hasResolved,
    entry?.submittedAnswers,
  ]);

  const currentQuestion = questions?.[currentIndex] ?? null;

  // ─── Draft selection ─────────────────────────────────────────────────────
  const draftSelection = currentQuestion
    && entry?.currentQuestionId === currentQuestion.questionId
    ? entry?.draftSelection ?? null
    : null;

  const updateDraft = React.useCallback(
    (selection: AnswerSelection) => {
      if (attemptId === null || quizVersionId === null || sessionId === null) {
        return;
      }
      setDraftSelection(attemptId, quizVersionId, sessionId, selection);
      setCurrentQuestion(
        attemptId,
        quizVersionId,
        sessionId,
        selection.questionId,
      );
    },
    [attemptId, quizVersionId, sessionId],
  );

  // ─── Mutation hooks ──────────────────────────────────────────────────────
  const startHook = useStartAttempt({ quizId });
  const submitHook = useSubmitAnswer({ attemptId, quizVersionId });
  const deleteHook = useDeleteAnswer({ attemptId, quizVersionId });
  const abandonHook = useAbandonAttempt({ attemptId, quizVersionId });

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
      // Re-resolve active lookup; if the server already has one,
      // the active-attempt SWR cache will refresh and we'll adopt
      // its id.
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

  // Bridge submit / delete outcomes.
  React.useEffect(() => {
    const outcome = submitHook.outcome;
    if (!outcome) return;
    if (outcome.kind === 'submitting') {
      setOverlayStatus('submitting');
      return;
    }
    if (outcome.kind === 'success') {
      setOverlayStatus('in_progress');
      submitHook.reset();
      return;
    }
    if (outcome.kind === 'already_answered') {
      // 409 reconciliation already refreshed; mark in-progress and
      // let the hydration effect converge.
      setOverlayStatus('in_progress');
      submitHook.reset();
      return;
    }
    if (outcome.kind === 'question_invalid') {
      // Skip current and advance to the next unanswered question.
      setOverlayStatus('in_progress');
      submitHook.reset();
      nextQuestion();
      return;
    }
    if (outcome.kind === 'forbidden' || outcome.kind === 'not_active') {
      setOverlayStatus('idle');
      if (idOrSlug && outcome.kind === 'forbidden') {
        setNavigation({
          kind: 'push_quiz',
          href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
        });
      }
      submitHook.reset();
      return;
    }
    if (outcome.kind === 'invalid') {
      setOverlayStatus('in_progress');
      submitHook.reset();
      return;
    }
    if (outcome.kind === 'retryable') {
      setOverlayStatus('idle');
      return;
    }
    if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitHook.outcome]);

  React.useEffect(() => {
    const outcome = deleteHook.outcome;
    if (!outcome) return;
    if (outcome.kind === 'withdrawing') {
      setOverlayStatus('submitting');
      return;
    }
    if (outcome.kind === 'success' || outcome.kind === 'already_missing') {
      setOverlayStatus('in_progress');
      deleteHook.reset();
      return;
    }
    if (outcome.kind === 'not_active' || outcome.kind === 'forbidden') {
      setOverlayStatus('idle');
      deleteHook.reset();
      return;
    }
    if (outcome.kind === 'not_found') {
      setOverlayStatus('idle');
      deleteHook.reset();
      return;
    }
    if (outcome.kind === 'retryable') {
      setOverlayStatus('idle');
      return;
    }
    if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
      return;
    }
  }, [deleteHook.outcome, deleteHook]);

  React.useEffect(() => {
    const outcome = abandonHook.outcome;
    if (!outcome) return;
    if (outcome.kind === 'abandoning') {
      setOverlayStatus('abandoning');
      return;
    }
    if (outcome.kind === 'success') {
      setOverlayStatus('abandoned');
      if (idOrSlug) {
        setNavigation({
          kind: 'push_quiz',
          href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
        });
      }
      abandonHook.reset();
      return;
    }
    if (outcome.kind === 'not_active' || outcome.kind === 'completed_remote') {
      // 409 / already terminal — converge to abandoned state, no
      // duplicate mutation.
      setOverlayStatus('abandoned');
      if (attemptId && quizVersionId && sessionId) {
        recordAbandonSuccess(attemptId, quizVersionId, sessionId);
      }
      abandonHook.reset();
      return;
    }
    if (outcome.kind === 'forbidden') {
      setOverlayStatus('idle');
      if (idOrSlug) {
        setNavigation({
          kind: 'push_quiz',
          href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
        });
      }
      abandonHook.reset();
      return;
    }
    if (outcome.kind === 'not_found') {
      setOverlayStatus('idle');
      abandonHook.reset();
      return;
    }
    if (outcome.kind === 'retryable') {
      setOverlayStatus('idle');
      return;
    }
    if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
      return;
    }
  }, [
    abandonHook.outcome,
    abandonHook,
    attemptId,
    quizVersionId,
    sessionId,
    idOrSlug,
  ]);

  // ─── Public actions ──────────────────────────────────────────────────────
  const start = React.useCallback(async () => {
    const outcome = await startHook.start();
    if (outcome.kind === 'already_started') {
      // Adopt any existing attempt the active lookup now sees.
      await retryActive();
    }
  }, [startHook, retryActive]);

  const submitCurrent = React.useCallback(async () => {
    if (!currentQuestion) return;
    if (!draftSelection) return;
    const outcome = await submitHook.submit(
      currentQuestion,
      draftSelection,
      null,
    );
    if (outcome.kind === 'already_answered') {
      // 409 reconciliation: refresh hydration and adopt server answer.
      await hydration.refresh();
    }
    if (outcome.kind === 'success' || outcome.kind === 'already_answered') {
      // After submission, advance to the next unanswered question.
      nextQuestion();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, draftSelection, submitHook, hydration]);

  const withdrawCurrent = React.useCallback(async () => {
    if (!currentQuestion) return;
    await deleteHook.withdraw(currentQuestion.questionId);
  }, [currentQuestion, deleteHook]);

  const abandon = React.useCallback(async () => {
    await abandonHook.confirm();
  }, [abandonHook]);

  // ─── Navigation helpers ──────────────────────────────────────────────────
  function nextQuestion() {
    if (totalQuestions === 0) return;
    setCurrentIndex((idx) => Math.min(idx + 1, totalQuestions - 1));
  }

  const goTo = React.useCallback(
    (index: number) => {
      if (totalQuestions === 0) return;
      setCurrentIndex(Math.min(Math.max(index, 0), totalQuestions - 1));
    },
    [totalQuestions],
  );

  const previous = React.useCallback(() => {
    setCurrentIndex((idx) => Math.max(idx - 1, 0));
  }, []);

  const next = React.useCallback(() => {
    setCurrentIndex((idx) => Math.min(idx + 1, Math.max(totalQuestions - 1, 0)));
  }, [totalQuestions]);

  // ─── Submission per-question state ───────────────────────────────────────
  const isSubmitting = React.useCallback(
    (questionId: string): boolean => {
      if (status !== 'submitting') return false;
      if (!currentQuestion) return false;
      return currentQuestion.questionId === questionId;
    },
    [status, currentQuestion],
  );

  // Reset the entry on terminal abandon so a re-mount starts clean.
  React.useEffect(() => {
    if (status === 'abandoned' && attemptId) {
      resetAttempt(attemptId);
    }
  }, [status, attemptId]);

  // ─── Stable SWR subscriptions for active lookup ────────────────────────
  // `useActiveAttempt` already manages its own SWR subscription. The
  // hook file imports SWR transitively; no top-level `useSWR` call is
  // needed by the orchestrator today.

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
      ?? deleteHook.error
      ?? abandonHook.error
      ?? hydration.error,
    isSubmitting,
    currentIndex,
    totalQuestions,
    currentQuestion: currentQuestion ?? null,
    draftSelection,
    updateDraft,
    submitCurrent,
    withdrawCurrent,
    goTo,
    previous,
    next,
    start,
    abandon,
    consumeNavigation,
  };
}