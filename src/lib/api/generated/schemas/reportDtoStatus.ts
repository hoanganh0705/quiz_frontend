

export type ReportDtoStatus = typeof ReportDtoStatus[keyof typeof ReportDtoStatus];

export const ReportDtoStatus = {
open: 'open',
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const;
