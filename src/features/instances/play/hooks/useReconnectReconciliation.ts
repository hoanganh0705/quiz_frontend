"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getInstance } from "@/features/instances/services";
import { getInstanceLeaderboard } from "@/features/instances/services";
import { getQueryClient } from "@/providers/QueryProvider";

import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useInstanceGameplayStore } from "../stores/instanceGameplay.store";

export interface UseReconnectReconciliationResult {
  isReconciling: boolean;

  lastReconciledAt: string | null;

  reconcile: () => Promise<void>;
}

export function useReconnectReconciliation(
  instanceId: string | null,
): UseReconnectReconciliationResult {
  const { connectionState } = useInstanceGameSocket(instanceId);
  const { setReconciling } = useInstanceGameplayStore.getState();

  const [isReconciling, setIsReconciling] = useState(false);
  const [lastReconciledAt, setLastReconciledAt] = useState<string | null>(null);
  const reconcilingRef = useRef(false);

  const reconcile = useCallback(async (): Promise<void> => {
    if (instanceId === null) return;
    if (reconcilingRef.current) return;

    reconcilingRef.current = true;
    setIsReconciling(true);
    setReconciling(instanceId, true);

    try {
      await getInstance(instanceId);

      await getInstanceLeaderboard(instanceId);

      try {
        const qc = getQueryClient();
        void qc.invalidateQueries({
          queryKey: ["instances", "leaderboard", instanceId],
        });
        void qc.invalidateQueries({
          queryKey: ["instances", "detail", instanceId],
        });
      } catch {
        // ignore
      }

      setLastReconciledAt(new Date().toISOString());
    } finally {
      reconcilingRef.current = false;
      setIsReconciling(false);
      setReconciling(instanceId, false);
    }
  }, [instanceId, setReconciling]);

  const lastConnectionStateRef = useRef(connectionState);

  useEffect(() => {
    if (instanceId === null) return;

    const wasReconnecting = lastConnectionStateRef.current === "reconnecting";
    const isNowConnected = connectionState === "connected";

    lastConnectionStateRef.current = connectionState;

    if (wasReconnecting && isNowConnected) {
      void reconcile();
    }
  }, [connectionState, instanceId, reconcile]);

  return {
    isReconciling,
    lastReconciledAt,
    reconcile,
  };
}
