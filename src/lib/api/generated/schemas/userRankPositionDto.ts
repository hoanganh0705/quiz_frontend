

import type { UserRankPositionDtoTrend } from './userRankPositionDtoTrend';

export interface UserRankPositionDto {

rank: number;

denseRank: number;

percentile: number;

percentileLabel: string;

xp: number;

xpToNextRank?: number | null;

nextRankXp?: number | null;

trend: UserRankPositionDtoTrend;

trendAmount?: number | null;
}
