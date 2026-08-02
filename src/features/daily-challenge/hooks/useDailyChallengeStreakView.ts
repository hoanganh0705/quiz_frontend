'use client'

/**
 * `useDailyChallengeStreakView()` — derive the streak signal for the
 * daily-challenge page from the user store.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B2.
 *
 * ## Streak-signal source
 *
 * Per `EPIC_3_12_A1.md` §3, the streak signal comes from
 * `useUser().currentStreak` (the field name is `currentStreak`, not
 * `streak` — drift D-3.12.3). The user payload is hydrated on app
 * boot via the persisted `useUserStore` Zustand store; this hook
 * reads it without performing a network request.
 *
 * The hook is the **only** consumer of `useUser()` in the
 * daily-challenge feature. The legacy `DailyChallengeMainContent`
 * component (`src/features/daily-challenge/components/DailyChallengeMainContent.tsx`
 * line 51) reads the same field but uses the wrong name (`streak`).
 * The legacy component is rewritten by TKT-3.12.C2.
 *
 * ## Result shape
 *
 *   - `streak: number | null` — the user's current streak (0..N), or
 *     `null` when the user is unauthenticated.
 *   - `isAuthenticated: boolean` — `true` when the user payload is
 *     present; the live composition (TKT-3.12.C1) gates the streak
 *     indicator on this flag.
 *
 * The hook returns `{ streak: null, isAuthenticated: false }` while
 * the user store is hydrating OR when the user is logged out. The
 * `currentStreak` field is `0` when the user has no streak yet (e.g.
 * a freshly-registered user).
 *
 * ## Why a separate hook and not a direct `useUser()` call
 *
 * Decoupling the view from the user store lets the daily-challenge
 * page composition (TKT-3.12.C1) read a single
 * `{ streak, isAuthenticated }` shape without inspecting the user
 * payload. A future change to the streak source (e.g. a separate
 * `/daily-challenge/streak` endpoint per `EPIC_3_12_A1.md` §3) is
 * a single-file edit in this hook; the composition is unchanged.
 */

import { useUser } from '@/features/users/store/user-store'

export interface UseDailyChallengeStreakViewResult {
  streak: number | null
  isAuthenticated: boolean
}

export function useDailyChallengeStreakView(): UseDailyChallengeStreakViewResult {
  const user = useUser()
  if (user === null) {
    return { streak: null, isAuthenticated: false }
  }
  return {
    streak: user.currentStreak ?? 0,
    isAuthenticated: true,
  }
}
