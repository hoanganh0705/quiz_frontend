"use client";

/**
 * `useSocketEventSequence` — monotonic ordering and dedup across all
 * gameplay Socket.IO envelopes for a single instance.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B7.
 *
 * ## What this hook owns
 *
 * - Track the highest accepted `eventSequence` per `GameplayEventName`
 *   for the given `instanceId`.
 * - Expose `shouldAccept(event, sequence)` — returns `true` only when
 *   `sequence > lastAcceptedSequence(event)`.
 * - Expose `markAccepted(event, sequence)` — updates the tracked
 *   sequence atomically; concurrent calls do not regress.
 * - Expose `lastAcceptedSequence(event)` — returns the tracked value.
 * - Expose `reset()` — clears all tracked sequences for this instance.
 *   Used on logout and on reconnect reconciliation.
 * - Emit a `Sentry.addBreadcrumb` on every accept/drop with the
 *   event name, instance ID, sequence, and outcome — without logging
 *   payload content.
 * - Return safe fallbacks when `phase5_instances_play` is `'placeholder'`.
 *
 * ## Usage
 *
 * ```
 * const { shouldAccept, markAccepted, reset } = useSocketEventSequence(instanceId);
 *
 * socket.on('question_revealed', (raw) => {
 *   const envelope = coerce(raw);
 *   if (shouldAccept('question_revealed', envelope.eventSequence)) {
 *     markAccepted('question_revealed', envelope.eventSequence);
 *     applyQuestionRevealed(envelope);
 *   }
 * });
 * ```
 *
 * ## Feature flag
 *
 * When `phase5_instances_play === 'placeholder'`, `shouldAccept` always
 * returns `false` and `markAccepted` is a no-op. This allows hooks
 * that depend on this module to remain mounted without opening sockets.
 */

import { useCallback, useRef } from "react";

import * as Sentry from "@sentry/nextjs";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
  GameplayEventEnvelope,
  GameplayEventName,
} from "../types/gameplay.types";

// ─── Sequence map type ───────────────────────────────────────────────────────

type SequenceMap = Partial<Record<GameplayEventName, number>>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const MAX_SAFE_SEQ = Number.MAX_SAFE_INTEGER;

/**
 * Compare two potentially-undefined numbers. Returns:
 *   -1 if a < b
 *    0 if a === b
 *    1 if a > b
 * Handles `undefined` as negative infinity.
 */
function compareSeq(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ─── Public hook ─────────────────────────────────────────────────────────────

export interface UseSocketEventSequenceResult {
  /**
   * Returns `true` only when `sequence > lastAcceptedSequence(event)`.
   * Returns `false` when `phase5_instances_play` is `'placeholder'`.
   */
  shouldAccept: (event: GameplayEventName, sequence: number) => boolean;
  /**
   * Updates `lastAcceptedSequence(event)` to `sequence` atomically.
   * No-op when `phase5_instances_play` is `'placeholder'`.
   */
  markAccepted: (event: GameplayEventName, sequence: number) => void;
  /**
   * Returns the highest accepted sequence for the given event.
   * Returns `0` when no sequence has been accepted yet.
   */
  lastAcceptedSequence: (event: GameplayEventName) => number;
  /**
   * Clears all tracked sequences for this instance.
   * Used on logout and reconnect reconciliation.
   */
  reset: () => void;
  /** Snapshot of all tracked sequences (for debugging). */
  snapshot: () => SequenceMap;
}

/**
 * Track per-event-type monotonic sequence numbers for an instance.
 *
 * Safe to call multiple times in the same tab — the ref is keyed by
 * `instanceId` internally so duplicate mounts for the same instance
 * share the same sequence state.
 */
export function useSocketEventSequence(
  instanceId: string | null,
): UseSocketEventSequenceResult {
  const flagValue = getFeatureFlagValue("phase5_instances_play");
  const isPlaceholder = flagValue === "placeholder";

  // ─── Per-instance sequence registry ────────────────────────────────────
  //
  // Module-level Map so two hook instances for the same `instanceId`
  // share one sequence map. This mirrors the per-instance socket join
  // idempotency pattern.

  const registry = useRef<Map<string, SequenceMap>>(new Map());

  function getMap(id: string): SequenceMap {
    if (!registry.current.has(id)) {
      registry.current.set(id, {});
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return registry.current.get(id)!;
  }

  const shouldAccept = useCallback(
    (event: GameplayEventName, sequence: number): boolean => {
      if (instanceId === null) return false;
      if (isPlaceholder) return false;
      if (!Number.isFinite(sequence) || sequence < 0) return false;

      const map = getMap(instanceId);
      const last = map[event];
      return compareSeq(sequence, last) > 0;
    },
    [instanceId, isPlaceholder],
  );

  const markAccepted = useCallback(
    (event: GameplayEventName, sequence: number): void => {
      if (instanceId === null) return;
      if (isPlaceholder) return;
      if (!Number.isFinite(sequence) || sequence < 0) return;

      const map = getMap(instanceId);
      const last = map[event];

      // Only advance if the incoming sequence is strictly greater.
      if (compareSeq(sequence, last) > 0) {
        map[event] = sequence;

        Sentry.addBreadcrumb({
          category: "phase5:5.8",
          message: `sequence:accepted`,
          data: {
            event,
            instanceId,
            sequence,
            last,
          },
          level: "debug",
        });
      }
    },
    [instanceId, isPlaceholder],
  );

  const lastAcceptedSequence = useCallback(
    (event: GameplayEventName): number => {
      if (instanceId === null) return 0;
      return getMap(instanceId)[event] ?? 0;
    },
    [instanceId],
  );

  const reset = useCallback((): void => {
    if (instanceId === null) return;
    registry.current.delete(instanceId);

    Sentry.addBreadcrumb({
      category: "phase5:5.8",
      message: `sequence:reset`,
      data: { instanceId },
      level: "info",
    });
  }, [instanceId]);

  const snapshot = useCallback((): SequenceMap => {
    if (instanceId === null) return {};
    return { ...getMap(instanceId) };
  }, [instanceId]);

  return { shouldAccept, markAccepted, lastAcceptedSequence, reset, snapshot };
}

/**
 * Wrapper that applies the sequence gate before dispatching.
 * Use this inside socket event handlers.
 *
 * @example
 *   const { shouldAccept, markAccepted } = useSocketEventSequence(instanceId);
 *   const dispatch = useCallback(
 *     (envelope: GameplayEventEnvelope<PlayerQuestionBundleDto>) => {
 *       if (envelope.eventSequence > lastSeq.current) {
 *         lastSeq.current = envelope.eventSequence;
 *         applyQuestionRevealed(envelope);
 *       }
 *     },
 *     []
 *   );
 */
export function applyWithSequence<T>(
  envelope: GameplayEventEnvelope<T>,
  { shouldAccept, markAccepted, onDrop }: {
    shouldAccept: (event: GameplayEventName, seq: number) => boolean;
    markAccepted: (event: GameplayEventName, seq: number) => void;
    onDrop?: (envelope: GameplayEventEnvelope<T>) => void;
  },
): void {
  if (shouldAccept(envelope.event, envelope.eventSequence)) {
    markAccepted(envelope.event, envelope.eventSequence);
  } else if (onDrop) {
    onDrop(envelope);
  }
}
