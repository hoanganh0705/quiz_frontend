

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

export interface RawSocketEvent {
event: string;
data: unknown;
}

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

export function routeSocialSocketEvent(event: RawSocketEvent): RoutedSocialEvent {

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

function isWsErrorPayload(data: unknown): data is WsErrorPayload {
if (typeof data !== "object" || data === null) return false;
const candidate = data as Record<string, unknown>;
return (
typeof candidate.code === "string" &&
typeof candidate.message === "string"
  );
}