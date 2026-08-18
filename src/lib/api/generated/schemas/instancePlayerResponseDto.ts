

import type { InstancePlayerResponseDtoStatus } from './instancePlayerResponseDtoStatus';

export interface InstancePlayerResponseDto {

instancePlayerId: string;

instanceId: string;

userId: string;

username: string;

displayName?: string | null;

avatarUrl?: string | null;

status: InstancePlayerResponseDtoStatus;

attemptId?: string | null;

joinedAt: string;
}
