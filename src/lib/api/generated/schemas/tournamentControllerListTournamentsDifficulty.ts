

export type TournamentControllerListTournamentsDifficulty = typeof TournamentControllerListTournamentsDifficulty[keyof typeof TournamentControllerListTournamentsDifficulty] | null;

export const TournamentControllerListTournamentsDifficulty = {
easy: 'easy',
medium: 'medium',
hard: 'hard',
} as const;
