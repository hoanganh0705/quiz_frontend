

export type TournamentRoundResponseDtoStatus = typeof TournamentRoundResponseDtoStatus[keyof typeof TournamentRoundResponseDtoStatus];

export const TournamentRoundResponseDtoStatus = {
pending: 'pending',
open: 'open',
finished: 'finished',
} as const;
