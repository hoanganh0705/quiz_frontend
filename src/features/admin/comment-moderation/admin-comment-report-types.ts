

import type {
ReportDto,
ReportDtoStatus,
ReviewReportDto,
ReviewReportDtoStatus,
} from '@/lib/api/generated/schemas';

import type {
CommentHideRequestDto,
CommentReportsPage,
CommentRestoreRequestDto,
} from '@/features/admin/services/comment-moderation.service';

export type CommentReportState = ReportDtoStatus;

export const COMMENT_REPORT_STATES = Object.freeze({
open: 'open',
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const);

export type CommentReportAction = ReviewReportDtoStatus;

export const COMMENT_REPORT_ACTIONS_SDK = Object.freeze({
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const) satisfies Readonly<Record<CommentReportAction, CommentReportAction>>;

export type CommentReportActionPayload = ReviewReportDto;

export type CommentReportDto = ReportDto;

export type CommentReportListDto = CommentReportsPage;

export type { CommentReportsPage };

export const COMMENT_REPORTS_PAGE_SIZE = 20;

export type { CommentHideRequestDto, CommentRestoreRequestDto };

export type CommentReportShowFilter = 'pending' | 'resolved';

export const COMMENT_REPORT_SHOW_FILTERS = Object.freeze({
pending: 'pending',
resolved: 'resolved',
} as const) satisfies Readonly<
Record<CommentReportShowFilter, CommentReportShowFilter>
>;

export const DEFAULT_COMMENT_REPORT_SHOW_FILTER: CommentReportShowFilter =
'pending';

export function assertCommentReportStateExhaustive(value: never): never {
throw new Error(
`Unreachable state in CommentReportState: ${String(value)}`,
  );
}

export function isCommentReportState(value: unknown): value is CommentReportState {
return (
typeof value === 'string' &&
(value === 'open' ||
value === 'reviewed' ||
value === 'dismissed' ||
value === 'actioned')
  );
}

export function isCommentReportAction(
value: unknown,
): value is CommentReportAction {
return (
typeof value === 'string' &&
(value === 'reviewed' || value === 'dismissed' || value === 'actioned')
  );
}

export function isCommentReportShowFilter(
value: unknown,
): value is CommentReportShowFilter {
return (
typeof value === 'string' &&
(value === 'pending' || value === 'resolved')
  );
}