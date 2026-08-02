/**
 * Daily-challenge wrapper barrel.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-3.12.A3.
 *
 * Re-exports the public surface of
 * `src/features/daily-challenge/wrappers/daily-challenge.wrapper.ts`
 * so the Batch B hooks (and future consumers) can import from the
 * stable per-feature barrel:
 *
 *   import {
 *     getDailyChallengeToday,
 *     getDailyChallengeHistoryPage,
 *   } from '@/features/daily-challenge/wrappers'
 *
 * Mirrors the conventions used by the bookmarks, leaderboard, and
 * quizzes wrapper barrels.
 */

export {
  getDailyChallengeToday,
  getDailyChallengeHistoryPage,
} from './daily-challenge.wrapper'

export type {
  DailyChallengeHistoryItemView,
  DailyChallengeHistoryPage,
  DailyChallengeResult,
  DailyChallengeView,
  GetDailyChallengeHistoryParams,
} from '../types/dto'
