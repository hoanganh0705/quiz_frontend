'use client'

import { useState } from 'react'
import { getActivityIcon } from '@/features/users/lib/activity-type-icon'
import type { Player } from '@/features/users/types'
import {
  useUser,
  useIsUserLoading,
  useUserError,
} from '@/features/users/store/user-store'

/**
 * `useMyProfilePage()` — read-side hook for the
 * `/profile` page (Phase 1 / S-2). Composes `useUser`
 * (slim identity) + `useUserSummary` (composite) +
 * `useUserActivity` to derive the page's display fields.
 *
 * The Phase 3 strip-down removed the static
 * `challengeData` mock the page used to render. The
 * hook still returns a few `currentLevelXP` /
 * `levelProgress` literals for the placeholder XP bar;
 * those land at zero once the real `useUserSummary`
 * projection wires into the page header.
 */
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

  // Phase 1 (S-2 + Phase 3.12 strip): `recentActivities` is
  // now driven by `useUserActivity` (the activity stream
  // surface) — this is wired here as a compatibility stub;
  // page composition reads the live activity stream from
  // the social module instead.
  const recentActivities: ReadonlyArray<{
    id: string
    icon: ReturnType<typeof getActivityIcon>
    title: string
    date: string
  }> = []

  // Placeholder stats: dropped once `useUserSummary`
  // exposes per-completion averages and a real win-rate.
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