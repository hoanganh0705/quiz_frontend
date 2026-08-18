

export type QuizControllerListMyPublishedQuizzesSort = typeof QuizControllerListMyPublishedQuizzesSort[keyof typeof QuizControllerListMyPublishedQuizzesSort] | null;

export const QuizControllerListMyPublishedQuizzesSort = {
newest: 'newest',
popular: 'popular',
top_rated: 'top_rated',
trending: 'trending',
} as const;
