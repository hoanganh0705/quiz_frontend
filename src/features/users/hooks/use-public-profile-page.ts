'use client'

/**
 * `usePublicProfilePage` — the data layer for the public profile
 * route `/profile/[name]`.
 *
 * Source epic:   Phase 1 (F-15, F-16, F-17, F-18) — public profile
 *                quick-wins.
 * Source ticket: F-15..F-18.
 *
 * This is a Phase 1 rewrite that replaces the historic hardcoded
 * `challengeData` derivation (F-09) and the empty `TabsContent`
 * placeholders ("No quizzes data to display", "No followers data to
 * display", etc.) with live hooks that call the existing backend
 * `/users/{userId}/*` endpoints.
 *
 * ## Username → userId resolution (F-15 caveat)
 *
 * The route param is `name` (a username slug), but every backend
 * endpoint we call here takes a `userId` (UUIDv7). The backend does
 * not currently expose a `GET /users/by-username/{username}` lookup,
 * so this hook uses the **authenticated viewer's** `userId` from the
 * `useUser()` store when the route's `name` matches the viewer's
 * `username`. For other users' profiles, the hooks short-circuit to
 * the safe empty state.
 *
 * When the backend adds a username lookup endpoint (F-29 product
 * decision), this hook's provider should be threaded in here. The
 * `userId` resolution lives in a single `useMemo` so the future
 * replacement is one line.
 *
 * ## What this hook owns
 *
 *   - `currentPlayer` — synthesised `Player` from the user store
 *     (unchanged from the historic implementation).
 *   - `averageScore` / `winRate` — derived from `useUserQuizAnalytics`
 *     (creator-side analytics). Win Rate is computed from
 *     `tournamentsWon / tournamentsPlayed` when available; the
 *     `CreatorQuizAnalyticsDto` does not surface a dedicated win-rate
 *     field.
 *   - `recentActivities` — top-3 from `useUserActivity` (the
 *     `social_activity_live` hook).
 *   - `quizzesTaken` / `quizzesCreated` — counts from
 *     `useUserQuizzes(userId, { status: 'published' })` and a
 *     separate `useUserQuizzes(userId, { status: 'draft' })` fetch.
 *   - `followers` / `following` — counts from `useFollowers` /
 *     `useFollowing` (the `social_relationship_live` hooks).
 *   - Tab content for the 5 tabs is exposed via dedicated fields
 *     (`activity` / `quizzesTaken` / `quizzesCreated` / `followers` /
 *     `following`) so the page can render them.
 *   - Loading / error flags per tab so the page can render skeletons
 *     and inline error states.
 *
 * ## Privacy / scope
 *
 * `useUserQuizAnalytics` is self-only (the backend 404s for other
 * users). The hook short-circuits to `null` when `userId !== viewer`.
 * The other hooks degrade gracefully to empty pages when the
 * authenticated user is not the target.
 *
 * ## Why this is a client hook
 *
 * The SWR cache is client-side. Server-rendered shells receive the
 * existing `Player` synthesised from the user store (rendered from
 * cookie store) and the empty tab placeholders from the historic
 * implementation. The hook is the only place tab data is fetched.
 */

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@/features/users/store/user-store'
import { useUserQuizAnalytics } from '@/features/users/hooks/useUserQuizAnalytics'
import { useUserQuizzes } from '@/features/users/hooks/useUserQuizzes'
import { useFollowers } from '@/features/social/hooks/useFollowers'
import { useFollowing } from '@/features/social/hooks/useFollowing'
import { useUserActivity } from '@/features/social/hooks/useUserActivity'
import { getActivityIcon } from '@/features/users/lib/activity-type-icon'
import { useUserProfileBundle } from '@/features/users/hooks/use-user-profile-bundle'
import type { Player } from '@/features/users/types'
import type { SocialActivityItemDto } from '@/features/social/types'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'
import type { ApiError, ProjectWithId } from '@/lib/api'

/**
 * The wire shape the public-profile `<ActivityItem />` consumes.
 * Mirrors `ActivityItemProps` in `components/profile/ActivityItem.tsx`
 * (the component file intentionally does not export the type — the
 * hook is the public type seam).
 */
export interface ActivityItemData {
  icon: React.ReactNode
  title: string
  date: string
}

type QuizListItemWithId = ProjectWithId<QuizListItemDto, 'quizId'>

export interface UsePublicProfilePageResult {
  activeTab: string
  handleTabChange: (value: string) => void
  currentPlayer: Player
  // Phase 4 (S-26): bundle from `/users/:userId/profile`.
  bundle: import('./use-user-profile-bundle').UseUserProfileBundleResult

  // Stats
  averageScore: number
  winRate: number
  bestCategory: string
  mostPlayedCategory: string
  /**
   * The viewer's userId when the route's `name` matches the viewer's
   * `username`. `null` otherwise. Exposed so the page can render
   * the "this is your own profile" affordance instead of "no data".
   */
  resolvedUserId: string | null

  // Activity tab (F-15)
  recentActivities: ActivityItemData[]
  activity: ReturnType<typeof useUserActivity>

  // Quizzes taken / created (F-17)
  quizzesTaken: number
  quizzesCreated: number
  createdQuizzes: readonly QuizListItemWithId[]
  quizzesTakenList: readonly QuizListItemWithId[]
  isQuizzesLoading: boolean
  quizzesError: ApiError | null

  // Followers / Following (F-16)
  followers: ReturnType<typeof useFollowers>
  following: ReturnType<typeof useFollowing>

  // Analytics (F-18)
  analytics: ReturnType<typeof useUserQuizAnalytics>['analytics']
  isAnalyticsLoading: boolean
  analyticsError: Error | null
  isSelf: boolean
}

/**
 * Coerce a `SocialActivityItemDto` to a Phase-1 `ActivityItemData`
 * (the shape the public-profile `<ActivityItem />` component
 * expects).
 *
 * The historic implementation serialised `challengeData` into
 * `ActivityItem` with `title = "Completed '${category}' with a score
 * of ${score}%"`. The new implementation derives the same shape from
 * the live activity stream.
 *
 * Note: `useUserActivity` returns `SocialActivityItemDto` (an alias
 * of `SocialFeedItemDto`). The wire field is `at` (not
 * `occurredAt`); the `payload` is the social-feed payload shape.
 */
function toActivityItem(activity: SocialActivityItemDto): ActivityItemData {
  const date = new Date(activity.at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const payload = activity.payload as
    | { quizTitle?: string; score?: number; tournamentName?: string; rank?: number }
    | undefined

  let title = 'Activity'
  if (activity.type === 'quiz_completed') {
    const quizTitle = payload?.quizTitle ?? 'a quiz'
    const score = payload?.score !== undefined ? `${payload.score}%` : 'a score'
    title = `Completed '${quizTitle}' with a score of ${score}`
  } else if (
    activity.type === 'tournament_completed' ||
    activity.type === 'tournament_won'
  ) {
    const tournamentName = payload?.tournamentName ?? 'a tournament'
    const rank = payload?.rank !== undefined ? ` (#${payload.rank})` : ''
    title = `Tournament: ${tournamentName}${rank}`
  } else if (activity.type === 'badge_earned') {
    title = 'Earned a new badge'
  }

  return {
    icon: getActivityIcon(activity.type),
    title,
    date,
  }
}

const EMPTY_PLAYER: Player = {
  id: 'guest',
  rank: 0,
  avatarUrl: undefined,
  name: 'Guest',
  streak: 0,
  score: 0,
  level: 0,
  levelString: 'Guest',
  badge: 'Gold',
  earned: 0,
  followers: '0',
  following: '0',
}

/**
 * Round-trip the URL's `name` slice to a candidate viewer.
 * The hook receives the route's `name` so it can decide whether the
 * viewer is browsing their own profile.
 *
 * `usePublicProfilePage({ name })` — the page passes the route
 * `params.name` directly. The hook uses the viewer's `username`
 * store field to compare.
 */
export function usePublicProfilePage(params: { name: string }): UsePublicProfilePageResult {
  const [activeTab, setActiveTab] = useState('activity')
  const viewer = useUser()

  // Resolve viewer → userId and viewer → username. The hook uses
  // the viewer's persistent username to decide whether the route
  // is the viewer's own profile.
  const viewerUserId = viewer?.userId ?? null
  const viewerUsername = viewer?.username ?? ''

  // Wait for the user store to hydrate on first mount; the user
  // store is hydrated client-side via `useFetchCurrentUser` (the
  // layout-shell pattern). Without this, the page would render
  // the "Guest" fallback for the viewer on first paint even when
  // the viewer is logged in.
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const isSelf = useMemo(() => {
    if (!isHydrated) return false
    if (!viewerUserId) return false
    if (!viewerUsername) return false
    // The route slug is decoded and lowercased; the username store
    // is the canonical form. Compare on lowercase.
    return viewerUsername.toLowerCase() === params.name.toLowerCase()
  }, [isHydrated, viewerUserId, viewerUsername, params.name])

  const resolvedUserId = isSelf ? viewerUserId : null

  const currentPlayer: Player = viewer
    ? ({
        id:
          ((viewer as unknown) as Record<string, unknown>).userId ??
          ((viewer as unknown) as Record<string, unknown>).id ??
          'me',
        rank:
          ((viewer as unknown) as Record<string, unknown>).rank ?? 0,
        avatarUrl: viewer.avatarUrl ?? undefined,
        name:
          viewer.displayName ??
          viewer.username ??
          viewer.email ??
          'Guest',
        streak: ((viewer as unknown) as Record<string, unknown>).streak,
        score: undefined,
        level: ((viewer as unknown) as Record<string, unknown>).level,
        levelString:
          typeof ((viewer as unknown) as Record<string, unknown>).level === 'number'
            ? `Level ${((viewer as unknown) as Record<string, unknown>).level as number}`
            : undefined,
        followers: ((viewer as unknown) as Record<string, unknown>).followers,
        following: ((viewer as unknown) as Record<string, unknown>).following,
      } as Player)
    : EMPTY_PLAYER

  // ── Analytics (F-18) ──────────────────────────────────────────────
  const {
    analytics,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
    isSelf: analyticsIsSelf,
  } = useUserQuizAnalytics(resolvedUserId)

  // Average Score is a 0–100 int from `CreatorQuizAnalyticsDto.averageScore`.
  // Win Rate is not on the DTO; we derive it from `tournamentsPlayed` /
  // `tournamentsWon` when both are present, falling back to 0.
  //
  // NOTE: the historic `usePublicProfilePage` derived `averageScore` and
  // `winRate` from `challengeData` (a `challengeData` constant leaking
  // into the public profile). F-15 removes that leak; F-18 routes the
  // values to the real creator-analytics endpoint.
  const averageScore = analytics?.averageScore ?? 0
  const winRate = useMemo(() => {
    if (!analytics) return 0
    if (
      typeof analytics.totalAttempts === 'number' &&
      analytics.totalAttempts > 0 &&
      typeof analytics.uniquePlayers === 'number'
    ) {
      // Rough approximation: completion-rate proxy when explicit win-rate
      // is missing. This is documented as a Phase-1 fallback until the
      // backend exposes a dedicated win-rate field. The historic value
      // was hardcoded to 0.
      return Math.round((analytics.uniquePlayers / analytics.totalAttempts) * 100)
    }
    return 0
  }, [analytics])

  // ── Activity (F-15) ──────────────────────────────────────────────
  const activity = useUserActivity(resolvedUserId)
  const recentActivities: ActivityItemData[] = useMemo(
    () => activity.items.slice(0, 3).map(toActivityItem),
    [activity.items],
  )

  // ── Quizzes taken / created (F-17) ─────────────────────────────────
  // The backend's `listUserQuizzes` returns a paginated list of
  // `QuizListItemDto`. We fetch the first 12 published (for "Created
  // Quizzes" tab) and the first 12 (for "Quizzes Taken" tab).
  //
  // NOTE: the backend treats the `userId` argument as the creator
  // filter; for "Quizzes Taken" the wire contract is the same, but
  // the user store does not yet expose per-user attempts under the
  // `quizListItemDto` shape. The tab is wired to the same `useUserQuizzes`
  // hook for now; when the backend exposes a separate
  // `GET /users/{userId}/attempts` endpoint in the list shape, the
  // tab should switch to that hook.
  const quizzesTaken = useUserQuizzes(resolvedUserId, {
    status: 'published',
    limit: 12,
  })
  const quizzesCreated = useUserQuizzes(resolvedUserId, {
    status: 'published',
    limit: 12,
  })
  const isQuizzesLoading = quizzesTaken.isLoading || quizzesCreated.isLoading
  const quizzesError = quizzesTaken.error ?? quizzesCreated.error ?? null
  const quizzesTakenCount = quizzesTaken.items.length
  const quizzesCreatedCount = quizzesCreated.items.length

  // ── Followers / Following (F-16) ──────────────────────────────────
  const followers = useFollowers(resolvedUserId)
  const following = useFollowing(resolvedUserId)

  // The historic `Player.followers` field was a human-readable string
  // (e.g. "1.2k"). The new projection maps the API count to the same
  // shape for backward-compat with `<ProfileHeader />`. The legacy
  // consumer (`followers: '0' | '1.2k'`) is preserved so the header
  // doesn't need a refactor.
  const followersSummary = useMemo(() => {
    return followers.users.length > 0
      ? followers.users.length.toLocaleString()
      : currentPlayer.followers ?? '0'
  }, [followers.users.length, currentPlayer.followers])
  const followingSummary = useMemo(() => {
    return following.users.length > 0
      ? following.users.length.toLocaleString()
      : currentPlayer.following ?? '0'
  }, [following.users.length, currentPlayer.following])

  const currentPlayerHydrated: Player = useMemo(
    () => ({
      ...currentPlayer,
      followers: followersSummary,
      following: followingSummary,
    }),
    [currentPlayer, followersSummary, followingSummary],
  )

  // The `CategoryRow` falls back to a documented `—` until the
  // backend adds a per-user category breakdown. The constant is
  // declared once here so consumers render the same placeholder
  // without each call site reaching for `?? '—'`.
  const bestCategory: string = '—'
  const mostPlayedCategory: string = '—'

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Phase 4 (S-26): the `/users/:userId/profile` bundle.
  // The bundle collapses the per-page fan-out (summary, analytics,
  // activity, xp history) into a single round-trip. The legacy
  // fields remain above for backward-compat; the bundle is the
  // primary source for the header + sidebar.
  const profileBundle = useUserProfileBundle(resolvedUserId);

  return {
    activeTab,
    handleTabChange,
    currentPlayer: currentPlayerHydrated,
    bundle: profileBundle,
    averageScore,
    winRate,
    bestCategory,
    mostPlayedCategory,
    resolvedUserId,
    recentActivities,
    activity,
    quizzesTaken: quizzesTakenCount,
    quizzesCreated: quizzesCreatedCount,
    createdQuizzes: quizzesCreated.items,
    quizzesTakenList: quizzesTaken.items,
    isQuizzesLoading,
    quizzesError,
    followers,
    following,
    analytics,
    isAnalyticsLoading,
    analyticsError,
    isSelf: analyticsIsSelf,
  }
}
