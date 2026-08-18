

import type { RankingHistoryItemDto } from './rankingHistoryItemDto';

export interface PublicRankingHistoryResponseDto {

userId: string;

username: string;

history: RankingHistoryItemDto[];
}
