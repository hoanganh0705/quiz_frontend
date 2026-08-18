

export type UserControllerListUserQuizzesSort = typeof UserControllerListUserQuizzesSort[keyof typeof UserControllerListUserQuizzesSort] | null;

export const UserControllerListUserQuizzesSort = {
newest: 'newest',
popular: 'popular',
top_rated: 'top_rated',
trending: 'trending',
} as const;
