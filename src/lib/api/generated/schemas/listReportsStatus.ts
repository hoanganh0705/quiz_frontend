

export type ListReportsStatus = typeof ListReportsStatus[keyof typeof ListReportsStatus];

export const ListReportsStatus = {
open: 'open',
reviewed: 'reviewed',
dismissed: 'dismissed',
actioned: 'actioned',
} as const;
