'use client'

import { useState, useMemo, useCallback } from 'react'
import { getActivityIcon } from '@/lib/activityIcon'
import { players } from '@/constants/players'
import { challengeData } from '@/constants/challengeHistoryData'

export function usePublicProfilePage() {
  const [activeTab, setActiveTab] = useState('activity')
  const currentPlayer = players[0]

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
