/**
 * `instanceGameplay.store.ts` — per-instance gameplay state.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.C1.
 *
 * ## Purpose
 *
 * Holds the realtime-derived slice of per-instance gameplay state:
 * the current question bundle, the authoritative answer result, the
 * player's progress snapshot, the live leaderboard snapshot, and the
 * instance closure state. REST reads from `useInstance` / `useLiveLeaderboard`
 * (B5) populate the canonical state; this store mirrors only the
 * *deltas* applied between REST reads via the Socket.IO event stream.
 *
 * ## Why zustand (not React context)
 *
 * - The project already vendors `zustand@5.0.13`.
 * - The game orchestrator (`InstanceGameView`), the leaderboard panel,
 *   the timer, the submission CTA, and the realtime bridge (this module)
 *   are not in the same component subtree. Zustand avoids prop-drilling.
 * - The store must NOT persist to `localStorage` / `sessionStorage`.
 *   The server is authoritative for every question, result, and leaderboard
 *   transition; persisting a local mirror would risk replaying stale
 *   state on a reconnect after the server has moved on.
 *
 * ## State shape
 *
 * The store is keyed by `instanceId`. Two instances cannot overwrite
 * one another because each action targets a specific entry. Each entry
 * tracks:
 *
 *   - `bundle`: the latest accepted `PlayerQuestionBundleDto`.
 *   - `timing`: the latest accepted `QuestionTimingDto` (extracted from bundle).
 *   - `submission`: the last accepted `AnswerSubmissionAckDto`.
 *   - `result`: the last accepted `AnswerResultDto`.
 *   - `progress`: the last accepted `PlayerProgressDto`.
 *   - `leaderboard`: the latest accepted `LeaderboardEntryDto[]`.
 *   - `closure`: the accepted `InstanceClosedEventDto`.
 *   - `finalLeaderboard`: the `FinalLeaderboardDto` from closure.
 *   - `lastEventSequence`: map of `GameplayEventName → number`.
 *   - `isReconciling`: true while a reconnect reconciliation is in flight.
 *
 * ## Server authority
 *
 * Question reveal, answer result, player progress, leaderboard, and
 * instance closure are all server-driven. The store applies deltas
 * optimistically and lets the next REST read confirm. The store never
 * persists state across page reloads.
 *
 * ## DTO separation
 *
 * The store never holds author-only correctness fields. The
 * `PlayerQuestionBundleDto` and `PlayerAnswerOptionDto` consumed by this
 * store are the player-safe projections — they have no `isCorrect`,
 * `explanation`, `solution`, or `correctOptionId`. The `AnswerResultDto`
 * carries `isCorrect` only because the server emits it after the
 * approved reveal stage; the UI gate (enforced by `useInstanceLifecycle`
 * and the lint invariant) ensures correctness is never surfaced to the
 * player before that point.
 */

import { create } from "zustand";

import type {
  AnswerResultDto,
  FinalLeaderboardDto,
  GameplayEventEnvelope,
  GameplayEventName,
  InstanceClosedEventDto,
  LeaderboardEntryDto,
  LeaderboardUpdatedEventDto,
  PlayerProgressDto,
  PlayerQuestionBundleDto,
  QuestionTimingDto,
} from "../types/gameplay.types";

// ─── Entry shape ─────────────────────────────────────────────────────────────

export interface InstanceGameplayEntry {
  /** Latest accepted question bundle. `null` before the first `question_revealed`. */
  bundle: PlayerQuestionBundleDto | null;
  /** Timing contract extracted from the latest bundle. `null` when no bundle. */
  timing: QuestionTimingDto | null;
  /** Last accepted answer submission acknowledgement. `null` before submission. */
  submission: { questionId: string; submittedAt: string; accepted: boolean } | null;
  /** Last accepted answer result. `null` before the first result envelope. */
  result: AnswerResultDto | null;
  /** Last accepted player progress snapshot. `null` before the first progress event. */
  progress: PlayerProgressDto | null;
  /** Latest accepted leaderboard entries. `[]` before the first leaderboard update. */
  leaderboard: LeaderboardEntryDto[];
  /** Accepted instance closure. `null` before closure. */
  closure: InstanceClosedEventDto | null;
  /** Final leaderboard extracted from closure. `null` before closure or if absent. */
  finalLeaderboard: FinalLeaderboardDto | null;
  /**
   * Highest `eventSequence` already applied per event type.
   * Used by the sequence dedup gate to drop stale envelopes.
   */
  lastEventSequence: Partial<Record<GameplayEventName, number>>;
  /** True while a reconnect reconciliation is in flight; gates the bridge. */
  isReconciling: boolean;
}

// ─── State + actions ────────────────────────────────────────────────────────

export interface InstanceGameplayState {
  entries: Record<string, InstanceGameplayEntry>;
}

export interface InstanceGameplayActions {
  /** Apply a `question_revealed` envelope. Drops stale events. */
  applyQuestionRevealed: (envelope: GameplayEventEnvelope<PlayerQuestionBundleDto>) => void;
  /** Apply an `answer_result` envelope. Drops stale events. */
  applyAnswerResult: (envelope: GameplayEventEnvelope<AnswerResultDto>) => void;
  /** Apply a `leaderboard_updated` envelope. Drops stale events. */
  applyLeaderboardUpdated: (envelope: GameplayEventEnvelope<LeaderboardUpdatedEventDto>) => void;
  /** Apply a `player_progress` event data. Drops stale events. */
  applyPlayerProgress: (progress: PlayerProgressDto) => void;
  /** Apply an `instance_closed` envelope. Drops stale events. */
  applyInstanceClosed: (envelope: GameplayEventEnvelope<InstanceClosedEventDto>) => void;
  /** Apply an `instance_final_leaderboard` envelope. Drops stale events. */
  applyFinalLeaderboard: (envelope: GameplayEventEnvelope<FinalLeaderboardDto>) => void;
  /** Record a locally-acknowledged submission (optimistic). */
  applySubmission: (questionId: string, submittedAt: string) => void;
  /** Clear the current submission when the question advances. */
  clearSubmission: (questionId: string) => void;
  /** Set reconciling state. Called by `useReconnectReconciliation`. */
  setReconciling: (instanceId: string, isReconciling: boolean) => void;
  /** Reset the gameplay entry for an instance. */
  reset: (instanceId: string) => void;
  /** Reset all entries (used on logout). */
  resetAll: () => void;
}

export type InstanceGameplayStore =
  InstanceGameplayState & InstanceGameplayActions;

const INITIAL_STATE: InstanceGameplayState = {
  entries: {},
};

function ensureEntry(
  state: InstanceGameplayState,
  instanceId: string,
): InstanceGameplayEntry {
  const existing = state.entries[instanceId];
  if (existing !== undefined) return existing;
  return {
    bundle: null,
    timing: null,
    submission: null,
    result: null,
    progress: null,
    leaderboard: [],
    closure: null,
    finalLeaderboard: null,
    lastEventSequence: {},
    isReconciling: false,
  };
}

function isStaleEntry(
  entry: InstanceGameplayEntry,
  eventName: GameplayEventName,
  eventSequence: number,
): boolean {
  const last = entry.lastEventSequence[eventName];
  return typeof eventSequence !== "number" || (typeof last === "number" && eventSequence <= last);
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useInstanceGameplayStore = create<InstanceGameplayStore>(
  (set) => ({
    ...INITIAL_STATE,

    applyQuestionRevealed: (envelope) => {
      const { instanceId, data, eventSequence } = envelope;
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (isStaleEntry(entry, "question_revealed", eventSequence)) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              bundle: data,
              timing: data.question.questionTiming,
              // Clear prior submission when a new question is revealed.
              submission: null,
              result: null,
              lastEventSequence: {
                ...entry.lastEventSequence,
                question_revealed: eventSequence,
              },
            },
          },
        };
      });
    },

    applyAnswerResult: (envelope) => {
      const { instanceId, data, eventSequence } = envelope;
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (isStaleEntry(entry, "answer_result", eventSequence)) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              result: data,
              lastEventSequence: {
                ...entry.lastEventSequence,
                answer_result: eventSequence,
              },
            },
          },
        };
      });
    },

    applyLeaderboardUpdated: (envelope) => {
      const { instanceId, data, eventSequence } = envelope;
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (isStaleEntry(entry, "leaderboard_updated", eventSequence)) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              leaderboard: data.entries,
              lastEventSequence: {
                ...entry.lastEventSequence,
                leaderboard_updated: eventSequence,
              },
            },
          },
        };
      });
    },

    applyPlayerProgress: (progress) => {
      const { instanceId, eventSequence } = progress;
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        // Use `player_progress` as the sequence key since it's a separate
        // event type from `leaderboard_updated`.
        const key: GameplayEventName = "leaderboard_updated";
        if (isStaleEntry(entry, key, eventSequence)) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              progress,
              lastEventSequence: {
                ...entry.lastEventSequence,
                [key]: eventSequence,
              },
            },
          },
        };
      });
    },

    applyInstanceClosed: (envelope) => {
      const { instanceId, data, eventSequence } = envelope;
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (isStaleEntry(entry, "instance_closed", eventSequence)) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              closure: data,
              finalLeaderboard: data.finalLeaderboard,
              lastEventSequence: {
                ...entry.lastEventSequence,
                instance_closed: eventSequence,
              },
            },
          },
        };
      });
    },

    applyFinalLeaderboard: (envelope) => {
      const { instanceId, data, eventSequence } = envelope;
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (isStaleEntry(entry, "instance_final_leaderboard", eventSequence)) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              finalLeaderboard: data,
              lastEventSequence: {
                ...entry.lastEventSequence,
                instance_final_leaderboard: eventSequence,
              },
            },
          },
        };
      });
    },

    applySubmission: (questionId, submittedAt) => {
      set((state) => ({
        entries: {
          ...state.entries,
          // Apply to all instances since we don't have the instanceId here.
          // In practice this is called only when the current instance is known.
          // Use object.values to avoid mutating state if no entry exists.
          ...Object.fromEntries(
            Object.entries(state.entries).map(([id, entry]) => [
              id,
              {
                ...entry,
                submission: { questionId, submittedAt, accepted: true },
              },
            ])
          ),
        },
      }));
    },

    clearSubmission: (questionId) => {
      set((state) => {
        const next = { ...state.entries };
        for (const [id, entry] of Object.entries(next)) {
          if (entry.submission?.questionId === questionId) {
            next[id] = { ...entry, submission: null };
          }
        }
        return { entries: next };
      });
    },

    setReconciling: (instanceId, isReconciling) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: { ...entry, isReconciling },
          },
        };
      });
    },

    reset: (instanceId) => {
      set((state) => {
        if (state.entries[instanceId] === undefined) return state;
        const nextEntries = { ...state.entries };
        delete nextEntries[instanceId];
        return { entries: nextEntries };
      });
    },

    resetAll: () => {
      set(() => ({ entries: {} }));
    },
  }),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

/**
 * Select the full gameplay entry for an instance. Returns `null` when
 * the instance has not been touched yet.
 */
export function selectGameplayEntry(
  state: InstanceGameplayStore,
  instanceId: string,
): InstanceGameplayEntry | null {
  return state.entries[instanceId] ?? null;
}

/**
 * Select the latest accepted question bundle for an instance.
 * Returns `null` when no bundle has been revealed yet.
 */
export function selectGameplayBundle(
  state: InstanceGameplayStore,
  instanceId: string,
): PlayerQuestionBundleDto | null {
  return state.entries[instanceId]?.bundle ?? null;
}

/**
 * Select the latest accepted timing contract for an instance.
 * Returns `null` when no timing has been received yet.
 */
export function selectGameplayTiming(
  state: InstanceGameplayStore,
  instanceId: string,
): QuestionTimingDto | null {
  return state.entries[instanceId]?.timing ?? null;
}

/**
 * Select the last accepted answer submission acknowledgement.
 * Returns `null` when no submission has been recorded yet.
 */
export function selectGameplaySubmission(
  state: InstanceGameplayStore,
  instanceId: string,
): { questionId: string; submittedAt: string; accepted: boolean } | null {
  return state.entries[instanceId]?.submission ?? null;
}

/**
 * Select the last accepted answer result.
 * Returns `null` when no result has been received yet.
 */
export function selectGameplayResult(
  state: InstanceGameplayStore,
  instanceId: string,
): AnswerResultDto | null {
  return state.entries[instanceId]?.result ?? null;
}

/**
 * Select the last accepted player progress.
 * Returns `null` when no progress event has been received yet.
 */
export function selectGameplayProgress(
  state: InstanceGameplayStore,
  instanceId: string,
): PlayerProgressDto | null {
  return state.entries[instanceId]?.progress ?? null;
}

/**
 * Select the latest leaderboard snapshot.
 * Returns `[]` when no leaderboard update has been received yet.
 */
export function selectGameplayLeaderboard(
  state: InstanceGameplayStore,
  instanceId: string,
): LeaderboardEntryDto[] {
  return state.entries[instanceId]?.leaderboard ?? [];
}

/**
 * Select the accepted instance closure.
 * Returns `null` when the instance has not been closed yet.
 */
export function selectGameplayClosure(
  state: InstanceGameplayStore,
  instanceId: string,
): InstanceClosedEventDto | null {
  return state.entries[instanceId]?.closure ?? null;
}

/**
 * Select the final leaderboard extracted from closure.
 * Returns `null` when the instance has not been closed or the server
 * did not include the final leaderboard.
 */
export function selectGameplayFinalLeaderboard(
  state: InstanceGameplayStore,
  instanceId: string,
): FinalLeaderboardDto | null {
  return state.entries[instanceId]?.finalLeaderboard ?? null;
}

/**
 * Select the highest accepted `eventSequence` for a given event type
 * and instance. Returns `0` when the instance has not been touched yet.
 */
export function selectGameplayLastSequence(
  state: InstanceGameplayStore,
  instanceId: string,
  event: GameplayEventName,
): number {
  return state.entries[instanceId]?.lastEventSequence[event] ?? 0;
}

/**
 * Select the reconciling state for an instance.
 * Returns `false` when the instance has not been touched yet.
 */
export function selectGameplayIsReconciling(
  state: InstanceGameplayStore,
  instanceId: string,
): boolean {
  return state.entries[instanceId]?.isReconciling ?? false;
}
