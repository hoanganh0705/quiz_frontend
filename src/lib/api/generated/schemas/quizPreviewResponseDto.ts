

import type { QuizQuestionPlayerDto } from './quizQuestionPlayerDto';

export interface QuizPreviewResponseDto {

quizId: string;

publishedVersionId?: string | null;

questions: QuizQuestionPlayerDto[];

totalQuestions: number;
}
