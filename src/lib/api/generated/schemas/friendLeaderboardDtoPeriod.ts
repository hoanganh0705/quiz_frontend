

export type FriendLeaderboardDtoPeriod = typeof FriendLeaderboardDtoPeriod[keyof typeof FriendLeaderboardDtoPeriod];

export const FriendLeaderboardDtoPeriod = {
weekly: 'weekly',
monthly: 'monthly',
all_time: 'all_time',
} as const;
