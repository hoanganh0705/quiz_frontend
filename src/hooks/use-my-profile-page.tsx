'use client'

import { useState } from 'react'
import { CheckCircle2, Trophy, Zap } from 'lucide-react'
import { players } from '@/constants/players'
import { challengeData } from '@/constants/challengeHistoryData'

function getActivityIcon(type?: string) {
  switch (type) {
    case 'achievement':
      return (
        <CheckCircle2 className='w-5 h-5 text-green-500' aria-hidden='true' />
      )
    case 'win':
      return <Trophy className='w-5 h-5 text-amber-500' aria-hidden='true' />
    case 'participation':
      return <Zap className='w-5 h-5 text-default' aria-hidden='true' />
    default:
      return <Zap className='w-5 h-5 text-default' aria-hidden='true' />
  }
}

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
  const currentUser = players[0]

  const recentActivities = challengeData.slice(0, 5).map((challenge) => ({
    id: challenge.id,
    icon: getActivityIcon(challenge.type),
    title: `Completed '${challenge.category}' with a score of ${challenge.score}%`,
    date: challenge.date
  }))

  const { averageScore, winRate } = calculateStats()
  const totalQuizzes = currentUser.quizzes || 0
  const quizzesCreated = currentUser.quizzesCreated || 0

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
