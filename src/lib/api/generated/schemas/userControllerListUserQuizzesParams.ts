

import type { UserControllerListUserQuizzesSort } from './userControllerListUserQuizzesSort';
import type { UserControllerListUserQuizzesDifficulty } from './userControllerListUserQuizzesDifficulty';

export type UserControllerListUserQuizzesParams = {

q?: string | null;

sort?: UserControllerListUserQuizzesSort;

isHidden?: boolean | null;

minRating?: number | null;

cursor?: string | null;

limit?: number | null;

difficulty?: UserControllerListUserQuizzesDifficulty;

categoryId?: string | null;

tagIds?: string[] | null;

creatorId?: string | null;

status?: string | null;

featured?: boolean | null;
};
