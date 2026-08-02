// Daily challenge components — public API surface.
//
// History:
//   - The first three exports (`InfoCard`, `ChallengeChart`,
//     `ChallengePieChart`, `DailyChallengeMainContent`) are the legacy
//     mock-data surfaces retained for the C2 ticket rewrite.
//   - The Day-3.12 exports (`DailyChallengeCard`,
//     `DailyChallengeHistoryList`, `DailyChallengeHistoryEmptyState`,
//     `DailyChallengeStreakIndicator`, `DailyChallengePlaceholder`,
//     `DailyChallengeCardSkeleton`, `DailyChallengeHistorySkeleton`)
//     are the new live surfaces introduced in TKT-3.12.B3.
export { default as InfoCard } from './InfoCard'
export { default as ChallengeChart } from './ChallengeChart'
export { default as ChallengePieChart } from './ChallengePieChart'
export { default as DailyChallengeMainContent } from './DailyChallengeMainContent'

export { DailyChallengeCard } from './DailyChallengeCard'
export { DailyChallengeHistoryList } from './DailyChallengeHistoryList'
export { DailyChallengeHistoryEmptyState } from './DailyChallengeHistoryEmptyState'
export { DailyChallengeStreakIndicator } from './DailyChallengeStreakIndicator'
export { DailyChallengePlaceholder } from './DailyChallengePlaceholder'
export { DailyChallengePage } from './DailyChallengePage'
export {
  DailyChallengeCardSkeleton,
  DailyChallengeHistorySkeleton,
} from './DailyChallengeSkeleton'
