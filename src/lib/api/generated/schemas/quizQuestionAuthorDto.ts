

import type { QuizAnswerOptionAuthorDto } from './quizAnswerOptionAuthorDto';

export interface QuizQuestionAuthorDto {

questionId: string;

quizVersionId: string;

position: number;

questionText: string;

imageUrl?: string | null;

createdAt: string;

updatedAt: string;

answerOptions: QuizAnswerOptionAuthorDto[];
}
