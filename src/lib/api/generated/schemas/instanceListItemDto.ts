

import type { InstanceListItemDtoStatus } from './instanceListItemDtoStatus';
import type { InstanceListItemDtoDifficulty } from './instanceListItemDtoDifficulty';

export interface InstanceListItemDto {

instanceId: string;

hostUserId: string;

hostUsername: string;

hostDisplayName?: string | null;

maxPlayers?: number | null;

status: InstanceListItemDtoStatus;

difficulty: InstanceListItemDtoDifficulty;

durationMs: number;

quizId: string;

quizTitle: string;

quizSlug: string;

playerCount: number;

createdAt: string;
}
