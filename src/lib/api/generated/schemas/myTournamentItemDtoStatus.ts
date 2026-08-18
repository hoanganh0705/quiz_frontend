

export type MyTournamentItemDtoStatus = typeof MyTournamentItemDtoStatus[keyof typeof MyTournamentItemDtoStatus];

export const MyTournamentItemDtoStatus = {
upcoming: 'upcoming',
registration: 'registration',
ongoing: 'ongoing',
finished: 'finished',
cancelled: 'cancelled',
} as const;
