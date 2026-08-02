/**
 * Daily-challenge wrapper — wraps API calls with the discriminated
 * `DailyChallengeResult<T>` shape.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.A3.
 *
 * The wrapper is the ONLY place a daily-challenge SDK operation is
 * imported. Hooks and components in `src/features/daily-challenge/**`
 * import from `@/features/daily-challenge/wrappers/daily-challenge.wrapper`
 * (this file); they MUST NOT import from `@/lib/api/generated/...`
 * directly. This is the cross-story contract rule (mirrors the
 * leaderboard / bookmarks / quizzes wrappers).
 *
 * ## Drift notes (TKT-3.12.A1)
 *
 * The regenerated SDK at this commit **does not expose a daily-challenge
 * operation** (verified in `EPIC_3_12_A1.md` §1.1). The wrapper
 * therefore returns `{ kind: 'missing-endpoint' }` for every call —
 * the page composition (TKT-3.12.C1) renders the
 * `<DailyChallengePlaceholder />` surface for this kind, and the user
 * never sees a 404 or an exception (per Story 3.12 AC #2:
 * "Either way, the page does not 404 on the user").
 *
 * The detection is static: the wrapper has a module-level
 * `hasDailyChallengeSdk` constant set to `false` at this commit. When
 * the backend later exposes a stable endpoint, the constant flips to
 * `true` (single line) and the wrapper calls the regenerated
 * operation; the discriminated union's `ok` branch becomes reachable
 * without any consumer-side change.
 *
 * ## Error contract
 *
 *   - The wrapper never throws. Every failure is converted to
 *     `{ kind: 'error', error: ApiError }`.
 *   - The wrapper never returns the post-`unwrap` envelope directly.
 *     The `ok` branch carries the narrowed `DailyChallengeView` /
 *     `DailyChallengeHistoryPage` / `DailyChallengeHistoryItemView`
 *     only; the live composition never reads `.data` or `.meta`
 *     (cross-story contract rule #7).
 *   - The wrapper does NOT forward a `cursor` parameter when the
 *     endpoint is offset-paginated (drift `EPIC_3_12_A1.md` §4).
 *
 * ## What this wrapper is NOT
 *
 *   - It does not own SWR caching, the loading/error surface, or
 *     cache invalidation. The hooks in Batch B (TKT-3.12.B1) consume
 *     the wrapper's discriminated result and own those concerns.
 *   - It does not perform a `GET /daily-challenge/streak` request.
 *     The streak signal comes from `useUser().currentStreak` (drift
 *     `EPIC_3_12_A1.md` §3).
 */

import { ApiError, isApiError } from '@/lib/api'

import type {
  DailyChallengeHistoryPage,
  DailyChallengeResult,
  DailyChallengeView,
  GetDailyChallengeHistoryParams,
} from '../types/dto'

// ─── Module-level SDK-availability flag ──────────────────────────────────

/**
 * Whether the regenerated SDK exposes a daily-challenge operation.
 *
 * At this commit the SDK has no such operation
 * (`EPIC_3_12_A1.md` §1.1), so the constant is `false` and every
 * wrapper function returns `kind: 'missing-endpoint'`. When the
 * backend exposes a stable endpoint, this constant flips to `true`
 * and the wrappers below begin calling the regenerated operation.
 *
 * Implementation note: the constant is read once at module init. The
 * hooks in TKT-3.12.B1 short-circuit on the wrapper's
 * `kind: 'missing-endpoint'` branch and never attempt a network call.
 */
const HAS_DAILY_CHALLENGE_SDK = false

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Wrap a thrown value as `{ kind: 'error', error: ApiError }` if it is
 * an `ApiError`; otherwise rethrow — the wrapper does not paper over
 * unknown error shapes. The `error` branch is the only error path the
 * live composition surfaces.
 */
function toErrorResult(error: unknown): {
  kind: 'error'
  error: ApiError
} {
  if (isApiError(error)) {
    return { kind: 'error', error }
  }
  // Non-ApiError values are rethrown so the test suite surfaces them
  // immediately; in production the hooks' error boundary catches them.
  throw error
}

// ─── Reads ───────────────────────────────────────────────────────────────

/**
 * `getDailyChallengeToday()` — read the day's featured daily-challenge
 * quiz.
 *
 * Returns:
 *
 *   - `{ kind: 'ok', data: DailyChallengeView }` on success (when the
 *     SDK is exposed and the call resolves).
 *   - `{ kind: 'missing-endpoint' }` when the SDK does not expose a
 *     daily-challenge operation (the A1-locked default at this commit).
 *   - `{ kind: 'error', error: ApiError }` on any other failure
 *     (4xx, 5xx, network).
 *
 * Source ticket: TKT-3.12.A3.
 */
export async function getDailyChallengeToday(): Promise<
  DailyChallengeResult<DailyChallengeView>
> {
  if (!HAS_DAILY_CHALLENGE_SDK) {
    return { kind: 'missing-endpoint' }
  }
  // When the backend exposes a stable endpoint, replace this branch
  // with a single SDK call that narrows the post-`unwrap` DTO to
  // `DailyChallengeView` (see the planning-intent DTO at
  // `EPIC_3_12_A1.md` §2.1). The `try / catch` shape below is the
  // template; only the SDK call changes.
  try {
    // const sdk = getDailyChallenges()
    // const result = await sdk.dailyChallengeControllerGetToday()
    // const data = (result as { data?: DailyChallengeDto }).data
    // if (!data) {
    //   return { kind: 'missing-endpoint' }
    // }
    // const view: DailyChallengeView = {
    //   id: data.id,
    //   date: data.date,
    //   quizId: data.quizId,
    //   category: data.category,
    //   totalQuestions: data.totalQuestions,
    //   rewardXp: data.rewardXp,
    // }
    // return { kind: 'ok', data: view }
    return { kind: 'missing-endpoint' }
  } catch (error) {
    return toErrorResult(error)
  }
}

/**
 * `getDailyChallengeHistoryPage(params)` — read a paginated page of
 * past daily-challenge history.
 *
 * Returns:
 *
 *   - `{ kind: 'ok', data: DailyChallengeHistoryPage }` on success.
 *   - `{ kind: 'missing-endpoint' }` when the SDK does not expose a
 *     daily-challenge operation (the A1-locked default at this commit).
 *   - `{ kind: 'error', error: ApiError }` on any other failure.
 *
 * Pagination is forwarded per the A1-locked default — cursor mode
 * (the Phase 3 dominant pattern). The `offset` field is recorded in
 * the params type for future fallback (drift `EPIC_3_12_A1.md` §4);
 * it is **not** forwarded in this commit.
 *
 * Source ticket: TKT-3.12.A3.
 */
export async function getDailyChallengeHistoryPage(
  // The `params` arg is unused at this commit because the SDK does not
  // expose a daily-challenge operation (drift `EPIC_3_12_A1.md` §1.1).
  // When the SDK lands, the arg is forwarded to the SDK call inside the
  // commented-out block below; the eslint-disable comment marks that
  // transition.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: GetDailyChallengeHistoryParams,
): Promise<DailyChallengeResult<DailyChallengeHistoryPage>> {
  if (!HAS_DAILY_CHALLENGE_SDK) {
    return { kind: 'missing-endpoint' }
  }
  try {
    // const sdk = getDailyChallenges()
    // const result = await sdk.dailyChallengeControllerGetHistory({
    //   ...(_params.cursor !== undefined ? { cursor: _params.cursor } : {}),
    //   ...(_params.limit !== undefined ? { limit: _params.limit } : {}),
    // })
    // })
    // const data = (result as {
    //   data?: {
    //     items?: DailyChallengeHistoryItemDto[]
    //     pagination?: { nextCursor?: string | null; hasNextPage?: boolean; limit?: number }
    //   }
    // }).data
    // const items = (data?.items ?? []).map((item) => ({
    //   id: item.id,
    //   date: item.date,
    //   category: item.category,
    //   score: item.score,
    //   rank: item.rank,
    //   isTopTen: item.isTopTen,
    // }))
    // const pagination = data?.pagination
    // const page: DailyChallengeHistoryPage = {
    //   items,
    //   nextCursor: pagination?.nextCursor ?? null,
    //   hasNextPage: pagination?.hasNextPage ?? false,
    //   limit: pagination?.limit ?? items.length,
    // }
    // return { kind: 'ok', data: page }
    return { kind: 'missing-endpoint' }
  } catch (error) {
    return toErrorResult(error)
  }
}

// ─── Re-exports (consumed by the Batch B hooks) ─────────────────────────

export type {
  DailyChallengeHistoryItemView,
  DailyChallengeHistoryPage,
  DailyChallengeResult,
  DailyChallengeView,
  GetDailyChallengeHistoryParams,
} from '../types/dto'
