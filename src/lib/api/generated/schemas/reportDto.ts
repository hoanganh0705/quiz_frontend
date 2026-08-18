

import type { ReportDtoStatus } from './reportDtoStatus';

export interface ReportDto {

reportId: string;

reporterId: string;

commentId: string;

reason: string;

details: string | null;

status: ReportDtoStatus;

reviewedByUserId: string | null;

reviewedAt: string | null;

actionTaken: boolean;

createdAt: string;

updatedAt: string;
}
