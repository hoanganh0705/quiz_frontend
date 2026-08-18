

import type { ReviewResponseDto } from './reviewResponseDto';
import type { ReviewPaginationResponseDto } from './reviewPaginationResponseDto';

export interface ReviewListResponseDto {

items: ReviewResponseDto[];

pagination: ReviewPaginationResponseDto;
}
