

import type { QuizResponseDto } from './quizResponseDto';
import type { QuizStatsResponseDto } from './quizStatsResponseDto';
import type { QuizStatsHistoryResponseDto } from './quizStatsHistoryResponseDto';
import type { QuizQuestionPlayerDto } from './quizQuestionPlayerDto';

export interface QuizAggregateResponseDto {

quiz: QuizResponseDto;

stats: QuizStatsResponseDto;

statsHistory: QuizStatsHistoryResponseDto;

previewQuestions: QuizQuestionPlayerDto[];
}
