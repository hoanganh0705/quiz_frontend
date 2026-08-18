

export type PeriodInfoDtoType = typeof PeriodInfoDtoType[keyof typeof PeriodInfoDtoType];

export const PeriodInfoDtoType = {
daily: 'daily',
weekly: 'weekly',
monthly: 'monthly',
all_time: 'all_time',
} as const;
