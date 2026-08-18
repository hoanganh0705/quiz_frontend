

import type { CategoryControllerGetCategoryQuizzesDifficulty } from './categoryControllerGetCategoryQuizzesDifficulty';

export type CategoryControllerGetCategoryQuizzesParams = {

cursor?: string | null;

limit?: number | null;

difficulty?: CategoryControllerGetCategoryQuizzesDifficulty;

tagIds?: string[] | null;
};
