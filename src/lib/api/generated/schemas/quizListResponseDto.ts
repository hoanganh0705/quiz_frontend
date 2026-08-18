

import type { QuizListItemDto } from './quizListItemDto';
import type { QuizPaginationResponseDto } from './quizPaginationResponseDto';

export interface QuizListResponseDto {

items: QuizListItemDto[];

pagination: QuizPaginationResponseDto;
}
