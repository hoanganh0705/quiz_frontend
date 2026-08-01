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
 *
 * ## Story 3.6 additions (TKT-3.6.A2)
 *
 * - `getQuizByIdOrSlug` wraps `quizControllerGetQuizById`, which
 *   accepts a UUID or a slug at the same path parameter. The legacy
 *   `getQuizBySlug` is retained as a compatibility alias because the
 *   existing detail page still imports it; the body forwards to the
 *   same SDK operation. Story 3.6 hooks should use `getQuizByIdOrSlug`.
 * - `getQuizStatsByIdOrSlug` wraps `quizControllerGetQuizStats`. No
 *   version / author endpoint is used. Stats 404 is mapped to the
 *   no-stats state in the B3 hook, not here.
 *
 * ## Story 3.7 additions (TKT-3.7.A2)
 *
 * - `getQuizzesFeatured` wraps `quizControllerGetFeaturedQuizzes`. The
 *   editorial fixed-set endpoint accepts `{ limit?: number }` only —
 *   NO `cursor`, NO `categoryId` (see TKT-3.7.A1 §4.1). The planning
 *   doc (Story 3.7 line 760) named the SDK operation
 *   `quizzesControllerGetQuizzesFeatured`; the regenerated SDK name
 *   is `quizControllerGetFeaturedQuizzes` — the wrapper renames to
 *   `getQuizzesFeatured` to preserve planning intent. The hook
 *   `useQuizzesFeatured` (TKT-3.7.C1) consumes this wrapper.
 */

import { getQuizzes } from "@/lib/api/generated/quizzes/quizzes";
import type {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuizVersionDto,
  UpdateQuizVersionDto,
  CreateQuizQuestionDto,
  CreateQuizQuestionsDto,
  QuizListItemDto,
  QuizResponseDto,
  QuizStatsResponseDto,
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
  // TKT-3.6.A2 — detail + stats result aliases
  QuizControllerGetQuizByIdResult,
  QuizControllerGetQuizStatsResult,
  // TKT-3.7.A2 — featured result alias
  QuizControllerGetFeaturedQuizzesResult,
  // TKT-3.8.A2 — related result alias (Story 3.8)
  QuizControllerGetRelatedQuizzesResult,
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

/**
 * Non-paginated fixed editorial set of featured quizzes.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.A2.
 *
 * Wraps `getQuizzes().quizControllerGetFeaturedQuizzes(params)`.
 * Returns the inner unwrapped `{ data?: QuizListItemDto[] }` envelope
 * (a plain array — NO `meta.pagination`, see TKT-3.7.A1 §2.1). The
 * endpoint accepts `{ limit?: number }` only (1–100) — NO `cursor`,
 * NO `categoryId` (see TKT-3.7.A1 §4.1).
 *
 * The hook `useQuizzesFeatured` (TKT-3.7.C1) is the intended consumer.
 */
export async function getQuizzesFeatured(params?: {
  limit?: number;
}): Promise<{
  data?: QuizListItemDto[];
}> {
  const sdk = getQuizzes();
  return sdk.quizControllerGetFeaturedQuizzes(params);
}

/**
 * Public read: full quiz by ID or slug.
 *
 * Source epic: Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.A2.
 *
 * Wraps `getQuizzes().quizControllerGetQuizById(idOrSlug)`. The
 * generated SDK accepts either a UUID or a slug at the same path
 * parameter; do not branch to `listQuizVersions` or any author-view
 * endpoint here. The published-version questions arrive player-safe
 * (no `isCorrect`), but `A3` enforces the boundary anyway.
 *
 * The `useQuizByIdOrSlug` hook (TKT-3.6.B2) is the only intended
 * consumer. Components reach the wrapper indirectly through the hook.
 */
export async function getQuizByIdOrSlug(
  idOrSlug: string,
): Promise<QuizResponseDto> {
  const sdk = getQuizzes();
  return (await sdk.quizControllerGetQuizById(
    idOrSlug,
  )) as unknown as QuizResponseDto;
}

/**
 * Public read: aggregate stats for a quiz identified by ID or slug.
 *
 * Source epic: Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.A2.
 *
 * Wraps `getQuizzes().quizControllerGetQuizStats(idOrSlug)`. The
 * response is a `QuizStatsResponseDto` with aggregate metrics only —
 * no historical activity series. A `404` is mapped to the no-stats
 * state in the `useQuizStatsByIdOrSlug` hook (TKT-3.6.B3), not here.
 *
 * The wrapper declares the unwrapped DTO type explicitly because
 * the generated SDK still types the return as `WrappedDto & AllOf`,
 * while `orvalCustomInstance` unwraps the envelope at runtime.
 */
export async function getQuizStatsByIdOrSlug(
  idOrSlug: string,
): Promise<QuizStatsResponseDto> {
  const sdk = getQuizzes();
  return (await sdk.quizControllerGetQuizStats(
    idOrSlug,
  )) as unknown as QuizStatsResponseDto;
}

/**
 * Non-paginated top list of related quizzes for the quiz identified by
 * `idOrSlug`.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.A2.
 *
 * Wraps `getQuizzes().quizControllerGetRelatedQuizzes(slug, params)`.
 * The endpoint accepts UUID or slug at the same `:slug` path
 * parameter (matches the Story 3.6 detail convention on
 * `quizControllerGetQuizById`); the backend disambiguates.
 *
 * Returns the inner-unwrapped `{ data?: QuizListItemDto[] }` envelope
 * (TKT-3.8.A1 §2 — NO `meta.pagination`, NO `cursor`).
 *
 * The hook `useQuizRelated` (TKT-3.8.B1) consumes this wrapper with
 * `{ limit: 4 }` to match the Story 3.8 line 878 baseline
 * "Skeleton grid × 4".
 */
export async function getQuizzesRelated(
  idOrSlug: string,
  params?: { limit?: number },
): Promise<{
  data?: import("@/lib/api/generated/schemas").QuizListItemDto[];
}> {
  const sdk = getQuizzes();
  return sdk.quizControllerGetRelatedQuizzes(idOrSlug, params);
}

/**
 * @deprecated Use `getQuizByIdOrSlug` instead. Retained for the
 * legacy detail page until the migration in TKT-3.6.F3 deletes the
 * import. The body forwards to the same SDK operation.
 */
export async function getQuizBySlug(slug: string) {
  return getQuizByIdOrSlug(slug);
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
