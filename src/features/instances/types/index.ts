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
