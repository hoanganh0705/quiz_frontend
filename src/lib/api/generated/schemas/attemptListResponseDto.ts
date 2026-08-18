

import type { AttemptSummaryResponseDto } from './attemptSummaryResponseDto';
import type { AttemptPaginationResponseDto } from './attemptPaginationResponseDto';

export interface AttemptListResponseDto {

items: AttemptSummaryResponseDto[];

pagination: AttemptPaginationResponseDto;
}
