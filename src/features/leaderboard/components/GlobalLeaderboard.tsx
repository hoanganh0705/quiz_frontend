'use client'

/**
 * `GlobalLeaderboard` — thin delegation to `LeaderboardPage`.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.C2.
 *
 * The legacy mock-data body was removed in TKT-3.11.C2. The default
 * export is preserved (the `src/app/(public)/leaderboard/page.tsx`
 * import does not change), but the body now renders `<LeaderboardPage />`
 * directly. The leaderboard surface is owned by `LeaderboardPage`
 * (TKT-3.11.C1); `GlobalLeaderboard` is the legacy entry point kept
 * stable for the route.
 *
 * ## Migration note
 *
 * The legacy constants (`players`, `leaderboardData`) are no longer
 * imported in this file. The legacy presentation helpers
 * (`getBadgeColor`, etc.) were removed because they are no longer
 * used. The new `LeaderboardEntryRow` and `LeaderboardPage` own their
 * own presentation logic.
 *
 * The sibling files (`LeaderboardHeader`, `CompetitionStats`,
 * `LeaderboardHighlights`) are NOT used by `GlobalLeaderboard`
 * directly — the page composition in `app/(public)/leaderboard/page.tsx`
 * renders them as the page chrome.
 */

import { LeaderboardPage } from './LeaderboardPage'

export default function GlobalLeaderboard() {
  return <LeaderboardPage />
}
