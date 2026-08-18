

import { getCurrentTabId } from "@/lib/api/core/broadcast-channel";

export const CROSS_TAB_INVALIDATION_CHANNEL = "realtime/invalidation" as const;

export type Phase5InvalidationSource =
| "notification"
  | "instance"
  | "tournament"
  | "achievement"
  | "relationship"
  | "friend-request"
  | "coin";

interface Phase5InvalidationBase {
tabId: string;
timestamp: number;
}

export interface NotificationInvalidationEvent
extends Phase5InvalidationBase {
type: "notification";
notificationId?: string;
}

export interface InstanceInvalidationEvent extends Phase5InvalidationBase {
type: "instance";
instanceId: string;
}

export interface TournamentInvalidationEvent extends Phase5InvalidationBase {
type: "tournament";
tournamentId: string;
}

export interface AchievementInvalidationEvent extends Phase5InvalidationBase {
type: "achievement";
badgeId?: string;
}

export interface RelationshipInvalidationEvent
extends Phase5InvalidationBase {
type: "relationship";
targetUserId: string;
}

export interface FriendRequestInvalidationEvent
extends Phase5InvalidationBase {
type: "friend-request";
decision?: "accept" | "decline" | "cancel";
requesterUserId?: string;
recipientUserId?: string;
}

export interface CoinInvalidationEvent extends Phase5InvalidationBase {
type: "coin";
}

export type Phase5InvalidationPayload =
| NotificationInvalidationEvent
  | InstanceInvalidationEvent
  | TournamentInvalidationEvent
  | AchievementInvalidationEvent
  | RelationshipInvalidationEvent
  | FriendRequestInvalidationEvent
  | CoinInvalidationEvent;

export type Phase5InvalidationEnvelope = {
  [K in Phase5InvalidationPayload as K["type"]]: K;
};

export type Phase5InvalidationInput = {
  [K in Phase5InvalidationSource]: Omit<
Extract<Phase5InvalidationPayload, { type: K }>,
"tabId" | "timestamp"
  >;
}[Phase5InvalidationSource];

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

export function postRelationshipInvalidation(targetUserId: string): void {
emitPhase5Invalidation({ type: "relationship", targetUserId });
}

export function postFriendRequestInvalidation(detail?: {
decision?: "accept" | "decline" | "cancel";
requesterUserId?: string;
recipientUserId?: string;
}): void {
emitPhase5Invalidation({ type: "friend-request", ...detail });
}

export function subscribeToPhase5Invalidation(
handler: (event: Phase5InvalidationPayload) => void,
): () => void {
if (typeof window === "undefined") return () => {};

const channel = new BroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
const listener = (e: MessageEvent<Phase5InvalidationPayload>) => {
if (e.data.tabId === getCurrentTabId()) return;
handler(e.data);
  };
channel.addEventListener("message", listener);

return () => {
channel.removeEventListener("message", listener);
channel.close();
  };
}
