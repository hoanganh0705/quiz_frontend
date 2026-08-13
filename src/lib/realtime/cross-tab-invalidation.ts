/**
 * Phase 5 cross-tab invalidation — single import surface.
 *
 * Source epic:   Epic 5.1 (original four envelopes) extended by
 *                Epic 6.10 (two social envelopes).
 * Source ticket: TKT-5.1.B2 + TKT-6.10.D3.
 *
 * ## Purpose
 *
 * Phase 5 service wrappers and realtime hooks need to invalidate SWR caches
 * in sibling browser tabs when the user acts in one tab. This module provides
 * the Phase 5 `BroadcastChannel` integration for the **six** Phase 5 source
 * types:
 *
 *   1. `notification`   — notification list / unread count changed
 *   2. `instance`       — instance roster / state changed
 *   3. `tournament`     — tournament registration / status changed
 *   4. `achievement`    — badge earned / progress changed
 *   5. `relationship`   — Epic 6.10 — viewer→target relationship changed
 *                         (block, unblock, follow, friend-request lifecycle)
 *   6. `friend-request` — Epic 6.10 — incoming / outgoing friend-request
 *                         list changed
 *
 * ## Channel naming
 *
 * Phase 5 reuses the `getCurrentTabId()` from `broadcast-channel.ts`
 * (Phase 2) for same-tab filtering. The channel name is
 * `realtime/invalidation` — distinct from Phase 4's per-feature channels
 * (`attempts/changed`, `profile/updated`).
 *
 * ## Same-tab filtering
 *
 * Inherited from `broadcast-channel.ts`'s `getCurrentTabId()` — every tab
 * has a unique tab id persisted in `sessionStorage`. The broadcast handler
 * ignores messages whose `tabId` matches the current tab, preventing event
 * loops when the same tab both emits and listens.
 *
 * ## `friendshipId` hygiene
 *
 * The `friend-request` envelope never carries a `friendshipId` field.
 * The Epic 6.7.G1 / 6.8.G3 deferral notes explicitly forbid
 * `friendshipId` on the wire (it is an unstable internal id); the
 * social realtime layer (TKT-6.10.C2) strips it before any consumer
 * ever sees it. The lint script
 * (`scripts/social-lint-invariants.mjs`, TKT-6.10.G3) fails the
 * build if any field named `friendshipId` is added to this file.
 */

import { getCurrentTabId } from "@/lib/api/core/broadcast-channel";

/**
 * Cross-tab invalidation channel name. Phase 4 broadcast envelopes
 * (attempts/profile) flow through per-feature channels opened by
 * `attempts-broadcast-channel.ts` / `profile-broadcast-channel.ts` —
 * there is no shared Phase 4 channel. Phase 5 (and the Epic 6.10
 * extension) opens a single `realtime/invalidation` channel whose
 * envelope discriminator is the `type` field
 * (`notification` | `instance` | `tournament` | `achievement` |
 * `relationship` | `friend-request`).
 */
export const CROSS_TAB_INVALIDATION_CHANNEL = "realtime/invalidation" as const;

/**
 * The seven Phase 5 invalidation source types. Used as the discriminator
 * in `Phase5InvalidationPayload.type`.
 */
export type Phase5InvalidationSource =
  | "notification"
  | "instance"
  | "tournament"
  | "achievement"
  | "relationship"
  | "friend-request"
  | "coin";

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
 * Fired when the viewer's relationship projection to a target user
 * changes (block / unblock / follow / unfollow / friend-request
 * lifecycle). Carries only the target user id — the consumer
 * (TKT-6.10.E1 listener hook) re-fetches the relationship via REST.
 *
 * `targetUserId` is the **stable** user id, never a `friendshipId`
 * or `followId` internal identifier.
 */
export interface RelationshipInvalidationEvent
  extends Phase5InvalidationBase {
  type: "relationship";
  targetUserId: string;
}

/**
 * Fired when the viewer's incoming / outgoing friend-request list
 * changes. Carries the optional `decision`, `requesterUserId`, and
 * `recipientUserId` to let the consumer narrow the SWR
 * revalidation; `requesterUserId` and `recipientUserId` are stable
 * user ids (never `friendshipId`).
 */
export interface FriendRequestInvalidationEvent
  extends Phase5InvalidationBase {
  type: "friend-request";
  decision?: "accept" | "decline" | "cancel";
  requesterUserId?: string;
  recipientUserId?: string;
}

/**
 * Fired when the viewer's coin balance or transaction history
 * changes. The consumer (TKT-7.12.B2 listener hook) refetches the
 * wallet and the ledger via REST.
 */
export interface CoinInvalidationEvent extends Phase5InvalidationBase {
  type: "coin";
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
  | AchievementInvalidationEvent
  | RelationshipInvalidationEvent
  | FriendRequestInvalidationEvent
  | CoinInvalidationEvent;

/** Discriminated envelope — keys are the `type` literals. */
export type Phase5InvalidationEnvelope = {
  [K in Phase5InvalidationPayload as K["type"]]: K;
};

// ─── Broadcast helpers ────────────────────────────────────────────────────────

/**
 * The shape of an invalidation event minus the auto-stamped
 * `tabId` / `timestamp` fields. Each variant retains its own
 * discriminator and variant-specific fields.
 *
 * `Omit<DiscriminatedUnion, ...>` collapses the union to the common
 * fields and loses variant-specific fields (`notificationId`,
 * `instanceId`, `targetUserId`, `decision`, …). Distributing the
 * `Omit` over the union via a mapped type preserves them.
 */
export type Phase5InvalidationInput = {
  [K in Phase5InvalidationSource]: Omit<
    Extract<Phase5InvalidationPayload, { type: K }>,
    "tabId" | "timestamp"
  >;
}[Phase5InvalidationSource];

/**
 * Broadcast a Phase 5 invalidation event to all other tabs via
 * `BroadcastChannel`.
 *
 * The event is not delivered to the current tab (same-tab filtering via
 * `tabId`).
 *
 * @param payload - The invalidation event to broadcast (without
 *                  `tabId` / `timestamp`; both are auto-stamped).
 */
export function emitPhase5Invalidation(
  payload: Phase5InvalidationInput,
): void {
  if (typeof window === "undefined") return;

  const channel = new BroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
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

// ─── Epic 6.10 helpers ──────────────────────────────────────────────────────

/**
 * Broadcast a `relationship` invalidation event. Convenience helper
 * for listener hooks (TKT-6.10.E1); the same semantics as
 * `emitPhase5Invalidation({ type: 'relationship', targetUserId })`.
 */
export function postRelationshipInvalidation(targetUserId: string): void {
  emitPhase5Invalidation({ type: "relationship", targetUserId });
}

/**
 * Broadcast a `friend-request` invalidation event. The optional
 * `decision`, `requesterUserId`, and `recipientUserId` fields narrow
 * the consumer-side revalidation; omitting them forces a full
 * invalidation of both the incoming and outgoing request lists.
 */
export function postFriendRequestInvalidation(detail?: {
  decision?: "accept" | "decline" | "cancel";
  requesterUserId?: string;
  recipientUserId?: string;
}): void {
  emitPhase5Invalidation({ type: "friend-request", ...detail });
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

  const channel = new BroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
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
