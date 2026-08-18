

export type UserRankSummaryDtoPeriod = typeof UserRankSummaryDtoPeriod[keyof typeof UserRankSummaryDtoPeriod];

export const UserRankSummaryDtoPeriod = {
daily: 'daily',
weekly: 'weekly',
monthly: 'monthly',
all_time: 'all_time',
} as const;
