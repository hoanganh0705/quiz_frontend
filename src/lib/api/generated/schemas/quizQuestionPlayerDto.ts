

import type { QuizAnswerOptionPlayerDto } from './quizAnswerOptionPlayerDto';

export interface QuizQuestionPlayerDto {

questionId: string;

quizVersionId: string;

position: number;

questionText: string;

imageUrl?: string | null;

createdAt: string;

updatedAt: string;

answerOptions: QuizAnswerOptionPlayerDto[];
}
