/**
 * Quiz API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { listQuizzes, getQuizBySlug, ... } from '@/features/quizzes/api/quizzes.wrapper'
 */

import {
  listQuizzes,
  getQuizzesPopular,
  getQuizzesTrending,
  getQuizBySlug,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizVersion,
  listQuizVersions,
  updateQuizVersion,
  publishQuizVersion,
  addQuestion,
  addQuestionsBulk,
  type ListQuizzesParams,
} from '@/features/quizzes/api/quizzes.wrapper';

export {
  listQuizzes,
  getQuizzesPopular,
  getQuizzesTrending,
  getQuizBySlug,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizVersion,
  listQuizVersions,
  updateQuizVersion,
  publishQuizVersion,
  addQuestion,
  addQuestionsBulk,
};
export type { ListQuizzesParams };
