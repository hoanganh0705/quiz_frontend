/**
 * Quiz API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { listQuizzes, getQuizBySlug, ... } from '@/features/quizzes/api/quizzes.wrapper'
 */

import {
  listQuizzes,
  getQuizBySlug,
  getQuizVersionDetail,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizVersion,
  publishQuizVersion,
  addQuestion,
  addQuestionsBulk,
  type ListQuizzesParams,
} from '@/features/quizzes/api/quizzes.wrapper';

export {
  listQuizzes,
  getQuizBySlug,
  getQuizVersionDetail,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizVersion,
  publishQuizVersion,
  addQuestion,
  addQuestionsBulk,
};
export type { ListQuizzesParams };
