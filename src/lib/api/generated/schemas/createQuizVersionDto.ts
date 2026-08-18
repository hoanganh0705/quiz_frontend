

import type { CreateQuizVersionDtoDifficulty } from './createQuizVersionDtoDifficulty';

export interface CreateQuizVersionDto {

sourceVersionId?: string | null;

difficulty: CreateQuizVersionDtoDifficulty;

durationMs: number;

passingScorePercent: number;

rewardXp: number;
}
