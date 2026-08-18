

export type PeriodResetResponseDtoPeriod = typeof PeriodResetResponseDtoPeriod[keyof typeof PeriodResetResponseDtoPeriod];

export const PeriodResetResponseDtoPeriod = {
daily: 'daily',
weekly: 'weekly',
monthly: 'monthly',
all_time: 'all_time',
} as const;
