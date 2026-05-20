'use client'

import { useState, useMemo, useCallback } from 'react'
import { getActivityIcon } from '@/lib/activityIcon'
import { challengeData } from '@/constants/challengeHistoryData'
import type { Player } from '@/types/players'
import { useUser } from '@/features/users/store/user-store'

export function usePublicProfilePage() {
  const [activeTab, setActiveTab] = useState('activity')
  const user = useUser()
  const currentPlayer: Player = user
    ? {
        id: user.userId ?? user.id ?? 'me',
        rank: user.rank ?? 0,
        avatarUrl: user.avatarUrl,
        name: user.displayName ?? user.username ?? user.email ?? 'Guest',
        country: user.country ?? '',
        flag: undefined,
        streak: user.streak,
        score: undefined,
        level: user.level,
        levelString: user.level ? `Level ${user.level}` : undefined,
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
    : {
        id: 'guest',
        rank: 0,
        avatarUrl: undefined,
        name: 'Guest',
        country: '',
        flag: undefined,
        streak: 0,
        score: 0,
        level: 0,
        levelString: 'Guest',
        quizzes: 0,
        quizzesCreated: 0,
        wins: 0,
        badge: 'Gold',
        earned: 0,
        followers: '0',
        following: '0',
        bgImageUrl: undefined,
        bio: ''
      }

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
  }, [])

  const averageScore = useMemo(() => {
    if (challengeData.length === 0) return 0
    return (
      challengeData.reduce((sum, challenge) => sum + challenge.score, 0) /
      challengeData.length
    )
  }, [])

  const winRate = useMemo(() => {
    if (challengeData.length === 0) return 0
    const topRanks = challengeData.filter((challenge) => challenge.rank <= 10)
    return Math.round((topRanks.length / challengeData.length) * 100)
  }, [])

  const recentActivities = useMemo(
    () =>
      challengeData.slice(0, 3).map((challenge) => ({
        id: challenge.id,
        icon: getActivityIcon(challenge.type),
        title: `Completed '${challenge.category}' with a score of ${challenge.score}%`,
        date: challenge.date
      })),
    []
  )

  return {
    activeTab,
    handleTabChange,
    currentPlayer,
    averageScore,
    winRate,
    recentActivities
  }
}
