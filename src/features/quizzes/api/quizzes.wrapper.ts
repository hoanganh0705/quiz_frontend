/**
 * Quizzes wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 *
 * Source epic: Epic 3.3/3.4/3.5 — public discovery surfaces.
 * Source ticket: TKT-3.5.A2 (popular + trending extensions + `tagIds` field).
 *
 * The wrapper is the ONLY place the quizzes SDK is imported. Hooks
 * and components in `src/features/quizzes/**` import from
 * `@/features/quizzes` (this barrel); they MUST NOT import from
 * `@/lib/api/generated/quizzes/quizzes` directly. This is the
 * cross-story contract rule #1 (no direct axios calls / SDK imports
 * outside `src/lib/api/**` and the wrapper).
 *
 * ## Drift notes (TKT-3.5.A1)
 *
 * - `getQuizzesPopular` wraps `quizControllerGetPopularQuizzes`; the
 *   SDK does NOT accept `cursor` (drift from Story 3.5 line 522).
 *   The endpoint is limit-bounded.
 * - `getQuizzesTrending` wraps `quizControllerGetTrendingQuizzes`;
 *   same drift — no `cursor` on the wire.
 * - The popular + trending endpoints return `PopularQuizItemDto` and
 *   `TrendingQuizItemDto` respectively — NOT `QuizListItemDto`. The
 *   hooks in B2 / B3 return the raw popular/trending DTOs; the
 *   strip components (Batch C/D) are responsible for projection.
 * - `ListQuizzesParams.tagIds` is the SDK's UUIDv7-array field; the
 *   planning doc called it `tags=slug1,slug2` (drift #1 in A1). The
 *   `<FilterBar />` slot (Batch C) accepts slugs; the fetcher
 *   adapter (B1) resolves slugs → UUIDv7 ids before sending.
 * - `ListQuizzesParams.search` was previously exposed but the SDK
 *   does not accept it (drift #3 in A1). The field is dropped from
 *   the wrapper's typed surface; downstream callers should pass
 *   `tagSlugs` (via the planning-intent filter state in A3) instead.
 * - `sort` is NOT on the wire (drift #2 in A1). The directory
 *   applies the sort client-side on the items returned for the
 *   current page.
 */

import { getQuizzes } from "@/lib/api/generated/quizzes/quizzes";
import type {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuizVersionDto,
  UpdateQuizVersionDto,
  CreateQuizQuestionDto,
  CreateQuizQuestionsDto,
} from "@/lib/api/generated/schemas";

// Re-export types for convenience
export type {
  QuizControllerCreateQuizResult,
  QuizControllerListQuizzesResult,
  QuizControllerUpdateQuizResult,
  QuizControllerDeleteQuizResult,
  QuizControllerCreateQuizVersionResult,
  QuizControllerListQuizVersionsResult,
  QuizControllerCreateQuizQuestionResult,
  QuizControllerCreateQuizQuestionsResult,
  // TKT-3.5.A2 — popular + trending result aliases
  QuizControllerGetPopularQuizzesResult,
  QuizControllerGetTrendingQuizzesResult,
} from "@/lib/api/generated/quizzes/quizzes";

// ─── Query Parameters ──────────────────────────────────────────────────────────

export interface ListQuizzesParams {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  difficulty?: "easy" | "medium" | "hard";
  /**
   * Filter by tag UUIDs (OR semantics). Must be valid UUID v7 values.
   * The `<FilterBar />` slot accepts slugs from the user; the fetcher
   * adapter (Epic 3.5 B1) resolves slugs → UUIDv7 ids before
   * forwarding to the SDK.
   *
   * Drift from Story 3.5 line 522 / 575: the planning doc called this
   * `tags=slug1,slug2`; the actual SDK field is `tagIds: string[]`.
   */
  tagIds?: string[];
  creatorId?: string;
  /**
   * Filter to featured quizzes only. Consumed by the home rails and
   * the onboarding quiz-recommendations step (Story 3.7).
   */
  featured?: boolean;
}

// ─── Quiz Endpoints ─────────────────────────────────────────────────────────────

export async function listQuizzes(params?: ListQuizzesParams) {
  const sdk = getQuizzes();
  // Forward the documented fields. `tagIds` is the SDK's UUIDv7 array
  // (drift from Story 3.5 line 522 — planning doc called it
  // `tags=slug1,slug2`). `search` was previously forwarded but the
  // SDK does NOT accept it (drift #3 in A1); the field is dropped
  // from `ListQuizzesParams`.
  const forwarded: Record<string, unknown> = {};
  if (params?.cursor !== undefined) forwarded.cursor = params.cursor;
  if (params?.limit !== undefined) forwarded.limit = params.limit;
  if (params?.categoryId !== undefined)
    forwarded.categoryId = params.categoryId;
  if (params?.difficulty !== undefined)
    forwarded.difficulty = params.difficulty;
  if (params?.tagIds !== undefined) forwarded.tagIds = params.tagIds;
  if (params?.creatorId !== undefined) forwarded.creatorId = params.creatorId;
  if (params?.featured !== undefined) forwarded.featured = params.featured;
  return sdk.quizControllerListQuizzes(
    forwarded as Parameters<typeof sdk.quizControllerListQuizzes>[0],
  );
}

/**
 * Non-paginated top list of popular quizzes.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.A2.
 *
 * Wraps `getQuizzes().quizControllerGetPopularQuizzes(params)`.
 * Returns `WrappedDto & { data?: PopularQuizItemDto[] }` (NOT
 * `QuizListItemDto[]` — see TKT-3.5.A1 §6 drift #6). The `limit`
 * parameter is bounded (1–100) per the OpenAPI spec; the endpoint
 * does NOT accept `cursor` (drift from Story 3.5 line 522).
 *
 * The hook `useQuizzesPopular` (TKT-3.5.B2) consumes this wrapper.
 */
export async function getQuizzesPopular(params?: {
  limit?: number;
  categoryId?: string;
}): Promise<{
  data?: import("@/lib/api/generated/schemas").PopularQuizItemDto[];
}> {
  const sdk = getQuizzes();
  return sdk.quizControllerGetPopularQuizzes(params);
}

/**
 * Non-paginated top list of trending quizzes.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.A2.
 *
 * Wraps `getQuizzes().quizControllerGetTrendingQuizzes(params)`.
 * Returns `WrappedDto & { data?: TrendingQuizItemDto[] }`. Same
 * drift notes as `getQuizzesPopular` — see A1 §6.
 *
 * The hook `useQuizzesTrending` (TKT-3.5.B3) consumes this wrapper.
 */
export async function getQuizzesTrending(params?: {
  limit?: number;
  categoryId?: string;
}): Promise<{
  data?: import("@/lib/api/generated/schemas").TrendingQuizItemDto[];
}> {
  const sdk = getQuizzes();
  return sdk.quizControllerGetTrendingQuizzes(params);
}

export async function getQuizBySlug(slug: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetQuizBySlug(slug);
}

// ─── Admin-only Functions ───────────────────────────────────────────────────────

export async function createQuiz(params: CreateQuizDto) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuiz(params);
}

export async function updateQuiz(id: string, params: UpdateQuizDto) {
  const sdk = getQuizzes();
  return sdk.quizControllerUpdateQuiz(id, params);
}

export async function deleteQuiz(id: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerDeleteQuiz(id);
}

// ─── Version Management ──────────────────────────────────────────────────────────

export async function createQuizVersion(
  quizId: string,
  params: CreateQuizVersionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizVersion(quizId, params);
}

export async function listQuizVersions(
  quizId: string,
  params?: { cursor?: string; limit?: number },
) {
  const sdk = getQuizzes();
  return sdk.quizControllerListQuizVersions(quizId, params);
}

export async function updateQuizVersion(
  versionId: string,
  params: UpdateQuizVersionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizVersionControllerUpdateQuizVersion(versionId, params);
}

export async function publishQuizVersion(versionId: string) {
  const sdk = getQuizzes();
  return sdk.quizVersionControllerPublishQuizVersion(versionId);
}

// ─── Question Management ────────────────────────────────────────────────────────

export async function addQuestion(
  quizId: string,
  versionId: string,
  params: CreateQuizQuestionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestion(quizId, versionId, params);
}

export async function addQuestionsBulk(
  quizId: string,
  versionId: string,
  params: CreateQuizQuestionsDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestions(quizId, versionId, params);
}
