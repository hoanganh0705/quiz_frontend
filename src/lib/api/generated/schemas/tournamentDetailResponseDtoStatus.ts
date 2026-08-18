

export type TournamentDetailResponseDtoStatus = typeof TournamentDetailResponseDtoStatus[keyof typeof TournamentDetailResponseDtoStatus];

export const TournamentDetailResponseDtoStatus = {
upcoming: 'upcoming',
registration: 'registration',
ongoing: 'ongoing',
finished: 'finished',
cancelled: 'cancelled',
} as const;
