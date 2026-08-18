

export type TournamentControllerListTournamentsStatus = typeof TournamentControllerListTournamentsStatus[keyof typeof TournamentControllerListTournamentsStatus] | null;

export const TournamentControllerListTournamentsStatus = {
upcoming: 'upcoming',
registration: 'registration',
ongoing: 'ongoing',
finished: 'finished',
cancelled: 'cancelled',
} as const;
