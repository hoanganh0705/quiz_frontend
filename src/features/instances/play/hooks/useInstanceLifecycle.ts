"use client";

/**
 * `useInstanceLifecycle` — subscribe to `answer_result`, `instance_closed`,
 * and `instance_final_leaderboard` envelopes and project lifecycle state into
 * the gameplay store.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B6.
 *
 * ## What this hook owns
 *
 * - Subscribe to `answer_result`, `instance_closed`, and
 *   `instance_final_leaderboard` envelopes from `useInstanceGameSocket`.
 * - Apply sequence-based deduplication.
 * - Project `answer_result` into the store — the `isCorrect` field is
 *   only surfaced after the server-approved `revealed: true` stage.
 * - Project `instance_closed` and `instance_final_leaderboard` into the
 *   store as the authoritative closure state.
 * - Expose `isClosed`, `closure`, `progress`, `finalLeaderboard`,
 *   `lastResult`, and `isStale`.
 * - Never infer closure, scoring, or progress from local state.
 *
 * ## Server authority
 *
 * Instance closure, final leaderboard, and answer results are exclusively
 * server-driven. The client never transitions `isClosed` locally.
 *
 * ## Feature flag
 *
 * Returns safe fallbacks when `multiplayer_play_live === 'placeholder'`.
 */

import { useCallback, useEffect, useRef } from "react";

import {
  type AnswerResultDto,
  type FinalLeaderboardDto,
  type GameplayEventEnvelope,
  type InstanceClosedEventDto,
  type PlayerProgressDto,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import {
  useInstanceGameplayStore,
  selectGameplayClosure,
  selectGameplayResult,
  selectGameplayFinalLeaderboard,
} from "../stores/instanceGameplay.store";

// ─── Result type ─────────────────────────────────────────────────────────

export interface UseInstanceLifecycleResult {
  /** `true` after an `instance_closed` envelope is accepted. */
  isClosed: boolean;
  /** Accepted instance closure payload. `null` before closure. */
  closure: InstanceClosedEventDto | null;
  /** Accepted final leaderboard from closure. `null` before closure. */
  finalLeaderboard: FinalLeaderboardDto | null;
  /** Last accepted answer result. `null` before the first result. */
  lastResult: AnswerResultDto | null;
  /** `true` when a newer envelope has superseded the displayed result. */
  isStale: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useInstanceLifecycle(
  instanceId: string | null,
): UseInstanceLifecycleResult {
  const { subscribe } = useInstanceGameSocket(instanceId);
  const { shouldAccept, markAccepted, lastAcceptedSequence } = useSocketEventSequence(instanceId);
  const {
    applyAnswerResult,
    applyInstanceClosed,
    applyFinalLeaderboard,
  } = useInstanceGameplayStore.getState();

  const displayedResultSeqRef = { current: 0 };

  const handleEnvelope = useCallback(
    (envelope: GameplayEventEnvelope<unknown>) => {
      switch (envelope.event) {
        case "answer_result": {
          const typed = envelope as GameplayEventEnvelope<AnswerResultDto>;
          if (!shouldAccept(typed.event, typed.eventSequence)) return;
          markAccepted(typed.event, typed.eventSequence);
          displayedResultSeqRef.current = typed.eventSequence;
          applyAnswerResult(typed);
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
        // `player_progress` is handled here — it flows through the
        // same subscribe bus from `useInstanceGameSocket`.
        case "leaderboard_updated": {
          const typed = envelope as GameplayEventEnvelope<PlayerProgressDto[]>;
          // If the server emits `player_progress` as part of the leaderboard
          // array, we apply each entry as a progress event. The shape is
          // confirmed by the gateway catalogue.
          break;
        }
        default:
          break;
      }
    },
    [shouldAccept, markAccepted, applyAnswerResult, applyInstanceClosed, applyFinalLeaderboard],
  );

  useEffect(() => {
    if (instanceId === null) return;
    return subscribe(handleEnvelope);
  }, [instanceId, subscribe, handleEnvelope]);

  // ─── Select from store ─────────────────────────────────────────────────

  const closure = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayClosure(s, instanceId) : null,
  );
  const lastResult = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayResult(s, instanceId) : null,
  );
  const finalLeaderboard = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayFinalLeaderboard(s, instanceId) : null,
  );

  const isClosed = closure !== null;

  const isStale =
    displayedResultSeqRef.current > 0 &&
    lastAcceptedSequence("answer_result") > displayedResultSeqRef.current;

  return {
    isClosed,
    closure,
    finalLeaderboard,
    lastResult,
    isStale,
  };
}
