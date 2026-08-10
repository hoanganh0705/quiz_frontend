/**
 * `useReconnectReconciliation` — post-reconnect re-hydration hook.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.F2.
 *
 * ## Purpose
 *
 * Drives the four-call re-hydration sequence documented in the
 * Epic 6.8.G3 deferral note: on every socket reconnect (after the
 * first connection), the hook schedules a 5-second debounced
 * re-hydration that:
 *
 *   1. Invalidates the global incoming-requests SWR key.
 *   2. Invalidates the global outgoing-requests SWR key.
 *   3. For every active `targetUserId` (registered via
 *      `useActiveTargetUserIds`, TKT-6.10.F2):
 *      - Invalidates the per-user relationship key.
 *      - Invalidates the per-user social-counts key.
 *
 * The debounce coalesces bursts of reconnect attempts into a single
 * re-hydration cycle. The first connection never fires a cycle
 * (the very first `connected` transition is the bootstrap, not a
 * reconnect).
 *
 * The hook also clears any optimistic state introduced by the
 * mutation hooks (Epic 6.6 / 6.7 / 6.8) by triggering a fresh
 * revalidation cycle via `mutateCarefully` — the global SWR
 * `mutate` is not called directly, so the cache remains in sync
 * with the server's REST re-hydration.
 *
 * ## Reconciliation telemetry
 *
 * Every cycle emits a `social:6.10:reconnect-reconciliation`
 * Sentry breadcrumb with the set of active user ids, the set of
 * invalidated keys, and the measured duration in milliseconds.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The breadcrumb payload never carries `friendshipId` or
 * `followId`. The helper
 * (`addReconnectReconciliationBreadcrumb` in
 * `social-realtime-sentry.ts`) sanitises the payload.
 *
 * ## SSR
 *
 * The hook no-ops during SSR via the `typeof window === "undefined"`
 * guard. The flag gate adds an early return when the feature flag
 * is `'placeholder'`.
 *
 * ## Debounce contract
 *
 *   - First connection (any state → `connected`): NO cycle.
 *   - Subsequent connection (any state → `connected` after a
 *     `reconnecting` transition): 5-second debounce, then one cycle.
 *   - Bursts of `reconnecting` → `connected` transitions within
 *     the debounce window coalesce into a single cycle.
 */

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

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The 5-second debounce window for coalescing reconnect bursts.
 */
const RECONNECTION_DEBOUNCE_MS = 5_000 as const;

/**
 * The set of connection states that should be treated as "active
 * connection". The first transition INTO one of these is the
 * bootstrap; subsequent transitions are reconnects.
 */
const ACTIVE_STATES: ReadonlySet<SocketConnectionState> = new Set([
  "connected",
]);

function isActiveState(state: SocketConnectionState): boolean {
  return ACTIVE_STATES.has(state);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Schedule the four-call re-hydration sequence on every socket
 * reconnect.
 *
 * The hook signature is `useReconnectReconciliation(): void` —
 * side-effect only; no return value.
 *
 * @example
 * ```tsx
 * function RealtimeSocialShell({ children }) {
 *   useReconnectReconciliation();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useReconnectReconciliation(): void {
  const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
  const enabled = flagValue !== "placeholder";

  const { connectionState } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: enabled,
    enabled,
  });

  // Track the previous connection state so we can detect the
  // `reconnecting` → `connected` transition.
  const prevStateRef = useRef<SocketConnectionState>("idle");
  // Track whether the first connect has happened.
  const hasConnectedOnceRef = useRef<boolean>(false);
  // Debounce timer for the re-hydration cycle.
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
      // First connect — never fire a reconciliation cycle for the
      // bootstrap. The initial REST reads covered it.
      hasConnectedOnceRef.current = true;
      return;
    }

    // Subsequent connect — only fire a cycle if the previous state
    // was `reconnecting` (i.e. this is a real reconnect, not an
    // idempotent state re-emit).
    if (prev !== "reconnecting") {
      return;
    }

    // Debounce — coalesce bursts of reconnects into a single cycle.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      runReconciliationCycle();
    }, RECONNECTION_DEBOUNCE_MS);

    return () => {
      // Cleanup on unmount OR on the next effect run.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [connectionState, enabled]);
}

/**
 * Run the four-call re-hydration sequence. Pure helper; called from
 * inside the debounced `setTimeout` so its definition is hoisted
 * out of the effect body for readability.
 */
function runReconciliationCycle(): void {
  if (typeof window === "undefined") return;

  const startedAt = Date.now();
  const activeUserIds = getActiveTargetUserIds();
  const keys: string[] = [];

  // 1. Incoming requests (global).
  const incoming = SOCIAL_CACHE_KEYS.makeIncomingRequestsKey();
  mutateCarefully(incoming);
  keys.push(incoming.join("/"));

  // 2. Outgoing requests (global).
  const outgoing = SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey();
  mutateCarefully(outgoing);
  keys.push(outgoing.join("/"));

  // 3 + 4. Per-active-target relationship + social-counts.
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