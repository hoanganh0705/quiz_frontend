import {
  broadcastAttemptsChanged,
  subscribeToAttemptEvents,
  type AttemptChangeKind,
  type AttemptEvent,
  type AttemptsChangedEvent,
  ATTEMPTS_CHANNEL_NAME,
} from "./attempts-broadcast-channel";
import {
  broadcastProfileUpdated,
  subscribeToProfileEvents,
  type ProfileUpdateKind,
  type ProfileEvent,
  type ProfileUpdatedEvent,
  PROFILE_CHANNEL_NAME,
} from "./profile-broadcast-channel";

export type CrossTabBroadcastMessage = AttemptsChangedEvent | ProfileUpdatedEvent;

export type CrossTabBroadcastBareMessage = CrossTabBroadcastMessage;

export type CrossTabBroadcastEnvelope = {
  [K in CrossTabBroadcastMessage as K["type"]]: K;
};

export type CrossTabBroadcastPayload = CrossTabBroadcastMessage;

// Backward compatibility aliases
export type Phase4BroadcastMessage = CrossTabBroadcastMessage;
export type Phase4BroadcastBareMessage = CrossTabBroadcastBareMessage;
export type Phase4BroadcastEnvelope = CrossTabBroadcastEnvelope;
export type Phase4BroadcastPayload = CrossTabBroadcastPayload;

export type { AttemptChangeKind };
export type { ProfileUpdateKind };

export {
  ATTEMPTS_CHANNEL_NAME,
  PROFILE_CHANNEL_NAME,
  broadcastAttemptsChanged,
  broadcastProfileUpdated,
  subscribeToAttemptEvents,
  subscribeToProfileEvents,
};

export type {
  AttemptEvent,
  AttemptsChangedEvent,
  ProfileEvent,
  ProfileUpdatedEvent,
};

export function emitCrossTabBroadcast(env: CrossTabBroadcastMessage): void {
  switch (env.type) {
    case "attempts/changed":
      broadcastAttemptsChanged({
        userId: env.userId,
        attemptId: env.attemptId,
        kind: env.kind,
      });
      return;
    case "profile/updated":
      broadcastProfileUpdated({
        userId: env.userId,
        kind: env.kind,
      });
      return;
    default: {
      const _exhaustive: never = env;
      throw new Error(
        `[cross-tab-broadcast] unknown event type: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

export const emitPhase4Broadcast = emitCrossTabBroadcast;
