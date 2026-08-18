

import type { InstanceDetailResponseDtoStatus } from './instanceDetailResponseDtoStatus';
import type { InstanceDetailResponseDtoDifficulty } from './instanceDetailResponseDtoDifficulty';
import type { InstancePlayerResponseDto } from './instancePlayerResponseDto';

export interface InstanceDetailResponseDto {

instanceId: string;

hostUserId: string;

hostUsername: string;

hostDisplayName?: string | null;

maxPlayers?: number | null;

status: InstanceDetailResponseDtoStatus;

difficulty: InstanceDetailResponseDtoDifficulty;

durationMs: number;

passingScorePercent: number;

rewardXp: number;

quizId: string;

quizTitle: string;

quizSlug: string;

createdAt: string;

startedAt?: string | null;

closedAt?: string | null;

updatedAt: string;

players: InstancePlayerResponseDto[];
}
