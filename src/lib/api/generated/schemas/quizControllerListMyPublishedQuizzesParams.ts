

import type { QuizControllerListMyPublishedQuizzesSort } from './quizControllerListMyPublishedQuizzesSort';
import type { QuizControllerListMyPublishedQuizzesDifficulty } from './quizControllerListMyPublishedQuizzesDifficulty';

export type QuizControllerListMyPublishedQuizzesParams = {

q?: string | null;

sort?: QuizControllerListMyPublishedQuizzesSort;

isHidden?: boolean | null;

minRating?: number | null;

cursor?: string | null;

limit?: number | null;

difficulty?: QuizControllerListMyPublishedQuizzesDifficulty;

categoryId?: string | null;

tagIds?: string[] | null;

creatorId?: string | null;

status?: string | null;

featured?: boolean | null;
};
