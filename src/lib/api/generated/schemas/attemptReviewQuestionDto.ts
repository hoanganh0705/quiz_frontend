

import type { AttemptReviewQuestionDtoIsCorrect } from './attemptReviewQuestionDtoIsCorrect';
import type { AttemptReviewAnswerOptionDto } from './attemptReviewAnswerOptionDto';

export interface AttemptReviewQuestionDto {

questionId: string;

position: number;

questionText: string;

imageUrl?: string | null;

selectedOptionId: string | null;

isCorrect: AttemptReviewQuestionDtoIsCorrect;

timeTakenMs?: number | null;

answeredAt: string;

answerOptions: AttemptReviewAnswerOptionDto[];

explanation?: string | null;

topicTags?: string[] | null;

difficulty?: number | null;
}
