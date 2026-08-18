

export type TournamentLeaderboardEntryDtoStatus = typeof TournamentLeaderboardEntryDtoStatus[keyof typeof TournamentLeaderboardEntryDtoStatus];

export const TournamentLeaderboardEntryDtoStatus = {
active: 'active',
withdrawn: 'withdrawn',
completed: 'completed',
} as const;
