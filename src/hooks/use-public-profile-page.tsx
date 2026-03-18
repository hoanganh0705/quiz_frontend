'use client'

import { useState, useMemo, useCallback } from 'react'
import { CheckCircle2, Trophy, Zap } from 'lucide-react'
import { players } from '@/constants/players'
import { challengeData } from '@/constants/challengeHistoryData'

const achievementIcon = (
  <CheckCircle2 className='w-6 h-6 text-green-500' aria-hidden='true' />
)
const winIcon = <Trophy className='w-6 h-6 text-amber-500' aria-hidden='true' />
const participationIcon = (
  <Zap className='w-6 h-6 text-default' aria-hidden='true' />
)

function getActivityIcon(type: string | undefined) {
  switch (type) {
    case 'achievement':
      return achievementIcon
    case 'win':
      return winIcon
    case 'participation':
      return participationIcon
    default:
      return participationIcon
  }
}

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
