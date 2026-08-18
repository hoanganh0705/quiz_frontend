

export type QuizReviewControllerListReviewsSort = typeof QuizReviewControllerListReviewsSort[keyof typeof QuizReviewControllerListReviewsSort] | null;

export const QuizReviewControllerListReviewsSort = {
helpful: 'helpful',
newest: 'newest',
highest_rating: 'highest_rating',
lowest_rating: 'lowest_rating',
} as const;
