

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

export type Phase4BroadcastMessage = AttemptsChangedEvent | ProfileUpdatedEvent;

export type Phase4BroadcastBareMessage = Phase4BroadcastMessage;

export type Phase4BroadcastEnvelope = {
  [K in Phase4BroadcastMessage as K["type"]]: K;
};

export type Phase4BroadcastPayload = Phase4BroadcastMessage;

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

export function emitPhase4Broadcast(env: Phase4BroadcastMessage): void {
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
