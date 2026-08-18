

import type { MyReviewItemDto } from './myReviewItemDto';
import type { MyReviewsPaginationDto } from './myReviewsPaginationDto';

export interface MyReviewsResponseDto {

items: MyReviewItemDto[];

pagination: MyReviewsPaginationDto;
}
