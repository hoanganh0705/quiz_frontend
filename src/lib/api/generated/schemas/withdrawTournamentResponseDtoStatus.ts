

export type WithdrawTournamentResponseDtoStatus = typeof WithdrawTournamentResponseDtoStatus[keyof typeof WithdrawTournamentResponseDtoStatus];

export const WithdrawTournamentResponseDtoStatus = {
active: 'active',
withdrawn: 'withdrawn',
completed: 'completed',
} as const;
