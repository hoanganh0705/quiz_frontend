

import type { ReportReviewDtoReason } from './reportReviewDtoReason';

export interface ReportReviewDto {

reason: ReportReviewDtoReason;

details?: string | null;

idempotencyKey?: string | null;
}
