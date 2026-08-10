/**
 * Social-event router — single point that classifies a raw socket payload
 * into a typed `RoutedSocialEvent`.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.C1.
 *
 * ## Purpose
 *
 * Every social-domain socket event arrives on the Phase 5
 * `/notifications` namespace as a `NotificationSocketEvent` whose
 * `event.event` is the wire name and `event.data` is the raw payload.
 * The router is the **single point** that:
 *
 *   1. Classifies the event by name into one of the nine documented
 *      `RoutedSocialEvent` discriminators.
 *   2. Validates the payload shape via `validateSocialPayload`
 *      (TKT-6.10.C3) and returns `{ kind: 'unknown', rawType }` for
 *      any malformed payload.
 *   3. Routes `WsErrorPayload` envelopes to `{ kind: 'unknown',
 *      rawType: 'error' }` — the WS error path is owned by Phase 5,
 *      not by this router.
 *   4. Returns `{ kind: 'unknown', rawType }` for any unrecognised
 *      event name.
 *
 * The router is **pure**: no Sentry, no SWR, no console, no
 * `BroadcastChannel`. Side effects are the caller's responsibility.
 *
 * ## Why a router and not direct branching
 *
 * Hooks and components never branch on `event.event ===
 * 'friend.request.received'` directly. Direct branching made
 * impossible to:
 *
 *   - Audit which event names the social layer listens for.
 *   - Apply cross-cutting changes (e.g., add the `validateSocialPayload`
 *     check) in a single place.
 *   - Refactor the wire format without touching every consumer.
 *
 * The router is the single source of truth for the dispatch table.
 */

import type { WsErrorPayload } from "@/lib/realtime/events";

import {
  type SocialEventKind,
  type RelationshipChangedPayload,
  type BlockedChangedPayload,
  type FriendRequestReceivedPayload,
  type FriendRequestRespondedPayload,
  type FriendRequestCancelledPayload,
  type FriendAddedPayload,
  type FriendRemovedPayload,
  type FollowReceivedPayload,
  type FeedItemAddedPayload,
} from "./social-event-payloads";
import { validateSocialPayload } from "./validate-social-payload";

// ─── Discriminated union ────────────────────────────────────────────────────

/**
 * The router's typed output. The `kind` discriminator is the social
 * event name; `payload` is the typed DTO for that kind.
 *
 * `unknown` is the fallback for any event name or shape the router
 * cannot classify; consumers should drop the event silently and log a
 * Sentry soft warning.
 */
export type RoutedSocialEvent =
  | { kind: "relationship.changed"; payload: RelationshipChangedPayload }
  | { kind: "blocked.changed"; payload: BlockedChangedPayload }
  | { kind: "friend.request.received"; payload: FriendRequestReceivedPayload }
  | { kind: "friend.request.responded"; payload: FriendRequestRespondedPayload }
  | { kind: "friend.request.cancelled"; payload: FriendRequestCancelledPayload }
  | { kind: "friend.added"; payload: FriendAddedPayload }
  | { kind: "friend.removed"; payload: FriendRemovedPayload }
  | { kind: "follow.received"; payload: FollowReceivedPayload }
  | { kind: "feed.item.added"; payload: FeedItemAddedPayload }
  | { kind: "unknown"; rawType: string };

/**
 * The router accepts the Phase 5 `NotificationSocketEvent` shape but
 * widens `event.event` to `string` so the dispatch table can fall
 * through to `{ kind: 'unknown' }` for unrecognised names. Callers
 * should branch on the typed `NotificationSocketEvent` envelope; the
 * router is the boundary that converts it into `RoutedSocialEvent`.
 */
export interface RawSocketEvent {
  event: string;
  data: unknown;
}

/**
 * The dispatch table maps every documented social-event name to the
 * payload shape and validator kind. Adding a new event is a one-line
 * change here; the type system flags any mismatch with `SocialEventKind`
 * (the union is locked).
 */
const DISPATCH_TABLE: Record<
  SocialEventKind,
  (payload: unknown) => RoutedSocialEvent
> = {
  "relationship.changed": (payload) => {
    const validated = validateSocialPayload("relationship.changed", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "relationship.changed" };
    return { kind: "relationship.changed", payload: validated.payload as RelationshipChangedPayload };
  },
  "blocked.changed": (payload) => {
    const validated = validateSocialPayload("blocked.changed", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "blocked.changed" };
    return { kind: "blocked.changed", payload: validated.payload as BlockedChangedPayload };
  },
  "friend.request.received": (payload) => {
    const validated = validateSocialPayload("friend.request.received", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "friend.request.received" };
    return { kind: "friend.request.received", payload: validated.payload as FriendRequestReceivedPayload };
  },
  "friend.request.responded": (payload) => {
    const validated = validateSocialPayload("friend.request.responded", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "friend.request.responded" };
    return { kind: "friend.request.responded", payload: validated.payload as FriendRequestRespondedPayload };
  },
  "friend.request.cancelled": (payload) => {
    const validated = validateSocialPayload("friend.request.cancelled", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "friend.request.cancelled" };
    return { kind: "friend.request.cancelled", payload: validated.payload as FriendRequestCancelledPayload };
  },
  "friend.added": (payload) => {
    const validated = validateSocialPayload("friend.added", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "friend.added" };
    return { kind: "friend.added", payload: validated.payload as FriendAddedPayload };
  },
  "friend.removed": (payload) => {
    const validated = validateSocialPayload("friend.removed", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "friend.removed" };
    return { kind: "friend.removed", payload: validated.payload as FriendRemovedPayload };
  },
  "follow.received": (payload) => {
    const validated = validateSocialPayload("follow.received", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "follow.received" };
    return { kind: "follow.received", payload: validated.payload as FollowReceivedPayload };
  },
  "feed.item.added": (payload) => {
    const validated = validateSocialPayload("feed.item.added", payload);
    if (!validated.ok) return { kind: "unknown", rawType: "feed.item.added" };
    return { kind: "feed.item.added", payload: validated.payload as FeedItemAddedPayload };
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Route a raw socket event into a typed `RoutedSocialEvent`.
 *
 * Returns `{ kind: 'unknown', rawType: 'error' }` for any
 * `WsErrorPayload` envelope — the WS error path is owned by Phase 5
 * (`useSocket`), not by the social router. Consumers should drop
 * unknown events silently and log a Sentry soft warning via the
 * `social-sentry` helpers (TKT-6.10.G2).
 *
 * @param event - The raw socket frame, widened to allow unknown
 *                `event.event` names.
 * @returns A `RoutedSocialEvent` discriminated by `kind`.
 */
export function routeSocialSocketEvent(event: RawSocketEvent): RoutedSocialEvent {
  // WsErrorPayload envelopes are NOT routed through the social router.
  // The error path is the caller's responsibility (Phase 5).
  if (isWsErrorPayload(event.data)) {
    return { kind: "unknown", rawType: "error" };
  }

  const eventName = event.event;
  const handler = (DISPATCH_TABLE as Record<string, ((p: unknown) => RoutedSocialEvent) | undefined>)[
    eventName
  ];
  if (!handler) {
    return { kind: "unknown", rawType: eventName };
  }
  return handler(event.data);
}

/**
 * Type-narrowing check for the `WsErrorPayload` envelope. Defined
 * inline so the router has no dependency on `ws-error.ts`.
 */
function isWsErrorPayload(data: unknown): data is WsErrorPayload {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}