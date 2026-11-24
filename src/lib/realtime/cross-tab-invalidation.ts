import { getCurrentTabId } from "@/lib/api/core/broadcast-channel";

export const CROSS_TAB_INVALIDATION_CHANNEL = "realtime/invalidation" as const;

export type RealtimeInvalidationSource =
  | "notification"
  | "instance"
  | "tournament"
  | "achievement"
  | "relationship"
  | "friend-request"
  | "coin";

interface RealtimeInvalidationBase {
  tabId: string;
  timestamp: number;
}

export interface NotificationInvalidationEvent extends RealtimeInvalidationBase {
  type: "notification";
  notificationId?: string;
}

export interface InstanceInvalidationEvent extends RealtimeInvalidationBase {
  type: "instance";
  instanceId: string;
}

export interface TournamentInvalidationEvent extends RealtimeInvalidationBase {
  type: "tournament";
  tournamentId: string;
}

export interface AchievementInvalidationEvent extends RealtimeInvalidationBase {
  type: "achievement";
  badgeId?: string;
}

export interface RelationshipInvalidationEvent extends RealtimeInvalidationBase {
  type: "relationship";
  targetUserId: string;
}

export interface FriendRequestInvalidationEvent extends RealtimeInvalidationBase {
  type: "friend-request";
  decision?: "accept" | "decline" | "cancel";
  requesterUserId?: string;
  recipientUserId?: string;
}

export interface CoinInvalidationEvent extends RealtimeInvalidationBase {
  type: "coin";
}

export type RealtimeInvalidationPayload =
  | NotificationInvalidationEvent
  | InstanceInvalidationEvent
  | TournamentInvalidationEvent
  | AchievementInvalidationEvent
  | RelationshipInvalidationEvent
  | FriendRequestInvalidationEvent
  | CoinInvalidationEvent;

export type RealtimeInvalidationEnvelope = {
  [K in RealtimeInvalidationPayload as K["type"]]: K;
};

export type RealtimeInvalidationInput = {
  [K in RealtimeInvalidationSource]: Omit<
    Extract<RealtimeInvalidationPayload, { type: K }>,
    "tabId" | "timestamp"
  >;
}[RealtimeInvalidationSource];

export function emitRealtimeCrossTabInvalidation(
  payload: RealtimeInvalidationInput,
): void {
  if (typeof window === "undefined") return;

  const channel = new BroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
  try {
    channel.postMessage({
      ...payload,
      tabId: getCurrentTabId(),
      timestamp: Date.now(),
    } satisfies RealtimeInvalidationPayload);
  } finally {
    channel.close();
  }
}

export const emitRealtimeInvalidation = emitRealtimeCrossTabInvalidation;

export function postRelationshipInvalidation(targetUserId: string): void {
  emitRealtimeInvalidation({ type: "relationship", targetUserId });
}

export function postFriendRequestInvalidation(detail?: {
  decision?: "accept" | "decline" | "cancel";
  requesterUserId?: string;
  recipientUserId?: string;
}): void {
  emitRealtimeInvalidation({ type: "friend-request", ...detail });
}

export function subscribeToRealtimeInvalidation(
  handler: (event: RealtimeInvalidationPayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const channel = new BroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
  const listener = (e: MessageEvent<RealtimeInvalidationPayload>) => {
    if (e.data.tabId === getCurrentTabId()) return;
    handler(e.data);
  };
  channel.addEventListener("message", listener);

  return () => {
    channel.removeEventListener("message", listener);
    channel.close();
  };
}
