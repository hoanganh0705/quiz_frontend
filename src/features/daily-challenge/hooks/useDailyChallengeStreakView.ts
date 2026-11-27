"use client";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseDailyChallengeStreakViewResult {
  streak: number | null;
  isAuthenticated: boolean;
}

export function useDailyChallengeStreakView(): UseDailyChallengeStreakViewResult {
  const { isAuthenticated, user } = useAuthSession();
  if (!isAuthenticated || !user) {
    return { streak: null, isAuthenticated: false };
  }
  return {
    streak: user.currentStreak ?? 0,
    isAuthenticated: true,
  };
}
