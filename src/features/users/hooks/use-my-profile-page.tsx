'use client'

import { useState } from 'react'
import { getActivityIcon } from '@/lib/activityIcon'
import type { Player } from '@/types/players'
import { useUser } from '@/features/users/store/user-store'
import { challengeData } from '@/constants/challengeHistoryData'

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
  const currentUser: Player | null = user
    ? {
        id: user.userId ?? user.id ?? 'me',
        rank: user.rank ?? 0,
        avatarUrl: user.avatarUrl,
        name: user.displayName ?? user.username ?? user.email ?? 'User',
        country: user.country ?? '',
        flag: undefined,
        streak: user.streak,
        score: undefined,
        level: user.level,
        levelString: undefined,
        quizzes: user.quizzes,
        quizzesCreated: user.quizzesCreated,
        wins: undefined,
        badge: undefined,
        earned: undefined,
        followers: user.followers,
        following: user.following,
        bgImageUrl: undefined,
        bio: user.bio
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
