"use client";

import { useEffect } from "react";
import { mutate as globalMutate } from "swr";

import { getFeatureFlagValue } from "@/lib/feature-flags";
import { emitPhase5Invalidation } from "@/lib/realtime";

import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import {
INSTANCE_CACHE_KEYS,
type InstanceSocketEvent,
} from "@/features/instances/types/instance.types";

import {
useInstanceRealtimeStore,
} from "../stores/useInstanceRealtimeStore";

export function useInstanceRealtimeBridge(
instanceId: string | null,
): void {
const featuresFlag = getFeatureFlagValue("multiplayer_instances_live");
const realtimeFlag = getFeatureFlagValue("realtime_infrastructure_live");
const enabled =
featuresFlag === "live" && realtimeFlag === "live";

const { subscribe } = useInstanceSocket(instanceId);

const applyPlayerJoined = useInstanceRealtimeStore(
(state) => state.applyPlayerJoined,
  );
const applyPlayerLeft = useInstanceRealtimeStore(
(state) => state.applyPlayerLeft,
  );
const applyLifecycleEvent = useInstanceRealtimeStore(
(state) => state.applyLifecycleEvent,
  );
const reset = useInstanceRealtimeStore((state) => state.reset);

useEffect(() => {
if (!enabled || instanceId === null) return;

const unsubscribe = subscribe((event: InstanceSocketEvent) => {

if ("instanceId" in event && event.instanceId !== instanceId) {
return;
      }

switch (event.type) {
case "player_joined":
applyPlayerJoined(event);
break;
case "player_left":
applyPlayerLeft(event);
break;
case "instance_started":
case "instance_closed":
case "instance_cancelled":
case "countdown_started":
case "countdown_cancelled":
applyLifecycleEvent(event);

emitPhase5Invalidation({ type: "instance", instanceId: instanceId ?? "" });
if (instanceId !== null) {
void globalMutate(
INSTANCE_CACHE_KEYS.detail(instanceId),
undefined,
{ revalidate: true },
            );
          }
break;
default:
break;
      }
    });

return () => {
unsubscribe();
    };
  }, [
enabled,
instanceId,
subscribe,
applyPlayerJoined,
applyPlayerLeft,
applyLifecycleEvent,
  ]);

useEffect(() => {
return () => {
if (instanceId !== null) {
reset(instanceId);
      }
    };
  }, [instanceId, reset]);
}

export function useInstanceRealtimeRoster(
instanceId: string | null,
restPlayers: readonly { id: string }[],
): void {
useInstanceRealtimeBridge(instanceId);
void restPlayers;
}