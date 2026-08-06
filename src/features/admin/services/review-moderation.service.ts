/**
 * `features/admin/services/review-moderation.service.ts` — Review moderation service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E3.
 *
 * Thin service layer that wraps the regenerated review moderation SDK
 * functions. The service is the only layer under `features/admin/**`
 * that touches the SDK for review moderation.
 *
 * ## Functions
 *
 *   - `listReviewReports(params)` — wraps `adminReviewControllerListPlatformReports`.
 *   - `patchReviewReport(reportId, action)` — wraps `adminReviewControllerUpdateReportStatus`.
 *
 * ## Error contract
 *
 * `patchReviewReport` decodes `REVIEW_REPORT_ALREADY_RESOLVED` to the
 * typed `ErrorCode`. The function propagates the SDK's `ApiError`
 * directly; the `ApiError.code` getter resolves to a typed `ErrorCode`
 * from `@/lib/api/error-codes`.
 */

import { getReviews } from '@/lib/api';
import type {
  PlatformReportItemDto,
  UpdateReportStatusDto,
} from '@/lib/api/generated/schemas';

export type {
  AdminReviewControllerListPlatformReportsResult,
  AdminReviewControllerUpdateReportStatusResult,
} from '@/lib/api/generated/reviews/reviews';

/** The canonical admin report DTO. Matches the SDK's `PlatformReportItemDto`. */
export type AdminReportDto = PlatformReportItemDto;

/** The action payload accepted by `patchReviewReport`. */
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

/**
 * Fetch a paginated list of platform-wide reported reviews for the
 * moderation queue.
 */
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

/**
 * Apply a moderation action to a reported review.
 *
 * @throws `ApiError<ErrorCode>` with `code: REVIEW_REPORT_ALREADY_RESOLVED`
 *         when the report has already been resolved by another admin.
 */
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
