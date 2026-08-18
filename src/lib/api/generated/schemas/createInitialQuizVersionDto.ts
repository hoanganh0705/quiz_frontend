

import type { CreateInitialQuizVersionDtoDifficulty } from './createInitialQuizVersionDtoDifficulty';

export interface CreateInitialQuizVersionDto {

difficulty: CreateInitialQuizVersionDtoDifficulty;

durationMs: number;

passingScorePercent: number;

rewardXp: number;
}
