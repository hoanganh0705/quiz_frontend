

import type { RankingStatusResponseDtoNextConsistencyCheck } from './rankingStatusResponseDtoNextConsistencyCheck';
import type { RankingStatusResponseDtoNextPeriodReset } from './rankingStatusResponseDtoNextPeriodReset';

export interface RankingStatusResponseDto {

schedulerRunning: boolean;

dirtyQueueSize: number;

nextConsistencyCheck?: RankingStatusResponseDtoNextConsistencyCheck;

nextPeriodReset: RankingStatusResponseDtoNextPeriodReset;
}
