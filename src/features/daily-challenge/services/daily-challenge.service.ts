/**
 * `daily-challenge.service.ts` — Daily-challenge service (Phase 3 Story 3.12).
 *
 * Source epic:   Story 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-4.1.G-prep.
 *
 * Replaces `features/daily-challenge/wrappers/daily-challenge.wrapper.ts`
 * (TKT-3.12.A3). The service preserves the legacy wrapper's
 * `DailyChallengeResult<T>` discriminated union because the hooks in
 * Batch B (TKT-3.12.B1) branch on it.
 *
 * ## Drift notes
 *
 * Phase 3 (S-14): the backend now exposes `GET /daily-challenge/today`,
 * `GET /daily-challenge/history`, `GET /daily-challenge/leaderboard`,
 * and `POST /daily-challenge/answer`. The regenerated SDK ships the
 * matching operations under
 * `src/lib/api/generated/daily-challenge/daily-challenge.ts` (exposed
 * via `getDailyChallenge()`). The service calls those operations
 * directly and narrows the wire DTO into the planning-intent
 * `DailyChallengeView` shape that the live composition consumes.
 *
 * ## Envelope contract
 *
 * The backend wraps every response in a canonical
 * `{ data, meta: { timestamp, pagination? } }` envelope
 * (`quiz_backend/src/common/responses/api-response.ts`). The Axios
 * response interceptor (`quiz_frontend/src/lib/api/core/custom-instance.ts`)
 * does NOT unwrap the envelope — the SDK contract is that consumers
 * read `.data` directly. Each wrapper below reads `envelope.data` and
 * resolves the inner payload; envelope handling is never leaked past
 * the wrapper boundary (cross-story contract rule #7).
 *
 *   - `getDailyChallengeToday`     → `WrappedDto & { data?: DailyChallengeResponseDto }`
 *   - `getDailyChallengeHistoryPage` → `WrappedPaginatedDto & { data?: DailyChallengeHistoryResponseDto[] }`
 *
 * The history unwrap is the load-more-aware adapter: `envelope.data`
 * is `DailyChallengeHistoryResponseDto[]` (each element is a full
 * `{ items, pagination }` page), and the wrapper surfaces the first
 * element's `items` and `pagination` to the caller.
 *
 * ## Error contract
 *
 *   - The service never throws on a network failure. Every failure is
 *     converted to `{ kind: 'error', error: ApiError }`.
 *   - The service never returns the post-`unwrap` envelope directly.
 *     The `ok` branch carries the narrowed view type only.
 */

import { ApiError, getDailyChallenge, isApiError } from '@/lib/api';

import type {
  DailyChallengeAnswerResponseView,
  DailyChallengeHistoryItemView,
  DailyChallengeHistoryPage,
  DailyChallengeResult,
  DailyChallengeView,
  GetDailyChallengeHistoryParams,
  SubmitDailyChallengeAnswerParams,
} from '../types/dto';
import type { DailyChallengeHistoryResponseDto } from '@/lib/api/generated/schemas/dailyChallengeHistoryResponseDto';

// ─── Module-level SDK-availability flag ────────────────────────────────

/**
 * Phase 3 (S-14): the regenerated SDK exposes the four
 * daily-challenge operations (today / history / leaderboard / answer)
 * under `getDailyChallenge()`. The flag is informational; with the
 * unwrap fixes in this file, every read path resolves real data when
 * the backend is reachable.
 */
const HAS_DAILY_CHALLENGE_SDK = true;

// ─── Helpers ───────────────────────────────────────────────────────────

function toErrorResult(error: unknown): { kind: 'error'; error: ApiError } {
  if (isApiError(error)) {
    return { kind: 'error', error };
  }
  throw error;
}

/**
 * Coerce a generated-SDK nullable scalar (`{ [key: string]: unknown } | null`)
 * to a `number | null`. The generated orval types treat every nullable
 * scalar as an opaque record; the backend's wire payload is a number or
 * `null` per the OpenAPI spec, so this narrow is safe at the response
 * boundary.
 */
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Coerce a generated-SDK nullable scalar (`{ [key: string]: unknown } | null`)
 * to a `string | null`.
 */
function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

/**
 * Narrow a backend `DailyChallengeResponseDto` to the
 * `DailyChallengeView` the live composition expects.
 *
 * The backend payload does not carry a top-level `id` (the identity
 * is the `quizId`); we alias `quizId → id` so the page composition
 * (and any future SWR key) can use it as a stable identifier.
 *
 * The view uses a synthetic `category` field derived from the
 * `difficulty` for backward compatibility with the planning-intent
 * shape and the legacy `InfoCard` + `DailyChallengeCard` render sites.
 */
function toTodayView(
  dto:
    | NonNullable<
        Awaited<
          ReturnType<
            ReturnType<
              typeof getDailyChallenge
            >['dailyChallengeControllerGetToday']
          >
        >['data']
      >
    | undefined,
): DailyChallengeView | null {
  if (!dto) return null;
  const difficulty = (dto.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard';
  return {
    id: dto.quizId,
    date: dto.date,
    quizId: dto.quizId,
    quizTitle: dto.quizTitle ?? '',
    slug: dto.slug ?? '',
    difficulty,
    category: difficulty,
    totalQuestions: dto.questionCount,
    rewardXp: dto.rewardXp,
    expiresAt: dto.expiresAt,
    status: dto.status,
    scorePercent: toNumberOrNull(dto.scorePercent),
    rank: toNumberOrNull(dto.rank),
  };
}

/**
 * Narrow a backend `DailyChallengeHistoryItemDto` to the
 * `DailyChallengeHistoryItemView` the live composition expects.
 *
 * The `id` is synthesised as `${date}-${quizId}` so the cursor
 * primitive's `T extends { id: string }` constraint is satisfied;
 * the synthetic id is stable for the lifetime of the day's row.
 *
 * The `category` field is an alias of `difficulty` for backward
 * compatibility with the existing render sites that read `category`.
 */
function toHistoryItemView(
  dto: DailyChallengeHistoryResponseDto['items'][number] | undefined,
): DailyChallengeHistoryItemView | null {
  if (!dto) return null;
  const difficulty = (dto.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard';
  return {
    id: `${dto.date}-${dto.quizId}`,
    date: dto.date,
    quizId: dto.quizId,
    quizTitle: dto.quizTitle ?? 'Untitled quiz',
    slug: dto.slug ?? '',
    difficulty,
    category: difficulty,
    score: dto.score,
    rank: dto.rank,
    isTopTen: dto.rank > 0 && dto.rank <= 10,
  };
}

// ─── Reads ─────────────────────────────────────────────────────────────

export async function getDailyChallengeToday(): Promise<
  DailyChallengeResult<DailyChallengeView>
> {
  if (!HAS_DAILY_CHALLENGE_SDK) {
    return { kind: 'missing-endpoint' };
  }
  try {
    const envelope = await getDailyChallenge().dailyChallengeControllerGetToday();
    const view = toTodayView(envelope?.data);
    if (!view) {
      return {
        kind: 'error',
        error: ApiError.fromInput({
          status: 500,
          code: 'GLOBAL_INTERNAL_ERROR',
          message: 'Daily challenge today payload missing',
        }),
      };
    }
    return { kind: 'ok', data: view };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Page-fetcher for the daily-challenge history list. Returns the
 * narrowed `DailyChallengeHistoryPage` shape consumed by
 * `useDailyChallengeHistory`'s `useCursorPaginated` primitive.
 *
 * The SDK returns `WrappedPaginatedDto & { data?: DailyChallengeHistoryResponseDto[] }`.
 * The `data` array is **a list of pages** (each element is a full
 * `{ items, pagination }` page). The wrapper surfaces the first
 * element's items + pagination to the caller; subsequent pages are
 * fetched on `loadMore()` via the cursor primitive (which forwards
 * the `nextCursor` to the wrapper, and the wrapper's adapter handles
 * the page-of-pages unwrap uniformly).
 */
export async function getDailyChallengeHistoryPage(
  params: GetDailyChallengeHistoryParams,
): Promise<DailyChallengeResult<DailyChallengeHistoryPage>> {
  if (!HAS_DAILY_CHALLENGE_SDK) {
    return { kind: 'missing-endpoint' };
  }
  try {
    const response = await getDailyChallenge().dailyChallengeControllerGetHistory(
      {
        ...(params.cursor ? { cursor: params.cursor } : {}),
        limit: params.limit,
      },
    );
    const pages = (response?.data ?? []) as DailyChallengeHistoryResponseDto[];
    const firstPage = pages[0];
    const items = (firstPage?.items ?? [])
      .map((dto) => toHistoryItemView(dto))
      .filter((item): item is DailyChallengeHistoryItemView => item !== null);
    const pagination = firstPage?.pagination;
    // The fetcher adapter reads `nextCursor` to translate the SDK's
    // paginated envelope into the cursor primitive's `CursorPage<T>`.
    // This is the documented escape hatch (Epic 3.2 B1). The plain
    // page composition must NEVER read `nextCursor` directly.
    return {
      kind: 'ok',
      data: {
        items,
        nextCursor: toStringOrNull(pagination?.nextCursor),
        hasNextPage: pagination?.hasNextPage ?? false,
        limit: pagination?.limit ?? params.limit ?? 5,
      },
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Submit an answer for the current daily-challenge question.
 *
 * The endpoint is stateful — the server tracks the in-flight attempt
 * and only resolves `correct` against the question at `questionIndex`.
 * Out-of-sync submissions (a different `questionIndex` than the
 * server's tracked `nextQuestionIndex`) return 409; the wrapper
 * surfaces the typed `ApiError` under `kind: 'error'` so the hook can
 * drive a `refresh()` retry.
 *
 * On `kind: 'ok'`, the wrapper returns the narrowed
 * `DailyChallengeAnswerResponseView` shape that the in-page play
 * surface consumes. `nextQuestionIndex` and `completed` drive the
 * state machine; `correct` drives the running score; `scorePercent`
 * is populated when `completed === true`.
 */
export async function submitDailyChallengeAnswer(
  payload: SubmitDailyChallengeAnswerParams,
): Promise<DailyChallengeResult<DailyChallengeAnswerResponseView>> {
  if (!HAS_DAILY_CHALLENGE_SDK) {
    return { kind: 'missing-endpoint' };
  }
  try {
    // The generated SDK types `selectedOptionId` as an opaque
    // record-shaped scalar (`{ [key: string]: unknown } | null`).
    // The backend's wire payload is a UUIDv7 string or `null` per
    // the OpenAPI spec; this narrow is safe at the request boundary.
    const body: import('@/lib/api/generated/schemas/dailyChallengeAnswerDto').DailyChallengeAnswerDto = {
      questionIndex: payload.questionIndex,
      ...(payload.selectedOptionId !== null
        ? { selectedOptionId: payload.selectedOptionId as unknown as Record<string, unknown> }
        : {}),
    };
    const response =
      await getDailyChallenge().dailyChallengeControllerSubmitAnswer(body);
    const dto = response?.data;
    if (!dto) {
      return {
        kind: 'error',
        error: ApiError.fromInput({
          status: 500,
          code: 'GLOBAL_INTERNAL_ERROR',
          message: 'Daily challenge answer payload missing',
        }),
      };
    }
    return {
      kind: 'ok',
      data: {
        correct: dto.correct,
        nextQuestionIndex: dto.nextQuestionIndex,
        totalQuestions: dto.totalQuestions,
        completed: dto.completed,
        scorePercent: toNumberOrNull(dto.scorePercent),
      },
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

// ─── Re-exports ────────────────────────────────────────────────────────

export type {
  DailyChallengeAnswerResponseView,
  DailyChallengeHistoryItemView,
  DailyChallengeHistoryPage,
  DailyChallengeResult,
  DailyChallengeView,
  GetDailyChallengeHistoryParams,
  SubmitDailyChallengeAnswerParams,
} from '../types/dto';