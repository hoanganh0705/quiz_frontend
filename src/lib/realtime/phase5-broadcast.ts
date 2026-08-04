/**
 * Phase 5 cross-tab invalidation — single import surface.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.B2.
 *
 * ## Purpose
 *
 * Phase 5 service wrappers and realtime hooks need to invalidate SWR caches
 * in sibling browser tabs when the user acts in one tab. This module provides
 * the Phase 5 `BroadcastChannel` integration for the four Phase 5 source types:
 *
 *   1. `notification` — notification list / unread count changed
 *   2. `instance`     — instance roster / state changed
 *   3. `tournament`   — tournament registration / status changed
 *   4. `achievement`  — badge earned / progress changed
 *
 * ## Channel naming
 *
 * Phase 5 reuses the `getCurrentTabId()` from `broadcast-channel.ts`
 * (Phase 2) for same-tab filtering. The channel name is
 * `phase5/invalidation` — distinct from Phase 4's per-feature channels
 * (`attempts/changed`, `profile/updated`).
 *
 * ## Same-tab filtering
 *
 * Inherited from `broadcast-channel.ts`'s `getCurrentTabId()` — every tab
 * has a unique tab id persisted in `sessionStorage`. The broadcast handler
 * ignores messages whose `tabId` matches the current tab, preventing event
 * loops when the same tab both emits and listens.
 */

import { getCurrentTabId } from "@/lib/api/core/broadcast-channel";

/**
 * Phase 5 invalidation channel name. Matches the Phase 4 `phase4/invalidation`
 * naming but is a separate channel so Phase 4 and Phase 5 invalidations are
 * processed independently.
 */
export const PHASE5_INVALIDATION_CHANNEL = "phase5/invalidation" as const;

/**
 * The four Phase 5 invalidation source types. Used as the discriminator
 * in `Phase5InvalidationPayload.type`.
 */
export type Phase5InvalidationSource =
  | "notification"
  | "instance"
  | "tournament"
  | "achievement";

// ─── Event envelopes ─────────────────────────────────────────────────────────

/** Base shape for every Phase 5 invalidation event. */
interface Phase5InvalidationBase {
  tabId: string;
  timestamp: number;
}

/** Fired when the notification list or unread count changes. */
export interface NotificationInvalidationEvent
  extends Phase5InvalidationBase {
  type: "notification";
  notificationId?: string;
}

/** Fired when an instance's roster or state changes. */
export interface InstanceInvalidationEvent extends Phase5InvalidationBase {
  type: "instance";
  instanceId: string;
}

/** Fired when a tournament's registration status or state changes. */
export interface TournamentInvalidationEvent extends Phase5InvalidationBase {
  type: "tournament";
  tournamentId: string;
}

/** Fired when an achievement is earned or progress changes. */
export interface AchievementInvalidationEvent extends Phase5InvalidationBase {
  type: "achievement";
  badgeId?: string;
}

/**
 * The union of all Phase 5 invalidation event shapes.
 *
 * Discriminator: `type` field.
 */
export type Phase5InvalidationPayload =
  | NotificationInvalidationEvent
  | InstanceInvalidationEvent
  | TournamentInvalidationEvent
  | AchievementInvalidationEvent;

/** Discriminated envelope — keys are the `type` literals. */
export type Phase5InvalidationEnvelope = {
  [K in Phase5InvalidationPayload as K["type"]]: K;
};

// ─── Broadcast helpers ────────────────────────────────────────────────────────

/**
 * Broadcast a Phase 5 invalidation event to all other tabs via
 * `BroadcastChannel`.
 *
 * The event is not delivered to the current tab (same-tab filtering via
 * `tabId`).
 *
 * @param payload - The invalidation event to broadcast.
 */
export function emitPhase5Invalidation(
  payload: Omit<Phase5InvalidationPayload, "tabId" | "timestamp"> & {
    tabId?: never;
    timestamp?: never;
  },
): void {
  if (typeof window === "undefined") return;

  const channel = new BroadcastChannel(PHASE5_INVALIDATION_CHANNEL);
  try {
    channel.postMessage({
      ...payload,
      tabId: getCurrentTabId(),
      timestamp: Date.now(),
    } satisfies Phase5InvalidationPayload);
  } finally {
    channel.close();
  }
}

// ─── Subscribe helper ────────────────────────────────────────────────────────

/**
 * Subscribe to Phase 5 invalidation events from other tabs.
 *
 * The callback is NOT invoked for events from the current tab (same-tab filtering).
 *
 * @param handler — Called with the deserialized event for each broadcast from another tab.
 * @returns An unsubscribe function. Call it to remove the listener.
 */
export function subscribeToPhase5Invalidation(
  handler: (event: Phase5InvalidationPayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const channel = new BroadcastChannel(PHASE5_INVALIDATION_CHANNEL);
  const listener = (e: MessageEvent<Phase5InvalidationPayload>) => {
    if (e.data.tabId === getCurrentTabId()) return; // same-tab, skip
    handler(e.data);
  };
  channel.addEventListener("message", listener);

  return () => {
    channel.removeEventListener("message", listener);
    channel.close();
  };
}
