"use client";

/**
 * `useRealtimeGameplay` — typed bridge that wires `useInstanceGameSocket`
 * Socket.IO envelopes into the per-instance gameplay store.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.C1 (bridge portion).
 *
 * ## What this hook owns
 *
 * - Subscribe to `useInstanceGameSocket` envelopes on mount and
 *   unsubscribe on unmount.
 * - Dispatch each typed envelope to the correct store action, applying
 *   sequence-based dedup via `useSocketEventSequence` (shared singleton
 *   per instance — the same registry used by `useQuestionRevealed`,
 *   `useInstanceLifecycle`, and `useLiveLeaderboard`).
 * - Gate the bridge while `isReconciling === true` (from
 *   `useReconnectReconciliation`) so no realtime delta is applied
 *   during reconciliation.
 * - Expose a single unified read from the store.
 *
 * ## Server authority
 *
 * The bridge applies realtime deltas optimistically and lets the next
 * REST read confirm. The bridge never mutates REST/SWR caches directly.
 * The per-instance gameplay store is the sole recipient of realtime state.
 *
 * ## Feature flag
 *
 * Returns safe fallbacks when `phase5_instances_play === 'placeholder'`.
 */

import { useCallback, useEffect, useRef } from "react";

import {
  type AnswerResultDto,
  type FinalLeaderboardDto,
  type GameplayEventEnvelope,
  type InstanceClosedEventDto,
  type LeaderboardEntryDto,
  type LeaderboardUpdatedEventDto,
  type PlayerQuestionBundleDto,
  type PlayerProgressDto,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import { useReconnectReconciliation } from "./useReconnectReconciliation";
import {
  useInstanceGameplayStore,
  selectGameplayBundle,
  selectGameplayTiming,
  selectGameplaySubmission,
  selectGameplayResult,
  selectGameplayProgress,
  selectGameplayLeaderboard,
  selectGameplayClosure,
  selectGameplayFinalLeaderboard,
  selectGameplayIsReconciling,
} from "../stores/instanceGameplay.store";

// ─── Result type ─────────────────────────────────────────────────────────

export interface UseRealtimeGameplayResult {
  /** Latest accepted question bundle. `null` before the first `question_revealed`. */
  bundle: PlayerQuestionBundleDto | null;
  /** Server-provided timing contract. `null` before the first timing envelope. */
  timing: ReturnType<typeof selectGameplayTiming>;
  /** Last accepted answer submission acknowledgement. `null` before submission. */
  submission: ReturnType<typeof selectGameplaySubmission>;
  /** Last accepted answer result. `null` before the first result. */
  result: AnswerResultDto | null;
  /** Last accepted player progress. `null` before the first progress event. */
  progress: PlayerProgressDto | null;
  /** Latest leaderboard entries. `[]` before the first update. */
  leaderboard: LeaderboardEntryDto[];
  /** Accepted instance closure. `null` before closure. */
  closure: InstanceClosedEventDto | null;
  /** Final leaderboard from closure. `null` before closure. */
  finalLeaderboard: FinalLeaderboardDto | null;
  /** `true` while a reconnect reconciliation is in flight. */
  isReconciling: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useRealtimeGameplay(
  instanceId: string | null,
): UseRealtimeGameplayResult {
  const { subscribe } = useInstanceGameSocket(instanceId);
  const { shouldAccept, markAccepted } = useSocketEventSequence(instanceId);
  const { isReconciling } = useReconnectReconciliation(instanceId);
  const {
    applyQuestionRevealed,
    applyAnswerResult,
    applyLeaderboardUpdated,
    applyInstanceClosed,
    applyFinalLeaderboard,
    applyPlayerProgress,
  } = useInstanceGameplayStore.getState();

  // Track whether the bridge is currently gated.
  const gatedRef = useRef(false);
  gatedRef.current = isReconciling;

  const handleEnvelope = useCallback(
    (envelope: GameplayEventEnvelope<unknown>) => {
      // Gate: do not apply realtime deltas while reconciling.
      if (gatedRef.current) return;

      switch (envelope.event) {
        case "question_revealed": {
          const typed = envelope as GameplayEventEnvelope<PlayerQuestionBundleDto>;
          if (!shouldAccept(typed.event, typed.eventSequence)) return;
          markAccepted(typed.event, typed.eventSequence);
          applyQuestionRevealed(typed);
          break;
        }
        case "answer_result": {
          const typed = envelope as GameplayEventEnvelope<AnswerResultDto>;
          if (!shouldAccept(typed.event, typed.eventSequence)) return;
          markAccepted(typed.event, typed.eventSequence);
          applyAnswerResult(typed);
          break;
        }
        case "leaderboard_updated": {
          const typed = envelope as GameplayEventEnvelope<LeaderboardUpdatedEventDto>;
          if (!shouldAccept(typed.event, typed.eventSequence)) return;
          markAccepted(typed.event, typed.eventSequence);
          applyLeaderboardUpdated(typed);
          break;
        }
        case "instance_closed": {
          const typed = envelope as GameplayEventEnvelope<InstanceClosedEventDto>;
          if (!shouldAccept(typed.event, typed.eventSequence)) return;
          markAccepted(typed.event, typed.eventSequence);
          applyInstanceClosed(typed);
          break;
        }
        case "instance_final_leaderboard": {
          const typed = envelope as GameplayEventEnvelope<FinalLeaderboardDto>;
          if (!shouldAccept(typed.event, typed.eventSequence)) return;
          markAccepted(typed.event, typed.eventSequence);
          applyFinalLeaderboard(typed);
          break;
        }
        default:
          break;
      }
    },
    [
      shouldAccept,
      markAccepted,
      applyQuestionRevealed,
      applyAnswerResult,
      applyLeaderboardUpdated,
      applyInstanceClosed,
      applyFinalLeaderboard,
    ],
  );

  useEffect(() => {
    if (instanceId === null) return;
    return subscribe(handleEnvelope);
  }, [instanceId, subscribe, handleEnvelope]);

  // ─── Select from store ─────────────────────────────────────────────────

  const bundle = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayBundle(s, instanceId) : null,
  );
  const timing = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayTiming(s, instanceId) : null,
  );
  const submission = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplaySubmission(s, instanceId) : null,
  );
  const result = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayResult(s, instanceId) : null,
  );
  const progress = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayProgress(s, instanceId) : null,
  );
  const leaderboard = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayLeaderboard(s, instanceId) : [],
  );
  const closure = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayClosure(s, instanceId) : null,
  );
  const finalLeaderboard = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayFinalLeaderboard(s, instanceId) : null,
  );
  const reconciling = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayIsReconciling(s, instanceId) : false,
  );

  return {
    bundle,
    timing,
    submission,
    result,
    progress,
    leaderboard,
    closure,
    finalLeaderboard,
    isReconciling: reconciling,
  };
}
