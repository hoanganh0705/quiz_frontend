'use client'

import { useState } from 'react'
import { getActivityIcon } from '@/features/users/lib/activity-type-icon'
import type { Player } from '@/features/users/types'
import {
useUser,
useIsUserLoading,
useUserError,
} from '@/features/users/store/user-store'

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
streak: user.currentStreak,
      }
: null

const recentActivities: ReadonlyArray<{
id: string
icon: ReturnType<typeof getActivityIcon>
title: string
date: string
  }> = []

const averageScore = 0
const winRate = 0
const totalQuizzes = 0
const quizzesCreated = 0
const currentLevelXP = 0
const nextLevelXP = 0
const levelProgress = 0

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