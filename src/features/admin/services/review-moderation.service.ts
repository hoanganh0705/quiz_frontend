

import { getReviews } from '@/lib/api';
import type {
PlatformReportItemDto,
UpdateReportStatusDto,
} from '@/lib/api/generated/schemas';

export type {
AdminReviewControllerListPlatformReportsResult,
AdminReviewControllerUpdateReportStatusResult,
} from '@/lib/api/generated/reviews/reviews';

export type AdminReportDto = PlatformReportItemDto;

export type ReportActionDto = UpdateReportStatusDto;

export interface ListReviewReportsParams {
cursor?: string;
limit?: number;
}

export interface ReviewReportsPage {
items: AdminReportDto[];
hasNextPage: boolean;
nextCursor: string | null;
}

export async function listReviewReports(
params: ListReviewReportsParams = {},
): Promise<ReviewReportsPage> {
const sdk = getReviews();
const wrapped = await sdk.adminReviewControllerListPlatformReports(params);
const items = (wrapped.data as unknown as AdminReportDto[]) ?? [];
const pagination = (wrapped as unknown as {
meta?: { pagination?: { hasNextPage?: boolean; nextCursor?: string | null } };
  }).meta?.pagination;
const hasNextPage = pagination?.hasNextPage ?? false;
const nextCursor = pagination?.nextCursor ?? null;
return { items, hasNextPage, nextCursor };
}

export async function patchReviewReport(
reportId: string,
action: ReportActionDto,
): Promise<AdminReportDto> {
const sdk = getReviews();
const wrapped = await sdk.adminReviewControllerUpdateReportStatus(
reportId,
action,
  );
return (wrapped.data as unknown as AdminReportDto);
}
