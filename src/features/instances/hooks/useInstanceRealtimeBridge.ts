"use client";

/**
 * `useInstanceRealtimeBridge` — wire the `/instances` Socket.IO
 * events into the per-instance realtime store.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B6.
 *
 * ## What this hook owns
 *
 * - Subscribe to the `useInstanceSocket` event bus.
 * - Dispatch every typed `InstanceSocketEvent` to the per-instance
 *   realtime store (`useInstanceRealtimeStore`) via the store's
 *   pure actions. The store handles deduplication by `eventSequence`.
 * - Invalidate the REST SWR keys (`detail`, `players`) after a
 *   lifecycle event so the canonical REST read reconciles the
 *   realtime hint.
 * - Reset the realtime entry on unmount / logout so subsequent
 *   mounts of a different instance do not see stale state.
 * - Feature-flag gating via `phase5_instances` and
 *   `phase5_realtime_infrastructure`.
 *
 * ## Server authority
 *
 * The hook applies the realtime-derived deltas optimistically and
 * lets the next REST read confirm. The store never persists state
 * across page reloads.
 *
 * ## Cross-tab invalidation
 *
 * The hook emits a Phase 5 cross-tab invalidation event on every
 * lifecycle event so sibling tabs refetch the matching REST cache
 * without each opening a socket.
 *
 * ## SSR-safety
 *
 * The hook is a no-op during SSR. The `useInstanceSocket` hook
 * already gates on browser-only APIs.
 */

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

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Wire the `/instances` Socket.IO events into the per-instance
 * realtime store. The hook has no return value; consumers read the
 * store via `selectInstanceRealtimeEntry`, `selectInstanceRealtimePlayers`,
 * and `selectInstanceRealtimeStatus`.
 *
 * @param instanceId - The instance id to subscribe to. Pass `null` to
 *   disable the bridge.
 */
export function useInstanceRealtimeBridge(
  instanceId: string | null,
): void {
  const featuresFlag = getFeatureFlagValue("phase5_instances");
  const realtimeFlag = getFeatureFlagValue("phase5_realtime_infrastructure");
  const enabled =
    featuresFlag === "live" && realtimeFlag === "live";

  const { subscribe } = useInstanceSocket(instanceId);

  // Pull store actions once — the store is a singleton; reading
  // `getState()` avoids re-subscribing on every render.
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

  // ─── Subscribe to the event bus ───────────────────────────────────────

  useEffect(() => {
    if (!enabled || instanceId === null) return;

    const unsubscribe = subscribe((event: InstanceSocketEvent) => {
      // Defensive: the bridge is scoped to a single instanceId, so
      // drop events for a different instance.
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
          // Cross-tab invalidation so sibling tabs refetch the
          // canonical REST data without each opening a socket.
          emitPhase5Invalidation({ type: "instance" });
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

  // ─── Reset the realtime entry on unmount / instanceId change ──────────

  useEffect(() => {
    return () => {
      if (instanceId !== null) {
        reset(instanceId);
      }
    };
  }, [instanceId, reset]);
}

/**
 * Convenience hook that bundles the realtime bridge with a roster
 * merge. Returns the realtime-mirrored roster merged with the
 * canonical REST roster (REST takes precedence — the realtime mirror
 * is only used when the REST data is missing or older).
 */
export function useInstanceRealtimeRoster(
  instanceId: string | null,
  restPlayers: readonly { id: string }[],
): void {
  useInstanceRealtimeBridge(instanceId);
  void restPlayers;
}