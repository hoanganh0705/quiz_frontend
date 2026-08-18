

import type { PlatformReportItemDtoReason } from './platformReportItemDtoReason';
import type { PlatformReportItemDtoStatus } from './platformReportItemDtoStatus';

export interface PlatformReportItemDto {

reportId: string;

reviewId: string;

quizId: string;

quizTitle: string;

reviewerUsername: string;

reportedUserId: string;

rating: number;

comment?: string | null;

reason: PlatformReportItemDtoReason;

details?: string | null;

status: PlatformReportItemDtoStatus;

createdAt: string;

updatedAt?: string | null;
}
