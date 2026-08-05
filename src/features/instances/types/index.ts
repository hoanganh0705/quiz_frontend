// Instances types — aligned with backend DTOs

// Re-export from generated SDK
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
  InstanceControllerCreateInstanceResult,
  InstanceControllerGetInstanceByIdResult,
  InstanceControllerJoinInstanceResult,
  InstanceControllerStartInstanceResult,
  InstanceControllerCloseInstanceResult,
  InstanceControllerGetLeaderboardResult,
} from '@/lib/api/generated/instances/instances';

// Story 5.7 — Instance lobby, authenticated room, and host lifecycle
// controls. Domain projections, lifecycle event payload discriminated
// unions, and SWR cache-key factories consumed by every hook and
// component in the story.
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