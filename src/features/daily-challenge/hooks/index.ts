/**
 * Daily-challenge hooks barrel — extended in TKT-3.12.B2 with the streak
 * view hook.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-3.12.B2.
 */

export {
  useDailyChallengeToday,
  type UseDailyChallengeTodayResult,
} from './useDailyChallengeToday'

export {
  useDailyChallengeHistory,
  DAILY_CHALLENGE_HISTORY_PAGE_LIMIT,
  type DailyChallengeHistoryItemWithId,
  type UseDailyChallengeHistoryResult,
} from './useDailyChallengeHistory'

export {
  useDailyChallengeStreakView,
  type UseDailyChallengeStreakViewResult,
} from './useDailyChallengeStreakView'

export {
  useDailyChallengePlay,
  type UseDailyChallengePlayParams,
  type UseDailyChallengePlayResult,
  type DailyChallengePlayStatus,
} from './useDailyChallengePlay'
