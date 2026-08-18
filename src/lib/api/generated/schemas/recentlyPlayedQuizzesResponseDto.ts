

import type { RecentlyPlayedQuizItemDto } from './recentlyPlayedQuizItemDto';
import type { CursorPagination } from './cursorPagination';

export interface RecentlyPlayedQuizzesResponseDto {

items: RecentlyPlayedQuizItemDto[];

pagination: CursorPagination;
}
