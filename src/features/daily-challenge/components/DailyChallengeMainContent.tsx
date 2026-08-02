'use client'

/**
 * `DailyChallengeMainContent` — the route-level composition wrapper
 * for the `/daily-challenge` page.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.C2.
 *
 * ## Purpose
 *
 * The route-level `app/(public)/daily-challenge/page.tsx` (TKT-3.12.D2)
 * imports the default export of this file. The historical
 * (pre-Epic-3.12) body of this file was a single mock-data
 * composition (timer / question UI / leaderboard preview / streak
 * card). Story 3.12 replaces that body with a thin delegation to
 * `<DailyChallengePage />` (TKT-3.12.C1). The default export is
 * preserved so the `page.tsx` import does not change.
 *
 * The `flagValue` prop is forwarded from `page.tsx` (the route-level
 * read site of the `dailyChallengePage` feature flag — see D2). The
 * composition passes the value through so the page boundary is the
 * only place the env-var-override `NEXT_PUBLIC_DAILY_CHALLENGE_PAGE`
 * is consulted.
 *
 * ## What this file is NOT
 *
 *   - It does NOT own state. The streak signal, the today challenge,
 *     the history pagination, and the loading / empty / error
 *     branches all live inside `DailyChallengePage` (C1) and the
 *     Batch B hooks.
 *   - It does NOT read the `useUser()` store. The legacy streak read
 *     (`useUser()?.streak`) is gone — `DailyChallengeStreakIndicator`
 *     is rendered inside the live page composition (C1) via the
 *     `useDailyChallengeStreakView` hook (B2).
 *   - It does NOT render the question UI, the timer, the leaderboard
 *     preview, the streak-rewards card, or the badges card. Those
 *     are out of scope for Story 3.12 ("read-only and intentionally
 *     small" — `PHASE_3_EPICS.md` line 1234).
 *
 * The legacy sibling components (e.g. `ChallengeChart`,
 * `ChallengePieChart`) remain in the codebase for out-of-scope
 * consumers; they are no longer imported here.
 */

import { memo } from 'react'

import { DailyChallengePage } from './DailyChallengePage'

export interface DailyChallengeMainContentProps {
  /**
   * The `dailyChallengePage` feature flag value, read at the route
   * boundary in `app/(public)/daily-challenge/page.tsx`. When
   * `'placeholder'`, `DailyChallengePage` renders the static
   * placeholder surface regardless of the wrappers' status.
   */
  flagValue: 'v1' | 'placeholder'
}

/**
 * Thin wrapper that forwards the route-level flag value to
 * `<DailyChallengePage />`. Memoized because `page.tsx` wraps this
 * component in `memo()` and re-renders only when the flag changes.
 */
const DailyChallengeMainContent = memo(function DailyChallengeMainContent({
  flagValue,
}: DailyChallengeMainContentProps) {
  return <DailyChallengePage flagValue={flagValue} />
})

export default DailyChallengeMainContent
