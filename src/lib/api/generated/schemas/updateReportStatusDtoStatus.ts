

export type UpdateReportStatusDtoStatus = typeof UpdateReportStatusDtoStatus[keyof typeof UpdateReportStatusDtoStatus];

export const UpdateReportStatusDtoStatus = {
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const;
