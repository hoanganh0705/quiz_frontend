

export type TournamentResponseDtoStatus = typeof TournamentResponseDtoStatus[keyof typeof TournamentResponseDtoStatus];

export const TournamentResponseDtoStatus = {
upcoming: 'upcoming',
registration: 'registration',
ongoing: 'ongoing',
finished: 'finished',
cancelled: 'cancelled',
} as const;
