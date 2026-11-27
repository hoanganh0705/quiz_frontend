import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";
import type { QuizFilterUrlState } from "@/features/quizzes/types/quiz-filter-params";

export const QUIZ_KEYS = {
  all: ["quizzes"] as const,
  homeBundle: () => ["home", "bundle"] as const,
  list: (filters: QuizFilterUrlState, opts?: { limit?: number }) =>
    ["quizzes", "list", filters, { limit: opts?.limit }] as const,
  popular: (params: { limit?: number; categoryId?: string } = {}) =>
    ["quizzes", "popular", params] as const,
  trending: (params: { limit?: number; categoryId?: string } = {}) =>
    ["quizzes", "trending", params] as const,
  featured: (params: { limit?: number } = {}) =>
    ["quizzes", "featured", params] as const,
  detail: (idOrSlug: string) => ["quizzes", "detail", idOrSlug] as const,
  aggregate: (idOrSlug: string) => ["quizzes", "aggregate", idOrSlug] as const,
  related: (idOrSlug: string, opts?: { limit?: number }) =>
    ["quizzes", "related", idOrSlug, { limit: opts?.limit }] as const,
  author: (quizId: string) => ["quizzes", "author", quizId] as const,
  versions: (quizId: string) => ["quizzes", "versions", quizId] as const,
  version: (quizId: string, versionId: string) =>
    ["quizzes", "version", quizId, versionId] as const,
  mineAll: () => ["quizzes", "me"] as const,
  mine: (tab: MyQuizzesTab) => ["quizzes", "me", tab] as const,
} as const;
