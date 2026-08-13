/**
 * Daily-challenge DTOs and result types.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.A3.
 *
 * ## Purpose
 *
 * The planning-intent DTOs for the daily-challenge surface, narrowed to
 * the inner view types the live composition consumes. The wrapper
 * (TKT-3.12.A3) translates the regenerated SDK's post-`unwrap` envelope
 * into these views at the wrapper boundary; the live composition
 * consumes only the views and never the raw envelope.
 *
 * Per cross-story contract rule #7 ("`data` and `meta` keys never reach
 * UI state; all cursor handling is encapsulated") the wrapper is the
 * single place the envelope is read.
 *
 * ## Drift capture
 *
 * Per `EPIC_3_12_A1.md` §1.1, the regenerated SDK at this commit
 * exposes no daily-challenge operation. The wrapper's `getDailyChallengeToday`
 * and `getDailyChallengeHistoryPage` therefore return
 * `{ kind: 'missing-endpoint' }` for every call. When the backend later
 * exposes a stable endpoint, the wrapper imports the regenerated
 * operation and the type-narrowing from the generated DTO to the
 * `DailyChallengeView` happens in this file (the DTO shape is
 * recorded at `EPIC_3_12_A1.md` §2.1 / §2.2).
 *
 * The DTOs in this file are the planning-intent shape; when the
 * generated DTOs land, the wrapper's fetcher adapter will narrow from
 * the generated shape to the `id`-bearing view (the `useCursorPaginated`
 * primitive requires `T extends { id: string }`).
 */

import type { ApiError } from '@/lib/api/core/ApiError'

// ─── Per-item view types ─────────────────────────────────────────────────

/**
 * Narrowed view of the day's featured daily-challenge quiz.
 *
 * Mirrors the planning-intent `DailyChallengeDto` (`PHASE_3_EPICS.md`
 * line 1256 / `EPIC_3_12_A1.md` §2.1) and the live
 * `DailyChallengeResponseDto` from the regenerated SDK.
 *
 *   - `id` — UUIDv7; aliased from the response so the page composition
 *     and any future SWR key can use it as a stable identifier.
 *   - `date` — ISO 8601 UTC date string (e.g. `2026-08-02T00:00:00.000Z`).
 *     The UI renders this string **verbatim** — no `new Date()`
 *     normalization (drift `EPIC_3_12_A1.md` §5).
 *   - `quizId` — the quiz the day's challenge is built from.
 *   - `quizTitle` — the day's quiz title (rendered on the card).
 *   - `slug` — the quiz slug for deep-linking.
 *   - `category` — alias of `difficulty`; kept for backward compatibility
 *     with the existing `InfoCard` and `DailyChallengeCard` render sites.
 *   - `difficulty` — the live difficulty axis from the backend.
 *   - `totalQuestions` — the number of questions in the day's challenge.
 *   - `rewardXp` — XP awarded on completion.
 *   - `expiresAt` — ISO 8601 timestamp at which the day window closes.
 *   - `status` — lifecycle discriminator:
 *       - `'pending'`   — the day's quiz is published; the user has
 *                         not yet completed an attempt.
 *       - `'completed'` — the user has completed today's attempt.
 *       - `'expired'`   — the day's window has closed.
 *   - `scorePercent` — best-score percentage for the viewer; only
 *     populated when `status === 'completed'`.
 *   - `rank` — 1-indexed global rank the viewer achieved; only
 *     populated when `status === 'completed'`.
 */
export interface DailyChallengeView {
  id: string
  date: string
  quizId: string
  quizTitle: string
  slug: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  totalQuestions: number
  rewardXp: number
  expiresAt: string
  status: 'pending' | 'completed' | 'expired'
  scorePercent: number | null
  rank: number | null
}

/**
 * Narrowed view of one past daily-challenge history item.
 *
 * Mirrors the planning-intent `DailyChallengeHistoryItemDto`
 * (`EPIC_3_12_A1.md` §2.2) and the live
 * `DailyChallengeHistoryItemDto` from the regenerated SDK.
 *
 *   - `id` — synthesised as `${date}-${quizId}` so the cursor
 *     primitive's `T extends { id: string }` constraint is satisfied.
 *   - `date` — ISO 8601 UTC date string (verbatim, no `new Date()`).
 *   - `quizId` — the quiz the day's challenge was built from.
 *   - `quizTitle` — the day's quiz title.
 *   - `slug` — the quiz slug for deep-linking.
 *   - `difficulty` — the live difficulty axis from the backend.
 *   - `category` — alias of `difficulty`; kept for backward compatibility.
 *   - `score` — best-score percentage for the day (0–100).
 *   - `rank` — 1-indexed global rank the user achieved on the day.
 *   - `isTopTen` — true when the user finished in the day's top 10.
 */
export interface DailyChallengeHistoryItemView {
  id: string
  date: string
  quizId: string
  quizTitle: string
  slug: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  score: number
  rank: number
  isTopTen: boolean
}

/**
 * The paginated history page.
 *
 * Mirrors the planning-intent `useCursorPaginated` `CursorPage` shape
 * (or `OffsetPage`, if the regenerated endpoint is offset-paginated —
 * see `EPIC_3_12_A1.md` §4). The wrapper narrows the wire shape to this
 * view at the wrapper boundary.
 */
export interface DailyChallengeHistoryPage {
  items: readonly DailyChallengeHistoryItemView[]
  /**
   * Cursor for the next page; `null` when the server reports
   * `hasNextPage: false` (cursor mode). Ignored in offset mode.
   */
  nextCursor: string | null
  hasNextPage: boolean
  limit: number
}

/**
 * Response shape for `POST /daily-challenge/answer`. Mirrors the
 * backend `DailyChallengeAnswerResponseDto` (see
 * `quiz_backend/src/modules/daily-challenge/dto/response/daily-challenge-history-response.dto.ts`).
 *
 *   - `correct` — whether the submitted answer is correct.
 *   - `nextQuestionIndex` — 0-indexed position of the next question;
 *     equals `totalQuestions` when the attempt is complete.
 *   - `totalQuestions` — total questions in the day.
 *   - `completed` — whether the attempt is now complete.
 *   - `scorePercent` — final score percentage; only set when
 *     `completed === true`.
 */
export interface DailyChallengeAnswerResponseView {
  correct: boolean
  nextQuestionIndex: number
  totalQuestions: number
  completed: boolean
  scorePercent: number | null
}

// ─── Result types (the wrapper's public contract) ───────────────────────

/**
 * Discriminated union returned by every wrapper function.
 *
 * Three kinds:
 *
 *   - `'ok'` — the call succeeded; `data` carries the inner-unwrapped
 *     view.
 *   - `'missing-endpoint'` — the regenerated SDK does not expose a
 *     daily-challenge operation (the locked Phase 3 default at this
 *     commit — see `EPIC_3_12_A1.md` §1.1). The page composition
 *     renders `<DailyChallengePlaceholder />` for this kind. The
 *     wrapper never throws; the discriminator is the only signal.
 *   - `'error'` — the call failed for any other reason (4xx, 5xx,
 *     network). `error` is the typed `ApiError`; the live composition
 *     maps 5xx to a toast and 4xx (non-404) to an inline error.
 *
 * The wrapper never returns a raw `ApiError` rejection; the
 * discriminated union is the only public surface.
 */
export type DailyChallengeResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'missing-endpoint' }
  | { kind: 'error'; error: ApiError }

// ─── History params ──────────────────────────────────────────────────────

/**
 * Pagination params for `getDailyChallengeHistoryPage`.
 *
 * The wrapper forwards the appropriate field based on the
 * pagination mode:
 *
 *   - cursor mode: `cursor` + `limit` are forwarded; `offset` is
 *     ignored.
 *   - offset mode: `offset` + `limit` are forwarded; `cursor` is
 *     ignored.
 *
 * At this commit (per `EPIC_3_12_A1.md` §1.1) the endpoint is not
 * exposed, so the wrapper returns `kind: 'missing-endpoint'` for
 * every call regardless of `params`. The params type is recorded here
 * so the call sites are stable when the endpoint lands.
 */
export interface GetDailyChallengeHistoryParams {
  cursor?: string
  offset?: number
  limit?: number
}

/**
 * Payload for `POST /daily-challenge/answer`. The endpoint is
 * stateful — the server tracks the in-flight attempt and only
 * resolves `correct` against the question at `questionIndex`.
 * Submitting an answer for a different index after the attempt
 * has already advanced returns 409 (out of sync).
 */
export interface SubmitDailyChallengeAnswerParams {
  questionIndex: number
  selectedOptionId: string | null
}