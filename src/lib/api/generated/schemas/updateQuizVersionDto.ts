

import type { UpdateQuizVersionDtoDifficulty } from './updateQuizVersionDtoDifficulty';

export interface UpdateQuizVersionDto {

difficulty?: UpdateQuizVersionDtoDifficulty;

durationMs?: number;

passingScorePercent?: number;

rewardXp?: number;
}
