

export type {
InstanceDetailResponseDto,
InstanceLeaderboardResponseDto,
InstanceLeaderboardEntryDto,
InstancePlayerResponseDto,
CreateInstanceDto,
CreateInstanceResponseDto,
JoinInstanceResponseDto,
StartInstanceResponseDto,
CloseInstanceResponseDto,
} from '@/lib/api/generated/schemas';

export type {
CreateInstanceResult,
GetInstanceByIdResult,
JoinInstanceResult,
StartInstanceResult,
CloseInstanceResult,
GetInstanceLeaderboardResult,
} from '@/lib/api/generated/instances/instances';

export type {
InstanceStatus,
InstanceRole,
InstancePlayerStatus,
InstanceLifecycleErrorCode,
InstanceSummary,
InstanceDetail,
InstancePlayer,
InstanceLifecycleEvent,
InstanceLifecycleEventType,
PlayerJoinEvent,
PlayerLeaveEvent,
InstanceSocketEvent,
InstanceSocketConnectionState,
InstanceJoinOutcome,
InstanceLeaveOutcome,
InstanceStartOutcome,
InstanceCloseOutcome,
InstanceLifecycleMutationState,
InstancePermissions,
InstanceInvalidationKeys,
} from './instance.types';

export {
INSTANCE_LIFECYCLE_ERROR_CODES,
INSTANCE_CACHE_KEYS,
} from './instance.types';