

export type AttemptSummaryResponseDtoStatus = typeof AttemptSummaryResponseDtoStatus[keyof typeof AttemptSummaryResponseDtoStatus];

export const AttemptSummaryResponseDtoStatus = {
started: 'started',
completed: 'completed',
abandoned: 'abandoned',
} as const;
