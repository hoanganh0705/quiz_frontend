

export type DailyChallengeResponseDtoDifficulty = typeof DailyChallengeResponseDtoDifficulty[keyof typeof DailyChallengeResponseDtoDifficulty];

export const DailyChallengeResponseDtoDifficulty = {
easy: 'easy',
medium: 'medium',
hard: 'hard',
} as const;
