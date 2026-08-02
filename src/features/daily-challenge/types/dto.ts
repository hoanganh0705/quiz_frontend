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
 * line 1256 / `EPIC_3_12_A1.md` §2.1):
 *
 *   - `id` — UUIDv7; aliased from the response so the page composition
 *     and any future SWR key can use it as a stable identifier.
 *   - `date` — ISO 8601 UTC date string (e.g. `2026-08-02T00:00:00.000Z`).
 *     The UI renders this string **verbatim** — no `new Date()`
 *     normalization (drift `EPIC_3_12_A1.md` §5).
 *   - `quizId` — the quiz the day's challenge is built from.
 *   - `category` — human-readable category label (e.g. `Science`).
 *   - `totalQuestions` — the number of questions in the day's challenge.
 *   - `rewardXp` — XP awarded on completion.
 */
export interface DailyChallengeView {
  id: string
  date: string
  quizId: string
  category: string
  totalQuestions: number
  rewardXp: number
}

/**
 * Narrowed view of one past daily-challenge history item.
 *
 * Mirrors the planning-intent `DailyChallengeHistoryItemDto`
 * (`EPIC_3_12_A1.md` §2.2). The history list (TKT-3.12.B3) renders one
 * row per item; the page composition reads the list from the
 * `useDailyChallengeHistory` hook (TKT-3.12.B1).
 */
export interface DailyChallengeHistoryItemView {
  id: string
  date: string
  category: string
  /** Best-score percentage for the day (0–100). */
  score: number
  /** 1-indexed global rank the user achieved on the day. */
  rank: number
  /** True when the user finished in the day's top 10. */
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
