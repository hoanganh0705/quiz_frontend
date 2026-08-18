

export type ReviewReportDtoStatus = typeof ReviewReportDtoStatus[keyof typeof ReviewReportDtoStatus];

export const ReviewReportDtoStatus = {
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const;
