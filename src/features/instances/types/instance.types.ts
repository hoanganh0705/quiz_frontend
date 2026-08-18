

import type {
InstanceDetailResponseDto,
InstanceDetailResponseDtoStatus,
InstancePlayerResponseDto,
} from "@/lib/api/generated/schemas";

export type InstanceStatus = InstanceDetailResponseDtoStatus;

export type InstanceRole = "host" | "player" | null;

export type InstancePlayerStatus = "joined" | "ready" | "playing" | "disconnected" | "finished";

export type InstanceLifecycleErrorCode =
| "INSTANCE_NOT_FOUND"
  | "INSTANCE_CLOSED"
  | "INSTANCE_FULL"
  | "INSTANCE_ALREADY_JOINED"
  | "INSTANCE_NOT_JOINED"
  | "INSTANCE_HOST_REQUIRED"
  | "INSTANCE_FORBIDDEN"
  | "INSTANCE_INVALID_TRANSITION"
  | "INSTANCE_AUTH_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "GLOBAL_NOT_FOUND"
  | "GLOBAL_FORBIDDEN"
  | "GLOBAL_UNAUTHENTICATED"
  | "GLOBAL_VALIDATION_FAILED"
  | "GLOBAL_INTERNAL_ERROR";

export const INSTANCE_LIFECYCLE_ERROR_CODES = [
"INSTANCE_NOT_FOUND",
"INSTANCE_CLOSED",
"INSTANCE_FULL",
"INSTANCE_ALREADY_JOINED",
"INSTANCE_NOT_JOINED",
"INSTANCE_HOST_REQUIRED",
"INSTANCE_FORBIDDEN",
"INSTANCE_INVALID_TRANSITION",
"INSTANCE_AUTH_REQUIRED",
"UNAUTHORIZED",
"FORBIDDEN",
"GLOBAL_NOT_FOUND",
"GLOBAL_FORBIDDEN",
"GLOBAL_UNAUTHENTICATED",
"GLOBAL_VALIDATION_FAILED",
"GLOBAL_INTERNAL_ERROR",
] as const satisfies readonly InstanceLifecycleErrorCode[];

export interface InstanceSummary {
id: string;
instanceId: string;
quizId: string;
quizTitle: string;
quizSlug: string;
status: InstanceStatus;
hostUserId: string;
hostUsername: string;
hostDisplayName: string | null;
maxPlayers: number | null;
difficulty: string;
durationMs: number;
passingScorePercent: number;
rewardXp: number;
createdAt: string;
startedAt: string | null;
closedAt: string | null;
updatedAt: string;
}

export type InstanceDetail = InstanceDetailResponseDto & {

id: string;

currentUserRole: InstanceRole;
};

export type InstancePlayer = InstancePlayerResponseDto & {

id: string;

isCurrentUser: boolean;

isHost: boolean;
};

export type InstanceLifecycleEventType =
| "instance_started"
  | "instance_closed"
  | "instance_cancelled"
  | "countdown_started"
  | "countdown_cancelled";

export interface InstanceLifecycleEvent {
type: InstanceLifecycleEventType;
instanceId: string;
at: string;
eventSequence: number;

status?: InstanceStatus;
}

export interface PlayerJoinEvent {
type: "player_joined";
instanceId: string;
player: InstancePlayer;
at: string;
eventSequence: number;
}

export interface PlayerLeaveEvent {
type: "player_left";
instanceId: string;
playerId: string;
at: string;
eventSequence: number;
}

export type InstanceSocketEvent =
| InstanceLifecycleEvent
  | PlayerJoinEvent
  | PlayerLeaveEvent;

export type InstanceSocketConnectionState =
| "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "auth_failed";

export interface InstanceJoinOutcome {
instanceId: string;
currentUserRole: InstanceRole;
joinedAt: string;
}

export interface InstanceLeaveOutcome {
instanceId: string;
leftAt: string;
}

export interface InstanceStartOutcome {
instanceId: string;
status: InstanceStatus;
startedAt: string;
}

export interface InstanceCloseOutcome {
instanceId: string;
status: InstanceStatus;
closedAt: string;
}

export type InstanceLifecycleMutationState =
| "idle"
  | "pending"
  | "success"
  | "error";

export interface InstancePermissions {
canJoin: boolean;
canLeave: boolean;
canStart: boolean;
canCancel: boolean;
canClose: boolean;
role: InstanceRole;
isAuthenticated: boolean;
}

export const INSTANCE_CACHE_KEYS = {

detail(instanceId: string) {
return ["instances", "detail", instanceId] as const;
  },

players(instanceId: string) {
return ["instances", "players", instanceId] as const;
  },

realtime(instanceId: string) {
return ["instances", "realtime", instanceId] as const;
  },

all(instanceId: string) {
return {
detail: this.detail(instanceId),
players: this.players(instanceId),
    } as const;
  },
} as const;

export type InstanceInvalidationKeys = ReturnType<
(typeof INSTANCE_CACHE_KEYS)["all"]
>;
