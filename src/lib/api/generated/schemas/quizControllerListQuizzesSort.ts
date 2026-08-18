

export type QuizControllerListQuizzesSort = typeof QuizControllerListQuizzesSort[keyof typeof QuizControllerListQuizzesSort] | null;

export const QuizControllerListQuizzesSort = {
newest: 'newest',
popular: 'popular',
top_rated: 'top_rated',
trending: 'trending',
} as const;
