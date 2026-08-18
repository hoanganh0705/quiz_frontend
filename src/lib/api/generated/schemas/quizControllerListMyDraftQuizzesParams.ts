

import type { QuizControllerListMyDraftQuizzesSort } from './quizControllerListMyDraftQuizzesSort';
import type { QuizControllerListMyDraftQuizzesDifficulty } from './quizControllerListMyDraftQuizzesDifficulty';

export type QuizControllerListMyDraftQuizzesParams = {

q?: string | null;

sort?: QuizControllerListMyDraftQuizzesSort;

isHidden?: boolean | null;

minRating?: number | null;

cursor?: string | null;

limit?: number | null;

difficulty?: QuizControllerListMyDraftQuizzesDifficulty;

categoryId?: string | null;

tagIds?: string[] | null;

creatorId?: string | null;

status?: string | null;

featured?: boolean | null;
};
