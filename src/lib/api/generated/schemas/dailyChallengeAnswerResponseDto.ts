

import type { DailyChallengeAnswerResponseDtoScorePercent } from './dailyChallengeAnswerResponseDtoScorePercent';

export interface DailyChallengeAnswerResponseDto {

correct: boolean;

nextQuestionIndex: number;

totalQuestions: number;

completed: boolean;

scorePercent: DailyChallengeAnswerResponseDtoScorePercent;
}
