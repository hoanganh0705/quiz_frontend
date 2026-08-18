

import type { UserControllerGetRecentlyPlayedQuizzesSort } from './userControllerGetRecentlyPlayedQuizzesSort';
import type { UserControllerGetRecentlyPlayedQuizzesDifficulty } from './userControllerGetRecentlyPlayedQuizzesDifficulty';

export type UserControllerGetRecentlyPlayedQuizzesParams = {

q?: string | null;

sort?: UserControllerGetRecentlyPlayedQuizzesSort;

isHidden?: boolean | null;

minRating?: number | null;

cursor?: string | null;

limit?: number | null;

difficulty?: UserControllerGetRecentlyPlayedQuizzesDifficulty;

categoryId?: string | null;

tagIds?: string[] | null;

creatorId?: string | null;

status?: string | null;

featured?: boolean | null;
};
