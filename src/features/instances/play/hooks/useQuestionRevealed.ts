"use client";

/**
 * `useQuestionRevealed` — subscribe to `question_revealed` envelopes and
 * project the current player-safe question bundle into the gameplay store.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B2.
 *
 * ## What this hook owns
 *
 * - Subscribe to `question_revealed` envelopes from `useInstanceGameSocket`.
 * - Apply sequence-based deduplication: drop envelopes with
 *   `eventSequence <= lastAcceptedSequence`.
 * - Project the bundle into the per-instance gameplay store via
 *   `applyQuestionRevealed`.
 * - Expose the current player-safe bundle, timing, `hasRevealed` flag,
 *   and `isStale` flag.
 * - Never expose author-only correctness fields.
 *
 * ## Server authority
 *
 * The question, options, and timing are exclusively sourced from the server.
 * The client never synthesizes a question locally.
 *
 * ## Feature flag
 *
 * Returns safe fallbacks when `multiplayer_play_live === 'placeholder'`.
 */

import { useCallback, useEffect } from "react";

import {
  type GameplayEventEnvelope,
  type PlayerQuestionBundleDto,
  type QuestionTimingDto,
} from "../types/gameplay.types";
import {
  useInstanceGameSocket,
} from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import {
  useInstanceGameplayStore,
  selectGameplayBundle,
  selectGameplayTiming,
} from "../stores/instanceGameplay.store";

// ─── Result type ─────────────────────────────────────────────────────────

export interface UseQuestionRevealedResult {
  /** Current player-safe question bundle. `null` before the first reveal. */
  bundle: PlayerQuestionBundleDto | null;
  /** Server-provided timing contract. `null` before the first reveal. */
  timing: QuestionTimingDto | null;
  /** `true` after the first `question_revealed` envelope is accepted. */
  hasRevealed: boolean;
  /** `true` when a newer envelope has superseded the displayed bundle. */
  isStale: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useQuestionRevealed(
  instanceId: string | null,
): UseQuestionRevealedResult {
  const { subscribe } = useInstanceGameSocket(instanceId);
  const { shouldAccept, markAccepted, lastAcceptedSequence } = useSocketEventSequence(instanceId);
  const { applyQuestionRevealed } = useInstanceGameplayStore.getState();

  // Track the displayed sequence so we can detect stale envelopes.
  const displayedSeqRef = { current: 0 };

  const handleEnvelope = useCallback(
    (envelope: GameplayEventEnvelope<unknown>) => {
      if (envelope.event !== "question_revealed") return;
      const typed = envelope as GameplayEventEnvelope<PlayerQuestionBundleDto>;

      if (!shouldAccept(typed.event, typed.eventSequence)) return;

      markAccepted(typed.event, typed.eventSequence);
      displayedSeqRef.current = typed.eventSequence;
      applyQuestionRevealed(typed);
    },
    [shouldAccept, markAccepted, applyQuestionRevealed],
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

  // `hasRevealed` is true when a bundle has ever been accepted.
  const hasRevealed = bundle !== null;

  // `isStale` is true when the accepted envelope has a higher sequence
  // than what we're currently displaying (e.g. timer expired and no
  // further envelope yet).
  const isStale =
    displayedSeqRef.current > 0 &&
    lastAcceptedSequence("question_revealed") > displayedSeqRef.current;

  return {
    bundle,
    timing,
    hasRevealed,
    isStale,
  };
}
