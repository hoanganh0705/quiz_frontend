

export type ConsistencyReportIssueDtoType = typeof ConsistencyReportIssueDtoType[keyof typeof ConsistencyReportIssueDtoType];

export const ConsistencyReportIssueDtoType = {
xp_mismatch: 'xp_mismatch',
rank_gap: 'rank_gap',
missing_rank: 'missing_rank',
} as const;
