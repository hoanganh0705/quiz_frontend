

export type TournamentResponseDtoDifficulty = typeof TournamentResponseDtoDifficulty[keyof typeof TournamentResponseDtoDifficulty];

export const TournamentResponseDtoDifficulty = {
easy: 'easy',
medium: 'medium',
hard: 'hard',
} as const;
