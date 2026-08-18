

export type RecalculateResponseDtoPeriod = typeof RecalculateResponseDtoPeriod[keyof typeof RecalculateResponseDtoPeriod] | null;

export const RecalculateResponseDtoPeriod = {
daily: 'daily',
weekly: 'weekly',
monthly: 'monthly',
all_time: 'all_time',
} as const;
