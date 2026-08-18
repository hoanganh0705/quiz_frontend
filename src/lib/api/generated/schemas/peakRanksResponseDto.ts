

import type { PeakRanksResponseDtoDaily } from './peakRanksResponseDtoDaily';
import type { PeakRanksResponseDtoWeekly } from './peakRanksResponseDtoWeekly';
import type { PeakRanksResponseDtoMonthly } from './peakRanksResponseDtoMonthly';
import type { PeakRanksResponseDtoAllTime } from './peakRanksResponseDtoAllTime';

export interface PeakRanksResponseDto {

daily?: PeakRanksResponseDtoDaily;

weekly?: PeakRanksResponseDtoWeekly;

monthly?: PeakRanksResponseDtoMonthly;

allTime?: PeakRanksResponseDtoAllTime;
}
