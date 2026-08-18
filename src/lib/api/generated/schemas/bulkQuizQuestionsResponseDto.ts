

import type { QuizQuestionAuthorDto } from './quizQuestionAuthorDto';
import type { BulkQuizQuestionResultItemDto } from './bulkQuizQuestionResultItemDto';

export interface BulkQuizQuestionsResponseDto {

questions: QuizQuestionAuthorDto[];

results: BulkQuizQuestionResultItemDto[];
}
