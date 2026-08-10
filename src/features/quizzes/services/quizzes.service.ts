/**
 * `quizzes.service.ts` — Phase 4 quiz write-path service.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.F1.
 *
 * The single import surface for every Phase 4 quiz mutation:
 *
 *   - Quiz CRUD:        create / update / delete / listMy*
 *   - Version lifecycle: createVersion / listVersions / getVersion / updateVersion / publishVersion
 *   - Questions:         createQuestion / bulkCreateQuestions
 *
 * Re-exporting the per-feature DTOs and `Result` types keeps callers
 * (the per-feature mutation hooks of stories 4.8 / 4.9 / 4.10 / 4.11
 * — QuizEditor, QuizVersionPublisher, BulkQuestionCreator) from
 * reaching into the SDK barrel directly.
 *
 * ## Pattern: thin pass-through
 *
 * Like the existing `attempt.wrapper.ts`, `bookmark.wrapper.ts`,
 * `review.wrapper.ts`, `user.wrapper.ts`, this service is a typed
 * pass-through to the generated SDK (`getQuizzes()`). Cross-cutting
 * concerns (cache invalidation, telemetry, retry, mutation hooks) are
 * owned by the per-feature hooks — NOT this service. `useOptimisticMutation`
 * (TKT-4.1.E1) is the consumer-facing primitive.
 *
 * ## Error surfacing
 *
 * The SDK's `customInstance` (`orvalCustomInstance`) translates every
 * non-2xx into a typed `ApiError` whose `.code` is one of the 132
 * members of `ErrorCode`. Service functions do NOT swallow errors;
 * they propagate the original `ApiError` so callers can read
 * `apiError.code` per the cross-story contract rule "wrappers expose
 * the apiError.code value to callers".
 *
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
 */

import { getQuizzes } from '@/lib/api';

import type {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuizVersionDto,
  UpdateQuizVersionDto,
  CreateQuizQuestionDto,
  CreateQuizQuestionsDto,
  QuizResponseDto,
  QuizStatsResponseDto,
} from '@/lib/api/generated/schemas';

export type {
  QuizControllerCreateQuizResult,
  QuizControllerUpdateQuizResult,
  QuizControllerDeleteQuizResult,
  QuizControllerListMyQuizzesResult,
  QuizControllerListMyDraftQuizzesResult,
  QuizControllerListMyPublishedQuizzesResult,
  QuizControllerGetMyQuizAnalyticsResult,
  QuizControllerCreateQuizVersionResult,
  QuizControllerListQuizVersionsResult,
  QuizControllerGetQuizVersionDetailResult,
  QuizControllerUpdateQuizVersionResult,
  QuizControllerPublishQuizVersionResult,
  QuizControllerCreateQuizQuestionResult,
  QuizControllerCreateQuizQuestionsResult,
} from '@/lib/api/generated/quizzes/quizzes';

export interface ListMyQuizzesParams {
  cursor?: string;
  limit?: number;
}

// ─── Quiz CRUD ──────────────────────────────────────────────────────────

export async function createQuiz(payload: CreateQuizDto) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuiz(payload);
}

export async function updateQuiz(quizId: string, payload: UpdateQuizDto) {
  const sdk = getQuizzes();
  return sdk.quizControllerUpdateQuiz(quizId, payload);
}

export async function deleteQuiz(quizId: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerDeleteQuiz(quizId);
}

export async function getMyQuizzes(params?: ListMyQuizzesParams) {
  const sdk = getQuizzes();
  return sdk.quizControllerListMyQuizzes(params);
}

export async function getMyQuizzesDrafts(params?: ListMyQuizzesParams) {
  const sdk = getQuizzes();
  return sdk.quizControllerListMyDraftQuizzes(params);
}

export async function getMyQuizzesPublished(params?: ListMyQuizzesParams) {
  const sdk = getQuizzes();
  return sdk.quizControllerListMyPublishedQuizzes(params);
}

export async function getMyQuizAnalytics() {
  const sdk = getQuizzes();
  return sdk.quizControllerGetMyQuizAnalytics();
}

// ─── Quiz Versions ──────────────────────────────────────────────────────

export async function createQuizVersion(
  quizId: string,
  payload: CreateQuizVersionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizVersion(quizId, payload);
}

export async function getQuizVersions(quizId: string, params?: ListMyQuizzesParams) {
  const sdk = getQuizzes();
  return sdk.quizControllerListQuizVersions(quizId, params);
}

export async function getQuizVersionDetail(quizId: string, versionId: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetQuizVersionDetail(quizId, versionId);
}

export async function updateQuizVersion(
  quizId: string,
  versionId: string,
  payload: UpdateQuizVersionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerUpdateQuizVersion(quizId, versionId, payload);
}

export async function publishQuizVersion(quizId: string, versionId: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerPublishQuizVersion(quizId, versionId);
}

// ─── Quiz Questions ─────────────────────────────────────────────────────

export async function createQuizQuestion(
  quizId: string,
  versionId: string,
  payload: CreateQuizQuestionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestion(quizId, versionId, payload);
}

export async function bulkCreateQuizQuestions(
  quizId: string,
  versionId: string,
  payload: CreateQuizQuestionsDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestions(quizId, versionId, payload);
}

// ─── Public discovery (Phase 3 Stories 3.5 / 3.6 / 3.7 / 3.8) ─────────
//
// These functions were previously defined on the legacy
// `features/quizzes/api/quizzes.wrapper.ts` (TKT-3.5.A2 / TKT-3.6.A2 /
// TKT-3.7.A2 / TKT-3.8.A2). They migrated into this service as part
// of the TKT-4.1.G2 wrapper-deletion epic.

export interface ListQuizzesParams {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  /**
   * Filter by tag UUIDs (OR semantics). The `<FilterBar />` slot
   * accepts slugs from the user; the fetcher adapter (Epic 3.5 B1)
   * resolves slugs → UUIDv7 ids before forwarding to the SDK.
   */
  tagIds?: string[];
  creatorId?: string;
  featured?: boolean;
}

export async function listQuizzes(params?: ListQuizzesParams) {
  const sdk = getQuizzes();
  const forwarded: Record<string, unknown> = {};
  if (params?.cursor !== undefined) forwarded.cursor = params.cursor;
  if (params?.limit !== undefined) forwarded.limit = params.limit;
  if (params?.categoryId !== undefined) forwarded.categoryId = params.categoryId;
  if (params?.difficulty !== undefined) forwarded.difficulty = params.difficulty;
  if (params?.tagIds !== undefined) forwarded.tagIds = params.tagIds;
  if (params?.creatorId !== undefined) forwarded.creatorId = params.creatorId;
  if (params?.featured !== undefined) forwarded.featured = params.featured;
  return sdk.quizControllerListQuizzes(
    forwarded as Parameters<typeof sdk.quizControllerListQuizzes>[0],
  );
}

export async function getQuizzesPopular(params?: {
  limit?: number;
  categoryId?: string;
}) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetPopularQuizzes(params);
}

export async function getQuizzesTrending(params?: {
  limit?: number;
  categoryId?: string;
}) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetTrendingQuizzes(params);
}

export async function getQuizzesFeatured(params?: { limit?: number }) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetFeaturedQuizzes(params);
}

/**
 * `getQuizByIdOrSlug` — player-detail wrapper.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.A2.
 *
 * ## Envelope contract
 *
 * The generated SDK (`quizControllerGetQuizById`) returns the
 * `{ data: QuizResponseDto, meta: ResponseMetaDto }` envelope as-is
 * — the response interceptor in `custom-instance.ts` deliberately
 * does NOT unwrap it (see the long-form comment there). Callers
 * (`useQuizByIdOrSlug`) expect the inner `QuizResponseDto` so they
 * can run the player-safe projection without re-discovering the
 * envelope shape on every call. This wrapper is the single seam
 * that performs the unwrap; downstream hooks never read `.data`.
 *
 * A malformed envelope (missing or non-object `data`) is surfaced
 * as `null` so callers can map the state to the documented
 * `QUIZ_DETAIL_MALFORMED` error in `useQuizByIdOrSlug` without
 * reaching into the envelope shape themselves.
 */
export async function getQuizByIdOrSlug(
  idOrSlug: string,
): Promise<QuizResponseDto | null> {
  const sdk = getQuizzes();
  const envelope = await sdk.quizControllerGetQuizById(idOrSlug);
  return envelope?.data ?? null;
}

/**
 * `getQuizStatsByIdOrSlug` — independently retryable stats wrapper.
 *
 * Same envelope contract as `getQuizByIdOrSlug` above. Returns the
 * unwrapped `QuizStatsResponseDto` or `null` on a malformed envelope.
 */
export async function getQuizStatsByIdOrSlug(
  idOrSlug: string,
): Promise<QuizStatsResponseDto | null> {
  const sdk = getQuizzes();
  const envelope = await sdk.quizControllerGetQuizStats(idOrSlug);
  return envelope?.data ?? null;
}

export async function getQuizzesRelated(idOrSlug: string, params?: { limit?: number }) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetRelatedQuizzes(idOrSlug, params);
}

/**
 * @deprecated Use `getQuizByIdOrSlug` instead.
 */
export async function getQuizBySlug(slug: string) {
  return getQuizByIdOrSlug(slug);
}

// ─── Authoring-side alias surface (Phase 3 + Phase 4) ──────────────────

export async function getQuizVersionsV3(
  quizId: string,
  params?: { cursor?: string; limit?: number },
) {
  const sdk = getQuizzes();
  return sdk.quizControllerListQuizVersions(quizId, params);
}

export async function updateQuizVersionV3(
  quizId: string,
  versionId: string,
  payload: UpdateQuizVersionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerUpdateQuizVersion(quizId, versionId, payload);
}

export async function publishQuizVersionV3(quizId: string, versionId: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerPublishQuizVersion(quizId, versionId);
}

export async function addQuestion(
  quizId: string,
  versionId: string,
  payload: CreateQuizQuestionDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestion(quizId, versionId, payload);
}

export async function addQuestionsBulk(
  quizId: string,
  versionId: string,
  payload: CreateQuizQuestionsDto,
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestions(quizId, versionId, payload);
}