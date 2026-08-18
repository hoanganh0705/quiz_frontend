

import type { GlobalRankingDtoWeekly } from './globalRankingDtoWeekly';
import type { GlobalRankingDtoMonthly } from './globalRankingDtoMonthly';
import type { GlobalRankingDtoAllTime } from './globalRankingDtoAllTime';

export interface GlobalRankingDto {

weekly?: GlobalRankingDtoWeekly;

monthly?: GlobalRankingDtoMonthly;

allTime?: GlobalRankingDtoAllTime;
}
