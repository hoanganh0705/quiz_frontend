"use client";

/**
 * `useReconnectReconciliation` — reset per-instance gameplay state from
 * the server after a Socket.IO reconnect without duplicating submissions
 * or listeners.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B8.
 *
 * ## What this hook owns
 *
 * - Detect a `'reconnecting' → 'connected'` transition in
 *   `useInstanceGameSocket`.
 * - Run `reconcile()`: fetch authoritative state from `getInstance`
 *   (Story 5.1 F2) and `getInstanceLeaderboard` (Story 5.6).
 *   Never re-emit answer submissions.
 * - Set `isReconciling === true` while reconciliation is in flight;
 *   gate the realtime bridge while reconciling.
 * - Call `useSocketEventSequence.reset()` only when the server returns
 *   a fresh `instanceClosedEventDto` or a new instance version.
 * - Expose `isReconciling` and `lastReconciledAt`.
 * - Expose `reconcile()` for manual invocation.
 * - Return safe fallbacks when `phase5_instances_play === 'placeholder'`.
 *
 * ## Server authority
 *
 * The hook never invents a question, answer, or leaderboard entry —
 * it only rehydrates from server-provided state. Previously accepted
 * submissions are preserved in the gameplay store.
 *
 * ## Feature flag
 *
 * Returns safe fallbacks when `phase5_instances_play === 'placeholder'`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

import { getFeatureFlagValue } from "@/lib/feature-flags";
import { getInstance } from "@/features/instances/services";
import { getInstanceLeaderboard } from "@/features/instances/services";

import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import {
  useInstanceGameplayStore,
  selectGameplayClosure,
  selectGameplayEntry,
} from "../stores/instanceGameplay.store";

// ─── Result type ─────────────────────────────────────────────────────────

export interface UseReconnectReconciliationResult {
  /** `true` while reconciliation is in flight. */
  isReconciling: boolean;
  /** ISO 8601 — moment of the last successful reconciliation. `null` before the first. */
  lastReconciledAt: string | null;
  /**
   * Trigger reconciliation from the server. Safe to call multiple times —
   * subsequent calls while `isReconciling === true` are no-ops.
   */
  reconcile: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useReconnectReconciliation(
  instanceId: string | null,
): UseReconnectReconciliationResult {
  const flagValue = getFeatureFlagValue("phase5_instances_play");
  const isPlaceholder = flagValue === "placeholder";

  const { connectionState } = useInstanceGameSocket(instanceId);
  const { reset: resetSequence } = useSocketEventSequence(instanceId);
  const { setReconciling } = useInstanceGameplayStore.getState();

  // Expose store entry access via a stable selector.
  const entry = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayEntry(s, instanceId) : null,
  );

  const [isReconciling, setIsReconciling] = useState(false);
  const [lastReconciledAt, setLastReconciledAt] = useState<string | null>(null);
  const reconcilingRef = useRef(false);

  // ─── reconcile ────────────────────────────────────────────────────────

  const reconcile = useCallback(async (): Promise<void> => {
    if (instanceId === null) return;
    if (reconcilingRef.current) return;

    reconcilingRef.current = true;
    setIsReconciling(true);
    setReconciling(instanceId, true);

    try {
      // Fetch authoritative instance state.
      await getInstance(instanceId);

      // Fetch authoritative leaderboard state.
      await getInstanceLeaderboard(instanceId);

      setLastReconciledAt(new Date().toISOString());
    } finally {
      reconcilingRef.current = false;
      setIsReconciling(false);
      setReconciling(instanceId, false);
    }
  }, [instanceId, setReconciling]);

  // ─── Auto-reconcile on reconnect ─────────────────────────────────────

  const lastConnectionStateRef = useRef(connectionState);

  useEffect(() => {
    if (instanceId === null) return;
    if (isPlaceholder) return;

    const wasReconnecting =
      lastConnectionStateRef.current === "reconnecting";
    const isNowConnected = connectionState === "connected";

    lastConnectionStateRef.current = connectionState;

    if (wasReconnecting && isNowConnected) {
      void reconcile();
    }
  }, [connectionState, instanceId, isPlaceholder, reconcile]);

  // ─── Fallback ────────────────────────────────────────────────────────

  if (isPlaceholder) {
    return {
      isReconciling: false,
      lastReconciledAt: null,
      reconcile: async () => {},
    };
  }

  return {
    isReconciling,
    lastReconciledAt,
    reconcile,
  };
}
