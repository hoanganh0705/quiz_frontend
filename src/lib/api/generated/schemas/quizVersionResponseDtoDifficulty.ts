

export type QuizVersionResponseDtoDifficulty = typeof QuizVersionResponseDtoDifficulty[keyof typeof QuizVersionResponseDtoDifficulty];

export const QuizVersionResponseDtoDifficulty = {
easy: 'easy',
medium: 'medium',
hard: 'hard',
} as const;
