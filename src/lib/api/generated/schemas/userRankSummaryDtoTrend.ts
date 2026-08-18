

export type UserRankSummaryDtoTrend = typeof UserRankSummaryDtoTrend[keyof typeof UserRankSummaryDtoTrend];

export const UserRankSummaryDtoTrend = {
up: 'up',
down: 'down',
same: 'same',
new: 'new',
} as const;
