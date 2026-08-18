'use client'

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

bundle: import('./use-user-profile-bundle').UseUserProfileBundleResult

averageScore: number
winRate: number
bestCategory: string
mostPlayedCategory: string

resolvedUserId: string | null

recentActivities: ActivityItemData[]
activity: ReturnType<typeof useUserActivity>

quizzesTaken: number
quizzesCreated: number
createdQuizzes: readonly QuizListItemWithId[]
quizzesTakenList: readonly QuizListItemWithId[]
isQuizzesLoading: boolean
quizzesError: ApiError | null

followers: ReturnType<typeof useFollowers>
following: ReturnType<typeof useFollowing>

analytics: ReturnType<typeof useUserQuizAnalytics>['analytics']
isAnalyticsLoading: boolean
analyticsError: Error | null
isSelf: boolean
}

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

export function usePublicProfilePage(params: { name: string }): UsePublicProfilePageResult {
const [activeTab, setActiveTab] = useState('activity')
const viewer = useUser()

const viewerUserId = viewer?.userId ?? null
const viewerUsername = viewer?.username ?? ''

const [isHydrated, setIsHydrated] = useState(false)
useEffect(() => {
setIsHydrated(true)
  }, [])

const isSelf = useMemo(() => {
if (!isHydrated) return false
if (!viewerUserId) return false
if (!viewerUsername) return false

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

const {
analytics,
isLoading: isAnalyticsLoading,
error: analyticsError,
isSelf: analyticsIsSelf,
  } = useUserQuizAnalytics(resolvedUserId)

const averageScore = analytics?.averageScore ?? 0
const winRate = useMemo(() => {
if (!analytics) return 0
if (
typeof analytics.totalAttempts === 'number' &&
analytics.totalAttempts > 0 &&
typeof analytics.uniquePlayers === 'number'
    ) {

return Math.round((analytics.uniquePlayers / analytics.totalAttempts) * 100)
    }
return 0
  }, [analytics])

const activity = useUserActivity(resolvedUserId)
const recentActivities: ActivityItemData[] = useMemo(
() => activity.items.slice(0, 3).map(toActivityItem),
[activity.items],
  )

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

const followers = useFollowers(resolvedUserId)
const following = useFollowing(resolvedUserId)

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

const bestCategory: string = '—'
const mostPlayedCategory: string = '—'

const handleTabChange = (value: string) => {
setActiveTab(value)
  }

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
