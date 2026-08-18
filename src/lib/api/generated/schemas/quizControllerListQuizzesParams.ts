

import type { QuizControllerListQuizzesSort } from './quizControllerListQuizzesSort';
import type { QuizControllerListQuizzesDifficulty } from './quizControllerListQuizzesDifficulty';

export type QuizControllerListQuizzesParams = {

q?: string | null;

sort?: QuizControllerListQuizzesSort;

isHidden?: boolean | null;

minRating?: number | null;

cursor?: string | null;

limit?: number | null;

difficulty?: QuizControllerListQuizzesDifficulty;

categoryId?: string | null;

tagIds?: string[] | null;

creatorId?: string | null;

status?: string | null;

featured?: boolean | null;
};
