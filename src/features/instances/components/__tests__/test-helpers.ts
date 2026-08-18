

import { vi } from "vitest";

import type {
InstanceDetail,
InstancePlayer,
InstancePermissions,
InstanceSocketEvent,
InstanceLifecycleErrorCode,
InstanceLifecycleMutationState,
InstanceStatus,
NOTIFICATION_CACHE_KEYS_PLACEHOLDER,
} from "@/features/instances/types/instance.types";
import { INSTANCE_LIFECYCLE_ERROR_CODES } from "@/features/instances/types/instance.types";

export type _Refs = {
InstanceDetail: InstanceDetail;
InstancePlayer: InstancePlayer;
InstancePermissions: InstancePermissions;
InstanceSocketEvent: InstanceSocketEvent;
InstanceLifecycleErrorCode: InstanceLifecycleErrorCode;
InstanceLifecycleMutationState: InstanceLifecycleMutationState;
InstanceStatus: InstanceStatus;
};

void INSTANCE_LIFECYCLE_ERROR_CODES;

void (0 as unknown as NOTIFICATION_CACHE_KEYS_PLACEHOLDER);

export function makeInstanceDetail(
overrides: Partial<InstanceDetail> = {},
): InstanceDetail {
return {
instanceId: "inst-1",
id: "inst-1",
quizId: "q-1",
hostUserId: "u-host",
title: "Test instance",
status: "open" as InstanceStatus,
maxPlayers: 10,
currentPlayerCount: 1,
createdAt: "2026-01-01T00:00:00Z",
updatedAt: "2026-01-01T00:00:00Z",
...overrides,
  } as InstanceDetail;
}

export function makePlayer(
overrides: Partial<InstancePlayer> = {},
): InstancePlayer {
return {
id: "u-1",
userId: "u-1",
displayName: "Alice",
username: "alice",
isCurrentUser: false,
isHost: false,
joinedAt: "2026-01-01T00:00:00Z",
...overrides,
  } as InstancePlayer;
}

export const HOST_PERMISSIONS: InstancePermissions = {
canJoin: false,
canLeave: false,
canStart: true,
canCancel: true,
canClose: true,
role: "host",
isAuthenticated: true,
};

export const PLAYER_PERMISSIONS: InstancePermissions = {
canJoin: false,
canLeave: true,
canStart: false,
canCancel: false,
canClose: false,
role: "player",
isAuthenticated: true,
};

export const GUEST_PERMISSIONS: InstancePermissions = {
canJoin: true,
canLeave: false,
canStart: false,
canCancel: false,
canClose: false,
role: "guest",
isAuthenticated: false,
};

export const NO_PERMISSIONS: InstancePermissions = {
canJoin: false,
canLeave: false,
canStart: false,
canCancel: false,
canClose: false,
role: null,
isAuthenticated: false,
};

export const instanceMocks = {
useInstance: vi.fn().mockReturnValue({
instance: makeInstanceDetail(),
isLoading: false,
error: null as unknown,
refresh: vi.fn().mockResolvedValue(undefined),
isStale: false,
  }),
useInstancePlayers: vi.fn().mockReturnValue({
items: [] as InstancePlayer[],
isLoading: false,
error: null as unknown,
refresh: vi.fn().mockResolvedValue(undefined),
isStale: false,
  }),
useInstancePermissions: vi.fn().mockReturnValue({
permissions: PLAYER_PERMISSIONS,
isLoading: false,
error: null as unknown,
  }),
useJoinInstance: vi.fn().mockReturnValue({
join: vi.fn().mockResolvedValue(undefined),
state: "idle",
error: null as unknown,
reset: vi.fn(),
  }),
useLeaveInstance: vi.fn().mockReturnValue({
leave: vi.fn().mockResolvedValue(undefined),
state: "idle",
error: null as unknown,
reset: vi.fn(),
  }),
useStartInstance: vi.fn().mockReturnValue({
start: vi.fn().mockResolvedValue(undefined),
state: "idle",
error: null as unknown,
reset: vi.fn(),
  }),
useCloseInstance: vi.fn().mockReturnValue({
close: vi.fn().mockResolvedValue(undefined),
state: "idle",
error: null as unknown,
reset: vi.fn(),
  }),
useInstanceSocket: vi.fn().mockReturnValue({
connectionState: "idle",
lastError: null as unknown,
subscribe: vi.fn(() => () => undefined),
emitJoin: vi.fn().mockResolvedValue(undefined),
emitLeave: vi.fn().mockResolvedValue(undefined),
  }),
useInstancesFeatureFlag: vi.fn().mockReturnValue({
isPlaceholder: false,
flagValue: "live",
  }),
useInstanceRealtimeBridge: vi.fn(),
};

export function installInstanceMocks() {
return {
useInstance: instanceMocks.useInstance,
useInstancePlayers: instanceMocks.useInstancePlayers,
useInstancePermissions: instanceMocks.useInstancePermissions,
useJoinInstance: instanceMocks.useJoinInstance,
useLeaveInstance: instanceMocks.useLeaveInstance,
useStartInstance: instanceMocks.useStartInstance,
useCloseInstance: instanceMocks.useCloseInstance,
useInstanceSocket: instanceMocks.useInstanceSocket,
useInstancesFeatureFlag: instanceMocks.useInstancesFeatureFlag,
useInstanceRealtimeBridge: instanceMocks.useInstanceRealtimeBridge,
  };
}
