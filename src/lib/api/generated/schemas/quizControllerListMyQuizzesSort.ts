

export type QuizControllerListMyQuizzesSort = typeof QuizControllerListMyQuizzesSort[keyof typeof QuizControllerListMyQuizzesSort] | null;

export const QuizControllerListMyQuizzesSort = {
newest: 'newest',
popular: 'popular',
top_rated: 'top_rated',
trending: 'trending',
} as const;
