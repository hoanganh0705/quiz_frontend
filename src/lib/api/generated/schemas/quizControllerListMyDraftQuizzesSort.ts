

export type QuizControllerListMyDraftQuizzesSort = typeof QuizControllerListMyDraftQuizzesSort[keyof typeof QuizControllerListMyDraftQuizzesSort] | null;

export const QuizControllerListMyDraftQuizzesSort = {
newest: 'newest',
popular: 'popular',
top_rated: 'top_rated',
trending: 'trending',
} as const;
