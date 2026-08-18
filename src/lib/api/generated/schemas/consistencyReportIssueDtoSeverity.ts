

export type ConsistencyReportIssueDtoSeverity = typeof ConsistencyReportIssueDtoSeverity[keyof typeof ConsistencyReportIssueDtoSeverity];

export const ConsistencyReportIssueDtoSeverity = {
low: 'low',
medium: 'medium',
high: 'high',
critical: 'critical',
} as const;
