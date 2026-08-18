

export type PlatformReportItemDtoStatus = typeof PlatformReportItemDtoStatus[keyof typeof PlatformReportItemDtoStatus];

export const PlatformReportItemDtoStatus = {
open: 'open',
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const;
