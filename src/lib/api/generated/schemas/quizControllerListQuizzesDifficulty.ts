

export type QuizControllerListQuizzesDifficulty = typeof QuizControllerListQuizzesDifficulty[keyof typeof QuizControllerListQuizzesDifficulty] | null;

export const QuizControllerListQuizzesDifficulty = {
easy: 'easy',
medium: 'medium',
hard: 'hard',
} as const;
