

import type { DailyChallengeHistoryItemDto } from './dailyChallengeHistoryItemDto';
import type { CursorPagination } from './cursorPagination';

export interface DailyChallengeHistoryResponseDto {

items: DailyChallengeHistoryItemDto[];

pagination: CursorPagination;
}
