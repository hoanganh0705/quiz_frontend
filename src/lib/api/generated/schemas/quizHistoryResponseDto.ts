

import type { QuizHistoryEntryDto } from './quizHistoryEntryDto';
import type { QuizHistoryPaginationDto } from './quizHistoryPaginationDto';

export interface QuizHistoryResponseDto {

entries: QuizHistoryEntryDto[];

pagination: QuizHistoryPaginationDto;
}
