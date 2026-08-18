

export type UserRankPositionDtoTrend = typeof UserRankPositionDtoTrend[keyof typeof UserRankPositionDtoTrend];

export const UserRankPositionDtoTrend = {
up: 'up',
down: 'down',
same: 'same',
new: 'new',
} as const;
