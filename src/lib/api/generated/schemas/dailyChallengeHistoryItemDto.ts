

import type { DailyChallengeHistoryItemDtoDifficulty } from './dailyChallengeHistoryItemDtoDifficulty';

export interface DailyChallengeHistoryItemDto {

date: string;

quizId: string;

quizTitle: string;

slug: string;

difficulty: DailyChallengeHistoryItemDtoDifficulty;

score: number;

rank: number;
}
