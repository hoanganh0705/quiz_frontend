

export type RecentlyPlayedQuizItemDtoDifficulty = typeof RecentlyPlayedQuizItemDtoDifficulty[keyof typeof RecentlyPlayedQuizItemDtoDifficulty];

export const RecentlyPlayedQuizItemDtoDifficulty = {
easy: 'easy',
medium: 'medium',
hard: 'hard',
} as const;
