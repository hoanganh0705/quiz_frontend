

import type { UserRankSummaryDtoTrend } from './userRankSummaryDtoTrend';
import type { UserRankSummaryDtoPeriod } from './userRankSummaryDtoPeriod';

export interface UserRankSummaryDto {

rank: number;

denseRank: number;

percentile: number;

percentileLabel: string;

xp: number;

xpToNextRank?: number | null;

nextRankXp?: number | null;

trend: UserRankSummaryDtoTrend;

trendAmount?: number | null;

period: UserRankSummaryDtoPeriod;

resetInSeconds: number;
}
