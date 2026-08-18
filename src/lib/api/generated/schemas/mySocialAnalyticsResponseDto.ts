

import type { MySocialAnalyticsResponseDtoStaleAt } from './mySocialAnalyticsResponseDtoStaleAt';

export interface MySocialAnalyticsResponseDto {

friends: number;

followers: number;

following: number;

growth30Days: number;

staleAt?: MySocialAnalyticsResponseDtoStaleAt;

isStale: boolean;
}
