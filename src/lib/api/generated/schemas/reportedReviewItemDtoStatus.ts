

export type ReportedReviewItemDtoStatus = typeof ReportedReviewItemDtoStatus[keyof typeof ReportedReviewItemDtoStatus];

export const ReportedReviewItemDtoStatus = {
open: 'open',
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const;
