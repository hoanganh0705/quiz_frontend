'use client'

import { useUser } from '@/features/users/store/user-store'

export interface UseDailyChallengeStreakViewResult {
streak: number | null
isAuthenticated: boolean
}

export function useDailyChallengeStreakView(): UseDailyChallengeStreakViewResult {
const user = useUser()
if (user === null) {
return { streak: null, isAuthenticated: false }
  }
return {
streak: user.currentStreak ?? 0,
isAuthenticated: true,
  }
}
