

import type { DailyChallengeResponseDtoDifficulty } from './dailyChallengeResponseDtoDifficulty';
import type { DailyChallengeResponseDtoStatus } from './dailyChallengeResponseDtoStatus';
import type { DailyChallengeResponseDtoScorePercent } from './dailyChallengeResponseDtoScorePercent';
import type { DailyChallengeResponseDtoRank } from './dailyChallengeResponseDtoRank';

export interface DailyChallengeResponseDto {

date: string;

quizId: string;

quizTitle: string;

slug: string;

difficulty: DailyChallengeResponseDtoDifficulty;

questionCount: number;

rewardXp: number;

expiresAt: string;

status: DailyChallengeResponseDtoStatus;

scorePercent?: DailyChallengeResponseDtoScorePercent;

rank?: DailyChallengeResponseDtoRank;
}
