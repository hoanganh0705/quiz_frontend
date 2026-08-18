

import type { WinnerSummaryDto } from './winnerSummaryDto';

export interface RecentWinnersResponseDto {

winners: WinnerSummaryDto[];

lastUpdated: string;
}
