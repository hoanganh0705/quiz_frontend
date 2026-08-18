

export type UserControllerGetRecentlyPlayedQuizzesSort = typeof UserControllerGetRecentlyPlayedQuizzesSort[keyof typeof UserControllerGetRecentlyPlayedQuizzesSort] | null;

export const UserControllerGetRecentlyPlayedQuizzesSort = {
newest: 'newest',
popular: 'popular',
top_rated: 'top_rated',
trending: 'trending',
} as const;
