

"use client";

import { useEffect, useRef } from "react";

import { useSocket, NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import type { SocketConnectionState } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
addReconnectReconciliationBreadcrumb,
} from "@/lib/social/social-realtime-sentry";

import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import { getActiveTargetUserIds } from "@/features/social/hooks/useActiveTargetUserIds";

const RECONNECTION_DEBOUNCE_MS = 5_000 as const;

const ACTIVE_STATES: ReadonlySet<SocketConnectionState> = new Set([
"connected",
]);

function isActiveState(state: SocketConnectionState): boolean {
return ACTIVE_STATES.has(state);
}

export function useReconnectReconciliation(): void {
const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
const enabled = flagValue !== "placeholder";

const { connectionState } = useSocket(NOTIFICATIONS_NAMESPACE, {
autoConnect: enabled,
enabled,
  });

const prevStateRef = useRef<SocketConnectionState>("idle");

const hasConnectedOnceRef = useRef<boolean>(false);

const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
if (typeof window === "undefined") return;
if (!enabled) return;

const prev = prevStateRef.current;
prevStateRef.current = connectionState;

if (!isActiveState(connectionState)) {
return;
    }

if (!hasConnectedOnceRef.current) {

hasConnectedOnceRef.current = true;
return;
    }

if (prev !== "reconnecting") {
return;
    }

if (timerRef.current !== null) {
clearTimeout(timerRef.current);
    }
timerRef.current = setTimeout(() => {
timerRef.current = null;
runReconciliationCycle();
    }, RECONNECTION_DEBOUNCE_MS);

return () => {

if (timerRef.current !== null) {
clearTimeout(timerRef.current);
timerRef.current = null;
      }
    };
  }, [connectionState, enabled]);
}

function runReconciliationCycle(): void {
if (typeof window === "undefined") return;

const startedAt = Date.now();
const activeUserIds = getActiveTargetUserIds();
const keys: string[] = [];

const incoming = SOCIAL_CACHE_KEYS.makeIncomingRequestsKey();
mutateCarefully(incoming);
keys.push(incoming.join("/"));

const outgoing = SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey();
mutateCarefully(outgoing);
keys.push(outgoing.join("/"));

for (const targetUserId of activeUserIds) {
const relKey = SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId);
mutateCarefully(relKey);
keys.push(relKey.join("/"));

const countsKey = SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId);
mutateCarefully(countsKey);
keys.push(countsKey.join("/"));
  }

const durationMs = Date.now() - startedAt;
addReconnectReconciliationBreadcrumb({
activeUserIds: Array.from(activeUserIds),
invalidationKeys: keys,
durationMs,
  });
}