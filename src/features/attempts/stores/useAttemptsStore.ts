/**
 * `useAttemptsStore` — quiz-version-keyed non-persisted runner store.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.7.
 *
 * ## Why zustand (not React context)
 *
 * - The project already vendors `zustand@5.0.13`.
 * - The runner orchestrator (`AttemptRunner`), the picker, and the
 *   cross-tab reconciliation adapter (T-4.14.8) are not in the same
 *   component subtree. Zustand avoids prop-drilling.
 * - The store must NOT persist to `localStorage` / `sessionStorage`
 *   — every write goes through a server mutation, so the server is
 *   authoritative and any localStorage cache would risk replaying
 *   stale state.
 *
 * ## State shape
 *
 * The store is keyed by attempt id. Two attempt identities cannot
 * overwrite one another because each action targets a specific entry.
 * `attemptsByQuizVersionId` provides a reverse index so the runner
 * can resolve the active attempt entry from the quiz-version identity
 * it owns.
 *
 * Each entry tracks:
 *
 *   - `status`: the runner state machine (see T-4.14.2).
 *   - `currentQuestionId`: the question the picker is focused on.
 *   - `draftSelection`: the controlled draft before submit.
 *   - `submittedAnswers`: the local lock set mirror.
 *   - `cooldownUntil`: epoch ms; the submit mutation primitive reads
 *     this to enforce the 500 ms cooldown.
 *   - `error`: the last typed `ApiError` (used to render the
 *     inline / toast surface).
 *   - `sessionId`: the authenticated user the entry is scoped to.
 *     Used by reconciliation to drop stale entries.
 *
 * ## Design — actions outside the data state
 *
 * Mirrors the cross-story contract from `use-quiz-filters-store.ts`
 * and `use-my-quizzes-tab-store.ts`: state holds scalar values only;
 * actions are exported as standalone functions so `getState()` returns
 * the data state only and `reset()` can replace the data state
 * without losing the actions.
 *
 * Partial updates use zustand merge mode (no `replace` flag). Full
 * replacement is reserved for the test reset and the eviction
 * actions (`resetAttempt`, `dropForeignEntries`) where the returned
 * state is genuinely complete.
 *
 * ## Reserved states
 *
 * `completing` / `completed` are reserved for the Story 4.15
 * handoff. The runner never writes them in Story 4.14.
 */

import { create } from 'zustand';

import type {
  AnswerSelection,
  AttemptRunnerStatus,
  SubmittedAnswersMap,
} from '../types/attempt-runner.types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AttemptEntry {
  status: AttemptRunnerStatus;
  /** The question the picker is focused on. `null` when the runner is idle. */
  currentQuestionId: string | null;
  /** The user's controlled draft selection. `null` when the picker is fresh. */
  draftSelection: AnswerSelection | null;
  /** Local mirror of the submitted-answers lock set. */
  submittedAnswers: SubmittedAnswersMap;
  /** Epoch ms until which the submit mutation is on cooldown. `null` when not cooling down. */
  cooldownUntil: number | null;
  /** Last typed `ApiError` from a runner mutation. `null` when healthy. */
  error: import('@/lib/api').ApiError | null;
  /** The authenticated user the entry is scoped to. Used by reconciliation to drop stale entries. */
  sessionId: string | null;
}

export interface AttemptsDataState {
  /**
   * Primary index — keyed by `attemptId`. Two attempt identities
   * cannot collide.
   */
  attemptsById: Record<string, AttemptEntry>;
  /**
   * Reverse index — keyed by `quizVersionId`. The runner can resolve
   * the active attempt entry from the quiz-version identity it owns
   * without scanning `attemptsById`.
   */
  attemptsByQuizVersionId: Record<string, string>;
}

/**
 * Default entry shape — every field is explicitly typed so an
 * `AttemptEntry` mutation that omits a key fails compilation.
 */
function makeEmptyEntry(sessionId: string | null): AttemptEntry {
  return {
    status: 'idle',
    currentQuestionId: null,
    draftSelection: null,
    submittedAnswers: {},
    cooldownUntil: null,
    error: null,
    sessionId,
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

/**
 * The store. State is the two scalar maps only — no actions in state.
 */
export const useAttemptsStore = create<AttemptsDataState>()(() => ({
  attemptsById: {},
  attemptsByQuizVersionId: {},
}));

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Ensure an attempt entry exists for the given identity pair.
 * Returns the entry reference after the operation completes.
 *
 * Initialises the entry with `idle` status if it does not already
 * exist; populates both indexes atomically.
 */
function ensureEntry(
  attemptId: string,
  quizVersionId: string,
  sessionId: string | null,
): AttemptEntry {
  const existing = useAttemptsStore.getState().attemptsById[attemptId];
  if (existing !== undefined) return existing;
  const fresh = makeEmptyEntry(sessionId);
  useAttemptsStore.setState((s) => ({
    attemptsById: { ...s.attemptsById, [attemptId]: fresh },
    attemptsByQuizVersionId: {
      ...s.attemptsByQuizVersionId,
      [quizVersionId]: attemptId,
    },
  }));
  return useAttemptsStore.getState().attemptsById[attemptId]!;
}

/**
 * Replace the entire entry for an attempt. Used by hydration to
 * publish a canonical server snapshot that overwrites transient state.
 *
 * The function refuses to overwrite an entry that does not belong to
 * the provided session, so a stale tab cannot clobber another user's
 * entry.
 */
export function hydrateAttemptEntry(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  snapshot: Partial<AttemptEntry>,
): void {
  const current = useAttemptsStore.getState().attemptsById[attemptId];
  if (current && current.sessionId !== null && current.sessionId !== sessionId) {
    // Cross-user overwrite guard: drop silently. Reconciliation
    // subscribes before this branch can run for the same attempt.
    return;
  }
  const base = current ?? makeEmptyEntry(sessionId);
  const next: AttemptEntry = {
    ...base,
    ...snapshot,
    sessionId,
  };
  useAttemptsStore.setState((s) => ({
    attemptsById: { ...s.attemptsById, [attemptId]: next },
    attemptsByQuizVersionId: {
      ...s.attemptsByQuizVersionId,
      [quizVersionId]: attemptId,
    },
  }));
}

/**
 * Set the runner status for an attempt.
 *
 * Refuses to set `completing` / `completed` (Story 4.15 reserved
 * states) so a Story 4.14 caller cannot write them accidentally.
 */
export function setAttemptStatus(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  status: AttemptRunnerStatus,
): void {
  if (status === 'completing' || status === 'completed') {
    return;
  }
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: { ...entry, status },
      },
    };
  });
}

/**
 * Update the focused question id for an attempt.
 */
export function setCurrentQuestion(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  questionId: string | null,
): void {
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: { ...entry, currentQuestionId: questionId },
      },
    };
  });
}

/**
 * Replace the draft selection for an attempt.
 */
export function setDraftSelection(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  selection: AnswerSelection | null,
): void {
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: { ...entry, draftSelection: selection },
      },
    };
  });
}

/**
 * Begin a submit attempt — sets `status: 'submitting'` and stamps the
 * cooldown timer. Returns the epoch ms the cooldown expires so the
 * mutation primitive can re-check before firing.
 */
export function beginSubmit(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  cooldownMs: number,
): number {
  ensureEntry(attemptId, quizVersionId, sessionId);
  const cooldownUntil = Date.now() + cooldownMs;
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: {
          ...entry,
          status: 'submitting',
          cooldownUntil,
          error: null,
        },
      },
    };
  });
  return cooldownUntil;
}

/**
 * Record a successful submit. Updates the local submitted-answers
 * lock set and clears the cooldown / error fields. Status returns to
 * `in_progress` (the runner can advance to the next question).
 */
export function recordSubmitSuccess(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  submitted: AttemptEntry['submittedAnswers'][string],
): void {
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    const nextAnswers: SubmittedAnswersMap = {
      ...entry.submittedAnswers,
      [submitted.questionId]: submitted,
    };
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: {
          ...entry,
          status: 'in_progress',
          cooldownUntil: null,
          draftSelection: null,
          submittedAnswers: nextAnswers,
          error: null,
        },
      },
    };
  });
}

/**
 * Record a withdrawal. Removes the question from the local lock set
 * and returns status to `in_progress`.
 */
export function recordWithdrawSuccess(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  questionId: string,
): void {
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    const { [questionId]: _removed, ...nextAnswers } = entry.submittedAnswers;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: {
          ...entry,
          status: 'in_progress',
          cooldownUntil: null,
          submittedAnswers: nextAnswers,
          error: null,
        },
      },
    };
  });
}

/**
 * Begin an abandon attempt — sets `status: 'abandoning'`.
 */
export function beginAbandon(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
): void {
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: {
          ...entry,
          status: 'abandoning',
          error: null,
        },
      },
    };
  });
}

/**
 * Record a successful abandon. Status becomes terminal `abandoned`.
 */
export function recordAbandonSuccess(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
): void {
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: {
          ...entry,
          status: 'abandoned',
          cooldownUntil: null,
          error: null,
        },
      },
    };
  });
}

/**
 * Record a mutation failure. Returns the runner to a retryable
 * status (`in_progress` for submit / withdraw, `idle` for abandon)
 * and stores the typed error so the picker / toast can render it.
 */
export function recordMutationFailure(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  error: import('@/lib/api').ApiError,
  retryableStatus: Extract<AttemptRunnerStatus, 'in_progress' | 'idle'>,
): void {
  ensureEntry(attemptId, quizVersionId, sessionId);
  useAttemptsStore.setState((s) => {
    const entry = s.attemptsById[attemptId]!;
    return {
      attemptsById: {
        ...s.attemptsById,
        [attemptId]: {
          ...entry,
          status: retryableStatus,
          cooldownUntil: null,
          error,
        },
      },
    };
  });
}

/**
 * Reset a single attempt entry. Drops the entry from both indexes
 * without touching unrelated entries.
 */
export function resetAttempt(attemptId: string): void {
  useAttemptsStore.setState((s) => {
    const { [attemptId]: _removed, ...nextById } = s.attemptsById;
    const nextByQuizVersionId: Record<string, string> = {};
    for (const [qvId, aId] of Object.entries(s.attemptsByQuizVersionId)) {
      if (aId !== attemptId) {
        nextByQuizVersionId[qvId] = aId;
      }
    }
    return {
      attemptsById: nextById,
      attemptsByQuizVersionId: nextByQuizVersionId,
    };
  });
}

/**
 * Drop every entry owned by another session. Used by the logout
 * bridge and the cross-tab reconciliation adapter.
 */
export function dropForeignEntries(sessionId: string): void {
  useAttemptsStore.setState((s) => {
    const nextById: Record<string, AttemptEntry> = {};
    const nextByQuizVersionId: Record<string, string> = {};
    for (const [attemptId, entry] of Object.entries(s.attemptsById)) {
      if (entry.sessionId === sessionId) {
        nextById[attemptId] = entry;
      }
    }
    for (const [qvId, aId] of Object.entries(s.attemptsByQuizVersionId)) {
      if (nextById[aId] !== undefined) {
        nextByQuizVersionId[qvId] = aId;
      }
    }
    return {
      attemptsById: nextById,
      attemptsByQuizVersionId: nextByQuizVersionId,
    };
  });
}

// ─── Selectors ───────────────────────────────────────────────────────────────
// Per the cross-story contract rule, scalar selectors are stable
// references; consumers that need the full state subscribe via
// `useAttemptsStore()` directly.

export const useAttemptEntry = (attemptId: string | null) =>
  useAttemptsStore((s) =>
    attemptId === null ? undefined : s.attemptsById[attemptId],
  );

export const useAttemptStatus = (attemptId: string | null) =>
  useAttemptsStore((s) =>
    attemptId === null ? 'idle' : s.attemptsById[attemptId]?.status ?? 'idle',
  );

export const useAttemptSubmittedAnswers = (attemptId: string | null) =>
  useAttemptsStore((s) =>
    attemptId === null ? {} : s.attemptsById[attemptId]?.submittedAnswers ?? {},
  );

export const useAttemptError = (attemptId: string | null) =>
  useAttemptsStore((s) =>
    attemptId === null ? null : s.attemptsById[attemptId]?.error ?? null,
  );