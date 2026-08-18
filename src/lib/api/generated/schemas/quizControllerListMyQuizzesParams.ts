

import type { QuizControllerListMyQuizzesSort } from './quizControllerListMyQuizzesSort';
import type { QuizControllerListMyQuizzesDifficulty } from './quizControllerListMyQuizzesDifficulty';

export type QuizControllerListMyQuizzesParams = {

q?: string | null;

sort?: QuizControllerListMyQuizzesSort;

isHidden?: boolean | null;

minRating?: number | null;

cursor?: string | null;

limit?: number | null;

difficulty?: QuizControllerListMyQuizzesDifficulty;

categoryId?: string | null;

tagIds?: string[] | null;

creatorId?: string | null;

status?: string | null;

featured?: boolean | null;
};
