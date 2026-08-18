

export type ListInstancesDifficulty = typeof ListInstancesDifficulty[keyof typeof ListInstancesDifficulty] | null;

export const ListInstancesDifficulty = {
easy: 'easy',
medium: 'medium',
hard: 'hard',
} as const;
