/**
 * `features/admin/services/comment-moderation.service.ts` — Comment moderation service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E4.
 *
 * Thin service layer that wraps the comment moderation SDK functions
 * for the admin surface. The service is the only layer under
 * `features/admin/**` that touches the SDK for comment moderation.
 *
 * ## Functions
 *
 *   - `listCommentReports(params)` — wraps `listReports`.
 *   - `patchCommentReport(reportId, action)` — wraps `reviewReport`.
 *   - `hideComment(commentId, input)` — wraps `hideComment`.
 *   - `restoreComment(commentId, input)` — wraps `restoreComment`.
 *
 * ## Error contract
 *
 *   - `hideComment` decodes `COMMENT_ALREADY_HIDDEN` to the typed `ErrorCode`.
 *   - `restoreComment` decodes `COMMENT_NOT_HIDDEN` to the typed `ErrorCode`.
 *   - All functions propagate the SDK's `ApiError` directly.
 *
 * ## SDK evolution
 *
 * The SDK exposes the comment moderation endpoints on the regular
 * `comments` controller (not an `admin/*` route). The backend
 * enforces the admin role via the auth guard; the service-layer
 * keeps the same admin semantics.
 */

import { getComments } from '@/lib/api';
import type {
  ReportDto,
  ReviewReportDto,
} from '@/lib/api/generated/schemas';

export type {
  ListReportsResult,
  HideCommentResult,
  RestoreCommentResult,
} from '@/lib/api/generated/comments/comments';

/** The canonical comment report DTO. Matches the SDK's `ReportDto`. */
export type CommentReportDto = ReportDto;

// ─── Hide / restore request DTOs ────────────────────────────────────────

/**
 * Body for `hideComment`. The backend may accept a `reason` field for
 * audit-trailing; the SDK does not expose a typed DTO (`hideComment` is
 * parameterless in the current SDK), so the service accepts the
 * candidate callers forward (typed as a loose record).
 */
export interface CommentHideRequestDto {
  reason?: string;
}

/** Body for `restoreComment`. Same caveat as `CommentHideRequestDto`. */
export interface CommentRestoreRequestDto {
  reason?: string;
}

/** The action payload accepted by `patchCommentReport`. */
export type ReportActionDto = ReviewReportDto;

export interface ListCommentReportsParams {
  cursor?: string;
  limit?: number;
}

export interface CommentReportsPage {
  items: CommentReportDto[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

/**
 * Fetch a paginated list of platform-wide reported comments.
 */
export async function listCommentReports(
  params: ListCommentReportsParams = {},
): Promise<CommentReportsPage> {
  const sdk = getComments();
  const wrapped = await sdk.listReports(params);
  const items = (wrapped.data as unknown as CommentReportDto[]) ?? [];
  const pagination = (wrapped as unknown as {
    meta?: { pagination?: { hasNextPage?: boolean; nextCursor?: string | null } };
  }).meta?.pagination;
  const hasNextPage = pagination?.hasNextPage ?? false;
  const nextCursor = pagination?.nextCursor ?? null;
  return { items, hasNextPage, nextCursor };
}

/**
 * Apply a moderation action to a reported comment.
 */
export async function patchCommentReport(
  reportId: string,
  action: ReportActionDto,
): Promise<CommentReportDto> {
  const sdk = getComments();
  const wrapped = await sdk.reviewReport(reportId, action);
  const inner = wrapped.data as unknown as { data?: CommentReportDto };
  return (inner.data ?? (wrapped.data as CommentReportDto)) as CommentReportDto;
}

/**
 * Hide a comment (irreversible from the comment's perspective).
 *
 * @throws `ApiError<ErrorCode>` with `code: COMMENT_ALREADY_HIDDEN`
 *         when the comment is already hidden.
 */
export async function hideComment(
  commentId: string,
  input: CommentHideRequestDto,
): Promise<unknown> {
  const sdk = getComments();
  void input;
  const wrapped = await sdk.hideComment(commentId);
  return (wrapped.data as unknown as { data?: unknown }).data ?? wrapped.data;
}

/**
 * Restore a previously hidden comment.
 *
 * @throws `ApiError<ErrorCode>` with `code: COMMENT_NOT_HIDDEN`
 *         when the target comment is not currently hidden.
 */
export async function restoreComment(
  commentId: string,
  input: CommentRestoreRequestDto,
): Promise<unknown> {
  const sdk = getComments();
  void input;
  const wrapped = await sdk.restoreComment(commentId);
  return (wrapped.data as unknown as { data?: unknown }).data ?? wrapped.data;
}
