'use client'

import { useState } from 'react'
import { getActivityIcon } from '@/features/users/lib/activity-type-icon'
import type { Player } from '@/features/users/types'
import {
  useUser,
  useIsUserLoading,
  useUserError,
} from '@/features/users/store/user-store'
import { challengeData } from '@/features/daily-challenge/constants/challenge-history-data'

function calculateStats() {
  const averageScore =
    challengeData.reduce((sum, challenge) => sum + challenge.score, 0) /
    challengeData.length
  const topRanks = challengeData.filter((challenge) => challenge.rank <= 10)
  const winRate = Math.round((topRanks.length / challengeData.length) * 100)
  return { averageScore, winRate }
}

export function useMyProfilePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const user = useUser()
  const isLoading = useIsUserLoading()
  const error = useUserError()
  const currentUser: Player | null = user
    ? {
        id: user.userId,
        rank: 0,
        avatarUrl: user.avatarUrl ?? undefined,
        name: user.displayName ?? user.username ?? user.email ?? 'User',
        country: undefined,
        flag: undefined,
        streak: user.currentStreak,
        score: undefined,
        level: undefined,
        levelString: undefined,
        quizzes: undefined,
        quizzesCreated: undefined,
        wins: undefined,
        badge: undefined,
        earned: undefined,
        followers: undefined,
        following: undefined,
        bgImageUrl: undefined,
        bio: user.bio ?? undefined
      }
    : null

  const recentActivities = challengeData.slice(0, 5).map((challenge) => ({
    id: challenge.id,
    icon: getActivityIcon(challenge.type),
    title: `Completed '${challenge.category}' with a score of ${challenge.score}%`,
    date: challenge.date
  }))

  const { averageScore, winRate } = calculateStats()
  const totalQuizzes = currentUser?.quizzes || 0
  const quizzesCreated = currentUser?.quizzesCreated || 0

  const currentLevelXP = 7800
  const nextLevelXP = 10000
  const levelProgress = (currentLevelXP / nextLevelXP) * 100

  return {
    activeTab,
    setActiveTab,
    currentUser,
    isLoading,
    error,
    recentActivities,
    averageScore,
    winRate,
    totalQuizzes,
    quizzesCreated,
    currentLevelXP,
    nextLevelXP,
    levelProgress
  }
}
