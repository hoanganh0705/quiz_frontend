

import type { NearbyRankEntryDto } from './nearbyRankEntryDto';
import type { NearbyRanksResponseDtoMe } from './nearbyRanksResponseDtoMe';

export interface NearbyRanksResponseDto {

above: NearbyRankEntryDto[];

me?: NearbyRanksResponseDtoMe;

below: NearbyRankEntryDto[];
}
