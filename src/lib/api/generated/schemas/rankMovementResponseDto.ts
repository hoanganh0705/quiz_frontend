

import type { RankMovementResponseDtoDirection } from './rankMovementResponseDtoDirection';

export interface RankMovementResponseDto {

previousRank?: number | null;

currentRank?: number | null;

change?: number | null;

direction: RankMovementResponseDtoDirection;
}
