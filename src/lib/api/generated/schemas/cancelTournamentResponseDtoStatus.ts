

export type CancelTournamentResponseDtoStatus = typeof CancelTournamentResponseDtoStatus[keyof typeof CancelTournamentResponseDtoStatus];

export const CancelTournamentResponseDtoStatus = {
upcoming: 'upcoming',
registration: 'registration',
ongoing: 'ongoing',
finished: 'finished',
cancelled: 'cancelled',
} as const;
