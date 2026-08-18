"use client";

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

export interface UseReconnectReconciliationResult {

isReconciling: boolean;

lastReconciledAt: string | null;

reconcile: () => Promise<void>;
}

export function useReconnectReconciliation(
instanceId: string | null,
): UseReconnectReconciliationResult {
const flagValue = getFeatureFlagValue("multiplayer_play_live");
const isPlaceholder = flagValue === "placeholder";

const { connectionState } = useInstanceGameSocket(instanceId);
const { reset: resetSequence } = useSocketEventSequence(instanceId);
const { setReconciling } = useInstanceGameplayStore.getState();

const entry = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayEntry(s, instanceId) : null,
  );

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
if (isPlaceholder) return;

const wasReconnecting =
lastConnectionStateRef.current === "reconnecting";
const isNowConnected = connectionState === "connected";

lastConnectionStateRef.current = connectionState;

if (wasReconnecting && isNowConnected) {
void reconcile();
    }
  }, [connectionState, instanceId, isPlaceholder, reconcile]);

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
