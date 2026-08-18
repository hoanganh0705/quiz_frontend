

import type { ReportedReviewItemDto } from './reportedReviewItemDto';
import type { ReportedReviewsPaginationDto } from './reportedReviewsPaginationDto';

export interface ReportedReviewsResponseDto {

items: ReportedReviewItemDto[];

pagination: ReportedReviewsPaginationDto;
}
