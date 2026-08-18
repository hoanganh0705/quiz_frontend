

import type {
PlatformReportItemDto,
PlatformReportItemDtoReason,
PlatformReportItemDtoStatus,
UpdateReportStatusDto,
} from '@/lib/api/generated/schemas';

export type ReportState = PlatformReportItemDtoStatus;

export const REPORT_STATES = Object.freeze({
open: 'open',
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const);

export type ReportAction = UpdateReportStatusDto['status'];

export const REPORT_ACTIONS_SDK = Object.freeze({
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const) satisfies Readonly<Record<ReportAction, ReportAction>>;

export type ReportReason = PlatformReportItemDtoReason;

export type AdminReportDto = PlatformReportItemDto;

export interface AdminReportListDto {
items: AdminReportDto[];
hasNextPage: boolean;
nextCursor: string | null;
}

export const REVIEW_REPORTS_PAGE_SIZE = 20;

export function assertReportStateExhaustive(value: never): never {
throw new Error(`Unreachable state in ReportState: ${String(value)}`);
}

export function isReportState(value: unknown): value is ReportState {
return (
typeof value === 'string' &&
(value === 'open' ||
value === 'reviewed' ||
value === 'dismissed' ||
value === 'actioned')
  );
}

export function isReportAction(value: unknown): value is ReportAction {
return (
typeof value === 'string' &&
(value === 'reviewed' || value === 'dismissed' || value === 'actioned')
  );
}

export function isReportReason(value: unknown): value is ReportReason {
return (
typeof value === 'string' &&
(value === 'spam' ||
value === 'harassment' ||
value === 'inappropriate_content' ||
value === 'misinformation' ||
value === 'other')
  );
}

export const DEFAULT_REPORT_STATUS_FILTER: ReportState = 'open';